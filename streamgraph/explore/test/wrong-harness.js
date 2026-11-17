// Runs SPEC tests 7, 13, 15, 28 in a child process with IMPLEMENTATION=wrong (§13.3).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const SUBSET = [['model.test.js', 'T7'], ['permissions.test.js', 'T13'], ['stream.test.js', 'T15'], ['layout.test.js', 'T28']];
export function runWrong() {
  const files = SUBSET.map(([f]) => fileURLToPath(new URL(`./${f}`, import.meta.url)));
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT')), IMPLEMENTATION: 'wrong' };
  return spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-name-pattern=^T(7|13|15|28) ', ...files], { env, encoding: 'utf8' });
}
// MCP client: the real mapping tests M8-M10 run with MCP_MAPPING=wrong (name as id + reversed link direction); they MUST fail.
export const MAPPING_SUBSET = ['M8', 'M9', 'M10'];
export function runWrongMapping() {
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT')), MCP_MAPPING: 'wrong' };
  return spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-timeout=30000', '--test-name-pattern=^M(8|9|10) ', fileURLToPath(new URL('./mcp.test.js', import.meta.url))], { env, encoding: 'utf8' });
}
// Saved views (SPEC §19.6): the real view tests run with VIEWS_IMPL=wrong (state dropped on save, rename duplicates, access leak).
export const VIEWS_SUBSET = ['V1', 'V2', 'V3', 'V6', 'V7'];
export function runWrongViews() {
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT')), VIEWS_IMPL: 'wrong' };
  return spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-force-exit', fileURLToPath(new URL('./views.test.js', import.meta.url))], { env, encoding: 'utf8' });
}
// Symbols (SPEC §20.7): the real symbol tests run with SYMBOLS_IMPL=wrong (status ignored, dashed frame dropped, badge-blind cache key).
export const SYMBOLS_SUBSET = ['S1', 'S2', 'S5'];
export function runWrongSymbols() {
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT')), SYMBOLS_IMPL: 'wrong' };
  return spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-force-exit', fileURLToPath(new URL('./icons.test.js', import.meta.url))], { env, encoding: 'utf8' });
}
