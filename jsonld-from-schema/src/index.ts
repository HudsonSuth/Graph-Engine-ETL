import { analyze } from "./model.js";
import { buildContextObject } from "./context.js";
import { buildVocabTurtle } from "./vocab.js";
import { buildShaclTurtle } from "./shacl.js";
import { annotateInstance, serializeYamlLd, validateInstance } from "./annotate.js";
import { toNQuads } from "./nquads.js";
import { normalizeOptions, type ConverterOptionsInput } from "./options.js";
import { sortWarnings, type Warning } from "./errors.js";
import { serializeJson } from "./util.js";
import { brokenToContext, brokenToShacl } from "./broken.js";

export { JsonLdSchemaError } from "./errors.js";
export type { Warning, ErrorCode, WarningCode } from "./errors.js";
export type { ConverterOptions, ConverterOptionsInput } from "./options.js";
export { toNQuads } from "./nquads.js";

const useBroken = () => process.env.JSONLD_FROM_SCHEMA_IMPL === "broken";

export interface ContextResult {
  document: Record<string, unknown>;
  warnings: Warning[];
  text: string;
}

export interface TurtleResult {
  text: string;
  warnings: Warning[];
}

export interface AnnotateResult {
  document: Record<string, unknown>;
  text: string;
  warnings: Warning[];
}

export function toContext(
  schema: unknown,
  optsInput: ConverterOptionsInput = {},
): ContextResult {
  if (useBroken()) {
    return brokenToContext(schema, optsInput);
  }
  const opts = normalizeOptions(optsInput);
  const analysis = analyze(schema, opts);
  const document = buildContextObject(analysis);
  analysis.warnings = sortWarnings(analysis.warnings);
  return {
    document,
    warnings: analysis.warnings,
    text: serializeJson(document),
  };
}

export function toVocab(
  schema: unknown,
  optsInput: ConverterOptionsInput = {},
): TurtleResult {
  if (useBroken()) {
    return { text: "# broken vocab\n", warnings: [] };
  }
  const opts = normalizeOptions(optsInput);
  const analysis = analyze(schema, opts);
  buildContextObject(analysis); // ensure prefix shadowing warnings applied
  const text = buildVocabTurtle(analysis);
  return { text, warnings: sortWarnings(analysis.warnings) };
}

export function toShacl(
  schema: unknown,
  optsInput: ConverterOptionsInput = {},
): TurtleResult {
  if (useBroken()) {
    return brokenToShacl(schema, optsInput);
  }
  const opts = normalizeOptions(optsInput);
  const analysis = analyze(schema, opts);
  buildContextObject(analysis);
  const text = buildShaclTurtle(analysis);
  return { text, warnings: sortWarnings(analysis.warnings) };
}

export function annotate(
  instance: unknown,
  schema: unknown,
  optsInput: ConverterOptionsInput = {},
): AnnotateResult {
  if (useBroken()) {
    const ctx = brokenToContext(schema, optsInput);
    const document = {
      "@context": ctx.document["@context"],
      ...(typeof instance === "object" && instance && !Array.isArray(instance)
        ? (instance as object)
        : { value: instance }),
    };
    return {
      document,
      text: JSON.stringify(document, null, 2) + "\n",
      warnings: [],
    };
  }
  const opts = normalizeOptions(optsInput);
  const analysis = analyze(schema, opts);
  buildContextObject(analysis);
  const { document, warnings } = annotateInstance(analysis, instance);
  const text =
    opts.format === "yaml" ? serializeYamlLd(document) : serializeJson(document);
  return { document, text, warnings: sortWarnings(warnings) };
}

export async function annotateToNQuads(
  instance: unknown,
  schema: unknown,
  optsInput: ConverterOptionsInput = {},
): Promise<{ nquads: string; warnings: Warning[]; document: Record<string, unknown> }> {
  const result = annotate(instance, schema, { ...optsInput, format: "json" });
  const nquads = await toNQuads(result.document);
  return { nquads, warnings: result.warnings, document: result.document };
}

export { validateInstance };
