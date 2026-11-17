// SPEC §13.2 tests 1, 2, 7-12, 20-23: canonical model, merge/dedupe, conflict policies, resolution, tombstones, session API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GraphService } from '../server/impl.js';
import { normalizeItem } from '../shared/model.js';
import { node, link, t, fSmall } from './fixtures.js';

const svc = (o = {}) => new GraphService({ coalesceMs: 0, ...o });

test('T1 valid node and link accepted; empty id and reserved sys: prefix rejected', () => {
  const s = svc();
  assert.equal(s.upsert(node('a', 'Person')).status, 'inserted');
  assert.equal(s.upsert(node('b', 'Person')).status, 'inserted');
  assert.equal(s.upsert(link('ab', 'a', 'b')).status, 'inserted');
  assert.equal(s.upsert(node('', 'Person')).status, 'rejected');
  assert.equal(s.upsert(node('   ', 'Person')).status, 'rejected');
  assert.equal(s.upsert(node('sys:x', 'Person')).status, 'rejected');
  assert.equal(normalizeItem({ id: 'x', kind: 'node', type: '' }).ok, false);
  assert.equal(normalizeItem({ id: 'x', kind: 'node' }).item.type, 'Unknown');
  const r = normalizeItem({ id: 'x', kind: 'node', type: 'T', properties: { id: 'nope', ok: 1, bad: () => 1 } });
  assert.deepEqual(r.item.properties, { ok: 1 }); assert.equal(r.warnings.length, 2);
});

test('T2 link without toId rejected; rest of the batch still applies', () => {
  const s = svc();
  const res = [node('a', 'P'), { ...link('bad', 'a', 'b'), toId: undefined }, node('b', 'P'), link('ab', 'a', 'b')].map(i => s.upsert(i).status);
  assert.deepEqual(res, ['inserted', 'rejected', 'inserted', 'inserted']);
  assert.equal(s.counts().nodes, 2); assert.equal(s.counts().links, 1);
});

test('T7 same id + identical payload twice: second is a no-op (no version bump, no delta, one item)', async () => {
  const s = svc(); const { sessionId } = s.openSession({ follow: true });
  const deltas = []; s.session(sessionId).on('delta', d => deltas.push(d));
  const a = node('p1', 'Person', { name: 'Ann', age: 40 }, 'A', { eventTime: t(1) });
  s.upsert(a); s.session(sessionId).flush();
  const r = s.upsert(structuredClone(a)); s.session(sessionId).flush();
  assert.equal(r.status, 'noop');
  assert.equal(s.get('p1').version, 1);
  assert.equal(deltas.length, 1, 'only the first upsert produces a delta');
  assert.equal(s.counts().nodes, 1, 'exactly one item for the id');
});

test('T8 default field-merge-lww keeps stored-only properties and newer eventTime wins on shared keys', () => {
  const s = svc();
  s.upsert(node('p', 'Person', { name: 'Old', city: 'Reno' }, 'A', { eventTime: t(10) }));
  s.upsert(node('p', 'Person', { name: 'New' }, 'A', { eventTime: t(20) }));
  assert.deepEqual(s.get('p').properties, { name: 'New', city: 'Reno' });
  s.upsert(node('p', 'Person', { name: 'Older' }, 'A', { eventTime: t(5) }));
  assert.equal(s.get('p').properties.name, 'New', 'older eventTime loses');
  assert.equal(s.get('p').version, 2);
});

test('T9 replace policy drops properties absent from the incoming full upsert', () => {
  const s = svc({ conflictPolicy: 'replace' });
  s.upsert(node('p', 'Person', { name: 'A', city: 'Reno' }));
  s.upsert(node('p', 'Person', { name: 'B' }));
  assert.deepEqual(s.get('p').properties, { name: 'B' });
});

test('T10 reject-stale ignores an older eventTime', () => {
  const s = svc({ conflictPolicy: 'reject-stale' });
  s.upsert(node('p', 'Person', { name: 'A' }, 'A', { eventTime: t(10) }));
  const r = s.upsert(node('p', 'Person', { name: 'B' }, 'A', { eventTime: t(5) }));
  assert.equal(r.status, 'stale_ignored'); assert.ok(r.warnings.some(w => w.code === 'stale_ignored'));
  assert.equal(s.get('p').properties.name, 'A');
});

