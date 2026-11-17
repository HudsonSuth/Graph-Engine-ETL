import type { Analysis, Coercion, TermModel } from "./model.js";
import { expandIri } from "./model.js";
import { BUILTIN_PREFIXES } from "./options.js";
import { iriRef, lit, serializeTurtle, type Triple } from "./turtle.js";

function rangeFor(analysis: Analysis, coercion: Coercion): string | undefined {
  switch (coercion.kind) {
    case "xsd":
      return expandIri(analysis, coercion.curie);
    case "none":
      return BUILTIN_PREFIXES.xsd + "string";
    case "json":
      return BUILTIN_PREFIXES.rdf + "JSON";
    case "id":
    case "vocab":
      return undefined; // IRI — ObjectProperty, range optional unless single class
    case "node":
      return coercion.classIri ? expandIri(analysis, coercion.classIri) : undefined;
    default:
      return undefined;
  }
}

function isLiteralCoercion(c: Coercion): boolean {
  return c.kind === "xsd" || c.kind === "none" || c.kind === "json";
}

function isObjectCoercion(c: Coercion): boolean {
  return c.kind === "id" || c.kind === "vocab" || c.kind === "node";
}

function collectTerms(terms: TermModel[], into: TermModel[]) {
  for (const t of terms) {
    if (!t.excluded) into.push(t);
    if (t.scopedTerms.length) collectTerms(t.scopedTerms, into);
  }
}

