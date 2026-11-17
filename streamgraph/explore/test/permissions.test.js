// SPEC §13.2 tests 13, 14 and §5.9: permission propagation, fail closed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GraphService } from '../server/impl.js';
import { node, link } from './fixtures.js';

const access = { sources: { A: { read: ['role:alpha'] }, B: { read: ['role:alpha', 'role:beta'] } } };
const alice = { id: 'alice', roles: ['alpha'] }, bob = { id: 'bob', roles: ['beta'] };
function fAuth(o = {}) {
  const s = new GraphService({ coalesceMs: 0, access, ...o });
  s.upsert(node('onlyA', 'Secret', { code: 7 }, 'A'));
  s.upsert(node('onlyB', 'Public', { x: 1 }, 'B'));
  s.upsert(node('both', 'Person', { fromA: 'a' }, 'A'));
  s.upsert(node('both', 'Person', { fromB: 'b' }, 'B'));
  s.upsert(link('AB', 'onlyA', 'onlyB', 'REL', {}, 'B'));
  s.upsert(node('onlyB2', 'Public', {}, 'B'));
  s.upsert(link('BB', 'onlyB', 'onlyB2', 'REL', {}, 'B'));
  return s;
}

test('T13 a user who cannot read source A never receives A-only items; merged A+B item is hidden (fail closed)', async () => {
  const s = fAuth();
  const { sessionId, snapshot } = s.openSession({ principal: bob, follow: true });
  const ids = snapshot.items.map(i => i.id).sort();
  assert.ok(!ids.includes('onlyA'), 'A-only item leaked');
  assert.ok(!ids.includes('both'), 'merged item without field attribution must be hidden from a user lacking A');
  assert.deepEqual(ids, ['BB', 'onlyB', 'onlyB2']);
  assert.equal(s.search(sessionId, { text: 'secret' }).items.length, 0);
  assert.equal(s.search(sessionId, { text: '' }).items.some(i => i.id === 'onlyA'), false, 'search by any text never returns A-only items');
  assert.equal(s.path(sessionId, { fromId: 'onlyA', toId: 'onlyB' }).found, false);
  const alic = s.openSession({ principal: alice, follow: true });
  assert.equal(alic.snapshot.items.length, 6, 'alice (reads A and B) sees everything');
});

test('T13b with field attribution on, the merged item is visible but A-only properties are redacted', () => {
  const s = fAuth({ fieldAttribution: true });
  const { snapshot } = s.openSession({ principal: bob, follow: true });
  const both = snapshot.items.find(i => i.id === 'both');
  assert.ok(both); assert.deepEqual(both.properties, { fromB: 'b' }); assert.deepEqual(both.sources.map(x => x.sourceId), ['B']);
});

test('T14 a link is omitted if the user cannot read one end; expand returns only visible neighbours', async () => {
  const s = fAuth();
  const { sessionId, snapshot } = s.openSession({ principal: bob, follow: false });
  assert.equal(snapshot.items.length, 0);
  const r = await s.expand(sessionId, { ids: ['onlyB'] });
  assert.deepEqual(r.items.map(i => i.id).sort(), ['BB', 'onlyB', 'onlyB2']);
});

test('revocation takes effect on the next delta (remove sent, no UI-side hiding needed)', () => {
  const s = new GraphService({ coalesceMs: 0, access: { sources: { B: { read: ['role:beta'] } } } });
  s.upsert(node('b1', 'T', {}, 'B'));
  const { sessionId, snapshot } = s.openSession({ principal: bob, follow: true });
  assert.equal(snapshot.items.length, 1);
  const sess = s.session(sessionId); const got = []; sess.on('delta', d => got.push(d));
  s.access.sources.B.read = [];
  sess.markDirty(['b1']); sess.flush();
  assert.deepEqual(got[0].removes, ['b1']);
});

test('unknown source policy is fail closed', () => {
  const s = new GraphService({ coalesceMs: 0, access: { sources: {} } });
  s.upsert(node('z', 'T', {}, 'Z'));
  assert.equal(s.openSession({ principal: alice }).snapshot.items.length, 0);
});
