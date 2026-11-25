import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGraphRetrieve, makeOpenSearchRetrieve, combineRetrieve } from '../src/agents/rag.js';

test('makeGraphRetrieve returns [] on null graph', async () => {
  const r = makeGraphRetrieve(null);
  assert.deepEqual(await r('q'), []);
});
test('makeOpenSearchRetrieve wraps searchFetch', async () => {
  const r = makeOpenSearchRetrieve(async (q, k) => ['a', 'b'], 2);
  assert.deepEqual(await r('q'), ['a', 'b']);
});
test('combineRetrieve merges', async () => {
  const r = combineRetrieve(async () => ['x'], async () => ['y']);
  assert.deepEqual(await r('q'), ['x', 'y']);
});
