import { JsonLdSchemaError, type Warning, sortWarnings } from "./errors.js";
import {
  parseClassHint,
  parseCurieOrIri,
  parsePropertyHint,
  type ClassHint,
  type PropertyHint,
  type RootHint,
} from "./hints.js";
import { BUILTIN_PREFIXES, type ConverterOptions } from "./options.js";
import {
  ENUM_IRI_PATTERN,
  getByPointer,
  hasTypeDeterminingKeyword,
  isPlainObject,
  pascalCase,
  pctEncode,
  pointerJoin,
} from "./util.js";

export type Coercion =
  | { kind: "xsd"; curie: string }
  | { kind: "id" }
  | { kind: "vocab" }
  | { kind: "json" }
  | { kind: "none" }
  | { kind: "node"; classIri?: string; className?: string };

export interface TermModel {
  name: string;
  path: string;
  excluded: boolean;
  id: string; // IRI or CURIE
  coercion: Coercion;
  container?: "@set" | "@list";
  scopedTerms: TermModel[];
  enumValues?: string[];
  enumAsVocab: boolean;
  descriptions: string[];
  schema: Record<string, unknown>;
  requiredEverywhere: boolean;
  isArray: boolean;
  minItems?: number;
  maxItems?: number;
  /** SHACL extras */
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  enumRaw?: unknown[];
  constRaw?: unknown;
  additionalPropertiesFalse: boolean;
  conflict: boolean;
  idProperty?: string;
  idPrefix?: string;
  nestedClassIri?: string;
  nestedClassName?: string;
  nestedShapeId?: string;
}

export interface ClassModel {
  name: string;
  iri: string;
  path: string;
  title?: string;
  description?: string;
  terms: TermModel[];
  required: Set<string>;
  additionalPropertiesFalse: boolean;
  idProperty?: string;
  idPrefix?: string;
  isRoot: boolean;
  shapeIri: string;
  foreign: boolean;
}

export interface Analysis {
  opts: ConverterOptions;
  rootDoc: Record<string, unknown>;
  rootSchema: Record<string, unknown>;
  rootPointer: string;
  vocab: string;
  prefixes: Record<string, string>;
  usedBuiltins: Set<string>;
  warnings: Warning[];
  rootClass?: ClassModel;
  classes: ClassModel[];
  termsByOwner: Map<ClassModel, TermModel[]>;
  propertyIndex: Map<string, TermModel[]>; // term IRI -> terms
  contextObject: Record<string, unknown>;
}

const IGNORED_KEYWORDS = [
  "not",
  "dependentSchemas",
  "dependentRequired",
  "dependencies",
  "unevaluatedProperties",
  "unevaluatedItems",
  "propertyNames",
  "contains",
  "$dynamicRef",
  "$recursiveRef",
] as const;

function warn(analysis: Analysis, code: Warning["code"], path: string, message: string) {
  analysis.warnings.push({ code, path, message });
}

function noteIgnored(analysis: Analysis, schema: Record<string, unknown>, path: string) {
  for (const kw of IGNORED_KEYWORDS) {
    if (kw in schema) {
      warn(analysis, "W_IGNORED_KEYWORD", pointerJoin(path, kw), `ignored keyword ${kw}`);
    }
  }
}

function resolveLocalRef(
  analysis: Analysis,
  ref: string,
  fromPath: string,
): { schema: Record<string, unknown>; path: string; defName?: string } {
  if (typeof ref !== "string") {
    throw new JsonLdSchemaError("E_BAD_REF", fromPath, `$ref must be a string`);
  }

  // External / non-local
  if (ref.includes("://") || (!ref.startsWith("#") && !ref.startsWith("/"))) {
    // Allow same-document with root $id prefix
    const rootId = analysis.rootDoc.$id;
    if (typeof rootId === "string" && ref.startsWith(rootId + "#")) {
      const frag = ref.slice(rootId.length);
      return resolveLocalRef(analysis, frag, fromPath);
    }
    if (ref.startsWith("#") || (typeof rootId === "string" && ref.startsWith(rootId))) {
      // fall through for # and id#...
    } else if (!ref.startsWith("#")) {
      throw new JsonLdSchemaError("E_EXTERNAL_REF", fromPath, `remote $ref refused: ${ref}`);
    }
  }

  let pointer: string;
  if (ref === "#") {
    pointer = "";
  } else if (ref.startsWith("#/")) {
    pointer = ref.slice(1);
  } else if (ref.startsWith("#")) {
    // plain name fragment — treat as JSON pointer under $defs/definitions if possible later
    throw new JsonLdSchemaError("E_BAD_REF", fromPath, `unresolvable $ref: ${ref}`);
  } else if (ref.startsWith("/")) {
    pointer = ref;
  } else {
    throw new JsonLdSchemaError("E_EXTERNAL_REF", fromPath, `remote $ref refused: ${ref}`);
  }

  let target: unknown;
  try {
    target = pointer === "" ? analysis.rootDoc : getByPointer(analysis.rootDoc, pointer);
  } catch (e) {
    if (e instanceof JsonLdSchemaError) {
      throw new JsonLdSchemaError("E_BAD_REF", fromPath, `unresolvable $ref: ${ref}`);
    }
    throw e;
  }
  if (!isPlainObject(target)) {
    throw new JsonLdSchemaError("E_BAD_REF", fromPath, `$ref target is not an object schema`);
  }

  let defName: string | undefined;
  const m = pointer.match(/^\/(?:\$defs|definitions)\/([^/]+)$/);
  if (m) defName = m[1].replace(/~1/g, "/").replace(/~0/g, "~");

  return { schema: target, path: pointer, defName };
}

