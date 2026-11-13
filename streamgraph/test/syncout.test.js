// Sync-out: snapshots, incremental changes, deletes, persisted checkpoints, resync after a wipe, masking and failure handling.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { GraphStore } from '../src/graph.js';
import { PolicyStore } from '../src/abac/policy.js';
import { AbacEngine } from '../src/abac/engine.js';
import { SyncOut } from '../src/syncout/index.js';
import { startServer } from '../src/app.js';

function world() {
  const graph = new GraphStore(), policy = new PolicyStore();
  graph.upsertNode('Customer:c1', 'Customer', 'c1', { name: 'Ada', email: 'ada@x.io' });
  graph.upsertNode('Order:o1', 'Order', 'o1', { total: 10 });
  graph.upsertEdge('HAS_ORDER', 'Customer:c1', 'Order:o1', {});
  policy.register(graph.schema());
  for (const [e, f, s] of [['Customer', 'name', 'low'], ['Customer', 'email', 'high'], ['Order', 'total', 'low']]) policy.setField(e, f, s);
  return { graph, policy, engine: new AbacEngine(policy) };
}
const rows = async (db, t) => (await db.query(`SELECT * FROM sg_${t} ORDER BY id`)).rows;

test('postgres sink: snapshot, update, delete, checkpoint resume, resync after wipe; email masked', async () => {
  const { graph, engine } = world(), db = new PGlite(), dir = await mkdtemp(join(tmpdir(), 'sg-so-'));
  const cpFile = join(dir, 'cp.json'), sinks = [{ id: 'pg', name: 'Warehouse', kind: 'postgres', settings: {}, asUser: 'sync-service' }];
  const mk = () => new SyncOut({ graph, engine, checkpointFile: cpFile, factories: { postgres: { instance: db } } });
  let so = mk(); await so.load(); await so.configure(sinks);
  await so.cycle();
  let n = await rows(db, 'nodes');
  assert.deepEqual(n.map(r => r.id), ['Customer:c1', 'Order:o1']);
  assert.equal(n[0].props.email, '[hidden]', 'sync-service (clearance 1) must not receive a high field');
  assert.equal(n[0].props.name, 'Ada');
  assert.equal((await rows(db, 'edges')).length, 1);
  assert.equal(so.status()[0].health, 'green'); assert.equal(so.status()[0].waiting, 0);

  graph.upsertNode('Customer:c1', 'Customer', 'c1', { name: 'Ada L.' });
  graph.deleteNode('Order:o1');
  await so.cycle();
  n = await rows(db, 'nodes');
  assert.deepEqual(n.map(r => r.id), ['Customer:c1']);
  assert.equal(n[0].props.name, 'Ada L.');
  assert.equal((await rows(db, 'edges')).length, 0, 'edge removed with its node');
  const cp = JSON.parse(await readFile(cpFile, 'utf8')).pg;
  assert.equal(cp.seq, graph.maxSeq()); assert.equal(cp.epoch, graph.epoch);
  assert.equal(graph.changesAfter(0).length, 0, 'delivered changes are pruned');

  // Restart: the checkpoint is loaded, nothing is re-sent, and new changes continue from there.
  await so.stop(); so = mk(); await so.load(); await so.configure(sinks);
  await so.cycle(); assert.equal(so.status()[0].snapshots, 1, 'no new snapshot after a restart');
  graph.upsertNode('Customer:c2', 'Customer', 'c2', { name: 'Ben' });
  await so.cycle();
  assert.deepEqual((await rows(db, 'nodes')).map(r => r.id), ['Customer:c1', 'Customer:c2']);

  // Wipe (new epoch): full snapshot, and the sweep removes what is no longer in the graph.
  graph.clear(); graph.upsertNode('Customer:c3', 'Customer', 'c3', { name: 'Cy' });
  await so.cycle();
  assert.deepEqual((await rows(db, 'nodes')).map(r => r.id), ['Customer:c3']);
  assert.equal(so.status()[0].snapshots, 2);
  await so.stop(); await db.close();
});

test('a failing sink turns red, keeps its checkpoint and catches up later (at-least-once)', async () => {
  const { graph, engine } = world(); let fail = true; const got = [];
  const producerFactory = async () => ({ connect: async () => { if (fail) throw new Error('connect ECONNREFUSED 127.0.0.1:9092'); }, disconnect: async () => {}, send: async m => got.push(...m.messages) });
  const so = new SyncOut({ graph, engine, factories: { kafka: { producerFactory } } });
  await so.configure([{ id: 'k', name: 'Feed', kind: 'kafka', settings: { topic: 'graph' }, asUser: 'sync-service' }]);
  await so.cycle();
  assert.equal(so.status()[0].health, 'red'); assert.match(so.status()[0].lastError, /ECONNREFUSED/);
  assert.equal(graph.changesAfter(0).length > 0, true, 'changes are kept while a sink is behind');
  fail = false; await so.cycle();
  assert.equal(so.status()[0].health, 'green');
  assert.ok(got.some(m => m.key === 'Customer:c1' && JSON.parse(m.value).props.email === '[hidden]'));
  graph.deleteNode('Customer:c1'); await so.cycle();
  const tomb = got.filter(m => m.value === null).map(m => m.key);
  assert.ok(tomb.includes('Customer:c1'), 'node delete is a tombstone'); assert.ok(tomb.some(k => k.includes('HAS_ORDER')), 'edge delete is a tombstone');
  await so.stop();
});

