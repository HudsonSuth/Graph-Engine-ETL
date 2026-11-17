# StreamGraph Explore — exploration layer + two-way MCP

A WebGL graph exploration UI, an in-memory graph service and an MCP server/client, built from `docs/SPEC.md`
(behaviour-only spec, clean room: no vendor code) and served **alongside** Billy's StreamGraph on the same port.
StreamGraph itself is unchanged (`src/`, `public/`, `test/`); everything new is under `explore/`.

```
StreamGraph (GraphStore change log) ──adapter──▶ §6 streaming contract ──▶ GraphService (merge / dedupe / permissions)
external producers ── POST /api/explore/ingest ──▶        │                        │  sessions + coalesced deltas (SSE)
MCP sources (client) ── tool call ─▶ mapping ─────▶        │                        ├──▶ Explore UI  /explore (Sigma + graphology, layout worker)
Neo4j / Postgres / HTTP connectors (search / expand) ──────┘                        └──▶ MCP server  /mcp (HTTP) · explore/mcp-stdio.js (stdio)
```

## Run on Windows (Node 24)

PowerShell or cmd, Node 24.x (Node 22.5+ works; StreamGraph needs the built-in `node:sqlite`):

```powershell
cd combined-build\app
npm install
npm run build:explore          # bundles explore\client -> explore\public (already built in the zip; rerun after edits)
npm run demo:combined          # StreamGraph demo pipeline + Explore + MCP on http://localhost:8080
```

* StreamGraph UI: http://localhost:8080 — unchanged.
* Explore UI: http://localhost:8080/explore — live view of the StreamGraph demo graph.
* MCP (Streamable HTTP): http://127.0.0.1:8080/mcp.
* Large synthetic graph: `npm run demo:large` (adds 10,000 nodes / 20,000 links through the streaming contract).
* Flags (same as StreamGraph plus one): `node explore\combined.js demo\flow.json --demo --run --port 8080 --graph graph.db --data data --synthetic 10000`.
* Config: copy `explore\explore.config.example.json` to `explore\explore.config.json` (or set `EXPLORE_CONFIG`). Credentials go in
  environment variables only (`$env:NEO4J_PASSWORD = '...'`, `$env:PG_URL = 'postgres://...'`); the config holds the variable names.

Tests and proofs:

```powershell
npm test                 # StreamGraph's own suite (62)
npm run test:explore     # Explore + MCP + UI + Kafka + Flink + saved views + symbols (119; UI tests skip without Chrome (set CHROME_PATH), broker tests skip without a broker, Flink tests skip without npm run flink:setup)
npm run test:kafka       # Kafka suite only (K0-K9) against KAFKA_BROKERS (default localhost:9092)
npm run test:flink       # Flink processor suite only (F0-F9): real broker + real Apache Flink
npm run proof:flink      # proof\flink-test-run.txt (must pass) + proof\flink-wrong-impl-run.txt (FLINK_IMPL=wrong, must fail)
npm run bench:flink      # proof numbers: backlog throughput, changes->metrics latency p50/p95/p99, kill -9 recovery
npm run proof:kafka      # proof\kafka-test-run.txt (must pass) + proof\kafka-wrong-impl-run.txt (KAFKA_IMPL=wrong, must fail)
npm run bench:kafka      # proof\kafka-bench.txt (10k/20k + 200-event deltas through the broker)
npm run test:all         # both
npm run proof:wrong      # writes proof\explore-wrong-impl-run.txt and proof\mcp-wrong-mapping-run.txt (both must show failures)
npm run bench:explore    # proof\bench.txt   (10k/20k ingest, 200-event delta apply, layouts)
npm run shots:explore    # proof\render-bench.txt, proof\explore.png, explore-light.png, explore-10k.png (needs Chrome or Edge: set CHROME_PATH)
```

## Kafka mode (optional, event-driven)

The default is `mode: "inprocess"`, which needs nothing extra. `mode: "kafka"` makes StreamGraph publish its changes to Kafka and makes each Explore instance a consumer group that builds its read model from the log. Agents get a resumable change cursor and, if writes are enabled, a command topic. The design and its mapping to Confluent's event-driven agent guide are in `docs/SPEC.md` §17.

```
StreamGraph adapter / producers / ingest API ─▶ KafkaPublisher (idempotent + transactional, JSON Schema v1)
        ├─▶ graph.changes (key: node id | link fromId) ─▶ view group per instance ─▶ read model ─▶ UI / MCP changes_since
        ├─▶ graph.state   (compacted, bootstrap)                    └─ checkpoint file + committed offsets (replay on restart)
        └─▶ graph.dlq     (invalid events, with reason)
MCP write tools ─▶ graph.commands ─▶ command workers (shared group, exactly-once txn) ─▶ graph.changes + graph.command-results
```