function mergeSchemas(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (k === "properties" && isPlainObject(out.properties) && isPlainObject(v)) {
      out.properties = { ...(out.properties as object), ...v };
    } else if (k === "required" && Array.isArray(out.required) && Array.isArray(v)) {
      out.required = Array.from(new Set([...(out.required as string[]), ...(v as string[])]));
    } else if (k === "x-jsonld" && "x-jsonld" in out) {
      // referring schema wins — keep out's
    } else if (!(k in out) || k === "x-jsonld") {
      out[k] = v;
    } else if (k === "x-jsonld") {
      out[k] = v;
    } else {
      // later sibling/ref merge: prefer b for most keywords when merging $ref siblings
      out[k] = v;
    }
  }
  return out;
}

function derefSchema(
  analysis: Analysis,
  schema: Record<string, unknown>,
  path: string,
  stack: Set<string>,
  keepOnStack = false,
): { schema: Record<string, unknown>; path: string; cyclic: boolean; defName?: string; stackKey?: string } {
  if (!("$ref" in schema)) {
    return { schema, path, cyclic: false };
  }
  const ref = schema.$ref as string;
  const key = ref;
  if (stack.has(key)) {
    return { schema, path, cyclic: true, stackKey: key };
  }
  stack.add(key);
  const resolved = resolveLocalRef(analysis, ref, pointerJoin(path, "$ref"));
  const { $ref: _drop, ...siblings } = schema;
  // Referring x-jsonld wins over target
  const merged = mergeSchemas(resolved.schema, siblings);
  if ("x-jsonld" in siblings) {
    merged["x-jsonld"] = siblings["x-jsonld"];
  }
  // If merged still has $ref from target, continue
  if ("$ref" in merged && merged.$ref !== ref) {
    const inner = derefSchema(analysis, merged, resolved.path, stack, keepOnStack);
    if (!keepOnStack) stack.delete(key);
    return {
      ...inner,
      defName: resolved.defName ?? inner.defName,
      stackKey: keepOnStack ? key : undefined,
    };
  }
  if (!keepOnStack) stack.delete(key);
  // Remove $ref from merged view for analysis
  const { $ref: _r2, ...clean } = merged;
  return {
    schema: clean,
    path: resolved.path,
    cyclic: false,
    defName: resolved.defName,
    stackKey: keepOnStack ? key : undefined,
  };
}

/** Fully expand $ref / allOf shells so property gathering sees real keywords. */
function expandForGather(
  analysis: Analysis,
  schema: Record<string, unknown>,
  path: string,
  stack: Set<string> = new Set(),
): { schema: Record<string, unknown>; path: string } {
  let cur = schema;
  let curPath = path;
  if ("$ref" in cur) {
    const d = derefSchema(analysis, cur, curPath, stack, false);
    if (d.cyclic) return { schema: cur, path: curPath };
    cur = d.schema;
    curPath = d.path;
  }
  return { schema: cur, path: curPath };
}

