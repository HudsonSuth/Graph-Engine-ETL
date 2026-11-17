// Embedded property graph on SQLite (node:sqlite, built into Node 22+).
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

export const nodeId = (label, key) => `${label}:${key}`;
export const edgeId = (type, from, to) => `${from}-[${type}]->${to}`;

export class GraphStore {
  constructor(file = ':memory:') {
    this.db = new DatabaseSync(file);
    this.db.exec(`CREATE TABLE IF NOT EXISTS nodes(id TEXT PRIMARY KEY, label TEXT, key TEXT, props TEXT);
      CREATE TABLE IF NOT EXISTS edges(id TEXT PRIMARY KEY, type TEXT, src TEXT, dst TEXT, props TEXT);
      CREATE INDEX IF NOT EXISTS e_src ON edges(src); CREATE INDEX IF NOT EXISTS e_dst ON edges(dst);
      CREATE INDEX IF NOT EXISTS n_label ON nodes(label);
      CREATE TABLE IF NOT EXISTS changes(seq INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, op TEXT, id TEXT, data TEXT);
      CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT);`);
    this.version = 0;
    // Change log for sync-out. The epoch changes whenever the graph is wiped, so sinks know to resync.
    this.epoch = this.db.prepare("SELECT v FROM meta WHERE k='epoch'").get()?.v || this.#newEpoch();
  }
  #newEpoch() { const e = randomUUID(); this.db.prepare("INSERT INTO meta(k,v) VALUES('epoch',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(e); return e; }
  #log(kind, op, id, data) { this.db.prepare('INSERT INTO changes(kind,op,id,data) VALUES(?,?,?,?)').run(kind, op, id, JSON.stringify(data)); }
  #ends(src, dst) { const a = this.db.prepare('SELECT label,key FROM nodes WHERE id=?'); const f = a.get(src), t = a.get(dst); return { from: f && { label: f.label, key: f.key }, to: t && { label: t.label, key: t.key } }; }
  maxSeq() { return Math.max(this.db.prepare('SELECT coalesce(max(seq),0) m FROM changes').get().m, this.db.prepare("SELECT seq FROM sqlite_sequence WHERE name='changes'").get()?.seq || 0); }
  minSeq() { return this.db.prepare('SELECT min(seq) m FROM changes').get().m; } // null when the log is empty
  changesAfter(seq, limit = 500) { return this.db.prepare('SELECT * FROM changes WHERE seq > ? ORDER BY seq LIMIT ?').all(seq, limit).map(r => ({ ...r, data: JSON.parse(r.data) })); }
  pruneChanges(upTo) { this.db.prepare('DELETE FROM changes WHERE seq <= ?').run(upTo); }
  upsertNode(id, label, key, props = {}) {
    const row = this.db.prepare('SELECT props FROM nodes WHERE id=?').get(id);
    const merged = { ...(row ? JSON.parse(row.props) : {}), ...props };
    this.db.prepare('INSERT INTO nodes(id,label,key,props) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET props=excluded.props')
      .run(id, label, String(key), JSON.stringify(merged));
    this.#log('node', 'upsert', id, { label, key: String(key), props: merged });
    this.version++; return id;
  }
  upsertEdge(type, src, dst, props = {}) {
    const id = edgeId(type, src, dst);
    const row = this.db.prepare('SELECT props FROM edges WHERE id=?').get(id);
    const merged = { ...(row ? JSON.parse(row.props) : {}), ...props };
    this.db.prepare('INSERT INTO edges(id,type,src,dst,props) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET props=excluded.props')
      .run(id, type, src, dst, JSON.stringify(merged));
    this.#log('edge', 'upsert', id, { type, ...this.#ends(src, dst), props: merged });
    this.version++; return id;
  }
  deleteNode(id) {
    for (const e of this.db.prepare('SELECT id,type,src,dst FROM edges WHERE src=? OR dst=?').all(id, id)) this.#log('edge', 'delete', e.id, { type: e.type, ...this.#ends(e.src, e.dst) });
    const n = this.db.prepare('SELECT label,key FROM nodes WHERE id=?').get(id);
    if (n) this.#log('node', 'delete', id, { label: n.label, key: n.key });
    this.db.prepare('DELETE FROM edges WHERE src=? OR dst=?').run(id, id);
    const r = this.db.prepare('DELETE FROM nodes WHERE id=?').run(id);
    this.version++; return r.changes > 0;
  }
  deleteEdge(id) {
    const e = this.db.prepare('SELECT type,src,dst FROM edges WHERE id=?').get(id);
    if (e) this.#log('edge', 'delete', id, { type: e.type, ...this.#ends(e.src, e.dst) });
    const r = this.db.prepare('DELETE FROM edges WHERE id=?').run(id); this.version++; return r.changes > 0;
  }
  hasNode(id) { return !!this.db.prepare('SELECT 1 FROM nodes WHERE id=?').get(id); }
  getNode(id) { const r = this.db.prepare('SELECT * FROM nodes WHERE id=?').get(id); return r && this.#n(r); }
  #n(r) { return { id: r.id, label: r.label, key: r.key, props: JSON.parse(r.props) }; }
  #e(r) { return { id: r.id, type: r.type, from: r.src, to: r.dst, props: JSON.parse(r.props) }; }
  nodes(label) { return (label ? this.db.prepare('SELECT * FROM nodes WHERE label=?').all(label) : this.db.prepare('SELECT * FROM nodes').all()).map(r => this.#n(r)); }
  edges() { return this.db.prepare('SELECT * FROM edges').all().map(r => this.#e(r)); }
  counts() { return { nodes: this.db.prepare('SELECT count(*) c FROM nodes').get().c, edges: this.db.prepare('SELECT count(*) c FROM edges').get().c }; }
  clear() { this.db.exec('DELETE FROM nodes; DELETE FROM edges; DELETE FROM changes;'); this.epoch = this.#newEpoch(); this.version++; }

  schema() {
    const labels = {}, edgeTypes = {};
    for (const n of this.nodes()) {
      const l = labels[n.label] ??= { count: 0, props: new Set() };
      l.count++; Object.keys(n.props).forEach(p => l.props.add(p));
    }
    const lab = new Map(this.db.prepare('SELECT id,label FROM nodes').all().map(r => [r.id, r.label]));
    for (const e of this.edges()) {
      const t = edgeTypes[e.type] ??= { count: 0, from: new Set(), to: new Set(), props: new Set() };
      t.count++; t.from.add(lab.get(e.from)); t.to.add(lab.get(e.to)); Object.keys(e.props).forEach(p => t.props.add(p));
    }
    const arr = s => [...s].sort();
    return {
      nodeTypes: Object.entries(labels).map(([label, v]) => ({ label, count: v.count, props: arr(v.props) })),
      edgeTypes: Object.entries(edgeTypes).map(([type, v]) => ({ type, count: v.count, from: arr(v.from), to: arr(v.to), props: arr(v.props) })),
    };
  }

  // Pattern query: (a:Label {k:"v"})-[:TYPE]->(b:Label)<-[r:TYPE]-(c)
  // where: [{alias, field, op: '='|'!='|'>'|'<'|'contains'|'exists', value}] applied after pattern matching
  query(pattern, limit = 100, where = []) {
    const get = (n, f) => f === 'key' ? n.key : n.props[f];
    const test = (row) => where.every(w => { const n = row[w.alias]; if (!n) return false; const v = get(n, w.field);
      switch (w.op) { case '=': return v == w.value; case '!=': return v != w.value; case '>': return Number(v) > Number(w.value); case '<': return Number(v) < Number(w.value);
        case 'contains': return String(v ?? '').toLowerCase().includes(String(w.value).toLowerCase()); case 'exists': return v != null && v !== ''; default: throw new Error(`Unknown op ${w.op}`); } });
    return this.#query(pattern, Infinity).filter(test).slice(0, limit);
  }
  search(q, limit = 50) {
    const s = String(q).toLowerCase();
    return this.nodes().filter(n => n.key.toLowerCase().includes(s) || Object.entries(n.props).some(([k, v]) => !k.startsWith('_') && String(v).toLowerCase().includes(s))).slice(0, limit);
  }
  #query(pattern, limit) {
    const parts = parsePattern(pattern);
    const nodeOk = (n, p) => (!p.label || n.label === p.label) && Object.entries(p.props).every(([k, v]) => (k === 'key' ? n.key : n.props[k]) == v);
    let rows = this.nodes(parts[0].label).filter(n => nodeOk(n, parts[0])).map(n => ({ [parts[0].alias || '_0']: n, __last: n }));
    const outQ = this.db.prepare('SELECT * FROM edges WHERE src=?'), inQ = this.db.prepare('SELECT * FROM edges WHERE dst=?');
    for (let i = 1; i < parts.length; i += 2) {
      const rel = parts[i], np = parts[i + 1], next = [];
      for (const row of rows) {
        const edges = (rel.dir === 'out' ? outQ : inQ).all(row.__last.id).map(r => this.#e(r)).filter(e => !rel.type || e.type === rel.type);
        for (const e of edges) {
          const n = this.getNode(rel.dir === 'out' ? e.to : e.from);
          if (n && nodeOk(n, np)) next.push({ ...row, ...(rel.alias ? { [rel.alias]: e } : {}), [np.alias || '_' + (i + 1)]: n, __last: n });
        }
      }
      rows = next;
    }
    return rows.slice(0, limit).map(({ __last, ...r }) => r);
  }

  exportCypher() { return cypherFor(this.nodes(), this.edges()); }
}

// Cypher MERGE script for a set of nodes and edges (edges reference node ids).
export function cypherFor(nodes, edges) {
  const q = v => JSON.stringify(v), id = s => '`' + String(s).replace(/`/g, '``') + '`';
  const props = p => '{' + Object.entries(p).map(([k, v]) => `${id(k)}: ${q(v)}`).join(', ') + '}';
  const lab = new Map(nodes.map(n => [n.id, n]));
  const out = nodes.map(n => `MERGE (n:${id(n.label)} {_key: ${q(n.key)}}) SET n += ${props(n.props)};`);
  for (const e of edges) {
    const a = lab.get(e.from), b = lab.get(e.to); if (!a || !b) continue;
    out.push(`MATCH (a:${id(a.label)} {_key: ${q(a.key)}}), (b:${id(b.label)} {_key: ${q(b.key)}}) MERGE (a)-[r:${id(e.type)}]->(b) SET r += ${props(e.props)};`);
  }
  return out.join('\n') + '\n';
}

export function parsePattern(src) {
  const re = /\(\s*(\w*)\s*(?::(\w+))?\s*(\{[^}]*\})?\s*\)|(<)?-\[\s*(\w*)\s*(?::(\w+))?\s*\]-(>)?/gy;
  const parts = []; let m; const s = src.trim();
  while (re.lastIndex < s.length) {
    const at = re.lastIndex; m = re.exec(s);
    if (!m) throw new Error(`Bad pattern near: ${s.slice(at)}`);
    if (m[0].startsWith('(')) parts.push({ kind: 'node', alias: m[1], label: m[2], props: m[3] ? parseProps(m[3]) : {} });
    else {
      if (!!m[4] === !!m[7]) throw new Error('Relationship needs one direction: -[]-> or <-[]-');
      parts.push({ kind: 'rel', alias: m[5], type: m[6], dir: m[7] ? 'out' : 'in' });
    }
  }
  if (!parts.length || parts.length % 2 === 0 || parts.some((p, i) => (i % 2 ? 'rel' : 'node') !== p.kind)) throw new Error('Pattern must alternate (node)-[rel]->(node)');
  return parts;
}
function parseProps(s) {
  return JSON.parse(s.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":').replace(/'/g, '"'));
}
