# StreamGraph

An open-source, clean-room take on a schema-driven streaming ETL tool that turns files, APIs, Kafka topics and SQL tables into one live knowledge graph. Built from public product pages only (see RESEARCH.md and SPEC.md). No vendor code, binaries or trials were used.

## Guided view (no code)
Open http://localhost:8080 for the guided view: Home, Add a data source, Connect your sources, Clean up, Explore, Send data out and Access rules. Click "Try the demo data" on first run. The technical flow editor is under **Advanced** (`/advanced`). See UI-SPEC.md for the flows and the plain-word map.

```
node src/server.js                 # empty workspace, guided view at http://localhost:8080
```

Workspace and secrets live in `data/` (`--data dir` to move them). Secrets are in `data/secrets.json` (mode 600) and are never sent to the browser.

## Run it
Needs Node 22.5 or newer (uses the built-in `node:sqlite`). No Docker.

```
npm install
npm run demo        # http://localhost:8080 with the sample retail pipeline streaming live
npm test            # 217 tests: 204 pass, 13 skip when OpenSearch is not running and no live model key is set. Includes proof that a wrong mapper, matcher, reset, access engine, documents reader, wiki importer, agent compiler, L4/L5 build and L6–L9 tracing/eval build fail
```

`npm run demo` = `node src/server.js demo/flow.json --demo --run`. Flags: `--port 8080`, `--graph graph.db` (persist the graph to a SQLite file instead of memory), `--run` (start the flow in live mode at boot), `--demo` (reset sample data and start the simulator).

## Integrated build (this folder): one app, one port
This build adds the Graph explorer, live processing (Flink + Kafka), entity matching (Duke or Splink) and the investigation tools to the same studio. Everything runs in **one Node process on 127.0.0.1:8080**. The extra Java processes are started and stopped from the studio.

```
npm ci                     # or npm install
npm start                  # = node explore/combined.js demo/flow.json  (studio + Graph explorer + MCP + wiki import on :8080)
npm run demo:combined      # same, with the demo data streaming
npm run start:core         # the original StreamGraph server without the explore layer
npm run setup:processing   # optional, once: Kafka + Flink + Duke from Apache/Maven Central (SHA-verified), jobs compiled from source
```

In the studio:
- **Explore → Graph explorer** opens the interactive graph. On the left: Select, Expand, Path, Layout, Edit, Types. At the top: **Analyze ▾**, **View ▾**, **Export ▾** and **3D**. At the bottom: **Table**, **Chart**, **History**, **Query**, **Case notebook**.
- **Live processing** has Start/Stop buttons for stream processing (Flink metrics and alerts) and for entity matching (pick Duke or Splink and say which types are people or organizations). It also has the possible matches to review, with **Same thing** / **Not the same**.
- **Access rules** has a new **edit** action. Nobody can edit unless a rule allows it (admins can).

Every new endpoint (`/api/explore/*`, `/api/explore/x/*`, MCP) goes through the same access rules: denied by default, a deny always wins, hidden fields stay hidden. See INTEGRATION.md for what was built and how, UI-NOTES.md for every button, LICENSES.md and LICENSE-AUDIT.txt for licenses, `sdk/js` and `sdk/python` for the SDKs, and `perf/` for measured numbers.

## Markdown wiki (Vault-LD + OKF)
Markdown files are the source of truth. Graph-to-file write-back is off. Both dialects use one mapper. Trust tiers change how notes look and which filter they match; they are not access rules. Agent writes are stamped `grokbot/<name>`. Only `human:whsutherland` counts as a human, and an agent or MCP client can never write a `human:` actor. Demos stay rules-only. The JSON Schema to JSON-LD converter is the repo package `jsonld-from-schema` (one `x-jsonld` object). Neo4j / ki sync (plan W7) is not built; it waits until the Neo4j version on Billy's PC is confirmed.

```
npm run seed:wiki          # regenerate demo/wiki (deterministic, no LLM calls)
npm run demo:wiki          # seed vaults + a scripted MCP session
npm run test:wiki          # wiki, wiki-mcp and demo tests, including the deliberately wrong implementation
```

See explore/WIKI.md.

