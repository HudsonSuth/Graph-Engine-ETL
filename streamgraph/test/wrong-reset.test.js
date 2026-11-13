// Proof the reset tests catch a deliberately wrong reset that clears the graph but leaves sources running.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('reset suite fails against the broken reset', () => {
  const file = fileURLToPath(new URL('./reset.test.js', import.meta.url));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', file], { env: { ...env, STREAMGRAPH_RESET: 'broken' }, encoding: 'utf8' });
  assert.notEqual(r.status, 0, 'suite must fail with the broken reset');
  assert.match(r.stdout, /✖ [^\n]*in-flight records after reset do not repopulate/);
});
