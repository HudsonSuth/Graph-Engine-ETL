// B-01: the deliberately wrong implementation must fail several spec tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runBroken } from './run-broken.mjs';
test('B-01 broken implementation fails at least 5 spec tests', () => {
  const r = runBroken();
  assert.notEqual(r.status, 0, 'broken run should exit non-zero');
  assert.ok(r.fail >= 5, `expected >= 5 failures, got ${r.fail}\n${r.summary}`);
  for (const id of ['C-03', 'C-05', 'D-01', 'S-02']) assert.ok(r.failed.some(f => f.startsWith(id + ' ')), `${id} should fail under the broken impl`);
});
