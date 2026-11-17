# Graph Exploration Platform — Behavior-Only Design Spec

**Document type:** Exportable design specification. A developer or another bot should be able to implement from this file alone.

**Document date:** 13 November 2026 (America/New_York).

**Nature of this spec:** Behavior only. It defines inputs, outputs, rules, edge cases, and acceptance criteria. It does not prescribe vendor SDKs, copy any commercial toolkit's APIs or internal names, or include vendor source. Implementation stack suggestions in §12 are recommendations only.

**Prior art studied:** Public documentation and demos of commercial graph visualization and analysis products were reviewed in `/workspace/ci-graph-study/REPORT.md`. Lessons taken are architectural (pluggable source adapters, a unified in-memory graph, incremental layout, data-driven styling). This spec describes equivalent behaviors in generic terms and is a clean-room design.

---

## Table of contents

1. [Purpose, goals, and non-goals](#1-purpose-goals-and-non-goals)
2. [Architecture overview](#2-architecture-overview)
3. [Canonical graph model](#3-canonical-graph-model)
4. [Connector layer](#4-connector-layer)
5. [In-memory graph service](#5-in-memory-graph-service)
6. [Streaming ingest contract](#6-streaming-ingest-contract)
7. [API between UI and service](#7-api-between-ui-and-service)
8. [Graph exploration UI — performance](#8-graph-exploration-ui--performance)
9. [Layouts](#9-layouts)
10. [Node style, link style, and visuals](#10-node-style-link-style-and-visuals)
11. [Exploration interactions](#11-exploration-interactions)
12. [Suggested open-source stack](#12-suggested-open-source-stack)
13. [Acceptance tests](#13-acceptance-tests)
14. [Open questions](#14-open-questions)
15. [Glossary](#15-glossary)
16. [MCP integration (two-way)](#16-mcp-integration-two-way)
17. Event-driven mode (Kafka), optional
18. Stream processor (Apache Flink), optional
19. [Saved views and presenter mode](#19-saved-views-and-presenter-mode)
20. [Composable node symbols](#20-composable-node-symbols)
21. [Entity resolution (records → entities), optional](#21-entity-resolution-records--entities-optional)
22. [Map viewer and geo grids](#22-map-viewer-and-geo-grids)
23. [Core exploration loop: neighbourhoods, paths, algorithms, selection](#23-core-exploration-loop-neighbourhoods-paths-algorithms-selection)

---

## 1. Purpose, goals, and non-goals

### 1.1 Purpose

Build a graph exploration system that:

- Connects to one or more data sources (graph databases, relational databases, HTTP APIs, and a live event stream).
- Normalizes every source into **one canonical graph model**.
- Holds a permission-aware, mergeable, incrementally updatable graph in a **server-side in-memory service**.
- Lets a user explore that graph in a **high-performance browser UI**, with particular quality on **performance, layout, and visual styling**.
- Accepts a **streaming ingest** so a separate streaming-graph project can feed the same model and push live deltas to the UI.

Styling, layout parameters, and performance tactics are **iterable**: they are driven by versioned configuration, not hard-coded, so they can be improved during implementation without changing the contracts in this spec.

### 1.2 Goals

- One canonical model for nodes, links, properties, types, identifiers, and source provenance.
- Pluggable connectors; adding a new store does not change the UI or the in-memory merge rules.
- Correct merge, deduplication, conflict handling, and permission propagation.
- Live streaming with well-defined ordering, idempotency, batching, and backpressure.
- Smooth interaction at **10,000 visible** nodes/links; graceful behavior up to **100,000+** elements in memory via WebGL, level-of-detail, aggregation, and viewport culling.
- Layouts that stay stable when data arrives incrementally (no jarring full reflow by default).
- Data-driven visual style with dark/light themes and a legend.
- Standard exploration: search, neighbor expand/collapse, filters, shortest path, grouping, time slider.

### 1.3 Non-goals (this version)

- Copying or wrapping a commercial visualization SDK.
- Becoming a general ETL or data-warehouse product.
- Multi-tenant SaaS billing, or a full identity provider (the service must *enforce* permissions it is given; it need not *issue* them).
- Automatic schema discovery across arbitrary enterprise systems.
- Geospatial map mode, print/export pipelines, or mobile-native clients (may be added later; contracts should not preclude them).
- Writing back edits to source databases (read/explore first; write-back is out of scope unless later specified).

### 1.4 Design principles

- **Behavior over implementation.** Contracts are inputs, outputs, and rules. Libraries named in §12 may be substituted if behavior is preserved.
- **Idempotent updates.** Replaying the same event or merge must not corrupt the graph.
- **Least surprise on layout.** Existing node positions stay stable unless the user requests a full relayout or an item is new/unpinned and must be placed.
- **Fail closed on permissions.** If authorization for a source or item is missing or expired, the item is omitted, not shown with empty labels.
- **Provenance is first-class.** Every item records which source(s) contributed to it.

---

## 2. Architecture overview

Three cooperating layers, plus the UI:

```
 Sources (Neo4j, Postgres, HTTP APIs, other graph stores)
                    |
                    v
         +---------------------+
         |  Connector layer    |  each adapter: query/expand -> canonical items
         +----------+----------+
                    |
                    v
         +---------------------+
         | In-memory graph     |  merge, resolve, TTL, permissions, snapshots/deltas
         | service             |
         +----------+----------+
                    ^
                    | streaming event batches (same canonical model)
         +----------+----------+
         | Streaming ingest    |  add/update/remove, batching, backpressure
         +---------------------+
                    |
                    | session API: snapshot, delta, query, expand, filter
                    v
         +---------------------+
         | Exploration UI      |  WebGL render, worker layout, style config, interactions
         +---------------------+
```

**Rules:**

- The browser never talks to source databases directly and never receives source credentials.
- Connectors and the streaming ingest are the only writers into the in-memory graph (besides explicit user-session working-set operations such as "expand this node," which go through the service).
- The UI holds a **working view** (a subset of the server graph, plus local layout positions and style). The server is the source of truth for graph membership, properties, and permissions.
- The same canonical item shape is used on the connector output, the stream, the in-memory store, and the UI delta feed.

---

## 3. Canonical graph model

This is the single model every connector, the stream, the service, and the UI share.

### 3.1 Identifiers

- Every node and every link has an **`id`**: a non-empty Unicode string, unique among all items in a graph (nodes and links share one id space).
- An id must not be empty, must not be only whitespace, and must not start with the reserved prefix `sys:`.
- **Recommended construction:** `"{source}:{kind}:{nativeId}"` (example: `neo4j:node:42`, `pg:link:orders:1001`). Connectors may use another scheme if they guarantee uniqueness and stability.
- Ids are **stable**: the same real-world record from the same source must produce the same id on every query and every stream event.
- Links also have **`fromId`** and **`toId`**, which must be node ids (the endpoints may be absent from the current working set; see §5.6).

### 3.2 Node

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable unique id. |
| `kind` | yes | Always `"node"`. |
| `type` | yes | Type name (e.g. `Person`, `Account`). Empty string is not allowed; use `"Unknown"` if the source has no type. |
| `label` | no | Primary display string. If omitted, the UI derives a label from configured property keys, else from `id`. |
| `properties` | yes | JSON object of additional attributes. Values must be JSON-serializable (string, number, boolean, null, array, object). |
| `sources` | yes | Array of provenance records (§3.5). At least one after a successful merge. |
| `version` | yes | Monotonic integer per id, incremented on each accepted change. Starts at 1. |
| `updatedAt` | yes | ISO-8601 timestamp in UTC of the last accepted change. |
| `eventTime` | no | Business/event time from the source or stream, ISO-8601 UTC. Used by the time slider. |
| `deleted` | no | If true, the item is a tombstone (§5.5). Default false. |

Optional presentation hints (not a substitute for style config): `x`, `y` (suggested world coordinates, numbers). The UI may ignore these once a layout has run, except for pinned nodes.

### 3.3 Link

Same as node for `id`, `kind` (`"link"`), `type`, `label`, `properties`, `sources`, `version`, `updatedAt`, `eventTime`, `deleted`, plus:

| Field | Required | Meaning |
| --- | --- | --- |
| `fromId` | yes | Start node id. |
| `toId` | yes | End node id. May equal `fromId` (a self-loop). |
| `directed` | no | Default `true`. If `false`, the link is treated as undirected for path and highlight, but `fromId`/`toId` remain stored as given. |

A link is invalid and must be rejected if `fromId` or `toId` is missing or empty.

### 3.4 Groups (optional derived items)

A **group** is a view-level or service-level aggregation of nodes, not a substitute for source data.

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Group id, unique in the same id space. Service-generated groups use prefix `sys:group:`. |
| `kind` | yes | `"group"`. |
| `memberIds` | yes | Node ids (and, optionally, nested group ids) contained in the group. |
| `open` | yes | If false, members are hidden and the group is drawn as a single node-like glyph. If true, members are visible inside a boundary. |
| `label`, `type`, `properties`, `sources` | as needed | Same conventions as nodes. |

Groups may be **user-defined** (explicit member lists) or **rule-defined** (e.g. group by `type` or by a property). Rule-defined groups are recomputed when membership-relevant properties change.

### 3.5 Provenance record

```
{
  "sourceId": "neo4j-main",
  "nativeId": "42",
  "fetchedAt": "2026-11-13T14:32:00Z",
  "queryId": "optional-trace-id"
}
```

An item may list multiple provenance records after a merge from more than one source.

### 3.6 Graph container and working set

- A **graph** is a named collection of items (`graphId`).
- A **working set** is the subset of a graph currently materialized for a user session (because of queries, expands, filters, and stream windows).
- The service may hold a larger graph than any one session's working set.

### 3.7 Validation rules

- Reject items that fail id, kind, type, or endpoint rules. Rejection is per-item: a batch may partially succeed.
- Unknown fields are preserved under `properties` or ignored if they collide with reserved names (`id`, `kind`, `fromId`, `toId`, `sources`, `version`, `deleted`). Reserved names in `properties` are ignored (the top-level field wins).
- Property values that are not JSON-serializable are rejected for that property; other properties still apply.
- Duplicate ids inside a single batch: last occurrence in batch order wins, after conflict rules in §5.3.

---

## 4. Connector layer

### 4.1 Role

A connector is a server-side adapter. It:

1. Accepts a **canonical request** (search, expand, refresh, optional raw query).
2. Talks to one external system with credentials stored only on the server.
3. Maps native results into canonical nodes and links.
4. Returns those items plus a result envelope (errors, cursors, timings).

The connector does **not** merge across sources, compute layout, or talk to the UI.

### 4.2 Connector interface (behavior)

Every connector implements:

| Operation | Input | Output |
| --- | --- | --- |
| `capabilities` | none | Declares query language, whether expand-by-id is supported, max page size, whether it can stream, estimated lag. |
| `health` | none | `ok` / `degraded` / `unavailable`, plus optional message. |
| `search` | filters, types, text, time range, limit, cursor | Page of canonical items, next cursor or end. |
| `expand` | one or more node ids, optional type/direction/depth (depth default 1, max configured), limit | Incident links and neighboring nodes, plus the seed nodes if refreshed. |
| `refresh` | item ids | Fresh versions of those items, or `not_found` / `forbidden` per id. |
| `rawQuery` (optional) | source-native query string or parameterized template id + params, limit | Canonical items, or a rejected-query error if disabled by policy. |

**Common request metadata:** `sourceId`, `graphId`, `requestId`, caller identity, timeout, limit (the service must cap limits).

**Common result envelope:**

```
{
  "requestId": "...",
  "sourceId": "...",
  "items": [ /* canonical nodes and links */ ],
  "page": { "nextCursor": "..." | null, "truncated": false },
  "warnings": [ { "code": "...", "message": "..." } ],
  "error": null | { "code": "...", "message": "..." },
  "timingMs": 0
}
```

If `error` is set, `items` may be empty or partial; the service must not treat a failed request as a delete of existing items.

### 4.3 Mapping rules (all connectors)

- Produce stable ids as in §3.1.
- Map native labels/tables/classes to `type`.
- Map display names to `label` when obvious (a `name`, `title`, or configured field); otherwise omit.
- Put remaining attributes in `properties` (flatten one level when practical; nested objects are allowed).
- Attach at least one provenance record.
- Do not invent links that the source did not return, except **optional endpoint placeholders**: if a link is returned and an endpoint node is not, the connector should emit a stub node (`type` `"Unknown"`, property `stub: true`) *or* leave the endpoint missing and let the service record a **dangling link** (§5.6). Default: emit a stub so the UI can show an expandable placeholder. Configurable per connector.
- Respect the requested `limit`. If the source would return more, set `truncated: true` and a `nextCursor` when possible.
- Never return source secrets, connection strings, or raw authorization headers in items or errors.

### 4.4 Built-in connectors

#### 4.4.1 Graph-query connector (Cypher-style / Neo4j and compatible stores)

- **Input:** parameterized graph-pattern queries (search by type/property; expand: neighbors of given ids).
- **Mapping:** native nodes become nodes; native relationships become links (`fromId`/`toId` from relationship ends; relationship type becomes `type`; relationship id becomes native id).
- **Expand default:** one hop, both directions, unless the request says otherwise.
- **Edge cases:** path results must be flattened to the unique set of nodes and links on those paths (no duplicate ids in the output array). Integers that exceed safe JSON integer range must be emitted as strings. If the store is unreachable, `health` is `unavailable` and operations return `error.code = "source_unavailable"`.

#### 4.4.2 Relational connector (SQL / Postgres and other SQL databases)

- **Input:** configured **mappings**, not ad-hoc SQL from the browser.
  - A **node mapping**: a table or view, the id column(s), the type name, optional label expression, property columns.
  - A **link mapping**: a table or view (or a foreign-key relationship), id column(s), `from` column(s), `to` column(s), type name, property columns.
- The connector issues parameterized SQL generated from those mappings plus request filters/limits.
- **Search** queries mapped tables with filters derived from the request.
- **Expand** finds link-mapping rows where `from` or `to` matches the seed ids, then loads endpoint nodes via node mappings.
- **Edge cases:** composite keys are concatenated into a single stable native id with a documented separator (default `|`). NULL endpoints cause that link row to be skipped with a warning, and no link is created. SQL injection is prevented by parameterized queries only; mapping identifiers (table/column names) must be validated against an allowlist established at connector configuration time.

#### 4.4.3 Generic HTTP connector

- **Input:** configured base URL, auth, and **response mapping** (JSON pointer or equivalent) from the HTTP body to lists of nodes and links.
- **Search / expand** map to HTTP GET or POST templates (path, query, body) with placeholders for ids, text, limit, cursor.
- Treat 429 / 503 as `source_unavailable` or `source_throttled` (retry with backoff is the service's job, not the UI's).
- **Edge cases:** non-JSON bodies fail the request. Partial JSON arrays: reject the request rather than silently dropping a truncated parse. Timeouts fail the request without deleting existing items.

#### 4.4.4 Template for other distributed graph stores

For stores reached with traversal languages or HTTP APIs similar to open graph protocols (for example Neptune- or JanusGraph-class systems):

- Implement the same `capabilities` / `search` / `expand` / `refresh` interface.
- Document: endpoint, auth, query language, how vertices and edges map to `id` / `type` / `fromId` / `toId`, pagination, and timeouts.
- Until a concrete store is configured, this template is not a runtime connector; adding one is a configuration plus mapping task, not a model change.

### 4.5 Connector configuration

Stored only on the server:

- `sourceId`, display name, connector kind, connection (URL, database, credentials reference), mappings, default limits, timeout, enabled flag, permission scope (which roles may use this source).

Changing mappings does not rewrite historical ids unless the operator explicitly runs a **rekey** job (out of scope for v1; until then, a mapping change that would alter ids is a breaking change and must be rejected or require a new `sourceId`).

### 4.6 Acceptance criteria (connectors)

- Two connectors can return items that, after merge, appear in one graph with correct provenance arrays.
- A failing connector does not wipe previously merged items from that source.
- Limits are enforced; truncation is reported.
- No credential material appears in any item, log line intended for the client, or error message returned to the UI.

---

## 5. In-memory graph service

### 5.1 Role

The service is the system of record for the live exploration graph. It:

- Accepts canonical items from connectors and from the streaming ingest.
- Merges and deduplicates by id, applies entity-resolution and conflict rules.
- Enforces permissions.
- Tracks freshness (TTL, refresh, change events).
- Serves session working sets, snapshots, and incremental deltas to the UI.
- Performs on-demand expand and graph queries (search, filter, shortest path) against the in-memory graph, calling connectors when data is not already present or is stale.

### 5.2 Merge and deduplication

When an incoming item has an `id` already in the graph:

1. Permission check: if the caller cannot write or update that id, reject with `forbidden` and leave the stored item unchanged.
2. Apply conflict rules (§5.3) to produce a new property set and metadata.
3. Increment `version`.
4. Set `updatedAt` to now (server clock, UTC).
5. Union `sources` provenance (dedupe by `sourceId` + `nativeId`; keep the latest `fetchedAt`).
6. Clear `deleted` if this is an upsert of a previously tombstoned id (unless the incoming event is itself a delete).
7. Emit a change event / session delta of type `upsert`.

When the id is new: insert at `version` 1 (or the incoming version if the stream supplies a higher version and policy allows), attach provenance, emit `upsert`.

**Dedup key** for standard merge is **`id` only**. Entity resolution may alias additional ids onto a canonical id (§5.4).

**Idempotent no-op:** if properties, type, label, and ends are equal to the stored item, do not increment version and do not emit a delta.

### 5.3 Conflict handling

Configurable **conflict policy** per graph (default: `field-merge-lww`):

| Policy | Behavior |
| --- | --- |
| `field-merge-lww` (default) | For each property key, the value with the later `eventTime` (fallback: later `updatedAt`, then higher incoming `version`, then last in batch) wins. Properties not present in the incoming item are **kept**. |
| `replace` | Incoming properties **replace** the entire property object. Label and type from incoming replace stored values. |
| `reject-stale` | If incoming `eventTime` or `version` is older than stored, reject the update, keep stored, emit a `stale_ignored` warning. |

**Type and label:** treated like properties (last-write-wins under the default policy). A type change is allowed and must trigger style and rule-group recomputation.

**fromId / toId on links:** changing endpoints is an update, not a new link. If a policy would create a link with empty endpoints, reject.

Conflicts may be recorded in a server-side audit list. Do not send that audit list to the UI by default. Metrics increment `merge.conflicts`.

### 5.4 Entity resolution

Optional rules, evaluated after id-based merge, in declared order:

1. **Same-id rule** (always on): identical `id` is the same item.
2. **Key rule:** items of a given `type` that share a configured unique key (e.g. `properties.email`, or a tuple of properties) are the same entity.
3. When a match is found across different ids, the service picks a **canonical id** (the earliest created, unless an explicit alias is configured), stores **aliases**, and rewrites links that pointed at alias ids to the canonical id.
4. The UI is told via a delta: alias ids are removed (or marked redirected) and the canonical item is upserted; links are upserted with updated ends.

**Edge cases:**

- After a merge, duplicate links with the same `type` and ends may be collapsed if a **link-identity rule** says so. Default: do *not* auto-collapse links that have distinct ids. Operators may enable collapse when `type` + `fromId` + `toId` match and a flag is set.
- Resolution never merges items the caller cannot read.
- Automatic split of an id/key alias is out of scope for v1. Aliases persist for the life of the graph unless explicitly cleared by an admin operation. Probabilistic record → entity resolution with incremental merge **and split** is a separate, optional layer: see §21.

### 5.5 Deletes, tombstones, TTL, and refresh

- A **remove** event or a refresh that reports `not_found` for an id sets `deleted: true`, keeps a **tombstone** for `tombstoneTtl` (default 24 hours) so late or duplicate removes stay idempotent, and emits `remove` to sessions.
- Tombstones are not sent to the UI except as `remove` deltas (no ghost nodes).
- After `tombstoneTtl`, the tombstone may be garbage-collected. A later upsert may reuse the id (version continues, does not reset, if the tombstone is still present; if collected, version restarts at 1).
- **Item TTL** (optional per source or per item): if `updatedAt` is older than TTL and no stream has refreshed it, the service marks the item stale. Stale items remain visible but may be background-refreshed. If `expireOnTtl` is enabled, stale items are tombstoned.
- **Refresh:** a session or a scheduler can request `refresh` for ids or for a source. Failed refresh does not tombstone.
- **Change events** (internal): every accepted insert, update, or delete produces an event used to fan out session deltas and to notify any subscribers.

### 5.6 Partial / on-demand loading

- Sessions start with an empty working set, or with the result of an initial search.
- **Expand** on a node: the service returns neighbors already in memory that the user may see, and if the node has provenance on a connector that supports expand, it also queries that connector, merges results, and returns the new neighborhood.
- **Dangling links:** a link may exist without both ends in the working set. The UI may draw the link only when both ends are in the working set. The service may include stub ends on expand.
- **Pagination:** expand and search are limited; `truncated` means the user can request more.
- The in-memory graph may evict items that are not in any session working set and are stale (optional memory cap). Eviction must not evict items required to interpret the active stream window without a later catch-up (§6.7).

### 5.7 Permission propagation

- Every source has an **access policy**: which principals (user, role, group) may read it.
- An item is visible in a session only if the principal may read **at least one** of the item's `sources`.
- If a principal can read some but not all sources of a merged item, the item is visible, but properties contributed *exclusively* by unreadable sources must be omitted (field-level redaction). If the service cannot attribute properties to sources, it must omit the whole item unless *all* contributing sources are readable (fail closed). Default if attribution is not tracked per field: **require all listed sources to be readable**.
- Links: visible only if the link is readable *and* both endpoint nodes are readable. Otherwise omit the link.
- Groups: a member the user cannot see is omitted from `memberIds` in that session. If no members remain visible, omit the group.
- Permission changes (revocation) must take effect on the next delta or immediately via a `resync` / `remove` of now-invisible items. Do not rely on the UI to hide them.
- The UI must not receive items it is not allowed to see, even if it requested them by id.

### 5.8 Freshness and clocks

- Server uses UTC. Clock skew from streams: if `eventTime` is more than `maxFutureSkew` (default 5 minutes) in the future, clamp to now and warn; do not drop the event.
- Session deltas include a `serverTime` and a per-stream `cursor` so the UI can display lag.

### 5.9 Acceptance criteria (service)

- Replaying the same upsert twice leaves a single item; identical payloads are an idempotent no-op.
- Concurrent upserts on the same id serialize; no lost update under the chosen policy.
- A user without access to source A never receives items that exist only from source A.
- Expand of a visible node returns only visible neighbors.

---

## 6. Streaming ingest contract

This is the contract a separate streaming-graph project must implement to feed the same in-memory graph and to drive live UI updates.

### 6.1 Transport

- The stream producer opens a connection to the graph service's **ingest endpoint** (HTTP/2 or WebSocket, or a message-broker topic whose consumer is part of the service).
- Authentication is server-to-server (token or mutual TLS). The stream is a trusted writer for the sources it is authorized to publish.
- One stream is bound to one `graphId` and one `sourceId` (or a small fixed set of `sourceId`s declared at connect time).

### 6.2 Event types

Every event has a common header and a payload.

**Header (required):**

| Field | Meaning |
| --- | --- |
| `eventId` | Producer-generated unique id for idempotency (UUID or `{producer}:{seq}`). |
| `op` | One of: `node.upsert`, `node.remove`, `link.upsert`, `link.remove`, `heartbeat`, `snapshot.marker`. |
| `sourceId` | Logical source this event represents. |
| `seq` | Monotonic integer **per `sourceId`** (or per partition; see ordering). |
| `eventTime` | Business time, ISO-8601 UTC, when the change occurred in the domain. |
| `ingestTime` | Optional; producer clock. The service also records its receive time. |

**Payloads:**

- `node.upsert`: a canonical node **without** `version` (the service assigns version). `id`, `kind`, `type` required.
- `link.upsert`: a canonical link without `version`. `id`, `fromId`, `toId`, `type` required.
- `node.remove` / `link.remove`: `{ "id": "..." }`. Unknown ids become tombstones (idempotent).
- `heartbeat`: no graph change; used for lag detection. May include `lastSeq`.
- `snapshot.marker`: `{ "phase": "begin" | "end", "snapshotId": "..." }` — optional, wraps a catch-up snapshot.

Upserts may include only changed fields plus `id` and `kind` (**partial upsert**) if `partial: true` is set on the event. Otherwise the payload is a full item under the graph's conflict policy.

### 6.3 Batches

Events are delivered in **batches**:

```
{
  "batchId": "...",
  "sourceId": "...",
  "partition": 0,
  "events": [ /* 1..N events, N configurable, default max 500 */ ],
  "bytesApprox": 0
}
```

- The service applies events **in array order** within a batch, then commits, then acknowledges the batch.
- A batch is the unit of acknowledgement. Default: **all-or-nothing apply** for validation failures that are not per-event-skippable; per-event skip for item-level validation errors, with those events reported in the ack (`accepted`, `skipped`, `failed` counts and per-event error list capped at 50).
- Recommended producer batching: 5–50 ms or 100–500 events or 256 KiB, whichever first. The service may split oversized batches internally but must preserve order.

### 6.4 Ordering

- **Per partition, per `sourceId`:** events must be applied in `seq` order.
- The service tracks `lastAppliedSeq` per `(sourceId, partition)`.
- If `seq` is the next expected value, apply.
- If `seq` is less than or equal to `lastAppliedSeq`, treat as **duplicate** (see idempotency); do not re-apply unless policy says otherwise (default: skip).
- If `seq` is greater than expected (a gap): wait up to `orderWaitMs` (default 2000) for the missing seq. If still missing, follow `gapPolicy`:
  - `block` (default for strictly ordered streams): do not apply later events; signal backpressure and `gap` lag.
  - `skip-forward`: apply anyway and record a hole (at-least-once producers should not use this).
- **No global order across partitions or sources.** The UI must tolerate interleaved updates from different sources.
- Causal recommendation to stream authors: emit a node upsert before links that reference it. If a link arrives first, the service keeps a dangling link and optionally creates a stub node (`stream.autoStub`, default true).

### 6.5 Idempotency

- The service remembers recent `eventId`s in a sliding window (default: 100,000 ids or 1 hour, whichever keeps memory bounded).
- A repeated `eventId` is acknowledged as `duplicate` and does not change the graph or increment `version`.
- Combined with `seq` dedup, at-least-once delivery is safe.
- Producers must not reuse an `eventId` for a different payload.

### 6.6 Backpressure

- Acknowledgements: the service sends `{ batchId, status, lastAppliedSeq, accepted, skipped, failed, error? }`.
- The producer must keep **at most `maxInFlightBatches`** unacknowledged batches per partition (negotiated at connect; default 4).
- If the service is slow or the apply queue exceeds `maxQueuedEvents`, it stops reading, delays acks, or returns `status: "retry"` with `retryAfterMs`.
- The producer must slow or buffer; it must not open unbounded additional connections to bypass this.
- Heartbeats with no progress while `gap` or `retry` is set indicate lag; the UI may show "live (lagging Xs)".

### 6.7 Catch-up, snapshots, and reconnect

- On connect, the producer may resume from a service-provided cursor `{ sourceId, partition, lastAppliedSeq }`.
- Alternatively the producer may send a snapshot (`snapshot.marker begin`, a set of upserts representing current state, `end`). During a snapshot, the service may optionally isolate that source's items (configurable `snapshotMode`: `merge` default, or `replace-source` which tombstones source items not present in the snapshot).
- After disconnect, the producer resumes from the last **acknowledged** cursor, not from unacked in-flight data.

### 6.8 Fan-out to the UI

- Each accepted event (or coalesced group of events) becomes a **session delta** for sessions whose working set intersects the change, or whose mode is "follow the live window."
- Coalescing: multiple upserts to the same id within a short window (default 50 ms) may be collapsed to the latest before send, provided versions are not skipped in a way that breaks the UI's cursor check. The UI applies deltas in `deltaSeq` order.
- Removes of items not in the working set may be omitted.
- New items enter the working set only if they pass the session's active filters and follow-live policy. Default follow-live: new items **that match current filters** are added; others are ignored until a search or expand pulls them in.

### 6.9 Streaming and time slider

- `eventTime` is the time axis.
- The service or the UI (if a time-indexed window is already in the working set) can present the graph **as of** a time T, or a window `[T0, T1]`.
- Items with `eventTime` (or, if missing, `updatedAt`) outside the window are hidden, not deleted.
- Live mode: the window end tracks `serverTime` (optionally with a short delay).

### 6.10 Acceptance criteria (streaming)

- At-least-once delivery of the same batch does not duplicate nodes or links.
- Out-of-order `seq` does not corrupt the graph under default `gapPolicy=block`.
- Backpressure is observable: when the service is paused, the producer stops after `maxInFlightBatches`.
- A UI session in follow-live mode receives an upsert delta within the latency budget in §8.3 after the event is acknowledged.
- A remove followed by a late duplicate remove is a no-op; a remove followed by a new upsert revives the id.

---

## 7. API between UI and service

All messages are JSON (or equivalent structured messages). Transport: HTTPS for request/response, WebSocket or SSE for deltas. Auth: session token. All responses that include items must already be permission-filtered.

### 7.1 Session lifecycle

1. `session.open` — input: `graphId`, optional initial search, style config version, view capabilities (WebGL yes/no, max elements). Output: `sessionId`, snapshot of the initial working set (may be empty), `deltaCursor`, server time, server style defaults.
2. `session.close` — ends delta subscription; working set may be evicted after idle.
3. On token expiry: the stream closes; the UI must re-authenticate and `session.open` (or `session.resume` with `deltaCursor` if still valid). If the cursor is invalid, the service sends a full snapshot.

### 7.2 Snapshot and delta

**Snapshot:** `{ sessionId, graphId, items: [...], groups: [...], deltaCursor, serverTime }`.

**Delta message:**

```
{
  "sessionId": "...",
  "deltaSeq": 1234,
  "baseCursor": "...",
  "serverTime": "...",
  "upserts": [ /* canonical items */ ],
  "removes": [ "id1", "id2" ],
  "groups": [ /* full group objects to upsert */ ],
  "groupRemoves": [ "sys:group:..." ],
  "lag": { "sourceId": { "lagMs": 0, "status": "live" | "lagging" | "gap" | "disconnected" } }
}
```

**UI apply rules:**

- Apply only if `deltaSeq` is next in order. If a gap in `deltaSeq`, request resync (`session.resync` returns a snapshot).
- Upserts replace the client item with the same id (server is source of truth for properties). **Layout positions on the client are preserved** for existing ids unless the upsert includes a server-suggested position *and* the node is unpinned *and* the client is in a mode that accepts server positions (default: **do not** move existing unpinned nodes on property-only upserts).
- Removes drop the item from the view; incident links are removed from the view if not already included in `removes` (the UI must hide a link if either end is gone).
- Deltas must be cheap to apply (§8.3).

### 7.3 Commands (UI to service)

| Command | Input | Output |
| --- | --- | --- |
| `search` | text, types, property filters, time window, limit, cursor | items to add to working set plus `truncated` |
| `expand` | node ids, direction (`in` / `out` / `both`), types, depth (default 1), limit | upserts of neighbors and links |
| `collapse` | node ids | advisory: UI may hide neighbors that are only reachable through those nodes and not pinned or selected; service may optionally shrink the working set (`release`) |
| `release` | item ids | remove from this working set only (not a graph delete) |
| `refresh` | item ids or `sourceId` | upserts or removes |
| `path` | `fromId`, `toId`, directed flag, max length, max results | one or more paths as ordered node/link id lists; items not in the working set are included as upserts |
| `filter.set` | filter specification (§11) | optional `removes`/`upserts` to align working set, plus the filter id |
| `group.set` | rule or explicit members, open/closed | group upserts |
| `group.clear` | group id or all | `groupRemoves` |
| `time.set` | instant or `[start, end]`, live on/off | visibility updates (hides/shows), not deletes |
| `follow.set` | whether new matching stream items join the working set | ack |

Errors use `{ "code", "message", "retryable" }`. Codes include `invalid`, `not_found`, `forbidden`, `conflict`, `unavailable`, `limit_exceeded`, `stale_cursor`.

### 7.4 Client-only state (not required on the server)

Positions, pan/zoom, selection, hover, pinned ids, local style overrides, and collapsed-neighborhood UI state (if `collapse` is view-only). The client may persist these locally. If a later version wants shared views, a `viewState` document can be added without changing the graph model.

---

## 8. Graph exploration UI — performance

Priority focus area. Treat as iterable: renderer, budgets, and tactics may be tuned, but the **targets below are the acceptance bar** unless the user revises them.

### 8.1 Scale targets

| Tier | Working-set size | Expected behavior |
| --- | --- | --- |
| A — Interactive | ≤ 10,000 **visible** nodes and ≤ 20,000 visible links | Smooth pan, zoom, hover, and selection; layout animation; no dropped interaction. |
| B — Large | 10,000–100,000 items in the working set | Stay interactive using WebGL, level-of-detail, aggregation, and viewport culling. Visible subset should still feel close to Tier A. |
| C — Over budget | > 100,000 items, or device without WebGL | Graceful degradation: auto-cluster, refuse to draw every item, prompt to filter or aggregate, never freeze the tab for more than the hard watchdog. |

"Visible" means items the renderer is asked to paint after filters, closed groups, and time-window hiding. The working set may be larger than the visible set.

### 8.2 Tactics (required capabilities, not a particular library)

1. **WebGL (or equivalent GPU) path** as the default renderer when available; Canvas or SVG fallback only for small graphs or missing WebGL, and the fallback may officially support only Tier A.
2. **Level-of-detail:** at low zoom, simplify or hide labels, badges, and arrows; draw small nodes as points; skip decorations.
3. **Clustering / aggregation:** when visible count would exceed a threshold (configurable, default 15,000 nodes), automatically aggregate off-screen or far-zoom nodes into groups, or require a clustering rule. The user can disable auto-cluster (then the UI must still cull).
4. **Viewport culling:** do not issue draw work for items well outside the viewport (except selected or highlighted items, which may remain emphasized).
5. **Incremental delta application:** apply upserts and removes in-place; do not rebuild the entire scene graph from scratch for a typical live batch.
6. **Layout in a web worker:** the main thread is for input and draw. Layout iterations must not block the main thread for more than the frame budget. Intermediate positions may stream to the main thread for animation.
7. **Coalesce high-rate streams** visually: if more than one delta arrives in one frame, apply them together (configurable; default coalesce all in the same frame).

### 8.3 Measurable budgets

Measure in production-like fixtures (see §13). "p95" is over a 30-second interaction window or a scripted camera path, on a mid-tier laptop (define the CI machine; document it).

| Metric | Tier A target | Tier B target | Hard fail |
| --- | --- | --- | --- |
| Frame rate during pan/zoom | p95 ≥ 50 fps, min ≥ 30 fps | p95 ≥ 30 fps, min ≥ 20 fps | Main-thread block > 200 ms |
| Time to first useful render after snapshot received | ≤ 500 ms for 10k nodes (positions already known or simple place) | ≤ 2 s for 50k with LOD | > 8 s with no first frame |
| Delta apply latency (ack on server to items appearing or disappearing in view, excluding network) | p95 ≤ 50 ms for batches of ≤ 200 events | p95 ≤ 150 ms for batches of ≤ 1,000 | > 1 s for ≤ 200 events |
| Layout first stable frame (initial force or hierarchical, 10k nodes) | ≤ 2 s to an acceptable placement; may continue refining | ≤ 8 s to acceptable, or progressive refine | Watchdog: abort layout after 30 s and keep last positions |
| Search / expand round trip (service in-memory, excluding connector) | p95 ≤ 200 ms | p95 ≤ 500 ms | — |
| Memory | No unbounded growth on a 10-minute live stream of 20 events/s with coalescing | Documented cap; eviction or aggregation kicks in | Tab crash or out-of-memory on Tier A fixture |

### 8.4 Watchdog and degradation

- If a frame takes more than 200 ms, skip non-essential work (labels, shadows, animations) on subsequent frames until fps recovers.
- If the WebGL context is lost, recover or drop to fallback and notify the user.
- If the working set exceeds Tier C, automatically switch to aggregated view and show a banner: count of hidden items and how to filter.

### 8.5 Acceptance criteria (performance)

- A scripted fixture of 10,000 nodes and 15,000 links meets Tier A budgets on the documented CI machine.
- A fixture of 80,000 nodes meets Tier B (interactive pan at ≥ 20 fps min) with LOD and culling enabled.
- Applying a 200-event delta does not rebuild the scene from scratch (assert via instrumentation: incremental update path used).
- Layout runs off the main thread (assert: worker or equivalent; main thread event loop still services input during layout).

---

## 9. Layouts

Priority focus area. Layout is a **pure function of the current visible graph plus options plus previous positions plus pin set**, run in a worker. Style does not change topology. Iterable via a **layout config** object.

### 9.1 Layout kinds (required in v1)

| Kind | Behavior |
| --- | --- |
| `force` | Force-directed (organic-style): connected nodes attract, others repel, crossings reduced when practical. Default for general networks. |
| `hierarchy` | Nodes assigned to levels (from a `level` property, from declared root ids, or inferred from directed link direction). Levels laid out along one axis; order within a level reduces crossings. Orientation: up / down / left / right (default down). |
| `radial` | Levels become concentric rings around one or more roots (required: root ids or a level property). |
| `circular` | Nodes on a circle (optionally one circle per connected component). Order can be by type, by property, or to reduce crossings. |
| `grid` | Rows and columns. Order by property or insertion. Useful inside open groups and for unconnected sets. |
| `structural` | Nodes that share the same neighbor set are placed near each other (structural equivalence / shared-neighborhood grouping). |

**Component packing:** after laying out each connected component, pack components (`circle`, `rectangle`, or `keep` / incremental). Default for `force` and `structural`: circle-like packing; for `hierarchy`: align levels across components when requested.

### 9.2 Options (layout config)

Common options (all optional; defaults in parentheses):

- `kind` (`force`)
- `spacing` (medium; a 0–10 tightness scale is allowed, higher = closer)
- `animate` (true), `durationMs` (400)
- `incremental` (true)
- `seeds` / `roots` (node ids) for `hierarchy` and `radial`
- `levelProperty` (property name whose numeric values are levels)
- `orientation` for `hierarchy`
- `orderBy` for levels, circles, or grid
- `pack` (`circle` | `rectangle` | `align` | `keep`)

Unknown options are ignored (forward compatible). The UI exposes these as controls bound to the same config object.

### 9.3 Incremental / stable layout (default)

When `incremental` is true (default):

- **Pinned** nodes do not move (see §9.4).
- **Existing unpinned nodes** keep their positions as a starting point. The algorithm may nudge them only as needed to resolve overlap or to place new neighbors. It must **not** randomly re-initialize existing positions.
- **New nodes** are placed near their already-visible neighbors if any; otherwise in a free region (not on top of the existing mass).
- **Removed nodes** free space; remaining nodes should not slam into the hole in one jump (optional gentle relax).
- A **full relayout** (random or fresh initialization) runs only when the user requests "relayout," when the kind changes, or when `incremental` is false.

When the first layout runs on a snapshot with no positions, a full layout is used.

### 9.4 Pinning

- The user can pin and unpin selected nodes. Pinned nodes have fixed world coordinates during layout and during stream-driven nudges.
- Dragging a node moves it and, if "pin on drag" is enabled (default true), pins it.
- Pins are client view-state. They persist across deltas for the same id. If a pinned id is removed and later re-upserted, the pin may be restored if the view-state still holds it (default: restore).

### 9.5 Animation

- Transitions between position sets are interpolated over `durationMs` when `animate` is true.
- If a new layout result arrives before the animation finishes, cancel or blend (default: blend toward the latest target).
- Animation must be skippable (user preference, or automatically skipped if fps is below the degradation threshold).
- Stream deltas that add a few nodes should animate those nodes into place without flashing the whole graph.

### 9.6 Layout of groups

- **Closed group:** treated as a single supernode for the top-level layout. Size reflects member count or a configured minimum.
- **Open group:** members are laid out *inside* the group with a chosen inner layout (`force`, `grid`, `hierarchy`, `circular`; default `grid` for rectangular groups, `force` for loose clusters). The group boundary grows to fit. The outer layout treats the open group's bounding box as a unit.
- Nested groups: layout inside-out (innermost first).
- Auto-clusters created for performance follow the same closed-group treatment until the user zooms in or expands them.

### 9.7 Acceptance criteria (layouts)

- Switching kind from `force` to `hierarchy` on a directed tree-like fixture produces visually distinct level bands (automated: variance of y — or x, given orientation — within a declared level is smaller than between levels).
- Incremental add of 20 neighbors to a 1,000-node laid-out graph: at least 90% of pre-existing unpinned nodes move less than a documented threshold (for example 10% of the graph's bounding-box diagonal) when `incremental` is true; the same add with `incremental` false may move more.
- Pinned nodes have identical coordinates before and after a layout pass.
- Closed groups do not show member nodes; opening a group reveals members without losing outer context.
- Layout work during a 10k-node `force` run does not block the main thread beyond the frame budget (§8).

---

## 10. Node style, link style, and visuals

Priority focus area. All of the following is driven by a **versioned style config** (JSON). Designers can iterate by editing config, not code, for colors, sizes, icons, and rules. Code changes are only required for new rule operators or new visual channels.

### 10.1 Style config shape

```
{
  "version": 1,
  "theme": "dark" | "light",
  "background": optional color,
  "nodeDefaults": { "shape", "size", "color", "border", "label" },
  "linkDefaults": { "width", "color", "style", "arrow" },
  "rules": [ /* evaluated in order; later matching rules override earlier for the same channel */ ],
  "legend": { "show": true, "title": "..." }
}
```

A **rule**:

```
{
  "id": "people-are-blue",
  "when": { "kind": "node", "type": "Person" },
  "apply": { "color": "#0000aa", "size": 12, "icon": "user", "shape": "circle" }
}
```

`when` may also be a property test, for example `{ "property": "risk", "op": ">=", "value": 80 }`.

Supported `when` operators (v1): `type` equals or in list; `kind`; property `eq`, `neq`, `in`, `>=`, `<=`, `contains` (string); `sourceId`; boolean `and` / `or` / `not`. Unrecognized operators are ignored with a config warning, not a crash.

**Channels for nodes:** color, size (area or radius; document the unit), shape (`circle`, `square`, `diamond`, `hexagon`), icon (named icon from a bundled set, or a URL if allowlisted), label (visibility, max length, font size), border color/width, badges/glyphs (up to N, default 4: short text or icon at compass positions), opacity.

**Channels for links:** width, color, dash pattern (`solid`, `dashed`, `dotted`), arrow at `to` (and optionally `from`), curvature or bundling flag, opacity, label.

**Derived mappings:** a rule may set `size` from a numeric property via a scale (`linear` or `log`, domain min/max, range min/max). Invalid or missing values use the default.

### 10.2 Selection, hover, and neighborhood highlight

- **Hover** (pointer over an item): emphasize that item; optionally dim others (config).
- **Select** (click; shift-click or brush for multi): selected items use a high-contrast outline. Selection is client state.
- **Highlight neighbors** (default on for the primary selection): 1-hop neighbors and connecting links are emphasized; the rest are dimmed (configurable strength). Does not change the working set.
- Keyboard: Escape clears selection; a modifier plus A selects all **visible** items (must remain responsive at Tier A; at Tier B may cap or no-op with a message).

### 10.3 Themes

- `light` and `dark` are required. Switching theme remaps default colors and must keep type-color associations distinguishable (do not use the same hue for two types that were distinct).
- Contrast: labels and critical badges must remain readable against the background (aim for WCAG AA for label text where labels are shown).
- Theme switch does not require a reload or a new snapshot.

### 10.4 Legend

- Auto-built from style rules that set color, shape, or icon by `type` or by a documented property.
- Hidden types (filtered out) may appear greyed or be omitted (config, default: omit types with zero visible items).
- Clicking a legend entry may isolate or fade that type (optional, default: filter-toggle).

### 10.5 Link bundling (visual)

- Optional visual aggregation of links that share a corridor or the same ends. Does not change the data model.
- When many links share the same two ends, they may be drawn as one **aggregate link** whose width or badge reflects count; hover or click reveals the set. Configurable on/off (default: aggregate when count is at least 3).

### 10.6 Acceptance criteria (visuals)

- A style config that colors `type=Person` blue and sizes nodes by `properties.degree` is applied without code changes; a screenshot or pixel test on a fixture graph matches expected colors and sizes within a tolerance.
- Hover and select are visually distinct from default and from each other.
- Neighbor highlight shows all 1-hop neighbors of a selected node and no non-neighbors (test on a small fixture).
- Dark and light themes both render labels above a minimum contrast on the default background.
- The legend lists each type present in the fixture and updates when a type filter is applied.
- Invalid style config (bad color, unknown field) does not crash; defaults apply and a warning is recorded.

---

## 11. Exploration interactions

### 11.1 Search

- Text search over `label`, `id`, and configured property fields (case-insensitive substring in v1; optional exact match).
- Results listed and optionally focused on the canvas (pan to first hit; highlight all hits).
- Search may query the in-memory working set only, or also the service and connectors (`scope`: `view` | `graph` | `sources`). Default: `view`, with an explicit action to search the graph or sources and add results to the working set.

### 11.2 Expand and collapse neighbors

- **Expand:** user action on one or more nodes calls `expand` (§7.3). New nodes are added, laid out incrementally, and animated in. If truncated, the UI shows "more" and can request another page.
- **Collapse:** hide (view-only or via `release`) neighbors that are not selected, not pinned, and not otherwise kept. Expanding again must not require a full snapshot if items are still in the working set.

### 11.3 Filters

- By `type` (multi-select), by property (operators as in style rules), by `sourceId`, and by time (§11.6).
- Filters can be view-only (hide items) or working-set filters (`filter.set` asks the service to drop non-matching items from the set). Default for type and property toggles: **view-only hide**, so unhiding is instant. A control can "apply to working set" for large graphs.
- Hidden items do not receive pointer events and are excluded from visible counts and default search scope `view`.

### 11.4 Shortest path

- User picks two nodes (or a from/to in the search UI). The service computes a shortest path on the **permissioned graph** (in memory first; optionally connectors later — v1: in-memory only, and the UI must say if the path may be incomplete because of partial load).
- Default: unweighted, directed if links are directed and the user did not request undirected.
- The path is highlighted; items on the path not in view are upserted.
- If no path: a clear message, not an error crash.

### 11.5 Grouping

- Group by type, by a property, or by manual selection.
- Open and close groups (§9.6, §3.4).
- Ungroup restores members to the top level with incremental layout.

### 11.6 Time slider (especially for streams)

- A slider and optional range bracket over `eventTime`.
- Dragging filters visibility to the window. Live/follow mode advances the window end.
- Play and pause for the stream window.
- Items without time use `updatedAt` or are treated as "always present" (config, default: use `updatedAt`).

### 11.7 General interaction rules

- All destructive-looking actions in v1 (`release`, clear view) affect the **working set or view**, not the source systems. The UI copy must not say "delete from database."
- Undo/redo for view operations (selection, pan, pin, group, filter, layout kind) is desirable; v1 minimum: undo last layout kind change and last group or filter toggle (best effort).
- Accessibility: keyboard focus for search and selection; do not rely on color alone to convey type (shape or label as well).

### 11.8 Acceptance criteria (interactions)

- Search in `view` scope finds a labeled node and pans to it.
- Expand on a fixture node with 5 neighbors adds those 5 and their links; a second expand is truncated when limit=2 and offers more.
- Type filter hides and restores nodes of that type without a new server snapshot (view-only mode).
- Shortest path on a known 3-hop fixture highlights exactly that path.
- Time window excluding an item hides it; widening the window shows it again without a new ingest.
- Group-by-type then close groups reduces visible top-level glyphs to the number of types.

---

## 12. Suggested open-source stack

Recommendations only. Substitutions are allowed if this spec's behavior and tests are met. Licenses should be re-checked at implementation time.

| Layer | Suggestion | License (verify) | Notes |
| --- | --- | --- | --- |
| UI graph model | graphology (https://github.com/graphology/graphology) | MIT | In-browser graph data structure, algorithms (path, metrics). |
| UI renderer | Sigma.js (https://github.com/jacomyal/sigma.js) — WebGL, works with graphology | MIT | Good default for Tier A/B performance. |
| Alternative UI | Cytoscape.js (https://github.com/cytoscape/cytoscape.js) | MIT | Strong interaction and style model; confirm WebGL / large-graph path before committing to Tier B. |
| Layouts | graphology layout packages, or other WASM/in-house force and hierarchy in a worker | varies (prefer MIT or Apache-2.0; do not use GPL in a closed product without legal review) | Hierarchical and force can be implemented in-house if needed. |
| UI app shell | TypeScript, React or Solid, Vite | MIT | Style config and controls as plain JSON. |
| Graph service | TypeScript on Node (Fastify or similar) **or** Python 3 (FastAPI) | MIT / BSD / Apache-2.0 | In-memory store as a process-local structure first; a broker optional later for multi-process. |
| Connectors | Official Neo4j driver; `pg` or asyncpg for Postgres; standard HTTP client for REST | Apache-2.0 / MIT | Credentials in a secret store, not in the repo. |
| Streaming ingest | WebSocket or HTTP/2 for direct producers; optional NATS or Kafka consumer inside the service | Apache-2.0 | The contract in §6 is independent of the broker. |
| Tests | Playwright or similar for UI budgets; fixture graphs; a **known-bad** implementation module (§13.3) | MIT | — |

Do not include commercial visualization SDKs in the build.

---

## 13. Acceptance tests

Tests are derived from this spec. A change that breaks a test here is a spec or product failure. Automated tests should run in CI on a documented machine class.

### 13.1 Fixture requirements

- **F-small:** 20 nodes, 25 links, mixed types, known shortest path, known degrees.
- **F-10k:** 10,000 nodes, 15,000 links, 8 types, positions precomputed (for render tests) and a no-position variant (for layout tests).
- **F-80k:** 80,000 nodes, 100,000 links, for Tier B (may be generated).
- **F-stream:** a recorded batch sequence with duplicates, a gap, a remove-then-re-upsert, and a 200-event burst.
- **F-auth:** two sources, two users, overlapping and exclusive items, a merged item with two provenances.

### 13.2 Test list

**Canonical model and connectors**

1. Valid node and link accepted; empty id rejected; reserved `sys:` prefix rejected for source-provided ids.
2. Link without `toId` rejected; rest of batch can still apply.
3. Cypher-style connector maps a 2-node 1-link query to one link with correct ends (use a fake source driver in tests).
4. SQL connector expand follows a link mapping and returns endpoint nodes; a NULL endpoint row is skipped with a warning.
5. HTTP connector 503 does not delete existing items.
6. Credential strings never appear in connector result envelopes (scan assertions).

**Merge, resolution, permissions, freshness**

7. Two upserts with the same id and identical payload: second is a no-op (no version bump, no delta).
8. Default field-merge keeps a property only present on the stored item and updates a property present on both (newer `eventTime` wins).
9. `replace` policy drops properties absent from the incoming full upsert.
10. `reject-stale` ignores an older `eventTime`.
11. Entity-resolution key rule aliases two ids; links are rewritten to the canonical id; one visible node remains.
12. Tombstone then duplicate remove is a no-op; later upsert revives the id.
13. User who cannot read source A does not receive A-only items; a two-source merged item is hidden if field attribution is off and the user lacks A (fail closed).
14. Link is omitted if the user cannot read one end.

**Streaming**

15. Replaying `F-stream` with at-least-once duplicates yields the same final graph as a single clean play.
16. A `seq` gap with default policy does not apply later events until the gap is filled or the wait expires in the documented way.
17. Producer is credited only after ack; with a paused service, in-flight batches never exceed `maxInFlightBatches`.
18. `eventId` replay does not increment version.
19. Follow-live session sees a 200-event burst applied within the delta budget on the local fixture (network mocked).

**API / session**

20. `session.open` empty, then `search` adds items; `release` removes them from the working set but the service graph still has them.
21. Delta gap triggers resync/snapshot, not a silently diverged view.
22. `path` returns the known path on F-small; incomplete-load warning when a node was never loaded (if applicable).
23. `expand` respects limit and `truncated`.

**Performance**

24. F-10k meets Tier A fps and time-to-first-render budgets (scripted pan/zoom).
25. F-80k with LOD and culling meets Tier B min fps.
26. Instrumentation: 200-event delta uses incremental apply, not full rebuild.
27. Layout of F-10k: worker (or non-blocking) asserted; main thread samples during layout stay under the 200 ms hard fail.

**Layouts**

28. Incremental add movement threshold (§9.7) on a 1,000-node graph.
29. Pinned coordinates unchanged after `force` layout.
30. Hierarchy level separation on a directed fixture.
31. Closed group hides members; open group shows them.

**Visuals and interactions**

32. Style config rule application on F-small (color and size).
33. Neighbor highlight set equals the true 1-hop neighborhood.
34. Dark/light theme switch does not drop items or reset positions.
35. Legend reflects visible types.
36. View-only type filter hides and restores without a new snapshot.
37. Time slider hides items outside the window and shows them again when widened.
38. Search `view` finds and focuses a label.
39. Invalid style config fails soft.

### 13.3 Deliberately wrong implementation (required)

The test suite **must** include a module or flag that is a **known-incorrect implementation** of at least one core rule, and CI must prove that the **real tests fail** when that implementation is selected.

Minimum wrong behaviors to include (one is enough to prove the harness; several are better):

- **W1 — Naive merge:** appends a second node when an id already exists (no dedup).
- **W2 — Non-idempotent stream:** applies duplicate `eventId`s again and increments version.
- **W3 — Full relayout always:** ignores `incremental` and randomizes all unpinned positions on every delta (fails the movement-threshold test).
- **W4 — Permission leak:** returns items from sources the user cannot read.

**Harness rule:**

- Default CI run uses the **correct** implementations; all tests in §13.2 must pass.
- A separate CI job or test parameter (for example `IMPLEMENTATION=wrong`) runs a **subset** (tests 7, 15, 13, 28 as applicable) and **must fail**. If that job passes, the test suite itself is broken and the build is red.
- The wrong implementation must not be shippable as the default binary.

### 13.4 Manual / exploratory (not a substitute for automation)

- 10-minute live stream feel test, dark/light readability, keyboard search, WebGL context restore.

---

## 14. Open questions

These need answers from the user (Billy) before or during the first implementation increment. Defaults in this spec apply until then.

1. **Streaming project — technology and event format.** What does the existing streaming graph project use today (language, broker, file, custom socket)? What does an event look like now (field names, timestamps, id scheme)? Can it emit the contract in §6 directly, or do we need an adapter layer, and who owns that adapter?
2. **Data sizes and rates.** Expected nodes and links in a typical investigation? Peak live event rate (events/s)? Burst size? How long should the time window of live data remain queryable in memory?
3. **Sources in the first increment.** Which of Neo4j, Postgres, generic HTTP, and the stream are in v1? Any must-have store among Neptune, JanusGraph, or others?
4. **Identity and entity resolution.** Are ids already globally unique across sources, or must we implement key-based resolution (and on which keys) in v1?
5. **Permissions model.** How are users authenticated, and how is source-level (or row-level) access expressed today? Is fail-closed "all sources must be readable" acceptable for merged items?
6. **Conflict policy default.** Is field-level last-write-wins (by event time) correct, or must some properties be immutable or source-authoritative?
7. **Write-back.** Confirm v1 is read-and-explore only (this spec's non-goal). If some stream or source must be edited from the UI, that is a new contract.
8. **Deployment.** Single process on a workstation, a small server, or multi-instance? Does the in-memory graph need to survive process restart (snapshot to disk)?
9. **UI stack preference.** Any preference among React plus Sigma/graphology, Cytoscape, or another MIT/Apache renderer? Any banned licenses?
10. **Performance hardware bar.** What machine should define the budgets in §8.3 (developer laptop, a specific VM, a particular GPU)?
11. **Layout defaults.** Preferred first layout (`force` vs `hierarchy`) and whether "pin on drag" and incremental layout should be on by default (this spec says yes).
12. **Theming and branding.** Required color palette, icon set, or typography? Must dark and light both ship in v1 (this spec says yes)?
13. **Sharing and export.** Need to share a view (positions, filters) with another user, or export an image or CSV, in v1?
14. **Compliance.** Any data-residency, audit-log, or classified-handling constraints that affect logging of properties and provenance?

---

## 15. Glossary

| Term | Meaning |
| --- | --- |
| Canonical item | A node or link in the shape defined in §3. |
| Connector | Server adapter from an external store to canonical items. |
| Working set | The items a session is allowed to hold and that the UI may draw. |
| Delta | Incremental upsert/remove message from service to UI. |
| Tombstone | Short-lived record of a deleted id for idempotent removes. |
| Provenance | Which source and native id contributed to an item. |
| Incremental layout | Layout that starts from current positions and minimizes movement of existing nodes. |
| Style config | Versioned JSON that maps data to visual channels. |
| Visible set | Working-set items not hidden by filters, closed groups, time window, or level-of-detail. |

---

## 16. MCP integration (two-way)

*Added for the combined StreamGraph build (2026-11-13). Behaviour-level like the rest of this spec; uses the official Model Context Protocol SDK (MIT).*

### 16.1 Server (inbound): AI clients explore the graph

- **Transports.** stdio (a process a desktop client launches) and Streamable HTTP (a URL on the same server as the UI, e.g. `/mcp`). The HTTP endpoint is stateless (every POST is a self-contained request), rejects other methods, validates the `Host` header against an allowlist (DNS-rebinding guard), and may require a bearer token. In stdio mode nothing but protocol messages may be written to stdout.
- **Read tools (always on).** Graph stats/schema; text search over nodes (optional type filter); get a node plus neighbours to a bounded depth (1–3) with a per-hop limit and direction/type filters; unweighted shortest path; filter a subgraph by type and a property test; run a saved view (or an ad-hoc filter) and return server-computed layout positions for any §9 layout kind; recent applied stream events with a cursor.
- **Resources.** The visible schema, the versioned style config (§10), the saved views.
- **Write tools (off by default).** Upsert node, upsert link, remove item, push a §6 event batch. They exist only when an explicit configuration flag enables them (a disabled write tool must not be listed and any call to it must fail without side effects). Writes go through the §6 contract under a dedicated source id (default `mcp`), so merge, dedupe, provenance and live deltas apply unchanged. A remove may only target items owned by that source; a batch may only target configured stream sources.
- **Permissions.** Every result is filtered exactly as for a UI session of the configured MCP principal (§5 source permissions, fail closed for unknown sources) **and**, for items whose provenance includes the host application (StreamGraph), by that application's own access rules evaluated as a configured user (type-level read decision and property masking; an unknown user sees nothing from that application). A hidden node also hides its links. Paths that would cross an invisible item are reported as not found.
- **Caps.** Every tool result is capped (`maxResults`, default 500) and says when it was truncated; MCP calls must not grow any UI session's working set.

### 16.2 Client (outbound): MCP servers as sources

- A source of kind `mcp` connects to an external MCP server by command (stdio) or URL (Streamable HTTP, auth headers from environment variables only), lists its tools and fails clearly if the configured tool is missing.
- It calls the configured tool at start, on a schedule, and on demand (graph search may pass the search text to a configured argument). The JSON result (structured content, else the first JSON text block) is mapped to canonical items by a **mapping config**: JSON-pointer selections with `*` iteration, id/label/endpoint field paths, constant or field-driven types, a property list (or all), optional id prefixes for links into other sources, and an optional replace-source snapshot mode (items absent from the latest result are tombstoned).
- Mapped items are pushed through the **same §6 streaming contract** as every producer: per-source seq, idempotent re-pulls (unchanged items are no-ops), provenance `{sourceId, nativeId, fetchedAt}`, permissions and live deltas. A failed call never deletes data; it is reported as `source_unavailable`. Links with a missing endpoint are skipped with a `null_endpoint` warning.

### 16.3 Acceptance tests (additions to §13.2)

- M1 Listing tools on a default configuration shows the read tools and resources and no write tool.
- M2 Search returns matching items and never items from a source the MCP principal cannot read.
- M3 Get-node expands by depth; host-application rules deny a type (and its links) and mask properties.
- M4 Results are capped at `maxResults` and flagged truncated.
- M5 Shortest path, subgraph filter, run-view with layout positions, and permission-filtered recent deltas.
- M6 Calling a write tool while writes are disabled is rejected and changes nothing.
- M7 With writes enabled, writes flow through the contract as source `mcp`; removing another source's item is refused.
- M8–M10 An MCP source maps a mock server's tool output into the graph with correct ids, labels, properties, provenance and link direction (in-memory and over stdio; replace-source removal; missing tool reported).
- M11–M13 Streamable HTTP on the combined server (foreign Host refused, GET refused), stdio entry point used by desktop clients, bearer token enforced.
- **Deliberately wrong mapping (required, like §13.3).** A mapping keyed on a non-unique field with reversed link direction, selected by an environment switch, must make M8–M10 fail; the suite asserts that it does.

---

*End of specification. Implement against the behaviors and acceptance tests above. When in doubt, fail closed on permissions, keep layout stable, and keep the canonical model unchanged.*

## 17. Event-driven mode (Kafka), optional

This is modelled on Confluent's *A Guide to Event-Driven Design for Agents and Multi-Agent Systems* (S. Falconer, 2025) and the companion post *Four Design Patterns for Event-Driven, Multi-Agent Systems*. `mode: "inprocess"` stays the **default**. Its behaviour, tests and performance are unchanged. `mode: "kafka"` turns the same SPEC §6 contract into a Kafka topology. The code lives in `explore/kafka/`.

### 17.1 Topology

| Topic (default name) | Cleanup | Key | Content |
|---|---|---|---|
| `graph.changes` | delete | node.* → node id; link.* → **fromId** (sticky per link id); heartbeat → `hb:<sourceId>`; snapshot marker → `snap:<sourceId>` | §6 events with `schemaVersion: 1`, headers `schema.id`, `x-produced-at` |
| `graph.state` | **compact** | `<sourceId>\|<item id>` | Latest full item per source, or `{deleted:true}`. The record is non-null, so deletions survive compaction. Holds `change.eventId` |
| `graph.commands` | delete | Target item id | Agent commands (`upsert_node`, `upsert_link`, `remove_item`) |
| `graph.command-results` | compact,delete | commandId | `applied` / `rejected` + reason + eventIds |
| `graph.dlq` | delete | eventId / original key | `{stage: produce\|consume\|command, reason, value/raw, partition, offset}` + `x-dlq-reason` header |

* **Publisher (StreamGraph side).** `KafkaPublisher.send(batch)` has the same signature as in-process `ingest.receive`. The StreamGraph adapter (§6 mapping, ADAPTER.md), local StreamProducers, `POST /api/explore/ingest` and MCP connectors therefore publish through it. **No StreamGraph source file was changed and no hook was added.** The adapter still wraps GraphStore methods on the instance. Producer settings:
  * idempotent, `acks=all`, `max.in.flight=1`, unlimited retries, Java-compatible murmur2 partitioner;
  * **transactional**: each batch is one transaction writing `graph.changes` + `graph.state`.
* **Re-minted eventIds.** EventIds become `<eventId>~<publisherRun>`, except deterministic command ids. Without this, a restarted local producer that reuses `<producer>:<seq>` would be swallowed by a consumer's restored eventId window. Resending a batch already published in the same run is answered from a publisher-side eventId window, as `duplicates`, without publishing again.
* **Snapshot markers.** A replace-source snapshot spans partitions, so no single partition consumer could evaluate it. The publisher therefore **expands it into explicit removes**, links first, using its per-source key set rebuilt from `graph.state` at start. The markers are still published, with `mode: merge, expanded: true`.
* **Partial upserts** are folded into the previous state record, so `graph.state` always holds a full item.

### 17.2 Explore as a consumer group (read model)

* **Group ids.**
  * Views: `explore-view-<instanceId>`, one group **per instance**, because every instance needs every partition for a full read model. `instanceId` defaults to `<hostname>-<port>`; you can set it with `kafka.instanceId` or `EXPLORE_INSTANCE_ID`.
  * Command workers: one **shared** group (`explore-command-workers`), so work is split.
  * A view that is assigned only some partitions (a misconfigured shared id) reports `status: partial-assignment` and logs a warning.
* **Contract mapping.** `partition = "kafka:<topic>:<p>"`, `seq = offset + 1`. Ingest has a new `seqMode: "monotonic"` (any seq > lastApplied is applied without gap buffering), because offsets are ordered but not contiguous per source.
  * A redelivered offset is a no-op because of the per-(source, partition) seq.
  * A duplicate publication of the same eventId at another offset is a no-op because of the eventId window.
* **Offsets and replay.** autoCommit is off. Each step:
  1. Writes the checkpoint file (read model + ingest cursors + change-feed tail + next offsets) atomically.
  2. **Then** commits the same offsets to the group. This runs every `checkpointEveryMs` (default 1 s), on `REBALANCING`, and on close.
  3. On restart, restores the checkpoint, re-points the group with `admin.setOffsets`, and skips locally any lower offset that is redelivered anyway.
  4. With no checkpoint, bootstraps from compacted `graph.state`, then consumes `graph.changes` from the earliest retained offset. For each `<sourceId>|<id>`, it skips every change up to and including the one the state record was built from. This works even after `graph.changes` is truncated by retention (test K5).
* **Validation.** Every message is validated (JSON Schema v1). Invalid messages go to `graph.dlq` with a reason; the offset advances and the stream never wedges.

### 17.3 Data contracts

* `explore/kafka/schemas/graph-events.v1.json` holds JSON Schema draft-07 documents, each with `$id .../<op>/v1.json`, for:
  * the six event ops;
  * `command`, `commandResult` and `stateRecord`.
* Validation uses `ajv` (MIT) on **produce** (publisher, command emitter, worker) and on **consume** (view consumer, worker, results).
* `schemaVersion` is mandatory. An unknown version is rejected with `unsupported schemaVersion`. `additionalProperties:false` applies at envelope level, and `sys:*` property keys are refused.
* **No Schema Registry is used.** Schemas are validated locally and travel with the code. Headers `schema.id` / `schema.version` identify the version. To move to Confluent Schema Registry / Apicurio / Karapace, register the same JSON Schemas (JSON Schema is a supported format) and swap the local validator for the registry serde.

### 17.4 Agents (MCP)

* `changes_since({cursor, from, limit, types, ops, sourceId, waitMs})` returns applied changes after an opaque cursor, with long-poll up to 30 s.
  * In kafka mode the cursor is per-(source, Kafka partition) `seq = offset + 1`, so **it survives restarts**.
  * `reset: true` means the change ring no longer holds your position: re-read state and continue.
  * The tool also works in-process (the cursor is then valid for the process lifetime).
* Resource `explore://changes` supports `resources/subscribe`. Subscribers get `notifications/resources/updated` (throttled to 100 ms) and then call `changes_since`.
* With `mcp.allowWrites: true` in kafka mode, the write tools become **command emitters** (orchestrator-worker pattern). This keeps `allowWrites` off by default.
  * `upsert_node`, `upsert_link` and `remove_item` validate a command and publish it to `graph.commands` (key = item id).
  * Each returns `commandId` and waits up to `waitMs`, default 5 s, for the result. `command_status` polls.
  * `push_stream_batch` is not offered in kafka mode.
* **Command worker.** Shared group; consume → decide → produce is **one transaction**: change events + state + result + `sendOffsets`, which gives exactly-once.
  * EventIds are deterministic (`cmd:<commandId>:<i>`).
  * Authorisation is in the worker: agents may only remove items written by source `mcp`.
  * Malformed commands go to the DLQ and get a `rejected` result.

### 17.5 Configuration

```json
"mode": "kafka",
"kafka": { "brokers": "localhost:9092", "instanceId": "view-1", "partitions": 6, "replicationFactor": 1,
  "publish": true, "consume": true, "runWorker": true, "bootstrap": "state", "checkpointEveryMs": 1000,
  "topics": { "changes": "graph.changes", "state": "graph.state", "commands": "graph.commands", "results": "graph.command-results", "dlq": "graph.dlq" },
  "groups": { "viewPrefix": "explore-view", "workers": "explore-command-workers", "results": "explore-results" },
  "ssl": true, "sasl": { "mechanism": "plain", "usernameEnv": "KAFKA_API_KEY", "passwordEnv": "KAFKA_API_SECRET" } }
```

* Secrets come **only** from the named environment variables. SASL without TLS is refused: SASL forces TLS on.
* Environment overrides: `EXPLORE_MODE`, `KAFKA_BROKERS`, `EXPLORE_INSTANCE_ID`.
* Topics are created if missing (`createTopics`), so the broker can keep `auto.create.topics.enable=false`.
* Instance roles:
  * `publish:false`: a pure read replica.
  * `consume:false`: a pure publisher.
  * `runWorker`: hosts a command worker when writes are enabled.

### 17.6 Confluent guide → implementation

| Guide principle / pattern | Implementation | Test |
|---|---|---|
| Events are the shared language; structured JSON payloads | §6 events + versioned JSON Schemas on every topic | K0, K6 |
| Immutable append-only log, event sourcing | `graph.changes` is the source of truth for every read model; the read model is a pure function of the log | K3, K4, K5 |
| Replay from the last saved offset restores a failed agent's state | Checkpoint → commit, restore + `setOffsets`, local skip; only new events applied after restart | K3, K2 |
| Many consumers read the same stream in parallel without interference | One group per view instance; instances converge to identical read models | K4 |
| Keying strategy: the same key for events that must be processed in order by one worker | Node id / link fromId keys; per-key order preserved and verified on the topic and in applied order | K1 |
| Orchestrator-worker: commands to a topic, workers as a consumer group, outputs to a second topic, rebalance protocol for fault recovery | MCP write tools → `graph.commands` → shared worker group → `graph.changes` + `graph.command-results`; worker loss → rebalance, every command exactly once | K8, K9 |
| Loose coupling / async / new agents join without disruption | Agents subscribe (`explore://changes`) or long-poll `changes_since`; publishers do not know consumers | K7 |
| Govern: data quality, lineage, traceability | Schema validation both sides, DLQ with reason/stage/coordinates, source provenance on items, `issuer` on commands, deterministic command eventIds | K6, K8 |
| Connect: bring data sources in without hard-coded dependencies | Existing connectors (Neo4j, Postgres, HTTP, MCP) and the StreamGraph adapter publish through the same publisher | demo smoke |
| Real-time responsiveness | 200-event deltas p50 ≈ 19 ms push→applied on a local broker (`proof/kafka-bench.txt`) | bench |
| Process: stream processing (Flink) turns raw events into enriched, aggregated, actionable streams | Optional Apache Flink 2.2.1 job (§18): validate → dedupe → stateful enrichment → degree / change metrics → event-time tumbling + sliding windows → `graph.enriched`, `graph.metrics`, `graph.alerts` | F1–F6 |
| Derived events trigger agents (event-driven alerts) | `degree.spike` alerts with deterministic ids on `graph.alerts`; MCP `stream_alerts` / `node_metrics`; viewer badges | F5, F8 |
| Exactly-once processing and fault-tolerant state | Flink checkpoints + Kafka transactions (2PC sink); kill -9 mid-stream → restore → 0 duplicates, 0 missing (read_committed) | F7, bench |
| Data contracts on derived streams | `graph-derived.v1.json` (enriched, node.metrics, node.window, degree.spike); `schema.id` headers; the processor validates input with the same v1 event schemas (parity with ajv) | F3, F6 |

### 17.7 Not implemented (gaps)

* **Process / Flink.** *Closed in part by §18*: an optional Apache Flink job now does validation, dedupe, stateful enrichment, windowed aggregates and alerts. Still missing: Flink SQL / Table API pipelines, continuous joins with other streams or tables, AI model inference on the stream, and Confluent Cloud for Apache Flink (not tested). Each Explore instance still materialises its own read model in memory.
* **Agentic RAG over streams.** Not covered beyond `changes_since` + read tools.
* **Hierarchical, blackboard and market-based patterns.** Only orchestrator-worker is built. `graph.changes` + `explore://changes` can act as a blackboard for reading, but agents cannot post free-form contributions. There is no bidding/market topic.
* **Schema Registry.** Not used; local validation only (§17.3). There is no compatibility checking across versions; v2 would need a parallel validator and an upcaster.
* **Exactly-once into the read model.** This is effectively-once (checkpoint + seq/eventId dedupe), not transactional with the broker. A crash between checkpoint and commit causes redelivery, which ingest makes a no-op.
* **Checkpoints are full read-model JSON.** Fine at 10k/20k (≈ tens of MB); large graphs need incremental snapshots (RocksDB-style state store).
* **Bootstrap.** It does not materialise tombstones (only live items), so a fresh instance's `tombstones` count differs from a long-running one. The live graph is identical.
* **Cross-key ordering is not guaranteed.** A link (keyed by fromId) can be applied before its `toId` node's upsert. Ingest's auto-stub covers this.
* **Command decisions** use the worker's local read model, which is eventually consistent. There are no optimistic-concurrency versions in commands.
* **kafkajs 2.2.4** is no longer actively maintained. It works with Kafka 4.1 here; it emits a harmless `TimeoutNegativeWarning` on Node 24. Its read_committed filter has a bug with interleaved aborted transactions (it can deliver ABORTED records); `explore/kafka/kafkajs-fix.js` patches it at load time (§18.7, test F9). A future swap to `@confluentinc/kafka-javascript` (librdkafka) should keep the same API surface in `explore/kafka/`.
* **Real Confluent Cloud** (SASL_SSL/PLAIN) was not exercised: only config validation is tested (K0). Testing used a local single-node broker with RF 1.


## 18. Stream processor (Apache Flink), optional

Closes the "Process" gap of §17.7. **Optional and off by default:** with `processor.enabled` unset, in-process and Kafka modes behave exactly as before.

The processor is a real **Apache Flink 2.2.1** DataStream job written in Java (`explore/flink/src/.../GraphStreamProcessor.java`). It uses the Flink Kafka connector 5.0.0-2.2. Locally, it runs as a Flink MiniCluster inside one JVM that the Node app (or a test) starts. The same jar can also be submitted to a Flink cluster with `flink run`; that path is HYPOTHESIS (not tested).

### 18.1 Pipeline

```
graph.changes (read_committed, per-split watermarks, idleness)
  → validate: parse + JSON Schema v1 (the SAME graph-events.v1.json as the Node side; networknt validator)  ──invalid──► graph.dlq
  → keyBy item  (links: "L:<sourceId>|<linkId>", nodes: "N:<id>")
      · dedupe by eventId (MapState, TTL 24 h)
      · link state (fromId, toId, alive) → effect: created | updated | endpoints-changed | removed | noop | unresolved
      · emits per-node deltas (degree / in / out, change count)                     ──side output──► graph.enriched
  → keyBy nodeId
      · node metrics: degree, inDegree, outDegree, total changes, removed flag      ──coalesced (emitEveryMs)──► graph.metrics  key = nodeId
      · tumbling event-time window (windowMs): changes, degreeGained/Lost           ──► graph.metrics  key = nodeId|tumbling|start
          └ degreeGained ≥ spikeThreshold → degree.spike alert                      ──► graph.alerts   key = degree.spike:<node>:<start>
      · sliding event-time window (slidingMs / slideMs)                             ──► graph.metrics  key = nodeId|sliding|start
  → one Kafka sink (EXACTLY_ONCE: transactions committed on checkpoint; or AT_LEAST_ONCE)
```

Semantics:

* **Degree** counts the live links incident to a node, as the stream reports them. A self-loop counts as +1 in and +1 out.
* **Re-upserts.** Re-upserting an existing link changes nothing. An endpoint change moves the degree from the old ends to the new ones.
* **Removes.** A `link.remove` for an unknown or already-removed link does nothing.
* **Node removal.** A `node.remove` sets `removed:true` but keeps link-derived degree. Incident links only stop counting when their own removes arrive. The viewer hides removed nodes anyway.
* **Event time** comes from `eventTime`.
  * Records whose time can't be parsed get `Long.MIN_VALUE`, so they never advance the watermark.
  * A future skew larger than `maxFutureSkewMs` (1 h) is clamped to the Kafka timestamp plus 1 h.
  * Bounded out-of-orderness is `outOfOrdernessMs`. Idle partitions stop holding the watermark back after `idleMs`.
  * Late records still count toward degree but are dropped from windows (allowed lateness 0).
* **Ordering** relies on the §17 keys: node id, and the sticky first `fromId` for links. One item's events stay on one partition, so they arrive in order.

### 18.2 Contracts (`explore/flink/schemas/graph-derived.v1.json`)

The derived-record kinds are `graph.enriched`, `node.metrics`, `node.window` and `degree.spike`, each with `schemaVersion: 1` and `additionalProperties: false`.

* **Headers** on every record: `content-type`, `schema.id` = `<kind>/v1`, and `schema.version`.
* **DLQ records** keep the §17 shape: `{stage:"process", reason, at, instance, eventId?, partition, offset, value}`, plus the `x-dlq-reason` and `x-dlq-stage` headers.
* **Viewer-side checks.** The viewer-side store validates every record it reads and drops invalid ones, which it counts.

### 18.3 Delivery and fault tolerance

* **Checkpoints.** HashMap state backend, file checkpoints in `<dataDir>/flink-checkpoints/<processorId>/`, EXACTLY_ONCE mode, every `checkpointMs`, with 3 retained on cancellation.
* **Restart.** The runner restores the newest *completed* checkpoint (a `chk-N` that has `_metadata`) through `execution.state-recovery.path`. All operators have stable `uid`s, and max parallelism is pinned at 128.
* **Exactly-once (default).** The Kafka sink uses transactions that commit when a checkpoint completes. After a kill -9, the dead JVM's open transactions are fenced and aborted. Downstream readers must use read_committed.
* **At-least-once option.** `delivery: "at-least-once"` gives lower latency. Every output is keyed and deterministic (metrics by node, windows by node+window, alerts by alertId), so compacted topics and upserting consumers make replays idempotent.
* **Source offsets** are committed to the group `processorId` on each checkpoint, for lag monitoring only. Restores use checkpoint state.

### 18.4 Viewer and MCP

* **Viewer.** In `/explore`, a "Stream metrics" panel appears only when the processor is enabled.
  * Node size scales with stream degree: × (1 + 0.35·log2(1+degree)), capped at 3×.
  * Nodes with a `degree.spike` alert get a ⚠ badge and an amber or red ring.
  * The panel polls `POST /api/explore/processor/metrics {ids}` every 2 s.
  * The endpoint returns metrics and alerts only for live nodes the UI principal may see: source access policy plus StreamGraph ABAC through `ex.guard`.
* **Stats.** `GET /api/explore/processor` and `/api/explore/stats.processor` report job status, Flink version, delivery mode, restore source and store counters.
* **MCP read tools** are registered only when the processor is enabled, and they use the same permission filter:
  * `node_metrics`: `ids`, or the top N by degree or changes.
  * `stream_alerts`: recent alerts, with an optional `nodeId` filter.

### 18.5 Configuration (`explore.config.json`)

```json
{ "mode": "kafka",
  "processor": { "enabled": true, "launch": true, "processorId": "graph-processor", "delivery": "exactly-once",
    "checkpointMs": 1000, "windowMs": 60000, "slidingMs": 300000, "slideMs": 60000, "spikeThreshold": 5,
    "outOfOrdernessMs": 2000, "idleMs": 2000, "dedupeTtlMs": 86400000, "emitEveryMs": 200, "parallelism": 2, "heap": "768m",
    "topics": { "enriched": "graph.enriched", "metrics": "graph.metrics", "alerts": "graph.alerts" } } }
```

* **Environment.** `EXPLORE_PROCESSOR=1` turns the processor on. `FLINK_IMPL=wrong` selects the wrong pipeline (tests only). `FLINK_HOME`, `JAVA_HOME` and `STREAMGRAPH_JAVA` override the runtime lookup.
* **Launch.** `launch:false` means the job runs elsewhere, for example on a Flink cluster, and this instance only reads its outputs.
* **Topics.** Missing topics are created: `graph.metrics` and `graph.alerts` as compact,delete (7 d and 30 d), and `graph.enriched` as delete.
* **Mode.** The processor needs `mode: "kafka"`; startup fails clearly otherwise.

### 18.6 Tests (`explore/test/flink.test.js`, real broker + real Flink; skipped, never mocked, when either is missing)

| Test | What it proves |
|---|---|
| F0 | Opt-in default, config merge, derived contracts compile, newest *completed* checkpoint chosen |
| F1 | Degree / in / out through create, re-upsert, endpoint change, remove (toId resolved from state), repeated remove |
| F2 | Re-sent batch with the same eventIds counted once; one enriched record per eventId |
| F3 | Flink validator verdicts == Node ajv verdicts on 12 fixtures; invalid JSON / non-objects → DLQ with stage/reason headers |
| F4 | Event-time tumbling (10 s) and sliding (20 s / 10 s) windows: exact counts per window start, one record per key |
| F5 | Spike alert only for ≥ 5 new links in one window; spread-out links and re-upserts do not alert; deterministic alertId |
| F6 | Every output validates against graph-derived.v1 and carries schema headers; metrics keyed by node id |
| F7 | kill -9 while input flows → restore from checkpoint → all 6000 events enriched exactly once, exact final degrees, unique window keys |
| F8 | createExplore integration: off by default (no tools), refuses inprocess, viewer API + MCP tools return permission-filtered metrics and alerts |
| F9 | kafkajs read_committed fix (unit) |

**Deliberately wrong pipeline** (`FLINK_IMPL=wrong`, `proof/flink-wrong-impl-run.txt`): no dedupe, every link upsert counted as a new link, processing-time windows, at-least-once sink. It fails F1, F2, F4, F5 and F7.

### 18.7 Bugs found while building

1. **Dedupe stage reordered events.**
   * Cause: a separate `keyBy(eventId)` dedupe stage scattered one item's events across subtasks, so a re-upsert overtook its create (first smoke run).
   * Fix: dedupe now lives in the item-keyed operator.
2. **Junk records advanced the watermark.**
   * Cause: a junk record stamped with the Kafka time pushed the watermark to "now", which made every later event-time window late.
   * Found by: F3 followed by F4 and F5.
   * Fix: unparseable times get `Long.MIN_VALUE`, and future skew is clamped.
3. **kafkajs 2.2.4 read_committed bug.**
   * Symptom: after a crash, the 2-way Flink sink left two interleaved aborted transactions. The broker sent `abortedTransactions` out of `firstOffset` order, and kafkajs activates at most one per message. It then delivered aborted records, 30–79 per run.
   * Evidence:
     * `kafka-dump-log` showed ABORT markers.
     * `kafka-console-consumer --isolation-level read_committed` read 6000 unique records with 0 duplicates.
     * Stock kafkajs read 6030 records; the fix brings that to 6000.
   * Fix: `explore/kafka/kafkajs-fix.js`, loaded by `kafka/config.js`. It also protects the §17 consumers.
   * Proof: `proof/flink-kafkajs-aborted-bug.txt`.
4. **Orphaned JVM.**
   * Cause: stopping the Node app by PID (or with kill -9) left the Flink JVM running.
   * Fix: the runner passes `--exit-on-stdin-eof`, and the job halts when its stdin closes. A process `exit` hook also kills it.
   * Verified: kill -9 of the Node process leaves no JVM behind.

### 18.8 Measured (`proof/flink-bench.txt`; 8 vCPU box, one broker, MiniCluster parallelism 2)

| Measure | Result |
|---|---|
| Backlog throughput (100k events: 10k nodes + 90k links, committed to `graph.enriched`) | ≈ 20.9k events/s after job start (≈ 13.5k/s including the 2.6 s JVM + job start) |
| changes → metrics latency, 2000 ev/s, exactly-once, checkpoint 1000 ms | p50 713 ms, p95 1170 ms, p99 1235 ms |
| same, exactly-once, checkpoint 250 ms | p50 285 ms, p95 431 ms, p99 458 ms |
| same, at-least-once (emit 50 ms) | p50 133 ms, p95 270 ms, p99 293 ms |
| kill -9 under 2000 ev/s → restore from checkpoint | restart 2.3 s, first new committed output 3.5 s after the kill; 31,500 sent, 0 duplicates, 0 missing |

Latency is measured from the change's `x-produced-at` until a read_committed consumer receives the `node.metrics` record. Because metrics are coalesced, it uses the oldest change in each update, which makes the figure conservative. Single run on one box; HYPOTHESIS that these figures carry over to other hardware.

### 18.9 Gaps

* **Not covered:** Flink SQL / Table API, joins with other streams or tables, model inference, a Flink cluster (`flink run`, HYPOTHESIS), Confluent Cloud for Apache Flink, Schema Registry, and RocksDB state for very large graphs (HashMap state is in heap).
* **Late records** are dropped from windows silently, with no late-data side output or counter.
* **Node removal** does not cascade into degree (§18.1).
* **Exactly-once latency** is bounded below by the checkpoint interval.
* **Windows** support only one key (node). There are no per-type or per-community aggregates yet.
* **Windows on Billy's computer** are HYPOTHESIS: `flink:setup` uses `tar` (built into Windows 10+) and the runner uses `java -cp` with `;`. Only Linux was exercised.


## 19. Saved views and presenter mode

Added 2026-11-13. Optional: with no saved views the Explore UI behaves exactly as before (all new filters default to empty).

### 19.1 What a view holds
A saved view is `{ id, name, description, createdAt, updatedAt, origin, state }`. `state` (v1) holds:

| Field | Meaning |
|---|---|
| `layout` | layout kind and settings: `kind, spacing, orientation, incremental, animate, roots, durationMs, levelProperty, orderBy, pack, iterations` |
| `positions` | optional `{ nodeId: [x, y] }`. When present, no layout runs on load. "Save node positions" in the panel |
| `filters` | `hiddenTypes`, `hiddenLinkTypes`, `where` (`[{ type?, property, op, value }]`; a condition only applies to its own type), `neighborhood` (`{ ids, depth 1-3, linkTypes? }`: show only these nodes and their neighbours over visible link types), `hideIsolated` |
| `style` | `{ url }` (same-origin path only) or `{ inline: <style config> }` |
| `theme` | `dark` / `light` |
| `camera` | `{ x, y, ratio, angle }` in sigma's normalised camera space; or `fit: "visible" | "selection"` when no camera is stored |
| `selection`, `pinned` | node ids |
| `time` | `{ live, cut }` (`cut` is the slider position 0-1000) |
| `processor` | Flink overlay toggles `{ size, alerts }` |
| `presenter` | optional slide `title` and `caption` |

Every state goes through `normalizeViewState()` (explore/shared/saved-views.js): unknown fields are dropped, bad parts become defaults plus warnings, and it never throws.

### 19.2 Storage and API
* Server-side store: `<data dir>/explore-views.json` (same folder as StreamGraph's data; atomic write via temp file + rename). In-memory when there is no data dir.
* `GET /api/explore/views` (list + presentations) · `POST /api/explore/views` · `GET|PUT|DELETE /api/explore/views/<id>` (PUT renames and/or replaces state; the id never changes) · `GET /api/explore/views-export[?ids=a,b]` · `POST /api/explore/views-import { bundle, mode: merge|replace }` · `GET /api/explore/presentations` · `GET|PUT /api/explore/presentations/<id> { name, viewIds }`.
* Export bundle: `{ format: "streamgraph-explore-views", version: 1, views, presentations }`.
* Seeds: `config.savedViews.seedFile` imports a bundle at start-up without overwriting user edits. Deleted seed views stay deleted.
* Shareable URL: `/explore?view=<id>` restores the view after the snapshot loads. `&present=1[&deck=<id>]` opens presenter mode.

### 19.3 Access rules
On every read (UI API and MCP), node ids referenced by a view (selection, pinned, roots, positions, neighbourhood seeds) are reduced to the ids the caller may see. That uses the same source policy and StreamGraph ABAC guard as every other read. Hidden ids are dropped silently and never reported.

### 19.4 Presenter mode
* Toggle with the **Present** button, or `?present=1`. It hides the left and right panels, the footer and all header tools except **Exit presenter**.
* It shows the slide title and caption, a legend, and a slide counter.
  * The legend covers node types with counts. When the style uses symbols, each type shows its symbol.
  * It also covers link colours. These come from `legend.links`, or from every link rule keyed by one type, labelled with `legend.linkLabels`, and are listed only when visible.
  * Symbol modifiers come from `symbols.legend.modifiers`, plus icon credits.
* Labels go from 14 to 20 px, and label density drops so they stay readable.
* A presentation is an ordered list of view ids. With none defined, presenter mode uses all views in list order.
* Keys: → / PageDown / Space go to the next slide; ← / PageUp go back; Home and End jump to the first and last; Esc exits. Esc leaves the current view loaded.

### 19.5 MCP
* Read tools, always on: `list_views` and `get_view { id }`. `get_view` returns the access-filtered view plus its `/explore?view=` URL.
* `save_view` and `delete_view` exist only with `mcp.allowWrites: true`, in both in-process and Kafka mode. Views are UI state, not graph data, so they do not go through the command topic.

### 19.6 Tests and the deliberately wrong store
* `explore/test/views.test.js` V1-V7 cover round-trip, rename and delete, restart persistence and seeds, export/import, normalisation, MCP with access filtering, and UI API filtering.
* `explore/test/views-ui.test.js` P1-P3 cover URL restore, UI save→load including camera and time, and presenter mode.
* `VIEWS_IMPL=wrong` selects `explore/server/views-wrong.js`, which saves only the layout, makes rename create a duplicate, and leaks hidden ids. V1, V2, V3, V6 and V7 must fail against it. `wrong-impl.test.js` enforces this, and `npm run proof:wrong` writes `proof/views-wrong-impl-run.txt`.

## 20. Composable node symbols

Added 2026-11-13. This is inspired by MIL-STD-2525 / APP-6 symbology, without copying its symbol set; the real one is optional, see §20.5. It is off unless a style config has a `symbols` block, so the default renderer is unchanged.

### 20.1 Composition
| Part | Encodes | Style channel |
|---|---|---|
| Frame shape | category / affiliation | `frame`: `circle, square, diamond, quatrefoil, hexagon, octagon, triangle, rectangle, shield`, or `{ "path": "<SVG path in a 100×100 box>" }` |
| Fill colour | status | `status`: a key, or `{ property }`; colours in `symbols.status.colors` (defaults ok / warning / critical / unknown / planned). Without a status the type colour is used |
| Central glyph | what it is | `glyph`: `"name"` (style `symbols.iconSet`), `"set/name"`, or `{ property, map, default }` |
| Dashed frame | planned / estimated / uncertain | `frameDash: "dashed"` |
| Corner badges | modifiers | `corners: { ne|nw|se|sw: { kind: alert | count | lock | text | icon, property?, value?, text?, icon?, color? } }`. Rules merge corners. Counts above 99 show as `99+` |
| Text fields | label, unique id, quantity | `symbols.fields.uid { property, maxRatio, format }` and `symbols.fields.quantity { … }`: added to the label when the camera ratio is ≤ `maxRatio` (zoomed in) |

Rules are evaluated as in §10, so conditions such as `property gpuUsableIsEstimate eq true → frameDash dashed` work as expected.

### 20.2 Rendering
`compileStyle` resolves every node to a symbol descriptor and a stable cache key: frame, fill, dash, glyph and badge texts. The browser composes each distinct key once on a canvas. A second, dimmed copy is made for highlight dimming. sigma draws them with `@sigma/node-image`'s texture-atlas layer over a transparent square, so the GPU cost is one textured quad per node. While a symbol composes, the node keeps its plain shape. Picking uses the square.

### 20.3 Icon sets and licences
* Bundled sets:
  * `lucide` (ISC).
  * `majesticons:line` and `majesticons:solid` (MIT).
* All are served from the installed packages at `/explore/icons/<set>/<name>.svg`.
* `GET /api/explore/icons[?set=&q=]` lists the sets and their names.
* Custom folders: `explore/icons-custom/<set>/` or `<data dir>/icons/<set>/`. To use one, the style must declare `symbols.iconSets.<set> = { license, attribution?, source? }`. A set without a `license` is refused with a warning.
* Icons from mixed-licence aggregators and attribution-required packs are never bundled (see explore/LICENSES.md).

### 20.4 Legend
The side legend shows each type's symbol. Presenter mode adds the modifier legend (`symbols.legend.modifiers: [{ label, apply }]`) and icon credits.

### 20.5 Optional real MIL-STD-2525 / APP-6
With `symbols.milsymbol: { property: "sidc" }`, or a `sidc` rule channel, a node with a valid SIDC is drawn by the MIT-licensed `milsymbol` package. It is a separate lazy bundle, `explore/public/milsymbol.js`, loaded only when it is used.

### 20.6 Will It Run? demo
`explore/demos/willitrun/style-symbols.json` is used by the demo's saved views:
* Frames: Models are circles, GPUs squares, Macs diamonds, APUs hexagons and Quantizations quatrefoils.
* Glyphs: Lucide `brain-circuit` and `gpu`, and Majesticons `laptop`, `cpu` and `data`.
* Hardware fill shows memory tier.
* Badges: a `MoE` corner badge on MoE models, and a memory GB count on hardware.
* A dashed frame marks hardware whose usable memory is an estimate.
* Fields: `hwId` and `memGB` appear when zoomed in.

### 20.7 Tests and the deliberately wrong resolver
* `explore/test/icons.test.js` S1-S7 and `views-ui.test.js` P4-P5.
* `SYMBOLS_IMPL=wrong` (Node only) ignores status, drops the dashed frame and leaves badges out of the cache key. S1, S2 and S5 must fail against it. `proof/icons-wrong-impl-run.txt` records the run.

### 20.8 Performance check
* `npm run shots:views` writes `proof/icons-10k-perf.txt`, using 10,000 nodes and 20,000 links on one page.
* It records the number of distinct atlas images, the time to resolve and apply the style, the time until every node shows its symbol, and idle fps with symbols versus the plain style.
* The box renders with software WebGL (SwiftShader), so its frame rates are not GPU numbers.

---

## 21. Entity resolution (records → entities), optional

Status: implemented in `explore/er/` (2026-11-13). Off by default; `er.enabled: true` in `explore.config.json`, `--er` on `explore/combined.js`, or `EXPLORE_ER=1`. Every statement below is labelled **CONFIRMED** (checked in code, a test, a measurement or a cited source) or **HYPOTHESIS** (expected, not verified).

### 21.1 Goal and scope

§5.4 merges items that share an id or a configured key. §21 adds probabilistic entity resolution over *record nodes*: records from several sources (`Person`, `Organization` by default) stay as they are, and a derived **ER stage** adds `Entity` nodes, `RESOLVES_TO` links (record → entity), `POSSIBLY_SAME` links (entity ↔ entity, with a score) and a per-feature explanation for every decision. Records are never edited or merged by the ER stage. Resolution is incremental: merges and splits (un-merges) happen as records arrive, change or disappear, and entity ids stay stable.

Behaviour is modelled on what Senzing's **public** documentation describes (no Senzing code, SDK or licence is used; Senzing is commercial and is not a dependency):

| Senzing behaviour (public docs) | Here | Status |
|---|---|---|
| Records identified by DATA_SOURCE + RECORD_ID; same record id replaces the record ([how it works](https://senzing.com/how-entity-resolution-works-with-senzing/), [glossary](https://senzing.com/glossary/)) | record node id = `<source>:<recordId>`; `dataSource`/`recordId` on `RESOLVES_TO`; an upsert replaces the record and re-resolves it | CONFIRMED (tests E4, E5) |
| Entity-centric, resolved as records arrive, past decisions revisited ([how it works](https://senzing.com/how-entity-resolution-works-with-senzing/)) | incremental clustering per change batch; merges and splits (E4, E5, EK1) | CONFIRMED |
| Same / possibly same / possibly related; possibly-same entities stay separate | `match` (score ≥ threshold) → same entity; `possible` (maybe ≤ score < threshold) → `POSSIBLY_SAME`; disclosed relationships are just the normal links (e.g. `WORKS_AT`) | CONFIRMED (E6). "Possibly related" (discovered relationships on shared attributes without a name match) is not implemented |
| MATCH_KEY such as `+NAME+DOB+EMAIL`, `-DOB` for features that detract ([get_entity response](https://www.senzing.com/docs/tutorials/get_entity_response/)) | `matchKey` on `RESOLVES_TO`/`POSSIBLY_SAME`, built from feature weights (`+` positive, `-` negative) | CONFIRMED |
| why / how ([why](https://senzing.com/docs/python/3/g2engine/why/), [how](https://senzing.com/docs/python/3/g2engine/how/)) | `why_matched(a, b?)` (per-feature evidence, decision against thresholds), `resolve_entity` (records, match keys, merge/split history) | CONFIRMED (E3, E7). No step-by-step "how" replay beyond the history list |
| Generic values stop being candidate keys | not implemented (no term-frequency or generic-value handling) | gap |

### 21.2 Engine choice (evaluation 2026-11-13)

Requirement: commercially usable without copyleft (no AGPL/GPL bundling), maintained, incremental scoring, explanations, fits a Node/JVM/Kafka stack. Engine sits behind a pluggable sidecar interface (§21.4), so it can be swapped.

| Library | Licence | Latest release | Maintenance | Incremental / streaming | Explanations | Stack fit | Verdict |
|---|---|---|---|---|---|---|---|
| **Splink** | MIT ([repo](https://github.com/moj-analytical-services/splink), [PyPI](https://pypi.org/project/splink/)) | 5.0.0, 2026-09-28 (PyPI) | active, last push 2026-11-11 (GitHub API) | yes: trained model + `predict` against new records (we use the `predict_between`/`predict_within` code path in-process) | yes: Fellegi-Sunter match weights per comparison (`mw_*`, log2 Bayes factors) | Python + DuckDB sidecar process | **chosen (default)** |
| Duke | Apache-2.0 ([repo LICENSE.md](https://github.com/larsga/Duke/blob/master/LICENSE.md)) | 1.2, 2014-02-15 ([Maven Central](https://repo1.maven.org/maven2/no/priv/garshol/duke/duke/)) | low, last push 2023-10 | yes: Lucene index, record-by-record | per-property probabilities (we convert to log2 weights) | JVM sidecar (same JDK as Flink) | kept as alternative engine |
| dedupe | MIT ([PyPI](https://pypi.org/project/dedupe/)) | 3.0.3, 2024-08-15 | slow, last push 2025-07 | partial (gazetteer) | limited | Python | not chosen: needs labelled training via active learning |
| recordlinkage | BSD-3-Clause ([PyPI](https://pypi.org/project/recordlinkage/)) | 0.16, 2023-07-20 | inactive since 2024-02 | batch | feature vectors only | Python/pandas | not chosen |
| JedAI | Apache-2.0 ([repo](https://github.com/scify/JedAIToolkit)) | v3.2.1, 2021 | repository archived | batch | no | JVM | not chosen: archived |
| Zingg | AGPL-3.0 community ([repo](https://github.com/zinggAI/zingg)) | 0.7.0, 2026-08-10 | active | batch (Spark) | limited | Spark | **rejected: AGPL (copyleft)** |

All dates and licences above: CONFIRMED on 2026-11-13 from `https://pypi.org/pypi/<package>/json`, `https://api.github.com/repos/<owner>/<repo>` and the linked licence files. Duke has no NOTICE file in its repository (CONFIRMED); its Apache-2.0 licence text is shipped in `explore/er/third-party/Duke-LICENSE.md`.

Measured on the synthetic set (§21.8), held-out seed 11 (tests E1): Splink Person pairwise P 0.969 / R 0.902 / F1 0.934, Organization F1 0.927; Duke Person P 0.892 / R 0.950 / F1 0.920, Organization F1 0.927 (CONFIRMED, `proof/er-metrics-*.json`). Splink was picked for maintenance, licence and higher precision; Duke has higher recall and needs no Python (HYPOTHESIS: Duke is the better choice where Python cannot be installed).

### 21.3 Data model

- **Record node:** any node whose `type` is configured in `er.types` (default `Person`, `Organization`). Properties used: `name`, `given` (derived from `name`), `email`, `phone`, `address`, `dob` for persons; `name`, `domain`, `phone`, `address` for organisations; plus `dataSource`, `recordId` (fall back to the node's first source and id).
- **Entity node:** id `er:entity:<12 hex>`, type `Entity`, properties `entityType`, `recordCount`, `dataSources`, `records` (ids), `features` (up to 5 distinct values per property), `minMatchScore`, `engine`, `resolution` (`resolved` / `single`).
- **RESOLVES_TO:** id `er:rt:<record id>`, record → entity, properties `score`, `matchKey`, `matchedWith` (best record in the same entity), `why` (features), `dataSource`, `recordId`. The first record of an entity has no `matchedWith`.
- **POSSIBLY_SAME:** id `er:ps:<hash>`, entity ↔ entity (undirected in meaning), properties `score`, `recordA`, `recordB`, `matchKey`, `why`. One link per entity pair (the best record pair).
- **Feature explanation (engine-neutral):** `{ property, a, b, level, weight }`, `weight` = log2 Bayes factor (positive supports, negative contradicts). Invariant: `prior + Σ weight = matchWeight` and `score = 1 / (1 + 2^-matchWeight)` (CONFIRMED, test E3, both engines).

All derived items are written by the derived writer `er` (§21.6) and carry the sources of the records they came from.

### 21.4 Engine interface (pluggable)

Each engine is a sidecar process speaking JSON lines on stdin/stdout: `{rid, ns, op, ...}` → `{rid, ok, ...}`. `ns` is the record type. Ops: `config` (properties, comparators, cleaners, thresholds, model), `upsert` (records → scored candidate pairs for each), `remove`, `compare` (one pair, full explanation), `train` (Splink only: unsupervised u-sampling + EM per blocking rule), `stats`, `reset`, `exit`.

- `splink` → `explore/er/splink_sidecar.py` (Python venv `explore/er/.venv`, `splink==5.0.0`, `duckdb==2.0.0`). Comparisons per property: exact → ExactMatch; date → DateOfBirthComparison; levenshtein → LevenshteinAtThresholds; jaro/person-name/q-gram → JaroWinklerAtThresholds. Blocking: each lookup property, family name, first+family name. Models: `explore/er/models/<Type>.splink.json` (trained by `npm run er:train` on seed 7; without a model the stage trains on the first ≥ 200 records of a type and saves to `<dataDir>/er-models`).
- `duke` → `explore/er/build/duke-sidecar.jar` (our code) + Duke 1.2, Lucene 4.0.0, Jackson 2.18.3 jars downloaded by `npm run er:setup`. Comparators per property: exact, levenshtein, weighted-levenshtein, jaro-winkler(-tokenized), person-name, q-gram, dice, jaccard, numeric, soundex, metaphone, lcs, date; cleaners lowercase, person-name, digits, trim, phone, email, address, company, date, first/last token.
- `wrong` (tests only, `ER_IMPL=wrong`): deliberately bad matcher + engine (§21.9).

Config per type (`er.types.<Type>`): `threshold`, `maybeThreshold`, `properties: [{name, comparator, cleaner, low, high, lookup}]`, per-engine overrides `splink: {...}` / `duke: {...}` (e.g. `omit`). Defaults: Person match 0.99 / possible 0.6 (Splink), 0.9 / 0.75 (Duke); Organization 0.88 / 0.6.

A crashed sidecar is restarted, reconfigured and re-fed all live records; entity ids are unchanged (CONFIRMED, E9).

### 21.5 Pipeline modes

- **In-process:** the stage listens to graph-service change events, coalesces them (`flushMs` 30 ms, `maxBatch` 1000), calls the engine and publishes derived events through the normal producer API as source `er` (§6). The stage never blocks ingest.
- **Kafka (§17):** `ErKafkaWorker` consumes `graph.changes` in group `<clientId>-er` and runs consume-transform-produce: derived events plus the consumed offsets go into one Kafka transaction (transactional id `<clientId>-er-publisher`, fixed, so a second worker fences the first: singleton). On start it bootstraps from the compacted `graph.state` (records + previous `RESOLVES_TO` assignment + what it published), so ids survive a restart (CONFIRMED, EK1). Batches are processed one at a time; derived messages are split into sends of ≤ 400 KB inside the transaction (broker default max message size is 1 MB); a `CONCURRENT_TRANSACTIONS` reply (the broker still finishing the previous commit) is retried with back-off. Any other failure aborts the transaction, re-initialises the transactional producer and makes the engine forget what it "published", so kafkajs' redelivery re-emits it (CONFIRMED: found and fixed while benchmarking, test EK0 + `proof/er-bench.txt`). Viewers run with `er.kafka.runWorker: false`, read `Entity`/links from the topic and answer the MCP read tools from the graph.

### 21.6 Access rules

- The derived writer `er` attributes each derived item to `er` **and** every source of the records it was derived from. With the default policy (all listed sources must be readable, §5.7) an entity that contains a record from a source you cannot read is invisible to you, and so are its links (fail closed; CONFIRMED, E7).
- `er` may only write and remove ids starting with `er:`; no other source may write or remove an `er:` id (CONFIRMED, E8).
- MCP tools and HTTP endpoints filter through `service.view` + StreamGraph ABAC exactly like other reads: `resolve_entity` errors for invisible entities, `why_matched` refuses a record the caller cannot read, `list_possible_matches` drops invisible pairs.

### 21.7 Clustering and stable ids

- Match edges (score ≥ type threshold) between live records; entities = connected components (transitive: A~B and B~C puts A and C together even if A≁C; `why_matched` reports `viaChain: true` for such pairs).
- After each batch only components touched by changed records are recomputed. Each new component claims the previous entity id with which it shares the most records (ties: the older entity). The largest component keeps the id on a split; the rest get new ids. On a merge the absorbed ids are retired and redirect to the survivor (`resolve_entity` on a retired id follows it).
- New id = `er:entity:` + first 12 hex of sha1(`type|smallest record id`); an id is never reused within a run (suffix `-2`, `-3`, …).
- History (`merge` / `split` / `retire`, last 500) is kept in memory and shown in the why-panel.
- Output is diffed against what was already published: unchanged entities produce no events (idempotent; CONFIRMED, E4).

### 21.8 Demo data (synthetic, ground truth)

`explore/demos/er/generate.mjs` (seeded): random combinations of common given and family names, invented streets and towns, phones only in the NANP fictional range 555-0100…0199, e-mail/web domains only from RFC 2606 reserved names. No real person's data. Sources `crm`, `billing`, `support`; noise: typos, nicknames, case and format changes, moves, swapped day/month, missing fields; hard negatives: households (same address + phone) and namesakes. Default (seed 7): 3,252 records (2,991 Person, 261 Organization), 1,650 true entities, 2,065 `WORKS_AT` links. Truth: record id → entity key in `fixture.json`.

Viewer: **Both / Records / Entities** toggle (`?er=` in the URL), POSSIBLY_SAME toggle, entity symbol (octagon frame, count corner badge = record count; dashed frame = single record) in `explore/demos/er/style.json`, `×N` label badge when no symbol style is loaded, links between records drawn between their entities in the Entities view, why-panel in Details (entity: records, scores, match keys, possible matches, history; record: why it is in its entity; two selected records: pair explanation).

### 21.9 Tests (`npm run test:er`, `npm run test:er:kafka`)

| Id | What | Splink | Duke | `ER_IMPL=wrong` |
|---|---|---|---|---|
| E1 | accuracy on held-out seed 11 (thresholds/model tuned on seed 7): Person P ≥ 0.90, R ≥ 0.85, F1 ≥ 0.90, B³ F1 ≥ 0.93; Org F1 ≥ 0.85 | pass | **fail** (P 0.892) | fail |
| E2 | streamed in 12 batches = bulk partition | pass | pass | fail |
| E3 | explanation invariant, features present in both records, non-match has negative evidence | pass | pass | fail |
| E4 | incremental merge, larger side keeps id, redirect, idempotent | pass | pass | fail |
| E5 | split on change and on remove, ids stable | pass | pass | fail |
| E6 | household → POSSIBLY_SAME, not merged; disappears when they move | pass | pass | fail |
| E7 | MCP tools over MCP + access rules | pass | pass | fail |
| E8 | derived-writer isolation | pass | pass | pass |
| E9 | sidecar crash restart | pass | pass | fail |
| EK0 | derived sends are chunked under the broker message-size limit (no broker) | pass | – | pass |
| EK1 | Kafka worker: resolve, merge, split, viewer, crash + restart from graph.state keeps ids | pass | not run | fail |

Proof: `npm run proof:er` writes `proof/er-test-run.txt` (Splink, 11/11 pass), `proof/er-test-run-duke.txt` (8/9: E1 precision 0.892 < 0.90) and `proof/er-wrong-impl-run.txt` (9 of 11 fail; only E8 and EK0, which do not depend on the matcher or engine, pass). CONFIRMED 2026-11-13.

### 21.10 Performance

`npm run bench:er` → `proof/er-bench.txt` (numbers there are CONFIRMED for that host and data only).

Measured 2026-11-13 6:43 PM ET on the box (8 × Xeon vCPU, 16 GB, Node 24.22.1), synthetic seed 7, no tuning (CONFIRMED for this host and data only):

| Run | Splink 5.0.0 | Duke 1.2 |
|---|---|---|
| bulk load, 3,252 records | 766 ms = 4,245 records/s | 5,573 ms = 583 records/s |
| bulk load, 10,992 records | 2,905 ms = 3,783 records/s | 22,615 ms = 486 records/s |
| single-record upsert → RESOLVES_TO visible (100 runs, 10,992 loaded) | p50 127 ms, p95 142 ms | p50 34 ms, p95 38 ms |
| batch of 100 records (5 runs, 10,992 loaded) | p50 189 ms, max 191 ms | p50 282 ms, max 298 ms |
| POSSIBLY_SAME links at 10,992 records | 202 | 19,344 |

Kafka end to end (real Apache Kafka 4.1.2 broker, localhost:9092, Splink): 3,252 records produced → all RESOLVES_TO visible in 2,540 ms = 1,280 records/s (145 transactions, 20 aborted and retried); single record produce → read model p50 118 ms, p95 179 ms.
Splink's per-record latency is dominated by the round trip to the Python sidecar (HYPOTHESIS); Duke is faster per record but much slower in bulk and emits far more possible-match links at its maybe threshold.

### 21.11 Known gaps

- **Duke misses the accuracy bar**: on held-out seed 11 its Person precision is 0.892 (< 0.90, test E1 fails). A threshold sweep on the tuning seed 7 (0.90 / 0.92 / 0.94 / 0.96) gives the best F1 at 0.90, so the threshold was not raised to pass the held-out set (that would be tuning on test data). Use Splink where precision matters (CONFIRMED).
- Kafka bulk load aborted 20 of 145 transactions under load (retried; final state correct in test EK1 and the bench). Cause not investigated (HYPOTHESIS: producer fencing/timeouts while the sidecar is busy).
- Transitive closure can chain different people through a bridging record; there is no cluster-level consistency check (HYPOTHESIS: most of the remaining precision loss).
- The Splink sidecar compares one value per feature (the first); multi-valued features are not cross-compared. No term-frequency adjustment and no generic-value suppression.
- Kafka: one ER worker per cluster (singleton); a new consumer group replays `graph.changes` from the beginning; the "never reuse an id" set is in memory, so after a restart a retired id could in theory be minted again.
- Python 3.10+ is needed for Splink (Windows included); Duke needs Java 17+. Not tested on Windows.
- Without a trained model and with fewer than 200 records of a type, Splink falls back to an untrained default model (low quality).

---

## 22. Map viewer and geo grids

Status: implemented 2026-11-13. Every statement below is labelled **CONFIRMED** (checked in code, a test, a measurement or a cited source) or **HYPOTHESIS** (expected, not verified).

### 22.1 Scope

Nodes whose item carries a position are drawn on a map in addition to the graph. Position (`explore/shared/geo-core.js`, `geoOf`): `lat`/`latitude`/`y_lat` + `lon`/`lng`/`long`/`longitude`/`x_lon` properties, or a GeoJSON `geometry` property (Point → its coordinate; any other geometry → centre of its bbox). Values out of range (|lat| > 90, |lon| > 180) or non-numeric are ignored (the node is graph-only). Links between two positioned nodes are drawn as great-circle arcs (bowed slightly so parallel links stay apart, unwrapped across the antimeridian). CONFIRMED (G1, G6, U1).

View modes: **Graph** (as before), **Map**, **Split** (graph and map side by side, half each). Buttons top right or `?mode=graph|map|split`. Selection, hover highlight, dimming, type hiding (legend), the time slider and "hide isolated" act on both panes: selecting on the map selects in the graph and vice versa; a single selection made in the graph that is off-screen on the map pans the map to it. CONFIRMED (U3, U4).

### 22.2 Basemap and tile policy

Renderer: MapLibre GL JS 6.18.0 (BSD-3-Clause), vendored unbundled to `explore/public/vendor/maplibre/` and loaded lazily (only when Map/Split is first opened; the graph-only page is unchanged). CONFIRMED.

`geo` block in `explore.config.json` (defaults in `explore/server/app.js`, `GEO_DEFAULTS`):

| key | default | meaning |
|---|---|---|
| `basemap` | `"auto"` | `auto` = online style, offline fallback if it does not load within `fallbackMs`; `online`; `offline`. Env `EXPLORE_BASEMAP` overrides; UI select and `?basemap=` per session |
| `styleUrl` | `https://tiles.openfreemap.org/styles/liberty` | any MapLibre style JSON (vector) |
| `tileUrl` | `null` | instead of `styleUrl`: a raster XYZ template (`https://…/{z}/{x}/{y}.png`) for your own / a commercial tile server |
| `attribution` | OpenFreeMap © OpenMapTiles © OpenStreetMap contributors (links) | always shown in the map corner, also in presenter mode |
| `offlineData`, `offlineAttribution` | `/explore/geo/ne_110m_admin_0_countries.geojson`, "Natural Earth" | bundled public-domain country polygons (254 KB) |
| `fallbackMs` | 6000 | |
| `streamHeat` | (unset) | `"all-readers"` lets non-owner principals see Flink heat, see §22.6 |

Default choice: **OpenFreeMap** — free, no API key, no registration, commercial use allowed, attribution required (openfreemap.org, read 2026-11-13). CONFIRMED. The **tile.openstreetmap.org** raster servers are deliberately not the default: the OSM Foundation tile usage policy (operations.osmfoundation.org/policies/tiles/) asks heavy/commercial users to use another provider, requires attribution and a valid User-Agent/Referer and forbids bulk downloading. CONFIRMED (policy text). Pointing `tileUrl` at tile.openstreetmap.org is technically possible; doing so is the operator's responsibility under that policy. Data © OpenStreetMap contributors is ODbL; the attribution string above satisfies its attribution requirement for map display. HYPOTHESIS (not legal advice).

Offline mode needs no network at all: style with the bundled Natural Earth layer, no glyphs/sprites (labels are off), our own symbols as images. CONFIRMED (screenshots `proof/map-world-offline.png`, `map-h3-offline.png` taken with `offline: true`; perf run uses offline). Known cosmetic issue on the OpenFreeMap style: some non-Latin labels (e.g. Sinhala/Tamil near Sri Lanka) render as black blobs in headless Chrome. HYPOTHESIS: font fallback of the local glyph renderer; not our overlay.

### 22.3 Grids (H3, MGRS)

`explore/shared/geo.js`, used by the browser, the HTTP API and MCP (one implementation, so map and tools agree):

* **H3** via h3-js 4.5.0 (Apache-2.0); resolution 0–10, default 3. Cell polygons unwrapped at the antimeridian.
* **MGRS** via `mgrs` 2.2.0 (MIT); precision 0–4 = 100 km, 10 km, 1 km, 100 m, 10 m squares; default 0. MGRS is undefined in the polar UPS zones: points south of 80°S or north of 84°N get no MGRS cell. Square polygons are computed from the inverse of the cell's south-west and north-east corners.
* `aggregate(points, {kind, resolution})` counts **distinct node ids** per cell (a node is counted once even if delivered twice), sorted by count desc, then cell id.
* Colour by count on a log scale (`norm = log(1+count)/log(1+max)`), a resolution slider (`#map-res`, `?res=`), grid select (`#map-grid`, `?grid=h3|mgrs`). Clicking a cell selects all its visible nodes (Shift adds). CONFIRMED (G2–G5, U2).

Reference values: H3 cells and MGRS strings for 8 known coordinates (incl. antimeridian, southern hemisphere, Svalbard/Norway exceptions zone 32V/33X) were computed with the Python `h3` (C library) and `mgrs` (GeoTrans) packages and hard-coded in G2/G3; the npm libraries agree. CONFIRMED.

### 22.4 Time slider

The existing time window slider (§11) filters map points, links and grid counts the same way as graph nodes (one visibility function). Fix made on the way: the slider had no range when the whole graph came from the initial snapshot (it was only computed on the first delta); `loadSnapshot` now computes it. CONFIRMED (U3).

### 22.5 Saved views and presenter mode

`state.map` (`explore/shared/saved-views.js`, `normalizeViewState`): `{ mode, camera: {center:[lon,lat], zoom, bearing, pitch}, grid: {kind, resolution}, heat, links, points, basemap }`; resolutions are clamped to the grid's range; unknown keys dropped. A view without `map` restores Graph mode. Presenter slides store the same block, so a deck can fly between map views. Map state is visual only; the §19 access restriction is unchanged (a view can't reveal nodes you can't read). CONFIRMED (U5, U7).

### 22.6 MCP and HTTP read tools

| MCP tool | HTTP | args | returns |
|---|---|---|---|
| `nodes_in_bbox` | `GET /api/explore/geo/bbox?bbox=w,s,e,n&types=` | `bbox [west,south,east,north]` (west > east = crosses the antimeridian), `types?`, `limit?` (≤ `mcp.maxResults`) | nodes with id, type, label, lat, lon; `truncated`, `total` |
| `grid_counts` | `GET /api/explore/geo/grid?kind=&res=&bbox=&stream=1` | `kind h3\|mgrs`, `resolution?`, `bbox?`, `types?`, `limit?`, `idsPerCell?`, `includeStream?` | cells `{cell, count, center, ids?}`; with `includeStream` the Flink windowed counts (§22.7) |

Access: both tools only see nodes the caller may read — the source policy (`access.sources`) plus, under StreamGraph, the ABAC `actAs` rules (§16) — exactly like `query_nodes`. Counts are computed after filtering, so a cell never reveals the existence of hidden nodes. Flink heat counts are computed upstream without access rules, so they are returned only when the caller may read every source and no per-node ABAC applies (or `geo.streamHeat: "all-readers"`); otherwise `stream: {available: false, reason: "withheld: …"}`. CONFIRMED (G8, G9). The HTTP routes run as the UI principal (`uiActAs`, usually none), so only the source policy applies there (same as the rest of `/api/explore`).

### 22.7 Flink windowed H3 counts (optional)

`processor.geo: { enabled: false, resolution: 3, windowMs: 60000, windows: 10 }` (or `FLINK_GEO=1`). When enabled, the Flink job (§18) computes, for each deduplicated `node.upsert` with a position, its H3 cell (h3-java 4.5.1, Apache-2.0, JNI natives for Linux/Windows/macOS inside the jar, SHA-1 checked by `npm run flink:setup`), and counts per cell in event-time tumbling windows (same watermarking as §18). Output: topic **`graph.geo-metrics`**, schema `explore/flink/schemas/graph-geo.v1.json`:

```json
{ "schemaVersion": 1, "kind": "geo.window", "grid": "h3", "cell": "831f0dfffffffff", "resolution": 3,
  "windowStart": 1793836800000, "windowEnd": 1793923200000, "count": 4, "processor": "…" }
```

Key `cell|windowStart` (upserts on late updates). The service keeps the last `windows` windows (`metrics-store.js geoCounts`), the map's **Stream heat (Flink, H3)** checkbox polls `/api/explore/geo/grid?stream=1` and colours cells by the streamed counts instead of the in-memory ones. The H3 cell ids from Java equal h3-js (FG1). Existing Flink tests are unchanged and pass. CONFIRMED (FG0–FG2, `proof/map-flink-heat.png`: 823 cells, 2,461 events, 31 × 1-day windows).

### 22.8 Tests and deliberately wrong implementation

Suites: `explore/test/geo.test.js` (G1 position parsing, G2 Web Mercator vs the OSM slippy-tile formula, G3 H3 and G4 MGRS against reference coordinates, G5 distinct-node aggregation, G6 antimeridian bbox, G7 great-circle arcs, G8 `nodes_in_bbox` and G9 `grid_counts` with access rules incl. StreamGraph actAs and withheld stream heat, G10 HTTP routes, G11 incident-export loader), `flink-geo.test.js` (FG0 schema, FG1 real Flink job on Kafka → `graph.geo-metrics` counts equal h3-js aggregation per window, FG2 service exposes them), `geo-ui.test.js` (U1–U7 in a real browser: placement vs an independent Web Mercator, H3 browser = server and cell click, time slider, split sync, view save/restore, symbols, presenter).

`GEO_IMPL=wrong` (`explore/shared/geo-wrong.js`): GW1 swaps lat/lon, GW2 bbox ignores the antimeridian, GW3 H3 one resolution too coarse, GW4 no dedupe, GW5 MGRS truncated to 100 km, GW6 equirectangular instead of Web Mercator, GW7 straight lines instead of great circles, GW8 access rules skipped. `FLINK_IMPL=wrong` swaps lat/lon in the Java job. `VIEWS_IMPL=wrong` is the §19 wrong store. `npm run proof:geo` writes the runs to `proof/geo-*.txt`; results in §22.9.

### 22.9 Results (2026-11-13)

* Correct implementation: geo 11/11, flink-geo 3/3 (real Kafka 4 broker + Flink 2.2.1 job), geo-ui 7/7 → **21/21 pass** (`proof/geo-test-run.txt`). CONFIRMED.
* `GEO_IMPL=wrong`: geo.test **10/11 fail** (only G11, the loader, which does not use the geo code, passes); geo-ui 1/7 fails (U2, browser vs server cells) — the browser bundle always uses the correct `geo.js`, so U1/U3–U7 cannot see the server-side switch. Total 11/18 fail (`proof/geo-wrong-impl-run.txt`). `FLINK_IMPL=wrong`: 2/3 fail (FG1, FG2; FG0 is config only). `VIEWS_IMPL=wrong`: 1/7 fail (U5). Over all wrong runs: 14 of 28 test executions fail; every test that exercises the switched code fails. CONFIRMED.
* Perf, 10,419 nodes (10,000 quakes) + 6,490 arc links, headless Chrome with **software** WebGL (SwiftShader; no GPU on the build box): map sources rebuild 29.9 ms; H3 r3 aggregation + polygons 34 ms (2,076 cells), H3 r6 53.8 ms (8,225 cells), MGRS 10 km 25.4 ms (7,144 cells); select + highlight 2.8 ms; camera animation median 20 fps (p95 frame 133 ms); server `grid_counts` H3 r3 median 24 ms, `nodes_in_bbox` 4.5 ms; page to map ready 8.7 s (includes the graph layout). `proof/map-10k-perf.txt`. CONFIRMED for this box; HYPOTHESIS: ≥ 50 fps on a machine with a GPU (not measured).
* Screenshots `proof/map-*.png`: world, h3, h3-cell-selected, mgrs-japan, split, presenter-1…4, world/h3 offline, flink-heat. CONFIRMED.
* Gaps: browser-side wrong implementation not wired (see above); no clustering of points at low zoom (10k points still draw individually); MGRS polar (UPS) zones not gridded; Flink heat is H3 only (no MGRS); heat counts are not access-filtered upstream (withheld instead, §22.6); not tested on Windows or with a real D-Fend export.

### 22.10 Test data

Not used: the D-Fend Solutions drone incident tracker. Its terms of use (d-fendsolutions.com/terms-of-use/, last updated 2021-01-03, read 2026-11-13) license content for "personal, internal, non-commercial use" only and prohibit copying, downloading, republishing, derivative works and any "robot, spider, scraper … or manual process, to monitor or copy" content. CONFIRMED. So nothing was fetched from it. Instead:

* `explore/demos/geo/fixture.json`: 10,000 real USGS ComCat earthquakes M2.5+ (the latest 10,000 of the 17,829 between 2026-04-01 and 2026-11-01, i.e. 2026-07-06 – 2026-10-31; US Government work, public domain), 1,251 Natural Earth 1:50m populated places and 177 1:110m countries (public domain). `npm run fixtures:geo` re-downloads. No invented incidents.
* `npm run import:incidents -- <file.csv|json|geojson> [--map mapping.json] [--out batch.json] [--post http://127.0.0.1:8080] [--source incidents]`: loads an export you are licensed to use (e.g. a D-Fend export obtained under an agreement) into the §6 contract as `Incident` nodes (lat/lon, eventTime) linked to Country, Location, Category, Target and DroneType; it never contacts D-Fend.

---

## 23. Core exploration loop: neighbourhoods, paths, algorithms, selection

Phase 1 makes the loop **query → expand → analyse → select → query again** work without the client ever holding the whole graph. The design is our own, written from this section. No code or assets come from Neo4j Bloom, Graphistry, Linkurious, GraphXR or any other proprietary tool.

### 23.1 Scope: full or focus

* `GET /api/explore/core/config` returns `{counts, fullSnapshotMax, scope, algorithms, limits, coreImpl, algoImpl}`.
* The client picks a scope:
  * **full**: the §7 snapshot, as before.
  * **focus**: a session with no snapshot. Only what you search for (Shift+Enter) or expand is loaded.
* Which scope applies:
  * `?scope=full|focus` forces one.
  * `auto` (the default) picks focus when the graph has more than `fullSnapshotMax` nodes. The default is 50,000; set it with env `EXPLORE_FULL_SNAPSHOT_MAX` or `config.ui.fullSnapshotMax`.
* `?seeds=a,b&hops=2&max=2000` streams those seeds in on load.
* In focus mode, the footer badge reads "focus: N of M nodes loaded".

### 23.2 Server-side k-hop neighbourhood, streamed

**Request:** `POST /api/explore/session/:sid/neighborhood`, body `{seeds[], hops 0-6, direction in|out|both, linkTypes[], nodeTypes[], where[] (§19 property conditions), linkWhere[], maxNodes ≤ 20,000 (default 500), chunkSize (default 500), exclude[] (ids the client already holds)}`.

**Response:** NDJSON (`application/x-ndjson`), one JSON object per line:

* `{type:'start'}`.
* Then `{type:'chunk', hop, nodes[], links[]}`.
  * Chunks arrive in hop order.
  * A link is sent only after both of its ends.
  * Every link appears once: the result is the induced subgraph of the reached nodes, under the link filters.
* Finally `{type:'end', stats:{nodes, links, hops:[per-hop counts], truncated, ms}}`.

**Options:**

* `stream:false` returns the same thing as one JSON object.
* `maxNodes` stops the breadth-first search, and the end line then says `truncated:true`.

**Permissions and live updates:**

* Every item passes the same §16 / StreamGraph ABAC checks as the snapshot: `service.view` plus the MCP guard for the UI principal.
* Streamed items are adopted into the session's working set, so §7 deltas keep them live.

**Client rendering:**

* Chunks are drawn as they arrive, batched per animation frame.
* `body[data-streaming]` is set while a stream is open.
* The status bar shows chunks, the first-chunk time and the total time.
* A test hook, `slowMs`, delays each chunk.

#### 23.2.4 Live growth of the visible subgraph

* A session opened with `{follow:false, grow:true, growLinkTypes?, growMax?}` receives:
  * changes to the items it holds;
  * any **new link that touches a held node**, together with its other end. This is how a newly published transfer appears next to an account you are looking at.
* This works in both modes:
  * in-process;
  * Kafka mode (§17), where each instance builds its read model from the topic and grows its own sessions. This is tested across two instances on a real broker (NK1).

### 23.3 Paths

**Request:** `POST /api/explore/session/:sid/paths`, body `{fromId, toId, maxHops ≤ 8, maxPaths ≤ 500, mode all|shortest, directed, linkTypes[], nodeTypes[], where[]}`.

**Response:** `{found, shortest, paths:[{nodeIds, linkIds, hops}], truncated, items}`.

**Search:** iterative deepening DFS, pruned by a BFS distance-to-target bound, so the shortest paths come first. Parallel links collapse to the lowest link id.

**UI:**

* The Paths panel has "all simple" or "shortest" mode and a hop limit.
* The list shows each path with its hop count.
* Clicking a row highlights that path.
* **Isolate** hides everything that is not on the shown path or paths.

### 23.4 Node summary

`GET /api/explore/session/:sid/summary?id=` returns `{id, type, degree, linkTypes:[{type,total,out,in}]}`. The node context menu uses it to offer "Expand KNOWS (3→)" and "Collapse KNOWS" per relationship type.

* **Expand by type** streams with `linkTypes:[type]`.
* **Collapse (by type)** hides neighbours reached through those links, except:
  * neighbours that are pinned or selected;
  * neighbours that still connect to something visible outside the collapsing group (worked out to a fixed point).

  Expanding again undoes the collapse.

### 23.5 Algorithms and visual mapping

#### 23.5.1 Algorithms

| Name | Level / kind | Implementation |
|---|---|---|
| `degree` | node / numeric | ours (in + out, parallel links counted) |
| `pagerank` | node / numeric | graphology-metrics (α 0.85, directed by default) |
| `betweenness` | node / numeric | ours, Brandes. Exact up to `exactMax` (2,000) nodes, otherwise `samples` (256) random pivots, scaled (Brandes & Pich). Normalised like NetworkX. |
| `louvain` | node / categorical | graphology-communities-louvain (seeded) |
| `leiden` | node / categorical | ours, from Traag et al. 2019: local moving, refinement (θ 0.01), aggregation (seeded) |
| `components` | node / categorical | graphology-components (weakly connected); ids sorted by size |
| `shortest_path` | node / numeric | hop distance from `source` (optional `target` path) |
| `jaccard` | link / numeric, or node top-k with `node` | ours (NetworkX convention) |

All algorithms are permissively licensed (see LICENSES.md); GPL/AGPL options were rejected. Results include `stats {count, min, max, mean, ms, nodes, links}`, plus `modularity` and `count` for communities, and `approximate` and `samples` for sampled betweenness.

#### 23.5.2 Scope

`POST /api/explore/algo/run {algo, params, scope, values?}` accepts these scopes:

* `{kind:'all'}`: everything the principal may see.
* `{kind:'filter', hiddenTypes, hiddenLinkTypes, types, linkTypes, where, linkWhere}`: the server-side filter.
* `{kind:'ids', ids, hiddenLinkTypes}`: the visible nodes or the selection, as an induced subgraph.

Results are cached by (algo, params, scope, principal, graph version). Any graph change bumps the version. The last 32 results are kept:

* `GET /api/explore/algo/results` lists them.
* `GET /api/explore/algo/result/:runId?ids=` reads values.

#### 23.5.3 Mapping

In the Analyze panel, a result maps with one click to:

* **node size**: numeric values use a sqrt-linear scale; categorical values use member count;
* **node colour**:
  * numeric values use a perceptual ramp, and the legend shows min and max;
  * categorical values use a 12-colour palette plus "other", and the legend has one row per group. Clicking a legend row selects that group;
* **edge width**: per-link values, or the mean of the two ends' values.

Nodes outside the scope are grey and listed as "not in scope". The details panel shows each node's values.

#### 23.5.4 Recompute

* An encoding whose scope is `filter` or `visible` re-runs 250 ms after the filter or the visible set changes. "Recompute on filter change" is on by default.
* Saved views (§19) store `analysis: {size|color|edge: {algo, params, scope}}` and re-run it when the view loads.

### 23.6 MCP tools

| Tool | What it does |
|---|---|
| `neighborhood` | Same options as §23.2 (cap ≤ 5,000, and ≤ `maxResults`). |
| `find_paths` | Same as §23.3. |
| `list_algorithms` | Lists the algorithms and recent runs. |
| `run_algorithm` | Takes `{algo, params, scope, top}` and returns a summary plus the top-k (numeric) or group sizes (categorical) and a `runId`. It never returns every value. |
| `get_algorithm_result` | Takes `{runId, ids? | top? | community?}`. |

All of these tools are read-only and pass the MCP guard and access rules (§16.4).

### 23.7 Selection and interaction

**Selection:**

* **Lasso** (L) and **box** (B) draw on an overlay. A node is selected when its screen position is inside the shape (even-odd test).
* Shift adds to the selection; Alt removes from it.
* Shift-click multi-selects.

**Bulk bar** (shown while anything is selected):

* Expand, +2 hops, +Neighbours.
* Hide (Shift+H shows hidden nodes again).
* Pin.
* **Set as filter**: a neighbourhood filter with depth 0, so exactly these nodes are shown. X clears it.
* Analyze: run the chosen algorithm on the selection.
* Save as view: a saved view of exactly these nodes.
* Paths, shown when exactly 2 nodes are selected.
* **Query**: the selection is the seed set for a new streamed neighbourhood query with hops, direction and link types.

**Context menus:**

* **Node**: expand / 2 hops / expand-collapse per relationship type with counts, collapse, select neighbours, pin, hide, isolate, find paths (2 selected), hop distance from here, similar nodes (Jaccard), save selection as view.
* **Link**: select both ends, isolate both ends, hide all links of its type, expand both ends over its type, show properties.
* **Canvas**: fit, select all, lasso, box, show hidden, clear isolate / path filter, clear analysis, relayout, shortcuts.

**Keyboard** (press `?` in the UI for the list):

| Key | Action |
|---|---|
| E | Expand by 1 hop |
| Shift+E | Expand by 2 hops |
| C | Collapse |
| H or Delete | Hide |
| Shift+H | Show hidden |
| I | Isolate |
| X | Clear filter |
| P | Pin |
| N | Add neighbours to the selection |
| F | Fit |
| L | Lasso |
| B | Box |
| G | Paths |
| A | Run the algorithm |
| Ctrl+A | Select all |
| Ctrl+Z | Undo |
| / | Search |
| Esc | Closes the menu or tool first, then clears the selection |

Saved views also store `filters.hiddenIds` (manually hidden nodes, up to 5,000), and the neighbourhood filter may have `depth: 0`.

### 23.8 Limits

| Setting | Value |
|---|---|
| hops | ≤ 6 |
| maxNodes (UI and API) | ≤ 20,000 |
| maxNodes (MCP) | ≤ 5,000 |
| paths | ≤ 8 hops, ≤ 500 paths |
| exact betweenness | up to 2,000 nodes, sampled above |
| client edge events (hover / right-click on links) | only when the view holds ≤ 50,000 links |

### 23.9 Tests and proofs

| Suite | Covers |
|---|---|
| `explore/test/core-loop.test.js` (N1–N12) | NDJSON order, oracles for filters, caps, exclude, paths vs brute force, summary, permissions, live growth, MCP tools, 3k-node random graph vs BFS oracle |
| `core-loop-kafka.test.js` (NK1–NK2) | Real broker; growth across instances |
| `algorithms.test.js` (B1–B12) | Zachary karate club, Les Misérables and a planted-partition graph against NetworkX / graspologic reference values. Leiden reaches the karate optimum Q = 0.4198. Sampled betweenness ranks match exact (Spearman > 0.9). Cache, scopes, permissions, MCP. |
| `core-loop-ui.test.js` (C1–C10) | Chrome: progressive streaming, context menu expand/collapse by type, paths + isolate, lasso and box with real mouse drags, encodings + legend + auto-recompute, bulk ops, link and canvas menus, shortcuts. Writes `proof/phase1-*.png`. |

Deliberately broken versions, which must fail (`npm run proof:phase1` → `proof/phase1-*-run.txt`):

| Setting | Broken behaviour |
|---|---|
| `CORE_IMPL=wrong` | CW1 hops−1, CW2 link-type filter ignored, CW3 shortest only, CW4 live growth drops the new end, CW5 summary counts outgoing only |
| `ALGO_IMPL=wrong` | AW1–AW7 |
| `CORE_UI_IMPL=wrong` | lasso ignores y |

Performance: `npm run bench:phase1` → `proof/phase1-perf.txt` (10k and 100k nodes; browser numbers are SwiftShader software rendering).

## 24. Scale and readability (Phase 2)

Goal: graphs of 10k–100k+ nodes stay readable and responsive. The viewer aggregates, bundles and clusters instead of drawing everything, switches layouts live, and always tells the user how much is loaded and what heavy work will cost.

### 24.1 Semantic zoom with server-side aggregation
* `POST|GET /api/explore/clusters` with `{ by, scope, maxClusters, seed, membership }` returns `clusters[]` (`id` = `c:<key>`, `label`, `count`, `types`, `mainType`, `top` 3 nodes by degree, `internal` links, `x/y/r` from a seeded layout of the clusters) and `metaEdges[]` (`m:a|b`, `count`, `types`).
  * `by` = `louvain` | `leiden` | `components` | `type` | `property:<name>` | `run:<runId>` (the groups of an earlier algorithm run).
  * Groups beyond `maxClusters` (default 300, max 2000) fold into one "other" cluster. Results are cached per graph version. The input honours permissions (hidden items are never counted).
  * `membership: true` adds node→cluster for up to 60,000 nodes.
* `POST /api/explore/clusters/members` `{ cluster, max }` returns member ids ordered by degree (max 20,000); 404 for an unknown cluster.
* Client: `#cl-mode` off | on | auto. Auto turns aggregation on in focus scope or above 1,500 loaded nodes, and stays off while the map is shown (the map clusters its own points). In focus scope, auto never hides nodes the user loaded (seeds, search, expand); clusters with nothing loaded are bubbles. URL `?clusters=on|off|auto`.
  * Zoomed out past `#cl-zoom`, each cluster is one bubble (radius by count), and meta-edges are drawn between bubbles with width 0.8 + 1.6·log2(1+count). Zoomed in, members return with a dashed convex hull and a collision-free label per cluster.
  * Clicking a bubble expands only that cluster (animated out from the bubble); clicking its hull label collapses it. "Expand all" / "Collapse all" buttons.
  * Focus scope: the overview is drawn from the server with 0 nodes loaded. Clicking a bubble loads its members (up to 2,000) and their links.
* MCP: `cluster_overview` (read).

### 24.2 Edge bundling and meta-edges
* Force-directed edge bundling (Holten & van Wijk 2009), written from the paper: compatibility = angle × scale × position × visibility; grid-pruned candidate pairs; 5 cycles, subdivisions doubling; endpoints fixed.
* `#bundle-on` runs it in a Web Worker (`bundle.worker.js`) on the visible links (up to 5,000) or, at the overview, on the meta-edges. Bundled curves replace sigma's straight edges while on.

### 24.3 Map point clustering
* `#map-cluster` / `?mapcluster=1` switches the map's points to MapLibre's built-in GeoJSON clustering (supercluster, ISC), radius 50 px, up to zoom 14. Count labels are canvas images (no glyph server needed offline).
* Each cluster sums `sel` over its points, so a cluster holding a graph-selected node gets a ring. Click a cluster: zoom to its expansion zoom. Shift-click: select all its points in the graph (MapLibre's Shift-drag box zoom is disabled while clustering is on). Saved views keep `map.cluster`.

### 24.4 Layouts
* Kinds: force (ForceAtlas2-style), hierarchy, radial, circular, grid, structural, **timeline** (x = time of `timeProperty`, one lane per node type packed into rows, undated nodes in a column on the left), **geo** (Web Mercator of `lat`/`lon`; unplaced nodes go to the mean of their neighbours), **community** (group-in-a-box: squarified treemap of groups by `groupBy` or Louvain, seeded force inside each box).
* Every layout is deterministic for a given `seed` (`#layout-seed`). Switching animates from current to new positions (skipped while the §8.4 watchdog reports slow frames).
* Saved views store `layout.kind`, `seed`, `timeProperty`, `groupBy`. MCP: `set_layout` (write) updates a saved view's layout.

### 24.5 Performance transparency
* Footer `#perf-badge`: loaded / total nodes and links (server totals).
* `#load-progress`: progress bar with a label for streamed neighbourhoods, snapshot load, layout and bundling.
* `POST /api/explore/cost` `{ op: neighborhood|algo|overview|layout|bundle, ... }` returns `estMs`, `level` (low < 300 ms, medium < 2 s, high) and `basis` (calibrated constants, refined by the median of observed runs on this server). MCP: `estimate_cost` (read).
* The Analyze panel shows the estimate live (`#algo-cost`). Before a run estimated high, a 2+-hop expand estimated above 5,000 nodes, or a layout above 5,000 nodes, `#cost-dialog` asks to run or cancel.

### 24.6 Limits
`maxClusters` 2000 (default 300), membership 60,000 nodes, members 20,000, bundling 5,000 edges, focus click-to-load 2,000 members.

### 24.7 Tests and proofs
| Suite | What it checks |
|---|---|
| `scale.test.js` (P1–P12) | aggregation vs an independent oracle, Louvain recovers a planted partition, type/property/run grouping, members, cost estimates, bundling (endpoints fixed, compatible edges converge), timeline, geo, group-in-a-box, seeds, MCP tools, saved views |
| `scale-ui.test.js` (Q1–Q8) | Chrome: semantic zoom with real zoom and clicks, focus overview on 12k nodes with click-to-load, bundling, animated layout switching + seeds + saved view, badge/progress/cost dialog, map clustering with selection; screenshots `proof/phase2-*.png` |

Deliberately broken versions, which must fail (`npm run proof:phase2` → `proof/phase2-*-run.txt`):

| Setting | Broken behaviour |
|---|---|
| `SCALE_IMPL=wrong` | SW1 meta-edges counted only for a<b, SW2 isolated nodes dropped, BW1 every edge pair compatible, BW2 endpoints move, CW1 neighbourhood estimate ignores hops > 1, CW2 betweenness always priced as sampled, timeline ordered by id, geo lat/lon swapped, group-in-a-box one group, force unseeded |
| `SCALE_UI_IMPL=wrong` | UW1 wrong timeline/geo/community layouts in the browser, UW2 clicking a cluster never expands it, UW3 map clusters ignore the selection, bundling worker moves endpoints |

Performance: `npm run bench:phase2` → `proof/phase2-perf.txt` (10k and 100k nodes; browser numbers are SwiftShader software rendering).