test('T11 entity resolution key rule aliases two ids, rewrites links, one visible node remains', () => {
  const s = svc({ resolution: [{ type: 'Person', keys: ['email'] }] });
  const { sessionId } = s.openSession({ follow: true });
  s.upsert(node('A:p1', 'Person', { email: 'ann@x.io', name: 'Ann' }, 'A'));
  s.upsert(node('B:acct', 'Account', {}, 'B'));
  s.upsert(link('B:l1', 'B:p9', 'B:acct', 'OWNS', {}, 'B'));
  s.upsert(node('B:p9', 'Person', { email: 'ANN@x.io ', phone: '555' }, 'B'));
  const p = s.get('B:p9');
  assert.equal(p.id, 'A:p1', 'alias resolves to the earliest-created canonical id');
  assert.deepEqual(p.sources.map(x => x.sourceId).sort(), ['A', 'B']);
  assert.equal(p.properties.phone, '555');
  assert.equal(s.get('B:l1').fromId, 'A:p1', 'link rewritten to canonical id');
  const snap = s.session(sessionId).snapshot();
  assert.equal(snap.items.filter(i => i.type === 'Person').length, 1);
});

test('T12 remove then duplicate remove is a no-op; later upsert revives the id with continuing version', () => {
  const s = svc();
  s.upsert(node('x', 'T', { v: 1 }));
  assert.equal(s.remove('x').status, 'removed');
  const v = s.get('x').version;
  assert.equal(s.remove('x').status, 'noop');
  assert.equal(s.get('x').version, v);
  const r = s.upsert(node('x', 'T', { v: 2 }));
  assert.equal(r.status, 'updated'); assert.equal(r.revived, true);
  assert.equal(s.get('x').deleted, false); assert.equal(s.get('x').version, v + 1);
  assert.equal(s.remove('never-seen').status, 'noop'); // unknown ids become tombstones
});

test('T20 session.open empty, search adds items, release removes them from the working set only', () => {
  const s = svc(); const { nodes, links } = fSmall(); [...nodes, ...links].forEach(i => s.upsert(i));
  const { sessionId, snapshot } = s.openSession({ follow: false });
  assert.equal(snapshot.items.length, 0);
  const r = s.search(sessionId, { text: 'node 1', limit: 50 });
  assert.ok(r.items.length >= 1 && r.items.every(i => /node 1/i.test(i.properties.name)));
  s.release(sessionId, r.items.map(i => i.id));
  assert.equal(s.session(sessionId).snapshot().items.length, 0);
  assert.ok(s.live(r.items[0].id), 'service graph still has the item');
});

test('T22 path returns the known 3-hop path on F-small', () => {
  const s = svc(); const { nodes, links } = fSmall(); [...nodes, ...links].forEach(i => s.upsert(i));
  const { sessionId } = s.openSession({ follow: false });
  const p = s.path(sessionId, { fromId: 's0', toId: 's3' });
  assert.equal(p.found, true);
  assert.deepEqual(p.nodeIds, ['s0', 's1', 's2', 's3']);
  assert.deepEqual(p.linkIds, ['l0', 'l1', 'l2']);
  assert.equal(s.path(sessionId, { fromId: 's3', toId: 's0' }).found, false, 'directed: no path back');
  assert.equal(s.path(sessionId, { fromId: 's3', toId: 's0', directed: false }).found, true);
});

test('T23 expand respects limit and reports truncated; a second page completes it', async () => {
  const s = svc();
  s.upsert(node('hub', 'Hub'));
  for (let i = 0; i < 5; i++) { s.upsert(node(`n${i}`, 'Leaf')); s.upsert(link(`hl${i}`, 'hub', `n${i}`)); }
  const { sessionId } = s.openSession({ follow: false });
  const all = await s.expand(sessionId, { ids: ['hub'], limit: 10 });
  assert.equal(all.items.filter(i => i.kind === 'node' && i.id !== 'hub').length, 5);
  assert.equal(all.items.filter(i => i.kind === 'link').length, 5);
  assert.equal(all.truncated, false);
  const p1 = await s.expand(sessionId, { ids: ['hub'], limit: 2 });
  assert.equal(p1.truncated, true); assert.equal(p1.nextCursor, 2);
  assert.equal(p1.items.filter(i => i.kind === 'node' && i.id !== 'hub').length, 2);
});

test('provenance union and server-side metadata: version, updatedAt, sources after merge from two sources', () => {
  const s = svc();
  s.upsert(node('m', 'T', { a: 1 }, 'A')); s.upsert(node('m', 'T', { b: 2 }, 'B'));
  const m = s.get('m');
  assert.deepEqual(m.sources.map(x => x.sourceId), ['A', 'B']); assert.equal(m.version, 2); assert.ok(m.updatedAt.endsWith('Z'));
});

test('future eventTime is clamped with a warning, not dropped', () => {
  const s = svc();
  const r = s.upsert(node('f', 'T', {}, 'A', { eventTime: '2999-01-01T00:00:00Z' }));
  assert.equal(r.status, 'inserted'); assert.ok(r.warnings.some(w => w.code === 'future_event_time_clamped'));
});