function nonNullTypes(schema: Record<string, unknown>): string[] {
  const t = schema.type;
  if (typeof t === "string") return t === "null" ? [] : [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string" && x !== "null");
  return [];
}

function isNullOnly(schema: unknown): boolean {
  return isPlainObject(schema) && schema.type === "null" && Object.keys(schema).every((k) => k === "type");
}

function unwrapNullable(
  analysis: Analysis,
  schema: Record<string, unknown>,
  path: string,
): { schema: Record<string, unknown>; path: string } {
  const types = nonNullTypes(schema);
  if (Array.isArray(schema.type) && schema.type.includes("null") && types.length === 1) {
    return { schema: { ...schema, type: types[0] }, path };
  }

  for (const key of ["anyOf", "oneOf"] as const) {
    const arr = schema[key];
    if (!Array.isArray(arr)) continue;
    const nonNull = arr.filter((s) => !isNullOnly(s));
    const nulls = arr.filter(isNullOnly);
    if (nulls.length >= 1 && nonNull.length === 1 && isPlainObject(nonNull[0])) {
      return { schema: nonNull[0] as Record<string, unknown>, path: pointerJoin(path, key, arr.indexOf(nonNull[0])) };
    }
  }
  return { schema, path };
}

function formatCoercion(
  format: string | undefined,
  uriAs: ConverterOptions["uriAs"],
): Coercion | undefined {
  if (!format) return undefined;
  switch (format) {
    case "date-time":
      return { kind: "xsd", curie: "xsd:dateTime" };
    case "date":
      return { kind: "xsd", curie: "xsd:date" };
    case "time":
      return { kind: "xsd", curie: "xsd:time" };
    case "duration":
      return { kind: "xsd", curie: "xsd:duration" };
    case "uri":
    case "iri":
    case "uri-reference":
    case "iri-reference":
      return uriAs === "anyURI" ? { kind: "xsd", curie: "xsd:anyURI" } : { kind: "id" };
    default:
      return undefined;
  }
}

function scalarCoercion(
  analysis: Analysis,
  schema: Record<string, unknown>,
  path: string,
): Coercion {
  const types = nonNullTypes(schema);
  if (types.length > 1) {
    warn(analysis, "W_UNION_TYPE", path, `multiple non-null types; no coercion`);
    return { kind: "none" };
  }

  const format = typeof schema.format === "string" ? schema.format : undefined;
  const fmt = formatCoercion(format, analysis.opts.uriAs);
  if (fmt) return fmt;

  if (schema.contentEncoding === "base64") {
    return { kind: "xsd", curie: "xsd:base64Binary" };
  }

  const t = types[0];
  if (t === "integer") return { kind: "xsd", curie: "xsd:integer" };
  if (t === "number") return { kind: "xsd", curie: "xsd:double" };
  if (t === "boolean") return { kind: "xsd", curie: "xsd:boolean" };
  if (t === "string") return { kind: "none" };
  if (t === "object") {
    if (isPlainObject(schema.properties) && Object.keys(schema.properties).length > 0) {
      return { kind: "node" };
    }
    // free-form object
    return { kind: "json" };
  }
  if (t === "array") {
    // handled by caller
    return { kind: "none" };
  }

  // No type but format already handled; plain enum/const string etc.
  if (fmt) return fmt;
  return { kind: "none" };
}

function itemsSchema(schema: Record<string, unknown>): {
  kind: "list" | "tuple" | "none";
  items?: Record<string, unknown> | boolean;
  tuple?: (Record<string, unknown> | boolean)[];
} {
  if (Array.isArray(schema.prefixItems)) {
    return { kind: "tuple", tuple: schema.prefixItems as (Record<string, unknown> | boolean)[] };
  }
  if (Array.isArray(schema.items)) {
    return { kind: "tuple", tuple: schema.items as (Record<string, unknown> | boolean)[] };
  }
  if (schema.items !== undefined) {
    return { kind: "list", items: schema.items as Record<string, unknown> | boolean };
  }
  return { kind: "none" };
}

function isObjectSchema(schema: Record<string, unknown>): boolean {
  const types = nonNullTypes(schema);
  if (types.includes("object")) return true;
  if (isPlainObject(schema.properties)) return true;
  if ("additionalProperties" in schema || "patternProperties" in schema) {
    if (types.length === 0 || types.includes("object")) return true;
  }
  return false;
}

function collectCompositionBranches(
  schema: Record<string, unknown>,
): {
  allOf: Record<string, unknown>[];
  anyOf: Record<string, unknown>[];
  oneOf: Record<string, unknown>[];
  thenElse: Record<string, unknown>[];
} {
  const allOf = Array.isArray(schema.allOf)
    ? schema.allOf.filter(isPlainObject)
    : [];
  const anyOf = Array.isArray(schema.anyOf)
    ? schema.anyOf.filter((s) => isPlainObject(s) && !isNullOnly(s))
    : [];
  const oneOf = Array.isArray(schema.oneOf)
    ? schema.oneOf.filter((s) => isPlainObject(s) && !isNullOnly(s))
    : [];
  const thenElse: Record<string, unknown>[] = [];
  if (isPlainObject(schema.then)) thenElse.push(schema.then);
  if (isPlainObject(schema.else)) thenElse.push(schema.else);
  return { allOf, anyOf, oneOf, thenElse };
}

interface PropCandidate {
  schema: Record<string, unknown>;
  path: string;
  required: boolean;
  fromStaticUnion: boolean;
  fromConditional: boolean;
}

function gatherProperties(
  analysis: Analysis,
  schemaIn: Record<string, unknown>,
  pathIn: string,
  requiredBase: Set<string>,
): Map<string, PropCandidate[]> {
  const map = new Map<string, PropCandidate[]>();
  const expanded = expandForGather(analysis, schemaIn, pathIn);
  const schema = expanded.schema;
  const path = expanded.path;

  const addProps = (
    s: Record<string, unknown>,
    p: string,
    required: Set<string>,
    flags: { fromStaticUnion?: boolean; fromConditional?: boolean },
  ) => {
    noteIgnored(analysis, s, p);
    if ("patternProperties" in s || (isPlainObject(s.additionalProperties) || s.additionalProperties === true)) {
      if (!isPlainObject(s.properties) || Object.keys(s.properties as object).length === 0) {
        // handled as @json at property level
      } else {
        warn(analysis, "W_UNMAPPED_KEYS", p, `patternProperties/additionalProperties keys unmapped`);
      }
    } else if ("patternProperties" in s) {
      warn(analysis, "W_UNMAPPED_KEYS", p, `patternProperties keys unmapped`);
    }

    if (!isPlainObject(s.properties)) return;
    for (const [name, propSchema] of Object.entries(s.properties as Record<string, unknown>)) {
      if (name.startsWith("@")) {
        throw new JsonLdSchemaError(
          "E_KEYWORD_PROPERTY",
          pointerJoin(p, "properties", name),
          `property name starts with @`,
        );
      }
      const list = map.get(name) ?? [];
      if (propSchema === true || propSchema === false) {
        list.push({
          schema: {},
          path: pointerJoin(p, "properties", name),
          required: required.has(name),
          fromStaticUnion: !!flags.fromStaticUnion,
          fromConditional: !!flags.fromConditional,
        });
      } else if (isPlainObject(propSchema)) {
        list.push({
          schema: propSchema,
          path: pointerJoin(p, "properties", name),
          required: required.has(name),
          fromStaticUnion: !!flags.fromStaticUnion,
          fromConditional: !!flags.fromConditional,
        });
      }
      map.set(name, list);
    }
  };

  const localRequired = new Set(requiredBase);
  if (Array.isArray(schema.required)) {
    for (const r of schema.required) if (typeof r === "string") localRequired.add(r);
  }

  addProps(schema, path, localRequired, {});

  const { allOf, anyOf, oneOf, thenElse } = collectCompositionBranches(schema);

  for (let i = 0; i < allOf.length; i++) {
    const branch = allOf[i];
    const branchPath = pointerJoin(path, "allOf", i);
    const branchExp = expandForGather(analysis, branch, branchPath);
    const req = new Set(localRequired);
    if (Array.isArray(branchExp.schema.required)) {
      for (const r of branchExp.schema.required) if (typeof r === "string") req.add(r);
    }
    // Merge allOf into owner — recurse
    const nested = gatherProperties(analysis, branchExp.schema, branchExp.path, req);
    for (const [name, cands] of nested) {
      const list = map.get(name) ?? [];
      list.push(...cands);
      map.set(name, list);
    }
  }

  const handleUnion = (branches: Record<string, unknown>[], key: "anyOf" | "oneOf") => {
    if (branches.length === 0) return;
    // nullable already unwrapped; remaining is static union
    if (branches.length === 1 && (key === "anyOf" || key === "oneOf")) {
      // might be leftover after nullable unwrap at higher level
    }
    const nonNull = branches;
    if (nonNull.length >= 1) {
      // Check if this was only nullable — already filtered
      const propRequiredCounts = new Map<string, number>();
      for (let i = 0; i < nonNull.length; i++) {
        const branch = nonNull[i];
        const branchPath = pointerJoin(path, key, i);
        warn(analysis, "W_COMPOSITION_STATIC", branchPath, `${key} merged statically`);
        const req = new Set<string>();
        if (Array.isArray(branch.required)) {
          for (const r of branch.required) if (typeof r === "string") req.add(r);
        }
        const nested = gatherProperties(analysis, branch, branchPath, new Set());
        for (const [name, cands] of nested) {
          const list = map.get(name) ?? [];
          for (const c of cands) {
            list.push({ ...c, required: false, fromStaticUnion: true });
          }
          map.set(name, list);
          if (req.has(name)) {
            propRequiredCounts.set(name, (propRequiredCounts.get(name) ?? 0) + 1);
          }
        }
        for (const r of req) {
          if (!nested.has(r)) {
            propRequiredCounts.set(r, (propRequiredCounts.get(r) ?? 0) + 1);
          }
        }
      }
      // required in every branch → required
      for (const [name, count] of propRequiredCounts) {
        if (count === nonNull.length) {
          const list = map.get(name);
          if (list) {
            for (const c of list) c.required = true;
          }
        }
      }
    }
  };

  // Only emit composition warning for non-nullable unions that contribute
  if (anyOf.length > 1 || (anyOf.length === 1 && !isNullOnly(anyOf[0]))) {
    // if single non-null from nullable unwrap at this level — skip if original was nullable pair
    const rawAny = schema.anyOf;
    if (Array.isArray(rawAny)) {
      const nonNull = rawAny.filter((s) => !isNullOnly(s));
      const nulls = rawAny.filter(isNullOnly);
      if (!(nulls.length >= 1 && nonNull.length === 1)) {
        handleUnion(anyOf, "anyOf");
      } else if (anyOf.length === 1) {
        const nested = gatherProperties(analysis, anyOf[0], pointerJoin(path, "anyOf", 0), localRequired);
        for (const [name, cands] of nested) {
          const list = map.get(name) ?? [];
          list.push(...cands);
          map.set(name, list);
        }
      }
    }
  }

  if (oneOf.length > 1 || (oneOf.length === 1 && Array.isArray(schema.oneOf))) {
    const rawOne = schema.oneOf;
    if (Array.isArray(rawOne)) {
      const nonNull = rawOne.filter((s) => !isNullOnly(s));
      const nulls = rawOne.filter(isNullOnly);
      if (!(nulls.length >= 1 && nonNull.length === 1)) {
        handleUnion(oneOf, "oneOf");
      } else if (oneOf.length === 1) {
        const nested = gatherProperties(analysis, oneOf[0], pointerJoin(path, "oneOf", 0), localRequired);
        for (const [name, cands] of nested) {
          const list = map.get(name) ?? [];
          list.push(...cands);
          map.set(name, list);
        }
      }
    }
  }

  if (thenElse.length > 0) {
    warn(analysis, "W_CONDITIONAL", pointerJoin(path, "if"), `if/then/else merged statically`);
    for (let i = 0; i < thenElse.length; i++) {
      const branch = thenElse[i];
      const label = schema.then === branch ? "then" : "else";
      const nested = gatherProperties(analysis, branch, pointerJoin(path, label), new Set());
      for (const [name, cands] of nested) {
        const list = map.get(name) ?? [];
        for (const c of cands) {
          list.push({ ...c, required: false, fromConditional: true });
        }
        map.set(name, list);
      }
    }
  }

  return map;
}

function coercionEqual(a: Coercion, b: Coercion): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "xsd" && b.kind === "xsd") return a.curie === b.curie;
  if (a.kind === "node" && b.kind === "node") {
    return a.classIri === b.classIri;
  }
  return true;
}

