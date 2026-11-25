# LLM harness: bring your own model (phases L0–L1)

> LLM steps inside ETL flows (phase L2: `llm_map`, `llm_extract`, `llm_classify`, `llm_summarize`, `llm_translate`, `embed`) and the summarizer demo are documented in [llm-etl.md](llm-etl.md).

This harness lets StreamGraph use any model a user brings, local or paid, through one interface. The plan is `PLAN-LANGCHAIN-LANGGRAPH.md` §5, with Billy's decisions D1–D5 from 21 Nov 2026.

## Use it from code
```js
import { createHarness } from './src/llm/index.js';
const llm = createHarness({ dataDir: 'data', engine /* AbacEngine */, secret: id => secrets[id], emit: (type, data) => sse(type, data) });
const guard = llm.runGuard({ maxSteps: 10 });                          // hard stops (D3); a flow may lower them
const model = await llm.getChatModel(node.config.model, { flowId, nodeId, subject: 'analyst', flow, node, guard, contextTypes: ['Customer'] });
await model.invoke('Summarise these customers');                      // a LangChain BaseChatModel (MeteredModel)
await model.bindTools([tool]).invoke('…');                            // native tools or prompt-based fallback
await model.withStructuredOutput(jsonSchema).invoke('…');             // native, then JSON mode, then prompt + Ajv
const emb = await llm.getEmbeddings('nomic-embed', { flowId, nodeId, subject });
```
The studio creates one harness and exposes it as `studio.llm`.

Model precedence is: the node's `config.model`, then the flow's `models.default`, then the workspace's `defaults.chat`. A node may override `options` such as temperature and maxTokens. It can never set `keyRef`, `baseURL`, `url`, `provider` or `transport`; trying returns 403.

## `data/models.json` (admin only, no secrets)
```jsonc
{ "models": {
    "local-llama": { "provider": "ollama", "model": "llama3.1:8b", "baseURL": "http://127.0.0.1:11434", "transport": "inproc", "locality": "local" },
    "nomic-embed": { "provider": "ollama", "kind": "embed", "model": "nomic-embed-text", "dims": 768, "baseURL": "http://127.0.0.1:11434", "transport": "inproc", "locality": "local" },
    "claude":      { "provider": "anthropic", "model": "<model id>", "keyRef": "env:ANTHROPIC_API_KEY", "transport": "stdio" },
    "vllm-box":    { "provider": "openai_compatible", "model": "Qwen/…", "baseURL": "http://10.0.0.5:8000/v1", "keyRef": "env:VLLM_KEY" },
    "lmstudio":    { "provider": "openai_compatible", "preset": "lmstudio", "model": "local-model" },
    "fast-local":  { "provider": "ollama", "model": "llama3.1:8b", "transport": "direct" },
    "host-model":  { "provider": "mcp_sampling", "hints": { "intelligencePriority": 0.8 } },
    "remote-bridge": { "provider": "mcp", "url": "https://bridge.example/mcp", "keyRef": "env:BRIDGE_TOKEN", "remoteModel": "claude" },
    "vendor":      { "provider": "mcp", "command": ["vendor-mcp"], "adapter": { "invokeTool": "generate", "argsMap": { "prompt": "$prompt" }, "resultPath": "/text" } } },
  "defaults": { "chat": "local-llama", "embed": "nomic-embed" },
  "limits":   { "maxSteps": 50, "maxToolCalls": 100, "maxWallSeconds": 900 },
  "budgets":  { "perFlowUSD": 5, "perDayUSD": 20 },
  "agents":   { "enabled": false, "tracing": { "local": true, "langsmith": false } } }
```
- **Fresh install (D2):** the file starts with only `local-llama` and `nomic-embed`, both pointing at Ollama on loopback. Nothing is downloaded, and nothing calls out. If Ollama is down, a node that relies on the default fails with "default model unreachable", and no other model is tried.
- **Providers:** `openai`, `azure_openai`, `anthropic`, `google-genai` (alias `google`), `xai`, `bedrock` (alias `aws`), `mistralai`, `groq`, `ollama`, `openai_compatible` (`baseURL` or `preset`: `vllm`, `lmstudio`, `llamacpp`, `litellm`, `openrouter`), `mcp` and `mcp_sampling`. Provider packages are `optionalDependencies` and are imported lazily.
- **Keys:** `keyRef` is `env:NAME` or `secret:<id>`. A `secret:` ref reads the studio secrets file, which is mode 0600 and never returned by the API. Literal keys are rejected: a key-shaped value anywhere in the entry, or an option named `apiKey`, `token`, `password`, `credentials` and so on. For Bedrock the ref resolves to a JSON `{accessKeyId, secretAccessKey}`; leave it unset to use the AWS default chain.
- **Admin-only fields:** only an admin can change `baseURL`, `keyRef`, `url`, `command` or `provider`, or raise a limit. The API returns 403 to anyone else.
- **Validation:** an Ajv JSON Schema plus extra rules: known providers, `openai_compatible` needs a URL, `mcp`/`mcp_sampling` can't use `direct`, and cloud providers can't be marked local.
- **Agent tracing:** `agents.tracing.langsmith` defaults to false. The LangSmith key is only `LANGSMITH_API_KEY` in the environment. StreamGraph sets `LANGSMITH_TRACING` and `LANGCHAIN_TRACING_V2` to `false` so a stray variable does not upload traces. See [llm-agent.md](llm-agent.md).

