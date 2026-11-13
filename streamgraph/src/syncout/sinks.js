// Live output connectors. Every sink is idempotent (upserts by id), so re-sending a batch after a crash is safe.
// batch = { run, nodes: [{label,key,props}], edges: [{type,from:{label,key},to:{label,key},props}], delNodes: [{label,key}], delEdges: [...] }
const q = s => '`' + String(s).replace(/`/g, '``') + '`';
const group = (list, f) => { const m = new Map(); for (const x of list) { const k = f(x); (m.get(k) ?? m.set(k, []).get(k)).push(x); } return m; };
const eid = e => `${e.from.label}:${e.from.key}-[${e.type}]->${e.to.label}:${e.to.key}`;

// ---- Neo4j and Memgraph (Bolt, neo4j-driver, Apache-2.0)
export class CypherSink {
  constructor(cfg, { driverFactory } = {}) { this.cfg = cfg; this.driverFactory = driverFactory; }
  async open() {
    if (this.driver) return;
    if (this.driverFactory) { this.driver = await this.driverFactory(this.cfg); return; }
    const neo4j = (await import('neo4j-driver')).default;
    this.driver = neo4j.driver(this.cfg.url, this.cfg.user ? neo4j.auth.basic(this.cfg.user, this.cfg.password || '') : undefined, { connectionTimeout: 5000 });
  }
  async run(statements) {
    const session = this.driver.session(this.cfg.database ? { database: this.cfg.database } : {});
    try { const tx = session.beginTransaction(); try { for (const [c, p] of statements) await tx.run(c, p); await tx.commit(); } catch (e) { await tx.rollback().catch(() => {}); throw e; } }
    finally { await session.close(); }
  }
  async test() { await this.open(); await this.run([['RETURN 1 AS ok', {}]]); }
  async apply(b) {
    await this.open(); const st = [];
    for (const [k, list] of group(b.delEdges, e => `${e.type}|${e.from.label}|${e.to.label}`)) { const [t, f, to] = k.split('|'); st.push([`UNWIND $rows AS r MATCH (a:${q(f)} {_key: r.from})-[e:${q(t)}]->(b:${q(to)} {_key: r.to}) DELETE e`, { rows: list.map(e => ({ from: e.from.key, to: e.to.key })) }]); }
    for (const [l, list] of group(b.delNodes, n => n.label)) st.push([`UNWIND $keys AS k MATCH (n:${q(l)} {_key: k}) DETACH DELETE n`, { keys: list.map(n => n.key) }]);
    for (const [l, list] of group(b.nodes, n => n.label)) st.push([`UNWIND $rows AS r MERGE (n:${q(l)} {_key: r.key}) SET n = r.props, n._key = r.key, n._sg_run = $run, n:StreamGraph`, { rows: list.map(n => ({ key: n.key, props: n.props })), run: b.run }]);
    for (const [k, list] of group(b.edges, e => `${e.type}|${e.from.label}|${e.to.label}`)) { const [t, f, to] = k.split('|'); st.push([`UNWIND $rows AS r MATCH (a:${q(f)} {_key: r.from}) MATCH (b:${q(to)} {_key: r.to}) MERGE (a)-[e:${q(t)}]->(b) SET e = r.props, e._sg_run = $run`, { rows: list.map(e => ({ from: e.from.key, to: e.to.key, props: e.props })), run: b.run }]); }
    if (st.length) await this.run(st);
  }
  async sweep(run) { await this.open(); await this.run([['MATCH (:StreamGraph)-[e]->(:StreamGraph) WHERE e._sg_run < $run DELETE e', { run }], ['MATCH (n:StreamGraph) WHERE n._sg_run < $run DETACH DELETE n', { run }]]); }
  async close() { await this.driver?.close?.(); this.driver = null; }
}

// ---- PostgreSQL (pg, MIT) or embedded PGlite for tests
export class PostgresSink {
  constructor(cfg, { instance } = {}) { this.cfg = cfg; this.instance = instance; this.t = /^[a-z_][a-z0-9_]{0,40}$/.test(cfg.tablePrefix || 'sg_') ? (cfg.tablePrefix || 'sg_') : 'sg_'; }
  async open() {
    if (this.db) return;
    if (this.instance || this.cfg.driver === 'pglite') { const db = this.instance || new (await import('@electric-sql/pglite')).PGlite(this.cfg.dataDir); this.db = { query: (s, p) => db.query(s, p), exec: s => db.exec(s), end: () => !this.instance && db.close() }; }
    else { const pg = (await import('pg')).default; const cs = this.cfg.connectionString || `postgres://${encodeURIComponent(this.cfg.user || 'postgres')}:${encodeURIComponent(this.cfg.password || '')}@${this.cfg.host || '127.0.0.1'}:${this.cfg.port || 5432}/${this.cfg.database || 'postgres'}`;
      const pool = new pg.Pool({ connectionString: cs, connectionTimeoutMillis: 5000, max: 2 }); this.db = { query: (s, p) => pool.query(s, p), exec: s => pool.query(s), end: () => pool.end() }; }
    await this.db.exec(`CREATE TABLE IF NOT EXISTS ${this.t}nodes(id text PRIMARY KEY, label text NOT NULL, key text NOT NULL, props jsonb NOT NULL, sg_run bigint NOT NULL, updated_at timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS ${this.t}edges(id text PRIMARY KEY, type text NOT NULL, src text NOT NULL, dst text NOT NULL, props jsonb NOT NULL, sg_run bigint NOT NULL, updated_at timestamptz DEFAULT now());`);
  }
  async test() { await this.open(); await this.db.query('SELECT 1'); }
  async apply(b) {
    await this.open(); const t = this.t;
    await this.db.query('BEGIN');
    try {
      for (const e of b.delEdges) await this.db.query(`DELETE FROM ${t}edges WHERE id=$1`, [eid(e)]);
      for (const n of b.delNodes) { const id = `${n.label}:${n.key}`; await this.db.query(`DELETE FROM ${t}edges WHERE src=$1 OR dst=$1`, [id]); await this.db.query(`DELETE FROM ${t}nodes WHERE id=$1`, [id]); }
      for (const n of b.nodes) await this.db.query(`INSERT INTO ${t}nodes(id,label,key,props,sg_run) VALUES($1,$2,$3,$4::jsonb,$5) ON CONFLICT(id) DO UPDATE SET props=EXCLUDED.props, sg_run=EXCLUDED.sg_run, updated_at=now()`, [`${n.label}:${n.key}`, n.label, n.key, JSON.stringify(n.props), b.run]);
      for (const e of b.edges) await this.db.query(`INSERT INTO ${t}edges(id,type,src,dst,props,sg_run) VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT(id) DO UPDATE SET props=EXCLUDED.props, sg_run=EXCLUDED.sg_run, updated_at=now()`, [eid(e), e.type, `${e.from.label}:${e.from.key}`, `${e.to.label}:${e.to.key}`, JSON.stringify(e.props), b.run]);
      await this.db.query('COMMIT');
    } catch (e) { await this.db.query('ROLLBACK').catch(() => {}); throw e; }
  }
  async sweep(run) { await this.open(); await this.db.query(`DELETE FROM ${this.t}edges WHERE sg_run < $1`, [run]); await this.db.query(`DELETE FROM ${this.t}nodes WHERE sg_run < $1`, [run]); }
  async close() { await this.db?.end(); this.db = null; }
}

// ---- Kafka / Confluent (kafkajs, MIT). Keyed messages; deletes are tombstones, so a compacted topic holds the current graph.
export class KafkaSink {
  constructor(cfg, { producerFactory } = {}) { this.cfg = cfg; this.producerFactory = producerFactory; }
  async open() {
    if (this.p) return;
    if (this.producerFactory) this.p = await this.producerFactory(this.cfg);
    else {
      const { Kafka, logLevel } = await import('kafkajs');
      this.p = new Kafka({ clientId: 'streamgraph-sync-out', brokers: String(this.cfg.brokers).split(',').map(s => s.trim()), connectionTimeout: 5000, logLevel: logLevel.NOTHING, retry: { retries: 2, initialRetryTime: 300 },
        ...(this.cfg.password ? { ssl: true, sasl: { mechanism: 'plain', username: this.cfg.user, password: this.cfg.password } } : {}) }).producer({ idempotent: true, maxInFlightRequests: 1 });
    }
    await this.p.connect();
  }
  async test() { await this.open(); }
  async apply(b) {
    await this.open();
    const m = [
      ...b.delEdges.map(e => ({ key: eid(e), value: null, headers: { kind: 'edge', op: 'delete', type: e.type } })),
      ...b.delNodes.map(n => ({ key: `${n.label}:${n.key}`, value: null, headers: { kind: 'node', op: 'delete', label: n.label } })),
      ...b.nodes.map(n => ({ key: `${n.label}:${n.key}`, value: JSON.stringify({ kind: 'node', op: 'upsert', label: n.label, key: n.key, props: n.props }), headers: { kind: 'node', op: 'upsert', label: n.label } })),
      ...b.edges.map(e => ({ key: eid(e), value: JSON.stringify({ kind: 'edge', op: 'upsert', type: e.type, from: e.from, to: e.to, props: e.props }), headers: { kind: 'edge', op: 'upsert', type: e.type } })),
    ];
    if (m.length) await this.p.send({ topic: this.cfg.topic, messages: m, acks: -1 });
  }
  async sweep() { /* Kafka has no "delete what is not here"; see README known gaps */ }
  async close() { await this.p?.disconnect(); this.p = null; }
}
export const SINKS = { neo4j: CypherSink, memgraph: CypherSink, postgres: PostgresSink, kafka: KafkaSink };
