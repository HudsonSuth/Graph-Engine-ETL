# License audit

Generated from package-lock.json and each installed package.json. Policy: MIT, Apache-2.0, BSD (including 0BSD), ISC, MPL allowed; no AGPL, SSPL, BSL, GPL or LGPL (including files bundled inside a package).

Project license: MIT.

Summary: 0BSD 1, Apache-2.0 7, BSD-3-Clause 1, ISC 3, MIT 20. Disallowed found: none.

| Package | Version | License | Scope |
|---|---|---|---|
| @electric-sql/pglite | 0.5.16 | Apache-2.0 | dev |
| base64-js | 1.5.1 | MIT | runtime |
| buffer | 6.0.3 | MIT | runtime |
| cytoscape | 3.35.0 | MIT | runtime |
| ieee754 | 1.2.1 | BSD-3-Clause | runtime |
| jsonata | 2.2.2 | MIT | runtime |
| kafkajs | 2.2.4 | MIT | runtime |
| neo4j-driver | 6.3.2 | Apache-2.0 | runtime |
| neo4j-driver-bolt-connection | 6.3.2 | Apache-2.0 | runtime |
| neo4j-driver-core | 6.3.2 | Apache-2.0 | runtime |
| pg | 8.23.1 | MIT | runtime |
| pg-cloudflare | 1.4.1 | MIT | optional |
| pg-connection-string | 2.14.1 | MIT | runtime |
| pg-int8 | 1.0.1 | ISC | runtime |
| pg-pool | 3.14.0 | MIT | runtime |
| pg-protocol | 1.16.1 | MIT | runtime |
| pg-types | 2.2.0 | MIT | runtime |
| pgpass | 1.0.5 | MIT | runtime |
| playwright-core | 1.65.0 | Apache-2.0 | dev |
| postgres-array | 2.0.0 | MIT | runtime |
| postgres-bytea | 1.0.1 | MIT | runtime |
| postgres-date | 1.0.7 | MIT | runtime |
| postgres-interval | 1.2.0 | MIT | runtime |
| rxjs | 7.8.2 | Apache-2.0 | runtime |
| safe-buffer | 5.2.1 | MIT | runtime |
| split2 | 4.2.0 | ISC | runtime |
| string_decoder | 1.3.0 | MIT | runtime |
| tslib | 2.9.1 | 0BSD | runtime |
| unpdf | 2.1.0 | MIT | runtime |
| xlsx | 0.20.3 | Apache-2.0 | runtime |
| xtend | 4.0.2 | MIT | runtime |
| yaml | 2.9.1 | ISC | runtime |

Guided view (Nov 12 2026): no new dependencies. It is plain JavaScript, HTML and CSS written for this project (MIT) and reuses cytoscape (MIT) for the result graph.

Non-npm pieces: Node.js built-in node:sqlite (Node is MIT; SQLite is public domain). Screenshots use the Chromium build already on the box (BSD-3-Clause) through playwright-core (Apache-2.0); no browser is bundled in the zip.

Sync-out and access rules (Nov 12 2026): one new runtime dependency, neo4j-driver 6.3.2 (Apache-2.0, the official Bolt driver, also used for Memgraph), which brings neo4j-driver-core and neo4j-driver-bolt-connection (Apache-2.0), rxjs (Apache-2.0), tslib (0BSD), buffer, base64-js, safe-buffer and string_decoder (MIT) and ieee754 (BSD-3-Clause). PostgreSQL output reuses pg (MIT) and Kafka output reuses kafkajs (MIT). The access-rules engine is plain JavaScript written for this project (MIT) and uses no OPA code; the optional OPA adapter only sends HTTP requests to an OPA server you run yourself (OPA is Apache-2.0 and is not bundled). The design follows Hudson's own MIT repo HudsonSuth/youtube-to-training PR #2, read only; no code was copied from it.

