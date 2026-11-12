# License audit

Generated from package-lock.json and each installed package.json. Policy: MIT, Apache-2.0, BSD (including 0BSD), ISC, MPL allowed; no AGPL, SSPL, BSL or GPL.

Project license: MIT.

Summary: 0BSD 1, Apache-2.0 6, BSD-3-Clause 1, ISC 3, MIT 19. Disallowed found: none.

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
| pg-cloudflare | 1.4.1 | MIT | runtime |
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
| xtend | 4.0.2 | MIT | runtime |
| yaml | 2.9.1 | ISC | runtime |

Guided view (Nov 12 2026): no new dependencies. It is plain JavaScript, HTML and CSS written for this project (MIT) and reuses cytoscape (MIT) for the result graph.

Non-npm pieces: Node.js built-in node:sqlite (Node is MIT; SQLite is public domain). Screenshots use the Chromium build already on the box (BSD-3-Clause) through playwright-core (Apache-2.0); no browser is bundled in the zip.

Sync-out and access rules (Nov 12 2026): one new runtime dependency, neo4j-driver 6.3.2 (Apache-2.0, the official Bolt driver, also used for Memgraph), which brings neo4j-driver-core and neo4j-driver-bolt-connection (Apache-2.0), rxjs (Apache-2.0), tslib (0BSD), buffer, base64-js, safe-buffer and string_decoder (MIT) and ieee754 (BSD-3-Clause). PostgreSQL output reuses pg (MIT) and Kafka output reuses kafkajs (MIT). The access-rules engine is plain JavaScript written for this project (MIT) and uses no OPA code; the optional OPA adapter only sends HTTP requests to an OPA server you run yourself (OPA is Apache-2.0 and is not bundled). The design follows Hudson's own MIT repo HudsonSuth/youtube-to-training PR #2, read only; no code was copied from it.
