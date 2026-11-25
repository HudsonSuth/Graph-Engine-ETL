// Proof the agent suite catches the pre-fix behaviour (STREAMGRAPH_AGENTS=broken): fixed node name "model",
// retrieval after the model, a branch path that names a missing node, a new checkpointer per call, stops retried,
// and routes that skip agents.enabled, ABAC and the resume token check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { testOutput } from './test-output.js';
import { runSuiteChild } from './offline-child.js';

test('agent suite fails against the broken implementation', () => {
  const files = ['agent-compiler.test.js', 'agent-routes.test.js'].map(f => fileURLToPath(new URL(`./${f}`, import.meta.url)));
  const r = runSuiteChild(files, { env: { STREAMGRAPH_AGENTS: 'broken' }, logFile: testOutput('wrong-agents-run.txt') });
  assert.notEqual(r.status, 0, 'suite must fail with the broken implementation');
  const names = [
    'a node id other than model compiles and runs',
    'retrieval reaches the model before it answers',
    'branch without a retrieve node compiles and runs',
    'approval interrupts and resume continues on the shared checkpointer',
    'stop errors are not retried',
    'agents stay off until agents.enabled is set',
    'approve pauses, pending lists the thread, and resume finishes it',
    'cancel aborts a running agent',
    'resume checks the agent token',
  ];
  for (const name of names) assert.match(r.stdout, new RegExp('✖ ' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), name);
  const fails = Number(/ℹ fail (\d+)/.exec(r.stdout)?.[1] || 0);
  assert.ok(fails >= 6, `expected at least 6 failing tests, got ${fails}\n${r.stdout.slice(-1500)}`);
});