### 1. A local broker on Windows (no Docker)

**Option A: Apache Kafka 4.x in KRaft mode** (this is what the tests and benchmark were run against: Kafka 4.1.2 with Temurin JDK 21).

1. Install a JDK 17+ (for example `winget install EclipseAdoptium.Temurin.21.JDK`).
2. Download `kafka_2.13-4.1.2.tgz` from https://kafka.apache.org/downloads and extract it to `C:\kafka` (a short path avoids Windows path-length errors).
3. Edit `C:\kafka\config\server.properties`:
   * set `log.dirs=C:/kafka/data`;
   * add `auto.create.topics.enable=false`;
   * add `group.initial.rebalance.delay.ms=0`.
4. Format the storage and start the broker:

   ```powershell
   cd C:\kafka
   $id = (.\bin\windows\kafka-storage.bat random-uuid)
   .\bin\windows\kafka-storage.bat format --standalone -t $id -c config\server.properties
   .\bin\windows\kafka-server-start.bat config\server.properties     # leave running; listens on localhost:9092
   ```

Kafka on Windows is community-supported. If the broker misbehaves (log-cleaner file locks are the usual problem), use WSL2 (`bin/kafka-server-start.sh`), or use option B.

**Option B: Redpanda.** It is a single binary, but there is no native Windows build: run `rpk container` under WSL2, or install the Linux binary inside WSL2, then point `KAFKA_BROKERS` at `localhost:9092`. The app only uses the Kafka protocol (transactions included), which Redpanda supports.

### 2. Run Explore in kafka mode

```powershell
$env:KAFKA_BROKERS = 'localhost:9092'
npm run demo:kafka                     # = node explore\combined.js demo\flow.json --demo --run --kafka  (topics are created on first start)
# a second read replica of the same graph, on another port with its own consumer group:
$env:EXPLORE_INSTANCE_ID = 'replica-2'; node explore\combined.js --kafka --port 8081
```

`/api/explore/stats` shows `mode`, publisher counters, the consumer's group, assignment, position, checkpoints, DLQ count and produce→applied latency.

Config (`explore\explore.config.json`; full list in `explore.config.example.json` and SPEC §17.5):

```json
{ "mode": "kafka",
  "kafka": { "brokers": "localhost:9092", "partitions": 6, "publish": true, "consume": true, "runWorker": true } }
```

**Confluent Cloud.** Use the SASL_SSL bootstrap server and an API key. Secrets go in environment variables only; the config names the variables:

```json
"kafka": { "brokers": "pkc-xxxxx.region.provider.confluent.cloud:9092", "replicationFactor": 3, "ssl": true,
           "sasl": { "mechanism": "plain", "usernameEnv": "KAFKA_API_KEY", "passwordEnv": "KAFKA_API_SECRET" } }
```

```powershell
$env:KAFKA_API_KEY = '...'; $env:KAFKA_API_SECRET = '...'
```

If the API key is not allowed to create topics, create the five topics yourself first, and set `"createTopics": false`. The topics are `graph.changes`, `graph.state` (cleanup.policy=compact), `graph.commands`, `graph.command-results` and `graph.dlq`.

### 3. Group ids, instances and agents

* **Read models.** Every Explore instance has its **own** group, `explore-view-<instanceId>`. `instanceId` defaults to `<hostname>-<port>`. Two instances must not share an id; if they do, each only sees some partitions and reports `partial-assignment`.
* **Command workers.** They share **one** group (`explore-command-workers`), so commands are spread over workers and re-balanced when one dies.
* **Restart.** The instance restores `data\explore-kafka\<group>.checkpoint.json` and continues from its offsets. Delete that file to rebuild the read model from the compacted `graph.state` topic.
* **Agents.**
  * Call `changes_since` (keep the returned `cursor`, and use `waitMs` to long-poll), or subscribe to the `explore://changes` resource.
  * With `"mcp": { "allowWrites": true }`, the write tools emit commands and return `commandId` + `status`. `command_status` polls.
  * Writes stay **off** by default.

## Stream processor (Apache Flink, optional)

This is an optional Apache Flink 2.2.1 job. It reads `graph.changes` and writes three derived topics: `graph.enriched`, `graph.metrics` (per-node degree and change counts, plus tumbling and sliding windows) and `graph.alerts` (`degree.spike`). It is exactly-once by default, and it restores from its checkpoint after a crash. Design, contracts and test list: `docs/SPEC.md` §18. It is off unless you turn it on, and it needs Kafka mode.

```powershell
npm run flink:setup      # once: Flink 2.2.1 + Kafka connector + JSON Schema validator into explore\flink\.runtime (checksums verified);
                         #       downloads Temurin JDK 21 there too if no Java 17+ is on PATH / JAVA_HOME (~600 MB total)
npm run flink:build      # only if explore\flink\build\graph-processor.jar is missing or you edited the Java source (needs a JDK)
npm run demo:flink       # = demo:kafka + the processor (EXPLORE_PROCESSOR=1 or "processor": {"enabled": true} does the same)
```

