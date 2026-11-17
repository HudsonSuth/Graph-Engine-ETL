// Public API. SPEC: SPEC-JSONSCHEMA-TO-JSONLD.md
import { buildModel } from './model.js';
import { buildContext } from './context.js';
import { buildVocab, buildShapes } from './vocab.js';
import { annotateInstance, toYaml } from './annotate.js';
import { toNQuads, expand, offlineLoader } from './rdf.js';
import { stringify } from './util.js';
export { JsonLdSchemaError } from './errors.js';
export { toNQuads, expand, offlineLoader, stringify };

/** -> { context: {"@context": ...}, text, warnings } */
export function generateContext(schema, opts = {}) {
  const M = buildModel(schema, opts);
  const context = buildContext(M);
  return { context, text: stringify(context), warnings: M.warnings.sorted() };
}
/** -> { turtle, warnings } RDFS/OWL vocabulary */
export async function generateVocabulary(schema, opts = {}) {
  const M = buildModel(schema, opts); buildContext(M);
  return { turtle: await buildVocab(M), warnings: M.warnings.sorted() };
}
/** -> { turtle, warnings } SHACL shapes */
export async function generateShapes(schema, opts = {}) {
  const M = buildModel(schema, opts); buildContext(M);
  return { turtle: await buildShapes(M), warnings: M.warnings.sorted() };
}
/** -> { document, text, warnings }  (text is JSON-LD, or YAML-LD with opts.format = "yaml") */
export function annotate(instance, schema, opts = {}) {
  const M = buildModel(schema, opts);
  const context = buildContext(M);
  const document = annotateInstance(M, context, instance);
  const text = M.opts.format === 'yaml' ? toYaml(document) : stringify(document);
  return { document, text, warnings: M.warnings.sorted() };
}
/** annotate + canonical N-Quads */
export async function instanceToNQuads(instance, schema, opts = {}) {
  const { document } = annotate(instance, schema, opts);
  return toNQuads(document);
}
