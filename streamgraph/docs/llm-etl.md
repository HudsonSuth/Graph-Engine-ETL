# LLM steps in ETL flows (phase L2)

Phase L2 of `PLAN-LANGCHAIN-LANGGRAPH.md` (§7.1, §16 L2) adds six transforms that call a model for each record of an ETL flow. They sit in a flow like any other transform. ETL flows stay acyclic, and `validateFlow` still rejects cycles. Every call goes through the bring-your-own-model harness ([llm-harness.md](llm-harness.md)). So the transport, keys, metering and hard stops work the same as everywhere else. MCP is preferred and direct calls are allowed.

| Step | What it does | Main config |
|---|---|---|
| `llm_map` | A prompt template over fields → a new text field | `prompt` ("Greet {{name}}"), `output`, `system?` |
| `llm_extract` | JSON Schema → structured fields (native, JSON mode, or prompt + Ajv, via the harness) | `schema` (type object), `field`/`fields`/`prompt`/`document`, `instructions?`, `prefix?`, `split?`, `parentKey?` |
| `llm_classify` | One of `labels`, plus a `confidence` from 0 to 1 | `labels`, `output` (default `label`), `confidenceField` (default `confidence`) |
| `llm_summarize` | Map-reduce summary of long text: split, summarise each part, combine | `field` or `document`, `output` (default `summary`), `maxWords` (150), `chunkChars` (6000), `chunkOverlap` (200), `maxChunks` (24) |
| `llm_translate` | `fields` → `<field>_<language>`, or `outputs[field]` | `fields`, `to` |
| `embed` | Text → a vector field, written to the OpenSearch k-NN sink (L4) | `field`/`fields`/`document`, `output` (default `embedding`), `model` (an embedding model) |

Options shared by every step:
- `model`: a model name, or `{ name, options }`. Precedence is the node, then the flow's `models.default`, then the workspace default (local Ollama, D2). A node can never set `keyRef`, `baseURL`, `url`, `provider` or `transport`, and the validator rejects them.
- `topics`: scope the step to some topics. Other records pass through unchanged.
- `when`: a JSONata condition (`src/expr.js`). The model is called only when it is true; otherwise the record passes through.
- `entity`: the ABAC entity type of the record. The default is the first node label the flow's graph sink maps this topic to.
- `document: { folder, pathField: "path", field: "content" }`: read the file the record points at, using the documents readers and limits. The path cannot leave `folder`.
- `maxInputChars` (32000): a larger prompt is refused before anything is sent.

Deletes (`op: "d"`) never call a model.

## Access rules and data leaving the box (D5, D9)
Each record is checked as the run's user: in the server, the active studio user; in the demo, `--as`.
- **Masking.** Fields the user may not see are replaced by `[hidden]` before they reach a prompt. If the whole input of a summary, translation or document read is hidden, the record is refused.
- **Locality gate.** A model on any non-loopback endpoint is **remote**: a cloud provider, a LAN host, a free hosted API, or `mcp_sampling`. It needs `export`, as well as `read`, on the record's entity type. A loopback model (Ollama on 127.0.0.1) needs only `read`. On refusal nothing is sent, and the record counts as an error with a clear message, for example `llm_classify: this model is remote; you need export rights on Customer`. The step's `denied` count goes up.
- **Fail closed.** The step refuses, and sends nothing, when it cannot tell the record's entity type, when the run has no access rules or user, or when the user can't read the type.
- Record content is wrapped in `<data>…</data>` under a system rule that says it is data and never instructions.

## Hard stops (D3) and errors
- Each record gets its own run guard. `maxSteps` caps the number of model calls for that record, including map-reduce calls. `maxWallSeconds` aborts in-flight calls. Both come from `models.json` `limits`. A flow's `limits` may lower them, and only an admin may raise them.
- Stopping or resetting the pipeline cancels in-flight model calls.
- A failure on one record (the model errors, a refusal, a stop) counts in that step's `errors` and `lastError`. The pipeline carries on with the next record. A failed record is not passed on half-processed.
- Budgets still only warn (`budget.exceeded`) and never stop a run.

## Provenance (A2.2)
Every output record carries `_llm`:
```jsonc
{ "model": "local-llama", "transport": "inproc", "locality": "local", "run": "<pipeline run id>", "node": "summarize",
  "generated": { "by": "grokbot/<flow>/<node>", "at": "<ISO time>" }, "trust": "unverified", "status": "draft",
  "tokens": { "input": 812, "output": 95, "total": 907, "estimated": false }, "costUsd": 0,
  "fields": ["summary", "category", "confidence"], "steps": [ { "node": "summarize", "model": "…", "by": "…", "calls": 3 } ] }
```
The graph sink stamps every node it writes from such a record, and every edge of that record, with `trust_tier: "unverified"`, `status: "draft"`, `generated_by`, `generated_at`, `llm_model`, `llm_run` and `llm_fields`. These are the same property names the wiki import uses. A human approval raises the tier to `human-reviewed` (`POST /api/agents/reviews`, phase L5). Agents are stamped `grokbot/…` and never `human:`.