* **What you see in Explore.** Open http://localhost:8080/explore and find the "Stream metrics" panel in the left bar.
  * Node size follows stream degree.
  * ⚠ with an amber or red ring marks a node that gained 5 or more links inside one window.
  * Both can be toggled.
* **AI clients over MCP** get two read tools: `node_metrics` (top nodes or given ids) and `stream_alerts`.
* **Config.** The `processor` block in `explore.config.json` covers window sizes, the spike threshold, `delivery` (`exactly-once` or `at-least-once`), the checkpoint interval and parallelism. See `explore.config.example.json`.
* **Running the job elsewhere.** Set `"launch": false`, then submit the same jar to a Flink cluster:
  `flink run -c streamgraph.flink.GraphStreamProcessor explore\flink\build\graph-processor.jar --config processor.json`.
  This path is not tested.
* **Logs and checkpoints** are in the app data dir: `processor-<id>.log` and `flink-checkpoints\<id>\`.

## Saved views and presenter mode (SPEC §19)

* **Views panel** (left): Load, Save as…, Update, Rename, Delete, Link (copies `/explore?view=<id>`), Export / Import… (JSON bundle), "Save node positions".
  A view stores the layout type and settings, the filters, the style, the camera, the selection and pins, the time and live state, and the Flink overlay toggles.
  Filters cover type and link-type toggles, property conditions, neighbourhood focus and hiding isolated nodes. The style is stored as a URL or inline.
  Views are kept on the server in `<data dir>/explore-views.json`, next to StreamGraph's data.
* **Share a view**: `http://localhost:8080/explore?view=<id>`.
* **Presenter mode**: the **Present** button or `?present=1&deck=<presentation id>`.
  * It hides every editing panel and tool, enlarges labels, and shows the slide title, caption and legend.
  * Use ← → (or PageUp/PageDown/Space, Home/End) to step through the presentation's views, and Esc to exit.
* **MCP**:
  * `list_views` and `get_view` are read tools. View node references are filtered by the same access rules as every other read.
  * `save_view` and `delete_view` exist only with `mcp.allowWrites: true`.
* **Will It Run? demo**: `npm run demo:willitrun` seeds 4 views (Overview, RTX 5060: what fits, Apple Silicon Macs, MoE models) and a `willitrun-tour` presentation.
  Open `http://localhost:8080/explore?present=1&deck=willitrun-tour` for the tour.
* Tests: `npm run test:views` (V1-V7, S1-S7, P1-P6). Screenshots and the 10k symbol perf check: `npm run shots:views`.

## Node symbols and icon sets (SPEC §20)

Add a `symbols` block to a style config to draw each node as a composed symbol, inspired by MIL-STD-2525:
* frame shape = category (circle, square, diamond, quatrefoil, hexagon, octagon, triangle, rectangle, shield, or a custom SVG path)
* fill = status
* centre glyph from an icon set
* corner badges: alert, count, lock, text, icon
* a dashed frame for planned, estimated or uncertain items
* id and quantity text fields that appear as you zoom in

Bundled icon sets:
* `lucide` (ISC)
* `majesticons:line` and `majesticons:solid` (MIT)

Choose one with `"iconSet": "majesticons:line"`, or per glyph with `"glyph": "lucide/gpu"`.