## LLM models: bring your own model (phases L0–L1)
StreamGraph can now run whatever chat or embedding model you bring, local or paid, through one harness (`src/llm/`). Every flow node asks the harness for a model by name and gets a LangChain `BaseChatModel`; it never imports a provider package. ETL steps (L2) are in [docs/llm-etl.md](docs/llm-etl.md). Agent flows (L3–L9) are in [docs/llm-agent.md](docs/llm-agent.md) and stay off until `agents.enabled` is true. The Agents screen, the advanced model picker, local traces, opt-in LangSmith, schedules and `npm run test:eval` are L6–L9. Multi-agent crews are not built.
- **Registry:** `data/models.json` is admin-only and holds no secrets. A fresh install seeds only local Ollama on `127.0.0.1:11434` (`local-llama` and `nomic-embed`). If Ollama isn't running, a node that relies on the default fails with "default model unreachable", and nothing else is tried.
- **Providers:** OpenAI, Azure OpenAI, Anthropic, Google (Gemini), xAI, Bedrock, Mistral, Groq, Ollama, and any OpenAI-compatible endpoint (presets: vLLM, LM Studio, llama.cpp, LiteLLM, OpenRouter), and hosted aggregators through `openai-compatible-hosted` (Inference.net supported, with a US region, the Anthropic format and a catalog importer; OpenRouter, Together, Fireworks, DeepInfra and Groq are presets only, not verified). Provider packages are optional dependencies and are loaded only when a model needs them.
- **Transports:** MCP is preferred, and `inproc` is the default: our Model Bridge MCP server running in-process. A model can also use a stdio child bridge, a remote HTTP bridge with a bearer token, a vendor's own model MCP server through an adapter config, MCP sampling (the host's model, so StreamGraph holds no key), or `direct` in-process calls. Every path goes through the same `MeteredModel` guards.
- **Keys:** a model stores only a `keyRef`, either `env:NAME` or `secret:<id>` (the studio secrets file). Literal keys are rejected. Keys are resolved at call time and never appear in logs, events, state, checkpoints or errors. Only admins can change `baseURL`, `keyRef` or `url`.
- **Locality gate:** each model is `local` (loopback, or marked local by an admin) or `remote` (cloud providers, sampling, any other host). A remote call needs ABAC `export` on every entity type in the prompt. Without it, nothing is sent.
- **Hard stops:** `maxSteps`, `maxToolCalls` and `maxWallSeconds` end a run with `stopped:<limit>` and keep its checkpoint. A flow can lower them, and only an admin can raise them. Budgets and the editable price table (`data/model-prices.json`) only warn, through a `budget.exceeded` event.
- **Capability probe and fallbacks:** the probe checks tools, structured output, vision, streaming and usage, and caches the result for 7 days. Weaker models fall back to prompt-based tools and to JSON with validation.

```
npm run test:llm                         # harness suite (offline: fake model, mock HTTP servers) + the wrong build
npm run test:model -- <name> [--transport mcp|direct|both] [--data data]   # conformance C1–C13 (+ C12 parity) for a model you added
npm run model-bridge -- --data data [--http 8790 --token-env BRIDGE_TOKEN] # the Model Bridge as its own process
```

See docs/llm-harness.md.

