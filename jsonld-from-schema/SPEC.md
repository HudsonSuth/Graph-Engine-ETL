# SPEC: JSON Schema → JSON-LD converter (clean-room, behavior only)

Status: behavior spec, written **before** any implementation code (16 Nov 2026, ET). The module `jsonld-from-schema/` is built from this document only.
Owner approval: Billy approved writing our own converter ("YEs I'd want our version written").

## 0. Clean-room record
**Rule followed.** No source code of Sourcemeta's / Juan Cruz Viotti's tool (`sourcemeta/jsonschema`, AGPL-3.0; `sourcemeta/blaze`, AGPL-3.0/commercial) and no other GPL/AGPL implementation was read, downloaded or viewed. Their CLI reference docs and keyword list were not consulted either. The keyword design below (`x-jsonld` as one object) is our own and deliberately does **not** reuse their `x-jsonld-*` keyword names.

**Standards read** (public, fetched 16 Nov 2026):
- JSON Schema 2020-12 Validation (format names: `date-time`, `date`, `time`, `duration`, `uri`, `uri-reference`, `iri`, `iri-reference`, `uuid`, …; `contentEncoding`): https://json-schema.org/draft/2020-12/json-schema-validation.html. Core (`$ref`, `$defs`, `$id`, `prefixItems`) from general knowledge of https://json-schema.org/draft/2020-12/json-schema-core.html. Draft-07 (`definitions`, array-form `items`).
- JSON-LD 1.1 (W3C Rec): https://www.w3.org/TR/json-ld11/. Used for: term definitions, `@type` coercion, `@container` `@set`/`@list`, `@vocab`, `@json`, `@version 1.1`, and property-scoped contexts. **CONFIRMED in the spec text:** "By default, all contexts are propagated when traversing node objects, other than type-scoped contexts."
- YAML-LD 1.0 W3C Working Draft (24 Oct 2026): https://www.w3.org/TR/yaml-ld-10/
- SHACL (W3C Rec): https://www.w3.org/TR/shacl/ (`sh:NodeShape`, `sh:targetClass`, `sh:property`, `sh:path`, `sh:minCount`, `sh:maxCount`, `sh:datatype`, `sh:nodeKind`, `sh:node`, `sh:pattern`, `sh:minLength`, `sh:maxLength`, `sh:minInclusive`, `sh:maxInclusive`, `sh:minExclusive`, `sh:maxExclusive`, `sh:in`, `sh:closed`, `sh:ignoredProperties`)
- XSD 1.1 Part 2 datatypes: https://www.w3.org/TR/xmlschema11-2/ (`dateTime`, `date`, `time`, `duration`, `anyURI`, `integer`, `double`, `boolean`, `base64Binary`)
- RDF 1.1 / RDFS / OWL 2 vocabularies (rdf:Property, rdfs:Class, rdfs:domain/range, owl:DatatypeProperty/ObjectProperty), and schema.org as a target vocabulary (https://schema.org).

**Prose about the idea** (read earlier, for motivation only):
- Viotti, "Fully solving JSON Schema and JSON-LD interoperability", Sourcemeta blog, 14 Jul 2026: https://www.sourcemeta.com/blog/json-schema-jsonld-interoperability/ (the search-result summary and article excerpt; no code)
- The Year of the Graph newsletter excerpt Billy pasted.

Takeaways used: "annotate the schema you already have, and valid instances become JSON-LD", and "invalid instance → no RDF". Their engine evaluates the schema while validating, so conditionals resolve per instance. That is a HYPOTHESIS from the prose. **Ours is a static converter by design** (see §6).

## 1. Scope
- **Inputs:** a JSON Schema document (2020-12 by default; draft-07 when `$schema` names draft-07/06/04), plus an optional JSON pointer to the sub-schema to use. `$ref`s always resolve against the whole document. Optionally, a JSON instance for annotation.
- **Outputs:**
  - (a) a JSON-LD 1.1 `@context`
  - (b) optional vocabulary: RDFS/OWL Turtle and SHACL Turtle
  - (c) an annotated JSON-LD (or YAML-LD) document, plus canonical N-Quads
- Everything is offline. Remote contexts and remote `$ref`s are refused.

## 2. Options (all have defaults)
| Option | Default | Meaning |
|---|---|---|
| `vocab` | `https://streamgraph.local/vocab/` | Absolute IRI ending in `/` or `#`. Term, class and shape IRIs are minted under it. |
| `prefixes` | `{}` | Extra prefix → IRI map. Built-ins are known: `xsd rdf rdfs owl sh schema`. |
| `vocabFallback` | `true` | Emit `"@vocab": vocab` so keys without a term still map, instead of being dropped. |
| `arrays` | `"set"` | Container for plain arrays: `"set"` or `"list"`. |
| `uriAs` | `"id"` | `format: uri/iri/uri-reference/iri-reference` → `"@id"` (IRI node) or `"anyURI"` (xsd:anyURI literal). |
| `enumAsIri` | `false` | String enums become IRIs (`@type: @vocab`). |
| `addTypes` | `true` | Annotation adds `@type` to nodes whose schema has a class. |
| `rootClass` | none | Class name or IRI for the root. Overrides the title. |
| `validate` | `true` | Annotation validates the instance with Ajv first. |
| `format` | `"json"` | Annotation output: `"json"` (JSON-LD) or `"yaml"` (YAML-LD). |

Bad option values → `E_BAD_OPTION` (test E-01).

## 3. Mapping hint keyword: `x-jsonld`
This is an annotation placed on any schema object. JSON Schema validators ignore unknown keywords, so the schema stays valid. **CONFIRMED** for Ajv with `strict:false`, test A-08.

- On a **property** schema, an object with any of:
  - `"@id"`: an IRI or CURIE (`"schema:name"`) the property maps to.
  - `"@type"`: one of `"@id"`, `"@vocab"`, `"@json"`, or an xsd CURIE/IRI.
  - `"@container"`: `"@set"` or `"@list"`.
- On a property schema, `"x-jsonld": false` means **exclude**: the term maps to `null`, so JSON-LD drops the key.
- On an **object (class)** schema:
  - `"@type"`: class IRI/CURIE.
  - `"@idProperty"`: the name of a property whose value becomes the node's `@id`.
  - `"@idPrefix"`: absolute IRI prefix for that id.
- On the **root** only:
  - `"@vocab"`: overrides `vocab`.
  - `"@prefixes"`: a prefix map.
- A malformed hint → `E_BAD_HINT` (test E-04). Malformed means: not an object or false; an unknown key; a CURIE with an unknown prefix; a non-absolute IRI; or an invalid `@type`/`@container` value.

## 4. (a) Context generation, behavior
| ID | Behavior |
|---|---|
| C-01 | Output is `{"@context": {...}}`. It always contains `"@version": 1.1` and the `xsd` prefix. `"@vocab"` is present iff `vocabFallback`. |
| C-02 | Each name in `properties` becomes a term `name → {"@id": vocab + pctEncode(name)}`. Unreserved characters `A-Za-z0-9-._~` are kept and others are percent-encoded. |
| C-03 | Type coercion: `integer`→`xsd:integer`, `number`→`xsd:double`, `boolean`→`xsd:boolean`. A string with `format`: `date-time`→`xsd:dateTime`, `date`→`xsd:date`, `time`→`xsd:time`, `duration`→`xsd:duration`, `uri`/`iri`/`uri-reference`/`iri-reference`→`"@id"` (or `xsd:anyURI` when `uriAs:"anyURI"`). `contentEncoding: base64`→`xsd:base64Binary`. Other formats and plain strings get no coercion. A `format` with no `type` still applies. |
| C-04 | Nullable: `type: [T, "null"]`, or `anyOf`/`oneOf` of one schema plus `{type:"null"}`, behaves like T with no warning. Two or more non-null types → no coercion, plus warning `W_UNION_TYPE`. |
| C-05 | Arrays: the term gets `"@container": "@set"` (or `"@list"` under `arrays:"list"`). Coercion comes from `items`. `prefixItems` (2020-12) or array-form `items` (draft-07) is a tuple → `"@list"`, coerced only if every position coerces the same way. Otherwise no coercion and `W_MIXED_TUPLE`. |
| C-06 | Array of arrays → `"@type": "@json"`, with `W_NESTED_ARRAY`. This is lossless; a JSON-LD `@set` would flatten them. |
| C-07 | An object property with `properties` gets a **property-scoped** `"@context"` containing its own terms. Only terms that differ from the inherited definition are included, and the key is omitted when empty. Inner terms propagate (JSON-LD 1.1 default). |
| C-08 | A free-form object property (type object without `properties`, or with only `additionalProperties`/`patternProperties`) → `"@type": "@json"`, kept as an rdf:JSON literal. |
| C-09 | `$ref` to `#`, `#/$defs/X`, `#/definitions/X`, or any JSON-pointer fragment (also `<root $id>#/...`) resolves locally. The target's coercion and scoped context apply. A cyclic ref emits the term **without** a scoped context; the propagated outer terms cover it. 2020-12 sibling keywords next to `$ref` are merged, and `x-jsonld` on the referring schema wins. |
| C-10 | Classes: the root class is `x-jsonld["@type"]`, else `rootClass`, else PascalCase(`title`), else none. A `$ref` target under `$defs`/`definitions` named X that has `properties` gets class PascalCase(X). An inline object with a `title` gets PascalCase(title). A class IRI is `vocab + Name` unless the hint gives an IRI/CURIE. |
| C-11 | Enums: by default enum and const values stay literals, with coercion from the type. With `enumAsIri` or hint `"@type":"@vocab"`, and **all** values being strings matching `^[A-Za-z_][A-Za-z0-9_.-]*$`: the term gets `"@type":"@vocab"` and a scoped context mapping each value → `vocab + term + "/" + value`. If any value fails the pattern → literal, with `W_ENUM_NOT_IRI`. |
| C-12 | Hint `@id`/`@type`/`@container` override the derived values. A CURIE value is kept as written, and its prefix is added to the context. |
| C-13 | `"x-jsonld": false` → term `name: null`. |
| C-14 | Property names containing `:` or `/`, or that are empty, get no term, and raise `W_UNMAPPABLE_NAME`. A name starting with `@` → `E_KEYWORD_PROPERTY` (E-03). |
| C-15 | The prefixes emitted are `xsd`, plus every root `@prefixes` and `prefixes` entry, plus any built-in prefix actually used by a term. |
| C-16 | Two definitions of the same term at the same level that differ (from allOf/anyOf/oneOf/then/else merging) → term `{"@id"}` with no coercion or container, plus `W_CONFLICT`. |
| C-16b | A candidate property schema that carries **no type-determining keyword** (`type`, `format`, `properties`, `items`, `prefixItems`, `enum`, `const`, `$ref`, `contentEncoding`, `x-jsonld`, composition keywords) is a *refinement* (for example `else: {properties: {payload: {required: [...]}}}`). It never conflicts and never changes the term. (Found in the real `node.upsert` fixture: CONFIRMED.) |
| C-18 | If a property name anywhere in the schema equals a prefix that would be emitted, that prefix is **not** emitted. Every value that would use it is written as a full IRI, with warning `W_PREFIX_SHADOWED`. This stops a term from hijacking CURIE expansion. |
| C-17 | `@idProperty`: the term for that property is unchanged (it stays a literal). Annotation adds `@id` (see A-04). |

## 5. (b) Vocabulary and shapes, behavior (Turtle)
| ID | Behavior |
|---|---|
| V-01 | Every class whose IRI is under `vocab` gets `a rdfs:Class, owl:Class`, plus `rdfs:label` (from title or name) and `rdfs:comment` (description) when present. Foreign IRIs (schema.org …) are **never** described. |
| V-02 | Every term IRI under `vocab` gets `a rdf:Property` and `rdfs:label` (the term name). It also gets `owl:DatatypeProperty` when its values are literals (xsd coercion, plain string, `@json`), or `owl:ObjectProperty` when they are IRIs or nodes (`@id`, `@vocab`, nested object). `rdfs:comment` takes each distinct description, sorted. |
| V-03 | `rdfs:domain` is emitted only if the property is owned by exactly one class. `rdfs:range` is emitted only if it has exactly one range (an xsd type, `xsd:string` for plain strings, `rdf:JSON`, or a class). |
| S-01 | Each class (or the root, if it has none, as `vocab+"RootShape"`), and each nested object, gets a `sh:NodeShape` IRI: `vocab + Name + "Shape"`, or `parentShape + "-" + prop + "-node"` for untitled nested objects. The `-node` suffix keeps it distinct from the property shape `parentShape + "-" + prop` (S-02); an early draft collided here and the S-01 test caught it. A shape for a class has `sh:targetClass`. |
| S-02 | Each mapped property → a property shape `shape + "-" + pctEncode(prop)` with `sh:path`. `required` → `sh:minCount 1`. Non-array → `sh:maxCount 1`. Arrays: `minItems`→`sh:minCount` (taking the max with the required 1), and `maxItems`→`sh:maxCount`. |
| S-03 | Value constraints: an xsd coercion or plain string → `sh:datatype`; `@json` → `sh:datatype rdf:JSON`; `@id`/`@vocab` → `sh:nodeKind sh:IRI`; nested object → `sh:node <nested shape>`. Also `pattern`→`sh:pattern`, `minLength`/`maxLength`, `minimum`/`maximum`→`sh:minInclusive`/`sh:maxInclusive`, `exclusiveMinimum`/`exclusiveMaximum` (numeric) → `sh:minExclusive`/`sh:maxExclusive`. Numbers are integer literals when integral, decimal otherwise. |
| S-04 | `enum`/`const` → `sh:in ( … )` in schema order. Values are literals typed per coercion, or IRIs under C-11. |
| S-05 | `additionalProperties: false` → `sh:closed true; sh:ignoredProperties ( rdf:type )`. |
| S-06 | Composition is not translated to `sh:or`/`sh:xone`. Merged properties from anyOf/oneOf/if-then-else are optional (no minCount unless required in every branch). |

## 6. Unsupported or partially supported keywords, behavior
| ID | Keyword | Behavior |
|---|---|---|
| U-01 | `allOf` | Properties and `required` are merged into the owner. Conflicts → C-16. |
| U-02 | `anyOf`, `oneOf` (non-nullable) | Union of branch properties, optional unless required in every branch, plus warning `W_COMPOSITION_STATIC` (the branch is not evaluated per instance). |
| U-03 | `if`/`then`/`else` | `then` and `else` properties are merged as optional, and `if` is ignored for terms. Warning `W_CONDITIONAL`. |
| U-04 | `patternProperties`, `additionalProperties: <schema>` | No terms; matching keys are covered only by `@vocab` fallback. Warning `W_UNMAPPED_KEYS`. With no `properties` at all, the property itself is `@json` (C-08). |
| U-05 | `not`, `dependentSchemas`, `dependentRequired`, `dependencies`, `unevaluatedProperties`, `unevaluatedItems`, `propertyNames`, `contains`, `$dynamicRef`, `$recursiveRef` | Ignored. One `W_IGNORED_KEYWORD` per (path, keyword). |
| U-06 | `additionalProperties: false` | No context effect; it drives S-05. |
| U-07 | Boolean sub-schemas `true`/`false` as property schemas | The term gets no coercion. |

## 7. (c) Annotation, behavior
| ID | Behavior |
|---|---|
| A-01 | `annotate(instance, schema, opts)` validates the instance with Ajv (2020 or draft-07 by `$schema`, `ajv-formats`, `strict:false`). Invalid → `E_INVALID_INSTANCE` carrying Ajv's errors, and **no output** (E-05). |
| A-02 | Output is `{"@context": <C output>, ...instance}`. The context is embedded, never a remote URL. |
| A-03 | With `addTypes`, every object node whose schema has a class gets `"@type": <class IRI>`. Nested objects, array items, and `$ref` targets are included. |
| A-04 | `@idProperty`: if the value is an absolute IRI (`scheme://…` or `urn:…`) it becomes `@id` as is. Otherwise `@id` = `(@idPrefix or vocab + "id/") + pctEncode(String(value))`. The original property stays. |
| A-05 | An instance key starting with `@` → `E_KEYWORD_IN_INSTANCE`. |
| A-06 | `format:"yaml"` emits YAML-LD: the same object serialized as YAML, using only JSON-compatible YAML (no anchors or tags). **Every string value is double-quoted**, so YAML 1.1 readers cannot retype it (timestamps, yes/no). Parsing it back gives the same document under both the YAML 1.2 core and the 1.1 schema. |
| A-07 | `toNQuads(doc)` expands the document with jsonld.js using an **offline document loader** and returns canonical N-Quads (RDF Dataset Canonicalization), so the output is stable. A remote context → `E_REMOTE_CONTEXT` (E-06). |
| A-08 | A schema containing `x-jsonld` hints still validates instances unchanged. |
| A-09 | Literals with coercion become typed RDF literals (for example `"2026-11-16T10:00:00Z"^^xsd:dateTime`), `@id` terms become IRIs, `@json` values become `rdf:JSON` literals, and `@list` values become RDF lists. |

## 8. Determinism
| ID | Behavior |
|---|---|
| D-01 | All JSON output uses sorted keys: JSON-LD keywords first, in the fixed order `@context @version @base @vocab @id @type @container @json`, then the rest by code unit. It is serialized with 2-space indent and a trailing newline. Same input and options → same bytes. |
| D-02 | Turtle output has prefixes sorted and statements sorted by subject, predicate, then object. Re-running gives identical bytes. |
| D-03 | Warnings are sorted by path, then code. |
| D-04 | Property order in the schema and key order in the instance do not change the context, vocab or N-Quads. |

## 9. Errors
All errors are `JsonLdSchemaError` with `code`, `path` (a JSON pointer into the schema or instance) and `message`. The CLI exits 1 on an error and 2 on bad usage.
| ID | Code | When |
|---|---|---|
| E-01 | `E_BAD_OPTION` | `vocab` not absolute or not ending in `/` or `#`; bad `arrays`/`uriAs`/`format` value; bad prefix IRI |
| E-02 | `E_BAD_REF` / `E_EXTERNAL_REF` | A local `$ref` that doesn't resolve, or a non-local `$ref` (no network) |
| E-03 | `E_KEYWORD_PROPERTY` | A schema property named `@…` |
| E-04 | `E_BAD_HINT` | A malformed `x-jsonld` |
| E-05 | `E_INVALID_INSTANCE` | Annotation of an invalid instance |
| E-06 | `E_REMOTE_CONTEXT` | The document loader was asked for any URL |
| E-07 | `E_SCHEMA_INVALID` | The root, or the pointer target, is not an object schema; a bad pointer |
| E-08 | `E_KEYWORD_IN_INSTANCE` | An instance key starting with `@` |

## 10. Real fixtures (from the integrated build, copied as test fixtures)
| ID | Behavior |
|---|---|
| F-01 | Every event schema in `graph-events.v1.json` (`events/*`, `command`, `commandResult`, `stateRecord`; draft-07; selected by pointer) produces a context without errors. For example `eventTime` → `xsd:dateTime`, `seq` → `xsd:integer`, `payload` → scoped context, and `payload.properties` (free-form) → `@json`. |
| F-02 | A valid `node.upsert` event annotates and round-trips to stable N-Quads that contain the typed `eventTime`. |
| F-03 | All MCP tool input schemas captured via `tools/list` from the integrated app produce contexts, vocabularies and shapes without errors. Enum `from` → `sh:in`. |

## 10b. CLI
| ID | Behavior |
|---|---|
| CLI-01 | `jsonld-from-schema context\|vocab\|shacl\|annotate\|nquads <schema> [instance]` prints to stdout and warnings to stderr. It exits 0 on success, 1 on an `E_*` error (message on stderr), and 2 on bad usage. `--pointer` selects a sub-schema. |

## 11. Broken implementation (must fail)
| ID | Behavior |
|---|---|
| B-01 | `JSONLD_FROM_SCHEMA_IMPL=broken` swaps in a deliberately wrong converter: no `format` coercion, arrays always `@list`, unsorted keys, and `required` ignored in SHACL. Running the spec suite against it must fail at least 5 tests. The run is saved to `test-output/broken-run.txt` (gitignored). |