Your own icons: put SVGs in `explore\icons-custom\<set>\` or `<data dir>\icons\<set>\`, then declare the set in the style. A set without a licence is refused:
```json
"symbols": { "iconSet": "majesticons:line", "iconSets": { "mine": { "license": "CC0-1.0", "attribution": "", "source": "https://..." } } }
```
Real MIL-STD-2525 / APP-6 symbols: set `"milsymbol": { "property": "sidc" }` and give nodes a `sidc` property (uses the MIT `milsymbol` package, loaded lazily).
Example: `explore/demos/willitrun/style-symbols.json` (served as `/explore/willitrun-symbols.json` by the demo).

## Entity resolution (optional, SPEC §21)

Records (`Person`, `Organization` nodes from any source) are resolved into `Entity` nodes with `RESOLVES_TO` links,
`POSSIBLY_SAME` links (with a score) and a per-feature "why" for every decision. Merges and splits happen incrementally
as records change; entity ids stay stable. Default engine: **Splink 5.0.0** (MIT, Python + DuckDB sidecar); alternative:
**Duke 1.2** (Apache-2.0, JVM sidecar). Both sit behind the same JSON-lines sidecar interface (`explore/er/sidecar.js`).
Why Splink and not Duke/dedupe/recordlinkage/JedAI/Zingg: comparison table with sources in SPEC §21.2.

Measured 2026-11-13 on synthetic data (CONFIRMED, `proof/`): held-out accuracy (seed 11) Splink Person P 0.969 / R 0.902 / F1 0.934, Org F1 0.927;
Duke Person P 0.892 / R 0.950 / F1 0.920 — **Duke falls short of the 0.90 precision bar** (its E1 test fails; Splink passes all 11 tests).
Speed at 10,992 records: Splink 3,783 records/s bulk, single-record p95 142 ms; Duke 486 records/s, p95 38 ms; Kafka mode 1,280 records/s, p95 179 ms (SPEC §21.10).

```
npm run er:setup                 # once: Python venv (splink, duckdb) + Duke/Lucene/Jackson jars (SHA-1 checked); needs Python 3.10+, Java 17+ for Duke
npm run er:build                 # (re)compile the Duke sidecar jar (already in the zip)
npm run demo:er                  # synthetic demo (3,252 records, crm/billing/support), open the printed /explore URL
node explore/demos/er/run.js --stream   # same, records arrive over ~20 s so you can watch entities merge
ER_ENGINE=duke npm run demo:er   # Duke instead of Splink
npm run test:er                  # in-process suite (E1-E9); ER_ENGINE=duke for Duke; ER_IMPL=wrong must fail
npm run test:er:kafka            # Kafka-mode suite against a real broker (KAFKA_BROKERS, default localhost:9092)
npm run proof:er                 # writes proof/er-test-run.txt, er-test-run-duke.txt, er-wrong-impl-run.txt
npm run bench:er                 # proof/er-bench.txt
npm run shots:er                 # proof/er-records.png, er-entities.png, er-why.png
npm run er:train                 # retrain the Splink models from the synthetic set (explore/er/models/)
```

Windows (PowerShell): the same `npm run` commands; `npm run er:setup` creates `explore\er\.venv` with `python` (set `STREAMGRAPH_PYTHON_BOOTSTRAP` to another interpreter, e.g. the full path of a Python 3.12).
Java is found via `er.java`, `STREAMGRAPH_JAVA`, `JAVA_HOME`, `explore/er/.runtime/jdk` or the Flink runtime (`STREAMGRAPH_FLINK_RUNTIME`).
Not tested on Windows yet.

Turn it on for your own data in `explore.config.json`:

```json
"er": { "enabled": true, "engine": "splink",
        "types": { "Person": { "threshold": 0.99, "maybeThreshold": 0.6 } } }
