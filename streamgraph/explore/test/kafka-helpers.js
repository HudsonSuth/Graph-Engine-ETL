// Helpers for the Kafka-mode suite. Tests run against a REAL broker (KAFKA_BROKERS, default localhost:9092);
// when none is reachable the suite is skipped (it never falls back to a mock).
import { connect as netConnect } from 'node:net';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createExplore, loadConfig } from '../server/app.js';
import { makeKafka, kafkaConfig } from '../kafka/config.js';
import { readTopicToEnd } from '../kafka/util.js';

export const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
export async function brokerUp() {
  if (process.env.KAFKA_TESTS === '0') return false;
  const [host, port] = BROKERS[0].split(':');
  return new Promise(r => { const s = netConnect({ host, port: Number(port) }); s.setTimeout(1500); s.on('connect', () => { s.destroy(); r(true); }); s.on('error', () => r(false)); s.on('timeout', () => { s.destroy(); r(false); }); });
}
let n = 0;
/** A fresh, isolated topic/group namespace per test. */
export function space(tag = 't') {
  const id = `kt-${tag}-${Date.now().toString(36)}${(n++).toString(36)}`;
  return {
    id, dir: mkdtempSync(join(tmpdir(), `${id}-`)),
    kafka: { brokers: BROKERS, clientId: id, partitions: 3, logLevel: 'nothing', checkpointEveryMs: 300,
      topics: { changes: `${id}.changes`, state: `${id}.state`, commands: `${id}.commands`, results: `${id}.results`, dlq: `${id}.dlq` },
      groups: { viewPrefix: `${id}-view`, workers: `${id}-workers`, results: `${id}-results` } },
  };
}
const base = loadConfig('/nonexistent/explore.config.json');
/** Start one Explore instance in kafka mode inside namespace `sp`. */
export function instance(sp, instanceId, { kafka = {}, mcp = {}, streams = ['ext'] } = {}) {
  return createExplore({ log: null, config: { ...base, mode: 'kafka', streams, mcp: { ...base.mcp, ...mcp },
    kafka: { ...sp.kafka, instanceId, checkpointDir: sp.dir, ...kafka } } });
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function until(fn, timeoutMs = 30000, every = 50) {
  const end = Date.now() + timeoutMs; let last;
  while (Date.now() < end) { last = await fn(); if (last) return last; await sleep(every); }
  throw new Error(`timed out after ${timeoutMs} ms`);
}
export function admin(sp) { return makeKafka(kafkaConfig(sp.kafka), { instanceId: 'test-admin' }).admin(); }
/** High watermarks of the changes topic as {partition: offset}. */
export async function ends(sp, topic = sp.kafka.topics.changes) {
  const a = admin(sp); await a.connect();
  try { return Object.fromEntries((await a.fetchTopicOffsets(topic)).map(o => [o.partition, Number(o.high ?? o.offset)])); } finally { await a.disconnect(); }
}
/** Wait until an instance's read model has consumed everything currently in the changes topic. */
export async function caughtUp(ex, sp, timeoutMs = 30000) {
  const e = await ends(sp);
  // transaction markers occupy offsets after the last record: position may stop one short of the watermark
  await until(() => Object.entries(e).every(([p, o]) => (ex.kafka.consumer.next[p] ?? 0) >= o - 1), timeoutMs);
  let last = '', stable = 0; // then wait until the position stops moving (a trailing non-transactional record has no marker)
  await until(() => { const cur = JSON.stringify(ex.kafka.consumer.next) + ex.ingest.queued; stable = cur === last ? stable + 1 : 0; last = cur; return stable >= 4; }, timeoutMs, 100);
  await ex.ingest.chain;
}
export async function readAll(sp, topic) {
  const out = [];
  await readTopicToEnd(makeKafka(kafkaConfig(sp.kafka), { instanceId: 'test-reader' }), topic, (m, p) => out.push({ p, offset: Number(m.offset), key: m.key?.toString(), value: m.value?.toString(), headers: m.headers }));
  return out;
}
/** Comparable read-model fingerprint. */
export function fingerprint(ex) {
  return [...ex.service.items.values()].map(i => `${i.id}|${i.deleted}|${i.type}|${JSON.stringify(i.properties)}|${i.fromId ?? ''}>${i.toId ?? ''}`).sort();
}