## Transports (D1)
| `transport` | Path | Where the key is resolved |
|---|---|---|
| `inproc` (default) | Model Bridge MCP server over an in-memory transport | inside the bridge (same process) |
| `stdio` | Model Bridge as a child process (`explore/server/model-bridge.js`), or `command` for any MCP server | in the child, from its own environment |
| `http` (provider `mcp` + `url`) | remote Model Bridge or vendor MCP server, `Authorization: Bearer <keyRef>` | on the remote machine |
| `sampling` (provider `mcp_sampling`) | `sampling/createMessage` to the MCP host StreamGraph runs inside | nowhere; the host pays |
| `direct` | LangChain class in this process | at call time, never stored on the node's object |

The Model Bridge's tools are `model_list`, `model_probe`, `chat_invoke`, `chat_stream` (sends MCP progress notifications), `embed` and `model_cost`. Over HTTP it requires a bearer token, compared with `timingSafeEqual`, whenever it listens beyond loopback. `allowDirectFallback: true` lets an admin fall back to `direct` when the bridge is down. Vendor MCP servers have no standard tool shape, so you map one with `adapter: {invokeTool, argsMap, resultPath}`. `argsMap` values can be `$prompt`, `$messages`, `$model`, `$last` or a literal. Such adapters have no native tools, so the prompt-based tool fallback is used.

## Guards (the same on every transport)
Every model is wrapped in `MeteredModel`, which adds these guards:
- **Actor:** every call is stamped `grokbot/<flow>/<node>`. A `human:` actor is refused (403), following the starter PR #2 rules.
- **Locality gate (D5):** each model is `remote` or `local`.
  - Remote covers cloud providers, `mcp_sampling`, and **any non-loopback URL**, including a LAN host or a free hosted endpoint (D9, 21 Nov 2026). `"locality": "local"` no longer overrides a non-loopback URL; it only applies to entries without a URL. `"locality": "remote"` always wins.
  - For a remote model, the subject needs `read` and `export` on every entity type in `contextTypes` (pass them in `ctx`, or with `model.withContextTypes([...])`). A local model needs only `read`.
  - A refusal returns `export_denied` ("this model is remote; you need export rights on …"), and nothing is sent.
