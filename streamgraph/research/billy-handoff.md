# Billy handoff — architecture lock

Pass this packet when Hudson starts Billy. Full detail: `billy-open-questions-decided.md`.

## Owner

- **Human:** Hudson Sutherland — actor string `human:whsutherland`
- **Coordinator:** Hudson (markdown updates + data packets between bots)
- **This agent run that recorded the lock:** https://cursor.com/agents/bc-01a1e6da-4c25-7da7-8d73-41ebb1051565

## Do

1. Start from **StreamGraph-Integrated-OpenSearch** (ask Hudson for path/URL if not already cloned).
2. Generate an **agent-authored** Vault-LD + OKF wiki (clean slate).
3. Keep **markdown files** as source of truth; rebuild Neo4j / OpenSearch / `ki` from files.
4. Ship **one mapper** covering Vault-LD and OKF.
5. Stamp agent writes with `generated.by: grokbot/<model-or-session>`.
6. Integrate the existing clean-room **`x-jsonld-*`** JSON Schema → JSON-LD path; `jsonld` (BSD-3) is approved.
7. Prefer Neo4j **5.x / 2025.x**, **neo4j-okf** graph shape, and install **`ki` alongside** as a read index (both confirmed by Hudson 2026-11-16 ET).
8. Keep demos **rules-only**; leave the NL/LLM plug-in wired but unused for paid calls.

## Don’t

- Don’t seed from an existing Sutherland Obsidian vault until Hudson says so.
- Don’t turn on graph → file write-back.
- Don’t use trust tiers for access control yet.
- Don’t claim `human:` from an agent.
- Don’t edit files another bot owns unless Hudson coordinates.
- Don’t pull in Sourcemeta’s AGPL JSON Schema → JSON-LD tool.

## Open clarifications (ask Hudson once)

- Exact `grokbot/…` slug rule (model vs session).
- Where StreamGraph-Integrated-OpenSearch lives if not this repo’s `streamgraph/`.
