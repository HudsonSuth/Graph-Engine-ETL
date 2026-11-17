// SPEC §13.2 tests 15-19 and §6: streaming contract, plus the StreamGraph adapter against a real StreamGraph GraphStore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GraphService, StreamIngest } from '../server/impl.js';
import { StreamProducer } from '../server/producer.js';
import { StreamGraphAdapter, mapChange } from '../server/streamgraph-adapter.js';
import { GraphStore, nodeId } from '../../src/graph.js';
import { fStream, graphState, t } from './fixtures.js';

const setup = (o = {}) => { const svc = new GraphService({ coalesceMs: 0 }); return { svc, ing: new StreamIngest(svc, { orderWaitMs: 50, ...o }) }; };

test('T15 replaying F-stream with at-least-once duplicates yields the same graph as one clean play', async () => {
  const clean = setup(); for (const b of fStream().batches) await clean.ing.receive(b);
  const dup = setup(); const bs = fStream().batches;
  for (const b of bs) { await dup.ing.receive(b); await dup.ing.receive(structuredClone(b)); }
  for (const b of bs.slice(0, 3)) await dup.ing.receive(structuredClone(b)); // late redelivery
  assert.deepEqual(graphState(dup.svc), graphState(clean.svc));
  assert.equal(dup.svc.counts().nodes, 210);
  assert.equal(dup.svc.get('a9').properties.revived, true);
  const versions = id => [clean.svc.get(id).version, dup.svc.get(id).version];
  for (const id of ['a0', 'a5', 'b100']) { const [a, b] = versions(id); assert.equal(b, a, `version of ${id} must not change on replay`); }
});

test('T16 a seq gap blocks later events (gapPolicy=block) until the gap is filled', async () => {
  const { svc, ing } = setup({ orderWaitMs: 30 });
  const { events } = fStream();
  const a1 = await ing.receive({ batchId: 'x', sourceId: 'S', events: [events[0], events[2], events[3]] });
  assert.equal(a1.status, 'gap'); assert.equal(a1.lastAppliedSeq, 1); assert.equal(a1.buffered, 2);
  assert.ok(svc.live('a0') && !svc.live('a2') && !svc.live('a3'), 'events after the gap are not applied');
  await new Promise(r => setTimeout(r, 60));
  assert.ok(!svc.live('a2'), 'still blocked after orderWaitMs under the default block policy');
  assert.equal(svc.lag.S.status, 'gap');
  const a2 = await ing.receive({ batchId: 'y', sourceId: 'S', events: [events[1]] });
  assert.equal(a2.status, 'ok'); assert.equal(a2.lastAppliedSeq, 4);
  assert.ok(svc.live('a1') && svc.live('a2') && svc.live('a3'));
});

test('T16b skip-forward applies after the wait and records a hole', async () => {
  const { svc, ing } = setup({ orderWaitMs: 20, gapPolicy: 'skip-forward' });
  const { events } = fStream();
  await ing.receive({ batchId: 'x', sourceId: 'S', events: [events[0], events[2]] });
  await new Promise(r => setTimeout(r, 50)); await ing.chain;
  assert.ok(svc.live('a2')); assert.equal(ing.metrics.holes, 1);
});

test('T17 producer is credited only after ack; with a paused service in-flight never exceeds maxInFlightBatches', async () => {
  const { ing } = setup();
  ing.pause();
  const p = new StreamProducer({ sourceId: 'S', send: b => ing.receive(b), maxInFlightBatches: 4, maxBatchEvents: 10, lingerMs: 1 });
  for (let i = 0; i < 200; i++) p.push('node.upsert', { id: `q${i}`, type: 'Q' });
  p.pump();
  await new Promise(r => setTimeout(r, 30));
  assert.equal(p.inFlight, 4); assert.equal(p.maxObservedInFlight, 4); assert.equal(p.ackedSeq, 0, 'nothing credited while paused');
  ing.resume(); await p.flush();
  assert.equal(p.ackedSeq, 200); assert.equal(p.maxObservedInFlight, 4);
});

test('T17b queue overflow returns retry and the producer resends without loss', async () => {
  const { svc, ing } = setup({ maxQueuedEvents: 15 });
  const p = new StreamProducer({ sourceId: 'S', send: b => ing.receive(b), maxInFlightBatches: 4, maxBatchEvents: 10, lingerMs: 1 });
  for (let i = 0; i < 100; i++) p.push('node.upsert', { id: `r${i}`, type: 'R' });
  await p.flush();
  assert.ok(p.stats.retries > 0); assert.equal(svc.counts().nodes, 100);
});

test('T18 eventId replay does not increment version', async () => {
  const { svc, ing } = setup();
  const e = { eventId: 'e-1', op: 'node.upsert', sourceId: 'S', seq: 1, eventTime: t(1), payload: { id: 'v', type: 'V', properties: { k: 1 } } };
  await ing.receive({ batchId: 1, sourceId: 'S', events: [e] });
  const a = await ing.receive({ batchId: 2, sourceId: 'S', events: [{ ...e, seq: 2 }] }); // same eventId, new seq
  assert.equal(a.duplicates, 1); assert.equal(svc.get('v').version, 1);
});