function termSignature(t: {
  id: string;
  coercion: Coercion;
  container?: string;
  excluded: boolean;
}): string {
  if (t.excluded) return "null";
  return JSON.stringify({
    id: t.id,
    coercion: t.coercion,
    container: t.container ?? null,
  });
}

function buildTermFromSchema(
  analysis: Analysis,
  name: string,
  schemaIn: Record<string, unknown>,
  path: string,
  owner: ClassModel | undefined,
  refStack: Set<string>,
  inherited: Map<string, TermModel>,
): TermModel | null {
  if (name.includes(":") || name.includes("/") || name === "") {
    warn(analysis, "W_UNMAPPABLE_NAME", path, `unmappable property name`);
    return null;
  }

  const knownPrefixes = { ...BUILTIN_PREFIXES, ...analysis.prefixes };
  let hint: PropertyHint | false | undefined;
  if ("x-jsonld" in schemaIn) {
    hint = parsePropertyHint(schemaIn["x-jsonld"], pointerJoin(path, "x-jsonld"), knownPrefixes);
  }

  if (hint === false) {
    return {
      name,
      path,
      excluded: true,
      id: "",
      coercion: { kind: "none" },
      scopedTerms: [],
      enumAsVocab: false,
      descriptions: [],
      schema: schemaIn,
      requiredEverywhere: false,
      isArray: false,
      additionalPropertiesFalse: false,
      conflict: false,
    };
  }

  const deref = derefSchema(analysis, schemaIn, path, refStack, true);
  let schema = deref.schema;
  let schemaPath = deref.path;
  const unwrapped = unwrapNullable(analysis, schema, schemaPath);
  schema = unwrapped.schema;
  schemaPath = unwrapped.path;
  const releaseStack = () => {
    if (deref.stackKey) refStack.delete(deref.stackKey);
  };

  // Re-read hint from referring schema (already in schemaIn); if only on target, use that
  if (hint === undefined && "x-jsonld" in schema) {
    hint = parsePropertyHint(schema["x-jsonld"], pointerJoin(schemaPath, "x-jsonld"), knownPrefixes);
    if (hint === false) {
      releaseStack();
      return {
        name,
        path,
        excluded: true,
        id: "",
        coercion: { kind: "none" },
        scopedTerms: [],
        enumAsVocab: false,
        descriptions: [],
        schema,
        requiredEverywhere: false,
        isArray: false,
        additionalPropertiesFalse: false,
        conflict: false,
      };
    }
  }

  const descriptions: string[] = [];
  if (typeof schema.description === "string") descriptions.push(schema.description);
  if (typeof schemaIn.description === "string" && schemaIn.description !== schema.description) {
    descriptions.push(schemaIn.description);
  }

  let id = analysis.vocab + pctEncode(name);
  if (hint?.["@id"]) {
    const parsed = parseCurieOrIri(hint["@id"], knownPrefixes, path);
    id = parsed.value;
    if (parsed.kind === "curie" && parsed.prefix) {
      analysis.usedBuiltins.add(parsed.prefix);
      if (!(parsed.prefix in analysis.prefixes) && parsed.prefix in BUILTIN_PREFIXES) {
        analysis.usedBuiltins.add(parsed.prefix);
      }
    }
  }

  const types = nonNullTypes(schema);
  const isArray = types.includes("array") || "items" in schema || "prefixItems" in schema;

  let coercion: Coercion = { kind: "none" };
  let container: "@set" | "@list" | undefined;
  let scopedTerms: TermModel[] = [];
  let enumAsVocab = false;
  let enumValues: string[] | undefined;
  let nestedClassIri: string | undefined;
  let nestedClassName: string | undefined;

  const itemInfo = itemsSchema(schema);

  if (isArray) {
    container = analysis.opts.arrays === "list" ? "@list" : "@set";

    if (itemInfo.kind === "tuple" && itemInfo.tuple) {
      container = "@list";
      const coerces: Coercion[] = [];
      for (let i = 0; i < itemInfo.tuple.length; i++) {
        const it = itemInfo.tuple[i];
        if (it === true || it === false || !isPlainObject(it)) {
          coerces.push({ kind: "none" });
          continue;
        }
        const u = unwrapNullable(analysis, it, pointerJoin(schemaPath, "prefixItems", i));
        coerces.push(scalarCoercion(analysis, u.schema, u.path));
      }
      if (coerces.length > 0 && coerces.every((c) => coercionEqual(c, coerces[0]) && c.kind !== "none")) {
        coercion = coerces[0];
      } else if (coerces.some((c) => c.kind !== "none")) {
        warn(analysis, "W_MIXED_TUPLE", path, `mixed tuple coercions`);
        coercion = { kind: "none" };
      }
    } else if (itemInfo.kind === "list" && isPlainObject(itemInfo.items)) {
      const itemSchema = itemInfo.items;
      const itemTypes = nonNullTypes(itemSchema);
      // nested array?
      if (itemTypes.includes("array") || "items" in itemSchema || "prefixItems" in itemSchema) {
        coercion = { kind: "json" };
        container = undefined;
        warn(analysis, "W_NESTED_ARRAY", path, `array of arrays → @json`);
      } else if (isObjectSchema(itemSchema)) {
        if (
          isPlainObject(itemSchema.properties) &&
          Object.keys(itemSchema.properties).length > 0
        ) {
          const nested = buildNestedObject(
            analysis,
            itemSchema,
            pointerJoin(schemaPath, "items"),
            owner,
            name,
            refStack,
            inherited,
            deref.defName,
          );
          coercion = { kind: "node", classIri: nested.classIri, className: nested.className };
          nestedClassIri = nested.classIri;
          nestedClassName = nested.className;
          scopedTerms = nested.terms;
        } else {
          coercion = { kind: "json" };
        }
      } else {
        const u = unwrapNullable(analysis, itemSchema, pointerJoin(schemaPath, "items"));
        coercion = scalarCoercion(analysis, u.schema, u.path);
        // enums on items
        const enumResult = handleEnum(analysis, u.schema, path, name, coercion);
        if (enumResult) {
          coercion = enumResult.coercion;
          enumAsVocab = enumResult.enumAsVocab;
          enumValues = enumResult.enumValues;
        }
      }
    }
  } else if (isObjectSchema(schema)) {
    const hasProps = isPlainObject(schema.properties) && Object.keys(schema.properties).length > 0;
    if (!hasProps) {
      coercion = { kind: "json" };
      if ("patternProperties" in schema || "additionalProperties" in schema) {
        warn(analysis, "W_UNMAPPED_KEYS", path, `free-form object keys unmapped`);
      }
    } else if (deref.cyclic) {
      // term without scoped context
      coercion = { kind: "node" };
      scopedTerms = [];
    } else {
      const nested = buildNestedObject(
        analysis,
        schema,
        schemaPath,
        owner,
        name,
        refStack,
        inherited,
        deref.defName,
      );
      coercion = { kind: "node", classIri: nested.classIri, className: nested.className };
      nestedClassIri = nested.classIri;
      nestedClassName = nested.className;
      scopedTerms = nested.terms;
    }
  } else {
    coercion = scalarCoercion(analysis, schema, schemaPath);
    const enumResult = handleEnum(analysis, schema, path, name, coercion);
    if (enumResult) {
      coercion = enumResult.coercion;
      enumAsVocab = enumResult.enumAsVocab;
      enumValues = enumResult.enumValues;
    }
  }
  releaseStack();

  // Hints override
  if (hint?.["@type"]) {
    if (hint["@type"] === "@id") coercion = { kind: "id" };
    else if (hint["@type"] === "@vocab") {
      coercion = { kind: "vocab" };
      if (!enumAsVocab) {
        const enumResult = handleEnum(analysis, schema, path, name, coercion, true);
        if (enumResult) {
          enumAsVocab = enumResult.enumAsVocab;
          enumValues = enumResult.enumValues;
          coercion = enumResult.coercion;
        } else {
          coercion = { kind: "vocab" };
        }
      }
    } else if (hint["@type"] === "@json") coercion = { kind: "json" };
    else {
      const parsed = parseCurieOrIri(hint["@type"], knownPrefixes, path);
      if (parsed.kind === "curie" && parsed.prefix) analysis.usedBuiltins.add(parsed.prefix);
      coercion = { kind: "xsd", curie: hint["@type"] };
    }
  }
  if (hint?.["@container"]) {
    container = hint["@container"];
  }

  if (coercion.kind === "xsd" && coercion.curie.startsWith("xsd:")) {
    analysis.usedBuiltins.add("xsd");
  }
  if (coercion.kind === "id" || coercion.kind === "vocab") {
    // no xsd
  }

  const term: TermModel = {
    name,
    path,
    excluded: false,
    id,
    coercion,
    container,
    scopedTerms,
    enumValues,
    enumAsVocab,
    descriptions: Array.from(new Set(descriptions)).sort(),
    schema,
    requiredEverywhere: false,
    isArray,
    minItems: typeof schema.minItems === "number" ? schema.minItems : undefined,
    maxItems: typeof schema.maxItems === "number" ? schema.maxItems : undefined,
    pattern: typeof schema.pattern === "string" ? schema.pattern : undefined,
    minLength: typeof schema.minLength === "number" ? schema.minLength : undefined,
    maxLength: typeof schema.maxLength === "number" ? schema.maxLength : undefined,
    minimum: typeof schema.minimum === "number" ? schema.minimum : undefined,
    maximum: typeof schema.maximum === "number" ? schema.maximum : undefined,
    exclusiveMinimum:
      typeof schema.exclusiveMinimum === "number" ? schema.exclusiveMinimum : undefined,
    exclusiveMaximum:
      typeof schema.exclusiveMaximum === "number" ? schema.exclusiveMaximum : undefined,
    enumRaw: Array.isArray(schema.enum) ? schema.enum : undefined,
    constRaw: "const" in schema ? schema.const : undefined,
    additionalPropertiesFalse: schema.additionalProperties === false,
    conflict: false,
    nestedClassIri,
    nestedClassName,
  };

  return term;
}