```

Record properties used: `name`, `email`, `phone`, `address`, `dob` (persons), `name`, `domain`, `phone`, `address` (organisations),
plus `dataSource`/`recordId`. Per-property comparators/cleaners/thresholds: SPEC §21.4. Kafka mode: one instance runs the
ER worker (`er.kafka.runWorker`, default true); set it to `false` on viewers.

Viewer: **Both / Records / Entities** buttons and **Possible matches** checkbox in the left panel (or `?er=entities`), entity
symbol with a record-count badge, why-panel under Details (select an entity or record; shift-click two records for a pair).
MCP read tools: `resolve_entity`, `why_matched`, `list_possible_matches` (same access rules as every other read: an entity that
contains a record you may not read is invisible). HTTP: `/api/explore/er/{stats,entity?id=,why?a=&b=,possible}`.

## Map viewer and geo grids (SPEC §22)

Nodes with `lat`/`lon` (or `latitude`/`longitude`, or a GeoJSON `geometry`) are drawn on a map. **Graph / Map / Split** buttons
(top right, or `?mode=map|split`); selection, highlight, type hiding and the time slider are shared by both panes. Links between
positioned nodes are great-circle arcs. Grids: **H3** (resolution 0–10) or **MGRS** (100 km … 10 m) coloured by count; click a cell
to select its nodes. Symbols (Lucide / MIL-STD-2525 via milsymbol / your own SVGs, SPEC §20) are the same images as in the graph.
Saved views and presenter slides store mode, camera, grid and basemap.

Basemap: OpenFreeMap (free, no key, attribution shown) by default, automatic fallback to the bundled Natural Earth offline map.
Your own tiles: `"geo": { "styleUrl": "https://…/style.json" }` or `"geo": { "tileUrl": "https://…/{z}/{x}/{y}.png", "attribution": "…" }`
in `explore.config.json`. Fully offline: `"geo": { "basemap": "offline" }` or `EXPLORE_BASEMAP=offline`.
Do not point `tileUrl` at tile.openstreetmap.org for anything beyond light use (OSMF tile usage policy).

```
npm run demo:geo                 # USGS earthquakes (Oct 2026) + Natural Earth places; open the printed URL, try ?view=geo-h3
node explore/demos/geo/run.js --all --offline   # all 10,000 quakes, no network basemap
npm run demo:geo:flink           # Kafka + Flink: per-H3-cell daily counts on graph.geo-metrics -> "Stream heat" checkbox
npm run test:geo                 # geo + browser map suites (G1-G11, U1-U7); GEO_IMPL=wrong must fail
npm run test:geo:flink           # Flink geo suite (FG0-FG2; needs Kafka at KAFKA_BROKERS, default localhost:9092, and npm run flink:setup)
npm run proof:geo                # proof/geo-test-run.txt + wrong-implementation runs
npm run bench:geo                # proof/map-10k-perf.txt (10k points)
npm run shots:geo                # proof/map-*.png
npm run fixtures:geo             # re-download the USGS / Natural Earth fixture
npm run import:incidents -- export.csv --map mapping.json --post http://127.0.0.1:8080   # load an incident export you are licensed to use
```

Flink heat: `"processor": { "geo": { "enabled": true, "resolution": 3, "windowMs": 60000, "windows": 10 } }` (or `FLINK_GEO=1`).
MCP read tools: `nodes_in_bbox` (bbox `[west,south,east,north]`, antimeridian allowed) and `grid_counts` (`kind`, `resolution`,
`bbox`, `includeStream`), same access rules as every other read; HTTP `/api/explore/geo/{config,bbox,grid}`.
Test data: D-Fend's incident tracker terms forbid copying/scraping, so it is not used; `import-incidents.mjs` loads an export you obtain from them under licence.

## Core exploration loop (Phase 1, SPEC §23)

The loop is **query → expand → analyse → select → query again**. It runs against a server-side neighbourhood API, so the browser never needs the whole graph.

* **Focus scope for big graphs.**
  * Above 50,000 nodes (`EXPLORE_FULL_SNAPSHOT_MAX`), or with `?scope=focus`, no snapshot is loaded. You search (Shift+Enter) or expand instead.
  * `/explore?scope=focus&seeds=a,b&hops=2&max=2000` opens on a neighbourhood.
  * The footer badge shows "focus: N of M nodes loaded".
* **Streamed expand.**
  * `POST /api/explore/session/:sid/neighborhood` returns NDJSON chunks in hop order. You can filter by link types, direction, node types and property conditions, and cap the node count.
  * Chunks are drawn as they arrive.
  * Right-click a node to expand or collapse **per relationship type**. The menu shows counts, e.g. "Expand KNOWS 3→".
  * New links touching what you see appear live, in both in-process and Kafka mode.
* **Paths.** The Paths panel or **G** with two nodes selected shows the shortest path and all simple paths up to N hops (≤ 8). Click a row to highlight that path. **Isolate** hides everything else.
* **Analyze.**
  * Algorithms: degree, PageRank, betweenness (sampled above 2,000 nodes), Louvain, Leiden, connected components, hop distance, Jaccard.
  * Scope: the whole graph, the current filter (server side), the visible nodes or the selection.
  * Map the result with one click to **Size**, **Colour** (with a legend; click a group to select it) or **Edge width**.
  * Filter- and visible-scoped mappings re-run automatically when the filter changes.
  * Saved views remember the mappings.
* **Select.**
  * **L** draws a lasso and **B** draws a box. Shift adds to the selection and Alt removes from it.
  * The bulk bar offers expand, +2 hops, +neighbours, hide, pin, set as filter, analyze selection, save as view, paths, and a **query** box (hops, direction, link types) that streams a new neighbourhood from the selection.
* **Context menus** on nodes, links and the empty canvas.
* **MCP:** `neighborhood`, `find_paths`, `list_algorithms`, `run_algorithm` (summary + top-k + `runId`), `get_algorithm_result`.

Keyboard shortcuts (also listed in the app with **?**):

| Key | Action | Key | Action |
|---|---|---|---|
| E / Shift+E | expand 1 / 2 hops (streamed) | C | collapse |
| H, Delete | hide selection | Shift+H | show hidden |
| I | isolate selection (set as filter) | X | clear isolate / path filter |
| P | pin / unpin | N | add neighbours to selection |
| F | fit | G | paths between the 2 selected |
| L / B | lasso / box select | A | run the chosen algorithm |
| Ctrl+A | select all visible | Ctrl+Z | undo |
| / | search | Esc | close menu or tool, then clear selection |

Tests and proofs:

* `npm run test:core`: N1–N12 API + MCP, B1–B12 algorithms, C1–C10 Chrome.
* `npm run test:core:kafka`: NK1–NK2, needs a broker.
* `npm run proof:phase1`: runs the correct and deliberately broken builds and writes `proof/phase1-*-run.txt`.
* `npm run bench:phase1`: writes `proof/phase1-perf.txt`.
* Screenshots are saved as `proof/phase1-*.png`.

## Scale and readability (Phase 2, SPEC §24)

* **Semantic zoom.** `#cl-mode` (or `?clusters=on|off|auto`): zoomed out, each community (Louvain, Leiden, components, type, a property, or an earlier algorithm run) is one bubble sized by count, with meta-edges sized by link count. Zoom in and nodes return inside labelled hulls. Click a bubble to expand it, click its label to collapse. In focus scope the overview comes from the server with nothing loaded; clicking a bubble loads its members.
* **Edge bundling.** `#bundle-on` bundles visible links (or meta-edges at the overview) in a Web Worker (FDEB, written from the paper).
* **Map clustering.** `#map-cluster` / `?mapcluster=1`: points cluster by zoom; clusters holding a selected node get a ring; click zooms in, Shift-click selects the cluster's nodes.
* **Layouts.** Force, hierarchy, radial, circular, grid, structural, timeline (`#layout-time`), geo (lat/lon), community group-in-a-box (`#layout-group`). Seeded (`#layout-seed`), animated switching, remembered by saved views.
* **Cost and progress.** Footer badge "loaded / total", a progress bar for streams, layouts and bundling, a live estimate in the Analyze panel, and a confirm dialog before heavy work.
* **API / MCP:** `POST /api/explore/clusters`, `/api/explore/clusters/members`, `/api/explore/cost`; MCP `cluster_overview`, `estimate_cost`, `set_layout`.

