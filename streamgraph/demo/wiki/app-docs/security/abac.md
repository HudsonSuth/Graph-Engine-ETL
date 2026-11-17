---
type: Concept
title: Access rules (ABAC)
description: Deny by default, deny wins, hidden fields stay hidden; fail-closed egress filter on every explore reply.
sources:
  - resource: src/abac/engine.js
  - resource: explore/server/access.js
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# Access rules (ABAC)
Users, entity types, field sensitivity and rules. Explore and MCP replies are filtered: denied types disappear, hidden fields show as [hidden], hidden keys become pseudonyms. [Trust tiers](../wiki/trust-tiers.md) are never access rules.