## Will It Run? fixture
`npm run test:willitrun` and the saved-view browser tests (P1–P6 in `explore/test/views-ui.test.js`) read `explore/demos/willitrun/fixture.json`. That file is committed. It is a CC BY 4.0 compilation from [Will It Run?](https://willitrunllm.com); the attribution and license fields are inside the JSON. `npm run fixtures:willitrun` refreshes it from the public API (needs network). If the file is missing, those tests skip with that reason instead of failing on a gitignored path.

## Documents (PDF, Word, Excel, CSV)
"Add a data source" → **Documents** reads a folder of files: upload them (they're copied into `data/uploads/docs-…`) or type a folder on this computer, which is read in place and never changed. Supported: PDF (`.pdf`), Word (`.docx`), Excel (`.xlsx`, `.xls`) and CSV.
- **What is read.** PDF: text per page, simple tables (3 or more lines whose columns line up), title, author, dates and page count. Word: paragraphs grouped into sections by heading, top-level tables, and core properties (title, author, created, last modified by). Excel: each sheet becomes a table (the first non-empty row is the header), with real sheet row numbers and the workbook's properties. CSV becomes one table.
- **What goes into the graph.** Each file becomes a `Document` with `file_name`, `file_type`, `size_bytes`, `modified_at`, `sha256`, `status`, any `problem` or `notes`, and its metadata. It links to its parts: `Document -[HAS_SECTION]-> Section` (heading, text, page or section number) and `Document -[HAS_TABLE]-> Table -[HAS_ROW]-> Row`. A table you turn into things in the wizard ("Each row is a Customer, identified by customer_id") makes `Customer` nodes instead of `Row` nodes, linked `Table -[HAS_ROW]-> Customer`. These combine with Customers from other sources through the normal mapping (same key, same matching rule). Every row and thing keeps `source_file`, `source_location` (`page 2`, `sheet Customers`, `table 1` or `file`) and `source_row`. Tables with the same columns share one choice, so a folder of monthly workbooks maps in one step.
- **Keep in sync.** Every 30 seconds by default (at least 5), the folder is re-scanned. Files whose size or time changed are hashed with SHA-256. A file with the same hash is not re-read. A changed file is re-read, and its rows are updated, added or removed (rows turned into things are tracked by their identifying value). A removed file takes its document, sections, tables, rows and things out of the graph. Sync-out passes these changes on, deletes included.
- **Access rules.** Document, Section, Table, Row and every new field start as "not reviewed", hidden from anyone below clearance 3, provenance fields included. A hidden file path or `source_file` turns the key into a pseudonym. Hidden values can't be searched, filtered or exported, and sync-out sends them as `[hidden]`. Mark fields on the Access rules page to open them up.
- **Reset.** "Start a new project" removes every document node and every uploaded file. Files in a folder you pointed at are never touched.
- **Untrusted files.** Nothing inside a file is run or fetched. Macros are ignored, and macro-enabled files (`.docm`, `.xlsm`, `.xlsb`) are refused. Links to web pages or other workbooks are not followed; the last saved values are used. Formulas are not recalculated, and DTDs and entity declarations are refused. The file type must match its contents. Each limit gives a plain error: 20 MB per file, 300 PDF pages, 500 files per folder, 50 sheets, 10,000 rows per table (extra rows are left out, with a note), and 2 million characters of text per document. Word and Excel files are zip packages, so they get extra checks: at most 5,000 parts, 150 MB unpacked in total, and an unpacked/packed ratio of at most 200 for any part over 1 MB. Each part is also unpacked with a hard cap at its declared size, so a part that lies about its size is caught (zip bomb). A file that can't be read still appears as a Document with the reason, and the other files carry on.

## Start a new project (reset)
Home ("Start a new project…" under your sources) and ⚙ Settings both open a confirmation that lists what will be deleted. Type RESET to enable the red button. "Download a backup first" saves the project settings, flow and graph as JSON (no passwords).

`POST /api/studio/reset` with `{"confirm":"RESET"}` (GET gets 405) stops every source and live feed, then clears the graph, flow and mapping, saved sources, stored secrets, uploaded files, copied flows and the checklist. Records still in flight are dropped once a pipeline stops, so nothing comes back after a reset while syncing is live. Graph tables are truncated rather than the file deleted, and the workspace and secrets files are overwritten, so it works on Windows without file-lock problems. Your original files and databases are never touched. `GET /api/studio/backup` downloads the backup.

## Send data out (live output connectors)
"Send data out" keeps another system in step with the graph: **Neo4j** and **Memgraph** (Bolt, neo4j-driver), **PostgreSQL** (two tables, `sg_nodes` and `sg_edges`, with JSONB props) and **Kafka / Confluent** (one keyed JSON message per node or edge, tombstones for deletes, idempotent producer, so a compacted topic holds the current graph). Pick a type, fill in the address, "Test connection", pick who the data is sent as, then "Save and start sending". Each output shows a green, amber or red status, how many changes are waiting and the last error.

How it works:
- Every graph write is recorded in a change log (`changes` table) with a sequence number. The graph has an epoch id that changes when it is wiped.
- Each output has a checkpoint `{epoch, seq, run, policy}` saved to `data/sync-checkpoints.json` (written to a temp file and renamed). On restart it carries on from there.
- A new output, a wiped graph, a gap in the log, or any access-rule change triggers a full snapshot tagged with a run id, followed by a sweep that deletes rows from older runs. So deletes made while the app was down, and data that is no longer allowed, are removed downstream.
- Delivery is at least once to idempotent targets: the checkpoint only moves after the target accepts a batch, and every write is an upsert by id. A failing target goes red, keeps its place and catches up when it is back.
- Data is filtered and masked under the access rules for the "send as" user (default: the built-in Sync-out service, clearance 1). A change the user may not see is sent as a delete.
- Passwords are stored in `data/secrets.json` only.

## Access rules (ABAC)
An embedded attribute-based access engine in plain JavaScript, modeled on the Neo4j + OPA design in HudsonSuth/youtube-to-training PR #2 (read only), with no Docker.
- **Policy graph.** Users (role and clearance 0 to 3), data types (tags such as `pii` and a level 0 Public to 3 Restricted), field sensitivity (low, medium, high or not reviewed) and rules live in their own small graph, `data/policy.db`, which is the source of truth.
- **Rules.** Each rule allows or denies actions (`read`, `query`, `export`, `sync-out`, `admin`) for subjects (roles, users, minimum clearance) on resources (types, tags) with optional environment conditions (via ui, export, api or sync-out, and UTC hours). The default is deny and a deny always wins. A built-in rule denies `pii`-tagged data to anyone whose clearance is below its level.
- **Fail closed.** Unknown users, users with no role or no numeric clearance, unknown actions, data types with no attributes and an unreadable policy are all denied. Fields that are unlisted or not reviewed need clearance 3. An empty field list hides every field from everyone. New types and fields found in the data are registered automatically as "not reviewed".
- **Masking everywhere.** The same check and masking apply to Explore (questions, search and the field lists), the CSV download (built on the server), the advanced API (`/api/graph`, `/api/query`, `/api/export.cypher`) and every sync-out output. Hidden values show as `[hidden]`, can't be filtered or searched on, and a hidden identifying field is replaced with a stable pseudonym (`anon-…`).
- **Immediate changes.** Decisions are cached for 5 seconds at most and the cache is cleared on every policy change, so edits apply to the next request (PR #2 used a 300 s cache).
- **Explain and audit.** Every decision has a plain-language trace ("Test as…" shows it), and decisions go to `data/audit.ndjson` (once a minute while unchanged). Resets are logged too.
- **Optional OPA.** Off by default. When on, a local allow must also be allowed by your OPA server, using the Kafka-authorizer input shape (`input.action.operation`, `input.action.resourcePattern`, `input.requestContext.principal`). Errors, timeouts, HTTP failures and undefined results deny (like `allow.on.error=false`).
- **Screen.** "Access rules" has a "Test as…" table with the reason for every ✓ and ✕ and a button to preview Explore as that user, a plain-language rule builder, a schema viewer for marking fields sensitive and tagging types, a local list of people and the recent decisions.
- **No real login yet.** Everyone using the app on this computer acts as the Owner (admin, clearance 3). "Test as" is a preview only, and setup screens need the admin action. OAuth 2.0 / Keycloak sign-in is the next step. The owner always keeps admin, and a rule that would lock the owner out is refused.

## Network
The server listens on 127.0.0.1 only, because there is no login yet. Set `HOST=0.0.0.0` (PowerShell: `$env:HOST="0.0.0.0"`) to expose it on your network at your own risk.

## Windows
Works the same in PowerShell or cmd with Node 22.5+ (tested target: Node 24.20): `npm install`, `npm test`, `npm run demo`. No POSIX tools are needed; every npm script is plain `node`. Notes:
- The secrets file can't be chmod'ed on Windows; it relies on your user profile folder's permissions instead. Keep `data\` inside your own profile.
- Screenshots are optional: `npm run shots` / `npm run shots:ui` use playwright-core with Chrome, Edge or a Playwright Chromium if one is found (set `CHROME=C:\path\to\chrome.exe` to pick one) and skip cleanly otherwise.
- CSV files saved by Excel (with a byte-order mark and CRLF line endings) are read correctly.
- **Integrated build on Windows (no admin, no Docker).** Point it at a JDK 17+: `$env:JAVA_HOME="C:\Users\whsut\tools\jdk21"` (or `STREAMGRAPH_JAVA=C:\...\bin\java.exe`). Run `npm run setup:processing` once. It uses Windows' own `tar.exe` and downloads Kafka/Flink/Duke into `explore\kafka\.runtime`, `explore\flink\.runtime` and `explore\er\lib`. Kafka (KRaft, no ZooKeeper) and Flink (a MiniCluster in one JVM) are started with `java -cp`, never through the `.sh`/`.bat` scripts. If you already have Kafka unpacked, set `KAFKA_HOME` instead. Ports: Kafka 9092/9093 (`STREAMGRAPH_KAFKA_PORT` to move them). Heaps: `STREAMGRAPH_KAFKA_HEAP` (384m) and `STREAMGRAPH_FLINK_HEAP` (512m). Ctrl+C or closing the window stops the Java processes too.
- Splink needs Python 3.10+ with duckdb and pyarrow (`npm run er:setup`). Duke only needs the JDK, so Duke is the default engine.

## Demo pipeline
- `customers.csv` (file source) and a loyalty API (HTTP poll source, messy IDs like `" C1"`) are renamed and normalized so both land on the same `Customer` node.
- `orders.ndjson` is tailed like a stream. Test orders with total 0 are filtered out and big orders are flagged by an expression.
- `products.json` becomes `Product` nodes, and the `category` property becomes an `IN_CATEGORY` edge to a `Category` node.
- `shop.db` `inventory` table is read by polling CDC on `updated_at`. Stock and warehouse moves update the `STOCKED_AT` edge.
- The simulator appends orders, changes stock and bumps loyalty tiers every 1.2 seconds, so the schema counts and graph preview update live.

Try the query box: `(c:Customer {tier:"gold"})-[:PLACED]->(o:Order)-[:CONTAINS]->(p:Product)`.

## Pieces
| Area | What it does |
|---|---|
| Sources | `documents` (PDF, Word, Excel, CSV folder with hash-based re-scan), `file` (CSV, JSON, NDJSON tail), `http` (poll with c/u/d diff by key), `kafka` (kafkajs, JSON or Debezium envelope, tombstones as deletes), `sql` (one-shot table read), `cdc` (polling CDC on SQLite, Postgres or embedded PGlite; deletes by key-set diff or soft-delete flag) |
| Transforms | `map`, `rename` (fields or topic), `filter`, `cast` (String, Integer, Long, Short, Double, Float, Boolean, Date, Timestamp), `normalize`. Expressions are JSONata, the open stand-in for SpEL. No `eval`. Any step can be scoped with `topics: [...]` |
| Mapping | Per topic: `nodes` with `label`, `key` and `props`; `edges` with `from`/`to` label and key; or `asEdge` to make a whole topic an edge. Upsert by `(label, key)` is the entity resolution |
| Graph store | SQLite-backed property graph with pattern queries, live schema and Cypher `MERGE` export for Neo4j, Memgraph or ArcadeDB (`/api/export.cypher`) |
| UI | SVG flow editor (add, drag, connect, delete, configure, auto-layout, validate, save, copy), per-step input and output schemas, live schema graph and tree, Cytoscape.js graph preview, all fed by SSE |

## API
`GET /api/flow`, `PUT /api/flow[?save=1]`, `POST /api/validate`, `POST /api/run {mode: "batch"|"continuous"}`, `POST /api/stop`, `POST /api/copy {name}`, `GET /api/state`, `GET /api/graph`, `POST /api/query {pattern}`, `GET /api/export.cypher`, `GET /api/events` (SSE). These go through the access rules: graph, query and export are filtered and masked for the current user, and flow changes need `admin`.

Guided view extras: `GET|POST|DELETE /api/studio/sinks`, `POST /api/studio/sinks/test`, `POST /api/studio/sinks/sync-now`, `GET /api/studio/access`, `POST|DELETE /api/studio/access/rule`, `POST|DELETE /api/studio/access/user`, `POST /api/studio/access/field`, `POST /api/studio/access/entity`, `POST /api/studio/access/opa`, `POST /api/studio/access/explain`, `POST /api/studio/access/matrix`, `GET /api/studio/access/audit`, `POST /api/studio/export.csv`. Admins can send `x-sg-as: <user>` to preview as someone else.

Models (admin only): `GET|POST /api/studio/models` (the registry; validated, literal keys refused), `POST /api/studio/models/test {name}` (run the capability probe), `POST /api/studio/model-prices` (the editable price table), `POST /api/studio/models/import-catalog {preset, region?}` (import a hosted aggregator's `/v1/models` into the registry and price table).

Agent flows (off until `agents.enabled` is true): `POST /api/agents/run`, `POST /api/agents/:id/resume`, `GET /api/agents/pending`, `GET|POST /api/agents/reviews`, `POST /api/agents/:id/cancel`, `GET /api/agents/:id`, `GET /api/agents/threads`, `GET /api/agents/traces`, `GET|POST /api/agents/schedules`, `POST /api/agents/schedules/:id`, `POST /api/agents/schedules/:id/run`, `DELETE /api/agents/schedules/:id`. See [docs/llm-agent.md](docs/llm-agent.md).

## Tests
`test/pipeline.test.js` covers the full source, transform, mapping, sink and query path; entity linking across a CSV and an HTTP API; idempotent upserts; Kafka (fake consumer with the kafkajs surface); CDC create, update and delete on SQLite and on embedded Postgres (PGlite); continuous mode; node-to-edge conversion; flow validation; and expression sandboxing.

`test/wrong-impl.test.js` reruns that suite with `STREAMGRAPH_MAPPER=broken`, a mapper that ignores keys and mints a new node per record, and passes only if the suite fails. A saved run is in `test/broken-mapper-run.txt`.

Guided view tests (`test/studio.test.js`): clean-up preset compilation, rule consistency between the scorer and the graph keys, match and relationship scoring, mapping suggestions, workspace compilation and linking, question compilation, and the wizard HTTP API (upload, test, preview, friendly errors, server-only secrets, database tables, linking, ask, search). `test/wrong-matcher.test.js` reruns them with `STREAMGRAPH_MATCHER=naive` (a matcher that ignores normalization) and passes only if they fail. Saved run: `test/naive-matcher-run.txt`. UI screenshots: `node test/ui-screenshots.mjs` against a fresh server on port 8090.

Reset tests (`test/reset.test.js`): localhost binding, GET and unconfirmed POST rejected, backup without secrets, reset empties everything, in-flight records after reset don't come back, the app works right after reset, and a stopped pipeline drops late records. `test/wrong-reset.test.js` reruns them with `STREAMGRAPH_RESET=broken` (clears the graph but leaves sources running) and passes only if they fail. Saved run: `test/broken-reset-run.txt`.

Sync-out tests (`test/syncout.test.js`): PostgreSQL (PGlite) snapshot, update, delete, checkpoint resume after a restart and resync with sweep after a wipe; a failing Kafka target going red and catching up; Kafka tombstones; a fake Neo4j/Memgraph driver (one transaction, MERGE, DETACH DELETE, sweep); denied types not sent and removed downstream after a rule change; and the HTTP API keeping passwords server-side.

Documents tests (`test/documents.test.js`, fixtures from `test/fixtures/make-documents.mjs`, invented content): PDF text, table and metadata; a PDF with no text gets the OCR note; Word sections, table, properties, ignored macros and an outside link never requested (a local server counts hits); .xlsx and .xls sheets with sheet row numbers; CSV; Document/Section/Table/Row nodes and mapped Customers with file, sheet/page and row; re-scan skips unchanged and touched-but-identical files and applies changes by hash, including a row whose ID changed; removed files leave nothing behind; zip bombs (honest, lying about size, inside a workbook), oversize files, the page limit, macro-enabled files, wrong types and DOCTYPE refused; a bad file shown as a Document with its problem while others load; access rules hiding document and provenance fields, pseudonymous keys, and sync-out to PGlite masking and removing a deleted file's rows; the wizard API (upload, preview sentences, save, Explore, search and CSV as the analyst); and reset. `test/wrong-documents.test.js` reruns them with `STREAMGRAPH_DOCS=broken` (drops provenance and ignores removed files) and passes only if they fail. Saved run: `test/broken-documents-run.txt` (5 of 12 fail). Screenshots: `node test/ui-screenshots.mjs http://localhost:8090 documents` writes `screenshots/ui-documents.png` (preview of files, tables and suggestions) and `ui-documents-mapping.png`.

Access tests (`test/abac.test.js`): default deny, clearance below classification with deny-overrides, unknown and unreviewed field masking, a low field passing at clearance 0, an empty snapshot failing closed, immediate policy changes and the cache TTL, the OPA adapter's input shape and failing closed (refused, HTTP 500, undefined, false, hung), the explain trace and audit file, masking in sync-out batches, and enforcement in the app (questions, filters on hidden fields, search, CSV and Cypher export, graph and query API, Test as, admin-only setup, lock-out protection, reset). `test/wrong-abac.test.js` reruns them with `STREAMGRAPH_ABAC=broken` (default-allow, unknown types allowed, unlisted fields not masked) and passes only if they fail. Saved run: `test/broken-abac-run.txt` (6 of 9 fail).

LLM harness tests (`test/llm.test.js`, plan acceptance tests A0.1–A0.4 and A1.1–A1.13): the license gate; fresh-install defaults with a fetch spy; the conformance suite C1–C13 for a deterministic fake model over MCP (inproc and a stdio child) and direct, with C12 parity; a weak model using prompt-based tools and a JSON fallback; keys never leaking (logs, events, checkpoints, files, raw bridge output); `auth_error` without the key; every provider class; mock OpenAI-compatible and Ollama servers; the HTTP bridge with a bearer token; a vendor MCP adapter; MCP sampling, supported and unsupported; soft budgets; the locality gate; the hard stops; the default model; actors; the admin-only Models API; and hosted aggregators (presets, the catalog importer, the probe deciding tools, `model_access_required`, gateway headers, and the remote gate) against a mock Inference.net. Live Ollama and paid-provider checks run only when `SG_TEST_OLLAMA=1` or a provider key and `SG_TEST_<PROVIDER>_MODEL` are set. `test/wrong-llm.test.js` reruns the suite with `SG_LLM_IMPL=wrong` (the bridge leaks keys, the probe claims everything, a remote model is seeded, and the unreachable default goes unreported) and passes only if it fails. The run is saved in `test-output/wrong-llm-run.txt`.

Agent flow tests (`test/agent-compiler.test.js`, `test/agent-validate.test.js`, `test/agent-rag.test.js`, `test/agent-routes.test.js`): compile from the flow's nodes and edges, retrieval before the model, a node id other than `model`, branch without retrieve, interrupt then resume on one checkpointer, stops not retried, and the HTTP routes (run, pending, resume, cancel, status) against an offline fake model. `test/wrong-agents.test.js` reruns the compiler and route suites with `STREAMGRAPH_AGENTS=broken` and passes only if they fail. The run is saved in `test-output/wrong-agents-run.txt`.

L6–L9 tests (`test/l69.test.js`, `test/agent-ui.test.js` when Chrome is installed): local traces omit the prompt, LangSmith stays off unless `agents.tracing.langsmith` is set and the caller has `export`, schedules run and pause, and the eval scorer fails a miss. `npm run test:eval` runs the committed fixtures on the fake model. `test/wrong-l69.test.js` reruns `test/l69.test.js` with `STREAMGRAPH_L69=broken` and passes only if it fails.

## Known gaps
- Kafka is tested against a fake consumer, not a live broker. The real path uses kafkajs and has not been run against Kafka or Confluent here.
- Postgres CDC is polling on `updated_at`, not logical replication. For WAL-based CDC, point Debezium at Postgres and read its topic with the Kafka source (the Debezium envelope is already handled).
- Only SQLite, Postgres and PGlite drivers. No Db2, SQL Server, MySQL or Oracle yet.
- The graph store is a single-process SQLite graph. Pattern queries are simple chains with equality filters, not full Cypher.
- No real login. Access rules work, but everyone at this computer acts as the Owner, so keep the server on localhost until OAuth is added.
- Neo4j, Memgraph and Kafka outputs are tested against fakes with the driver surface, and PostgreSQL against embedded PGlite. None has been run against a live server here.
- The Kafka output has no sweep: after a wipe or a rule change it re-sends everything and sends tombstones for denied items, but it can't delete keys that are gone from the graph while the app was down. Use a fresh topic after a reset.
- Sync-out sends in the app process every second; there is no separate worker or back-pressure beyond batches of 500.
- An empty field list hides every field even from clearance 3. PR #2 let clearance 3 through first; this is stricter on purpose.
- Relationship (edge) types get default attributes (level 0, no tags) when first seen; tag them on the Access rules screen if they are sensitive.
- Secrets are protected by file permissions only, not encrypted at rest.
- The live feed wizard checks the server and the feed name but previews from a pasted example, not live messages.
- One identifying field per source and type. If two sources share customers by email but orders use the customer ID, pick the ID as the match.
- Edits in Advanced are overwritten the next time the guided view saves.
- Documents: scanned PDFs (pictures of text) have no text layer and need OCR, which is not included. They load as a Document with a note. PDF tables are found only when their columns line up and every line has the same number of cells, so merged cells, wrapped cells, tables without gaps and tables across pages are missed or split. Word: nested tables are flattened into their cell, merged cells aren't expanded, and text in text boxes, headers, footers, footnotes and comments isn't read. Old `.doc` and `.ppt` files, `.xlsb`, ODF (`.odt`, `.ods`), images and e-mails aren't supported. Excel: one table per sheet, from the first non-empty row; formulas show their last saved value.
- Documents: unmapped table rows are tracked by position, so inserting a row near the top updates every row below it (rows turned into things are tracked by their identifying value). Provenance is per record: a thing combined from several files or sources shows the file and row it was last updated from.
- Documents: Connect your sources doesn't yet suggest matches or links for document tables. Tables mapped to the same type as another source still combine when the identifying values are equal under that type's matching rule. The wizard can't edit a saved documents source; remove it and add it again.
- Documents: a typed folder path is read with the permissions of the account running StreamGraph, so keep the server on localhost (no login yet).
- LLM harness (L1) and ETL steps (L2): the Agents screen is the models panel, and the advanced editor has a per-node model picker (L6). MCP sampling is tested against a test host, not Claude Desktop or Cursor. Paid providers are covered by construction tests and mocks only. `allowedRoles` is checked. `llm.invoke` is not a separate gate on ETL steps; those use the locality gate's read and export checks. Hosted aggregators: only Inference.net is covered (against a mock, plus a live smoke test when `INFERENCE_API_KEY` is set). The other aggregator presets are unverified base URLs, and the gateway `x-inference-provider*` header names are supplied by the admin, not checked against provider docs.
- Agent flows stay off until `agents.enabled` is true in `data/models.json` (a fresh install is false). The routes compile the flow's own nodes and edges, put retrieved text in front of the model, pause for approval, and resume from `data/agent-checkpoints.json`, so a paused approval is still there after a restart. Retrieval is the graph's text search plus the OpenSearch k-NN index of `embed` vectors when a sink is configured; if OpenSearch at `127.0.0.1:9200` is not running, only the graph search is used. The Linux min OpenSearch build has no k-NN plugin, so that install stores the vectors and ranks them in this process. Retrieved types go through the locality gate: a remote model needs `export` or nothing is sent. `POST /api/agents/reviews` promotes an unverified generated node or edge to `human-reviewed`, and only a recognised human (`human:whsutherland`, the studio owner, not a "Test as" preview) can do that. `agent.run` gates run, cancel, status, the thread list, traces and schedules. `agent.approve` gates resume, the pending list and review. If `AGENT_TOKEN` is set, every agent route requires the header `x-agent-token`. Local traces (`data/agent-traces.json`) keep metadata only. LangSmith sends only when `agents.tracing.langsmith` is true, `LANGSMITH_API_KEY` is in the environment, and the caller has `export`; `LANGSMITH_TRACING` on its own does not send. Schedules are an in-process interval of at least 30 seconds. `npm run test:eval` is the offline eval harness. Multi-agent crews are not built. See [docs/llm-agent.md](docs/llm-agent.md).
- `npm install` fetches xlsx from cdn.sheetjs.com, as pinned in package-lock.json. A machine that can reach only the npm registry needs a mirror or a vendored copy of that tarball.

## Next steps
1. OAuth 2.0 and Keycloak: put the API behind OIDC (for example `openid-client`, MIT) with Keycloak as the issuer, and map its roles and a clearance claim onto the access-rules users.
2. Further vector stores. L4 writes `embed` vectors to OpenSearch and L5 retrieves them together with the graph text search. A second index such as sqlite-vec is not built.
3. MySQL, SQL Server and Oracle drivers (mysql2 MIT, tedious MIT, oracledb Apache-2.0).
4. Live integration tests for the outputs with Redpanda, Neo4j, Memgraph and Postgres in CI, and a Kafka sweep via a key index.
5. Logical replication CDC with `pg-logical-replication` (MIT) or Debezium.
6. Print or export flow diagrams as SVG or PNG.

## Licenses
MIT. Every dependency is MIT, ISC, Apache-2.0, BSD or 0BSD (plus Unlicense for one transitive package). The LangChain and LangGraph packages are MIT. The LangGraph Agent Server (ELv2) is not used, and the license audit fails if it or a native addon shows up. See LICENSES.md and LICENSE-AUDIT.txt (`npm run audit:licenses`).
