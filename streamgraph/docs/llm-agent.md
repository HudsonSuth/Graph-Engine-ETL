# Agent flows on LangGraph

L3, L4 and L5 are implemented. L6, L7, L8 and L9 are not started.

An agent flow is a small graph the server compiles into a LangGraph `StateGraph` and runs against a model from the harness. It is off on a fresh install. Set `agents.enabled` to `true` in `data/models.json` (admin Models API) before any `/api/agents` route will accept a call. The default is false, including for the owner.

`validateFlow` treats a flow as an agent flow when `kind` is `"agent"`, or when it has agent nodes and no ETL steps. The same function still checks ETL flows, including the rule that a model node cannot set `keyRef`, `baseURL`, `url`, `provider` or `transport`. A tool loop is allowed. ETL flows are still rejected when they contain a cycle. `POST /api/validate` uses this one check.

Checkpoints are a JSON file, `data/agent-checkpoints.json`, plus the thread list in `data/agent-runs.json`. Both are plain files. Nothing uses SQLite, and the LangGraph Agent Server is not used. Run and resume share that file, so a thread paused for approval is still there after the process restarts. `SqliteSaver` is not used: it is a native addon, and the license gate rejects it. A caller that does not pass a checkpointer still gets an in-memory saver for that one call.

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

Retrieved text is the graph's own text search plus, when an OpenSearch sink is configured, the nearest embed vectors (L4 and L5). Each hit that names a type is checked: the caller must be allowed to `read` that type or the hit is left out. The types that remain are handed to the model call as context, so the locality gate runs on them. A remote model needs `export` as well as `read`. If it does not have `export`, nothing is sent. When OpenSearch at `127.0.0.1:9200` is not running, or the vector query errors, retrieval is only the graph text search.

`makeGraphRetrieve(graph, k)` is the text search. `makeVectorRetrieve({ search, embed, k })` is the vector search. `makeAgentRetrieve({ graph, search, embed, engine, subject, k })` is what the HTTP route uses: both lists when the vector index answers, and the graph list alone when it does not. `makeOpenSearchRetrieve` and `combineRetrieve` are still there for a caller that already has a search function.

The vectors themselves come from the ETL `embed` step. The graph mapper copies a numeric array listed in `_llm.fields` onto the node even when the mapping does not name that field, and it stamps edges from that record with the same unverified provenance as the nodes. The OpenSearch sync-out sink writes each vector to a sibling index, `<text-index>-knn`. When the cluster accepts a `knn_vector` field (Lucene HNSW), queries use the k-NN API. The Linux min distribution of OpenSearch does not include that plugin, so the same vectors are stored as floats and ranked in this process. Either way a query returns the nearest nodes. A hidden embedding is not indexed: the sink user is the sync-out "send as" user, and masked values never leave as vectors.

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
| `GET /api/agents/reviews` | `agent.approve` | LLM-generated nodes and edges still at `trust_tier` `unverified`. A type the caller cannot read is left out. |
| `POST /api/agents/reviews` | `agent.approve` | Body `{ id, kind?, decision, note? }`. `decision` is `approve` or `reject`. |
| `POST /api/agents/:id/cancel` | `agent.run` | Aborts a running thread, or drops a paused one so it cannot be resumed. |
| `GET /api/agents/:id` | `agent.run` | `{ threadId, known, status, pending }`. Unknown threads are 404. |
| `GET /api/agents/threads` | `agent.run` | Threads this process has seen, with their status. |

The model is the harness default, or `flow.models.default`, or `flow.model`, or a model node's `config.model`. The same `RunGuard` covers the run. Admins have `agent.run` and `agent.approve`. Analysts do not, unless a rule allows that action.

A cancelled thread returns 409 on resume.

## Reviewing generated graph items (L5)

ETL steps stamp every node they write, and every edge of that record, with `trust_tier: "unverified"` and `generated_by: "grokbot/..."`. `POST /api/agents/reviews` with `decision: "approve"` raises that tier to `human-reviewed` and sets `status` to `stable`, `verified_by` and `verified_at`. The tier comes from the same `tierOf` rule as the wiki: only a recognised human counts, and the default list is `human:whsutherland`. The studio owner maps to that human. A "Test as" preview cannot approve, and an agent actor never can. `reject` leaves the tier unverified and drops the item from the pending list. A second approve of an item that is no longer waiting returns 409.

This is the graph, not the wiki file. A wiki note is still verified with `POST /api/explore/x/wiki/verify`. The graph write lasts as long as the graph does: an in-memory graph is empty after a restart, and `--graph` keeps it.

## Code

- `compileAgentFlow(flow, ctx)` → compiled graph.
- `runAgentFlow({ flow, ctx, input, threadId })` → `{ status, messages, threadId, interrupts? }`.
- `resumeAgentFlow({ flow, ctx, threadId, decision })` resumes that thread. Pass the same `ctx.checkpointer` (and `ctx.compiledCache` when you have one) that the run used. The HTTP routes do this with the file saver.
- `validateAgentFlow(flow)` → error strings. `validateFlow` calls it for an agent flow.
- `makeAgentRetrieve(...)` → the retrieve function the route uses.
- `reviewItem(graph, { id, decision, actor, allowHuman })` → promotes or rejects one generated node or edge.

`ctx` is `{ model, modelFor?, tools, retrieve?, sink?, route?, guard, checkpointer, graph }`. `model` is a chat model from `harness.getChatModel` (a `MeteredModel`) or, in tests, a stub with `invoke`.

## Not started (L6–L9)

There is no route for these:

- LangSmith or any other trace export. Leave `LANGSMITH_TRACING` unset.
- An agent UI, schedules, evals, or multi-agent crews.
- A model picker in the studio UI. Models are still the admin API only.

## Tests

`test/agent-compiler.test.js`, `test/agent-validate.test.js`, `test/agent-rag.test.js`, `test/agent-routes.test.js` and `test/l45.test.js` (HTTP review and restart, offline fake model, mocked OpenSearch). `test/wrong-agents.test.js` reruns the compiler and route suites with `STREAMGRAPH_AGENTS=broken`. `test/wrong-l45.test.js` reruns `test/l45.test.js` with `STREAMGRAPH_L45=broken`. Both proofs pass only when that build fails. They do not call the network.
