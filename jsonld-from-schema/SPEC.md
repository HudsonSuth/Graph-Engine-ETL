# SPEC: JSON Schema → JSON-LD converter (clean-room, behavior only)

Status: behavior spec, written **before** any implementation code (16 Nov 2026, ET). The module `jsonld-from-schema/` is built from this document only.
Owner approval: Billy approved writing our own converter ("YEs I'd want our version written").

## 0. Clean-room record
**Rule followed.** No source code of Sourcemeta's / Juan Cruz Viotti's tool (`sourcemeta/jsonschema`, AGPL-3.0; `sourcemeta/blaze`, AGPL-3.0/commercial) and no other GPL/AGPL implementation was read, downloaded or viewed. Their CLI reference docs and keyword list were not consulted either. The keyword design below (`x-jsonld` as one object) is our own and deliberately does **not** reuse their `x-jsonld-*` keyword names.

**Standards read** (public, fetched 16 Nov 2026):
- JSON Schema 2020-12 Validation (format names: `date-time`, `date`, `time`, `duration`, `uri`, `uri-reference`, `iri`, `iri-reference`, `uuid`, …; `contentEncoding`): https://json-schema.org/draft/2020-12/json-schema-validation.html. Core (`$ref`, `$defs`, `$id`, `prefixItems`) from general knowledge of https://json-schema.org/draft/2020-12/json-schema-core.html. Draft-07 (`definitions`, array-form `items`).
- JSON-LD 1.1 (W3C Rec): https://www.w3.org/TR/json-ld11/. Used for: term definitions, `@type` coercion, `@container` `@set`/`@list`, `@vocab`, `@json`, `@version 1.1`, and property-scoped contexts. **CONFIRMED in the spec text:** "By default, all contexts are propagated when traversing node objects, other than type-scoped contexts."
- YAML-LD 1.0 W3C Working Draft (24 Oct 2026): https://www.w3.org/TR/yaml-ld-10/
- SHACL (W3C Rec): https://www.w3.org/TR/shacl/
- XSD 1.1 Part 2 datatypes: https://www.w3.org/TR/xmlschema11-2/
- RDF 1.1 / RDFS / OWL 2 vocabularies, and schema.org as a target vocabulary.

**Prose about the idea** (motivation only): Viotti, "Fully solving JSON Schema and JSON-LD interoperability", Sourcemeta blog, 14 Jul 2026 — search-result summary and article excerpt; no code. Takeaway used: annotate the schema you already have, and valid instances become JSON-LD; invalid instance → no RDF. Their engine evaluates while validating (hypothesis). **Ours is a static converter by design** (see §6).

## 1. Scope
- **Inputs:** a JSON Schema document (2020-12 by default; draft-07 when `$schema` names draft-07/06/04), plus an optional JSON pointer to the sub-schema. `$ref`s always resolve against the whole document. Optionally, a JSON instance for annotation.
- **Outputs:** (a) JSON-LD 1.1 `@context`; (b) optional RDFS/OWL Turtle and SHACL Turtle; (c) annotated JSON-LD (or YAML-LD) plus canonical N-Quads.
- Everything is offline. Remote contexts and remote `$ref`s are refused.

## 2. Options (defaults)
| Option | Default | Meaning |
|---|---|---|
| `vocab` | `https://streamgraph.local/vocab/` | Absolute IRI ending in `/` or `#` |
| `prefixes` | `{}` | Extra prefix → IRI. Built-ins: `xsd rdf rdfs owl sh schema` |
| `vocabFallback` | `true` | Emit `"@vocab": vocab` |
| `arrays` | `"set"` | `"set"` or `"list"` |
| `uriAs` | `"id"` | uri/iri formats → `"@id"` or `xsd:anyURI` |
| `enumAsIri` | `false` | String enums → `@type: @vocab` |
| `addTypes` | `true` | Annotation adds `@type` |
| `rootClass` | none | Overrides title for root class |
| `validate` | `true` | Ajv before annotation |
| `format` | `"json"` | `"json"` or `"yaml"` |

Bad option values → `E_BAD_OPTION` (E-01).

## 3. Mapping hint: `x-jsonld`
On a **property**: object with `@id` / `@type` / `@container`, or `false` to exclude (`null` term).
On an **object (class)**: `@type`, `@idProperty`, `@idPrefix`.
On the **root** only: also `@vocab`, `@prefixes`.
Malformed → `E_BAD_HINT` (E-04).

