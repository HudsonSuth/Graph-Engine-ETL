import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { PGlite } from '@electric-sql/pglite';
import { Pipeline, validateFlow, copyFlow, loadFlow } from '../src/flow.js';
import { GraphStore } from '../src/graph.js';
import { parseCsv } from '../src/sources/file.js';
import { CdcSource } from '../src/sources/sql.js';
import { run, sink, fakeKafka } from './helpers.js';

const dir = mkdtempSync(join(tmpdir(), 'sg-'));
const CUST = { customers: { nodes: [{ label: 'Customer', key: 'id', props: '*' }] } };
const ORDERS = { orders: { nodes: [{ label: 'Order', key: 'order_id', props: { total: 'total' } }],
  edges: [{ type: 'PLACED', from: { label: 'Customer', key: 'customer_id' }, to: { label: 'Order', key: 'order_id' } }] } };

test('CSV parser handles quotes, commas and CRLF', () => {
  assert.deepEqual(parseCsv('\uFEFFid,n\r\n1,a\r\n'), [{ id: '1', n: 'a' }], 'Excel BOM is stripped');
  assert.deepEqual(parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n1,2\n'), [{ a: 'x, y', b: 'he said "hi"' }, { a: '1', b: '2' }]);
});

test('full path: file source -> filter -> map -> rename -> cast -> mapping -> graph sink -> query', async () => {
  writeFileSync(join(dir, 'o.ndjson'), ['{"oid":"O1","cust":"C1","total":"120.5"}', '{"oid":"O2","cust":"C1","total":"0"}', '{"oid":"O3","cust":"C2","total":"60"}'].join('\n') + '\n');
  const { g, p } = await run({ baseDir: dir, steps: [
    { id: 'src', type: 'file', config: { path: 'o.ndjson', topic: 'raw' } },
    { id: 'cast', type: 'cast', config: { types: { total: 'Double' } } },
    { id: 'f', type: 'filter', config: { expr: 'total > 0' } },
    { id: 'm', type: 'map', config: { set: { tax: '$round(total * 0.1, 2)' } } },
    { id: 'r', type: 'rename', config: { topic: 'orders', fields: { oid: 'order_id', cust: 'customer_id' } } },
    sink({ orders: { ...ORDERS.orders, nodes: [{ label: 'Order', key: 'order_id', props: { total: 'total', tax: 'tax' } }] } })],
    links: [{ from: 'src', to: 'cast' }, { from: 'cast', to: 'f' }, { from: 'f', to: 'm' }, { from: 'm', to: 'r' }, { from: 'r', to: 'sink' }] });
  assert.deepEqual(g.counts(), { nodes: 4, edges: 2 }); // O1, O3, C1, C2
  assert.equal(p.stats.f.dropped, 1);
  assert.deepEqual(g.getNode('Order:O1').props, { total: 120.5, tax: 12.05 });
  const rows = g.query('(c:Customer {key:"C1"})-[:PLACED]->(o:Order)');
  assert.deepEqual(rows.map(r => r.o.key), ['O1']);
  assert.deepEqual(p.stepSchemas().r.outSchema, { order_id: 'string', customer_id: 'string', total: 'number', tax: 'number' });
  assert.match(g.exportCypher(), /MERGE \(a\)-\[r:`PLACED`\]->\(b\)/);
});

test('entity linking across two sources (CSV + HTTP API) yields one node per key', async () => {
  writeFileSync(join(dir, 'c.csv'), 'id,name\nC1,Ada\nC2,Ben\n');
  const srv = http.createServer((q, r) => r.end(JSON.stringify({ items: [{ cid: ' c1 ', tier: 'gold' }, { cid: 'C2', tier: 'silver' }, { cid: 'c3', tier: 'bronze' }] }))).listen(0);
  const url = `http://127.0.0.1:${srv.address().port}/`;
  try {
    const { g } = await run({ baseDir: dir, steps: [
      { id: 'csv', type: 'file', config: { path: 'c.csv', topic: 'customers' } },
      { id: 'api', type: 'http', config: { url, topic: 'loyalty', itemsPath: 'items' } },
      { id: 'ren', type: 'rename', config: { fields: { cid: 'id' } } },
      { id: 'norm', type: 'normalize', config: { fields: ['id'] } },
      sink({ customers: CUST.customers, loyalty: { nodes: [{ label: 'Customer', key: 'id', props: { tier: 'tier' } }] } })],
      links: [{ from: 'csv', to: 'norm' }, { from: 'api', to: 'ren' }, { from: 'ren', to: 'norm' }, { from: 'norm', to: 'sink' }] });
    assert.equal(g.nodes('Customer').length, 3);
    assert.deepEqual(g.getNode('Customer:c1').props, { id: 'c1', name: 'Ada', tier: 'gold' });
  } finally { srv.close(); }
});

test('re-sending the same records is idempotent (upsert by key)', async () => {
  writeFileSync(join(dir, 'dup.json'), JSON.stringify([{ order_id: 'O1', customer_id: 'C1', total: 5 }, { order_id: 'O1', customer_id: 'C1', total: 7 }]));
  const { g } = await run({ baseDir: dir, steps: [{ id: 'src', type: 'file', config: { path: 'dup.json', topic: 'orders' } }, sink(ORDERS)], links: [{ from: 'src', to: 'sink' }] });
  assert.deepEqual(g.counts(), { nodes: 2, edges: 1 });
  assert.equal(g.getNode('Order:O1').props.total, 7);
});

test('kafka source: JSON values, Debezium envelope and tombstone delete', async () => {
  const msgs = [
    { topic: 'customers', key: 'C1', value: { id: 'C1', name: 'Ada' } },
    { topic: 'dbz.orders', key: 'O1', value: { op: 'c', before: null, after: { order_id: 'O1', customer_id: 'C1', total: 10 } } },
    { topic: 'dbz.orders', key: 'O2', value: { op: 'r', before: null, after: { order_id: 'O2', customer_id: 'C1', total: 20 } } },
    { topic: 'dbz.orders', key: 'O1', value: { op: 'u', before: { order_id: 'O1', customer_id: 'C1', total: 10 }, after: { order_id: 'O1', customer_id: 'C2', total: 11 } } },
    { topic: 'dbz.orders', key: 'O2', value: { op: 'd', before: { order_id: 'O2', customer_id: 'C1', total: 20 }, after: null } },
    { topic: 'customers', key: 'C9', value: { id: 'C9' } }, { topic: 'customers', key: 'C9', value: null },
  ];
  const { g } = await run({ steps: [
    { id: 'k', type: 'kafka', config: { brokers: ['fake:9092'], topics: ['customers', 'dbz.orders'], topicMap: { 'dbz.orders': 'orders' }, idleMs: 200 } },
    { id: 'tomb', type: 'map', config: { set: { id: '$exists(_key) ? _key : id' } } },
    sink({ ...CUST, ...ORDERS })], links: [{ from: 'k', to: 'tomb' }, { from: 'tomb', to: 'sink' }] }, { consumerFactory: fakeKafka(msgs) });
  assert.equal(g.hasNode('Order:O2'), false, 'Debezium delete removes node');
  assert.equal(g.hasNode('Customer:C9'), false, 'tombstone removes node');
  assert.deepEqual(g.query('(c:Customer)-[:PLACED]->(o:Order)').map(r => `${r.c.key}>${r.o.key}`), ['C2>O1'], 'update moved the edge');
  assert.equal(g.getNode('Order:O1').props.total, 11);
});

test('CDC on SQLite: snapshot, update (edge moves), soft and hard delete', async () => {
  const db = new DatabaseSync(join(dir, 'shop.db'));
  db.exec(`CREATE TABLE orders(order_id TEXT PRIMARY KEY, customer_id TEXT, total REAL, deleted INTEGER DEFAULT 0, updated_at TEXT)`);
  const put = db.prepare('INSERT OR REPLACE INTO orders VALUES(?,?,?,?,?)');
  put.run('O1', 'C1', 10, 0, '2026-01-01T00:00:01Z'); put.run('O2', 'C1', 20, 0, '2026-01-01T00:00:02Z'); put.run('O3', 'C2', 30, 0, '2026-01-01T00:00:03Z');
  const g = new GraphStore();
  const p = new Pipeline({ baseDir: dir, steps: [{ id: 'cdc', type: 'cdc', config: { driver: 'sqlite', database: 'shop.db', table: 'orders', key: 'order_id', deletedFlag: 'deleted' } }, sink(ORDERS)], links: [{ from: 'cdc', to: 'sink' }] }, { graph: g });
  const src = new CdcSource(p.flow.steps[0].config, p.ctx), emit = p.emitter('cdc'), ops = [];
  const tick = async () => { await src.poll(ev => { ops.push(ev.op + ev.data.order_id); return emit(ev); }); await p.drain(); };
  await tick();
  assert.deepEqual(g.counts(), { nodes: 5, edges: 3 });
  put.run('O1', 'C3', 15, 0, '2026-01-01T00:00:05Z');      // update: reassign customer
  put.run('O2', 'C1', 20, 1, '2026-01-01T00:00:06Z');      // soft delete
  db.prepare('DELETE FROM orders WHERE order_id=?').run('O3'); // hard delete
  await tick(); await tick();
  assert.deepEqual(ops, ['cO1', 'cO2', 'cO3', 'uO1', 'dO2', 'dO3']);
  assert.deepEqual(g.query('(c:Customer)-[:PLACED]->(o:Order)').map(r => `${r.c.key}>${r.o.key}`), ['C3>O1']);
  assert.equal(g.getNode('Order:O1').props.total, 15);
  assert.equal(g.hasNode('Order:O2') || g.hasNode('Order:O3'), false);
  await src.stop(); db.close();
});

test('CDC on embedded Postgres (PGlite) + SQL table source', async () => {
  const pg = new PGlite();
  await pg.exec(`CREATE TABLE customers(id text primary key, name text); INSERT INTO customers VALUES ('C1','Ada'),('C2','Ben');
    CREATE TABLE orders(order_id text primary key, customer_id text, total numeric, updated_at timestamptz);
    INSERT INTO orders VALUES ('O1','C1',10,'2026-01-01T00:00:01Z'),('O2','C2',20,'2026-01-01T00:00:02Z');`);
  const g = new GraphStore();
  const flow = { steps: [{ id: 'tbl', type: 'sql', config: { driver: 'pglite', instance: pg, table: 'customers' } },
    { id: 'cdc', type: 'cdc', config: { driver: 'pglite', instance: pg, table: 'orders', key: 'order_id' } }, sink({ ...CUST, ...ORDERS })],
    links: [{ from: 'tbl', to: 'sink' }, { from: 'cdc', to: 'sink' }] };
  const p = new Pipeline(flow, { graph: g });
  await p.runOnce();
  assert.equal(g.getNode('Customer:C2').props.name, 'Ben');
  assert.deepEqual(g.counts(), { nodes: 4, edges: 2 });
  const src = new CdcSource(flow.steps[1].config, p.ctx); const emit = p.emitter('cdc');
  await src.poll(emit); await p.drain();
  await pg.exec(`UPDATE orders SET customer_id='C1', total=25, updated_at='2026-01-01T00:00:09Z' WHERE order_id='O2'; DELETE FROM orders WHERE order_id='O1';`);
  await src.poll(emit); await p.drain();
  assert.deepEqual(g.query('(c:Customer)-[:PLACED]->(o:Order)').map(r => `${r.c.key}>${r.o.key}`), ['C1>O2']);
  assert.equal(g.hasNode('Order:O1'), false);
  await pg.close();
});

test('continuous mode picks up appended NDJSON lines and _op deletes', async () => {
  writeFileSync(join(dir, 'live.ndjson'), '{"order_id":"O1","customer_id":"C1"}\n');
  const g = new GraphStore();
  const p = new Pipeline({ baseDir: dir, steps: [{ id: 's', type: 'file', config: { path: 'live.ndjson', topic: 'orders', intervalMs: 50 } }, sink(ORDERS)], links: [{ from: 's', to: 'sink' }] }, { graph: g });
  let ticks = 0; p.on('tick', () => ticks++);
  await p.start(); await new Promise(r => setTimeout(r, 150));
  appendFileSync(join(dir, 'live.ndjson'), '{"order_id":"O2","customer_id":"C1"}\n{"_op":"d","order_id":"O1","customer_id":"C1"}\n');
  await new Promise(r => setTimeout(r, 300)); await p.stop();
  assert.deepEqual(g.nodes('Order').map(n => n.key), ['O2']);
  assert.ok(ticks > 0, 'live tick events fired');
});

test('asEdge topic turns records into edges with props (node -> edge conversion)', async () => {
  writeFileSync(join(dir, 'items.json'), JSON.stringify([{ order_id: 'O1', sku: 'P1', qty: 2 }, { order_id: 'O1', sku: 'P2', qty: 1 }]));
  const { g } = await run({ baseDir: dir, steps: [{ id: 's', type: 'file', config: { path: 'items.json', topic: 'items' } },
    sink({ items: { asEdge: { type: 'CONTAINS', from: { label: 'Order', key: 'order_id' }, to: { label: 'Product', key: 'sku' }, props: { qty: 'qty' } } } })], links: [{ from: 's', to: 'sink' }] });
  assert.deepEqual(g.query('(o:Order)-[r:CONTAINS]->(p:Product {key:"P1"})')[0].r.props, { qty: 2 });
  assert.deepEqual(g.schema().edgeTypes[0], { type: 'CONTAINS', count: 2, from: ['Order'], to: ['Product'], props: ['qty'] });
});

test('validation catches bad flows before they run', () => {
  const errs = validateFlow({ steps: [{ id: 'a', type: 'file', config: {} }, { id: 'b', type: 'filter', config: { expr: 'x >' } }, { id: 'c', type: 'nope' }, { id: 'z', type: 'graph', config: { mapping: {} } }],
    links: [{ from: 'b', to: 'a' }, { from: 'b', to: 'q' }] });
  for (const re of [/missing config.path/, /bad expression/, /unknown type "nope"/, /sources cannot have inputs/, /unknown step/, /Sink z has no path/]) assert.ok(errs.some(e => re.test(e)), `expected ${re}`);
  assert.ok(validateFlow({ steps: [{ id: 'a', type: 'map', config: {} }, { id: 'b', type: 'map', config: {} }], links: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }] }).includes('Flow has a cycle'));
  assert.ok(validateFlow({ steps: [], links: [] }).includes('Flow has no source'));
});

test('demo flow is valid and copy keeps steps under a new name', () => {
  const f = loadFlow(fileURLToPath(new URL('../demo/flow.json', import.meta.url)));
  assert.deepEqual(validateFlow(f), []);
  const c = copyFlow(f, 'copy'); assert.equal(c.name, 'copy'); assert.equal(c.steps.length, f.steps.length); assert.notEqual(c.steps, f.steps);
});

test('expressions cannot reach JS globals (no eval)', async () => {
  const { evaluate } = await import('../src/expr.js');
  assert.equal(await evaluate('$exists(process)', {}), false);
  assert.equal(await evaluate('$eval("$exists(process)")', {}), false); // $eval is JSONata-only
  let leaked; try { leaked = await evaluate('constructor.constructor("return process")()', {}); } catch { leaked = undefined; }
  assert.equal(leaked, undefined);
});
