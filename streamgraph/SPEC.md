# SPEC: StreamGraph (behavior only)

Written from RESEARCH.md. No implementation detail of the target is known or used.

## 1. Flow
A flow is a directed graph of steps: sources, transforms, conditions and one sink. A flow file (JSON or YAML) lists `steps` (id, type, config) and `links` (from, to). Records travel from sources along links to the sink.
- Validation (B19): before running, the flow is rejected if it has no source, no sink, a link to a missing step, a cycle, a sink with no inbound path, or a step type that is unknown. Errors are listed, not thrown one at a time.
- Copy (B18): a flow can be copied under a new name.

## 2. Change events
Every record is an event `{op, topic, data, before?}` where `op` is `c` (create), `u` (update) or `d` (delete) (B6). Batch sources emit `c`.

## 3. Sources
- `file`: reads CSV, JSON array or NDJSON; emits `c` per row; `watch: true` re-reads appended NDJSON lines.
- `http`: polls a URL every `intervalMs`; emits `c` for new keys, `u` for changed rows, `d` for keys no longer present when `detectDeletes`.
- `kafka`: subscribes to topics; JSON values; a Debezium envelope (`op`,`before`,`after`) is unwrapped (B25 hypothesis); a null value (tombstone) is `d` for the message key.
- `sql`: reads a table once (SQLite or Postgres).
- `cdc`: polls a table on `updated_at` > last watermark; emits `c` or `u`; detects deletes by key-set diff or a `deleted` flag column.

## 4. Transforms (expressions are JSONata, the open stand-in for SpEL; no eval)
- `map`: `set: {field: expr}` adds or replaces fields.
- `rename`: `fields: {old: new}`; `topic: newName` renames the topic (B9).
- `filter` / condition: `expr` must be truthy to pass; others are dropped (B8).
- `cast`: `types: {field: String|Integer|Long|Short|Double|Float|Boolean|Date|Timestamp}` (B7).
- `normalize`: lower-case and trim key fields for entity resolution (B15).

## 5. Schema-driven mapping (sink config)
Mapping per topic:
- `nodes`: list of `{label, key, props}` where `key` is an expression giving the identity. Upsert merges props on `(label,key)` so the same entity from two sources becomes one node (B15, B23).
- `edges`: list of `{type, from:{label,key}, to:{label,key}}`; endpoints are upserted as stub nodes if missing (convert properties into edges, B10).
- `asEdge`: topic becomes an edge rather than a node (B9).
Delete `d` removes the node with that key and its edges, or the edge for edge topics (B24 hypothesis).

## 6. Graph store
Property graph: nodes `(label,key,props)`, edges `(type,from,to,props)`, edge identity = (type,from,to). Persisted to SQLite. Query:
- pattern `(a:Label {k:v})-[:TYPE]->(b:Label)` chains of any length, returns bindings.
- schema: node labels and edge types with counts and seen property names.
- export: Cypher `MERGE` script (Neo4j, Memgraph; ArcadeDB accepts openCypher).

## 7. Dynamic schema view (B14)
Each step shows input schema (fields seen arriving) and output schema (fields seen leaving). The graph schema (labels, edge types, counts) updates live.

## 8. Runtime
Batch mode drains sources once. Continuous mode keeps polling and streams events (stats, schema, graph deltas) to the UI over SSE.

## 9. UI
Flow editor (add step, connect by drag, configure JSON, auto-layout, validate, run), schema panel, live graph preview.

## 10. Sync-out (live output connectors)
- Graph writes append to a change log `(seq, kind, op, id, data)`. `clear()` empties it and sets a new epoch.
- Each output keeps a checkpoint `{epoch, seq, run, policy}` in `data/sync-checkpoints.json`, saved by temp file and rename after each accepted batch.
- Snapshot when the epoch, policy version or output config differs, or the checkpoint is older than the oldest kept change: send every node and edge with a new run id, then sweep rows with an older run id. Otherwise send `changesAfter(seq)` in batches of 500, coalesced so the last change per id wins.
- Changes are pruned up to the lowest checkpoint of the enabled outputs.
- Targets: Neo4j and Memgraph (MERGE by `_key` in one transaction, `:StreamGraph` label, `_sg_run`), PostgreSQL (`sg_nodes`, `sg_edges`, ON CONFLICT upserts in a transaction), Kafka (keyed JSON, tombstones, idempotent producer, acks all). At-least-once delivery to idempotent targets.

## 11. Access rules (ABAC)
Behavior follows Hudson's PR #2 design (Neo4j as source of truth, an OPA `kafka.authz` policy that is default-deny, a masker for high and unlisted fields below clearance 3, a 15 s projection, a decision cache), embedded instead of run as services:
| PR #2 | StreamGraph |
|---|---|
| Neo4j holds topic tags, field sensitivity, principal clearance | `data/policy.db` property graph: `_Principal`, `_EntityType`, `_Field`, `_Rule`, `HAS_FIELD` |
| OPA Rego `default allow := false`; topic, principal and numeric clearance must be present | JS engine: default deny; missing user, role, numeric clearance, action or type attributes deny |
| PII read denied when clearance < classification | locked rule `pii-clearance` with deny-overrides |
| WRITE always allowed | no writes from outside; setup needs `admin` |
| sync every 15 s; a failed read doesn't publish | the snapshot is rebuilt on every change; a failed read keeps the last good one and records `loadError` |
| masker: high and unlisted below 3; empty snapshot masks all; low passes | same, plus `medium` needs 2, `unclassified` needs 3, and an empty field list also masks for clearance 3 |
| 300 s decision cache | 5 s TTL, cleared on every change |
| OPA on 0.0.0.0 without auth | OPA optional, off by default, `127.0.0.1` URL, optional bearer token, fail closed with a timeout |
Pitfalls avoided from the PR review: `allow if { not deny }` inverting default deny (here an allow needs a matching allow rule and no deny), the exposed OPA port, the long stale cache and an empty snapshot masking nothing.

Enforcement points: Explore questions (`query`), search and field lists (`read`), CSV and Cypher export (`export`), each output (`sync-out` as the output's user) and every setup endpoint (`admin` on `Project`).

## Out of scope (next steps)
OAuth 2.0 and Keycloak (B17), RAG layer, Docker installer, print/export of flow diagrams.
