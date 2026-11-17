// Helpers for the Flink processor suite (SPEC §18). Real broker + real Apache Flink (local MiniCluster JVM); never mocked.
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { makeKafka, kafkaConfig, producerOpts } from '../kafka/config.js';
import { processorConfig, ensureProcessorTopics, flinkHome, JOB_JAR } from '../flink/config.js';
import { FlinkProcessor } from '../flink/runner.js';
import { BROKERS, brokerUp, until, sleep } from './kafka-helpers.js';
export { BROKERS, brokerUp, until, sleep };

export const flinkReady = () => existsSync(join(flinkHome(), 'lib')) && existsSync(JOB_JAR);
export const IMPL = process.env.FLINK_IMPL === 'wrong' ? 'wrong' : 'correct';
export const TEST_PROC = { windowMs: 10000, slidingMs: 20000, slideMs: 10000, spikeThreshold: 5, checkpointMs: 500, emitEveryMs: 100, idleMs: 500, outOfOrdernessMs: 1000, parallelism: 2, heap: '512m' };

let n = 0;
/** isolated namespace: topics, processor id, data dir */
export function fspace(tag = 'f', proc = {}) {
  const id = `ft-${tag}-${Date.now().toString(36)}${(n++).toString(36)}`;
  const kc = kafkaConfig({ brokers: BROKERS, clientId: id, partitions: 3, logLevel: 'nothing', topics: { changes: `${id}.changes`, state: `${id}.state`, commands: `${id}.commands`, results: `${id}.results`, dlq: `${id}.dlq` } });
  const c = processorConfig({ processorId: id, impl: IMPL, ...TEST_PROC, ...proc, topics: { enriched: `${id}.enriched`, metrics: `${id}.metrics`, alerts: `${id}.alerts` } }, kc);
  const kafka = makeKafka(kc, { instanceId: 'test' });
  return { id, kc, c, kafka, dir: mkdtempSync(join(tmpdir(), `${id}-`)) };
}
export async function startProcessor(sp, o = {}) {
  await ensureProcessorTopics(sp.kafka, sp.c, { partitions: 3 });
  const p = new FlinkProcessor(sp.c, { brokers: BROKERS, dataDir: sp.dir });
  await p.start(o);
  return p;
}
/** read_committed collector over all output topics */
export async function collector(sp) {
  const t = sp.c.topics, out = { enriched: [], metrics: [], windows: [], alerts: [], dlq: [], all: [] };
  const consumer = sp.kafka.consumer({ groupId: `${sp.id}-collect-${randomUUID().slice(0, 6)}`, readUncommitted: false, maxWaitTimeInMs: 100 });
  await consumer.connect();
  await consumer.subscribe({ topics: [t.enriched, t.metrics, t.alerts, sp.c.kafkaTopics.dlq], fromBeginning: true });
  await consumer.run({ autoCommit: false, eachMessage: async ({ topic, partition, message: m }) => {
    const r = { topic, key: m.key?.toString(), value: m.value ? JSON.parse(m.value.toString()) : null, headers: Object.fromEntries(Object.entries(m.headers || {}).map(([k, v]) => [k, v?.toString()])), at: Date.now(), partition, offset: Number(m.offset) };
    out.all.push(r);
    if (topic === t.enriched) out.enriched.push(r); else if (topic === t.alerts) out.alerts.push(r); else if (topic === sp.c.kafkaTopics.dlq) out.dlq.push(r);
    else if (r.value?.kind === 'node.window') out.windows.push(r); else out.metrics.push(r);
  } });
  out.close = () => consumer.disconnect();
  /** latest node.metrics per node */
  out.latest = () => { const m = new Map(); for (const r of out.metrics) m.set(r.key, r.value); return m; };
  return out;
}
export async function producer(sp) { const p = sp.kafka.producer(producerOpts()); await p.connect(); return p; }
/** event factory: keys like the publisher (node.* by id, link.* by fromId, heartbeat by hb:<source>) */
export function events(sp, sourceId = 'src') {
  let seq = 0;
  const key = (op, p) => (op.startsWith('node.') ? p.id : op.startsWith('link.') ? p.fromId ?? p.id : `hb:${sourceId}`);
  return (op, payload, t, eventId) => { seq++; return { key: key(op, payload), value: JSON.stringify({ schemaVersion: 1, eventId: eventId ?? `${sp.id}-e${seq}`, op, sourceId, seq, eventTime: new Date(t).toISOString(), payload }), headers: { 'x-produced-at': String(Date.now()) } }; };
}
export const send = (p, sp, messages) => p.send({ topic: sp.c.kafkaTopics.changes, messages, acks: -1 });
/** advance event time: heartbeat far after t (other partitions go idle and stop holding the watermark back) */
export const advance = (p, sp, ev, t) => send(p, sp, [ev('heartbeat', {}, t)]);
export const DAY = 864e5, T0 = Date.UTC(2026, 0, 1);