function handleEnum(
  analysis: Analysis,
  schema: Record<string, unknown>,
  path: string,
  termName: string,
  coercion: Coercion,
  force = false,
): { coercion: Coercion; enumAsVocab: boolean; enumValues: string[] } | undefined {
  const values = Array.isArray(schema.enum)
    ? schema.enum
    : "const" in schema
      ? [schema.const]
      : undefined;
  if (!values) return undefined;

  const wantIri = force || analysis.opts.enumAsIri || (coercion.kind === "vocab");
  if (!wantIri) return undefined;

  const strings = values.every((v) => typeof v === "string") ? (values as string[]) : null;
  if (!strings || !strings.every((v) => ENUM_IRI_PATTERN.test(v))) {
    warn(analysis, "W_ENUM_NOT_IRI", path, `enum values not usable as IRIs`);
    return undefined;
  }
  return {
    coercion: { kind: "vocab" },
    enumAsVocab: true,
    enumValues: strings,
  };
}

function classIriFor(
  analysis: Analysis,
  name: string,
  hint?: ClassHint | RootHint,
): { iri: string; name: string; foreign: boolean } {
  if (hint?.["@type"]) {
    const known = { ...BUILTIN_PREFIXES, ...analysis.prefixes };
    const parsed = parseCurieOrIri(hint["@type"], known, "");
    if (parsed.kind === "curie" && parsed.prefix) {
      analysis.usedBuiltins.add(parsed.prefix);
      const base = known[parsed.prefix];
      const local = hint["@type"]!.slice(parsed.prefix.length + 1);
      const iri = base + local;
      const foreign = !iri.startsWith(analysis.vocab);
      return { iri: hint["@type"]!, name: pascalCase(name), foreign };
    }
    const foreign = !parsed.value.startsWith(analysis.vocab);
    return { iri: parsed.value, name: pascalCase(name), foreign };
  }
  const n = pascalCase(name);
  return { iri: analysis.vocab + n, name: n, foreign: false };
}

