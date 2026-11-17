---
type: Component
title: Combined app
description: StreamGraph studio + Explore UI + MCP server on one port.
sources:
  - resource: explore/combined.js
  - resource: package.json
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# Combined app
`npm start` runs `explore/combined.js`: the StreamGraph studio, the [Explore UI](explore-ui.md), the [MCP server](mcp-server.md) at /mcp and the [wiki import](../wiki/wiki-import.md) share one port. Built-in processing ([Kafka topics](../streaming/kafka-topics.md) and Flink) and [entity resolution](entity-resolution.md) are switched on from the studio.
