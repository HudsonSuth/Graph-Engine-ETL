# jsonld-from-schema

A clean-room converter from **JSON Schema** (2020-12, also draft-07) to **JSON-LD 1.1**. It produces:
- **(a)** a JSON-LD `@context` derived from the schema
- **(b)** an RDFS/OWL vocabulary and SHACL shapes, as deterministic Turtle
- **(c)** annotation of a JSON instance as JSON-LD or YAML-LD, plus canonical N-Quads (validated first: invalid instance → no RDF)

The behavior is defined in `SPEC.md` (also called SPEC-JSONSCHEMA-TO-JSONLD). Every acceptance ID there has a test. This directory is the only converter in the repo. StreamGraph imports it as `jsonld-from-schema`. The earlier TypeScript copy was removed.

## Use
Node 22+ (tested on 24.22.1). Install with `npm ci`.

```bash
node bin/jsonld-from-schema.js context  schema.json                      # @context
node bin/jsonld-from-schema.js vocab    schema.json                      # RDFS/OWL Turtle
node bin/jsonld-from-schema.js shacl    schema.json                      # SHACL Turtle
node bin/jsonld-from-schema.js annotate schema.json instance.json [--format yaml]
node bin/jsonld-from-schema.js nquads   schema.json instance.json        # canonical N-Quads
# a sub-schema of a bigger file (refs still resolve against the whole file):
node bin/jsonld-from-schema.js nquads test/fixtures/graph-events.v1.json test/fixtures/node-upsert.instance.json --pointer /events/node.upsert
```
Options: `--vocab <iri>`, `--prefix p=<iri>`, `--arrays set|list`, `--uri-as id|anyURI`, `--enum-iri`, `--no-vocab-fallback`, `--no-types`, `--no-validate`, `--root-class <name|iri>`, `--quiet`. Exit codes: 0 ok, 1 `E_*` error, 2 usage.

```js
import { generateContext, generateVocabulary, generateShapes, annotate, instanceToNQuads } from 'jsonld-from-schema';
const { context, warnings } = generateContext(schema, { vocab: 'https://example.org/vocab/' });
const { document } = annotate(instance, schema);          // throws JsonLdSchemaError E_INVALID_INSTANCE if invalid
const nquads = await instanceToNQuads(instance, schema);  // offline; remote contexts are refused
```

## Mapping hints (`x-jsonld`)
Validators ignore this keyword, so the schema stays valid.
```json
{ "title": "Person", "type": "object",
  "x-jsonld": { "@type": "schema:Person", "@idProperty": "id", "@prefixes": { "ex": "https://example.org/" } },
  "properties": {
    "id":     { "type": "string" },
    "name":   { "type": "string", "x-jsonld": { "@id": "schema:name" } },
    "status": { "enum": ["active", "retired"], "x-jsonld": { "@type": "@vocab" } },
    "notes":  { "type": "string", "x-jsonld": false } } }
```

## Tests
- `npm test` runs **62 tests**: 61 cover the spec IDs (C, V, S, U, A, D, E, F, CLI) plus one extra golden test, and B-01 is the broken-implementation proof.
- `npm run proof:broken` reruns the spec suite with `JSONLD_FROM_SCHEMA_IMPL=broken`. That mode is deliberately wrong: no format coercion, arrays always `@list`, unsorted keys, and `required` ignored. The run must fail, and it does (19 of 61). The log is written to `test-output/broken-run.txt` (gitignored), not into the tree.
- Real fixtures come from the StreamGraph integrated build:
  - `test/fixtures/graph-events.v1.json` (the Kafka `graph.changes` and command contracts)
  - `test/fixtures/mcp-tool-input-schemas.json` (19 MCP tool input schemas from `tools/list`)
- Golden N-Quads live in `test/golden/`. Regenerate them with `node test/make-golden.mjs` only after reviewing a deliberate change.

## Limitations (by design; see SPEC §6)
- **Static, not instance-driven.** `anyOf`/`oneOf`/`if-then-else` branches are merged; they are not chosen per instance. Conflicting definitions lose their coercion (`W_CONFLICT`).
- No `sh:or`/`sh:xone` from composition. `not`, `contains`, `propertyNames`, `dependent*`, `unevaluated*` and `$dynamicRef` are ignored, with warnings.
- `patternProperties`/`additionalProperties` keys get no terms; only the `@vocab` fallback covers them. Objects with no `properties` are kept whole as `@json`.
- Only local `$ref`s (JSON pointers, including via `$id`). Anchors (`#name`) and remote refs are refused, because the converter works offline.
- Property names with `:` or `/` get no term. A property named `@…` is an error.
- Relative IRIs in `format: uri-reference` values are dropped by JSON-LD on RDF conversion, because there is no document base.

## Licenses
MIT. Dependencies are permissive only (BSD-3, MIT, ISC, Apache-2.0); see `LICENSE-AUDIT.txt` and `npm run audit:licenses`. Clean-room record: SPEC §0.
