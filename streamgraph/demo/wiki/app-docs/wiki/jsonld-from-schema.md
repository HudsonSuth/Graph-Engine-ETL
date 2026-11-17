---
type: Library
title: JSON Schema to JSON-LD converter
description: "Our clean-room converter (MIT): @context, RDFS/OWL vocabulary, SHACL shapes. One package, hint keyword x-jsonld."
sources:
  - resource: ../jsonld-from-schema/src/index.js
  - resource: ../jsonld-from-schema/README.md
  - resource: ../jsonld-from-schema/SPEC.md
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# jsonld-from-schema
The only JSON Schema to JSON-LD converter in this repo (the TypeScript copy was removed). Used for per-type wiki schemas (validation + terms) and the schema_to_context MCP tool. The hint is one `x-jsonld` object.