function buildNestedObject(
  analysis: Analysis,
  schema: Record<string, unknown>,
  path: string,
  parent: ClassModel | undefined,
  propName: string,
  refStack: Set<string>,
  inherited: Map<string, TermModel>,
  defName?: string,
): { terms: TermModel[]; classIri?: string; className?: string; classModel?: ClassModel } {
  const known = { ...BUILTIN_PREFIXES, ...analysis.prefixes };
  let classHint: ClassHint | undefined;
  if ("x-jsonld" in schema) {
    classHint = parseClassHint(schema["x-jsonld"], pointerJoin(path, "x-jsonld"), known, false);
  }

  let className: string | undefined;
  let classIri: string | undefined;
  let foreign = false;

  if (classHint?.["@type"]) {
    const c = classIriFor(analysis, defName ?? schema.title as string ?? propName, classHint);
    className = c.name;
    classIri = c.iri;
    foreign = c.foreign;
  } else if (defName) {
    className = pascalCase(defName);
    classIri = analysis.vocab + className;
  } else if (typeof schema.title === "string" && schema.title) {
    className = pascalCase(schema.title);
    classIri = analysis.vocab + className;
  }

  const shapeIri = className
    ? analysis.vocab + className + "Shape"
    : (parent?.shapeIri ?? analysis.vocab + "RootShape") + "-" + pctEncode(propName) + "-node";

  const classModel: ClassModel = {
    name: className ?? propName,
    iri: classIri ?? shapeIri, // if no class, still need a holder — won't emit rdfs:Class
    path,
    title: typeof schema.title === "string" ? schema.title : undefined,
    description: typeof schema.description === "string" ? schema.description : undefined,
    terms: [],
    required: new Set(
      Array.isArray(schema.required)
        ? schema.required.filter((x): x is string => typeof x === "string")
        : [],
    ),
    additionalPropertiesFalse: schema.additionalProperties === false,
    idProperty: classHint?.["@idProperty"],
    idPrefix: classHint?.["@idPrefix"],
    isRoot: false,
    shapeIri,
    foreign,
  };

  // Also gather required from allOf merges
  const propMap = gatherProperties(analysis, schema, path, classModel.required);
  for (const [n, cands] of propMap) {
    if (cands.every((c) => c.required)) classModel.required.add(n);
  }

  const terms = buildTermsForOwner(analysis, propMap, classModel, refStack, inherited);
  classModel.terms = terms;

  if (classIri && !foreign) {
    analysis.classes.push(classModel);
  } else if (classIri && foreign) {
    analysis.classes.push(classModel);
  } else {
    // untitled nested — still need shape (S-01)
    analysis.classes.push(classModel);
  }

  analysis.termsByOwner.set(classModel, terms);
  return { terms, classIri, className, classModel };
}

