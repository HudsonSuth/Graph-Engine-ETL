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
npm test            # 49 tests, including proof that a wrong mapper, matcher, reset and access engine fail
```

`npm run demo` = `node src/server.js demo/flow.json --demo --run`. Flags: `--port 8080`, `--graph graph.db` (persist the graph to a SQLite file instead of memory), `--run` (start the flow in live mode at boot), `--demo` (reset sample data and start the simulator).

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
| Sources | `file` (CSV, JSON, NDJSON tail), `http` (poll with c/u/d diff by key), `kafka` (kafkajs, JSON or Debezium envelope, tombstones as deletes), `sql` (one-shot table read), `cdc` (polling CDC on SQLite, Postgres or embedded PGlite; deletes by key-set diff or soft-delete flag) |
| Transforms | `map`, `rename` (fields or topic), `filter`, `cast` (String, Integer, Long, Short, Double, Float, Boolean, Date, Timestamp), `normalize`. Expressions are JSONata, the open stand-in for SpEL. No `eval`. Any step can be scoped with `topics: [...]` |
| Mapping | Per topic: `nodes` with `label`, `key` and `props`; `edges` with `from`/`to` label and key; or `asEdge` to make a whole topic an edge. Upsert by `(label, key)` is the entity resolution |
| Graph store | SQLite-backed property graph with pattern queries, live schema and Cypher `MERGE` export for Neo4j, Memgraph or ArcadeDB (`/api/export.cypher`) |
| UI | SVG flow editor (add, drag, connect, delete, configure, auto-layout, validate, save, copy), per-step input and output schemas, live schema graph and tree, Cytoscape.js graph preview, all fed by SSE |

## API
`GET /api/flow`, `PUT /api/flow[?save=1]`, `POST /api/validate`, `POST /api/run {mode: "batch"|"continuous"}`, `POST /api/stop`, `POST /api/copy {name}`, `GET /api/state`, `GET /api/graph`, `POST /api/query {pattern}`, `GET /api/export.cypher`, `GET /api/events` (SSE). These go through the access rules: graph, query and export are filtered and masked for the current user, and flow changes need `admin`.

Guided view extras: `GET|POST|DELETE /api/studio/sinks`, `POST /api/studio/sinks/test`, `POST /api/studio/sinks/sync-now`, `GET /api/studio/access`, `POST|DELETE /api/studio/access/rule`, `POST|DELETE /api/studio/access/user`, `POST /api/studio/access/field`, `POST /api/studio/access/entity`, `POST /api/studio/access/opa`, `POST /api/studio/access/explain`, `POST /api/studio/access/matrix`, `GET /api/studio/access/audit`, `POST /api/studio/export.csv`. Admins can send `x-sg-as: <user>` to preview as someone else.

## Tests
`test/pipeline.test.js` covers the full source, transform, mapping, sink and query path; entity linking across a CSV and an HTTP API; idempotent upserts; Kafka (fake consumer with the kafkajs surface); CDC create, update and delete on SQLite and on embedded Postgres (PGlite); continuous mode; node-to-edge conversion; flow validation; and expression sandboxing.

`test/wrong-impl.test.js` reruns that suite with `STREAMGRAPH_MAPPER=broken`, a mapper that ignores keys and mints a new node per record, and passes only if the suite fails. A saved run is in `test/broken-mapper-run.txt`.

Guided view tests (`test/studio.test.js`): clean-up preset compilation, rule consistency between the scorer and the graph keys, match and relationship scoring, mapping suggestions, workspace compilation and linking, question compilation, and the wizard HTTP API (upload, test, preview, friendly errors, server-only secrets, database tables, linking, ask, search). `test/wrong-matcher.test.js` reruns them with `STREAMGRAPH_MATCHER=naive` (a matcher that ignores normalization) and passes only if they fail. Saved run: `test/naive-matcher-run.txt`. UI screenshots: `node test/ui-screenshots.mjs` against a fresh server on port 8090.

Reset tests (`test/reset.test.js`): localhost binding, GET and unconfirmed POST rejected, backup without secrets, reset empties everything, in-flight records after reset don't come back, the app works right after reset, and a stopped pipeline drops late records. `test/wrong-reset.test.js` reruns them with `STREAMGRAPH_RESET=broken` (clears the graph but leaves sources running) and passes only if they fail. Saved run: `test/broken-reset-run.txt`.

Sync-out tests (`test/syncout.test.js`): PostgreSQL (PGlite) snapshot, update, delete, checkpoint resume after a restart and resync with sweep after a wipe; a failing Kafka target going red and catching up; Kafka tombstones; a fake Neo4j/Memgraph driver (one transaction, MERGE, DETACH DELETE, sweep); denied types not sent and removed downstream after a rule change; and the HTTP API keeping passwords server-side.

Access tests (`test/abac.test.js`): default deny, clearance below classification with deny-overrides, unknown and unreviewed field masking, a low field passing at clearance 0, an empty snapshot failing closed, immediate policy changes and the cache TTL, the OPA adapter's input shape and failing closed (refused, HTTP 500, undefined, false, hung), the explain trace and audit file, masking in sync-out batches, and enforcement in the app (questions, filters on hidden fields, search, CSV and Cypher export, graph and query API, Test as, admin-only setup, lock-out protection, reset). `test/wrong-abac.test.js` reruns them with `STREAMGRAPH_ABAC=broken` (default-allow, unknown types allowed, unlisted fields not masked) and passes only if they fail. Saved run: `test/broken-abac-run.txt` (6 of 9 fail).

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

## Next steps
1. OAuth 2.0 and Keycloak: put the API behind OIDC (for example `openid-client`, MIT) with Keycloak as the issuer, and map its roles and a clearance claim onto the access-rules users.
2. RAG layer: embed node text into a vector index (for example sqlite-vec, MIT/Apache-2.0) and add a graph-plus-vector retrieval endpoint.
3. MySQL, SQL Server and Oracle drivers (mysql2 MIT, tedious MIT, oracledb Apache-2.0).
4. Live integration tests for the outputs with Redpanda, Neo4j, Memgraph and Postgres in CI, and a Kafka sweep via a key index.
5. Logical replication CDC with `pg-logical-replication` (MIT) or Debezium.
6. Print or export flow diagrams as SVG or PNG.

## Licenses
MIT. Every dependency is MIT, ISC, Apache-2.0, BSD-3-Clause or 0BSD. See LICENSES.md.
