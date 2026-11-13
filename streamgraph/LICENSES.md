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
