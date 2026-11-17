// Versioned graph history (Phase 3). Every StreamGraph change the adapter sees is appended to <data>/history.db with a
// timestamp; graph state at any time is rebuilt by replaying the log, and two times are compared item by item.
// After a restart, a reset or a gap in the change log, reconcile() records the difference between the last recorded state
// and the live graph, so history never silently skips a change it could not see.
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const nodeItem = (id, n) => ({ id: `sg:node:${id}`, kind: 'node', type: n.label, label: String(n.props?.name ?? n.props?.title ?? n.key), properties: { ...n.props, key: String(n.key) }, sources: [{ sourceId: 'streamgraph', nativeId: id }] });
const edgeItem = (id, e) => ({ id: `sg:link:${id}`, kind: 'link', type: e.type, fromId: `sg:node:${e.from}`, toId: `sg:node:${e.to}`, properties: { ...e.props }, sources: [{ sourceId: 'streamgraph', nativeId: id }] });
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const BROKEN = () => process.env.HISTORY_IMPL === 'broken'; // DELIBERATELY WRONG: compare ignores property changes and deletions

export class GraphHistory {
  constructor({ dataDir = null, graph, now = () => Date.now() }) {
    if (dataDir) mkdirSync(dataDir, { recursive: true });
    this.db = new DatabaseSync(dataDir ? join(dataDir, 'history.db') : ':memory:'); this.graph = graph; this.now = now;
    this.db.exec(`CREATE TABLE IF NOT EXISTS ev(seq INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, kind TEXT, op TEXT, id TEXT, data TEXT);
      CREATE INDEX IF NOT EXISTS ev_at ON ev(at);`);
    this.ins = this.db.prepare('INSERT INTO ev(at,kind,op,id,data) VALUES(?,?,?,?,?)');
  }
  record(kind, op, id, data, at = this.now()) { this.ins.run(at, kind, op, id, JSON.stringify(data ?? null)); }
  /** one StreamGraph change-log row (from the adapter) */
  onRow(r) {
    const d = r.data || {};
    if (r.kind === 'node') this.record('node', r.op, r.id, r.op === 'delete' ? null : { label: d.label, key: d.key, props: d.props });
    if (r.kind === 'edge') { const ends = r.id.split(`-[${d.type}]->`); this.record('edge', r.op, r.id, r.op === 'delete' ? null : { type: d.type, from: ends[0], to: ends[1], props: d.props }); }
  }
  /** state at time t (ms); null = latest recorded */
  stateAt(t = null) {
    const nodes = new Map(), edges = new Map();
    const rows = t == null ? this.db.prepare('SELECT * FROM ev ORDER BY seq').all() : this.db.prepare('SELECT * FROM ev WHERE at <= ? ORDER BY seq').all(Number(t));
    for (const r of rows) {
      const m = r.kind === 'node' ? nodes : edges;
      if (r.op === 'delete') { m.delete(r.id); if (r.kind === 'node') for (const [k, e] of edges) if (e.from === r.id || e.to === r.id) edges.delete(k); }
      else m.set(r.id, JSON.parse(r.data));
    }
    return { nodes, edges };
  }
  reconcile() {
    const cur = this.stateAt(), at = this.now(); let n = 0;
    const live = new Map(this.graph.nodes().map(x => [x.id, x])), liveE = new Map(this.graph.edges().map(x => [x.id, x]));
    this.db.exec('BEGIN');
    try {
      for (const [id] of cur.edges) if (!liveE.has(id)) { this.record('edge', 'delete', id, null, at); n++; }
      for (const [id] of cur.nodes) if (!live.has(id)) { this.record('node', 'delete', id, null, at); n++; }
      for (const [id, x] of live) { const v = { label: x.label, key: x.key, props: x.props }; if (!same(cur.nodes.get(id), v)) { this.record('node', 'upsert', id, v, at); n++; } }
      for (const [id, e] of liveE) { const v = { type: e.type, from: e.from, to: e.to, props: e.props }; if (!same(cur.edges.get(id), v)) { this.record('edge', 'upsert', id, v, at); n++; } }
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
    return n;
  }
  timeline({ buckets = 60 } = {}) {
    const r = this.db.prepare('SELECT min(at) a, max(at) b, count(*) n FROM ev').get();
    if (!r.n) return { from: null, to: null, events: 0, buckets: [] };
    const w = Math.max(1, Math.ceil((r.b - r.a + 1) / buckets)), out = [];
    for (const x of this.db.prepare('SELECT CAST((at - ?) / ? AS INTEGER) AS i, count(*) c FROM ev GROUP BY i ORDER BY i').all(r.a, w)) out.push({ at: r.a + x.i * w, count: x.c });
    return { from: r.a, to: r.b, events: r.n, bucketMs: w, buckets: out };
  }
  snapshot(t) { const s = this.stateAt(t); return { at: t, items: [...[...s.nodes].map(([id, n]) => nodeItem(id, n)), ...[...s.edges].map(([id, e]) => edgeItem(id, e))] }; }
  compare(t1, t2) {
    const a = this.stateAt(t1), b = this.stateAt(t2), out = { from: Number(t1), to: Number(t2), added: [], removed: [], changed: [] };
    for (const [kind, A, B, mk] of [['node', a.nodes, b.nodes, nodeItem], ['link', a.edges, b.edges, edgeItem]]) {
      for (const [id, v] of B) {
        if (!A.has(id)) out.added.push(mk(id, v));
        else if (!BROKEN() && !same(A.get(id).props, v.props)) {
          const pa = A.get(id).props || {}, pb = v.props || {};
          out.changed.push({ after: mk(id, v), before: mk(id, A.get(id)), fields: [...new Set([...Object.keys(pa), ...Object.keys(pb)])].filter(k => !same(pa[k], pb[k])).sort() });
        }
      }
      if (!BROKEN()) for (const [id, v] of A) if (!B.has(id)) out.removed.push(mk(id, v));
    }
    out.summary = { added: out.added.length, removed: out.removed.length, changed: out.changed.length };
    return out;
  }
  clear() { this.db.exec('DELETE FROM ev'); }
  close() { try { this.db.close(); } catch {} }
}
