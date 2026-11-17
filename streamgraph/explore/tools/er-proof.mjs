// Runs the entity-resolution suites (in-process + Kafka) twice and writes:
//   proof/er-test-run.txt        correct implementation, Splink engine (must PASS)
//   proof/er-test-run-duke.txt   correct implementation, Duke engine (informational: Duke misses the E1 precision bar)
//   proof/er-wrong-impl-run.txt  ER_IMPL=wrong: name/e-mail shortcut matcher, no un-merge, random ids, fake explanations (must FAIL)
// Exit code 0 only if the Splink run passes and the wrong run fails.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)), dir = new URL('../../proof/', import.meta.url); mkdirSync(dir, { recursive: true });
const et = () => new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET';
const clean = s => s.split('\n').filter(l => !/TimeoutNegativeWarning|Timeout duration was set|--trace-warnings/.test(l)).join('\n');
const files = ['explore/test/er.test.js', 'explore/test/er-kafka.test.js'];
const runs = [['er-test-run.txt', 'Entity resolution suites, correct implementation, Splink 5.0.0 (must PASS)', { ER_ENGINE: 'splink' }, files],
  ['er-test-run-duke.txt', 'Entity resolution suite, correct implementation, Duke 1.2 engine (informational)', { ER_ENGINE: 'duke' }, files.slice(0, 1)],
  ['er-wrong-impl-run.txt', 'Entity resolution suites with ER_IMPL=wrong: matches on same family name or same e-mail, never un-merges, random entity ids, explanation without prior - must FAIL', { ER_IMPL: 'wrong' }, files]];
const codes = [];
for (const [file, title, env, fs] of runs) {
  const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-force-exit', ...fs], { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 900000 });
  codes.push(r.status);
  const summary = (r.stdout.match(/^ℹ (tests|pass|fail|skipped) \d+$/gm) || []).join(', ');
  writeFileSync(new URL(file, dir), `# ${title}\n# date: ${et()}\n# exit code: ${r.status}  (${summary})\n\n${clean(r.stdout)}\n${clean(r.stderr)}`);
  console.log(`${file}: exit ${r.status} ${summary}`);
}
process.exit(codes[0] === 0 && codes[2] !== 0 ? 0 : 1);
