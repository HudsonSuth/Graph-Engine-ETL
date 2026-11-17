import type { Analysis, Coercion, TermModel } from "./model.js";
import { expandIri } from "./model.js";
import { BUILTIN_PREFIXES } from "./options.js";
import { pctEncode } from "./util.js";

function coercionToType(c: Coercion): string | undefined {
  switch (c.kind) {
    case "xsd":
      return c.curie;
    case "id":
      return "@id";
    case "vocab":
      return "@vocab";
    case "json":
      return "@json";
    default:
      return undefined;
  }
}

function termToContextEntry(
  analysis: Analysis,
  term: TermModel,
  inherited: Map<string, unknown>,
): unknown {
  if (term.excluded) return null;

  const entry: Record<string, unknown> = {
    "@id": term.id,
  };

  const t = coercionToType(term.coercion);
  if (t) entry["@type"] = t;
  if (term.container) entry["@container"] = term.container;

  // Scoped context for nested object terms or enum vocab
  const scoped: Record<string, unknown> = {};

  if (term.enumAsVocab && term.enumValues) {
    for (const v of term.enumValues) {
      scoped[v] = analysis.vocab + pctEncode(term.name) + "/" + v;
    }
  }

  if (term.scopedTerms.length > 0) {
    const childInherited = new Map(inherited);
    // Current term's entry becomes inherited for children comparison at same names
    for (const child of term.scopedTerms) {
      const childEntry = termToContextEntry(analysis, child, childInherited);
      const prev = inherited.get(child.name);
      if (prev !== undefined && jsonEqual(prev, childEntry)) {
        continue; // only terms that differ from inherited
      }
      scoped[child.name] = childEntry;
      if (!child.excluded && childEntry && typeof childEntry === "object") {
        childInherited.set(child.name, childEntry);
      }
    }
  }

  if (Object.keys(scoped).length > 0) {
    entry["@context"] = scoped;
  }

  // Collapse to plain string IRI if only @id?
  // Spec C-02: name → {"@id": vocab + pctEncode(name)} — always object form is fine
  return entry;
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function collectPropertyNames(terms: TermModel[], into: Set<string>) {
  for (const t of terms) {
    into.add(t.name);
    if (t.scopedTerms.length) collectPropertyNames(t.scopedTerms, into);
  }
}

function collectUsedPrefixesFromTerms(analysis: Analysis, terms: TermModel[]) {
  for (const t of terms) {
    if (t.excluded) continue;
    if (t.id.includes(":") && !t.id.includes("://") && !t.id.startsWith("urn:")) {
      const prefix = t.id.split(":")[0];
      if (prefix in BUILTIN_PREFIXES || prefix in analysis.prefixes) {
        analysis.usedBuiltins.add(prefix);
      }
    }
    const ty = coercionToType(t.coercion);
    if (ty && ty.includes(":") && !ty.startsWith("@")) {
      const prefix = ty.split(":")[0];
      if (prefix in BUILTIN_PREFIXES || prefix in analysis.prefixes) {
        analysis.usedBuiltins.add(prefix);
      }
    }
    if (t.scopedTerms.length) collectUsedPrefixesFromTerms(analysis, t.scopedTerms);
  }
}

export function buildContextObject(analysis: Analysis): Record<string, unknown> {
  const ctx: Record<string, unknown> = {
    "@version": 1.1,
  };

  if (analysis.opts.vocabFallback) {
    ctx["@vocab"] = analysis.vocab;
  }

  const rootTerms = analysis.rootClass?.terms ?? [];
  collectUsedPrefixesFromTerms(analysis, rootTerms);

  const propNames = new Set<string>();
  collectPropertyNames(rootTerms, propNames);

  // Prefixes to emit: xsd + root @prefixes + opts.prefixes + used builtins
  // C-18: if property name equals a prefix, don't emit it
  const candidatePrefixes: Record<string, string> = {
    xsd: BUILTIN_PREFIXES.xsd,
    ...Object.fromEntries(
      [...analysis.usedBuiltins]
        .filter((p) => p in BUILTIN_PREFIXES)
        .map((p) => [p, BUILTIN_PREFIXES[p]]),
    ),
    ...analysis.prefixes,
  };

  // Always include xsd
  candidatePrefixes.xsd = BUILTIN_PREFIXES.xsd;

  const shadowed: string[] = [];
  for (const prefix of Object.keys(candidatePrefixes)) {
    if (propNames.has(prefix)) {
      shadowed.push(prefix);
    }
  }

  for (const prefix of shadowed) {
    delete candidatePrefixes[prefix];
    // rewrite values that would use it as full IRI — handled when emitting terms
    analysis.warnings.push({
      code: "W_PREFIX_SHADOWED",
      path: "",
      message: `prefix ${prefix} shadowed by property name`,
    });
  }

  // Emit prefixes sorted later via serialize
  for (const [p, iri] of Object.entries(candidatePrefixes)) {
    ctx[p] = iri;
  }

  // Rewrite term @id/@type CURIEs of shadowed prefixes to full IRIs
  const rewrite = (terms: TermModel[]) => {
    for (const t of terms) {
      if (t.excluded) continue;
      for (const sp of shadowed) {
        if (t.id.startsWith(sp + ":")) {
          t.id = BUILTIN_PREFIXES[sp] + t.id.slice(sp.length + 1);
        }
        if (t.coercion.kind === "xsd" && t.coercion.curie.startsWith(sp + ":")) {
          t.coercion = {
            kind: "xsd",
            curie: (BUILTIN_PREFIXES[sp] ?? analysis.prefixes[sp]) + t.coercion.curie.slice(sp.length + 1),
          };
        }
      }
      if (t.scopedTerms.length) rewrite(t.scopedTerms);
    }
  };
  rewrite(rootTerms);

  const inherited = new Map<string, unknown>();
  for (const term of rootTerms) {
    ctx[term.name] = termToContextEntry(analysis, term, inherited);
    if (!term.excluded) {
      inherited.set(term.name, ctx[term.name]);
    }
  }

  return { "@context": ctx };
}

export function classIriAbsolute(analysis: Analysis, iriOrCurie: string): string {
  return expandIri(analysis, iriOrCurie);
}