test('neo4j/memgraph sink: one transaction per batch, MERGE by key, DETACH DELETE, sweep after snapshot', async () => {
  const { graph, engine } = world(), log = []; let commits = 0;
  const driverFactory = async () => ({ close: async () => {}, session: () => ({ close: async () => {}, beginTransaction: () => ({ run: async (c, p) => log.push([c, p]), commit: async () => commits++, rollback: async () => {} }) }) });
  const so = new SyncOut({ graph, engine, factories: { memgraph: { driverFactory } } });
  await so.configure([{ id: 'm', name: 'Memgraph', kind: 'memgraph', settings: { url: 'bolt://127.0.0.1:7687' }, asUser: 'sync-service' }]);
  await so.cycle();
  const merge = log.find(([c]) => /MERGE \(n:`Customer`/.test(c));
  assert.ok(merge); assert.equal(merge[1].rows[0].props.email, '[hidden]');
  assert.ok(log.some(([c]) => /MERGE \(a\)-\[e:`HAS_ORDER`\]->\(b\)/.test(c)));
  assert.ok(log.some(([c]) => /_sg_run < \$run DETACH DELETE/.test(c)), 'snapshot is followed by a sweep');
  graph.deleteNode('Order:o1'); log.length = 0; await so.cycle();
  assert.ok(log.some(([c, p]) => /DETACH DELETE n/.test(c) && p.keys.includes('o1')));
  assert.ok(commits >= 3);
  await so.stop();
});

test('denied types are not sent, and revoking access removes them downstream', async () => {
  const { graph, policy, engine } = world(), db = new PGlite();
  const so = new SyncOut({ graph, engine, factories: { postgres: { instance: db } } });
  await so.configure([{ id: 'pg', name: 'W', kind: 'postgres', settings: {}, asUser: 'analyst' }]); // analysts may not sync out
  await so.cycle();
  assert.equal((await rows(db, 'nodes')).length, 0);
  await so.configure([{ id: 'pg', name: 'W', kind: 'postgres', settings: {}, asUser: 'sync-service' }]);
  await so.cycle(); assert.equal((await rows(db, 'nodes')).length, 2);
  policy.putRule({ id: 'no-orders', name: 'Orders stay here', effect: 'deny', subjects: { roles: ['*'] }, actions: ['sync-out'], resources: { entities: ['Order'] } });
  await so.cycle();
  assert.deepEqual((await rows(db, 'nodes')).map(r => r.id), ['Customer:c1'], 'a rule change resyncs at once and removes denied data');
  policy.deleteRule('no-orders'); await so.cycle();
  graph.deleteNode('Customer:c1'); graph.upsertNode('Customer:c1', 'Customer', 'c1', { name: 'Ada' });
  policy.putRule({ id: 'no-orders', name: 'Orders stay here', effect: 'deny', subjects: { roles: ['*'] }, actions: ['sync-out'], resources: { entities: ['Order'] } });
  graph.upsertNode('Order:o1', 'Order', 'o1', { total: 12 }); await so.cycle();
  assert.ok(!(await rows(db, 'nodes')).some(r => r.id === 'Order:o1'), 'a denied upsert is never sent');
  await so.stop(); await db.close();
});

test('sync-out API: add, test, status; password stays server-side', async () => {
  const db = new PGlite(), dir = await mkdtemp(join(tmpdir(), 'sg-soapi-'));
  const { app, close } = await startServer({ port: 0, dataDir: dir, log: null, sinkFactories: { postgres: { instance: db } }, syncIntervalMs: 100000 });
  const api = async (m, p, b) => { const r = await fetch(`http://127.0.0.1:${app.port}${p}`, { method: m, headers: { 'content-type': 'application/json' }, body: b && JSON.stringify(b) }); return { status: r.status, body: await r.json() }; };
  try {
    let r = await api('POST', '/api/studio/sinks/test', { kind: 'postgres', settings: {} });
    assert.equal(r.body.ok, true);
    r = await api('POST', '/api/studio/sinks', { name: 'Warehouse', kind: 'postgres', settings: { host: 'db.local', user: 'sg' }, secret: 'pw-123' });
    assert.equal(r.status, 200); assert.ok(!JSON.stringify(r.body).includes('pw-123'));
    assert.ok(JSON.parse(await readFile(join(dir, 'secrets.json'), 'utf8'))[`sink_${r.body.sinks[0].id}`] === 'pw-123');
    app.graph.upsertNode('Thing:t1', 'Thing', 't1', { label: 'x' }); app.onTick();
    r = await api('POST', '/api/studio/sinks/sync-now');
    assert.equal(r.body.status[0].health, 'green'); assert.equal(r.body.status[0].sent, 1);
    assert.equal((await rows(db, 'nodes'))[0].props.label, '[hidden]', 'new fields are unclassified and hidden from clearance 1');
    r = await api('POST', '/api/studio/sinks', { name: 'Bad', kind: 'kafka', settings: {} });
    assert.equal(r.status, 400); assert.match(r.body.error, /topic/);
  } finally { await close(); await db.close(); }
});