- **Hard stops (D3):** `RunGuard` enforces `maxSteps`, `maxToolCalls` and `maxWallSeconds` (an AbortSignal that cancels in-flight calls). A stop gives status `stopped:<limit>`, and the LangGraph checkpoint is kept.
- **Meter:** usage comes from `usage_metadata`, or is estimated at characters ÷ 4 and marked `estimated`. Cost comes from `data/model-prices.json`, which you edit; `null` means price unknown. Local models cost 0, and sampling is billed by the host. Each call emits an `llm.call` event. A budget overrun emits `budget.exceeded` once, and the run continues.
- **Errors:** errors use stable codes: `auth_error`, `rate_limit`, `timeout`, `unreachable`, `cancelled`, `unsupported`, `bad_request`, `export_denied` and `stopped`. Messages are redacted twice: in the bridge, using the exact key value, and in the harness, using known values plus key-shaped patterns.

## Capability probe and fallbacks
`llm.probe(name)` runs these live micro-tests through the model's own transport and caches the result in `data/models.probe.json` for 7 days. Reachable, tools, vision and stream each have a timeout of 120 s for local models and 30 s for remote ones; set `probeTimeoutMs` on a model to change it. Over MCP, the caller waits for the whole probe, not just one chat call. Each chat call through the Model Bridge waits up to 600 s for a local model and 120 s for a remote one; set `timeoutMs` on a model to change it. The structured-output probe uses that same per-call wait (not the shorter step timeout), retries the native attempt once if it times out or fails transiently, and only then falls back to JSON mode or a schema prompt. A fallback is recorded on the result as `structuredOutputReason`. A structured-output *call* (not the probe) still gets four times the per-call wait, one budget per fallback step. If a provider hands back a partial reply after an abort, timeout or hard stop (ChatOllama does this), the harness reports it as `cancelled`, `timeout` or `stopped:*`, never as an answer. A reasoning model on CPU, such as qwen3 on Ollama, can take 20 s per short step and well over 120 s for a native structured call. The probe's tests:
- reachable;
- a forced echo tool call;
- JSON `{n: 2}` (native with one retry, then JSON mode, then prompt);
- a 1×1 PNG;
- streaming;
- usage reporting;
- embedding dimensions.

When a model lacks a feature, these fallbacks apply (`src/llm/fallbacks.js`):

| Missing | Fallback |
|---|---|
| Native tool calling | Prompt-based tools: a JSON action block, retried once. A call to a tool not on the allowlist is dropped. |
| Structured output | JSON mode, then a schema prompt with Ajv validation and one repair retry. |
| Streaming | One buffered chunk. |
| Usage reporting | An estimate. |

## Hosted inference aggregators (`openai-compatible-hosted`)
Use this provider for paid aggregators that serve many open models behind one OpenAI-compatible API. A hosted model is always `remote`, so a call needs ABAC `export` on every entity type in the prompt (D5).

```json
"inference/meta-llama/llama-3.1-8b-instruct": {
  "provider": "openai-compatible-hosted", "preset": "inference", "region": "us",
  "model": "meta-llama/llama-3.1-8b-instruct", "keyRef": "env:INFERENCE_API_KEY"
}
```

| Preset | Base URL | Status |
|---|---|---|
| `inference` (Inference.net) | `https://api.inference.net/v1`; `region: "us"` uses `https://us.api.inference.net/v1`; `format: "anthropic"` uses the Messages API at `https://api.inference.net` | Supported. Key in `INFERENCE_API_KEY`. |
| `openrouter` | `https://openrouter.ai/api/v1` | Preset only, not verified |
| `together` | `https://api.together.xyz/v1` | Preset only, not verified |
| `fireworks` | `https://api.fireworks.ai/inference/v1` | Preset only, not verified |
| `deepinfra` | `https://api.deepinfra.com/v1/openai` | Preset only, not verified |
| `groq` | `https://api.groq.com/openai/v1` | Preset only, not verified |

