// B-01: run the spec suite against the DELIBERATELY WRONG implementation and save the run.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// strip node:test's own context variable so the child runs as a normal top-level test run
const childEnv = () => { const e = { ...process.env, JSONLD_FROM_SCHEMA_IMPL: 'broken' }; delete e.NODE_TEST_CONTEXT; return e; };
export function runBroken() {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', fileURLToPath(new URL('./spec.test.js', import.meta.url))], { env: childEnv(), encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const num = k => Number((new RegExp(`ℹ ${k} (\\d+)`).exec(out) || [])[1] || NaN);
  const failed = [...out.matchAll(/^✖ ((?:[A-Z]+-\d+b?) [^\n(]*)/gm)].map(m => m[1].trim());
  const uniq = [...new Set(failed)];
  const summary = `JSONLD_FROM_SCHEMA_IMPL=broken (no format coercion, arrays always @list, unsorted keys, required ignored in SHACL)\nexit ${r.status}; tests ${num('tests')}, pass ${num('pass')}, fail ${num('fail')}\nfailed:\n${uniq.map(x => '  ' + x).join('\n')}\n`;
  const outFile = new URL('../test-output/broken-run.txt', import.meta.url);
  mkdirSync(dirname(fileURLToPath(outFile)), { recursive: true });
  writeFileSync(outFile, summary);
  return { status: r.status, fail: num('fail'), pass: num('pass'), failed: uniq, summary };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const r = runBroken(); process.stdout.write(r.summary); }
