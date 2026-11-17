// Flink processor benchmark (SPEC §18) on the REAL local broker + REAL Flink MiniCluster.
//   1) backlog throughput: N events already in graph.changes, fresh job -> time until all N are enriched (committed)
//   2) end-to-end latency graph.changes -> graph.metrics (node.metrics visible to a read_committed reader), steady load,
//      exactly-once (checkpoint 1000 ms / 250 ms) and at-least-once
//   3) crash recovery: kill -9 under load, restart from checkpoint: restart time, catch-up time, duplicates
// Usage: node explore/bench/flink-bench.mjs [N=100000] [rate=2000]
import { fspace, startProcessor, producer, events, send, sleep, until, T0 } from '../test/flink-helpers.js';
import { randomUUID } from 'node:crypto';
import { cpus, totalmem } from 'node:os';
const N = Number(process.argv[2] || 100000), RATE = Number(process.argv[3] || 2000);
const pct = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };
const log = (...a) => console.log(...a);

async function counter(sp, topic, onMsg) {
  const c = sp.kafka.consumer({ groupId: `${sp.id}-bench-${randomUUID().slice(0, 6)}`, readUncommitted: false, maxWaitTimeInMs: 50, maxBytes: 50 << 20 });
  await c.connect(); await c.subscribe({ topic, fromBeginning: true });
  const st = { n: 0, ids: new Set(), close: () => c.disconnect() };
  await c.run({ autoCommit: false, partitionsConsumedConcurrently: 6, eachBatch: async ({ batch }) => { for (const m of batch.messages) { st.n++; onMsg?.(m, st); } } });
  return st;
}
const linkEv = (ev, i, nodes, t) => ev('link.upsert', { id: `L${i}`, type: 'K', fromId: `n${i % nodes}`, toId: `n${(i * 7919 + 13) % nodes}` }, t);

async function backlog() {
  const sp = fspace('bench-tp', { windowMs: 60000, slidingMs: 300000, slideMs: 60000, checkpointMs: 1000, emitEveryMs: 200, idleMs: 2000, heap: '1g' });
  const { ensureProcessorTopics } = await import('../flink/config.js');
  await ensureProcessorTopics(sp.kafka, sp.c, { partitions: 6 });
  const pr = await producer(sp), ev = events(sp), nodes = Math.round(N / 10);
  const t0 = performance.now();
  for (let i = 0; i < N; i += 2000) { const m = []; for (let j = i; j < Math.min(N, i + 2000); j++) m.push(j < nodes ? ev('node.upsert', { id: `n${j}`, type: 'T' }, T0 + j) : linkEv(ev, j, nodes, T0 + j)); await send(pr, sp, m); }
  log(`backlog: produced ${N} events (${nodes} nodes, ${N - nodes} links) in ${Math.round(performance.now() - t0)} ms`);
  const enr = await counter(sp, sp.c.topics.enriched);
  const s0 = performance.now(); const p = await startProcessor(sp); const s1 = performance.now();
  await until(() => enr.n >= N, 600000, 100);
  const s2 = performance.now();
  const r = { events: N, jvmStartMs: Math.round(s1 - s0), processMs: Math.round(s2 - s1), throughput: Math.round(N / ((s2 - s1) / 1000)), throughputInclStart: Math.round(N / ((s2 - s0) / 1000)) };
  log(`backlog throughput: ${r.throughput} events/s committed to graph.enriched (${r.processMs} ms after job start; JVM+job start ${r.jvmStartMs} ms; ${r.throughputInclStart} ev/s incl. start)`);
  await enr.close(); await pr.disconnect(); await p.stop();
  return r;
}

