// Adapter: StreamGraph's live GraphStore -> streaming ingest contract (SPEC §6).
//
// StreamGraph records every graph write in its SQLite change log (seq, kind node|edge, op upsert|delete, id, data)
// and rotates an `epoch` when the graph is wiped. Its sync-out prunes that log, so the adapter does not poll it:
// it wraps the five mutating methods on the GraphStore *instance* (no StreamGraph source file is changed) and drains
// the change rows synchronously right after each write, before anything can prune them.
//
// Mapping (documented in explore/ADAPTER.md):
//   node change  {label, key, props}           -> node.upsert { id: "sg:node:<Label:key>", type: label, label: name|title|key, properties: {...props, key} }
//   edge change  {type, from{label,key}, to{…}} -> link.upsert { id: "sg:link:<edgeId>", type, fromId: "sg:node:<from>", toId: "sg:node:<to>" }
//   op delete                                   -> node.remove / link.remove { id }
//   graph.clear() (new epoch)                   -> snapshot.marker begin(mode replace-source) + end  => every StreamGraph item is tombstoned
//   start()                                     -> snapshot.marker begin(replace-source), full upserts of current graph, end
//   change-log seq is NOT reused as contract seq: the producer assigns its own gap-free seq per sourceId and eventId "<producer>:<seq>".
import { StreamProducer } from './producer.js';

export const SG_SOURCE = 'streamgraph';
export const sgNodeId = id => `sg:node:${id}`;
export const sgLinkId = id => `sg:link:${id}`;
const isoOr = (v, d) => { if (typeof v === 'string' && /^\d{4}-\d\d-\d\d/.test(v)) { const t = Date.parse(v); if (!Number.isNaN(t)) return new Date(t).toISOString(); } return d; };

export function mapNode(sgId, label, key, props = {}, sourceId = SG_SOURCE) {
  const now = new Date().toISOString();
  return { id: sgNodeId(sgId), kind: 'node', type: label || 'Unknown', label: String(props.name ?? props.title ?? key), properties: { ...props, key: String(key) },
    sources: [{ sourceId, nativeId: sgId, fetchedAt: now }], eventTime: isoOr(props.ts ?? props.updated_at ?? props.modified_at, now) };
}
export function splitEdgeId(edgeId, type) { const sep = `-[${type}]->`, i = edgeId.indexOf(sep); return i < 0 ? null : [edgeId.slice(0, i), edgeId.slice(i + sep.length)]; }
export function mapEdge(sgEdgeId, type, props = {}, sourceId = SG_SOURCE) {
  const ends = splitEdgeId(sgEdgeId, type); if (!ends) return null;
  const now = new Date().toISOString();
  return { id: sgLinkId(sgEdgeId), kind: 'link', type, fromId: sgNodeId(ends[0]), toId: sgNodeId(ends[1]), directed: true, properties: { ...props },
    sources: [{ sourceId, nativeId: sgEdgeId, fetchedAt: now }], eventTime: isoOr(props.ts ?? props.updated_at, now) };
}
/** Map one StreamGraph change-log row to a contract [op, payload]. */
export function mapChange(row, sourceId = SG_SOURCE) {
  const d = row.data || {};
  if (row.kind === 'node') return row.op === 'delete' ? ['node.remove', { id: sgNodeId(row.id) }] : ['node.upsert', mapNode(row.id, d.label, d.key, d.props, sourceId)];
  if (row.kind === 'edge') { if (row.op === 'delete') return ['link.remove', { id: sgLinkId(row.id) }]; const l = mapEdge(row.id, d.type, d.props, sourceId); return l ? ['link.upsert', l] : null; }
  return null;
}

export class StreamGraphAdapter {
  constructor(graph, { send, sourceId = SG_SOURCE, maxInFlightBatches = 4, lingerMs = 20, maxBatchEvents = 500 } = {}) {
    this.graph = graph; this.sourceId = sourceId;
    this.producer = new StreamProducer({ sourceId, producerId: `${sourceId}-adapter`, send, maxInFlightBatches, lingerMs, maxBatchEvents });
    this.cursor = 0; this.epoch = null; this.orig = null; this.snapshots = 0; this.changes = 0;
  }
  start() {
    if (this.orig) return this;
    const g = this.graph, self = this;
    this.orig = {};
    for (const m of ['upsertNode', 'upsertEdge', 'deleteNode', 'deleteEdge', 'clear']) {
      const fn = g[m]; this.orig[m] = Object.prototype.hasOwnProperty.call(g, m) ? fn : null;
      g[m] = function (...args) { const r = fn.apply(this, args); try { self.drain(); } catch (e) { console.error('[explore adapter]', e.message); } return r; };
    }
    this.snapshot();
    return this;
  }
  stop() { if (!this.orig) return; for (const [m, f] of Object.entries(this.orig)) { if (f) this.graph[m] = f; else delete this.graph[m]; } this.orig = null; }
  /** Full catch-up snapshot of the current StreamGraph graph (replace-source semantics). */
  snapshot() {
    try { this.onSnapshot?.(); } catch (e) { console.error('[history]', e.message); }
    const g = this.graph, p = this.producer, sid = `${g.epoch}:${++this.snapshots}`;
    this.epoch = g.epoch; this.cursor = g.maxSeq();
    p.push('snapshot.marker', { phase: 'begin', snapshotId: sid, mode: 'replace-source' });
    for (const n of g.nodes()) p.push('node.upsert', mapNode(n.id, n.label, n.key, n.props, this.sourceId));
    for (const e of g.edges()) { const l = mapEdge(e.id, e.type, e.props, this.sourceId); if (l) p.push('link.upsert', l); }
    p.push('snapshot.marker', { phase: 'end', snapshotId: sid });
  }
  drain() {
    const g = this.graph;
    if (g.epoch !== this.epoch) return this.snapshot(); // graph wiped (new run / reset): resync
    const min = g.minSeq();
    if (min != null && min > this.cursor + 1 && g.maxSeq() > this.cursor) return this.snapshot(); // rows pruned before we saw them
    for (;;) {
      const rows = g.changesAfter(this.cursor, 1000); if (!rows.length) break;
      for (const r of rows) { this.cursor = r.seq; try { this.onRow?.(r); } catch (e) { console.error('[history]', e.message); } const m = mapChange(r, this.sourceId); if (m) { this.producer.push(m[0], m[1]); this.changes++; } }
    }
  }
  flush() { return this.producer.flush(); }
}
