---
type: Feature
title: Plain-English questions
description: Rules-only question interpreter (no paid model); providers are pluggable.
sources:
  - resource: explore/server/nl/rules.js
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# Plain-English questions
The built-in provider is rules only. Another provider can be plugged in later (PROVIDERS in studio-routes.js); none is configured.
