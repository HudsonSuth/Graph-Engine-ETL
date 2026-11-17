---
type: Kafka Topic Family
title: Kafka topics
description: graph.changes, graph.state, graph.commands, graph.command-results and graph.dlq, validated by draft-07 contracts.
sources:
  - resource: explore/kafka/contracts.js
  - resource: explore/kafka/schemas/graph-events.v1.json
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# Kafka topics
- graph.changes: every applied change (wiki imports included)
- graph.state: compacted current state
- graph.commands / graph.command-results: MCP write commands in Kafka mode
- graph.dlq: events that failed the contract

The event contract converts to JSON-LD with our [converter](../wiki/jsonld-from-schema.md).