function buildTermsForOwner(
  analysis: Analysis,
  propMap: Map<string, PropCandidate[]>,
  owner: ClassModel,
  refStack: Set<string>,
  inherited: Map<string, TermModel>,
): TermModel[] {
  const terms: TermModel[] = [];
  const names = Array.from(propMap.keys()).sort();

  for (const name of names) {
    const cands = propMap.get(name)!;
    // Filter refinements (C-16b)
    const determining = cands.filter((c) => hasTypeDeterminingKeyword(c.schema) || Object.keys(c.schema).length === 0);
    // empty schema from boolean true still "no type-determining" — treat as refinement unless sole candidate
    const effective = cands.filter((c) => hasTypeDeterminingKeyword(c.schema));
    const useCands = effective.length > 0 ? effective : cands;

    const built: TermModel[] = [];
    for (const c of useCands) {
      const t = buildTermFromSchema(analysis, name, c.schema, c.path, owner, new Set(refStack), inherited);
      if (t) {
        t.requiredEverywhere = c.required;
        built.push(t);
      }
    }

    if (built.length === 0) continue;

    // Conflict detection
    const sigs = new Set(built.map((t) => termSignature(t)));
    let term: TermModel;
    if (sigs.size > 1) {
      warn(analysis, "W_CONFLICT", built[0].path, `conflicting definitions for ${name}`);
      term = {
        ...built[0],
        coercion: { kind: "none" },
        container: undefined,
        scopedTerms: [],
        enumAsVocab: false,
        enumValues: undefined,
        conflict: true,
        id: analysis.vocab + pctEncode(name),
        excluded: false,
      };
      // Keep @id only
    } else {
      term = built[0];
      // Merge descriptions
      const descs = new Set<string>();
      for (const t of built) for (const d of t.descriptions) descs.add(d);
      term.descriptions = Array.from(descs).sort();
      // required if all candidates required (for union branches, already adjusted)
      term.requiredEverywhere = useCands.every((c) => c.required) && owner.required.has(name)
        ? true
        : useCands.every((c) => c.required);
      if (owner.required.has(name) && !useCands.some((c) => c.fromStaticUnion || c.fromConditional)) {
        term.requiredEverywhere = true;
      }
    }

    // required from owner set for allOf-merged
    if (owner.required.has(name) && !useCands.some((c) => c.fromStaticUnion || c.fromConditional)) {
      term.requiredEverywhere = true;
    } else if (useCands.some((c) => c.fromStaticUnion || c.fromConditional)) {
      // optional unless every branch required — already encoded in c.required
      term.requiredEverywhere = useCands.every((c) => c.required);
    }

    terms.push(term);
    const list = analysis.propertyIndex.get(term.id) ?? [];
    list.push(term);
    analysis.propertyIndex.set(term.id, list);
  }

  return terms;
}