Documents source (Nov 12 2026): two new runtime dependencies, both with no dependencies of their own.
- **unpdf 2.1.0 (MIT)** reads PDFs. It bundles a server build of Mozilla PDF.js (Apache-2.0) and its image decoders, JBIG2 from PDFium (BSD-3-Clause) and OpenJPEG (BSD-2-Clause). The license texts are in `node_modules/unpdf/dist/licenses/`. StreamGraph runs it with eval off and font loading off, on bytes already in memory, so it makes no network calls.
- **xlsx (SheetJS Community Edition) 0.20.3 (Apache-2.0)** reads .xlsx and .xls. It is installed from SheetJS's own registry (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, pinned in package-lock.json with its integrity hash) because the copy on the npm registry (0.18.5) is old and has known security advisories for crafted files. Only stored cell values are read: no formulas are recalculated, no macros run and no external links are followed.
- Word (.docx) files are read with code written for this project (MIT): a small ZIP reader on Node's built-in zlib and a small XML tokenizer that refuses DTDs and entity declarations. CSV reuses StreamGraph's own CSV reader.

Rejected during the audit:
- **pdfjs-dist** (Apache-2.0) was tried first and removed. Its package also ships LiberationSans fonts under GPL v2 with a font exception (`standard_fonts/LICENSE_LIBERATION`), which this policy does not allow even when the files go unused.
- **fast-xml-parser** (MIT) was not needed. It now has six dependencies, and Office XML only needs a tokenizer.
- The npm-registry **xlsx 0.18.5** was rejected for its known advisories (prototype pollution and ReDoS on crafted files).

pdfjs-dist would also have pulled in **@napi-rs/canvas** (MIT, an optional native renderer), which is not needed for text and is not installed now. A search of every installed package's license files for "GNU General Public", "Lesser" or "Affero" finds nothing.

---

# Third-party licenses — Explore layer + MCP (added on top of StreamGraph)

All dependencies added for the exploration layer and MCP support are under permissive licenses (MIT, ISC, BSD-2-Clause, Apache-2.0). No vendor code was copied; the layer is written from SPEC.md only. StreamGraph's own dependencies are listed in its LICENSES file (src/StreamGraph-LICENSES.md) and are unchanged.

## Direct dependencies added

| Package | Version | License | Used for |
|---|---|---|---|
| @modelcontextprotocol/sdk | 1.32.2 | MIT | MCP server (stdio + Streamable HTTP) and MCP client source |
| sigma | 4.0.6 | MIT | WebGL graph renderer (UI) |
| @sigma/node-border | 4.0.0 | MIT | node border/ring layer (UI) |
| graphology | 0.26.0 | MIT | graph data structure (UI, layouts) |
| graphology-layout-forceatlas2 | 0.10.1 | MIT | force layout (worker, server-side run_view) |
| zod | 4.6.7 | MIT | MCP tool input schemas |
| esbuild | 0.28.2 | MIT | dev: bundles the browser client |
| playwright-core | 1.65.0 | Apache-2.0 | dev, already in StreamGraph: browser tests / benchmarks (Apache-2.0) |
| @sigma/node-image | 4.0.2 | MIT | texture-atlas image layer that draws composed node symbols (SPEC §20) |
| lucide-static | 1.72.0 | ISC | bundled icon set "lucide" (~1,700 SVG icons), served from node_modules; ISC needs no attribution in the UI |
| majesticons | 2.1.3 | MIT | bundled icon sets "majesticons:line" and "majesticons:solid" (380 + 380 SVG icons), Copyright (c) 2021 Gerrit Halfmann; MIT needs no attribution in the UI |
| milsymbol | 3.0.5 | MIT | optional MIL-STD-2525 / APP-6 symbols from a SIDC node property; bundled separately as `explore/public/milsymbol.js`, loaded only when a style uses it |

## Full transitive tree of the added packages (installed)

