# Billy open questions — decided

**Status:** locked by Hudson Sutherland (whsutherland) on 2026-11-16 (America/New_York).  
**Audience:** Billy (implementation bot) and any coordinating agent.  
**Source chat:** Cursor cloud agent “New system architecture” (`bc-01a1e6da-4c25-7da7-8d73-41ebb1051565`).

Do not reopen these without Hudson. Remaining gaps are listed at the bottom.

---

## Locked decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Which wiki first | **Agent-generated** clean slate (not an existing Sutherland vault/folder, not demos-first) |
| 2 | Source of truth | **Markdown files**. Graph is a derived index/cache |
| 3 | Graph → file write-back | **Off at first**. Files are SoT; no automatic graph→file write-back until explicitly enabled later |
| 4 | Dialect priority | **Both from day one**: Vault-LD (ontology-first) and OKF (catalog/trust-first), with **one mapper** |
| 5 | Agent identity (`generated.by`) | Clear agent strings only, e.g. `grokbot/<model>` or `grokbot/<session>`. Never `human:` for agents |
| 6 | Who counts as human | **Only** `human:whsutherland` for the top human trust tier |
| 7 | Trust tiers vs access | **Visual / filtering only** at first (OKF intent). Do **not** feed access rules until real auth + review process exist |
| 8 | Neo4j version | Prefer **5.x / recent (incl. 2025.x calendar builds)** for Cypher, performance, and tooling |
| 9 | Neo4j shape | Prefer **neo4j-okf shape** for OKF concepts/actors/sources/trust; stay compatible with `ki` indexing |
| 10 | `ki` (Knowledge Index) | **Install alongside**; treat as read-side index over markdown, not a second SoT |
| 11 | JSON Schema → JSON-LD | **Integrate the already-built clean-room `x-jsonld-*` subset**. Do not use Sourcemeta’s AGPL tool. JSON-LD context + separate JSON Schema alone is not enough if the custom mapper already exists — wire it in |
| 12 | Base codebase | **Adopt StreamGraph-Integrated-OpenSearch as the new base** |
| 13 | `jsonld` npm dependency | **Yes** — BSD-3 is OK |
| 14 | Multi-bot edit policy | **One owner per job**. No parallel file edits unless Hudson coordinates. Handoffs go through Hudson as markdown updates + data packets |
| 15 | Demo intelligence | **Rules-only first** (deterministic, free, reproducible). Keep the NL/LLM plug-in point; do not call paid providers until the core pipeline (mappers, trust, round-trip) is solid |

---

## Implications Billy must honor

### Wiki: agent-generated first

- Generate a conformant Vault-LD + OKF-shaped wiki from scratch for pipeline proof.
- Expect empty/thin real domain knowledge until seeded; schedule early human review by `human:whsutherland`.
- Risk: synthetic-feeling content can hurt adoption — keep structure real, prose honest about provenance.

### Files as SoT

- All durable knowledge lives in markdown (+ contexts/schemas on disk).
- Neo4j / OpenSearch / `ki` indexes are rebuildable.
- Do not enable graph→file write-back in v1.

### Dual dialect, one mapper

- Every concept note should satisfy OKF trust/catalog fields **and** Vault-LD linked-data frontmatter/`@context` rules where applicable.
- One mapper owns round-trip; avoid two divergent pipelines.

### Provenance

- Agent writes: `generated.by` = `grokbot/...` (model or session slug).
- Human verification: only `human:whsutherland` in `verified[].by` for the top tier.
- Agents must never mint `human:` prefixes.

### Trust

- Surface trust tiers in UI and filters.
- Do not gate reads/writes on trust labels until identity is authenticated and post-verify edits are handled.

### Neo4j + `ki`

- Target Neo4j 5.x / recent 2025.x.
- Prefer neo4j-okf graph shape for OKF ingest/query.
- Install `ki` alongside for markdown→graph index (read path); keep markdown authoritative.

### Schema / JSON-LD

- Integrate Hudson’s existing clean-room JSON Schema → JSON-LD (`x-jsonld-*`) work.
- Adding `jsonld` (BSD-3) is approved.

### Base + coordination

- Build on **StreamGraph-Integrated-OpenSearch** as the base tree.
- Working StreamGraph code today also lives in this repo under `streamgraph/` (PR #1, branch `cursor/add-streamgraph-ca2d`). If StreamGraph-Integrated-OpenSearch is a separate path/repo on Sutherland, Hudson must supply the URL or path at handoff.
- Parallel bots: **do not** edit the same files. Hudson requests markdown updates and data packets for the other bot.

### Demo

- Rules-only extractors/generators until mappers + trust + round-trip are proven.
- Preserve the NL plug-in seam for a later real LLM provider.

---

## Still need from Hudson (small)

1. **Exact agent actor string convention** — lock one of: `grokbot/<model>` vs `grokbot/<session-id>` (or both with a documented rule).
2. **StreamGraph-Integrated-OpenSearch location** — GitHub URL, local Sutherland path, or confirm “evolve `streamgraph/` in this repo + OpenSearch” is the intended base.
3. **Confirm `ki alongside`** — answer text trailed off at “ki alongside:”; documented here as install-alongside. Correct if wrong.
4. **Confirm neo4j-okf shape** — version preference was explicit; shape preference inferred from OKF-from-day-one. Correct if default StreamGraph shape should win instead.

---

## Handoff packet for Billy (copy/paste)

```text
LOCKED (2026-11-16 ET, Hudson / human:whsutherland):
- Wiki: agent-generated clean slate first
- SoT: markdown files; graph write-back OFF
- Dialects: Vault-LD + OKF day one, one mapper
- Actors: grokbot/<…> for agents; human only human:whsutherland; never human: for agents
- Trust: visual/filter only; no access rules yet
- Neo4j: 5.x/2025.x; neo4j-okf shape; install ki alongside (read index)
- Integrate existing x-jsonld-* clean-room mapper; jsonld BSD-3 OK
- Base: StreamGraph-Integrated-OpenSearch; one owner per job; handoffs via Hudson
- Demo: rules-only; keep LLM plug-in point cold until pipeline solid
```