## 4. Context generation (C-01 … C-18)
- **C-01** `{"@context"}` with `@version` 1.1 and `xsd`; `@vocab` iff `vocabFallback`.
- **C-02** Each `properties` name → `@id: vocab + pctEncode(name)` (unreserved `A-Za-z0-9-._~`).
- **C-03** Coercion: integer/number/boolean → xsd; date-time/date/time/duration; uri/iri → `@id` or anyURI; base64 → base64Binary. Format without type still applies.
- **C-04** Nullable unwrap; ≥2 non-null types → no coercion + `W_UNION_TYPE`.
- **C-05** Arrays `@set`/`@list`; tuples → `@list`; mixed tuple → `W_MIXED_TUPLE`.
- **C-06** Array of arrays → `@json` + `W_NESTED_ARRAY`.
- **C-07** Nested object → property-scoped `@context` (only differing terms).
- **C-08** Free-form object → `@json`.
- **C-09** Local `$ref` only; cyclic → term without scoped context; sibling keywords merge; referring `x-jsonld` wins.
- **C-10** Classes: hint `@type`, else `rootClass`, else PascalCase(title); `$defs` name → PascalCase; inline title → PascalCase.
- **C-11** `enumAsIri` / `@vocab` with safe string pattern → scoped value map; else `W_ENUM_NOT_IRI`.
- **C-12** Hints override; CURIE kept; prefix added.
- **C-13** `x-jsonld: false` → `null`.
- **C-14** Names with `:`/`/`/empty → `W_UNMAPPABLE_NAME`; `@…` → `E_KEYWORD_PROPERTY`.
- **C-15** Prefixes: `xsd` + root `@prefixes` + `prefixes` + used built-ins.
- **C-16** Conflicting term defs → `@id` only + `W_CONFLICT`.
- **C-16b** Refinement schemas (no type-determining keyword) never conflict.
- **C-17** `@idProperty` term stays literal; annotation adds `@id`.
- **C-18** Property name shadowing a prefix → prefix omitted, full IRIs + `W_PREFIX_SHADOWED`.

## 5. Vocabulary & SHACL (V-*, S-*)
- **V-01** Classes under vocab → `rdfs:Class, owl:Class` (+ label/comment). Foreign IRIs never described.
- **V-02** Terms under vocab → `rdf:Property` + Datatype/ObjectProperty; comments sorted.
- **V-03** `rdfs:domain` / `rdfs:range` only when unique.
- **S-01** NodeShape per class / RootShape; untitled nested `parent-prop-node`.
- **S-02** Property shapes; required → minCount; arrays minItems/maxItems.
- **S-03** datatype / nodeKind / node; pattern, lengths, numeric bounds.
- **S-04** enum/const → `sh:in`.
- **S-05** `additionalProperties: false` → closed + ignored `rdf:type`.
- **S-06** Composition not mapped to sh:or/xone; union props optional unless required in every branch.

## 6. Unsupported / partial (U-*)
allOf merge; anyOf/oneOf → `W_COMPOSITION_STATIC`; if/then/else → `W_CONDITIONAL`; patternProperties → `W_UNMAPPED_KEYS`; listed keywords ignored → `W_IGNORED_KEYWORD`; boolean schemas → no coercion.

## 7. Annotation (A-*)
Ajv validate (`strict:false`, ajv-formats); embed context; addTypes; `@idProperty`; reject `@` instance keys; YAML-LD all strings double-quoted; N-Quads via jsonld.js offline loader + URDNA2015; remote context → `E_REMOTE_CONTEXT`.

## 8. Determinism (D-*)
Sorted JSON keys (LD keywords first); Turtle prefixes/statements sorted; warnings by path then code.

## 9. Errors
`JsonLdSchemaError` with `code`, `path`, `message`. CLI exit 1 on `E_*`, 2 on bad usage.
`E_BAD_OPTION`, `E_BAD_REF`/`E_EXTERNAL_REF`, `E_KEYWORD_PROPERTY`, `E_BAD_HINT`, `E_INVALID_INSTANCE`, `E_REMOTE_CONTEXT`, `E_SCHEMA_INVALID`, `E_KEYWORD_IN_INSTANCE`.

## 10. Fixtures
- **F-01** `graph-events.v1.json` event schemas → contexts (`eventTime` dateTime, `seq` integer, `payload.properties` `@json`).
- **F-02** `node.upsert` instance → stable N-Quads with typed `eventTime`.
- **F-03** MCP tool input schemas → context/vocab/shapes; enum `from` → `sh:in`.

## 10b. CLI
`jsonld-from-schema context|vocab|shacl|annotate|nquads <schema> [instance]` — stdout result, stderr warnings; `--pointer` selects sub-schema.

## 11. Broken implementation (B-01)
`JSONLD_FROM_SCHEMA_IMPL=broken`: no format coercion, arrays always `@list`, unsorted keys, required ignored in SHACL. Spec suite must fail ≥5 tests; see `test/broken-run.txt`.
