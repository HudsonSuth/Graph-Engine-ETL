// SPEC §13.2 tests 21, 26, 33, 36 (client working view, pure part): ordered deltas, incremental apply, highlight set.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Graph from 'graphology';
import { ViewStore, neighborhood } from '../shared/view-store.js';
import { GraphService, StreamIngest } from '../server/impl.js';
import { fSmall, fLarge } from './fixtures.js';

const newGraph = () => new Graph({ type: 'directed', multi: true, allowSelfLoops: true });

test('T21 a delta gap triggers resync instead of a silently diverged view', () => {
  const v = new ViewStore(newGraph());
  v.loadSnapshot({ items: [], deltaCursor: 0 });
  assert.deepEqual(v.applyDelta({ deltaSeq: 1, upserts: [{ id: 'a', kind: 'node', type: 'T', properties: {} }], removes: [] }), { ok: true });
  assert.deepEqual(v.applyDelta({ deltaSeq: 3, upserts: [{ id: 'b', kind: 'node', type: 'T', properties: {} }], removes: [] }), { resync: true });
  assert.ok(!v.graph.hasNode('b'));
});

test('T26 a 200-event delta uses the incremental path (no rebuild) and keeps existing positions', async () => {
  const svc = new GraphService({ coalesceMs: 0 }), ing = new StreamIngest(svc);
  const { nodes, links } = fLarge(2000, 3000, { positions: true });
  for (const i of [...nodes, ...links]) svc.upsert(i);
  const { sessionId, snapshot } = svc.openSession({ follow: true });
  const v = new ViewStore(newGraph()); v.loadSnapshot(snapshot);
  const before = { x: v.graph.getNodeAttribute('n5', 'x'), y: v.graph.getNodeAttribute('n5', 'y') };
  const deltas = []; svc.session(sessionId).on('delta', d => deltas.push(d));
  const events = []; for (let i = 0; i < 100; i++) events.push({ eventId: `u${i}`, op: 'node.upsert', seq: i + 1, eventTime: new Date().toISOString(), payload: { id: `n${i}`, type: 'Person', properties: { score: -1 } } });
  for (let i = 0; i < 100; i++) events.push({ eventId: `w${i}`, op: 'node.upsert', seq: 101 + i, eventTime: new Date().toISOString(), payload: { id: `new${i}`, type: 'Person', properties: {} } });
  await ing.receive({ batchId: 'b', sourceId: 'gen', events });
  await new Promise(r => setImmediate(r));
  for (const d of deltas) assert.deepEqual(v.applyDelta(d), { ok: true });
  assert.equal(v.metrics.fullRebuilds, 1, 'only the initial snapshot rebuilt the view');
  assert.ok(v.metrics.incrementalApplies >= 1);
  assert.equal(v.graph.order, 2100);
  assert.deepEqual({ x: v.graph.getNodeAttribute('n5', 'x'), y: v.graph.getNodeAttribute('n5', 'y') }, before, 'property-only upsert kept the position');
  assert.equal(v.graph.getNodeAttribute('n5', 'item').properties.score, -1);
});

test('T33 neighbour highlight set equals the true 1-hop neighbourhood on F-small', () => {
  const v = new ViewStore(newGraph()); const { nodes, links } = fSmall();
  v.loadSnapshot({ items: [...nodes, ...links], deltaCursor: 0 });
  for (const n of nodes) {
    const { nodes: hn, links: hl } = neighborhood(v.graph, n.id);
    const exp = new Set([n.id]), expL = new Set();
    for (const l of links) if (l.fromId === n.id || l.toId === n.id) { expL.add(l.id); exp.add(l.fromId === n.id ? l.toId : l.fromId); }
    assert.deepEqual([...hn].sort(), [...exp].sort(), n.id); assert.deepEqual([...hl].sort(), [...expL].sort());
  }
});

test('links wait for missing ends and attach when the node arrives; removing a node hides its links', () => {
  const v = new ViewStore(newGraph()); v.loadSnapshot({ items: [], deltaCursor: 0 });
  v.applyDelta({ deltaSeq: 1, upserts: [{ id: 'a', kind: 'node', type: 'T', properties: {} }, { id: 'L', kind: 'link', type: 'R', fromId: 'a', toId: 'b', properties: {} }], removes: [] });
  assert.equal(v.graph.size, 0);
  v.applyDelta({ deltaSeq: 2, upserts: [{ id: 'b', kind: 'node', type: 'T', properties: {} }], removes: [] });
  assert.ok(v.graph.hasEdge('L'));
  v.applyDelta({ deltaSeq: 3, upserts: [], removes: ['b'] });
  assert.ok(!v.graph.hasEdge('L') && !v.graph.hasNode('b'));
  v.applyDelta({ deltaSeq: 4, upserts: [{ id: 'b', kind: 'node', type: 'T', properties: {} }], removes: [] });
  assert.ok(v.graph.hasEdge('L'), 'link restored when its end comes back');
});
