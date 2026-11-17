---
type: Feature
title: RDF import and export
description: Turtle / N-Triples (and now JSON-LD / YAML-LD) export of what you may export.
sources:
  - resource: explore/server/rdf.js
  - resource: explore/server/studio-routes.js
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# RDF export
Graph-wide export uses urn:streamgraph: IRIs. Wiki vaults export with their own IRIs (see [wiki import](../wiki/wiki-import.md)).
