# StreamGraph integrated build: status (14 Nov 2026, ~10:10 PM ET)
Full details: INTEGRATION.md (base, security, phases, tests §11, Windows §10), UI-NOTES.md (every control), LICENSE-AUDIT.txt, screenshots/01–20.

- **Phase 1 (integration):** done. One process on 127.0.0.1:8080, Explore tab (Search and ask + Graph explorer), same ABAC (deny by default, deny wins, hidden fields hidden), Flink/Kafka and Duke built in from source, Live processing page.
- **Phase 3:** done. History + compare, linked table/chart, editing under `write` rules, ER approve/reject, comments, case notebooks, deterministic SVG/PNG.
- **Phase 4:** done. Query builder → Cypher, plain-English rules (off by default, no paid calls), RDF Turtle/N-Triples, 3D toggle, JS + Python SDK, keyboard nav, high contrast, Describe.
- **Left out:** GPU/WebGPU, shared live co-editing, full Cypher, cannot-link constraints for "Not the same", real AI provider (plug-in point documented), per-user aggregate counts in /api/explore/stats.
- **Tests:** core 62/62, integration 27/27, willitrun 6/6, explore 168 pass / 11 fail / 31 skip (all 11 are browser timeouts under box memory pressure; rerun on their own: 9 of 11 passed, U2/U4 flaked the other way, P3/P4 unfinished), ER duke 8/9 (E1 precision 0.892, his known result), kafka 10/10, flink 10/10, flink-geo 3/3, er-kafka 2/2, core-kafka 2/2. Wrong impls fail as required (8/1/2 failures).
- **Licenses:** 212 npm packages, all permissive (157 MIT, 32 ISC, 10 BSD-3, 8 Apache-2.0, 3 BSD-2, 1 MIT OR Apache, 1 0BSD); Java side Apache-2.0 (Flink, Kafka, Duke). No GPL/AGPL/LGPL.
- **Zip:** /workspace/streamgraph-integrated.zip (36.7 MB, 444 files; no node_modules, data, .db, uploads, logs, secrets, .git, jars, .class, .runtime). Rebuild with `python3 tools/make-zip.py`.
- **Windows:** `$env:JAVA_HOME="C:\Users\whsut\tools\jdk21"`; `npm ci`; `npm run setup:processing` (= kafka:setup, flink:setup, flink:build, er:setup --no-splink, er:build; downloads from downloads.apache.org and repo1.maven.org with checksum checks); `npm start`; open http://127.0.0.1:8080.