Tests and proofs:

* `npm run test:scale`: P1–P12 API/MCP/algorithms, Q1–Q8 Chrome.
* `npm run proof:phase2`: correct and deliberately broken builds (`SCALE_IMPL=wrong`, `SCALE_UI_IMPL=wrong`) → `proof/phase2-*-run.txt`.
* `npm run bench:phase2`: `proof/phase2-perf.txt`. Screenshots: `proof/phase2-*.png`.

## UI (v1 priorities: performance, layout, style)

* **Rendering**: Sigma v4 WebGL (circle / square / diamond / triangle node shapes, border ring, arrows, dashed links, curved parallel links), labels by zoom and density, dense views shrink nodes automatically.
* **Live deltas**: SSE deltas coalesced per frame and applied in place (no rebuild); gap → resync. Status bar shows fps, last delta apply time and per-source lag.
* **Layouts** (`Layout` menu): force (ForceAtlas2 in a Web Worker, intermediate frames streamed, multilevel seeding over 3k nodes), hierarchy (direction, roots from selection), radial, circular, grid, structural. **Incremental** mode keeps existing nodes still and places newcomers next to their neighbours. Spacing slider, animated transitions (skipped when fps drops), pin by drag or button (persisted), relayout, undo.
* **Style**: versioned JSON (`explore/public/style-config.v1.json`, editable in-app via *Edit style…*, download, reset). Data-driven rules (type, property tests, and/or/not), linear/log size scales, colour per theme, badges, link width/dash/arrows. Invalid rules fail soft with warnings. Legend generated from the config; click a type to hide/show it.
* **Exploration**: hover/select with neighbour highlight (others dimmed), details panel, search in view (Enter) or in the graph (Shift+Enter / *Graph*), expand (double-click, with limit and *More…*), collapse, shortest path, time window slider, dark/light theme. Keys: `/` search, `Esc` clear, `Ctrl+A`, `Ctrl+Z`.

## MCP

### Server (inbound): let AI clients explore the graph
Transports: **stdio** (`node explore/mcp-stdio.js …` starts the whole app in-process and speaks MCP on stdin/stdout; logs go to stderr; the UI is also up on `--port`, default 8090) and **Streamable HTTP** at `/mcp` on the combined server (stateless, JSON responses, POST only; the Host header must be 127.0.0.1/localhost or listed in `mcp.allowedHosts` (DNS-rebinding guard); optional bearer token via `mcp.httpTokenEnv`). StreamGraph binds to 127.0.0.1 by default (`HOST` env to change).

| Tool | What it does |
|---|---|
| `graph_stats` | node/link types with counts and property names, sources, stream lag |
| `search_nodes` | text search over id/label/properties, optional type filter |
| `get_node` | a node plus neighbours to `depth` 1–3, per-hop `limit`, direction, type filter |
| `shortest_path` | unweighted shortest path (directed or not, max length) |
| `filter_subgraph` | nodes by type and a property test (`eq, neq, gt, gte, lt, lte, contains, exists`) plus links among them |
| `run_view` | run a saved view (`views` in the config, plus `everything`) or an ad-hoc filter; returns server-side layout positions (any layout kind) |
| `recent_deltas` | recently applied stream events (`since` cursor, source filter) |
| *writes (off by default)* `upsert_node`, `upsert_link`, `remove_item`, `push_stream_batch` | only registered when `mcp.allowWrites: true`; go through the streaming contract as source `mcp`; `remove_item` only removes items owned by `mcp`; `push_stream_batch` only for configured `streams` |

