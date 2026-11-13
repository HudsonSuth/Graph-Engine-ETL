# Plan: OntoSmith as a Documents source in StreamGraph

**Status:** plan only. No StreamGraph code was changed.

**Examined:** OntoSmith [v0.1.9](https://github.com/Dongbumlee/ontosmith/releases/tag/v0.1.9) (`132fbb48bd9016f2e9bf1300a675101132893076`, 7 Nov 2026), cloned to `/workspace/research/ontosmith`, and the matching wheel `ontosmith==0.1.9` installed in a local venv solely to capture `--help`. StreamGraph was read from `/workspace/streamgraph` (`SPEC.md`, `UI-SPEC.md`, `README.md`, `src/sources/`, `src/flow.js`, `src/mapper.js`, `src/graph.js`, `src/studio/`, `src/abac/`, `LICENSES.md`). The same tree is mirrored in [HudsonSuth/Graph-Engine-ETL PR #1](https://github.com/HudsonSuth/Graph-Engine-ETL/pull/1) under `streamgraph/`.

**Authority and method:** Hudson asked for this plan and owns StreamGraph. OntoSmith is a public MIT repository; it was read, not copied into StreamGraph. Every claim about OntoSmith is marked **CONFIRMED** (with a file, line, or public page) or **HYPOTHESIS**. No OntoSmith build that calls a paid LLM was run, and no API keys were used.

**Policy for a later build:** depend on OntoSmith as a separate Python package and process (`pip install ontosmith==0.1.9`). Do not copy its source into the StreamGraph tree. Keep its MIT copyright notice (Dongbum Lee, 2026) in `LICENSES.md`.

---

## Recommendation (short)

Treat OntoSmith as an **external builder**, not as StreamGraph's graph store. The guided "Documents" source should: upload or point at `.txt` files, let the user pick or approve a pack, show a cost preview and a spend cap, then invoke the OntoSmith CLI (`profile`, `ontology`, `batch create` / `batch run`) as a subprocess. After a successful batch, ingest the batch's evidence-carrying records (`judgments.jsonl` / `routed.jsonl`, plus entity ids from the write manifest) into StreamGraph's existing SQLite property graph.

Do **not** read OntoSmith's live Neo4j as the source of truth, and do **not** point StreamGraph's "Send data out" Neo4j output at the same store OntoSmith uses. OntoSmith's store holds one graph and a later batch replaces it; StreamGraph already uses Neo4j as an optional downstream sink. File-export shortcuts (`graph_export.json`, Turtle) and the sample HTTP API are useful complements, not the ingest path.

---

## How claims are marked

- **CONFIRMED** — observed in the v0.1.9 tree, the installed CLI, PyPI metadata, or a cited public page.
- **HYPOTHESIS** — inferred, not directly evidenced, or true of StreamGraph but not yet of the combined system.

---

## 1. How OntoSmith outputs can be consumed

OntoSmith already produces several artefacts after a build. StreamGraph should consume **batch records on disk**, produced by a **CLI subprocess**. The other doors are documented here with their cost if we do not pick them.

### What a finished batch leaves behind (CONFIRMED)

A batch lives under a state-root `batches/<batch-id>/` directory. `ontosmith inspect` accepts a batch directory and looks, in this order, for `judgments.jsonl`, `routed.jsonl`, then `written_triples.jsonl` (`pipeline/inspect.py` lines 9–33).

| Artefact | What it holds | Evidence |
|---|---|---|
| `judgments.jsonl` | Every judged candidate: `doc_id`, `subject`, `relation`, `object`, `quote`, `context`, `method`, optional `subject_type` / `object_type`, then `p_true`, `cost`, `error` | Written at the end of GATES (`pipeline/batch_run.py` lines 1662–1685); candidate shape at lines 891–896 |
| `routed.jsonl` | The same facts after tiering (Tier 1 / 2 / dropped), review and drop queues alongside | `pipeline/batch_run.py` lines 1775–1828 |
| `written_triples.jsonl` | Slim WRITE manifest: `subject_id`, `relation`, `surface_relation`, `object_id`, `doc_id` — **no quote, no `p_true`** | `pipeline/batch_run.py` lines 2261–2266 |
| Registry (SQLite, local) | Source of truth for records, entity ids, ER decisions | `docs/connections.md` lines 400–405; ER apply talks about the registry as source of truth (`pipeline/batch_cli.py` lines 898–900) |
| Neo4j store | `(:Entity)`, `(:Document)`, `(:Chunk)`, `(:Sentence)`, attestation-level `[:REL]` edges, vector and full-text indexes | `pipeline/graph_store.py` lines 17–30, 98–119, 265–338 |
| Example / demo `triples.jsonl` | Inspect-friendly records with `subject`, `relation`, `object`, `quote`, `doc_id`, `tier`, `p_true` | `examples/alder-finch/triples.jsonl`; `README.md` lines 111–122 |
| `results/graph_export.json` | Visualization dump: node id/labels/name and edge src/dst/type, **10,000 cap, no evidence** | `pipeline/export_graph.py` lines 43–66 |
| Turtle (`.ttl`) | Data triples plus RDF reification (`p_true`, `model`, `gate`, `doc_id`); needs the official Neo4j Python driver (`ontosmith[neo4j]`) and a live store | `pipeline/turtle_export.py` lines 1–10 |
| Sample API | `GET /health`, `/search`, `/entity`, `/neighborhood`, `/triple` (one triple with quote and provenance). Default bind `127.0.0.1:8765`. No bulk "list all triples" endpoint | `api/server.py` lines 6–14, 167–184; `docs/serving.md` lines 235–246; installed `ontosmith serve --help` |

The shipped example records can be inspected and served **without Neo4j and without a key** (`README.md` lines 128–130, 564–566; `docs/connections.md` lines 406–409). A **live build** still requires Neo4j (`README.md` lines 90–93, 184–192; "There is no file-based build path", `docs/connections.md` lines 406–409).

Candidate records that reach the judge look like this (fields only, not copied logic):

```text
doc_id, subject, relation, object, quote, context, method, attest?, subject_type?, object_type?
```

(`pipeline/batch_run.py` lines 891–896). After GATES, `p_true`, `cost` and `error` are added (lines 1662–1673).

### Option A — Recommended: CLI subprocess + batch records

**How.** StreamGraph starts `ontosmith` from a project-local virtualenv (or a configured `ONTOSMITH_BIN`). Working directory and state root stay under the StreamGraph data dir (for example `data/ontosmith/`). After `batch run` reaches WRITE, a new Documents source reads `routed.jsonl` (accepted Tier 1, optionally Tier 2) and joins `written_triples.jsonl` for stable `subject_id` / `object_id`. Entities become nodes; each attestation becomes an edge; documents become `Document` nodes. The source emits ordinary StreamGraph change events `{op, topic, data}` and reuses `Differ` (`src/sources/base.js`).

**Why this is the right door.**

1. It is the product interface OntoSmith documents (`README.md` "Commands"; installed `--help`). Profile, ontology approval, cost cap, batch create/run, inspect and rollback are all CLI verbs. StreamGraph should orchestrate those verbs, not reimplement the pipeline.
2. `judgments.jsonl` / `routed.jsonl` carry the evidence spans and provenance StreamGraph must store and hide under ABAC. The slim WRITE manifest and `graph_export.json` do not.
3. StreamGraph already has a property graph (`src/graph.js`). OntoSmith's Neo4j is a **build and serve** store that holds **one graph** and **replaces** it when a later batch is not the same stamped graph (`README.md` lines 551–558; `pipeline/neo4j_store.py` `check_store_write`, lines 296–321). Using that store as StreamGraph's source of truth, or sharing it with "Send data out", will collide (see Option B).
4. A subprocess keeps licensing and process boundaries clean: OntoSmith stays a pip-installed MIT package; its numpy/requests stack never enters the Node license audit; secrets stay in the environment or `data/secrets.json`, never in a settings file (OntoSmith's own rule, `docs/connections.md` lines 51–54).
5. The keyless example path (`examples/alder-finch/triples.jsonl`) can be a first implementation and a fixture, with no Neo4j and no API spend.

**CLI verbs to wrap** (installed `ontosmith --help` and subcommand help, v0.1.9): `configure`, `profile --family … --json <dir>`, `ontology {draft,validate,brief,approve,emit,check}`, `verify project --counts …`, `batch {create,run,status,rollback,er-review,er-decide,er-apply,list}`, `inspect`, and optionally `serve` later for evidence search.

### Option B — Read OntoSmith's Neo4j graph (not recommended as the ingest path)

**What you would get.** The richest live graph: entities with `entity_id`, `name`, `label`, `aliases`, `attr_*` value properties; attestation-level `REL` edges keyed by `{type, batch_id, run_id, doc_id, att_id}` carrying `quote`, `p_true`, `tier`, `tag`, `model`, `gate`, `surface_*`, optional `valid_at` / `invalid_at`; `Document`, `Chunk` and `Sentence` nodes (`pipeline/graph_store.py` lines 217–338). StreamGraph already depends on `neo4j-driver` (Apache-2.0) for sync-out, so a Bolt or HTTP reader is technically cheap.

**Cost of choosing this as the source of truth.**

- **One graph per store, replace semantics.** A write under a different `batch_id` / pack pin / profile hash is `"replace"`: the previous graph is cleared and restamped (`pipeline/neo4j_store.py` lines 296–321, 304–306; `docs/connections.md` lines 481–502). A new document batch is a new batch id (`batch create` is fresh-only and will not overwrite an existing id, `pipeline/batch_cli.py` lines 104–130). So "add three new contracts" can wipe the graph the previous build just wrote.
- **Collision with StreamGraph sync-out.** If the same Neo4j also receives StreamGraph output (`:StreamGraph` nodes, `_key`, `_sg_run` — `SPEC.md` §10), OntoSmith will see "content no stamp identifies" and **refuse to write**, or, if we ever relaxed that, would be at risk of wiping StreamGraph's downstream copy. Conversely, a StreamGraph snapshot/sweep could delete OntoSmith nodes. CONFIRMED that unidentified content is never overwritten (`neo4j_store.py` lines 308–329; `docs/connections.md` lines 494–497). HYPOTHESIS: a shared instance is unsafe without a dedicated database and a documented keep-out rule.
- The store must stay up after the build just to refresh StreamGraph, even though the registry and JSONL already have the facts.
- Chunk and sentence embeddings are for OntoSmith serving, not for StreamGraph's pattern queries. Pulling them in v1 would bloat the SQLite graph for little gain.

**Keep Neo4j, but as OntoSmith's private work store**, on a dedicated local instance or Aura database that StreamGraph sync-out is forbidden from using.

### Option C — Sample API (`ontosmith serve`) (not recommended as ingest)

A good **Explore** complement later (ask a question, show the evidence sentence). It is a poor ingest door: there is no documented export of every triple; `/triple` returns one fact; `/neighborhood` is hop-limited (1–4). You would still need Neo4j or the file store, plus a long-running Python process next to StreamGraph. Default bind is localhost, which is fine, but health and lifecycle become another moving part.

### Option D — File export only, no subprocess (too weak as the only door)

- `written_triples.jsonl` lacks evidence — unusable alone for the ABAC requirement.
- `graph_export.json` lacks evidence and caps at 10,000 nodes/edges.
- Turtle is richer but requires a live Neo4j and `ontosmith[neo4j]`; it is a secondary export, not the batch's source of truth.
- The shipped `triples.jsonl` shape **is** the right interchange for tests and for "I already ran OntoSmith elsewhere; import this file." It should be a supported **import mode**, not the only mode, because a guided user will not produce that file by hand.

### Recommendation

| Mode | Role |
|---|---|
| CLI subprocess + `routed.jsonl` / `judgments.jsonl` + `written_triples.jsonl` (entity ids) | Default Documents source |
| Import an existing `triples.jsonl` or a finished batch directory | Advanced / already-built / test fixture |
| OntoSmith Neo4j | Private build store only, never StreamGraph sync-out |
| `ontosmith serve` | Optional later "Ask the documents" in Explore |
| `graph_export.json` / Turtle | Not used for ingest |

---

## 2. Mapping OntoSmith facts into StreamGraph's property graph

StreamGraph already maps change events to upserts by `(label, key)` and edges by `(type, from, to)` (`SPEC.md` §5; `src/mapper.js`). A Documents source should emit two or three topics and a compiled mapping, the same way the wizard compiles a CSV.

### Proposed topics and mapping

**Topic `os_document` — one record per source file.**

- Node label: `Document`
- Key: OntoSmith `doc_id` (file stem in the examples, e.g. `alder-finch-history`)
- Props: `name` / original file name, `path` (workspace-relative), `sha256` of the bytes StreamGraph ingested, `_pack_id`, `_batch_id`, `_src_<sourceId>`
- Do **not** store full document text on the node by default (see §5).

**Topic `os_entity` — one record per resolved entity.**

- Node label: OntoSmith entity type when present (`subject_type` / registry `label`), otherwise `Entity` or a pack-specific default (`PER`, `ORG`, `Contract`, …)
- Key: stable `entity_id` from the WRITE manifest / registry, **not** the display name (names merge under ER; ids are what WRITE uses)
- Props: `name`, `aliases` (joined or as a JSON string; StreamGraph props are JSON values already), value attributes as `attr_<name>` plus `attr_<name>_surface` / `_unit` / `_currency` / `_precision` when present, `_pack_id`, `_batch_id`, `_src_<sourceId>`

Value attributes are **CONFIRMED**: declared on an entity type in the pack schema front (`docs/PACK_DESIGN.md` lines 415–440); accepted values are stored as typed node properties `attr_<name>` with the original surface beside them. None of the five shipped packs' current payloads actually declare attributes (inventories inspected 12 Nov 2026), but a user-drafted pack may. The mapper should pass `attr_*` through as ordinary properties (`props: '*'` or an explicit allow-list).

**Topic `os_fact` — one record per attestation, compiled with `asEdge`.**

- Edge type: a StreamGraph-safe form of the normalized `relation` (spaces and punctuation folded to a stable token, original surface kept as `surface_relation`)
- From: subject entity; To: object entity; stubs upserted if needed (`src/mapper.js` `asEdge` path, lines 33–42)
- Edge identity in StreamGraph is `(type, from, to)` only (`src/graph.js` line 6; `SPEC.md` §6). OntoSmith's attestation key is richer: `{type, batch_id, run_id, doc_id, att_id}`, and "a fact attested in N documents is N edges" (`pipeline/graph_store.py` lines 265–274).

**This is a real impedance mismatch (CONFIRMED vs StreamGraph).** If two documents both state "Alder & Finch — founded by → Mara Alder", StreamGraph's default edge id would collapse them into one edge and the last quote would win. The plan is:

- Prefer a **per-attestation edge type or key**: either include a short attestation suffix in the StreamGraph edge type (ugly in Explore) **or**, better, keep a single typed edge (`FOUNDED_BY`) and store attestations as a list property, **or** introduce an `Attestation` node `(Document)-[:STATES]->(Attestation)-[:OF]->(fact endpoints)` .
- Recommended v1: emit an **`Attestation` node** keyed by `att_id` (or `doc_id|subject_id|relation|object_id`), with `quote`, `context`, `p_true`, `tier`, `tag`, `model`, `method`, `doc_id`, `batch_id`, `run_id`; plus edges `SUBJECT` / `OBJECT` to the two entities and `IN_DOCUMENT` to `Document`. That preserves one quote per document, lets a document-level delete remove only that attestation, and still lets Explore ask "show people and the organizations they founded."
- HYPOTHESIS: a compact `asEdge` with `doc_id` folded into a synthetic edge type will be harder to query in the guided question builder, which thinks in "type — connection — type" (`UI-SPEC.md`).

**What not to import in v1:** `Chunk` and `Sentence` nodes and their embeddings. They exist for OntoSmith's sentence-level search (`README.md` serving; release 0.1.9 notes). StreamGraph has no vector index yet (`README.md` "Next steps" RAG item). Revisit if we add "Ask the documents" via `ontosmith serve` or sqlite-vec.

**Provenance fields to keep on attestations:** `quote`, `context`, `p_true`, `tier`, `tag`, `doc_id`, `model`, `gate` / `gate_model`, `method`, `surface_relation`, `batch_id`, `run_id`, `attest` / `att_id`. `p_true` is "the judge's ranking score … not a calibrated probability" (`README.md` lines 124–126) — the UI should say "confidence score", never "probability."

**Tier policy (product choice, default stated):** ingest Tier 1 (written, `tag=VERIFIED`) by default. Offer "Include lower-confidence facts" for Tier 2. Do not ingest dropped or review-queue rows as graph facts; surface review-queue / ER-hold counts in the source's health note.

**Entity resolution across sources.** Once document entities are in the graph, "Connect your sources" can suggest matches between e.g. `Person` / `ORG` and a spreadsheet `Customer` on `name`, using the existing ignore-case rule (`UI-SPEC.md`; `src/studio/compile.js` `RULES`). This will not match on OntoSmith `entity_id` versus a CRM id. The user has to pick the name (or another shared field). HYPOTHESIS: overlap scores on free-text names will be weaker than on customer ids; the confirm-and-preview step already exists to catch that.

---

## 3. How ontology packs relate to StreamGraph schemas

They are cousins, not the same object.

| | OntoSmith pack | StreamGraph schema |
|---|---|---|
| What it is | A versioned, sha256-pinned **extraction contract**: entity and relation types, definitions, boundary examples, thresholds, conformance record | The **live graph shape**: node labels, edge types, property names and counts actually stored (`SPEC.md` §6–7) |
| Formality | Deliberately flat; no class hierarchy, no OWL, no inference (`README.md` lines 44–64) | Also a flat property graph; no reasoning |
| When it changes | A payload edit is a new `pack_version`; the loader fail-closes on a pin mismatch (`docs/PACK_DESIGN.md` §1.2, §1.4) | Labels and properties appear as records arrive; new types auto-register in ABAC as "not reviewed" (`README.md` Access rules) |
| Composition | One active pack per family in format 1; two packs that disagree on a type may not both be active (`docs/PACK_DESIGN.md` §1.3) | Many sources can contribute to one label; "Connect your sources" merges by key |

**Shipped packs (CONFIRMED, `README.md` lines 393–409 and the v0.1.9 `packs/*/pack.json` payloads):**

| Pack | Version in 0.1.9 | Inventory observed in the payload |
|---|---|---|
| Core (`core`) | 0.5.0 | Domain-neutral baseline (thresholds, framing). No entity/relation inventory in `packs/core/profile/setup_config.json` |
| Open Domain (`open-domain`) | 0.10.0 | 6 entity types (`PER`, `ORG`, `LOC`, `TIME`, `NUM`, `MISC`) and 96 relations (Wikidata-style surfaces such as `head of government`) |
| Legal Contract (`legal-contract`) | 0.2.0 | 41 label categories (relations such as `Agreement Date`, `Cap On Liability`); measured on CUAD |
| FIBO Contracts (`fibo-contracts`) | 0.1.0 | 15 entity types and 13 relations imported from FIBO (EDM Council, MIT); status `emitted_unmeasured` |
| Bio Medical (`bio-medical`) | 0.3.0 | 6 entity types (`GeneOrGeneProduct`, `DiseaseOrPhenotypicFeature`, …) and 8 relations; measured on BioRED |

A pack is data, not a code branch (`README.md` line 398). Domain packs declare capability **tiers** (proposer / judge / escalation), never model names (`docs/connections.md` lines 39–43).

**How StreamGraph should use a pack.**

1. **Pick a shipped pack** → the wizard's "what is this data about" step is pre-filled from that pack's entity inventory (or label categories). Those names become StreamGraph node labels and, after ingest, ABAC entity types.
2. **Draft a pack from this corpus** → `ontosmith profile` (keyless) then `ontosmith ontology draft / validate / brief / approve / emit`. StreamGraph must not skip `approve`. A draft ships with `status: DRAFT_NOT_APPROVED`; approval is a separate record (`docs/PACK_DESIGN.md` lines 380–381). Only after emit does a batch run under that pack.
3. **Import an ontology the user already has** → `ontosmith ontology import` (Track 4). Optional later; not needed for v1.
4. After ingest, StreamGraph's live schema is the **subset actually written** (plus `Document` and `Attestation`). Pack types with zero extracted instances simply will not appear, which matches how other sources work.

**Do not** try to run two document sources under two conflicting packs into one StreamGraph project in v1. OntoSmith itself defers multi-pack composition (`docs/PACK_DESIGN.md` §1.3). One Documents source, one pack, one batch lineage per project is the v1 rule. A second structured source (CSV, API) is fine; that is federation, not a second extraction ontology.

**`quickstart`** builds one text file under the open-domain pack and serves it (installed `ontosmith quickstart --help`). The wizard may offer that as "Quick start on one file," but the default guided path should still show the pack choice and a cost cap.

---

## 4. Wizard UX for a non-technical user

Today the add-source wizard has five kinds: Spreadsheet, JSON file, Web API, Database, Live feed (`public/studio.js` `KIND`; `src/studio/compile.js` `sourceStep`; `src/studio/api.js` `KINDS = ['csv','json','api','database','stream']`). Add a sixth card: **Documents**.

Suggested steps (plain words; engine terms in parentheses for implementers only):

1. **Pick Documents.** Copy: "Turn contracts, notes or other text into things and connections in your graph, with a quote for every fact."
2. **Add your files.** Upload one or more files into `data/uploads/` (existing upload API). OntoSmith's profiler and batch path accept a **directory of `.txt` documents**, recursively (`ontosmith profile --help`; `pipeline/profiler.py` lines 39, 100–101; hands-on examples use `*.txt`). **CONFIRMED: no PDF or DOCX reader ships in v0.1.9.** The wizard should say so, and v1 should either accept `.txt` only or convert PDF/DOCX to text **inside StreamGraph** before calling OntoSmith (conversion is StreamGraph work; libraries must stay on the MIT/Apache/BSD list). Reject empty folders the way `profile` does (nothing written on refusal).
3. **Look around (free, no key).** Run `ontosmith profile --json` on the upload folder. Show the report card: document count, decision points, profile hash, spend $0 (`README.md` lines 100–109; profiler is deterministic and keyless, `docs/connections.md` lines 533–534).
4. **Pick a vocabulary (pack).** Cards for Open Domain, Legal contracts, Biomedical, "Start simple" (Core), and "Draft one from these documents." Short descriptions from the pack `display_name` / `scope`. If the user drafts: show the brief, the type list, and an explicit **Approve** button that calls `ontology approve` then `emit`. No silent approval.
5. **Cost preview and cap, before any paid step.** This needs care, because the v0.1.9 CLI does not do what the README's "prices itself before it spends" line might suggest:
   - **CONFIRMED:** `ontosmith verify project` in 0.1.9 is a **counts-only** printer. Installed help is `verify project --counts COUNTS [--scenario SCENARIO]`. The implementation "does not price"; "Pricing a workload is the caller's own arithmetic, outside the product surface" (`harness/verification/verify_cli.py` lines 160–175; `docs/hands-on-appendix.md` lines 56–81). The module docstring still mentions `--unit-cost`, but that flag is not on the shipped parser.
   - **CONFIRMED**, as illustration only, not a quote for the user's corpus (`README.md` lines 198–200): the flagship reference run (500 docs, 26,938 pairs, OpenRouter reference profile, 21 Oct 2026) spent a governing **$18.80**, about **$0.0376 per document**; judging alone was $0.0360/doc on that build and was projected at **$0.0701/doc** for the shipped default pair counts (52,463) at the same per-pair rate ($0.0006683/pair). Ledger total $18.68. Stop-line on that run: $21.00 (`docs/whitepaper.md` §5.6 table, lines 806–828).
   - **CONFIRMED:** a USD stop-line exists only if `ONTOSMITH_MAX_COST_USD` is set; unset or `none` means no cap, but the ledger still records spend (`README.md` lines 475–490; `docs/connections.md` lines 189–197). A missing key or down Neo4j refuses **before** paid stages (`README.md` lines 190–192, 217–219).
   - **Wizard rule:** never start `batch run` without a cap the user typed (or accepted from a suggested default). Show a plain sentence such as "The last published full build of a 500-document research corpus cost about four cents a document in model fees, and a denser default setting was projected at about seven cents, judging only. Your documents will differ. Set a maximum you are willing to spend. If the run would cross it, it stops and can be resumed." If we can count candidate pairs cheaply (the whitepaper counted "from the real rosters before spend", line 819–821), multiply by a rate the user supplies or a published OpenRouter rate and show that number as an estimate. If we cannot count without a paid roster pass, say so honestly and lean on the cap. **HYPOTHESIS:** a reliable zero-spend pair census is not a one-command door in 0.1.9; this is a Phase 1 spike.
6. **Connections (keys and Neo4j).** Only after the user wants a live build. Store `OPENROUTER_API_KEY` (or a custom base URL + key) in `data/secrets.json` like other sources; never echo it back. Probe Neo4j the way OntoSmith does (HTTP at `NEO4J_URL`, default `http://localhost:7474`). "Test connection" already returns a plain sentence (`UI-SPEC.md`). Offer "I already built a graph in OntoSmith — import the folder or a triples file" as an escape hatch that skips spend.
7. **Name, save, and run.** Compile to a new source kind `documents` (see §10). Health: amber while profiling or while a batch is running (show stage: "Reading documents", "Judging facts", "Writing the graph"); green when ingest is current; red on a named refusal (missing key, Neo4j down, cap hit, pack failed to load). If OntoSmith holds ER pairs for a human, go amber with "A few names need a yes-or-no: are these the same person?" and a short settlement screen wrapping `batch er-review` / `er-decide` / `er-apply`.

The advanced flow editor can show the compiled `documents` step; guided-view saves still overwrite Advanced (`UI-SPEC.md`).

---

## 5. ABAC: sensitivity of evidence text

StreamGraph already masks properties everywhere Explore, export and sync-out look (`SPEC.md` §11; `src/abac/engine.js`, `guard.js`). New types and fields auto-register as **not reviewed**, which needs clearance 3 (`README.md`; `NEEDS.unclassified = 3` in `engine.js`). Hidden values become `[hidden]`; a hidden key becomes a stable `anon-…` pseudonym.

**The risk.** Evidence quotes and the surrounding `context` window are often the most sensitive thing in a documents source (contract clauses, medical sentences, personal names in running text). If we only rely on "not reviewed," an Owner (clearance 3, today's only real login) sees everything, and a future clearance-3 analyst would also see every quote once someone marks the type Public and forgets the fields.

**Plan.**

- On first ingest, register entity types from the pack as usual (level and tags left for the user), but **pre-set field sensitivity**:
  - `quote`, `context`, and any full-text property: **high** (clearance 3 only), and tag the `Attestation` and `Document` types so they can be ruled on as a group (for example a tag `evidence` or `source-text`).
  - `p_true`, `tier`, `relation`, `name`, `doc_id`, ids: **low** or **medium**, unless the name itself is sensitive in that domain (biomedical / legal — leave names **medium** by default).
- Apply the same `maskProps` path to attestation nodes and to fact edges, so a hidden quote cannot be searched (`graph.search` must not match `[hidden]` or the underlying text — today search skips `_*` keys but would match a visible quote; `src/graph.js` `search`). Add tests that a clearance-1 "Test as" user can see that a fact exists (subject, relation, object) but not the sentence, and that CSV / Cypher / sync-out carry `[hidden]` for `quote` / `context`.
- Do not put raw document text on a node that is easy to export wholesale. If we later add a "view source document" action, it is an `export` or a dedicated action and must go through the engine.
- Sync-out: a quote the "send as" user may not see is masked or the attestation is sent as a delete, same as other hidden fields (`README.md` sync-out + ABAC). Downstream Neo4j must not become a back door around StreamGraph rules.
- Honest UI copy on Access rules: "Quotes from your documents start hidden from everyone below clearance 3. Mark them if that is too strict or not strict enough."

HYPOTHESIS: relationship types currently get default attributes (level 0, no tags) when first seen (`README.md` known gaps). If v1 used `asEdge` and put `quote` on the edge, those edge fields must be registered too; the Attestation-node design makes this a normal node-field problem, which the schema viewer already handles.

---

## 6. Incremental updates, resync, and reset

### What OntoSmith itself does (CONFIRMED)

- `batch run` **resumes a crashed or capped run** from stage checkpoints and the ledger; it does not re-spend completed work (`pipeline/batch_run.py` lines 4, 3163–3172; `README.md` lines 486–490).
- `batch create` is **fresh-only**. An existing batch id is refused; the user must resume that batch or create a new id (`pipeline/batch_cli.py` lines 104–130).
- A later WRITE under a **different** batch / pack pin / profile hash **replaces** the Neo4j graph; the registry keeps history (`pipeline/neo4j_store.py` lines 296–321; `docs/connections.md` lines 481–502). The same batch and pin is an idempotent rewrite (`"same"`).
- Identity-seat verdicts are ledgered and reread on rebuild so completions stay stable (`docs/connections.md` lines 284–289).
- No CLI verb was found that means "add these new files to the graph already in the store without a new batch." **HYPOTHESIS, with strong support:** incremental corpus growth is a **new batch**, which replaces the OntoSmith Neo4j graph. StreamGraph must not rely on that Neo4j graph to remember the previous corpus.

### What StreamGraph should do

**Watermark the corpus, not Neo4j.** Keep `data/ontosmith/corpus/` (or the upload folder) plus a manifest of `doc_id → sha256`. On each poll or "Run again":

1. If no file changed and the last batch is complete, do nothing (green).
2. If files were added, changed or removed, **do not silently spend**. Show a preview: "3 documents changed. This will start a new extract. Set or confirm the spend cap."
3. Create a **new batch id**, run it, then **diff attestations** into StreamGraph with `Differ` (or an attestation-keyed differ): new facts `c`, changed quotes `u`, attestations whose `doc_id` disappeared or whose fact left Tier 1 `d`. Because we store one `Attestation` node per `att_id` / document, deleting a document removes only that document's quotes. Entity nodes linger if other attestations still reference them; if none do, delete the entity (like mapper `ownsLifecycle`).
4. A changed pack or a "Start the extract over" button wipes this source's nodes/edges in StreamGraph (not other sources) and re-ingests the new batch.

**Keep in sync** for documents is therefore "re-check the folder on this interval, but a new extract needs confirmation if it would spend money." Default: do not auto-spend.

### Reset ("Start a new project")

Today `resetProject` stops pipelines, clears the graph, wipes uploads, workspace, secrets (except it currently also clears sinks/secrets entirely), and access rules (`src/studio/api.js` lines 243–250; `README.md` Start a new project). Original files outside the workspace are not touched.

Extend it:

- Also delete `data/ontosmith/` (profiles, batches, corpus copies, bindings file if we wrote one there).
- **Do not** automatically wipe the user's Neo4j. It may be a shared install, and OntoSmith will refuse to overwrite an unstamped graph. Offer a separate, clearly labelled "Also clear the OntoSmith graph store" that runs only if we wrote the OntoSmith stamp, and say that StreamGraph outputs in another database are untouched.
- The confirmation list should mention: uploaded documents, extract results, saved model keys, and (if chosen) the OntoSmith graph store.
- Kafka / sync-out caveats stay as they are (fresh topic after reset, etc.).
- Backup (`GET /api/studio/backup`) should include workspace settings and the StreamGraph graph, still without secrets; include pack id and batch id so a restore knows what was connected. OntoSmith batch artefacts can be large; v1 can omit the raw JSONL from the backup and say so, or zip them separately.

---

## 7. Runtime on a Windows desktop, no Docker

StreamGraph itself is already aimed at native Windows, Node 24, no Docker (`README.md` Windows). OntoSmith is not.

**OS (CONFIRMED).** "Linux (developed and tested on Linux). Windows: run under **WSL2** — native Windows is not a tested platform" (`README.md` lines 84–86). Neo4j setup docs treat the Linux instructions as the WSL2 route as well (`docs/connections.md` lines 415–419). Docker is **not** required for Neo4j; a tarball / native install or Aura is enough (`docs/connections.md` lines 411–430, 448–454).

**Plan for Windows users.** The Documents source is supported on Windows **through WSL2** (Python 3.11+, `pip install ontosmith`, Neo4j 5.x inside WSL or on the Windows host reachable at `localhost:7474`). Native Windows Python is an untested experiment: if we try it, we label it that way and still prefer WSL for anything we ship. The rest of StreamGraph stays native. The wizard should detect a missing `ontosmith` on `PATH` / WSL and show install steps, not a stack trace.

**Python (CONFIRMED).** `requires-python = ">=3.11"` (`pyproject.toml`). Core pip dependencies are `numpy` and `requests` only. The official Neo4j Python driver is an extra (`ontosmith[neo4j]`) used by export utilities; "the build itself talks to Neo4j over HTTP and needs the server, not the extra" (`README.md` lines 221–224). Optional extras: `viz`, `rerank` (`sentence-transformers`, local, no API). No local NLP stack; GLiNER+spaCy was retired 29 Oct 2026 (`README.md` lines 173–183; `docs/connections.md` lines 34–37, 330–332).

**Neo4j (CONFIRMED).** 5.x, Community Edition is enough. OntoSmith does not bundle Neo4j. Env: `NEO4J_URL` (default `http://localhost:7474`), `NEO4J_USER` (`neo4j`), `NEO4J_PASSWORD` (required, env only). Aura is supported via the Query API. Licensing: Community Edition is GPLv3; OntoSmith requires no Enterprise-only feature; the official Python driver is Apache-2.0 (`docs/connections.md` lines 504–508). StreamGraph must not bundle Neo4j CE. A dedicated local database or a small Aura instance used only as OntoSmith's work store is the safe layout (see §1).

**LLM connection (CONFIRMED).** Needed for ontology draft (drafting seat), live `batch run`, and embeddings/index. Not needed for profile, inspect, ontology validate/brief/approve, verify math, or reading shipped examples (`docs/connections.md` lines 528–544).

Seats and the **reference preset** (OpenRouter `https://openrouter.ai/api/v1`, one key reaches every seat including Jev):

| Seat | Reference model | Role |
|---|---|---|
| Proposer | `anthropic/claude-haiku-5.5` | Extracts candidates; never decides |
| Judge | `typesafe/jev-1.13` | Pinned Jev gate (see §8) |
| Escalation | `anthropic/claude-sonnet-5.5` | Shaky-band / evaluation; does not decide a build's triples |
| Drafting | unbound until the user sets one | Schema drafting only |
| Embedder | `openai/text-embedding-3-large` | INDEX and search embeddings; no local fallback |

(`README.md` lines 423–436; `pipeline/reference_profile.py` lines 36–53; `docs/connections.md` lines 316–371.)

Custom bindings: any **OpenAI-compatible** base URL (including a local server) via `ontosmith configure`. Dialects: `openrouter` or `openai`. Native Anthropic/OpenAI/Azure dialects are "planned additions, not shipped" (`docs/connections.md` lines 389–396). Rebinding the judge is allowed in code but is a **custom binding**: shipped calibration and the published quality record do not carry over (`docs/connections.md` lines 216–229, 342–345). API keys are env values, never settings file values.

**Rough cost (illustration, not a quote).** See §4 and `docs/whitepaper.md` lines 806–828: about **4 cents per document** all-in on the 500-doc flagship reference run; about **7 cents per document** projected for judging under the shipped default pair density; pair judging **~$0.00067 per candidate pair**. Jev 1.13 list price on OpenRouter (12 Nov 2026): **$0.042 per 1M input tokens, output free** ([OpenRouter model page](https://openrouter.ai/typesafe/jev-1.13)). Proposer and embedder prices are whatever OpenRouter (or the user's provider) charges for Haiku 5.5, Sonnet 5.5, and `text-embedding-3-large` at run time. The user should set `ONTOSMITH_MAX_COST_USD`. Four short demo `.txt` files are described as "cents of model spend" (`docs/hands-on.md` around lines 298–301).

**Embeddings.** There is no local embedder fallback; a missing embedder key fails closed where embeddings are required (`docs/connections.md` lines 510–521). A build's INDEX stage needs the embedder. If we skip importing chunks/sentences, StreamGraph ingest still depends on the **build** having finished INDEX/VERIFY if we run a full batch; HYPOTHESIS: we should confirm whether WRITE (facts in `routed.jsonl` / `written_triples.jsonl`) is usable even when INDEX is skipped or failed. Until confirmed, plan to run the full batch, which means an embedder key is part of a live build.

---

## 8. The Jev decision model

**What it is (CONFIRMED from OntoSmith).** Jev is the **judge** seat: the decision model that "judges what is true enough to write." Models propose; deterministic gates and Jev decide; nothing is written on the proposer's say-so alone (`README.md` lines 13–33, 298–306). OntoSmith calls it a **pinned product component**, not a bake-off winner. The shipped binding is the model id `typesafe/jev-1.13`, reached through OpenRouter's **decisions** and **systemone** routes, not the chat completions route (`docs/connections.md` lines 211–219, 360–387; `pipeline/reference_profile.py` lines 36–53: `DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions"`, `SYSTEMONE_URL = …/systemone`, `JUDGE_MODEL = "typesafe/jev-1.13"`). The client is a thin HTTP wrapper (`pipeline/decisions.py` lines 1–12). Thresholds and the review band are calibrated to this model; changing the shipped binding is a product release decision. Users can override the seat, but the run is recorded as `custom` and published numbers do not apply.

**Is it bundled or downloaded? (CONFIRMED.)** It is **not** in the OntoSmith wheel. `pyproject.toml` core dependencies are only `numpy` and `requests`. There are no model weights, no Jev binary, and no download step in the tree. Under the preset, "OpenRouter serves the pinned model `typesafe/jev-1.13`" with the **same `OPENROUTER_API_KEY`**; "There is no separate Jev account, key, or signup" (`docs/connections.md` lines 360–371). A default install with that one key set reaches every seat, the judge included.

**What the public Jev API is (CONFIRMED, OpenRouter, fetched 12 Nov 2026).** [Jev 1.13 on OpenRouter](https://openrouter.ai/typesafe/jev-1.13) describes Jev as a structured decision model from **TypeSafe**, the first of its System One models. It returns typed decisions (noul / choice / score), not free-form text. It is hosted by TypeSafe as the sole provider on OpenRouter. List price: $0.042/M input, output free; 262k context. Calls go to `POST https://openrouter.ai/api/alpha/decisions` or `POST https://openrouter.ai/api/v1/systemone`. OpenRouter's docs treat access as "anyone with an OpenRouter API key."

**License (split clearly).**

- **OntoSmith** (the Python package, packs as data, this pipeline): **MIT**, Copyright (c) 2026 Dongbum Lee (`LICENSE`; `pyproject.toml` `license = "MIT"`). NOTICE lists third-party **dataset** terms (Re-DocRED, CUAD, FIBO, BioRED, Gutenberg, etc.). It does **not** mention Jev or TypeSafe (NOTICE read in full).
- **Jev the model:** **not** covered by OntoSmith's MIT license. It is a hosted TypeSafe service billed through OpenRouter (or TypeSafe directly — not examined beyond OpenRouter's public page). Weights are not shipped, and the OpenRouter page does not offer a download or an open-source license. **HYPOTHESIS pending TypeSafe's own terms:** the weights are closed and use is under TypeSafe / OpenRouter API terms. A lawyer should read those terms before a commercial StreamGraph offer that defaults to this judge. A custom judge binding avoids Jev but also leaves the published quality record behind.

**Product implication.** The wizard must say that, in the recommended setup, **document text (evidence windows) is sent to OpenRouter / TypeSafe and to the proposer and embedder providers** to extract and judge facts. That is a data-residency and confidentiality issue, especially for legal and medical packs. There is no default fully-offline live build.

---

## 9. Risks and unknowns

### Top risks (also listed in the hand-off)

1. **Windows + operational weight.** OntoSmith is untested on native Windows and expects WSL2, Python 3.11+, a running Neo4j 5.x, and a paid LLM key for any live build. StreamGraph's current bar is "unzip, Node 24, no Docker." A Documents source that silently assumes all of that will feel broken. Mitigation: WSL-first install guide, preflight probes with named remedies (OntoSmith already names missing keys and a down store), and an import-only path that needs none of it.
2. **Cost and the weak official preview.** Live builds spend real money (order of several cents per document in the published reference run, more if pair density is higher). v0.1.9 `verify project` does not price a folder and does not count pairs by itself. If the wizard hand-waves this, users will overspend or distrust the product. Mitigation: mandatory cap, honest "your corpus will differ" copy, a Phase 1 spike to count pairs before spend, never start `batch run` unattended.
3. **Neo4j "one graph" vs StreamGraph sync-out, plus no incremental add-docs.** Sharing one Neo4j between OntoSmith and "Send data out" can refuse a build or wipe a graph. Adding documents is a new batch that replaces OntoSmith's store. Mitigation: dedicated work store; StreamGraph owns the durable federated graph; attestation-level ingest and diff as in §6.

### Other risks

- **Confidential documents leave the machine** under the reference preset (proposer, Jev, escalation, embedder). Mitigation: warning, optional custom/local bindings, no silent default to a cloud key on a legal/medical pack without a checkbox.
- **Jev is a proprietary API**, not an MIT component. Pricing, availability, and terms can change (`typesafe/jev-1.14` already exists on OpenRouter; OntoSmith pins `1.13`). Mitigation: pin the documented model id; record the binding on each batch; do not vendor or rebrand Jev.
- **Edge identity mismatch** (OntoSmith attestations vs StreamGraph `(type,from,to)`). Mitigation: Attestation nodes in v1 (§2). A wrong implementation that collapses attestations must fail tests (§10).
- **Corpus format.** Only `.txt` in v0.1.9. Users will try PDFs. Mitigation: say so; optional StreamGraph-side conversion later.
- **Alpha product.** OntoSmith 0.1.9 classifiers include "Development Status :: 3 - Alpha" (`pyproject.toml`). Packs, APIs and CLI flags can still move. Pin `ontosmith==0.1.9` and re-measure on upgrade.
- **ER holds and human approval** can stall a guided user mid-build. Mitigation: plain-language settlement UI; do not hide holds inside a log file.
- **License hygiene for sale.** MIT notice for OntoSmith; do not copy code; do not bundle Neo4j CE (GPLv3); FIBO is MIT but "FIBO" is a trademark (`NOTICE`); CUAD text is CC BY 4.0 and must not be redistributed from our repo if we only used it in examples. StreamGraph marketing should not imply Jev, Neo4j Enterprise, or FIBO endorsement.
- **No real StreamGraph login yet.** Everyone on the box is Owner. Evidence masking is still worth doing (exports, "Test as", sync-out) but is not a multi-user boundary until OIDC lands (`README.md` known gaps).

### Unknowns to close in Phase 1 (no paid calls required for most)

- Can candidate pairs for a user corpus be counted with zero spend (deterministic roster only), or does the roster pass always bill (~$0.0012/doc in the flagship table)?
- Is `routed.jsonl` complete enough to ingest after GATES/ROUTE if WRITE or INDEX fails (e.g. Neo4j down after judging)? Preflight today refuses before paid stages if Neo4j is down, so a normal run should not get that far — but a WRITE failure after spend should still leave judgments on disk.
- Exact `att_id` function and whether `written_triples.jsonl` can be joined back to quotes via `(subject, relation, object, doc_id)` alone (surface names vs ids after ER).
- Legal-contract pack: how entity types are named in the graph when the payload's visible inventory is 41 relation-style label categories.
- Behaviour of OntoSmith on native Windows (untested upstream).
- TypeSafe / OpenRouter terms for Jev (data retention, training, zero data retention). OpenRouter lists ZDR for some models; not verified here for this id.
- Whether a dedicated Neo4j **database** (not a second instance) is enough isolation from StreamGraph sync-out.

---

## 10. Phased steps and tests

No phase copies OntoSmith source. Each phase ends with tests, including the project's usual pattern: a **deliberately wrong implementation** that the suite must fail, with a saved run (`test/wrong-*.test.js`, `STREAMGRAPH_*` env flag), matching `wrong-impl`, `wrong-matcher`, `wrong-reset`, and `wrong-abac`.

### Phase 0 — Import path only (no subprocess, no Neo4j, no keys)

- Add a library module that reads the inspect-friendly JSONL shape (`subject`, `relation`, `object`, `quote`, `doc_id`, `tier`, `p_true`) and the richer `routed.jsonl` + `written_triples.jsonl` pair, and emits StreamGraph events for `os_document`, `os_entity`, and `os_fact` / `Attestation`.
- Fixture: `examples/alder-finch/triples.jsonl` (seven triples; `README.md` lines 111–122). Keep a **copy of the fixture in StreamGraph tests**, or read it from a path the developer points at; do not vendor the rest of OntoSmith.
- Mapping tests: "Alder & Finch" and "Mara Alder" are one node each after two "founded by" triples; each triple's quote is retrievable; `doc_id` is on the attestation; pattern query "studio — founded by — person" returns both founders.
- **Wrong implementation (`STREAMGRAPH_DOCS=collapse-attestations`):** merge all attestations of the same (subject, relation, object) into one edge/node and drop `doc_id`. Tests must fail when two documents attest the same fact or when deleting one document would remove the other document's quote. Save the run as `test/broken-docs-attest-run.txt`.

### Phase 1 — Subprocess wrapper and preflight (still no paid calls in CI)

- `DocumentsSource` extends `Source` (`src/sources/base.js`): config includes corpus dir, pack id, batch id, `ontosmith` binary, state root, import-only flag.
- Spawn CLI with a **fake binary** in unit tests (the same idea as the fake Kafka consumer). The fake prints the canned profile card, writes a fixture batch directory, and exits 0. A second fake exits 2 with OntoSmith's "Neo4j unreachable" wording; the source must surface that as a red health note and must not mark the graph complete.
- Register kind `documents` in `SOURCES` / `KINDS` / wizard `KINDS`.
- Spike (local, still no keys in CI): can we count pairs with zero spend? Record the answer in this plan or a short follow-up note.
- LICENSES.md: add OntoSmith MIT, Copyright (c) 2026 Dongbum Lee; state that the package is a subprocess dependency, not bundled source; note Jev and Neo4j are **not** covered by that MIT and are not shipped.
- Pin `ontosmith==0.1.9` in a short `docs/ontosmith.md` install page (WSL2, Python, Neo4j, key, cap).

### Phase 2 — Guided wizard

- Documents card, upload, `.txt` validation, profile (fake in tests), pack picker, explicit approve for drafts, cap field, secret storage, "import an existing batch" path.
- Tests: wizard HTTP API refuses a live run with no cap; does not return the API key to the browser; compileWorkspace emits a `documents` step; uploaded non-`.txt` is rejected with a plain sentence (until a converter exists).
- **Wrong implementation (`STREAMGRAPH_DOCS=auto-approve`):** draft packs are emitted without `ontology approve`. A test that starts from a draft fixture must fail if a batch is created under that pack. Save `test/broken-docs-approve-run.txt`.

### Phase 3 — ABAC on evidence

- Default sensitivity for `quote` / `context` as in §5; "Test as" and Explore / CSV / Cypher / sync-out tests.
- **Wrong implementation (`STREAMGRAPH_DOCS=quotes-visible`):** leave `quote` as `low` or unregistered in a way that bypasses the default, so a clearance-1 user sees the sentence. The suite must fail. This can be a flag in the documents ingest defaults rather than a new engine break. Save `test/broken-docs-quote-run.txt`.

### Phase 4 — Resync and reset

- Corpus hash manifest; changed files require confirmation; new batch id; attestation-level `c/u/d`; source-scoped wipe on pack change.
- Reset deletes `data/ontosmith/` and uploads; does not wipe Neo4j unless the user opts in; confirmation text lists the new artefacts.
- Tests: removing one `.txt` and re-ingesting a fixture batch drops only that document's attestations; a project reset leaves no corpus or batch files under the data dir; in-flight "batch run" is stopped and late events are dropped (reuse reset tests' `closed` queue behaviour in `src/flow.js`).
- **Wrong implementation (`STREAMGRAPH_DOCS=sticky-corpus`):** reset clears the StreamGraph graph but leaves `data/ontosmith/` and the source running, so facts come back after reset (same bug pattern as `STREAMGRAPH_RESET=broken`). Must fail. Save `test/broken-docs-reset-run.txt`.

### Phase 5 — Optional later

- StreamGraph-side PDF/DOCX to `.txt`.
- "Ask the documents" via `ontosmith serve` (localhost only).
- Name-based "Connect your sources" suggestions between document entities and structured sources, with preview.
- Live integration test behind a manual flag, never in default CI, and never with this agent's keys.

**CI:** default `npm test` stays keyless and Neo4j-free. Do not call paid APIs in CI.

**Repo:** implement in `/workspace/streamgraph` first, then land on `HudsonSuth/Graph-Engine-ETL` beside the existing `abac/` tree the same way PR #1 did — only when Hudson wants that update. Do not merge without his OK.

---

## Licensing (for LICENSES.md and for a possible sale)

| Piece | License / terms | How we use it |
|---|---|---|
| OntoSmith 0.1.9 | MIT, Copyright (c) 2026 Dongbum Lee (`LICENSE`, `pyproject.toml`) | Subprocess / pip dependency. Keep the copyright and permission notice in `LICENSES.md`. Do not copy `pipeline/` into StreamGraph. |
| OntoSmith NOTICE datasets | Re-DocRED (MIT / Wikipedia CC BY-SA), CUAD (CC BY 4.0), FIBO (MIT, "FIBO" trademark of EDM Council), BioRED (source terms), Gutenberg (public domain), etc. | Do not redistribute those corpora. Demo fixtures should use OntoSmith's self-authored example texts (`examples/`, NOTICE: "self-authored… contain no third-party text") or Hudson's own documents. |
| Jev (`typesafe/jev-1.13`) | Hosted TypeSafe model via OpenRouter; **not** MIT, not in the wheel | Default judge only if the user supplies a key and accepts the warning. Do not vendor, rename, or imply we ship Jev. |
| Neo4j Community 5.x | GPLv3 (upstream). Not bundled by OntoSmith or by us | User-installed or Aura. Do not ship CE inside a StreamGraph installer. |
| neo4j Python driver | Apache-2.0 | Optional extra; StreamGraph already uses neo4j-driver (JS, Apache-2.0) for sync-out. |
| StreamGraph | MIT, permissive npm deps only (`LICENSES.md`) | Unchanged policy: no AGPL/SSPL/BSL/GPL **in the Node tree**. A user-installed GPLv3 Neo4j is a separate process, same as today. |

Sale caveats already given for StreamGraph still apply (own branding, real integration tests, lawyer review). Adding OntoSmith adds: MIT attribution, Jev/OpenRouter terms, Neo4j not bundled, FIBO trademark, and the fact that document text may be sent to third-party model APIs.

---

## Evidence table (OntoSmith, v0.1.9)

| Claim | Verdict | Evidence |
|---|---|---|
| OntoSmith 0.1.9 is MIT, Python ≥3.11, on PyPI | CONFIRMED | `LICENSE`; `pyproject.toml` `version`, `requires-python`, `license = "MIT"`; tag `v0.1.9` at `132fbb4` |
| Builds a governed Neo4j graph from documents with evidence spans | CONFIRMED | `README.md` lines 23–33, 544–558; `pipeline/graph_store.py` 265–338 |
| Schema is a flat extraction contract, no OWL/inference | CONFIRMED | `README.md` lines 44–64 |
| Human must approve a drafted pack before emit | CONFIRMED | `README.md` lines 272–274; `docs/PACK_DESIGN.md` 380–381; `ontology approve` in CLI |
| Profile is deterministic and keyless | CONFIRMED | `README.md` 128–130; `docs/connections.md` 533–534; `ontosmith profile --help` |
| Live build needs an LLM key and Neo4j; missing either refuses before spend | CONFIRMED | `README.md` 88–93, 184–192, 217–219; `docs/connections.md` 13–14, 466–476 |
| Windows: use WSL2; native Windows untested; Docker not required | CONFIRMED | `README.md` 84–86; `docs/connections.md` 411–419 |
| Corpus input for profile is a directory of `.txt` | CONFIRMED | `pipeline/profiler.py` 39, 100–101; `ontosmith profile --help` |
| `verify project` in 0.1.9 counts units only and does not price | CONFIRMED | Installed `--help`; `harness/verification/verify_cli.py` 160–175; `docs/hands-on-appendix.md` 56–81 |
| Flagship reference cost ~$18.80 / ~$0.0376 per doc (500 docs, 26,938 pairs) | CONFIRMED | `docs/whitepaper.md` 806–828 (21 Oct 2026 run). Not a quote for a user's corpus (`README.md` 198–200) |
| One graph per Neo4j store; a different batch replaces it | CONFIRMED | `README.md` 551–558; `pipeline/neo4j_store.py` 296–321 |
| `batch create` will not overwrite an existing batch id | CONFIRMED | `pipeline/batch_cli.py` 104–130 |
| Resume is for the same batch's checkpoints/ledger, not "add docs" | CONFIRMED | `pipeline/batch_run.py` 4, 3163–3172; `README.md` 486–490 |
| `written_triples.jsonl` has no quotes | CONFIRMED | `pipeline/batch_run.py` 2261–2266 |
| `judgments.jsonl` / inspect path carry quote and provenance | CONFIRMED | `pipeline/inspect.py` 9–42; `batch_run.py` 891–896, 1662–1685 |
| Sample API has no bulk export | CONFIRMED | `api/server.py` 6–14, 167–184; `serve --help` |
| `graph_export.json` is capped at 10k and has no evidence | CONFIRMED | `pipeline/export_graph.py` 43–66 |
| Jev is `typesafe/jev-1.13`, reached via OpenRouter decisions/systemone, not in the wheel | CONFIRMED | `reference_profile.py` 36–53; `docs/connections.md` 211–219, 360–371; `pyproject.toml` dependencies |
| Jev is a TypeSafe hosted decision model, $0.042/M input on OpenRouter (12 Nov 2026) | CONFIRMED | https://openrouter.ai/typesafe/jev-1.13 |
| Jev weights are under an open license | Not shown in OntoSmith or on the OpenRouter model page | Treat as **HYPOTHESIS (likely closed)** until TypeSafe terms are read |
| Five shipped packs as listed in §3 | CONFIRMED | `README.md` 402–409; `packs/*/pack.json` |
| Value attributes become `attr_*` node properties | CONFIRMED as a pack feature | `docs/PACK_DESIGN.md` 415–440; none declared in the five current pack payloads (inspected) |
| Neo4j CE is GPLv3 and not bundled | CONFIRMED | `docs/connections.md` 504–508 |
| FIBO pack carries FIBO definitions; "FIBO" is an EDM Council trademark | CONFIRMED | `NOTICE`; `README.md` 406 |

---

## What was not examined

- TypeSafe's own customer terms, DPA, or weight-distribution policy, except OpenRouter's public model page.
- A live `batch run`, `configure` probe, or any paid API call.
- OntoSmith's behaviour on native Windows or on Aura.
- The full whitepaper quality scores (only the cost table and the "when not to use it" framing were needed here).
- Graph-Engine-ETL PR #1 beyond the fact that StreamGraph is mirrored there; this plan was written against `/workspace/streamgraph`.
- Whether later OntoSmith versions (post-0.1.9) changed `verify project` to price again.

---

## Suggested first implementation slice

Phase 0 only: JSONL import, Attestation-node mapping, alder-finch fixture, and the collapsing-attestations wrong-implementation test. That proves the data model and ABAC hook points without asking a user to install Python, Neo4j or a key.
