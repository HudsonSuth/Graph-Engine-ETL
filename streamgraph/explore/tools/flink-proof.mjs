// Runs the Flink processor suite (real broker + real Flink) twice and writes:
//   proof/flink-test-run.txt        correct pipeline (must PASS)
//   proof/flink-wrong-impl-run.txt  FLINK_IMPL=wrong: no dedupe, every link upsert counted as new, processing-time windows,
//                                   at-least-once sink (must FAIL)
// Exit code 0 only if the right run passes and the wrong run fails.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)), dir = new URL('../../proof/', import.meta.url); mkdirSync(dir, { recursive: true });
const et = () => new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET';
const clean = s => s.split('\n').filter(l => !/TimeoutNegativeWarning|Timeout duration was set|--trace-warnings/.test(l)).join('\n');
const runs = [['flink-test-run.txt', 'Flink processor suite, correct pipeline (must PASS)', {}],
  ['flink-wrong-impl-run.txt', 'Flink processor suite with FLINK_IMPL=wrong: no eventId dedupe, every link upsert counted as a new link, processing-time windows, at-least-once sink - must FAIL', { FLINK_IMPL: 'wrong' }]];
const codes = [];
for (const [file, title, env] of runs) {
  const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-force-exit', 'explore/test/flink.test.js'], { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 1200000 });
  codes.push(r.status);
  writeFileSync(new URL(file, dir), `# ${title}\n# broker: ${process.env.KAFKA_BROKERS || 'localhost:9092'} (real Apache Kafka 4.1.2), Apache Flink 2.2.1 (local MiniCluster JVM)\n# date: ${et()}\n# exit code: ${r.status}\n\n${clean(r.stdout)}\n${clean(r.stderr)}`);
  console.log(`${file}: exit ${r.status}`);
}
process.exit(codes[0] === 0 && codes[1] !== 0 ? 0 : 1);