Step stats (`GET /api/state` → `steps.<id>.llm`) show per-node `calls`, `inputTokens`, `outputTokens`, `totalTokens`, `estimated`, `costUsd` (null if the price is unknown), `model`, `transport` and `locality`.

`llm_extract` with `split: [{ field, topic }]` fans out one extra record per array item, on `topic`. Each one carries the item's fields, `parent_key` (from `parentKey`), `item_index` and the same `_llm`. Map those topics in the graph sink like any other topic.

## Text files for the documents source
The documents source reads `.txt`, `.md` and `.eml` only when you set `"textFiles": true`, so existing folders behave as before. Emails turn their headers into metadata (`subject`, `from`, `to`, `cc`, `date`), and for multipart mail only the first text/plain part is read. Markdown is split into sections by heading. Files that look binary are refused.

## The email/meeting summarizer demo
`demo/summarizer/flow.json` runs a folder of meeting notes and emails (`demo/summarizer/inbox`) through `llm_summarize` → `llm_classify` (action-required / decision-needed / fyi) → `llm_extract` (people and action items, split into their own records) → graph: `Meeting`, `Person`, `ActionItem`, with the edges `ATTENDED`, `HAS_ACTION` and `ASSIGNED_TO`.

```bash
npm run demo:summarizer                                   # local Ollama (D2); picks an installed chat model
npm run demo:summarizer -- --ollama-model qwen3:4b        # a specific Ollama model
npm run demo:summarizer -- --transport direct             # direct in-process calls instead of MCP (D1)
npm run demo:summarizer -- --model <name> --data <dir>    # any model in <dir>/models.json, paid ones included (remote ones need export)
npm run demo:summarizer -- --fake                         # deterministic fake model (what CI runs), no network
npm run demo:summarizer -- --as analyst                   # shows fail-closed: Meeting.content is unclassified, so nothing is sent
npm run demo:summarizer -- --folder <dir> --json out.json # your own folder; save the results
```
The demo keeps its own workspace in `<tmp>/streamgraph-summarizer` (`models.json` and prices); `--data` changes it. With no `--ollama-model`, it asks Ollama on 127.0.0.1 which models are installed and uses the seeded `llama3.1:8b` if it's there. Otherwise it tries `llama3.2:3b`, then `qwen3:4b`, then `qwen3:8b`, then the first chat model it finds. If Ollama doesn't answer, the demo stops with "default model unreachable" and tries no other model. Thinking output from reasoning models (`<think>…</think>`) is stripped from text answers.

## Tests
- `npm run test:llm-etl` runs `test/llm-etl.test.js` and its wrong-build proof `test/wrong-llm-etl.test.js` (`SG_LLM_ETL_IMPL=wrong`). Both are also part of `npm test` and `npm run test:llm`. They run on the fake model over MCP (inproc) and direct, with no network.
- To run live against a local Ollama: `SG_TEST_OLLAMA=1 [SG_TEST_OLLAMA_MODEL=llama3.2:3b] npm run test:llm-etl`. It is skipped by default.
  - The live test runs with a per-record budget suited to the model: the flow's 600 s and 20 calls per step, or 2400 s and 40 calls for thinking models (`qwen3*`, `deepseek-r1*`, `*think*`). `SG_TEST_OLLAMA_WALL_SECONDS` and `SG_TEST_OLLAMA_MAX_STEPS` override it for a slower machine. A hard stop still fails the test, and the message names the limit that was reached.
  - The wrong-build proofs (`test/wrong-*.test.js`) always run their child suite offline. They strip every `SG_TEST_*` flag and the provider keys that turn on the live smokes (`test/offline-child.js`). If the child runs out of time, the proof fails with "timed out" instead of "got 0".
- The demo takes the same budget as `--max-wall-seconds <n>` and `--max-steps <n>`. For example, `npm run demo:summarizer -- --ollama-model qwen3:4b --max-wall-seconds 2400` on a CPU-only PC. These raise this workspace's ceiling in `<data>/models.json` as its admin. The hard stops still apply.

## Not in L2 (deferred)
- A bounded pool or batching for LLM steps. The per-record queue is serial, as it was before.
- Caching by input hash.
- Model pickers, chips and cost badges in the `/advanced` UI. The new kinds appear in the palette, and their config is edited as JSON.
- Re-deriving or deleting `split` child records when their parent is deleted.

The OpenSearch index for `embed` vectors, and the human review that raises `trust_tier`, are L4 and L5. See [llm-agent.md](llm-agent.md).
