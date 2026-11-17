---
type: Feature
title: Markdown wiki import
description: Vault-LD and OKF folders imported into the graph; Markdown files are the source of truth.
sources:
  - resource: src/wiki/vault.js
  - resource: src/wiki/mapper.js
  - resource: src/wiki/sync.js
  - resource: src/wiki/rdf.js
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# Wiki import
One mapper for both dialects. Frontmatter wikilinks become typed edges, body links become LINKS_TO. Re-import is deterministic. Graph-to-file write-back is off. See [trust tiers](trust-tiers.md) and [wiki as memory](wiki-as-memory.md).
