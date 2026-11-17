# Markdown wiki (Vault-LD + OKF) in StreamGraph Integrated

A folder of Markdown notes becomes part of the graph. **The files are the source of truth**: the graph is a rebuildable
index of them, and edits always go to the file first. Graph-to-file write-back is **off** (the `wiki.writeBack` flag exists
but is ignored).

## Two dialects, one mapper
| | Vault-LD (folder has a root `context.jsonld`) | OKF v0.2 (no root context) |
|---|---|---|
| A note is | a file with YAML-LD frontmatter (`type` makes it an RDF subject; untyped notes are plain `Note` nodes) | every `.md` except `index.md` / `log.md` (`type` required) |
| Identity | governing `@base` + file name (folders never enter the IRI) or an explicit absolute `id` | bundle path (`/tables/customers`) under `https://streamgraph.local/wiki/<vault>/` |
| Edges | frontmatter `[[wikilinks]]` (field `requiresIngredient` -> `REQUIRES_INGREDIENT`, `type` -> `IS_A`); body links -> `LINKS_TO` (navigational, never RDF) | body Markdown links -> `LINKS_TO` |
| Trust | `sources`, `generated {by, at}`, `verified [{by, at}]`, `status` (draft/stable/deprecated), `stale_after` — read in both dialects |

Graph node ids are `<Type>:<vault>:<name or path>`; every wiki item carries `wiki_vault`, `wiki_path`, `wiki_sha256`,
`wiki_iri`, `trust_tier`, `status`, `stale_after`, `body` (first 20,000 chars), and `wiki_problems` when validation failed.
Unresolved links become `WikiStub` nodes; sources, generators and verifiers become `Source` / `Actor` nodes.

**Trust tier** (display and filtering only, never access control): no `verified` = `unverified`; any = `machine-confirmed`;
verified by a recognised human (only `human:whsutherland` by default) = `human-reviewed`. **Agents can never write a
`human:` actor.** A content change made through the write tools clears earlier verifications. `is_stale` is computed at read time.

## Start
```
node explore/combined.js demo/flow.json --wiki demo/wiki/maritime-kb --wiki demo/wiki/app-docs
STREAMGRAPH_WIKI=/path/to/vault1,notes=/path/to/vault2 npm start
npm run demo:wiki          # seed wiki + scripted MCP agent session, then keeps serving (copies the vaults; repo untouched)
npm run seed:wiki          # regenerate demo/wiki from demo/maritime + this repo (deterministic, rules only)
```
or `explore.config.json`: `"wiki": { "vaults": [{ "dir": "...", "slug": "notes" }], "humans": ["human:whsutherland"],
"humanSubjects": { "owner": "human:whsutherland" }, "agentActor": "grokbot/reverse-engineering-analyst", "watch": true }`.
A file watcher re-imports on change (300 ms debounce); `POST /api/explore/x/wiki/reindex` forces a full deterministic rescan.

## HTTP (`/api/explore/x/wiki/*`, ABAC-filtered like the rest of /api/explore)
`GET vaults | outline?vault= | search?q=&types=&tier=&stale= | note?id= (or vault=&path=) | backlinks?id= | stale | export?vault=&format=turtle|nquads|jsonld|yamlld`
`POST note {vault, path, frontmatter, body, expectedSha}` (write) · `POST verify {id, note}` (recognised human only; "Test as" previews refused) ·
`POST log {vault, text, kind, refs}` · admin: `POST vaults {dir, slug}`, `POST reindex {vault}`, `POST import-rdf {vault, text, format}`.
`GET /api/explore/x/rdf?format=jsonld|yamlld` adds JSON-LD / YAML-LD to the graph-wide RDF export.

## MCP tools (combined app)
Read: `wiki_vaults`, `wiki_outline`, `wiki_search`, `wiki_get`, `wiki_backlinks`, `wiki_stale`, `wiki_export`,
`history_timeline`, `history_at`, `history_compare`, `export_rdf`, `query_cypher`, `schema_to_context`.
Write (only with `mcp.wikiWrites: true` or `mcp.allowWrites: true`): `wiki_write_note`, `wiki_append_log`, `wiki_verify`
(machine confirmation by `mcp.wikiAgent`, default `grokbot/reverse-engineering-analyst`).
All use `mcp.actAs`'s access rules and the same egress filter as the UI. Note text is data, not instructions.

## RDF
`wiki_export` / `GET .../wiki/export`: Vault-LD notes expand as JSON-LD against the composed context (local contexts only;
remote `@context` URLs are refused), with `vld:path` for non-default placement. `POST .../wiki/import-rdf` writes one file
per subject (Vault-LD §5.5), keeps existing bodies and host keys, and flags predicates with no short name.

## Validation
`src/wiki/schemas/okf-concept.v02.json` checks the trust families (and `type` for OKF). A vault can add
`schemas/<Type>.json`: it validates notes of that type **and** (via the `jsonld-from-schema` package at the repo root, the only converter) supplies JSON-LD terms
for fields the vault context does not define. The hint keyword on a schema is one `x-jsonld` object. Problems never block the import; they appear in `wiki_problems` with the JSON pointer.
