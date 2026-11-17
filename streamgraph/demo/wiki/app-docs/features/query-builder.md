---
type: Feature
title: Query builder and Cypher
description: One-hop query builder with a Cypher subset; access-checked per type.
sources:
  - resource: explore/server/query.js
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# Query builder
MATCH (a:Type)-[:REL]->(b:Type) WHERE ... RETURN ... LIMIT n. MCP tool: query_cypher.
