# Integration: the other bot's explore layer + Flink/Duke + Phases 3 and 4, merged into Hudson's StreamGraph studio

Folder: `/workspace/streamgraph-integrated`. My original app (`/workspace/streamgraph`, PR #1) was not touched.
Runs as **one Node process on 127.0.0.1:8080**: `npm start` = `node explore/combined.js demo/flow.json`. Kafka, Flink and Duke are child Java processes that the studio starts and stops.

## 1. Base and what differed
- **Base: his app** (`/workspace/combined-build/src/combined-build/app`). On top of it I put my StreamGraph `src/`, `public/`, `test/`, `demo/`, SPEC.md, UI-SPEC.md, README.md, LICENSES.md, RESEARCH.md and `research/`.
- His copy of StreamGraph matched mine apart from:
  - Trailing whitespace and CRLF line endings.
  - **One real fix, which I kept:** `src/app.js` imports the demo through `pathToFileURL(...)`, so `--demo` works on Windows.
  - `demo/suppliers.docx` is a regenerated zip with the same content.
  - His `package-lock.json` is a superset of mine with the same versions. SheetJS is still pinned to cdn.sheetjs.com 0.20.3.
- Not copied: `.git`, `demo/shop.db`, `demo/orders.ndjson` (regenerated), the prebuilt jars (`explore/flink/build`, `explore/er/build`), and the prebuilt client bundles and vendor folder. I rebuilt the bundles with `npm run build:explore`, and they came out byte-identical to his.

## 2. Security review (static only; no shipped binary was run)
- **Prebuilt jars were never executed.** `graph-processor.jar` and `duke-sidecar.jar` were deleted and rebuilt **from source** with javac (`npm run flink:build`, `npm run er:build`; Maven isn't needed). The JDK is Temurin 21 from api.adoptium.net. Kafka 4.3.2 and Flink 2.2.1 come from downloads.apache.org with **SHA-512 checked**. Maven Central jars are SHA-1 checked.
- **Install scripts.** Only esbuild has one (a postinstall that fetches its platform binary). I installed with `npm ci --ignore-scripts`, and esbuild uses its optional platform package.
- **Network.** The server binds **127.0.0.1** through StreamGraph (`HOST` env to change it). There are no 0.0.0.0 binds in the explore code. The Kafka broker listens on 127.0.0.1:9092/9093 only.
- **Hosts contacted.** Only the setup scripts (downloads.apache.org, repo1.maven.org, api.adoptium.net), the willitrun demo fixtures (willitrunllm.com), the USGS geo fixtures, and OpenFreeMap map tiles from the browser (with an offline Natural Earth fallback). Nothing at runtime phones home.
- **Shell exec.** `child_process` is only used in the setup/build scripts, the Flink runner, the Duke/Splink sidecars, the Kafka broker launcher and proof tools. Commands are always `execFile`/`spawn` with argument arrays, never a shell string.
- **MCP** (`/mcp`): has a Host-header check (stops DNS rebinding), no login (same as the studio), and the same ABAC subject as the UI.
- **Finding, fixed: his explore HTTP API bypassed ABAC.**
  - `ex.guard` returned everything when `uiActAs` was unset (the default).
  - Search, expand, path, resync and the server-push deltas were never filtered.
  - Labels and keys weren't masked, search could be used to probe hidden values, and ER entities copied record values.
  - The fix is `explore/server/access.js` plus a boundary in `explore/server/app.js`:
    - Every `/api/explore/*` reply (JSON, NDJSON, server-sent events) goes through an egress filter for the request's subject. It drops denied items and anything that references them, masks hidden fields, and turns ids whose key field is hidden into pseudonyms. Pseudonyms coming back in are mapped to real ids.
    - Each session is bound to the user who opened it.
    - Search can't match hidden fields.
    - An ER entity is shown only if every record type it combines is readable.
    - With no access engine, it fails closed.
- **Remaining gap:** aggregate counts in `/api/explore/stats` and `/core/config` aren't filtered per user. They show totals, not data.

## 3. Access rules on every new endpoint
- An AsyncLocalStorage context carries `{subject, actor}` per request. The studio's **Test as** header (`x-sg-as`, admins only) applies to the explorer, including its EventSource (`?sg-as=`, same admin check).
- New ABAC action **`write`** ("edit" in the UI). Default rules: admins may do everything; analysts get read/query/export, not edit.
- Admin only: processing start/stop, the plain-English setting, RDF import, ingest/synthetic/connectors, and adding a **new type**. Edits to hidden fields are refused. "Test as" previews stay previews: admin checks use the previewed user.
- **Deliberately wrong implementations** (`EXPLORE_ABAC=broken`, `HISTORY_IMPL=broken`, `QUERY_IMPL=broken`). `test/integration/wrong-explore.test.js` runs the integration suite against each one and requires it to **fail**. The failing runs are saved in `test/broken-explore-abac-run.txt` (8 failures), `test/broken-history-run.txt` (1) and `test/broken-query-run.txt` (2).

## 4. Phase 1: integration
- **Explore** has two tabs: **Search and ask** (the original page) and **Graph explorer**.
  - The Graph explorer is a studio-styled shell (`/explore/studio`) around his Sigma.js client.
  - Controls are grouped into a left toolbar (Select, Expand, Path, Layout, Edit, Types) and the **Analyze ▾**, **View ▾** and **Export ▾** menus.
  - The old `/explore` page is still served.
- **Flink + Kafka.**
  - `explore/kafka/local-broker.js` runs a KRaft broker with `java -cp libs/*` (no .sh/.bat, no ZooKeeper, no Docker).
  - `explore/server/processing.js` (ProcessingControl) saves the settings in `data/explore-settings.json` and rebuilds the explore layer in Kafka mode with the Flink job (his MiniCluster runner). It retries while the new broker elects leaders and rolls back on failure.
  - Ctrl+C stops all Java children.
- **Duke vs Splink.** **Duke is the default.**
  - It needs only the JDK that Flink already needs, and it runs as one Java sidecar.
  - Splink needs a Python 3.10+ venv with duckdb and pyarrow, which is heavier to set up on Windows without admin.
  - **Accuracy caveat (his own result, reproduced):** on the held-out seed 11, Duke scores Person precision **0.892** (recall 0.950, F1 0.920). That is just under his 0.90 bar, so his test E1 fails for Duke. Splink passes it.
  - Raising Duke's Person threshold to 0.92 would pass on seed 11, but that would be tuning on the test set. On the training seed (7), 0.90 is the best F1 (0.969 vs 0.966). I left his threshold. Unsure pairs go to the review queue.
- **Live processing page:**
  - Start/Stop for stream processing and for matching.
  - Readiness checks, each with its setup command.
  - Flink alerts and the most-connected table (refreshes every 4 s).
  - Engine choice and per-type "people / organizations / don't match".
  - **Possible matches to review** with **Same thing** / **Not the same**.
- **Reviewer decisions** are written to the store as `SAME_AS` / `NOT_SAME_AS` links (so they go out through sync-out). They are also applied to the matching engine: a new `ErEngine.decide()` joins "same" pairs even below the threshold and stops the direct match and suggestion for "different" pairs. Decisions are replayed after restarts.

## 5. Phase 3: time and investigation
- **Versioned history** (`explore/server/history.js`, `data/history.db`): every node/edge change is recorded from the StreamGraph adapter. Timeline, state at a time, and **compare two times** (added / removed / changed with before → after per field), all masked per user. UI: **History** tab.
- **Table and chart views linked to the graph**: table rows ↔ graph selection both ways, CSV download; bar chart by type or any field, click a bar to select. UI: **Table**, **Chart** tabs.
- **In-canvas editing**: Add thing, Connect, Edit fields, Remove.
  - Changes are written to the StreamGraph store, so they appear in history and in the change log that **sync-out** sends to outputs.
  - Each one is checked against the `write` rules and audited.
  - ER merge approval is on the Live processing page.
- **Comments** on the selected thing, and **case notebooks** (notes, attached selections with a written summary, show on graph, download as text). Stored in `data/investigate.db`. Only visible targets are allowed, and hidden targets are never listed.
- **Deterministic SVG and PNG export** (`explore/server/export-svg.js`): sorted output and fixed positions from the current layout, so the same view gives the same bytes. Light, dark and high-contrast themes. PNG is drawn from the SVG in the browser at 2×.

## 6. Phase 4: polish
- **Visual query builder → Cypher** (`explore/server/query.js`): pick a type and conditions, optionally follow one link and set its direction. It shows the Cypher and runs it on the in-app graph. You can edit the Cypher and run it (the one-hop MATCH/WHERE/RETURN/LIMIT subset). Filtering on a hidden field is refused.
- **Plain-English questions and captions** (`explore/server/nl/rules.js`): **off by default**. When an admin turns them on, built-in rules answer count / list-with-filter / neighbours / path / most-connected questions and write captions and summaries, with no network and no paid API. Where a real model would plug in: `explore/server/nl/PROVIDERS.md` (implement `interpret`, `caption`, `summarize` and register it in `PROVIDERS`). No paid calls are made anywhere.
- **RDF** (n3, MIT): Turtle and N-Triples export of everything you may see (`urn:streamgraph:` IRIs, sorted output); import for admins.
- **3D mode** (3d-force-graph + three.js, MIT): lazy-loaded bundle, a **3D** button, and the same button returns to 2D. Selection syncs.
- **SDKs**:
  - `sdk/js/streamgraph.js`: `createClient()` for every studio API, plus `embedViewer()` (an iframe with search/drawer options). Served at `/sdk/streamgraph.js`.
  - `sdk/python/streamgraph_client`: standard library only, with unittest tests.
- **Accessibility**: `[` / `]` step through things, `\` steps through neighbours (announced through aria-live), **Describe what's shown** (`D`), **High contrast** theme (remembered), and **T** toggles the bottom panel.

## 7. Bugs fixed along the way (in his code)
- **Delta gap on first load (caused by my slower first reply).** Deltas sent between "open session" and the EventSource subscribing were lost, so the viewer showed "Resynced after a delta gap". Sessions now hold early deltas until the viewer subscribes. 3 runs with 0 gaps vs. 1 gap before.
- **SSE events split across writes** are now reassembled before filtering.
- **Missing comma in `SHORTCUTS`** (core-loop.js) made the "G" and "A" shortcuts disappear from the help list.
- **History timeline bucketing** used float division (one bucket per millisecond). Fixed with `CAST(... AS INTEGER)`.
- **G10 geo test**: now expects the fail-closed result (the change is commented in the test).

## 8. Measured on this box (no GPU; shared 8 vCPU / 15.6 GB box with other jobs running)
`node perf/integration-bench.mjs 10000` → `perf/results-10000.txt`. For 10,000 nodes and 10,000 links:

| What | Median time | Reply size |
|---|---|---|
| Full session snapshot, owner | 318 ms | 7.7 MB |
| Full session snapshot, analyst (with the ABAC egress filter) | 337 ms | |
| Query-builder filter | 57 ms | |
| One-hop Cypher, 5,000 rows | 200 ms | |
| SVG of 2,000 nodes | 52 ms | |
| History compare | 282 ms | |
| RDF Turtle export | 338 ms | |
| 500 edits | 1.1 s | |

His client-side numbers (Sigma/WebGL, layouts, bundling) are in `explore/bench` and `proof/`. No GPU or million-element claims are made.

## 9. Left out, and why
- **GPU-accelerated analytics:** not built. **WebGPU rendering** was added on 15 Nov 2026 as an optional renderer (see §12); it has not been measured on real GPU hardware yet.
- **Shared live sessions (co-editing the same view):** saved views, links, comments and notebooks cover sharing for now.
- **Full Cypher/GQL:** only the subset the builder writes is parsed. Neo4j stays the place for arbitrary Cypher, through Send data out.
- **"Not the same" can't block a transitive merge** through a third record that matches both. That would need cannot-link constraints in clustering.
- **Real AI model provider:** OFF by design. The plug-in point is documented, and no paid keys are used.
- **Per-user filtering of aggregate counts** in `/api/explore/stats`: totals only, noted above.
- **Duke Person precision 0.892** on the held-out set, below his 0.90 bar (see §4).

## 10. Windows (Sutherland) checklist
1. `$env:JAVA_HOME="C:\Users\whsut\tools\jdk21"` (or `STREAMGRAPH_JAVA=...\bin\java.exe`).
2. `npm ci`, then `npm run setup:processing` once (uses Windows' `tar.exe`; no admin).
3. `npm start`, then open http://127.0.0.1:8080, then **Live processing → Start stream processing**.
4. Check:
   - Ports 9092/9093 are free (or set `STREAMGRAPH_KAFKA_PORT`).
   - Windows Defender may ask once about java.exe listening on localhost. Allow **private** only, or cancel: localhost works either way.
   - Long paths: keep the folder short (for example `C:\sg`), because the Flink and Kafka jars sit deep in `.runtime`.
   - The existing Neo4j on Sutherland: use **Send data out** (bolt://127.0.0.1:7687). It doesn't clash with the Kafka ports.
   - The H3 geo metrics (optional) use a JNI library that the H3 jar bundles for Windows.
   - Splink needs Python 3.10+. Leave it unchecked and Duke is used.

## 11. Test results (one full run, 14 Nov 2026; log `/workspace/logs/all-final.txt` on the build box)
| Suite | Command | Tests | Pass | Fail | Skip |
|---|---|---|---|---|---|
| StreamGraph core | `npm test` | 62 | 62 | 0 | 0 |
| Integration (ABAC X1–X14, ER review, processing, SDK, studio UI, wrong-impl checks) | `npm run test:integration` | 27 | 27 | 0 | 0 |
| Will it run | `npm run test:willitrun` | 6 | 6 | 0 | 0 |
| His explore suite | `npm run test:explore` | 210 | 168 | 11 | 31 |
| ER with Duke | `npm run test:er` (duke) | 9 | 8 | 1 | 0 |
| Kafka | `npm run test:kafka` | 10 | 10 | 0 | 0 |
| Flink | `npm run test:flink` | 10 | 10 | 0 | 0 |
| Flink geo | `npm run test:geo:flink` | 3 | 3 | 0 | 0 |
| ER over Kafka (Duke) | `npm run test:er:kafka` | 2 | 2 | 0 | 0 |
| Core loop over Kafka | `npm run test:core:kafka` | 2 | 2 | 0 | 0 |
| Python SDK (run inside SDK-2 against a live server) | `npm run test:sdk` | 3 | 3 | 0 | 0 |

- **Wrong implementations must fail, and do:** `test/broken-explore-abac-run.txt` (8 failures), `test/broken-history-run.txt` (1), `test/broken-query-run.txt` (2).
- **Explore skips (31):** the Kafka and Splink tests inside `test:explore` skip when no broker or Splink venv is present. Kafka is covered by the separate Kafka/Flink suites above. Splink was not installed (Duke is the default).
- **Explore failures (11):** all browser tests (geo-ui U6/U7, scale-ui Q1–Q7, views-ui P3/P4) timed out waiting for the page while other jobs on the shared box were using ~14 of 16 GB and most CPU. Rerun on their own: see the line below.
- **ER duke failure (1):** E1, Person precision 0.892 < 0.90, his documented result (see §4).
- **Rerun of the three browser test files on their own** (`/workspace/logs/explore-ui-rerun.txt`): 9 of the 11 failures passed (U6, U7, Q1–Q7, plus Q8 and P1). U2 and U4, which passed in the full run, timed out this time. P3/P4 had not finished when this was written. Pass/fail moves around with the load on the box, so the failures are timeouts, not broken code.

## 12. Optional WebGPU renderer (15 Nov 2026)
Toolbar **Renderer: Auto / WebGPU / WebGL** on `/explore` and the studio's Graph explorer (`/#explore-graph`). Auto = WebGPU when `navigator.gpu` gives an adapter, else WebGL (sigma.js). The choice is saved in localStorage (`explore.renderer`), and `?renderer=` overrides it for one page load. If WebGPU fails to start, or the device is lost or runs out of memory later, the explorer switches back to WebGL and the readout shows the reason.

**Files**
- `explore/client/webgpu/gpu-core.js`: the WebGPU device and pipelines. Hand-written WGSL: node instanced quads with SDF shapes and a ring, edge instanced quads with AA and dashes. Storage buffers grow in powers of two, with out-of-memory and device-lost detection, at most 2 frames in flight, and a debug readback output.
- `explore/client/webgpu/gpu-renderer.js`: the sigma-compatible renderer (states, camera, events, picking, labels, coordinates).
- `explore/client/webgpu/camera.js`: sigma 4's camera and matrix maths. Unit-tested against `sigma/utils` matrixFromCamera.
- `explore/client/webgpu/spatial.js`: the CPU picking grid.
- `explore/client/webgpu/color.js`: CSS colour to RGBA8.
- `explore/shared/renderer-select.js`: Auto / WebGPU / WebGL selection, fallback and persistence. `renderer-select-wrong.js` is the deliberately wrong twin.
- `explore/shared/bench-schema.js`: the benchmark result schema, the stop rule (under 10 fps or an error) and stats.
- `explore/client/bench.js` and `explore/public/bench.html`: `/explore/bench`.
- `explore/bench/webgpu-bench.mjs`: the CLI.
- `explore/server/app.js`: `GET /explore/bench`, and `POST /api/explore/bench/webgpu` (admin only; validates, then writes `perf/webgpu-bench-<timestamp>.json`, or `$EXPLORE_BENCH_DIR`).
- `explore/client/main.js`: the toggle, the readout and the shared style functions.
- `explore/public/index.html` and `studio.html`: the control.
- Tests: `explore/test/webgpu.test.js` (W1–W11) and `explore/test/webgpu-ui.test.js` (U1–U5). The deliberately wrong run is in `test/broken-webgpu-select-run.txt`.

**Data path / ABAC.** The WebGPU renderer reads only the graphology graph the explorer already holds. That graph is filled from `/api/explore/*` replies, which pass the egress filter in `explore/server/access.js`. No new data endpoint was added. The benchmark draws synthetic graphs made in the page, and its POST endpoint only stores timing JSON (schema-checked, admin only).

**How it draws.** Positions are uploaded once as raw graph x/y. The shader applies sigma's normalisation and camera, so panning and zooming upload only a 64-byte uniform. A style or state change (selection, highlight, filters, theme) rebuilds the typed arrays from graphology with the same style functions the sigma view uses. A position-only change (layout animation, drag) patches in place and re-uploads positions. Hidden nodes and edges are left out of the draw lists. Highlighted ones are drawn last, so they sit on top.

**Picking.** Nodes use a CPU uniform grid, rebuilt lazily after positions or visibility change. The topmost hit wins and highlighted nodes take priority. Edges are hit-tested by brute force on right-click only (up to 300k drawn edges).

**Labels.** Labels are drawn on a 2D overlay canvas:
- the hovered node
- selected and highlighted nodes (up to 300)
- labels set to "always"
- the most connected on-screen nodes (top 4,000 by degree) whose disc is at least 6 px, one per grid cell, about 80 per frame

**Limits.** These are not drawn in WebGPU mode:
- arrowheads
- curved parallel edges (drawn straight)
- symbol images (they show as the plain coloured shape)

Edge labels aren't drawn either; the sigma view has them off too. Node-drag picking uses the CPU grid, so 1M+ nodes cost about 20–40 ms to re-index after a big layout change.

**Box results (no GPU).** Headless Chrome here has only SwiftShader (CPU) WebGPU, and it destroys the device whenever a WebGPU canvas is presented, even a plain clear. So box tests and screenshots use the debug readback path (`?gpuReadback=1`: render to a texture and copy it to a 2D canvas). It runs the same shaders and picking. Box numbers are CPU numbers: WebGL 1k nodes 2.3 fps, WebGPU-readback 1k 15.8 fps, 10k 1.1 fps. Measure on real hardware (below).

**Running the benchmark on Windows** (Intel Iris Xe, Chrome or Edge), app on port 8091:
1. `cd C:\sg` (the integrated build), then `$env:PORT=8091; npm start`. Or `node explore/combined.js demo/flow.json --port 8091`.
2. Browser: open `http://127.0.0.1:8091/explore/bench`, keep the tab in front, plug in power, and click **Run benchmark**. Then click **Send to server** (writes `C:\sg\perf\webgpu-bench-<timestamp>.json`) or **Download JSON**. The "WebGPU adapter:" line should say intel / gen-12lp, not SwiftShader. If it says "No WebGPU adapter", open `edge://gpu` or `chrome://gpu` and check that WebGPU is "Hardware accelerated".
3. Or from a second PowerShell: `npm run bench:webgpu -- --url http://127.0.0.1:8091 --channel msedge` (or `--channel chrome`). This is headed by default on Windows; don't minimise the window. It prints the table, and the server writes the JSON to `perf\`.

## 13. OpenSearch search index (15 Nov 2026)
OpenSearch (Apache-2.0) runs beside the graph as a **search index**. The graph stays the source of truth. The app talks to OpenSearch's REST API with plain `fetch`, so no new npm dependency was added. It is set up like any other output: **Send data out ▸ OpenSearch**, or `POST /api/studio/sinks {kind:"opensearch", name, settings:{url, user, index}, secret, asUser}`. `secret` is the password, which is optional for a local index with no login.

**Files**
- `src/search/opensearch.js`: REST client, index mapping, document builder and `OpenSearchSink` (the sync-out adapter).
- `src/search/service.js`: the search API, with the three access layers described below. Also holds the fallback built-in search, `parseSearch` and the status check.
- `src/syncout/sinks.js` and `src/syncout/index.js`: register `opensearch`, and pass the ABAC engine and the "send as" user to adapters.
- `src/studio/api.js`: `GET/POST /api/studio/search`, `GET /api/studio/search/status`, and the `opensearch` sink kind. The test endpoint reports cluster health and an index write.
- `src/app.js`: optional `searchFetch` injection, used by tests.
- `explore/server/app.js`: `GET/POST /api/explore/search` and `/api/explore/search/status`. These replies also go through the explore egress filter.
- `explore/client/index-search.js`: the explorer toolbar box. `explore/client/main.js` adds `focusFromIndex`, `?focus=` and `postMessage({type:'sg-focus'})`. `explore/public/explore.css` has the styles.
- `public/index.html`, `public/studio.js`, `public/studio.css`: the studio header search box, the OpenSearch option in Send data out, index status in the outputs table, and Search and ask using the new API.
- `explore/opensearch/config.js`, `setup.mjs`, `start.mjs`: the local OpenSearch install and start scripts.
- `explore/demos/maritime/search-demo.mjs`: the maritime sample, end to end.
- `explore/tools/opensearch-wrong-run.mjs`: the wrong-implementation proof.
- Tests: `test/opensearch.test.js` (8 tests) and `test/integration/search-ui.test.js` (S1–S5). The proof run is in `test/broken-opensearch-acl-run.txt`.

**What is indexed (one index, `<prefix>graph`, default `streamgraph-graph`)**
- **One document per node**, holding:
  - `label`, `key` and `node_id`.
  - Every property the "send as" user may see, as text (lowercase + ASCII folding) with a `.kw` keyword subfield, under `p.<field>`.
  - `name` (from name / title / vessel_name / heading / label, or the first `*name` field), with a fuzzy-friendly analyzer, a keyword subfield and an edge-n-gram prefix subfield.
  - `geo` (a geo_point from lat/latitude and lon/lng/long/longitude).
  - `time` (from ts / updated_at / time / date / eventTime / timestamp).
- **Text over 800 characters** (for example document sections from Documents sources) is split into overlapping 600-character **chunk** documents that point back to their node.
- **Access attributes on every document:**
  - `acl.label`, `acl.tags`, `acl.classification`, `acl.policy` (policy version) and `acl.sink_user`.
  - `need.<field>`: the clearance needed to see each field.
  - `name_field`, `geo_fields` and `time_field`: which source fields fed name, geo and time, so a caller who can't see those fields can't match, filter or sort on them.
- Fields hidden from the "send as" user are **never written**. This is the same `view()` masking as every other sink.
- **Syncing:**
  - Incremental sync is driven by the change log, like the other sinks.
  - Deletes remove the node and its chunks.
  - **Send now** (`/sinks/sync-now`) runs a cycle. A full reindex plus a sweep of stale documents happens after a wipe, a gap, or any access-rule change.
- Recommended "send as" user: the Owner, so higher-clearance users can search everything. Each search is filtered again for whoever is searching.

**How access control is enforced in search (deny by default, fail closed)**
1. **Server-side filter in the OpenSearch query, built from the caller's subject and the live policy.**
   - For each node type, the server calls `engine.decide({action:'read'})`. Only allowed types go into the query, as per-type clauses on `acl.label`.
   - Inside each type clause, only the fields the caller may see (`engine.visible`) are searched: `p.<field>`, `name` only when `name_field` is visible, and chunk `text` only when its field is visible.
   - The key is searched only when the caller's key isn't pseudonymised.
   - Geo filters only match documents whose `geo_fields` are all visible to the caller. Time filters work the same way with `time_field`.
   - If the caller may read no type at all, OpenSearch isn't called.
2. **Every hit is re-checked against the graph.**
   - The node must still exist. Pseudonymised keys are mapped back via `engine.pseudonym`.
   - The type must still be readable.
   - Properties are masked with `engine.viewNode`.
   - Highlight fragments are kept only for fields the caller may see. OpenSearch's `require_field_match` can highlight a field queried for another type, so this check is needed.
   - Geo hits are re-tested against the caller-visible coordinates.
   - HTML in fragments is escaped. Only `<mark>` survives.
   - `/api/explore/search` returns real ids that then pass the explore **egress filter** (`explore/server/access.js`). That filter drops denied types and rewrites hidden keys into the same pseudonyms the explorer uses.
3. **Fail closed.**
   - If OpenSearch is unreachable or errors, the reply comes from the built-in search over `viewGraph`-filtered, masked data. It is flagged `index:"offline"`, `offline:true`, and the UI shows "Search index offline".
   - A search is never answered unfiltered. No user means no results.

**API.** `GET /api/studio/search?q=&types=A,B&lat=&lon=&radius=10km|5mi|10nm&bbox=w,s,e,n&from=&to=&size=` or `POST` with `{q, types, geo:{lat,lon,radius}|{bbox}, time:{from,to}, size}`.
- The reply is `{q, total, results[], groups:[{type,count,results}], engine:'opensearch'|'built-in', index:'healthy'|'stale'|'offline'|'none', indexed, lastSync, ms, offline?, error?}`.
- Each result is `{id, exploreId, type, key, name, props (masked), geo?, time?, score, highlights:[{field, fragments}], matchedIn?}`.
- `GET /api/studio/search/status` returns `{index, docs, lastSync, waiting, cluster, indexName, lastError}`.
- Search runs for the "Test as" user when the `x-sg-as` header is set (admins only, as before).

**Local OpenSearch.**
- `npm run opensearch:setup` downloads OpenSearch 3.9.0, checks its SHA-512 against artifacts.opensearch.org and installs it in `explore/opensearch/.runtime/opensearch`.
  - Linux and macOS get the ~250 MB `opensearch-min` build, which has no security plugin.
  - Windows gets the ~1 GB full bundle, because no min zip is published. Its security plugin is turned off.
  - Either way, `config/opensearch.yml` is written with: `network.host: 127.0.0.1`, single node, `action.auto_create_index: false`, the disk threshold off, `indices.memory.native_index_buffer_size: 64mb`, and paths inside `.runtime`.
- `npm run opensearch:start` (Ctrl+C stops it) or `npm run opensearch:start:bg` (leaves it running):
  - starts it with `-Xms512m -Xmx1g` (`STREAMGRAPH_OPENSEARCH_HEAP` overrides) using OpenSearch's **bundled JDK** (JAVA_HOME is ignored);
  - waits for `/_cluster/health`.
- Port 9200 (`STREAMGRAPH_OPENSEARCH_PORT`).
- On this box only, the sandbox's cgroup is unreadable, so OpenSearch can't size memory. Start it there with `STREAMGRAPH_OPENSEARCH_HEAP="-Xms512m -Xmx1g -XX:-UseContainerSupport"`. A normal laptop doesn't need this.
- There is no login. Like `/mcp`, don't expose port 9200 through a tunnel.

**Measured on this box** (shared, heavily loaded by other jobs; load average over 100 during the run):
- **Maritime sample**: 4,815 nodes, indexed in about 2.4 s.
- **Queries**: 40–160 ms.
- **`q='ANAN MAERSK'`**: returns ANNA MAERSK (Vessel 220199000, fuzzy match) and the watch-list record ANAN MAERSK (WL-0160).
- **Geo, 10 km around Norfolk** (36.8508, −76.2859), Positions only: 441 matches in the index, nearest first.
- **Geo plus 06:00–07:00Z**: 11 matches.
- **Callsign `OXBA2`** (marked high in the demo): found by the Owner, 0 for the Analyst. OpenSearch itself returned 0 because the field isn't in the Analyst's query.

**Duke candidate blocking with OpenSearch: not done.** Duke already does its own candidate blocking, a Lucene index inside the sidecar (`maxCandidates`). Swapping that for OpenSearch needs a sidecar protocol change (pass candidate ids per record), a Java rebuild and a full ER-suite rerun. That was out of reach in this session. Thresholds are untouched.

**Windows laptop install** (next to the 8091 WebGPU build in `C:\sg-search`, port 8092). Commands are in the report and in UI-NOTES.md. In short:
1. Unzip to `C:\sg-search`.
2. Run `npm ci`.
3. Run `npm run opensearch:setup`, then `npm run opensearch:start:bg`.
4. Optionally, `$env:JAVA_HOME='C:\Users\whsut\tools\jdk21'; npm run setup:processing` for Kafka, Flink and Duke.
5. Run `$env:PORT=8092; npm start`.
6. In Send data out, add OpenSearch at `http://127.0.0.1:9200`, sent as the Owner.
