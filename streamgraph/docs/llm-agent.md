# L3 — Agent flows on LangGraph

Phase L3 compiles an `agent`-kind flow into a LangGraph `StateGraph`.

## Flow shape
```json
{ "name": "demo", "retrieve": true, "approve": true, "sink": true,
  "nodes": [{ "id": "model" }], "edges": [] }
```
- `retrieve`: enable RAG node (uses `ctx.retrieve`, e.g. `makeGraphRetrieve(graph)`).
- `approve`: enable human-approval interrupt (resume via `resumeAgentFlow`).
- `sink`: enable graph write node (uses `ctx.sink`).

## API
- `compileAgentFlow(flow, ctx)` → compiled graph (async).
- `runAgentFlow({ flow, ctx, input, threadId })` → `{ status, messages, threadId }`.
- `resumeAgentFlow({ flow, ctx, threadId, decision })` → resume after interrupt.
- `makeGraphRetrieve(graph, k)` → retrieve function for ctx.retrieve.

## ABAC
`agent.run` gates `POST /agents/run`; `agent.approve` gates resume. Both in `AGENT_ACTIONS`.

## Persistence
Pass `ctx.dbPath` for SqliteSaver (survives restarts); default MemorySaver.

## Hard stops
RunGuard enforces maxSteps, maxToolCalls, maxWallSeconds; returns `stopped:<limit>`.

## Tests
`test/agent-compiler.test.js` (offline, stub model).
