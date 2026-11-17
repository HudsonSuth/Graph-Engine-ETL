// Kafka-mode benchmark (SPEC §17): 10k nodes / 20k links + 200-event deltas through a REAL broker.
//   publish: StreamProducer -> KafkaPublisher (idempotent, transactional: graph.changes + graph.state per batch)
//   apply:   view consumer group -> schema validation -> ingest (seq = offset+1) -> read model; checkpoint+commit every 1 s
// Latency = header x-produced-at (stamped when the publisher builds the transaction) -> event applied to the read model.
// Round latency = first push of a 200-event delta -> last of its events applied (includes producer linger + transaction).
// Usage: KAFKA_BROKERS=localhost:9092 node explore/bench/kafka-bench.mjs [nodes=10000] [links=20000] [rounds=30] -> proof/kafka-bench.txt
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import os from 'node:os';
import { join } from 'node:path';
import { createExplore, loadConfig } from '../server/app.js';
import { makeKafka, kafkaConfig } from '../kafka/config.js';
import { pct } from '../kafka/util.js';

const [N = 10000, M = 20000, ROUNDS = 30] = process.argv.slice(2).map(Number);
const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const lines = []; const out = s => { lines.push(s); console.log(s); };
const f = x => (x == null ? '-' : Number(x).toFixed(1));
const id = `kbench-${Date.now().toString(36)}`, dir = mkdtempSync(join(tmpdir(), `${id}-`));
const kcfg = { brokers: BROKERS, clientId: id, partitions: 6, logLevel: 'nothing', checkpointEveryMs: 1000,
  topics: { changes: `${id}.changes`, state: `${id}.state`, commands: `${id}.commands`, results: `${id}.results`, dlq: `${id}.dlq` },
  groups: { viewPrefix: `${id}-view`, workers: `${id}-workers`, results: `${id}-results` } };
const base = loadConfig('/nonexistent-explore-config.json');
const mk = (inst, k = {}) => createExplore({ log: null, config: { ...base, mode: 'kafka', streams: ['ext'], kafka: { ...kcfg, instanceId: inst, checkpointDir: dir, ...k } } });
const admin = makeKafka(kafkaConfig(kcfg), { instanceId: 'bench-admin' }).admin(); await admin.connect();
const ends = async () => Object.fromEntries((await admin.fetchTopicOffsets(kcfg.topics.changes)).map(o => [o.partition, Number(o.high ?? o.offset)]));
async function caughtUp(ex) {
  const e = await ends();
  while (!Object.entries(e).every(([p, o]) => (ex.kafka.consumer.next[p] ?? 0) >= o - 1)) await new Promise(r => setTimeout(r, 2));
  await ex.ingest.chain;
}

