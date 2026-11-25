// Proof the L4/L5 suite catches a build that skips the k-NN write, the export check on retrieved
// text, combined retrieval, the agent half of validateFlow, the human check, and checkpoint persistence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { testOutput } from './test-output.js';
import { runSuiteChild } from './offline-child.js';

test('L4/L5 suite fails against the broken implementation', () => {
  const file = fileURLToPath(new URL('./l45.test.js', import.meta.url));
  const r = runSuiteChild([file], { env: { STREAMGRAPH_L45: 'broken' }, logFile: testOutput('wrong-l45-run.txt') });
  assert.notEqual(r.status, 0, 'suite must fail with the broken implementation');
  const names = [
    'k-NN sink stores the embed vector and a query returns that node',
    'without the k-NN plugin the same vectors are still stored and ranked',
    'vector search falls back to the graph when OpenSearch is down',
    'combined retrieval returns graph and vector hits together',
    'a remote model does not receive a retrieved type it cannot export',
    'validateFlow rejects an agent model node that sets a key',
    'only a recognised human can promote an unverified node',
    'an approval survives a new process loading the same checkpoint file',
    'a paused agent thread is still pending after the process restarts',
  ];
  const out = r.stdout || r.out || '';
  for (const name of names) assert.match(out, new RegExp('✖ ' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), name);
  const fails = Number(/ℹ fail (\d+)/.exec(out)?.[1] || 0);
  assert.ok(fails >= 6, `expected at least 6 failing tests, got ${fails}\n${out.slice(-1500)}`);
});
