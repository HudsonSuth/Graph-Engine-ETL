// Proof the suite catches a deliberately wrong mapper (ignores keys, duplicates nodes).
// Runs the main suite in a child process with STREAMGRAPH_MAPPER=broken and requires it to FAIL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('main suite fails against BrokenMapper', () => {
  const file = fileURLToPath(new URL('./pipeline.test.js', import.meta.url));
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', file], { env: { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT')), STREAMGRAPH_MAPPER: 'broken' }, encoding: 'utf8' });
  const fail = Number(/ℹ fail (\d+)/.exec(r.stdout)?.[1] || 0);
  assert.notEqual(r.status, 0, 'suite must exit non-zero with the broken mapper');
  assert.ok(fail >= 5, `expected at least 5 failures, got ${fail}`);
  for (const name of ['entity linking across two sources', 'idempotent', 'CDC on SQLite']) assert.match(r.stdout, new RegExp('✖ [^\\n]*' + name));
});