out(`# Explore Kafka-mode benchmark  ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
out(`# node ${process.version}, ${os.cpus()[0]?.model} x${os.cpus().length}, ${Math.round(os.totalmem() / 2 ** 30)} GB, ${os.platform()}`);
out(`# broker: REAL Apache Kafka at ${BROKERS.join(',')} (single node KRaft, same host), topics with ${kcfg.partitions} partitions, RF 1`);

// in-process baseline (same contract path, no broker)
const ip = await createExplore({ log: null, config: base });
const ipr = await ip.synthetic(N, M); await ip.close();
out(`\n## Baseline in-process mode: ${N} nodes / ${M} links: ${f(ipr.ms)} ms (${Math.round((N + M) / (ipr.ms / 1000))} events/s)`);

const A = await mk('a');
out(`\n## Bulk: ${N} nodes / ${M} links -> graph.changes -> view consumer -> read model`);
let t0 = performance.now();
const syn = await A.synthetic(N, M);       // resolves when every batch's transaction is committed
const tPub = performance.now() - t0;
await caughtUp(A);
const tAll = performance.now() - t0;
const lat1 = pct(A.kafka.consumer.latencies, [50, 95, 99]);
out(`published+committed: ${f(tPub)} ms  (${Math.round((N + M) / (tPub / 1000))} events/s, ${A.kafka.publisher.metrics.batches} transactions)`);
out(`applied in read model: ${f(tAll)} ms end-to-end  (${Math.round((N + M) / (tAll / 1000))} events/s)  counts=${JSON.stringify(A.service.counts())}`);
out(`per-event produce->applied latency (bulk, includes queueing behind the backlog): p50 ${lat1.p50} ms  p95 ${lat1.p95} ms  p99 ${lat1.p99} ms`);

out(`\n## Deltas: ${ROUNDS} rounds x 200 events (120 node updates, 60 new links, 20 removes of earlier links)`);
A.kafka.consumer.latencies = [];
const p = A.producer('synthetic'), round = [];
let li = 0;
for (let r = 0; r < ROUNDS; r++) {
  const s = performance.now();
  for (let i = 0; i < 120; i++) p.push('node.upsert', { id: `syn:node:${(r * 997 + i * 31) % N}`, type: 'Person', label: `upd ${r}`, properties: { round: r, score: i } });
  for (let i = 0; i < 60; i++) p.push('link.upsert', { id: `delta:link:${li++}`, type: 'KNOWS', fromId: `syn:node:${(r * 13 + i * 7) % N}`, toId: `syn:node:${(r * 17 + i * 11 + 1) % N}`, properties: { r } });
  for (let i = 0; i < 20; i++) p.push('link.remove', { id: `syn:link:${r * 20 + i}` });
  await p.flush(); await caughtUp(A);
  round.push(performance.now() - s);
}
const lat2 = pct(A.kafka.consumer.latencies, [50, 95, 99]), rp = pct(round, [50, 95, 99]);
out(`round (push -> all 200 applied): p50 ${rp.p50} ms  p95 ${rp.p95} ms  p99 ${rp.p99} ms  -> ${Math.round(200 / (rp.p50 / 1000))} events/s at p50`);
out(`per-event produce->applied latency (deltas): p50 ${lat2.p50} ms  p95 ${lat2.p95} ms  p99 ${lat2.p99} ms`);

await A.kafka.consumer.checkpoint({ force: true });
out(`\n## Recovery`);
t0 = performance.now();
const B = await mk('b', { publish: false });
await caughtUp(B);
const tBoot = performance.now() - t0;
out(`new instance, no checkpoint: bootstrap ${B.kafka.consumer.metrics.bootstrapRecords} keys from compacted ${kcfg.topics.state} + tail of changes: ${f(tBoot)} ms (start incl. group join)`);
const live = ex => [...ex.service.items.values()].filter(i => !i.deleted).map(i => `${i.id}|${JSON.stringify(i.properties)}|${i.fromId ?? ''}>${i.toId ?? ''}`).sort().join('\n');
const same = live(A) === live(B);
if (!same) { const a = live(A).split('\n'), b = new Set(live(B).split('\n')); const d = a.filter(x => !b.has(x)); console.error('DIFF', d.length, d.slice(0, 3)); const bb = live(B).split('\n'), aa = new Set(a); console.error('B-only', bb.filter(x => !aa.has(x)).slice(0, 3)); }
out(`live graph identical to instance a: ${same}  (a=${JSON.stringify(A.service.counts())} b=${JSON.stringify(B.service.counts())}; bootstrap does not materialise tombstones)`);
await B.close();
t0 = performance.now();
const B2 = await mk('b', { publish: false }); await caughtUp(B2);
out(`restart of the same instance from its checkpoint (${B2.kafka.consumer.metrics.restoredFrom ? 'restored' : 'NOT restored'}): ${f(performance.now() - t0)} ms, events re-applied: ${B2.kafka.consumer.metrics.applied}`);
await B2.close(); await A.close(); await admin.disconnect();
out(`\nnotes: single-host broker (no network RTT, RF 1); every publish is a transaction (exactly-once across changes+state);`);
out(`the view consumer validates every event against JSON Schema before applying; checkpoint (full read model JSON) every 1 s.`);
mkdirSync(new URL('../../proof/', import.meta.url), { recursive: true });
writeFileSync(new URL('../../proof/kafka-bench.txt', import.meta.url), lines.join('\n') + '\n');
process.exit(0);