Resources: `explore://schema`, `explore://style-config`, `explore://views`.

Permissions: every result is filtered by the source access policy for the MCP principal (`mcp.principal`, fail closed for unknown sources)
**and** by StreamGraph's own access rules (type-level read decisions + property masking) evaluated as StreamGraph user `mcp.actAs`
(default `owner`; an unknown user sees no StreamGraph items). Results are capped at `mcp.maxResults` (default 500) and flagged `truncated`.

#### Client configuration examples
Use absolute paths. On Windows escape backslashes in JSON (`C:\\work\\combined-build\\app\\explore\\mcp-stdio.js`).

Claude Desktop (`%APPDATA%\Claude\claude_desktop_config.json`), stdio:
```json
{
  "mcpServers": {
    "streamgraph-explore": {
      "command": "node",
      "args": ["C:\\work\\combined-build\\app\\explore\\mcp-stdio.js", "C:\\work\\combined-build\\app\\demo\\flow.json", "--demo", "--run", "--port", "8090"]
    }
  }
}
```

Cursor (`.cursor/mcp.json` in a project, or `~/.cursor/mcp.json`), either transport:
```json
{
  "mcpServers": {
    "streamgraph-explore": { "url": "http://127.0.0.1:8080/mcp" },
    "streamgraph-explore-stdio": {
      "command": "node",
      "args": ["C:\\work\\combined-build\\app\\explore\\mcp-stdio.js", "--port", "8090"],
      "env": { "EXPLORE_CONFIG": "C:\\work\\combined-build\\app\\explore\\explore.config.json" }
    }
  }
}
```

Grok Bot, or any client that takes a remote MCP URL (Streamable HTTP). The server must be reachable from where the client runs: for a
cloud-hosted client, expose it through a tunnel (e.g. `cloudflared tunnel --url http://127.0.0.1:8080`), add the tunnel host to
`mcp.allowedHosts`, and **require a token** by setting `mcp.httpTokenEnv` (e.g. `"EXPLORE_MCP_TOKEN"`) and that environment variable:
```json
{
  "mcpServers": {
    "streamgraph-explore": {
      "url": "https://<your-tunnel-host>/mcp",
      "headers": { "Authorization": "Bearer <value of EXPLORE_MCP_TOKEN>" }
    }
  }
}
```
> **Warning:** a tunnel exposes the whole port, not just `/mcp`: StreamGraph's UI/API and the Explore UI have no login. Only the `/mcp` endpoint is token-protected. Prefer the stdio transport for desktop clients, and keep tunnels short-lived.

