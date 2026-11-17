// Runs the Kafka suite against the REAL broker twice and writes:
//   proof/kafka-test-run.txt        correct implementation (must PASS)
//   proof/kafka-wrong-impl-run.txt  KAFKA_IMPL=wrong: mis-keying publisher + offset-ignoring, double-applying consumer (must FAIL)
// Exit code 0 only if the right run passes and the wrong run fails.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)), dir = new URL('../../proof/', import.meta.url); mkdirSync(dir, { recursive: true });
const et = () => new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET';
const clean = s => s.split('\n').filter(l => !/TimeoutNegativeWarning|Timeout duration was set|--trace-warnings/.test(l)).join('\n');
const runs = [['kafka-test-run.txt', 'Kafka suite, correct implementation (must PASS)', {}], ['kafka-wrong-impl-run.txt', 'Kafka suite with KAFKA_IMPL=wrong: WrongPublisher (random keys) + WrongConsumer (ignores checkpoint/committed offsets, replays from the beginning with local seq) - must FAIL', { KAFKA_IMPL: 'wrong' }]];
const codes = [];
for (const [file, title, env] of runs) {
  const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-force-exit', 'explore/test/kafka.test.js'], { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 900000 });
  codes.push(r.status);
  writeFileSync(new URL(file, dir), `# ${title}\n# broker: ${process.env.KAFKA_BROKERS || 'localhost:9092'} (real Apache Kafka)\n# date: ${et()}\n# exit code: ${r.status}\n\n${clean(r.stdout)}\n${clean(r.stderr)}`);
  console.log(`${file}: exit ${r.status}`);
}
process.exit(codes[0] === 0 && codes[1] !== 0 ? 0 : 1);
