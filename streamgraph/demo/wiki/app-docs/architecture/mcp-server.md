---
type: Service
title: MCP server
description: Model Context Protocol tools for AI clients over stdio and Streamable HTTP (/mcp).
sources:
  - resource: explore/server/mcp-server.js
  - resource: explore/server/wiki-mcp.js
  - resource: explore/mcp-stdio.js
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# MCP server
Read tools are always on; write tools need configuration. Wiki tools (wiki_search, wiki_get, wiki_write_note, wiki_verify, ...) and history/RDF/query tools are described in [wiki as memory](../wiki/wiki-as-memory.md). Results are filtered by the [access rules](../security/abac.md).