(If the client's connector form asks for fields rather than JSON: name `streamgraph-explore`, transport Streamable HTTP, the URL above, and the Authorization header.)

Any other MCP client that runs a command (stdio):
```json
{ "command": "node", "args": ["/path/to/app/explore/mcp-stdio.js", "--port", "0"], "env": { "EXPLORE_CONFIG": "/path/to/explore.config.json" } }
```

Enable writes (only if you trust the client) in `explore.config.json`: `"mcp": { "allowWrites": true }`.

### Client (outbound): MCP servers as graph sources
A connector of `"kind": "mcp"` connects to an external MCP server (`command` + `args` for stdio, or `url` for Streamable HTTP with
`headersEnv` for auth), lists its tools (fails clearly if the configured `tool` is missing), calls the tool at start, every `intervalMs`,
and on demand (graph search calls it, passing the search text as `searchArgument` if set). The JSON result (structuredContent, else
the first JSON text block) is mapped to canonical items with a mapping config and pushed **through the same streaming contract**, so
merge, dedupe, idempotency, provenance, permissions and live deltas are identical to every other source.

```json
{ "kind": "mcp", "sourceId": "directory", "command": "node", "args": ["directory-server.mjs"], "tool": "list_directory", "intervalMs": 60000,
  "mapping": {
    "nodes": [{ "from": "/people/*", "id": "id", "type": "Person", "label": "name", "properties": ["team", "email"] }],
    "links": [{ "from": "/relations/*", "source": "src", "target": "dst", "type": { "field": "rel" }, "properties": ["since"] }],
    "removeMissing": false } }
```

Mapping rules: `from` is a JSON pointer with `*` to iterate arrays/objects; `id`, `label`, `source`, `target` are field paths (dot paths allowed);
`type` is a constant or `{ "field": "...", "default": "..." }`; `properties` is a list or `"*"` (all other fields). Ids become
`<sourceId>:node:<id>` / `<sourceId>:link:<id or source-[type]->target>`; use `sourceIdPrefix` / `targetIdPrefix` to point links at
nodes from another source (e.g. `"sg:node:"` for StreamGraph). `removeMissing: true` wraps each pull in a replace-source snapshot,
so items that disappear from the tool result are tombstoned. Links with a missing end are skipped with a `null_endpoint` warning.

## Files
| Path | What |
|---|---|
| `explore/combined.js` | combined server: StreamGraph + Explore + `/mcp` on one port |
| `explore/mcp-stdio.js` | MCP over stdio (for desktop AI clients) |
| `explore/server/service.js` | in-memory graph service (§5, §7) |
| `explore/server/ingest.js`, `producer.js` | streaming contract consumer / producer (§6) |
| `explore/server/streamgraph-adapter.js` | StreamGraph → contract adapter (see `ADAPTER.md`) |
| `explore/server/connectors/` | `neo4j.js`, `postgres.js`, `http.js`, `mcp.js` (MCP client source) |
| `explore/server/mcp-server.js` | MCP server (tools, resources, write gating, HTTP handler) |
| `explore/server/app.js` | config, HTTP routes, permissions glue |
| `explore/server/wrong.js`, `impl.js` | deliberately wrong implementations (SPEC §13.3), selected by `IMPLEMENTATION=wrong` |
| `explore/shared/` | model, style compiler, layouts, client view store (shared by server, worker, browser) |
| `explore/client/` | browser UI and layout worker (bundled to `explore/public/`) |
| `explore/test/` | acceptance tests (SPEC §13.2), MCP tests, UI tests, wrong-implementation harness, fixtures (incl. a mock MCP server) |
| `explore/bench/` | `bench.mjs` (service/client/layout), `render-bench.mjs` (browser fps, first render, delta latency, screenshots) |
| `explore/LICENSES.md` | licenses of every added dependency (all permissive) |
| `explore/server/views.js`, `views-wrong.js`, `views-impl.js` | saved-view store (SPEC §19), its deliberately wrong twin, and the selector (`VIEWS_IMPL=wrong`) |
| `explore/shared/saved-views.js` | view state schema / normaliser / access restriction |
| `explore/shared/symbols.js`, `explore/client/symbols.js` | symbol resolution (pure) and the canvas → texture-atlas composer (SPEC §20) |
| `explore/demos/willitrun/views.json`, `style-symbols.json`, `views-shots.mjs` | demo views + presentation, symbol style, screenshots / 10k perf check |
| `explore/er/` | entity resolution (SPEC §21): `engine.js` (clustering, stable ids, why), `sidecar.js` (engine interface), `splink_sidecar.py`, `src/.../DukeSidecar.java`, `integration.js` (in-process stage), `kafka-worker.js`, `queries.js` (MCP/HTTP), `wrong.js`, `metrics.js`, `setup.mjs`, `train.mjs`, `models/`, `third-party/` (licence texts) |
| `explore/demos/er/` | synthetic ER data generator with ground truth, demo runner, style, screenshots |
| `explore/shared/geo-core.js`, `geo.js`, `geo-wrong.js` | positions, bbox, Web Mercator, arcs; H3/MGRS cells and aggregation; the deliberately wrong twin (`GEO_IMPL=wrong`) |
| `explore/server/geo-queries.js`, `geo-impl.js` | `nodes_in_bbox` / `grid_counts` with access rules (MCP + HTTP) |
| `explore/client/map.js` | MapLibre map pane (lazy bundle), basemap fallback, grid/heat/link/symbol layers |
| `explore/demos/geo/` | USGS + Natural Earth fixture and fetcher, demo runner, style, views, perf, screenshots, incident-export loader |
| `explore/server/core-loop.js`, `core-loop-wrong.js`, `core-loop-impl.js` | streamed k-hop neighbourhood, paths, node summary (SPEC §23.2-§23.4), the deliberately wrong twin and selector (`CORE_IMPL=wrong`) |
| `explore/shared/algorithms.js`, `algorithms-wrong.js`, `algorithms-impl.js`, `explore/server/algorithms.js` | graph algorithms (SPEC §23.5), wrong twin (`ALGO_IMPL=wrong`), scoped + cached algorithm service |
| `explore/shared/core-filter.js` | type / property filter compiler shared by neighbourhood, paths and algorithm scopes |
| `explore/client/core-loop.js` | streamed expand, paths panel, encodings + legend, lasso / box, bulk bar, context menus, shortcuts |
| `explore/test/core-loop*.test.js`, `algorithms.test.js`, `core-fixtures.js`, `fixtures/algo-reference.json`, `explore/tools/algo-reference.py`, `phase1-proof.mjs`, `explore/bench/phase1-bench.mjs` | Phase 1 tests, oracles, reference values, proofs, benchmark |
| `explore/public/geo/`, `explore/public/vendor/maplibre/` | Natural Earth offline basemap; vendored MapLibre dist + licences |
