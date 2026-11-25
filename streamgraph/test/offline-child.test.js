// The wrong-build proofs re-run suites in a child: it must stay offline, and a child timeout must fail as a timeout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { offlineEnv, runSuiteChild } from './offline-child.js';

test('offlineEnv strips SG_TEST_* live flags, provider keys and NODE_TEST_CONTEXT, and keeps the rest', () => {
  const env = offlineEnv({ SG_LLM_ETL_IMPL: 'wrong' }, { PATH: '/bin', SG_TEST_OLLAMA: '1', SG_TEST_OLLAMA_MODEL: 'qwen3:4b', OPENAI_API_KEY: 'sk-x', INFERENCE_API_KEY: 'k', NODE_TEST_CONTEXT: 'child', SG_LLM_IMPL: 'x' });
  assert.deepEqual(env, { PATH: '/bin', SG_LLM_IMPL: 'x', SG_LLM_ETL_IMPL: 'wrong' });
});

test('a child suite that runs out of time fails as a clear timeout, not as "no failures"', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sg-child-'));
  const file = join(dir, 'slow.test.js');
  writeFileSync(file, "import { test } from 'node:test';\ntest('slow', () => new Promise(r => setTimeout(r, 30000)));\n");
  assert.throws(() => runSuiteChild([file], { timeout: 1500 }), /child suite timed out after 1\.5 s/);
});
