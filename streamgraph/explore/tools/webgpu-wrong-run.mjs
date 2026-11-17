// Runs the renderer-selection tests against the DELIBERATELY WRONG selector (Auto always picks WebGPU, even with no
// adapter) and saves the failing run to test/broken-webgpu-select-run.txt. Exit code 0 only if the suite FAILED.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const file = fileURLToPath(new URL('../test/webgpu.test.js', import.meta.url));
const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT')), RENDERER_SELECT_IMPL: 'wrong' };
const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-force-exit', file], { env, encoding: 'utf8' });
const out = `# RENDERER_SELECT_IMPL=wrong node --test explore/test/webgpu.test.js  (${new Date().toISOString()})\n# wrong implementation: explore/shared/renderer-select-wrong.js — Auto always picks WebGPU, ignoring navigator.gpu / adapter\n# exit code: ${r.status} (non-zero = the suite caught it)\n\n${r.stdout}${r.stderr}`;
writeFileSync(fileURLToPath(new URL('../../test/broken-webgpu-select-run.txt', import.meta.url)), out);
console.log(out.split('\n').filter(l => /^(✔|✖|ℹ (pass|fail))|exit code/.test(l)).join('\n'));
process.exit(r.status === 0 ? 1 : 0);
