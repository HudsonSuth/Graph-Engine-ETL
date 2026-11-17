---
type: Component
title: Explore UI
description: Sigma.js graph explorer at /explore, with a MapLibre map viewer.
sources:
  - resource: explore/server/app.js
  - resource: explore/server/geo-queries.js
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# Explore UI
Interactive graph exploration at /explore (Sigma.js), with saved views, history, query builder and a map. Every reply passes the [access rules](../security/abac.md).