export function buildVocabTurtle(analysis: Analysis): string {
  const triples: Triple[] = [];
  const prefixes: Record<string, string> = {
    rdf: BUILTIN_PREFIXES.rdf,
    rdfs: BUILTIN_PREFIXES.rdfs,
    owl: BUILTIN_PREFIXES.owl,
    xsd: BUILTIN_PREFIXES.xsd,
  };

  // Classes under vocab (V-01) — never describe foreign IRIs
  for (const cls of analysis.classes) {
    const iri = expandIri(analysis, cls.iri);
    if (!iri.startsWith(analysis.vocab)) continue;
    // Skip synthetic holders without a real class name for root-without-class?
    // Root without class still has iri vocab+Root — S-01 says shape only when no class.
    // V-01: every class whose IRI is under vocab. Root with title/rootClass/hint gets class.
    // For nested untitled objects we used shape IRI as class.iri when no class — those shouldn't be rdfs:Class
    if (!cls.isRoot && !cls.nestedHasRealClass && !looksLikeClass(cls, analysis)) {
      // untitled nested: name is propName, iri may be shape-like
      if (iri.endsWith("-node") || cls.name === cls.path.split("/").pop()) {
        // still emit if we assigned vocab+PascalCase
      }
    }
    if (cls.foreign) continue;
    if (!shouldEmitClass(cls, analysis)) continue;

    triples.push({ s: iriRef(iri), p: "a", o: "rdfs:Class" });
    triples.push({ s: iriRef(iri), p: "a", o: "owl:Class" });
    const label = cls.title ?? cls.name;
    triples.push({ s: iriRef(iri), p: "rdfs:label", o: lit(label) });
    if (cls.description) {
      triples.push({ s: iriRef(iri), p: "rdfs:comment", o: lit(cls.description) });
    }
  }

  // Properties (V-02, V-03)
  const allTerms: TermModel[] = [];
  if (analysis.rootClass) collectTerms(analysis.rootClass.terms, allTerms);

  // Group by expanded property IRI
  const byIri = new Map<string, { terms: TermModel[]; owners: Set<string>; ranges: Set<string> }>();
  for (const t of allTerms) {
    if (t.excluded) continue;
    const iri = expandIri(analysis, t.id);
    if (!iri.startsWith(analysis.vocab)) continue;
    const entry = byIri.get(iri) ?? { terms: [], owners: new Set(), ranges: new Set() };
    entry.terms.push(t);
    const owner = findOwnerClass(analysis, t);
    if (owner && expandIri(analysis, owner.iri).startsWith(analysis.vocab) && shouldEmitClass(owner, analysis)) {
      entry.owners.add(expandIri(analysis, owner.iri));
    }
    const range = rangeFor(analysis, t.coercion);
    if (range) entry.ranges.add(range);
    byIri.set(iri, entry);
  }

  for (const [iri, entry] of [...byIri.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const label = entry.terms[0].name;
    triples.push({ s: iriRef(iri), p: "a", o: "rdf:Property" });
    triples.push({ s: iriRef(iri), p: "rdfs:label", o: lit(label) });

    const kinds = new Set(entry.terms.map((t) => (isLiteralCoercion(t.coercion) ? "lit" : isObjectCoercion(t.coercion) ? "obj" : "unk")));
    if (kinds.size === 1 && kinds.has("lit")) {
      triples.push({ s: iriRef(iri), p: "a", o: "owl:DatatypeProperty" });
    } else if (kinds.size === 1 && kinds.has("obj")) {
      triples.push({ s: iriRef(iri), p: "a", o: "owl:ObjectProperty" });
    } else if (kinds.has("lit") && !kinds.has("obj")) {
      triples.push({ s: iriRef(iri), p: "a", o: "owl:DatatypeProperty" });
    } else if (kinds.has("obj")) {
      triples.push({ s: iriRef(iri), p: "a", o: "owl:ObjectProperty" });
    }

    const comments = Array.from(
      new Set(entry.terms.flatMap((t) => t.descriptions)),
    ).sort();
    for (const c of comments) {
      triples.push({ s: iriRef(iri), p: "rdfs:comment", o: lit(c) });
    }

    if (entry.owners.size === 1) {
      const domain = [...entry.owners][0];
      triples.push({ s: iriRef(iri), p: "rdfs:domain", o: iriRef(domain) });
    }
    if (entry.ranges.size === 1) {
      const range = [...entry.ranges][0];
      // Prefer CURIE for xsd/rdf
      let o = iriRef(range);
      if (range.startsWith(BUILTIN_PREFIXES.xsd)) o = "xsd:" + range.slice(BUILTIN_PREFIXES.xsd.length);
      else if (range.startsWith(BUILTIN_PREFIXES.rdf)) o = "rdf:" + range.slice(BUILTIN_PREFIXES.rdf.length);
      triples.push({ s: iriRef(iri), p: "rdfs:range", o });
    }
  }

  return serializeTurtle(prefixes, triples);
}

function shouldEmitClass(
  cls: { isRoot: boolean; iri: string; title?: string; name: string; path: string },
  analysis: Analysis,
): boolean {
  const iri = expandIri(analysis, cls.iri);
  if (!iri.startsWith(analysis.vocab)) return false;
  if (iri.includes("-") && iri.endsWith("-node")) return false;
  // Root without real class: still "Root" — only emit if rootHasClass
  if (cls.isRoot && !(analysis as Analysis & { rootHasClass?: boolean }).rootHasClass) {
    return false;
  }
  return true;
}

function looksLikeClass(cls: { iri: string }, analysis: Analysis): boolean {
  const iri = expandIri(analysis, cls.iri);
  return iri.startsWith(analysis.vocab) && !iri.includes("-node");
}

function findOwnerClass(analysis: Analysis, term: TermModel) {
  for (const [owner, terms] of analysis.termsByOwner) {
    if (terms.includes(term)) return owner;
    // deep search
    if (containsTerm(terms, term)) return owner;
  }
  return undefined;
}

function containsTerm(terms: TermModel[], term: TermModel): boolean {
  for (const t of terms) {
    if (t === term) return true;
    if (t.scopedTerms.length && containsTerm(t.scopedTerms, term)) return true;
  }
  return false;
}

// augment ClassModel typing used above
declare module "./model.js" {
  interface ClassModel {
    nestedHasRealClass?: boolean;
  }
}