test('T19 follow-live session sees a 200-event burst applied within the delta budget (local, network mocked)', async () => {
  const svc = new GraphService({ coalesceMs: 0 }), ing = new StreamIngest(svc);
  const { sessionId } = svc.openSession({ follow: true });
  const got = []; svc.session(sessionId).on('delta', d => got.push([performance.now(), d]));
  const { events } = fStream();
  const burst = events.filter(e => e.payload.id?.startsWith('b')).map((e, i) => ({ ...e, seq: i + 1 }));
  const t0 = performance.now();
  const ack = await ing.receive({ batchId: 'burst', sourceId: 'S', events: burst });
  const tAck = performance.now();
  await new Promise(r => setImmediate(r));
  assert.equal(ack.accepted, 200);
  const n = got.reduce((s, [, d]) => s + d.upserts.length, 0);
  assert.equal(n, 200);
  const latency = got.at(-1)[0] - tAck;
  assert.ok(latency < 50, `delta latency after ack ${latency.toFixed(1)}ms (budget p95 50ms)`);
  assert.ok(tAck - t0 < 200, `apply of 200 events took ${(tAck - t0).toFixed(1)}ms`);
});

test('a link arriving before its nodes keeps a stub endpoint, replaced by the real node later', async () => {
  const { svc, ing } = setup();
  await ing.receive({ batchId: 1, sourceId: 'S', events: [
    { eventId: 'x1', op: 'link.upsert', seq: 1, eventTime: t(1), payload: { id: 'L', fromId: 'n1', toId: 'n2', type: 'R' } },
    { eventId: 'x2', op: 'node.upsert', seq: 2, eventTime: t(2), payload: { id: 'n1', type: 'Person', properties: { name: 'Ann' } } }] });
  assert.equal(svc.get('n2').type, 'Unknown'); assert.equal(svc.get('n2').properties.stub, true);
  assert.equal(svc.get('n1').type, 'Person'); assert.equal(svc.get('n1').properties.stub, undefined);
});

test('snapshot.marker replace-source tombstones items of that source missing from the snapshot', async () => {
  const { svc, ing } = setup();
  let s = 0; const e = (op, payload) => ({ eventId: `z${++s}`, op, seq: s, eventTime: t(s), payload });
  await ing.receive({ batchId: 1, sourceId: 'S', events: [e('node.upsert', { id: 'k1', type: 'K' }), e('node.upsert', { id: 'k2', type: 'K' })] });
  await ing.receive({ batchId: 2, sourceId: 'S', events: [e('snapshot.marker', { phase: 'begin', snapshotId: 's1', mode: 'replace-source' }), e('node.upsert', { id: 'k1', type: 'K' }), e('snapshot.marker', { phase: 'end', snapshotId: 's1' })] });
  assert.ok(svc.live('k1')); assert.ok(!svc.live('k2'));
});

test('StreamGraph adapter: live GraphStore writes reach the service through the contract (ids, types, ends, deletes, wipe)', async () => {
  const g = new GraphStore();
  g.upsertNode(nodeId('Customer', 'c1'), 'Customer', 'c1', { name: 'Ada' }); // exists before the adapter starts -> snapshot
  const svc = new GraphService({ coalesceMs: 0 }), ing = new StreamIngest(svc);
  const ad = new StreamGraphAdapter(g, { send: b => ing.receive(b), lingerMs: 1 }).start();
  g.upsertNode(nodeId('Order', 'O1'), 'Order', 'O1', { total: 120 });
  g.upsertEdge('PLACED', nodeId('Customer', 'c1'), nodeId('Order', 'O1'), {});
  g.pruneChanges(g.maxSeq()); // StreamGraph sync-out prunes the log; the adapter must not depend on it
  g.upsertNode(nodeId('Customer', 'c1'), 'Customer', 'c1', { tier: 'gold' });
  await ad.flush();
  const c = svc.get('sg:node:Customer:c1');
  assert.equal(c.type, 'Customer'); assert.equal(c.label, 'Ada'); assert.deepEqual(c.properties, { name: 'Ada', tier: 'gold', key: 'c1' });
  const l = svc.get('sg:link:Customer:c1-[PLACED]->Order:O1');
  assert.equal(l.fromId, 'sg:node:Customer:c1'); assert.equal(l.toId, 'sg:node:Order:O1'); assert.equal(l.type, 'PLACED');
  assert.deepEqual(c.sources.map(s => s.sourceId), ['streamgraph']);
  g.deleteNode(nodeId('Order', 'O1')); await ad.flush();
  assert.ok(!svc.live('sg:node:Order:O1')); assert.ok(!svc.live(l.id), 'incident edge delete forwarded');
  g.clear(); await ad.flush(); // new epoch: everything from StreamGraph is tombstoned
  assert.equal(svc.counts().nodes, 0);
  g.upsertNode(nodeId('Customer', 'c2'), 'Customer', 'c2', {}); await ad.flush();
  assert.ok(svc.live('sg:node:Customer:c2'));
  ad.stop();
  assert.equal(Object.prototype.hasOwnProperty.call(g, 'upsertNode'), false, 'stop() restores the GraphStore');
});

test('adapter mapping table: change-log rows map to contract ops', () => {
  assert.deepEqual(mapChange({ kind: 'node', op: 'delete', id: 'A:1', data: {} }), ['node.remove', { id: 'sg:node:A:1' }]);
  assert.deepEqual(mapChange({ kind: 'edge', op: 'delete', id: 'A:1-[R]->B:2', data: { type: 'R' } }), ['link.remove', { id: 'sg:link:A:1-[R]->B:2' }]);
  const [op, p] = mapChange({ kind: 'edge', op: 'upsert', id: 'A:1-[R]->B:2', data: { type: 'R', props: { w: 1 } } });
  assert.equal(op, 'link.upsert'); assert.equal(p.fromId, 'sg:node:A:1'); assert.equal(p.toId, 'sg:node:B:2'); assert.deepEqual(p.properties, { w: 1 });
});
