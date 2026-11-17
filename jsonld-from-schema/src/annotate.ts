import { createRequire } from "node:module";
import { JsonLdSchemaError, type Warning } from "./errors.js";
import type { Analysis, ClassModel, TermModel } from "./model.js";
import { expandIri } from "./model.js";
import { draftFromSchema, isAbsoluteIriValue, isPlainObject, pctEncode } from "./util.js";
import { buildContextObject } from "./context.js";

const require = createRequire(import.meta.url);
// CJS interop for ajv under NodeNext
const Ajv2020 = require("ajv/dist/2020.js") as new (opts?: object) => {
  compile: (s: object) => ((data: unknown) => boolean) & { errors?: unknown };
  addSchema: (s: object, key?: string) => unknown;
};
const AjvDraft07 = require("ajv") as new (opts?: object) => {
  compile: (s: object) => ((data: unknown) => boolean) & { errors?: unknown };
  addSchema: (s: object, key?: string) => unknown;
};
const addFormats = require("ajv-formats") as (ajv: unknown) => unknown;

function makeAjv(draft: "2020-12" | "draft-07") {
  const ajv =
    draft === "draft-07"
      ? new AjvDraft07({ strict: false, allErrors: true })
      : new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  return ajv;
}

export function validateInstance(
  instance: unknown,
  schema: Record<string, unknown>,
  rootDoc: Record<string, unknown>,
  pointer = "",
): void {
  const draft = draftFromSchema(
    (rootDoc.$schema ? rootDoc : schema) as Record<string, unknown>,
  );
  const ajv = makeAjv(draft);
  const id =
    typeof rootDoc.$id === "string" && rootDoc.$id
      ? rootDoc.$id
      : "https://streamgraph.local/schema.json";
  const doc =
    typeof rootDoc.$id === "string" && rootDoc.$id
      ? rootDoc
      : { ...rootDoc, $id: id };

  let validate: (data: unknown) => boolean;
  if (!pointer || pointer === "") {
    validate = ajv.compile(doc) as (data: unknown) => boolean;
  } else {
    try {
      ajv.addSchema(doc);
    } catch {
      // already added
    }
    const frag = pointer.startsWith("/") ? pointer : `/${pointer}`;
    validate = ajv.compile({ $ref: `${id}#${frag}` }) as (data: unknown) => boolean;
  }

  const ok = validate(instance);
  if (!ok) {
    throw new JsonLdSchemaError(
      "E_INVALID_INSTANCE",
      "",
      "instance failed schema validation",
      (validate as { errors?: unknown }).errors,
    );
  }
}

function findTerm(terms: TermModel[], name: string): TermModel | undefined {
  return terms.find((t) => t.name === name);
}

