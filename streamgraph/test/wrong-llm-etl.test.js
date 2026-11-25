// Proof the L2 suite catches a deliberately wrong implementation (SG_LLM_ETL_IMPL=wrong, see src/llm/etl.js): prompts
// are not masked, the remote-model export check is skipped, no provenance is written, and failures pass records through.
// The wrong run's output is kept in test-output/wrong-llm-etl-run.txt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { testOutput } from './test-output.js';
import { runSuiteChild } from './offline-child.js';
test('LLM-in-ETL suite fails against the wrong implementation', () => {
  const file = fileURLToPath(new URL('./llm-etl.test.js', import.meta.url));
  const r = runSuiteChild(['--test-concurrency=1', file], { env: { SG_LLM_ETL_IMPL: 'wrong' }, logFile: testOutput('wrong-llm-etl-run.txt') });
  assert.notEqual(r.status, 0, 'suite must fail with the wrong implementation');
  for (const name of ['A2.2 provenance', 'A2.3 ABAC: a field the subject may not see is masked', 'A2.3 + D5/D9 a remote model needs export', 'A2.3 fail closed', 'A2.4 a per-record failure'])
    assert.match(r.stdout, new RegExp('✖ ' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), name);
  const fails = Number(/ℹ fail (\d+)/.exec(r.stdout)?.[1] || 0);
  assert.ok(fails >= 8, `expected at least 8 failing tests, got ${fails}`);
});
