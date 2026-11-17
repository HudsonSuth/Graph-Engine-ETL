/**
 * Deliberately wrong converter for B-01.
 * - no format coercion
 * - arrays always @list
 * - unsorted keys
 * - required ignored in SHACL
 */
import type { ConverterOptionsInput } from "./options.js";
import { normalizeOptions } from "./options.js";
import { getByPointer, isPlainObject, pctEncode } from "./util.js";
import type { Warning } from "./errors.js";

function walkProps(
  schema: Record<string, unknown>,
  vocab: string,
  ctx: Record<string, unknown>,
) {
  if (!isPlainObject(schema.properties)) return;
  for (const [name, prop] of Object.entries(schema.properties as Record<string, unknown>)) {
    // unsorted insertion order from object
    const entry: Record<string, unknown> = {
      "@id": vocab + pctEncode(name),
    };
    if (isPlainObject(prop)) {
      const types = Array.isArray(prop.type) ? prop.type : prop.type ? [prop.type] : [];
      // NO format coercion (broken)
      if (types.includes("integer")) entry["@type"] = "xsd:integer";
      else if (types.includes("number")) entry["@type"] = "xsd:double";
      else if (types.includes("boolean")) entry["@type"] = "xsd:boolean";
      if (types.includes("array") || "items" in prop) {
        entry["@container"] = "@list"; // always list (broken)
      }
      if (isPlainObject(prop.properties)) {
        const nested: Record<string, unknown> = {};
        walkProps(prop, vocab, nested);
        if (Object.keys(nested).length) entry["@context"] = nested;
      }
    }
    ctx[name] = entry;
  }
}

export function brokenToContext(
  schemaDoc: unknown,
  optsInput: ConverterOptionsInput = {},
): { document: Record<string, unknown>; warnings: Warning[]; text: string } {
  const opts = normalizeOptions(optsInput);
  let schema = schemaDoc as Record<string, unknown>;
  if (opts.pointer) {
    schema = getByPointer(schemaDoc, opts.pointer) as Record<string, unknown>;
  }
  const ctx: Record<string, unknown> = {
    "@version": 1.1,
    xsd: "http://www.w3.org/2001/XMLSchema#",
  };
  if (opts.vocabFallback) ctx["@vocab"] = opts.vocab;
  walkProps(schema, opts.vocab, ctx);
  // unsorted keys deliberately
  const document = { "@context": ctx };
  const text = JSON.stringify(document, null, 2) + "\n";
  return { document, warnings: [], text };
}

export function brokenToShacl(
  schemaDoc: unknown,
  optsInput: ConverterOptionsInput = {},
): { text: string; warnings: Warning[] } {
  const opts = normalizeOptions(optsInput);
  let schema = schemaDoc as Record<string, unknown>;
  if (opts.pointer) {
    schema = getByPointer(schemaDoc, opts.pointer) as Record<string, unknown>;
  }
  // Ignore required (broken)
  const lines = [
    "@prefix sh: <http://www.w3.org/ns/shacl#> .",
    "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .",
    "",
    `<${opts.vocab}RootShape> a sh:NodeShape .`,
  ];
  if (isPlainObject(schema.properties)) {
    for (const name of Object.keys(schema.properties as object)) {
      const ps = `${opts.vocab}RootShape-${pctEncode(name)}`;
      lines.push(`<${ps}> a sh:PropertyShape ;`);
      lines.push(`    sh:path <${opts.vocab}${pctEncode(name)}> .`);
      // no minCount for required
    }
  }
  return { text: lines.join("\n") + "\n", warnings: [] };
}
