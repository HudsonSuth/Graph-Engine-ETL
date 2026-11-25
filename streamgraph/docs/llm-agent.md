# L3 — Agent flows on LangGraph

L3 is implemented. L4, L5, L6, L7, L8 and L9 are not started.

An agent flow is a small graph the server compiles into a LangGraph `StateGraph` and runs against a model from the harness. It is off on a fresh install. Set `agents.enabled` to `true` in `data/models.json` (admin Models API) before any `/api/agents` route will accept a call. The default is false, including for the owner.

Checkpoints use an in-memory `MemorySaver` shared by run and resume for the life of the process. Nothing is written to SQLite. A restart drops every thread. The LangGraph Agent Server is not used.

## What a flow can contain

Node types: `model`, `tools`, `retrieve`, `branch`, `approve`, `sink`. One node must be a `model`. Node ids are yours; they do not have to be the type name.

```json
{
  "name": "demo",
  "nodes": [
    { "id": "lookup", "type": "retrieve" },
    { "id": "writer", "type": "model" },
    { "id": "gate", "type": "approve" }
  ],
  "edges": [
    { "from": "lookup", "to": "writer" },
    { "from": "writer", "to": "gate" }
  ]
}
```

`edges` are the graph. `when: "tool_calls"` on an edge out of a model node is taken when the model asked for a tool. A `branch` node with more than one outgoing edge uses `ctx.route(state)` when the caller supplied one; the function's return value is matched to an edge `to` or `when`. Other edges are the default.

If `edges` is empty, the boolean flags `retrieve`, `branch`, `approve` and `sink` add those nodes when the flow does not already have one. The chain is retrieve, then model, then branch, then approve, then sink. Retrieval is in front of the model, so the answer can use the documents. A tools node is added and looped when the model returns tool calls.

Retrieved text comes from the graph's text search (`makeGraphRetrieve`). The strings include the node label, key and properties. `makeOpenSearchRetrieve` and `combineRetrieve` are helpers for callers that already have a search function. The HTTP route does not call OpenSearch by itself. This is not a vector index.

Tool results and retrieved text are wrapped as `<untrusted-data>`.

`approve` calls LangGraph `interrupt()`. `invoke` does not throw. The run returns `status: "interrupted"` and `interrupts` (the question and the last message). Resume posts `decision: "yes"` to continue, or anything else to stop with `stopped:approval_denied`.

`limits` on the flow (`maxSteps`, `maxToolCalls`, `maxWallSeconds`) are passed to `RunGuard`. A stop returns `status: "stopped:<limit>"` and keeps the last checkpoint. Stop, abort and cancel errors are not retried. Other model errors are tried up to three times.

Run metadata (`runId`, flow name) is attached to the LangGraph config. That does not turn tracing on. LangSmith is not wired. Leave `LANGSMITH_TRACING` unset so LangChain does not send traces on its own.

## HTTP

All of these require `agents.enabled`. If `AGENT_TOKEN` is set, every one of them also requires the header `x-agent-token`.

| Method and path | ABAC action | What it does |
|---|---|---|
| `POST /api/agents/run` | `agent.run` | Body `{ flow, input, threadId? }`. Runs the flow. |
| `POST /api/agents/:id/resume` | `agent.approve` | Body `{ decision, flow? }`. Continues a paused thread. |
| `GET /api/agents/pending` | `agent.approve` | Threads waiting for approval. |
| `POST /api/agents/:id/cancel` | `agent.run` | Aborts a running thread, or drops a paused one so it cannot be resumed. |
| `GET /api/agents/:id` | `agent.run` | `{ threadId, known, status, pending }`. Unknown threads are 404. |
| `GET /api/agents/threads` | `agent.run` | Threads this process has seen, with their status. |

The model is the harness default, or `flow.models.default`, or `flow.model`, or a model node's `config.model`. The same `RunGuard` covers the run. Admins have `agent.run` and `agent.approve`. Analysts do not, unless a rule allows that action.

A cancelled thread returns 409 on resume.

## Code

- `compileAgentFlow(flow, ctx)` → compiled graph.
- `runAgentFlow({ flow, ctx, input, threadId })` → `{ status, messages, threadId, interrupts? }`.
- `resumeAgentFlow({ flow, ctx, threadId, decision })` resumes that thread. Pass the same `ctx.checkpointer` (and `ctx.compiledCache` when you have one) that the run used.
- `validateAgentFlow(flow)` → error strings.
- `makeGraphRetrieve(graph, k)` → the retrieve function the route uses.

`ctx` is `{ model, modelFor?, tools, retrieve?, sink?, route?, guard, checkpointer, graph }`. `model` is a chat model from `harness.getChatModel` (a `MeteredModel`) or, in tests, a stub with `invoke`.

## Not built (L4–L9)

There is no placeholder route for these. They are not started:

- a checkpointer that survives a process restart
- a vector or embedding index
- LangSmith or any other trace export
- an agent UI, schedules, evals, or multi-agent crews
- attaching retrieved node types to the locality gate (a remote model is not export-checked on the text a retrieve node put in the prompt; keep agent models local until that exists)

## Tests

`test/agent-compiler.test.js`, `test/agent-validate.test.js`, `test/agent-rag.test.js` and `test/agent-routes.test.js` (HTTP, offline fake model). `test/wrong-agents.test.js` reruns the compiler and route suites with `STREAMGRAPH_AGENTS=broken` and passes only when that build fails.
