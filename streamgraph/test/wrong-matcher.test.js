// Proof the studio tests catch a deliberately wrong match suggester that ignores normalization.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('studio suite fails against the naive (no-normalization) matcher', () => {
  const file = fileURLToPath(new URL('./studio.test.js', import.meta.url));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', file], { env: { ...env, STREAMGRAPH_MATCHER: 'naive' }, encoding: 'utf8' });
  assert.notEqual(r.status, 0, 'suite must fail with the naive matcher');
  for (const name of ['finds same customers despite case and spaces', 'normalized IDs', 'relationship suggestions use', 'linking API']) assert.match(r.stdout, new RegExp('✖ [^\\n]*' + name));
});
