// Phase 1 core loop in Kafka mode (SPEC §23.2.4): two Explore instances on a REAL broker. Instance A publishes; the
// visible subgraph of a session on instance B (built from B's own consumer group) grows live. Ids NK1..NK2.
// Skipped when no broker is reachable (KAFKA_BROKERS, default localhost:9092); never falls back to a mock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brokerUp, space, instance, until, caughtUp } from './kafka-helpers.js';
import { CORE_NODES, CORE_LINKS, oracleNeighborhood } from './core-fixtures.js';

const up = await brokerUp();
const opts = { skip: up ? false : 'no Kafka broker reachable (KAFKA_BROKERS)', timeout: 180000 };

async function seed(ex) {
  const p = ex.producer('ext');
  for (const [id, type, properties] of CORE_NODES) p.push('node.upsert', { id, type, properties });
  for (const [id, fromId, toId, type] of CORE_LINKS) p.push('link.upsert', { id, type, fromId, toId });
  await p.flush();
}

const leaderish = e => /NOT_LEADER|LEADER_NOT_AVAILABLE|not the leader|coordinator|UNKNOWN_TOPIC|not available|rebalance/i.test(String(e?.message || e));
async function again(fn, n = 5) {
  let last;
  for (let i = 0; i < n; i++) {
    try { return await fn(); }
    catch (e) { last = e; if (!leaderish(e) || i === n - 1) throw e; await new Promise(r => setTimeout(r, 500 * (i + 1))); }
  }
  throw last;
}

test('NK1 streamed neighbourhood on a Kafka-built read model equals the oracle; a link published on A grows B\'s session', opts, async t => {
  const sp = space('nk1'), A = await instance(sp, 'a'), B = await instance(sp, 'b');
  t.after(async () => { await A.close(); await B.close(); });
  await again(() => seed(A)); await again(() => caughtUp(B, sp, 60000));
  const { sessionId } = B.service.openSession({ principal: B.config.principal, follow: false, grow: true });
  const s = B.service.session(sessionId), deltas = []; s.on('delta', d => deltas.push(d));
  const r = await B.core.neighborhood(B.service, { seeds: ['c0'], hops: 2 }, items => B.guard(items, null), B.config.principal);
  assert.deepEqual(r.hopOf, oracleNeighborhood(CORE_NODES, CORE_LINKS, { seeds: ['c0'], hops: 2 }).hopOf);
  s.adopt([...r.nodes, ...r.links]);
  const p = A.producer('ext');
  p.push('link.upsert', { id: 'kl1', type: 'KNOWS', fromId: 'b2', toId: 'kn1' });   // link first, its new end node later
  p.push('link.upsert', { id: 'kl2', type: 'KNOWS', fromId: 'z1', toId: 'kn2' });   // nowhere near the visible subgraph
  await again(() => p.flush());
  await new Promise(r => setTimeout(r, 1000));
  p.push('node.upsert', { id: 'kn1', type: 'Person', properties: {} });
  p.push('node.upsert', { id: 'kn2', type: 'Person', properties: {} });
  await again(() => p.flush());
  const got = () => new Set(deltas.flatMap(d => d.upserts.map(u => u.id)));
  await until(() => got().has('kl1') && got().has('kn1'), 90000);
  await again(() => caughtUp(B, sp, 60000)); await new Promise(r => setTimeout(r, 800));
  assert.ok(!got().has('kl2') && !got().has('kn2'), 'unrelated items are not pushed');
  const order = deltas.flatMap(d => d.upserts.map(u => u.id)); assert.ok(order.indexOf('kn1') >= 0);
});

test('NK2 paths and algorithms on the Kafka-built read model', opts, async t => {
  const sp = space('nk2'), A = await instance(sp, 'a'); t.after(() => A.close());
  await seed(A); await caughtUp(A, sp);
  const p = await A.core.findPaths(A.service, { fromId: 'c0', toId: 'd1', maxHops: 4 }, x => A.guard(x, null), A.config.principal);
  assert.deepEqual(p.paths.map(x => x.nodeIds), [['c0', 'a1', 'b1', 'd1'], ['c0', 'a2', 'b1', 'd1'], ['c0', 'a3', 'a1', 'b1', 'd1']]);
  const deg = await A.algo.run({ algo: 'degree', scope: { kind: 'all' } }, { principal: A.config.principal });
  assert.equal(deg.values.c0, 4); assert.equal(deg.values.b1, 3);
});