| Package | Version | License | Pulled in by |
|---|---|---|---|
| @esbuild/linux-x64 | 0.28.2 | MIT | esbuild |
| @hono/node-server | 2.1.8 | MIT | @modelcontextprotocol/sdk |
| @modelcontextprotocol/sdk | 1.32.2 | MIT | @modelcontextprotocol/sdk |
| @sigma/node-border | 4.0.0 | MIT | @sigma/node-border |
| ajv | 8.20.0 | MIT | direct (Kafka-mode JSON Schema validation); also @modelcontextprotocol/sdk |
| ajv-formats | 3.0.1 | MIT | direct (Kafka-mode date-time formats); also @modelcontextprotocol/sdk |
| bytes | 3.1.2 | MIT | @modelcontextprotocol/sdk |
| content-type | 1.0.5 | MIT | @modelcontextprotocol/sdk |
| cors | 2.8.6 | MIT | @modelcontextprotocol/sdk |
| cross-spawn | 7.0.6 | MIT | @modelcontextprotocol/sdk |
| debug | 4.4.3 | MIT | @modelcontextprotocol/sdk |
| esbuild | 0.28.2 | MIT | esbuild |
| events | 3.3.0 | MIT | graphology |
| eventsource | 3.0.7 | MIT | @modelcontextprotocol/sdk |
| eventsource-parser | 3.1.1 | MIT | @modelcontextprotocol/sdk |
| express | 5.3.0 | MIT | @modelcontextprotocol/sdk |
| express-rate-limit | 8.7.4 | MIT | @modelcontextprotocol/sdk |
| graphology | 0.26.0 | MIT | graphology |
| graphology-layout-forceatlas2 | 0.10.1 | MIT | graphology-layout-forceatlas2 |
| graphology-types | 0.24.8 | MIT | graphology |
| graphology-utils | 2.5.2 | MIT | graphology-layout-forceatlas2 |
| hono | 4.13.18 | MIT | @modelcontextprotocol/sdk |
| http-errors | 2.0.1 | MIT | @modelcontextprotocol/sdk |
| iconv-lite | 0.7.3 | MIT | @modelcontextprotocol/sdk |
| ip-address | 10.7.6 | MIT | @modelcontextprotocol/sdk |
| isexe | 2.0.0 | ISC | @modelcontextprotocol/sdk |
| jose | 6.2.17 | MIT | @modelcontextprotocol/sdk |
| json-schema-typed | 8.0.2 | BSD-2-Clause | @modelcontextprotocol/sdk |
| ms | 2.1.3 | MIT | @modelcontextprotocol/sdk |
| object-assign | 4.1.1 | MIT | @modelcontextprotocol/sdk |
| path-key | 3.1.1 | MIT | @modelcontextprotocol/sdk |
| pkce-challenge | 5.0.1 | MIT | @modelcontextprotocol/sdk |
| raw-body | 3.0.2 | MIT | @modelcontextprotocol/sdk |
| safer-buffer | 2.1.2 | MIT | @modelcontextprotocol/sdk |
| shebang-command | 2.0.0 | MIT | @modelcontextprotocol/sdk |
| shebang-regex | 3.0.0 | MIT | @modelcontextprotocol/sdk |
| sigma | 4.0.6 | MIT | @sigma/node-border |
| unpipe | 1.0.0 | MIT | @modelcontextprotocol/sdk |
| vary | 1.1.2 | MIT | @modelcontextprotocol/sdk |
| which | 2.0.2 | ISC | @modelcontextprotocol/sdk |
| zod | 4.6.7 | MIT | @modelcontextprotocol/sdk |
| zod-to-json-schema | 3.25.2 | ISC | @modelcontextprotocol/sdk |

Kafka mode: the client is `kafkajs` 2.2.4 (MIT), which is already a StreamGraph dependency. Nothing else is bundled. The broker is external and not part of the build: Apache Kafka is Apache-2.0, Redpanda Community is BSL-1.1 (free to run locally, not redistributed here), and Temurin JDK is GPLv2 with Classpath Exception (installed separately, not redistributed).

