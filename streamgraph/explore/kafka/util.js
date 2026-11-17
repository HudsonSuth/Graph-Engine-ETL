// Small helpers shared by the Kafka publisher, view consumer and command worker.
import { randomUUID } from 'node:crypto';
export const runId = () => randomUUID().slice(0, 8);
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const hdr = (h, k) => (h?.[k] == null ? undefined : Buffer.isBuffer(h[k]) ? h[k].toString('utf8') : String(h[k]));
export const stateKey = (sourceId, id) => `${sourceId}|${id}`;
/** Contract partition label for a Kafka topic partition (SPEC §6 `partition`). seq = Kafka offset + 1. */
export const partLabel = (topic, p) => `kafka:${topic}:${p}`;

/**
 * Read a (compacted) topic from the beginning up to the high watermarks observed at call time.
 * Uses a throw-away consumer group that is deleted afterwards.
 */
export async function readTopicToEnd(kafka, topic, onMessage, { groupPrefix = 'explore-bootstrap' } = {}) {
  const admin = kafka.admin(); await admin.connect();
  const groupId = `${groupPrefix}-${runId()}`;
  try {
    const ends = await admin.fetchTopicOffsets(topic); // [{partition, offset(high), low}]
    const want = new Map(ends.filter(e => Number(e.high ?? e.offset) > Number(e.low)).map(e => [e.partition, Number(e.high ?? e.offset)]));
    if (!want.size) return 0;
    const consumer = kafka.consumer({ groupId, sessionTimeout: 10000, heartbeatInterval: 1000, maxWaitTimeInMs: 150, retry: { retries: 10 } });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });
    let n = 0;
    // Transactional topics carry commit markers, so the last data offset can be < high watermark - 1.
    // Done when every partition reached its watermark, or two consecutive fetches return nothing new.
    await new Promise((resolve, reject) => {
      const pending = new Set(want.keys()); let idle = 0, got = false, done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      consumer.on(consumer.events.FETCH, () => { if (!got) idle++; else idle = 0; got = false; if (idle >= 3) finish(); });
      consumer.run({ autoCommit: false, eachBatch: async ({ batch }) => {
        if (batch.messages.length) got = true;
        for (const m of batch.messages) if (Number(m.offset) < want.get(batch.partition)) { await onMessage(m, batch.partition); n++; }
        const last = batch.messages.length ? Number(batch.messages.at(-1).offset) + 1 : 0;
        if (last >= want.get(batch.partition)) pending.delete(batch.partition);
        if (!pending.size) finish();
      } }).catch(reject);
    });
    await consumer.disconnect();
    return n;
  } finally {
    await admin.deleteGroups([groupId]).catch(() => {});
    await admin.disconnect();
  }
}

/** Percentiles of a numeric array. */
export function pct(arr, ps = [50, 95, 99]) {
  if (!arr.length) return Object.fromEntries(ps.map(p => [`p${p}`, null]));
  const s = Float64Array.from(arr).sort();
  return Object.fromEntries(ps.map(p => [`p${p}`, +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(2)]));
}
/** Resolve when `p` settles or after ms (the timer is cleared, so it never keeps the process alive). */
export function within(p, ms) { let t; return Promise.race([p, new Promise(r => { t = setTimeout(r, ms); t.unref?.(); })]).finally(() => clearTimeout(t)); }
