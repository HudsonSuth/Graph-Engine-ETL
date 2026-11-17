import type { Analysis, Coercion, ClassModel, TermModel } from "./model.js";
import { expandIri } from "./model.js";
import { BUILTIN_PREFIXES } from "./options.js";
import { iriRef, lit, numLit, serializeTurtle, type Triple } from "./turtle.js";
import { pctEncode } from "./util.js";

function datatypeFor(analysis: Analysis, c: Coercion): string | undefined {
  switch (c.kind) {
    case "xsd":
      return c.curie.includes("://") ? iriRef(c.curie) : c.curie;
    case "none":
      return "xsd:string";
    case "json":
      return "rdf:JSON";
    default:
      return undefined;
  }
}

function emitPropertyShape(
  analysis: Analysis,
  triples: Triple[],
  shapeIri: string,
  term: TermModel,
  parent: ClassModel,
) {
  if (term.excluded) return;

  const propShape = `${parent.shapeIri}-${pctEncode(term.name)}`;
  const pathIri = expandIri(analysis, term.id);

  triples.push({ s: iriRef(propShape), p: "a", o: "sh:PropertyShape" });
  triples.push({ s: iriRef(propShape), p: "sh:path", o: iriRef(pathIri) });
  triples.push({ s: iriRef(shapeIri), p: "sh:property", o: iriRef(propShape) });

  let minCount: number | undefined;
  let maxCount: number | undefined;

  if (term.requiredEverywhere) {
    minCount = 1;
  }
  if (!term.isArray) {
    maxCount = 1;
  } else {
    if (term.minItems !== undefined) {
      minCount = Math.max(minCount ?? 0, term.minItems);
      if (term.requiredEverywhere) minCount = Math.max(minCount, 1);
    }
    if (term.maxItems !== undefined) maxCount = term.maxItems;
  }

  if (minCount !== undefined && minCount > 0) {
    triples.push({ s: iriRef(propShape), p: "sh:minCount", o: numLit(minCount) });
  }
  if (maxCount !== undefined) {
    triples.push({ s: iriRef(propShape), p: "sh:maxCount", o: numLit(maxCount) });
  }

  const dt = datatypeFor(analysis, term.coercion);
  if (dt) {
    triples.push({ s: iriRef(propShape), p: "sh:datatype", o: dt });
  } else if (term.coercion.kind === "id" || term.coercion.kind === "vocab") {
    triples.push({ s: iriRef(propShape), p: "sh:nodeKind", o: "sh:IRI" });
  } else if (term.coercion.kind === "node") {
    const nested =
      term.nestedClassIri &&
      analysis.classes.find((c) => expandIri(analysis, c.iri) === expandIri(analysis, term.nestedClassIri!));
    // find nested shape by matching terms owner
    const nestedShape = findNestedShape(analysis, term, parent);
    if (nestedShape) {
      triples.push({ s: iriRef(propShape), p: "sh:node", o: iriRef(nestedShape) });
    }
  }

  if (term.pattern) {
    triples.push({ s: iriRef(propShape), p: "sh:pattern", o: lit(term.pattern) });
  }
  if (term.minLength !== undefined) {
    triples.push({ s: iriRef(propShape), p: "sh:minLength", o: numLit(term.minLength) });
  }
  if (term.maxLength !== undefined) {
    triples.push({ s: iriRef(propShape), p: "sh:maxLength", o: numLit(term.maxLength) });
  }
  if (term.minimum !== undefined) {
    triples.push({ s: iriRef(propShape), p: "sh:minInclusive", o: numLit(term.minimum) });
  }
  if (term.maximum !== undefined) {
    triples.push({ s: iriRef(propShape), p: "sh:maxInclusive", o: numLit(term.maximum) });
  }
  if (term.exclusiveMinimum !== undefined) {
    triples.push({ s: iriRef(propShape), p: "sh:minExclusive", o: numLit(term.exclusiveMinimum) });
  }
  if (term.exclusiveMaximum !== undefined) {
    triples.push({ s: iriRef(propShape), p: "sh:maxExclusive", o: numLit(term.exclusiveMaximum) });
  }

  // enum / const → sh:in
  const values =
    term.enumRaw ??
    (term.constRaw !== undefined ? [term.constRaw] : undefined);
  if (values) {
    const parts = values.map((v) => enumValueTurtle(analysis, term, v));
    triples.push({
      s: iriRef(propShape),
      p: "sh:in",
      o: `( ${parts.join(" ")} )`,
    });
  }
}

function enumValueTurtle(analysis: Analysis, term: TermModel, v: unknown): string {
  if (term.enumAsVocab && typeof v === "string") {
    return iriRef(analysis.vocab + pctEncode(term.name) + "/" + v);
  }
  if (typeof v === "string") {
    const dt = datatypeFor(analysis, term.coercion);
    if (dt && dt !== "xsd:string") return lit(v, dt);
    return lit(v);
  }
  if (typeof v === "number") return numLit(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return lit(JSON.stringify(v));
}

function findNestedShape(analysis: Analysis, term: TermModel, parent: ClassModel): string | undefined {
  // Prefer class shape
  if (term.nestedClassName) {
    const cls = analysis.classes.find((c) => c.name === term.nestedClassName && !c.isRoot);
    if (cls) return cls.shapeIri;
  }
  // Untitled nested
  const expected = parent.shapeIri + "-" + pctEncode(term.name) + "-node";
  const cls = analysis.classes.find((c) => c.shapeIri === expected);
  return cls?.shapeIri ?? expected;
}

function emitNodeShape(analysis: Analysis, triples: Triple[], cls: ClassModel) {
  const shapeIri = cls.shapeIri;
  triples.push({ s: iriRef(shapeIri), p: "a", o: "sh:NodeShape" });

  const classIri = expandIri(analysis, cls.iri);
  const isNamedClassShape = cls.shapeIri === analysis.vocab + cls.name + "Shape";
  const rootHasClass = !!(analysis as Analysis & { rootHasClass?: boolean }).rootHasClass;
  if (
    (cls.isRoot && rootHasClass && isNamedClassShape) ||
    (!cls.isRoot &&
      classIri.startsWith(analysis.vocab) &&
      !classIri.includes("-node") &&
      isNamedClassShape)
  ) {
    triples.push({ s: iriRef(shapeIri), p: "sh:targetClass", o: iriRef(classIri) });
  }

  if (cls.additionalPropertiesFalse) {
    triples.push({ s: iriRef(shapeIri), p: "sh:closed", o: "true" });
    triples.push({
      s: iriRef(shapeIri),
      p: "sh:ignoredProperties",
      o: `( rdf:type )`,
    });
  }

  for (const term of cls.terms) {
    emitPropertyShape(analysis, triples, shapeIri, term, cls);
  }
}

export function buildShaclTurtle(analysis: Analysis): string {
  const triples: Triple[] = [];
  const prefixes: Record<string, string> = {
    rdf: BUILTIN_PREFIXES.rdf,
    rdfs: BUILTIN_PREFIXES.rdfs,
    sh: BUILTIN_PREFIXES.sh,
    xsd: BUILTIN_PREFIXES.xsd,
  };

  // Deduplicate classes by shapeIri
  const seen = new Set<string>();
  for (const cls of analysis.classes) {
    if (seen.has(cls.shapeIri)) continue;
    seen.add(cls.shapeIri);
    emitNodeShape(analysis, triples, cls);
  }

  return serializeTurtle(prefixes, triples);
}