Flink stream processor (optional, SPEC §18): nothing is bundled except our own job jar (`explore/flink/build/graph-processor.jar`, compiled from `explore/flink/src`). `npm run flink:setup` downloads, with checksums verified, into `explore/flink/.runtime/` (not redistributed): Apache Flink 2.2.1 binary distribution (Apache-2.0), flink-sql-connector-kafka 5.0.0-2.2 (Apache-2.0; shades kafka-clients, Apache-2.0), networknt json-schema-validator 1.5.9 (Apache-2.0), Jackson core/databind/annotations 2.18.3 (Apache-2.0), com.ethlo.time itu 1.14.0 (Apache-2.0), and only if no Java 17+ is present, Eclipse Temurin 21 (GPLv2 with Classpath Exception).

Icons (SPEC §20.3): only the permissive sets above are bundled. Icons from mixed-licence aggregators (SVG Repo, UXWing, Iconpacks) and attribution-required packs (e.g. Streamline free tiers) are deliberately NOT bundled. Use your own SVG folder instead (`explore/icons-custom/<set>/` or `<data dir>/icons/<set>/`); the style file must declare that set with a `license` field (and `attribution` when the licence needs it), or the set is refused. Declared attributions are shown in presenter mode.
The four packages above have no runtime dependencies of their own.