- **Catalog import (admin only).** `POST /api/studio/models/import-catalog {preset, region?, only?, prefix?}`, or `harness.importCatalog(...)`, reads `GET /v1/models`. Inference.net serves this list without a key, so none is sent. Each model becomes `<preset>/<id>` in the registry, carrying context length, max output tokens and vision (from `input_modalities`). Its pricing (USD per token) goes into the price table as USD per 1M under `openai-compatible-hosted:<preset>/<id>`. Models marked as needing approved access are listed in `needsApproval`.
- **The probe decides tool support.** The catalog doesn't say which models support tools, so imported models start with `toolCalling: null`. The probe settles it. Models such as `llama-3.2-1b/3b` and `schematron-*` reject tools and fall back to prompt-based tool calling.
- **Approval-required models.** A `403` with `model_access_required` becomes `access_required`: `model "<id>" needs approved access from the provider (403 model_access_required). Request access for it in your provider account, then retry. No other model was tried.` The key is never included.
- **Gateway mode.** `headers` holds non-secret literal headers (for example `x-inference-provider`). Values that look like keys are refused. `headerRefs` maps a header name to a key reference (`env:` or `secret:`), which is resolved at call time and redacted like any key. The exact `x-inference-provider*` header names come from the admin. They weren't checked against Inference.net's gateway docs.
- **Retries.** Every provider class defaults to `maxRetries: 1` (LangChain's default is 6 with backoff), so a bad structured reply doesn't stall a run. Set `options.maxRetries` on a model to change it.
- **Tests.** `mockInference` in `test/fixtures/mock-llm-http.mjs` copies the `/v1/models` shape, the 403 and tool rejection, and it records headers. No real call is made unless `INFERENCE_API_KEY` is set (optional `SG_TEST_INFERENCE_MODEL`).

## Conformance
`npm run test:model -- <name> [--transport mcp|direct|both]` runs C1–C13 (`test/llm/conformance.mjs`) and writes `data/models.conformance/<name>.json`:

| Check | What it tests |
|---|---|
| C1 | reachable |
| C2 | plain chat |
| C3 | tool round trip |
| C4 | structured output |
| C5 | streaming |
| C6 | usage |
| C7 | vision |
| C8 | embeddings |
| C9 | a bad key gives `auth_error` without the key |
| C10 | abort within 2 s |
| C11 | probe flags match what the model really does |
| C12 | MCP and direct agree (when run with `both`) |
| C13 | hard stops |

CI runs the suite offline against a deterministic fake model (`test/fixtures/fake-chat-model.js`) over MCP (inproc and a stdio child, `test/fixtures/fake-model-bridge.mjs`) and direct. It also uses mock OpenAI-compatible and Ollama HTTP servers (`test/fixtures/mock-llm-http.mjs`). Live checks run only with `SG_TEST_OLLAMA=1`, or with a provider key plus `SG_TEST_<PROVIDER>_MODEL`.

## Wrong build
`SG_LLM_IMPL=wrong` (see `src/llm/wrong.js`) breaks four things on purpose: the bridge echoes keys in its errors, the probe claims every feature, a fresh install seeds a remote model, and an unreachable default goes unreported. `test/wrong-llm.test.js` checks that the suite catches all of it.

## Licenses
The required packages are `langchain`, `@langchain/core`, `@langchain/langgraph`, `@langchain/langgraph-checkpoint`, `@langchain/mcp-adapters` and `@langchain/textsplitters`. The optional provider packages are `@langchain/openai`, `anthropic`, `google-genai`, `xai`, `aws`, `mistralai`, `groq` and `ollama`. All of them are MIT.

`tools/license-audit.mjs` fails if any of these appear:
- a non-permissive license;
- a missing required LangChain package;
- the LangGraph Agent Server family (`@langchain/langgraph-api` / `-cli`, ELv2);
- `better-sqlite3` or `@langchain/langgraph-checkpoint-sqlite`;
- any native addon (`binding.gyp`), which is a risk for the Windows build.