export function analyze(rootDoc: unknown, opts: ConverterOptions): Analysis {
  if (!isPlainObject(rootDoc)) {
    throw new JsonLdSchemaError("E_SCHEMA_INVALID", "", "root schema must be an object");
  }

  const pointer = opts.pointer ?? "";
  let rootSchema: Record<string, unknown> = rootDoc;
  let rootPointer = "";
  if (pointer && pointer !== "") {
    const target = getByPointer(rootDoc, pointer.startsWith("/") ? pointer : pointer);
    if (!isPlainObject(target)) {
      throw new JsonLdSchemaError("E_SCHEMA_INVALID", pointer, "target is not an object schema");
    }
    rootSchema = target;
    rootPointer = pointer.startsWith("/") ? pointer : pointer;
  }

  const analysis: Analysis = {
    opts,
    rootDoc,
    rootSchema,
    rootPointer,
    vocab: opts.vocab,
    prefixes: { ...opts.prefixes },
    usedBuiltins: new Set(["xsd"]),
    warnings: [],
    classes: [],
    termsByOwner: new Map(),
    propertyIndex: new Map(),
    contextObject: {},
  };

  // Expand root $ref so pointer targets like { $ref: "#/$defs/X" } work
  {
    const exp = expandForGather(analysis, rootSchema, rootPointer);
    rootSchema = exp.schema;
    rootPointer = exp.path;
    analysis.rootSchema = rootSchema;
    analysis.rootPointer = rootPointer;
  }

  // Root hints
  const known = { ...BUILTIN_PREFIXES, ...analysis.prefixes };
  let rootHint: RootHint | undefined;
  if ("x-jsonld" in rootSchema) {
    rootHint = parseClassHint(
      rootSchema["x-jsonld"],
      pointerJoin(rootPointer, "x-jsonld"),
      known,
      true,
    ) as RootHint;
  }
  if (rootHint?.["@vocab"]) {
    analysis.vocab = rootHint["@vocab"];
    analysis.opts = { ...analysis.opts, vocab: analysis.vocab };
  }
  if (rootHint?.["@prefixes"]) {
    analysis.prefixes = { ...analysis.prefixes, ...rootHint["@prefixes"] };
  }

  // Root class
  let rootClassName: string | undefined;
  let rootClassIri: string | undefined;
  let foreign = false;

  if (rootHint?.["@type"]) {
    const c = classIriFor(analysis, "Root", rootHint);
    rootClassIri = c.iri;
    rootClassName = c.name;
    foreign = c.foreign;
  } else if (opts.rootClass) {
    if (looksLikeCurieOrIri(opts.rootClass)) {
      rootClassIri = opts.rootClass;
      rootClassName = pascalCase(opts.rootClass.includes(":") ? opts.rootClass.split(":").pop()! : opts.rootClass);
      foreign = !String(expandMaybe(analysis, opts.rootClass)).startsWith(analysis.vocab);
    } else {
      rootClassName = pascalCase(opts.rootClass);
      rootClassIri = analysis.vocab + rootClassName;
    }
  } else if (typeof rootSchema.title === "string" && rootSchema.title) {
    rootClassName = pascalCase(rootSchema.title);
    rootClassIri = analysis.vocab + rootClassName;
  }

  const rootClass: ClassModel = {
    name: rootClassName ?? "Root",
    iri: rootClassIri ?? analysis.vocab + "Root",
    path: rootPointer,
    title: typeof rootSchema.title === "string" ? rootSchema.title : undefined,
    description: typeof rootSchema.description === "string" ? rootSchema.description : undefined,
    terms: [],
    required: new Set(
      Array.isArray(rootSchema.required)
        ? rootSchema.required.filter((x): x is string => typeof x === "string")
        : [],
    ),
    additionalPropertiesFalse: rootSchema.additionalProperties === false,
    idProperty: rootHint?.["@idProperty"],
    idPrefix: rootHint?.["@idPrefix"],
    isRoot: true,
    shapeIri: rootClassName ? analysis.vocab + rootClassName + "Shape" : analysis.vocab + "RootShape",
    foreign,
  };

  // If no class at all, still have RootShape
  const hasClass = !!(rootHint?.["@type"] || opts.rootClass || (typeof rootSchema.title === "string" && rootSchema.title));
  if (!hasClass) {
    rootClass.iri = analysis.vocab + "Root";
    rootClass.name = "Root";
    // no rdfs:Class emission later for nameless — V-01 says every class whose IRI under vocab
    // root with none → RootShape only (S-01)
  }

  analysis.rootClass = hasClass ? rootClass : rootClass;

  const propMap = gatherProperties(analysis, rootSchema, rootPointer, rootClass.required);
  const inherited = new Map<string, TermModel>();
  const terms = buildTermsForOwner(analysis, propMap, rootClass, new Set(), inherited);
  rootClass.terms = terms;
  analysis.termsByOwner.set(rootClass, terms);
  if (hasClass) {
    analysis.classes.unshift(rootClass);
  } else {
    // Still register for shapes
    analysis.classes.unshift(rootClass);
  }

  // Store whether root has a real class for annotation
  (analysis as Analysis & { rootHasClass: boolean }).rootHasClass = hasClass;

  analysis.warnings = sortWarnings(dedupeWarnings(analysis.warnings));
  return analysis;
}

function dedupeWarnings(warnings: Warning[]): Warning[] {
  const seen = new Set<string>();
  const out: Warning[] = [];
  for (const w of warnings) {
    const k = `${w.code}|${w.path}|${w.message}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
  }
  return out;
}

function looksLikeCurieOrIri(s: string): boolean {
  return s.includes(":") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(s);
}

function expandMaybe(analysis: Analysis, value: string): string {
  if (value.includes("://") || value.startsWith("urn:")) return value;
  const idx = value.indexOf(":");
  if (idx > 0) {
    const prefix = value.slice(0, idx);
    const all = { ...BUILTIN_PREFIXES, ...analysis.prefixes };
    if (prefix in all) return all[prefix] + value.slice(idx + 1);
  }
  return value;
}

export function expandIri(analysis: Analysis, value: string): string {
  return expandMaybe(analysis, value);
}
