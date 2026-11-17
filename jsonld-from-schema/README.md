# jsonld-from-schema

Clean-room **JSON Schema → JSON-LD 1.1** converter (static). Annotate a schema with optional `x-jsonld` hints; emit `@context`, RDFS/OWL vocabulary, SHACL shapes, annotated JSON-LD/YAML-LD, and canonical N-Quads.

Built from the behavior spec in `SPEC.md` only — no AGPL/Sourcemeta implementation code was consulted.

## Install

```bash
npm install
npm run build
```

## CLI

```bash
jsonld-from-schema context|vocab|shacl|annotate|nquads <schema> [instance] [--pointer /path]
```

Exit codes: `0` success, `1` `E_*` error, `2` bad usage. Warnings go to stderr.

## Library

```ts
import { toContext, toVocab, toShacl, annotate, toNQuads } from "jsonld-from-schema";

const { text, warnings } = toContext(schema, { vocab: "https://example.org/vocab/" });
```

## Tests

```bash
npm test
JSONLD_FROM_SCHEMA_IMPL=broken npm test   # B-01: must fail (≥5 assertions)
```

## Hint keyword

`x-jsonld` on a property: `{ "@id", "@type", "@container" }` or `false` to exclude.  
On a class/root: `{ "@type", "@idProperty", "@idPrefix", "@vocab?", "@prefixes?" }`.