async function latency(label, proc, seconds = 20) {
  const sp = fspace('bench-lat', { windowMs: 60000, slidingMs: 300000, slideMs: 60000, idleMs: 2000, heap: '1g', ...proc });
  const p = await startProcessor(sp), pr = await producer(sp), ev = events(sp), nodes = 5000;
  const lat = []; let phaseStart = Infinity;
  const met = await counter(sp, sp.c.topics.metrics, m => { const v = JSON.parse(m.value); if (v.kind === 'node.metrics' && v.sourceProducedAt >= phaseStart) lat.push(Date.now() - v.sourceProducedAt); });
  // warm-up 3 s
  let i = 0; const tick = 50, perTick = Math.round(RATE * tick / 1000);
  const run = async ms => { const end = Date.now() + ms; while (Date.now() < end) { const t = Date.now(), m = []; for (let k = 0; k < perTick; k++, i++) m.push(linkEv(ev, i, nodes, t)); await send(pr, sp, m); const d = tick - (Date.now() - t); if (d > 0) await sleep(d); } };
  await run(3000); phaseStart = Date.now(); const sentBefore = i; await run(seconds * 1000); const sent = i - sentBefore;
  await sleep(3000);
  const r = { label, sentEvents: sent, rate: Math.round(sent / seconds), samples: lat.length, p50: pct(lat, 50), p95: pct(lat, 95), p99: pct(lat, 99), max: Math.max(...lat) };
  log(`latency [${label}]: ${r.rate} ev/s offered, ${r.samples} node.metrics samples, p50 ${r.p50} ms, p95 ${r.p95} ms, p99 ${r.p99} ms, max ${r.max} ms`);
  await met.close(); await pr.disconnect(); await p.stop();
  return r;
}

async function recovery() {
  const sp = fspace('bench-rec', { windowMs: 60000, slidingMs: 300000, slideMs: 60000, checkpointMs: 1000, idleMs: 2000, heap: '1g' });
  let p = await startProcessor(sp); const pr = await producer(sp), ev = events(sp), nodes = 5000;
  const enr = await counter(sp, sp.c.topics.enriched, (m, st) => st.ids.add(JSON.parse(m.value).eventId));
  let i = 0, stop = false, lastOut = 0;
  const feeder = (async () => { while (!stop) { const t = Date.now(), m = []; for (let k = 0; k < 100; k++, i++) m.push(linkEv(ev, i, nodes, t)); await send(pr, sp, m); await sleep(50); } })(); // 2000 ev/s
  await sleep(8000);
  const tKill = performance.now(); await p.stop({ kill: true }); const nAtKill = enr.n;
  const tRestart = performance.now(); p = await startProcessor(sp); const tStarted = performance.now();
  await until(() => enr.n > nAtKill, 120000, 20); const tFirst = performance.now();
  await sleep(5000); stop = true; await feeder; const total = i;
  await until(() => enr.ids.size >= total, 120000, 100).catch(() => {}); const tDone = performance.now();
  await sleep(2000);
  const r = { sent: total, enrichedRecords: enr.n, unique: enr.ids.size, duplicates: enr.n - enr.ids.size, missing: total - enr.ids.size, restoredFrom: !!p.info.restoredFrom,
    restartToRunningMs: Math.round(tStarted - tRestart), killToFirstNewOutputMs: Math.round(tFirst - tKill) };
  log(`recovery: kill -9 under 2000 ev/s; restart (JVM + restore) ${r.restartToRunningMs} ms; first new committed output ${r.killToFirstNewOutputMs} ms after the kill; ${r.sent} sent, ${r.unique} unique enriched, ${r.duplicates} duplicates, ${r.missing} missing (read_committed); restored from checkpoint: ${r.restoredFrom}`);
  await enr.close(); await pr.disconnect(); await p.stop();
  return r;
}

log(`# Flink processor benchmark - ${new Date().toISOString()} - ${cpus().length} vCPU, ${Math.round(totalmem() / 2 ** 30)} GiB RAM, Kafka 4.1.2 (1 broker, KRaft), Flink 2.2.1 MiniCluster, parallelism 2`);
const out = { backlog: await backlog() };
out.latencyEos1000 = await latency('exactly-once, checkpoint 1000 ms', { delivery: 'exactly-once', checkpointMs: 1000, emitEveryMs: 200 });
out.latencyEos250 = await latency('exactly-once, checkpoint 250 ms', { delivery: 'exactly-once', checkpointMs: 250, emitEveryMs: 50 });
out.latencyAlo = await latency('at-least-once, emit 50 ms', { delivery: 'at-least-once', checkpointMs: 1000, emitEveryMs: 50 });
out.recovery = await recovery();
console.log(JSON.stringify(out));
process.exit(0);
