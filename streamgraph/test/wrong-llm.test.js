// Proof the LLM harness suite catches a deliberately wrong implementation (SG_LLM_IMPL=wrong, see src/llm/wrong.js):
// the Model Bridge leaks keys in errors, the probe is skipped and claims everything, a fresh install seeds a remote
// model, and an unreachable default is not reported. The wrong run's output is kept in test-output/wrong-llm-run.txt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { testOutput } from './test-output.js';
import { runSuiteChild } from './offline-child.js';
test('LLM harness suite fails against the wrong implementation', () => {
  const file = fileURLToPath(new URL('./llm.test.js', import.meta.url));
  const r = runSuiteChild([file], { env: { SG_LLM_IMPL: 'wrong' }, logFile: testOutput('wrong-llm-run.txt') });
  assert.notEqual(r.status, 0, 'suite must fail with the wrong implementation');
  for (const name of ['A0.3 fresh install', 'A1.1 + A1.10 conformance', 'A1.3 weak model', 'A1.4 + A1.10 a key never appears', 'A1.6 a bad key returns auth_error', 'A1.4 the Model Bridge itself never returns', 'A1.13 default model'])
    assert.match(r.stdout, new RegExp('✖ ' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), name);
  const fails = Number(/ℹ fail (\d+)/.exec(r.stdout)?.[1] || 0);
  assert.ok(fails >= 6, `expected at least 6 failing tests, got ${fails}`);
});
