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
6. Use the clean-room JSON Schema → JSON-LD converter. The hint is a single **`x-jsonld`** object, not `x-jsonld-*` keywords. `jsonld` (BSD-3) is approved. The JavaScript package `jsonld-from-schema/` is the only copy.
7. **Neo4j / ki (plan W7) is deferred.** Do not build the neo4j-okf profile or install `ki` until Billy confirms the Neo4j version on his PC. It is not built.
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
