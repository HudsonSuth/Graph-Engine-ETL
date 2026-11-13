// Proof the documents tests catch a deliberately wrong source (STREAMGRAPH_DOCS=broken): it drops provenance
// (source_file, source_location, source_row) and ignores files removed from the folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('documents suite fails against the broken (no provenance, ignores removed files) source', () => {
  const file = fileURLToPath(new URL('./documents.test.js', import.meta.url));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', file], { env: { ...env, STREAMGRAPH_DOCS: 'broken' }, encoding: 'utf8' });
  assert.notEqual(r.status, 0, 'suite must fail with the broken source');
  assert.match(r.stdout, /✖ [^\n]*provenance on every row/);
  assert.match(r.stdout, /✖ [^\n]*a removed file takes its document/);
});
