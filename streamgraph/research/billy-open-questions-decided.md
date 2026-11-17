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
| 8 | Neo4j version | **Deferred (W7).** Do not build against a guessed version. Billy must confirm the Neo4j version on his PC before any Neo4j profile work |
| 9 | Neo4j shape | **Deferred with W7.** The neo4j-okf shape is not built. Revisit only after the version in row 8 is confirmed |
| 10 | `ki` (Knowledge Index) | **Deferred with W7.** Do not install `ki`. Markdown stays the source of truth; `ki` is not a second index in this build |
| 11 | JSON Schema → JSON-LD | **Use the clean-room converter.** The hint keyword is a single `x-jsonld` object (for example `{"@id":"schema:name"}`), not `x-jsonld-*` keywords. Do not use Sourcemeta’s AGPL tool. The JavaScript package `jsonld-from-schema/` is the only copy and StreamGraph imports it |
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

### Neo4j + `ki` (W7) — deferred

- Not built. Wait until Billy confirms the Neo4j version on his PC.
- Do not install `ki` and do not write the neo4j-okf profile until that confirmation.
- Markdown files stay the source of truth either way.

### Schema / JSON-LD

- Use the clean-room JSON Schema → JSON-LD converter. The hint is one `x-jsonld` object, not `x-jsonld-*` keywords.
- Adding `jsonld` (BSD-3) is approved. The JavaScript package is the only copy.

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

Neo4j / `ki` (W7) is **deferred** until Billy confirms the Neo4j version on his PC. It is not built. The 2026-11-16 note that treated neo4j-okf and `ki` as in is withdrawn for this build.

---

## Handoff packet for Billy (copy/paste)

```text
LOCKED (2026-11-16 ET, Hudson / human:whsutherland):
- Wiki: agent-generated clean slate first
- SoT: markdown files; graph write-back OFF
- Dialects: Vault-LD + OKF day one, one mapper
- Actors: grokbot/<…> for agents; human only human:whsutherland; never human: for agents
- Trust: visual/filter only; no access rules yet
- Neo4j/ki (W7): DEFERRED until Billy confirms the Neo4j version on his PC. Not built
- JSON Schema → JSON-LD: one clean-room converter; hint is a single x-jsonld object (not x-jsonld-*); jsonld BSD-3 OK
- Base: StreamGraph-Integrated-OpenSearch; one owner per job; handoffs via Hudson
- Demo: rules-only; keep LLM plug-in point cold until pipeline solid
```
