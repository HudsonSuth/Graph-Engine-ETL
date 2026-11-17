---
type: Component
title: Entity resolution
description: Duke (default) or Splink matching, with a review queue.
sources:
  - resource: explore/er/engine.js
  - resource: explore/er/integration.js
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# Entity resolution
Matches records that describe the same thing (for example the maritime [vessel watchlist](../datasets/maritime-ais.md) against vessels).