function annotateNode(
  analysis: Analysis,
  value: unknown,
  terms: TermModel[],
  classModel: ClassModel | undefined,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => {
      // use item schema from array term — caller handles
      return item;
    });
  }
  if (!isPlainObject(value)) return value;

  for (const key of Object.keys(value)) {
    if (key.startsWith("@")) {
      throw new JsonLdSchemaError(
        "E_KEYWORD_IN_INSTANCE",
        "/" + key,
        `instance key starts with @`,
      );
    }
  }

  const out: Record<string, unknown> = {};

  if (analysis.opts.addTypes && classModel) {
    const hasClass =
      classModel.isRoot
        ? !!(analysis as Analysis & { rootHasClass?: boolean }).rootHasClass
        : !expandIri(analysis, classModel.iri).endsWith("-node") &&
          classModel.shapeIri === analysis.vocab + classModel.name + "Shape";
    if (hasClass) {
      out["@type"] = classModel.iri.includes("://") || classModel.iri.startsWith("urn:")
        ? classModel.iri
        : classModel.iri.includes(":") && !classModel.iri.includes("://")
          ? expandIri(analysis, classModel.iri)
          : classModel.iri;
      // Prefer absolute IRI for @type
      out["@type"] = expandIri(analysis, classModel.iri);
    }
  }

  // @idProperty
  if (classModel?.idProperty && classModel.idProperty in value) {
    const raw = value[classModel.idProperty];
    const s = String(raw);
    if (isAbsoluteIriValue(s)) {
      out["@id"] = s;
    } else {
      const prefix = classModel.idPrefix ?? analysis.vocab + "id/";
      out["@id"] = prefix + pctEncode(s);
    }
  }

  for (const [key, v] of Object.entries(value)) {
    const term = findTerm(terms, key);
    if (!term || term.excluded) {
      out[key] = v;
      continue;
    }

    if (term.isArray && Array.isArray(v)) {
      if (term.coercion.kind === "json") {
        out[key] = v;
      } else if (term.coercion.kind === "node") {
        const nestedClass = analysis.classes.find(
          (c) =>
            (term.nestedClassName && c.name === term.nestedClassName) ||
            c.shapeIri === classModel!.shapeIri + "-" + pctEncode(term.name) + "-node",
        );
        out[key] = v.map((item) =>
          isPlainObject(item)
            ? annotateNode(analysis, item, term.scopedTerms, nestedClass)
            : item,
        );
      } else {
        out[key] = v;
      }
    } else if (term.coercion.kind === "node" && isPlainObject(v)) {
      const nestedClass = analysis.classes.find(
        (c) =>
          (term.nestedClassName && c.name === term.nestedClassName) ||
          (classModel && c.shapeIri === classModel.shapeIri + "-" + pctEncode(term.name) + "-node"),
      );
      out[key] = annotateNode(analysis, v, term.scopedTerms, nestedClass);
    } else {
      out[key] = v;
    }
  }

  return out;
}

export function annotateInstance(
  analysis: Analysis,
  instance: unknown,
): { document: Record<string, unknown>; warnings: Warning[] } {
  if (analysis.opts.validate) {
    validateInstance(
      instance,
      analysis.rootSchema,
      analysis.rootDoc,
      analysis.opts.pointer ?? analysis.rootPointer,
    );
  }

  const ctxDoc = buildContextObject(analysis);
  const annotated = annotateNode(
    analysis,
    instance,
    analysis.rootClass?.terms ?? [],
    analysis.rootClass,
  );

  if (!isPlainObject(annotated)) {
    return {
      document: { ...ctxDoc, value: annotated },
      warnings: analysis.warnings,
    };
  }

  return {
    document: {
      "@context": ctxDoc["@context"],
      ...annotated,
    },
    warnings: analysis.warnings,
  };
}

/** Ensure trailing newline and double-quoted strings for A-06. */
export function serializeYamlLd(document: Record<string, unknown>): string {
  return stringifyYamlStrict(document) + "\n";
}

function stringifyYamlStrict(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value.map((item) => {
      const body = stringifyYamlStrict(item, indent + 1);
      if (isPlainObject(item) || Array.isArray(item)) {
        return `${pad}- ${body.replace(/^\s+/, "")}`;
      }
      return `${pad}- ${body}`;
    }).join("\n");
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort((a, b) => {
      const order = ["@context", "@version", "@base", "@vocab", "@id", "@type", "@container", "@json"];
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return a < b ? -1 : a > b ? 1 : 0;
    });
    if (keys.length === 0) return "{}";
    const lines: string[] = [];
    for (const k of keys) {
      const v = value[k];
      // Quote keys that are not plain YAML identifiers (including @keywords)
      const key = /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : JSON.stringify(k);
      if (isPlainObject(v) || Array.isArray(v)) {
        const inner = stringifyYamlStrict(v, indent + 1);
        if ((isPlainObject(v) && Object.keys(v).length === 0) || (Array.isArray(v) && v.length === 0)) {
          lines.push(`${pad}${key}: ${inner}`);
        } else {
          lines.push(`${pad}${key}:`);
          lines.push(inner);
        }
      } else {
        lines.push(`${pad}${key}: ${stringifyYamlStrict(v, indent + 1)}`);
      }
    }
    return lines.join("\n");
  }
  return JSON.stringify(String(value));
}
