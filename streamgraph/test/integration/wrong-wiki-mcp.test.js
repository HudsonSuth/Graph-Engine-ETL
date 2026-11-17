// Proof the W6 suite catches wrong implementations:
//  - WIKI_IMPL=broken: agent (MCP) writes skip the ABAC write check and may stamp human: actors
//  - EXPLORE_ABAC=broken: the existing deliberately wrong access filter (passes everything through)
// Outputs are kept in test-output/ (gitignored), not next to the committed tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { testOutput } from '../test-output.js';
const file = fileURLToPath(new URL('./wiki-mcp.test.js', import.meta.url));
const run = (envOver, out) => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));
  const r = spawnSync(process.execPath, ['--test', '--test-force-exit', '--test-reporter=spec', file], { env: { ...env, ...envOver }, encoding: 'utf8', timeout: 180000 });
  writeFileSync(testOutput(out), r.stdout); return r;
};
test('W6 suite fails when agent writes skip ABAC and may write human: actors (WIKI_IMPL=broken)', () => {
  const r = run({ WIKI_IMPL: 'broken' }, 'broken-wiki-mcp-run.txt');
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /✖ XW4 an agent can never write or verify as a human: actor/);
  assert.match(r.stdout, /✖ XW5 analyst subject: cannot write/);
});
test('W6 suite fails against the broken access filter (EXPLORE_ABAC=broken)', () => {
  const r = run({ EXPLORE_ABAC: 'broken' }, 'broken-wiki-mcp-abac-run.txt');
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /✖ XW5 analyst subject: cannot write, hidden fields stay hidden/);
});
