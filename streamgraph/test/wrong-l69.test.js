// Proof the L6–L9 suite catches a build that exports prompts and marks a failed eval as a pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { testOutput } from './test-output.js';
import { runSuiteChild } from './offline-child.js';

test('L6-L9 suite fails against the broken implementation', () => {
  const file = fileURLToPath(new URL('./l69.test.js', import.meta.url));
  const r = runSuiteChild([file], { env: { STREAMGRAPH_L69: 'broken' }, logFile: testOutput('wrong-l69-run.txt') });
  assert.notEqual(r.status, 0, 'suite must fail with the broken implementation');
  const names = [
    'local traces leave the prompt out of the file',
    'hosted tracing stays off unless langsmith is enabled',
    'hosted tracing respects the export gate',
    'a hosted trace sends metadata only',
    'eval scorer fails a case that misses the expected text',
  ];
  for (const name of names) assert.match(r.stdout, new RegExp('✖ ' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), name);
  const fails = Number(/ℹ fail (\d+)/.exec(r.stdout)?.[1] || 0);
  assert.ok(fails >= 5, `expected at least 5 failing tests, got ${fails}\n${r.stdout.slice(-1500)}`);
});
