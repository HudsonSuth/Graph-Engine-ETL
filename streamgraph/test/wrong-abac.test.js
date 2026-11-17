// Proof the access tests catch a deliberately wrong engine: default-allow when no rule matches,
// unknown types let through and unlisted fields not masked (STREAMGRAPH_ABAC=broken).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('access suite fails against the broken (default-allow, no unknown-field masking) engine', () => {
  const file = fileURLToPath(new URL('./abac.test.js', import.meta.url));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', file], { env: { ...env, STREAMGRAPH_ABAC: 'broken' }, encoding: 'utf8' });
  assert.notEqual(r.status, 0, 'suite must fail with the broken engine');
  assert.match(r.stdout, /✖ [^\n]*default deny/);
  assert.match(r.stdout, /✖ [^\n]*unknown and unclassified fields are hidden/);
});
