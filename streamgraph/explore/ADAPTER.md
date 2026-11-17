# StreamGraph → Explore adapter (event mapping)

`explore/server/streamgraph-adapter.js` feeds the in-memory graph service from StreamGraph **through the SPEC §6 streaming
ingest contract** (batches, per-source `seq`, `eventId`, acks), exactly like any external producer. StreamGraph's code is
not modified: the adapter wraps the `GraphStore` instance's write methods and drains its change log synchronously.

## Source and ordering
| Contract field | Value |
|---|---|
| `sourceId` | `streamgraph` |
| `partition` | `0` |
| `seq` | assigned by the adapter's contract producer: gap-free per source, resumed from the last acked seq (StreamGraph's own change-log seq is only the adapter's read cursor; it is pruned by sync-out so it is not reused) |
| `eventId` | `<producerId>:<seq>` (idempotent resend) |
| `eventTime` | `props.ts` or `props.updated_at` if present and parseable, else the time the change was observed |
| batching | up to 500 events per batch; at most `maxInFlightBatches` un-acked (producer backpressure) |

## Change → event
| StreamGraph change | Contract event | Payload |
|---|---|---|
| node upsert `Label:key` | `node.upsert` | `id: sg:node:Label:key`, `type: Label`, `label: name ‖ title ‖ key`, `properties: {...props, key}` |
| edge upsert `from-[TYPE]->to` | `link.upsert` | `id: sg:link:<edgeId>`, `type: TYPE`, `fromId: sg:node:<from>`, `toId: sg:node:<to>` (ends parsed from the edge id), `properties: props` |
| node delete | `node.remove` | `id: sg:node:Label:key` (the service tombstones it and its incident links) |
| edge delete | `link.remove` | `id: sg:link:<edgeId>` |
| adapter start, `clear()` (epoch change), or a pruned/gapped change log (sync-out prunes it) | `snapshot.marker begin` → full `node/link.upsert` of the current graph → `snapshot.marker end`, mode `replace-source` | items of source `streamgraph` not in the snapshot are tombstoned |

Provenance on every item: `sources: [{ sourceId: 'streamgraph', nativeId: <StreamGraph id>, fetchedAt }]`.

## Permissions
* Source policy (`access.sources.streamgraph`, default `defaultRead`) is applied by the service (fail closed for unknown sources).
* StreamGraph's own access rules (ABAC: type-level read decisions and property masking) are applied on top for every
  item whose provenance includes `streamgraph`, for the MCP server (`mcp.actAs`, default StreamGraph user `owner`) and,
  when `uiActAs` is set, for the UI. A denied node also hides its links; masked properties never leave the server.

## Failure behaviour
* A gap in the change log (pruned by sync-out or a policy change) never produces a partial view: the adapter falls back to a snapshot.
* If the explore ingest pauses (backpressure), StreamGraph is not blocked: changes accumulate and are drained on resume.

## Kafka mode (SPEC §17)

The adapter is unchanged: it still wraps the GraphStore instance methods, and **no StreamGraph source file or hook** is involved. In `mode: "kafka"`, its `send` is `KafkaPublisher.send` instead of in-process ingest. The publisher then:
* re-keys the events (node id / link fromId);
* validates them against `explore/kafka/schemas/graph-events.v1.json`;
* expands the start-up / new-epoch `replace-source` snapshot into explicit removes;
* writes `graph.changes` + `graph.state` in one transaction.

Every Explore instance, including the one hosting StreamGraph, reads the graph back from the topic.
