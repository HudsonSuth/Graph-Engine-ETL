---
type: Concept
title: npm start runs the core studio only
description: "Superseded: npm start now runs the combined app."
sources:
  - resource: package.json
status: deprecated
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# npm start (old behaviour)
Before the integration, npm start ran src/server.js only. It now runs the [combined app](../architecture/combined-app.md); `npm run start:core` keeps the old behaviour.