Not installed (optional): esbuild platform binaries @esbuild/* other than the host one (MIT), @cfworker/json-schema (optional peer of the MCP SDK, MIT).

Regenerate: `npm ls --all --json` and read each package.json license field (this table was generated on 2026-11-13).

## Entity resolution (optional, SPEC §21)

Nothing third-party is bundled in the build zip: `npm run er:setup` downloads the engine dependencies (checksums verified) into `explore/er/lib/` and `explore/er/.venv/`. Our own code (`explore/er/*.js`, `splink_sidecar.py`, `src/streamgraph/er/DukeSidecar.java` → `build/duke-sidecar.jar`) and the trained Splink models (`explore/er/models/*.json`, parameters estimated from our synthetic data) are part of the build. No Senzing code, SDK, data or licence is used; only behaviour described in Senzing's public documentation was modelled (SPEC §21.1). Zingg (AGPL-3.0) was evaluated and rejected because it is copyleft.

| Component | Version | License | Where | Notes |
|---|---|---|---|---|
| Duke (Lars Marius Garshol) | 1.2 | Apache-2.0 | `explore/er/lib/duke-1.2.jar` (Maven Central `no.priv.garshol.duke:duke`) | full licence text: `explore/er/third-party/Duke-LICENSE.md` (from github.com/larsga/Duke). The Duke repository and jar contain no NOTICE file. Unmodified; our sidecar calls its public API |
| Apache Lucene core + analyzers-common | 4.0.0 | Apache-2.0 | `explore/er/lib/lucene-*.jar` (Duke's index) | NOTICE (from the jar's META-INF) reproduced in `explore/er/third-party/Lucene-4.0.0-NOTICE.txt`; LICENSE (Apache-2.0 plus the notices of bundled third-party code: ICU4J/Unicode data MIT-style, Brics automaton BSD, moman MIT) in `Lucene-4.0.0-LICENSE.txt` |
| Jackson core / databind / annotations | 2.18.3 | Apache-2.0 | `explore/er/lib/jackson-*.jar` (sidecar JSON) | NOTICE + LICENSE in `explore/er/third-party/Jackson-2.18.3-*.txt` |
| Splink | 5.0.0 | MIT | Python venv (`pip install splink==5.0.0`) | default engine |
| DuckDB (Python) | 2.0.0 | MIT | Python venv, Splink backend | |
| pyarrow | 26.0.1 | Apache-2.0 | Python venv, DuckDB ↔ Splink data exchange | |
| sqlglot | 30.31.0 | MIT | Python venv, pulled in by Splink | |
| Java runtime | 17+ | (Temurin: GPLv2 + Classpath Exception) | external, reused from the Flink runtime when present | not redistributed |
| Python | 3.10+ | PSF | external | not redistributed |

The Apache-2.0 NOTICE obligations apply if you redistribute the jars: keep `explore/er/third-party/` next to them.

## Map viewer and geo grids (SPEC §22)

| Component | Version | License | Where | Notes |
|---|---|---|---|---|
| maplibre-gl (MapLibre GL JS) | 6.18.0 | BSD-3-Clause | npm; dist copied to `explore/public/vendor/maplibre/` by `npm run build:explore` | `LICENSE.txt` (incl. the mapbox-gl-js ≤1.13 BSD-3 notice) and `THIRD-PARTY-LICENSES.txt` (licence texts of the 23 packages bundled inside the dist: ISC, MIT, BSD-2/3-Clause, MIT OR Apache-2.0) are copied next to it |
| h3-js (Uber) | 4.5.0 | Apache-2.0 | npm, bundled into `map.js` / used server-side | no NOTICE file in the package |
| mgrs (proj4js) | 2.2.0 | MIT | npm, bundled into `map.js` / used server-side | |
| h3 (Java, com.uber:h3) | 4.5.1 | Apache-2.0 | Flink job only; `npm run flink:setup` downloads it from Maven Central (SHA-1 checked) into the Flink lib dir, not in the zip | includes JNI natives built from the H3 C library (Apache-2.0) |
| Natural Earth 1:110m admin-0 countries, 1:50m populated places | GitHub nvkelso/natural-earth-vector, fetched 2026-11-13 | public domain | `explore/public/geo/ne_110m_admin_0_countries.geojson` (properties stripped to name/iso), places/countries in `explore/demos/geo/fixture.json` | naturalearthdata.com terms: "public domain … no permission is needed"; credit given anyway |
| USGS ComCat earthquake catalog | 10,000 M2.5+ events 2026-07-06 – 2026-10-31 | public domain (US Government work) | `explore/demos/geo/fixture.json` | source URLs kept per event |
| OpenFreeMap "liberty" style + tiles | online, not bundled | style BSD-3 / data ODbL (OpenStreetMap) + OpenMapTiles attribution | fetched by the browser at runtime | free, no key, commercial use allowed, attribution required and shown in the map |

Not used: the D-Fend Solutions drone incident tracker (its terms forbid copying and scraping; SPEC §22.10). The `tile.openstreetmap.org` servers are not the default (OSMF tile usage policy, SPEC §22.2).

## Phase 1 core loop: graph algorithms (SPEC §23.5)

Every algorithm package is MIT. GPL / AGPL options were rejected on licence grounds: `leidenalg` and `python-igraph` / `igraph` (GPL-2.0+/GPL-3.0), and NetworkX was used only as a test oracle, never shipped. No code was copied from Neo4j Bloom, Graphistry, Linkurious, GraphXR or any other proprietary product. The interaction ideas (expand by relationship type, lasso, mapping a metric to size or colour) are general UI conventions, and their code here was written from SPEC §23.

| Package | Version | License | Used for |
|---|---|---|---|
| graphology-metrics | 2.4.2 | MIT | PageRank (`centrality/pagerank`) |
| graphology-communities-louvain | 2.0.2 | MIT | Louvain communities |
| graphology-components | 1.5.4 | MIT | connected components |
| graphology-shortest-path | 2.1.0 | MIT | unweighted BFS / bidirectional shortest path, Dijkstra |
| graphology-indices | 0.17.1 | MIT | transitive (Louvain / metrics index structures) |
| graphology-utils | 2.5.2 | MIT | transitive (already present, via forceatlas2) |
| mnemonist | 0.39.8 | MIT | transitive (heaps, queues) |
| pandemonium | 2.4.1 | MIT | transitive (random sampling helpers) |
| @yomguithereal/helpers | 1.1.1 | MIT | transitive (graphology-shortest-path) |
| obliterator | 2.0.5 | MIT | transitive (mnemonist) |

Written in this repo from the published papers (no third-party code): **Leiden** (V. A. Traag, L. Waltman, N. J. van Eck, "From Louvain to Leiden: guaranteeing well-connected communities", Sci. Rep. 9, 5233 (2019)): fast local moving, refinement, aggregation. **Betweenness** (U. Brandes, "A faster algorithm for betweenness centrality", 2001), with sampled pivots for large graphs (U. Brandes & C. Pich, "Centrality estimation in large networks", 2007). **Jaccard similarity** and **modularity** (Newman–Girvan) from their definitions. All of this is in `explore/shared/algorithms.js`.

Test-only reference values (`explore/test/fixtures/algo-reference.json`) were generated once by `explore/tools/algo-reference.py` in a throw-away virtualenv. Nothing from it is bundled or imported at runtime. It used NetworkX 3.4.2 (BSD-3-Clause), whose bundled Zachary karate club and Les Misérables data are classic public research datasets, and graspologic-native 1.3.1 (MIT) as an independent Leiden implementation used to compare modularity.

Phase 2 (scale and readability, SPEC §24) adds **no new dependencies**. Map point clustering uses the clustering built into the existing maplibre-gl GeoJSON source (supercluster, ISC, already listed in maplibre's `THIRD-PARTY-LICENSES.txt`). Community grouping uses the existing graphology-communities-louvain (MIT) and the force layout graphology-layout-forceatlas2 (MIT). Written in this repo from the published papers (no third-party code): **force-directed edge bundling** (D. Holten & J. J. van Wijk, "Force-Directed Edge Bundling for Graph Visualization", EuroVis 2009) in `explore/shared/bundling.js`; **squarified treemap** (M. Bruls, K. Huizing, J. J. van Wijk, 2000) and **group-in-a-box** (E. M. Rodrigues et al., 2011) in `explore/shared/layouts.js`; **Web Mercator** projection and Andrew's monotone-chain **convex hull** from their definitions. GPL/AGPL libraries considered for bundling and clustering were rejected.

---

# Third-party licenses added by the integration (studio Explore, Phase 3 and 4)

| Package | Version | License | Used for |
|---|---|---|---|
| n3 | 2.13.12 | MIT | RDF import/export (Turtle, N-Triples), server side |
| 3d-force-graph | 1.80.2 | MIT | optional 3D mode, a lazy browser bundle (explore/public/three-d.js) |
| three | 0.187.0 | MIT | 3D rendering (through 3d-force-graph) |
| three-forcegraph / three-render-objects / kapsule / accessor-fn / float-tooltip / data-bind-mapper | see audit | MIT | 3d-force-graph internals |
| d3-force-3d / d3-octree / d3-binarytree | see audit | MIT | 3D force layout |
| ngraph.forcelayout / ngraph.graph / ngraph.events / ngraph.random | see audit | BSD-3-Clause | alternative 3D layout engine inside three-forcegraph |
| polished / tinycolor2 / preact / lodash-es | see audit | MIT | 3d-force-graph UI helpers |

Java side, downloaded by the setup scripts and never committed or zipped: Apache Kafka 4.3.2, Apache Flink 2.2.1, Duke 1.2, Lucene 4.0.0, Jackson and the other jars listed above, all Apache-2.0. Eclipse Temurin JDK 21 is only a runtime (GPL-2.0 with Classpath Exception). It is not linked into StreamGraph or shipped with it.
The Flink job (explore/flink/build/graph-processor.jar) and the Duke sidecar (explore/er/build/duke-sidecar.jar) are rebuilt from this repo's own source with `npm run flink:build` / `npm run er:build`. Prebuilt jars are never used.

Full machine audit: `npm run audit:licenses` writes LICENSE-AUDIT.txt (212 packages, no GPL/AGPL/LGPL, none unknown).
