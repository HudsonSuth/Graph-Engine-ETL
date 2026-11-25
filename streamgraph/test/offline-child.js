// Helpers for the wrong-build proofs (test/wrong-*.test.js), which re-run a suite in a child process.
// The child must stay offline, so the opt-in live flags are stripped: every SG_TEST_* variable (SG_TEST_OLLAMA=1 turns on
// the live Ollama tests) and the provider keys that turn on the paid-provider smokes. A child that runs out of time
// fails as a timeout instead of looking like a run with no failures.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

export const LIVE_KEYS = ['INFERENCE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'XAI_API_KEY'];
const isLive = k => k === 'NODE_TEST_CONTEXT' || /^SG_TEST_/.test(k) || LIVE_KEYS.includes(k);

/** process.env without the live-test flags and keys (and without NODE_TEST_CONTEXT), plus `extra`. */
export function offlineEnv(extra = {}, from = process.env) {
  return { ...Object.fromEntries(Object.entries(from).filter(([k]) => !isLive(k))), ...extra };
}

/** Run `node --test ...args` with an offline env (output saved to logFile first); fails clearly when the child times out or is killed. */
export function runSuiteChild(args, { env = {}, timeout = 240000, logFile } = {}) {
  const r = spawnSync(process.execPath, ['--test', '--test-force-exit', '--test-reporter=spec', ...args], { env: offlineEnv(env), encoding: 'utf8', timeout });
  const out = (r.stdout || '') + (r.stderr || '');
  if (logFile) writeFileSync(logFile, out);
  if (r.error?.code === 'ETIMEDOUT' || (r.status == null && r.signal)) {
    assert.fail(`the child suite timed out after ${timeout / 1000} s (${r.error?.code || r.signal}) before it reported its results; ` +
      `the last output was:\n${out.slice(-2000)}`);
  }
  if (r.error) throw r.error;
  return { ...r, out };
}
