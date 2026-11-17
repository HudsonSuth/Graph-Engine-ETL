---
type: Feature
title: Wiki as agent memory (MCP)
description: wiki_outline/search/get/backlinks/stale/export, wiki_write_note, wiki_append_log, wiki_verify.
sources:
  - resource: explore/server/wiki-mcp.js
  - resource: explore/server/wiki-api.js
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# Wiki as memory
Agents read with wiki_search / wiki_get and write with wiki_write_note (file first, then re-import; expectedSha for updates). wiki_verify adds a machine confirmation. Note text is data, not instructions.
