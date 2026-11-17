// Kafka-mode ER worker (SPEC §21.5): consumer of graph.changes, consume-transform-produce in one transaction.
import { KafkaPublisher } from '../kafka/publisher.js';
import { kafkaConfig, makeKafka, producerOpts } from '../kafka/config.js';
import { parseJson } from '../kafka/contracts.js';
import { within } from '../kafka/util.js';

const stable = v => JSON.stringify(v);
const MAX_SEND_BYTES = 400 * 1024; // stay well under the broker's default 1 MB max message (record batch) size

/** split [{topic, messages}] into sendBatch calls of at most ~maxBytes each (same transaction) */
export function chunkTopicMessages(tm, maxBytes = MAX_SEND_BYTES) {
  const out = []; let cur = [], size = 0;
  const add = (topic, m) => { let t = cur.find(x => x.topic === topic); if (!t) cur.push(t = { topic, messages: [] }); t.messages.push(m); };
  for (const { topic, messages } of tm) for (const m of messages) {
    const b = (m.value?.length || 0) + (m.key?.length || 0) + 64;
    if (size && size + b > maxBytes) { out.push(cur); cur = []; size = 0; }
    add(topic, m); size += b;
  }
  if (cur.length) out.push(cur);
  return out;
}

export class ErKafkaWorker {
  constructor({ ex, er, config, log = () => {} }) {
    Object.assign(this, { ex, er, log });
    this.kc = ex.kafka?.config || kafkaConfig(config.kafka || {});
    this.S = er.config.sourceId;
    this.groupId = er.config.kafka.groupId || `${this.kc.clientId}-er`;
    this.items = new Map(); // record id -> merged item (the worker's own view of record nodes)
    this.seq = 0; this.busy = 0; this.waiters = [];
    this.m = { consumed: 0, recordChanges: 0, published: 0, transactions: 0, aborts: 0, bootstrapRecords: 0, bootstrapMs: 0, lastLagMs: null, rebalances: 0 };
    this.assigned = [];
    this.lock = Promise.resolve(); // one transaction (and one engine.apply) at a time: kafkajs may run eachBatch concurrently
  }
  #serial(fn) { const run = this.lock.then(fn, fn); this.lock = run.catch(() => {}); return run; }
  async start() {
    const t0 = performance.now();
    this.kafka = makeKafka(this.kc, { instanceId: 'er-worker' });
    // fixed instance id => fixed transactional id "<clientId>-er-publisher": a second worker fences this one (singleton)
    this.pub = await new KafkaPublisher({ kafka: this.kafka, cfg: this.kc, instanceId: 'er', log: this.log, conflictPolicy: 'field-merge-lww' }).start();
    // bootstrap from the compacted graph.state (already read by the publisher): records, previous assignment, published items
    const assignment = new Map(), published = new Map(), recs = [];
    for (const [k, s] of this.pub.state) {
      if (s.deleted || !s.event?.payload) continue;
      const sourceId = k.slice(0, k.indexOf('|')), p = s.event.payload;
      if (sourceId === this.S) {
        published.set(p.id, stable(p));
        if (s.event.op === 'link.upsert' && p.type === this.er.config.resolvesType) assignment.set(p.fromId, p.toId);
      } else if (s.event.op === 'node.upsert' && this.er.engine.isRecordType(p.type)) recs.push(this.#merge(sourceId, p, false));
    }
    this.er.engine.seed({ assignment, published });
    if (recs.length) { const r = await this.er.engine.apply(recs.map(item => ({ op: 'upsert', item }))); await this.publishOutOfBand(r.events); }
    this.m.bootstrapRecords = recs.length; this.m.bootstrapMs = Math.round(performance.now() - t0);
    this.consumer = this.kafka.consumer({ groupId: this.groupId, sessionTimeout: 10000, heartbeatInterval: 1000, maxWaitTimeInMs: 50, readUncommitted: false, retry: { retries: 10 } });
    const joined = new Promise(r => this.consumer.on(this.consumer.events.GROUP_JOIN, e => { this.assigned = e.payload.memberAssignment?.[this.kc.topics.changes] || []; r(); }));
    this.consumer.on(this.consumer.events.REBALANCING, () => this.m.rebalances++);
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.kc.topics.changes, fromBeginning: true });
    await this.consumer.run({ autoCommit: false, eachBatchAutoResolve: false, eachBatch: b => this.onBatch(b) });
    await within(joined, 20000);
    this.log(`[er] kafka worker in group ${this.groupId} (bootstrap ${recs.length} records, ${assignment.size} assignments, ${this.m.bootstrapMs} ms)`);
    return this;
  }
  #merge(sourceId, p, partial) {
    const old = this.items.get(p.id);
    const sources = p.sources?.length ? p.sources : [{ sourceId, nativeId: p.id }];
    const it = old && (partial || true) ? { ...old, ...p, kind: 'node', properties: { ...old.properties, ...(p.properties || {}) }, sources: [...new Map([...old.sources, ...sources].map(s => [s.sourceId, s])).values()] }
      : { kind: 'node', ...p, properties: p.properties || {}, sources };
    if (!it.type) it.type = old?.type;
    this.items.set(p.id, it);
    return it;
  }
  onBatch(b) { this.busy++; return this.#serial(() => this.#onBatch(b)).finally(() => { this.busy--; if (!this.busy) { const w = this.waiters; this.waiters = []; w.forEach(f => f()); } }); }
  async #onBatch({ batch, resolveOffset, heartbeat, isRunning, isStale }) {
    if (!batch.messages.length || !isRunning() || isStale()) return;
    try {
      const changes = [];
      let newest = 0;
      for (const msg of batch.messages) {
        this.m.consumed++;
        const r = parseJson(msg.value || Buffer.alloc(0)); if (!r.ok) continue;
        const e = r.value; if (!e || e.sourceId === this.S || !e.payload?.id) continue;
        newest = Math.max(newest, Number(msg.headers?.['x-produced-at']?.toString() || 0));
        if (e.op === 'node.upsert') {
          const it = this.#merge(e.sourceId, e.payload, !!e.partial);
          if (this.er.engine.isRecordType(it.type) || this.er.engine.records.has(it.id)) changes.push({ op: 'upsert', item: it });
        } else if (e.op === 'node.remove' && (this.items.has(e.payload.id) || this.er.engine.records.has(e.payload.id))) { this.items.delete(e.payload.id); changes.push({ op: 'remove', id: e.payload.id }); }
      }
      this.m.recordChanges += changes.length;
      const last = batch.messages.at(-1).offset;
      const out = changes.length ? (await this.er.engine.apply(changes)).events : [];
      if (changes.length && await this.er.maybeTrain()) out.push(...(await this.er.engine.reindex()).events);
      await heartbeat();
      await this.#commit(out, { topic: batch.topic, partition: batch.partition, offset: last });
      resolveOffset(last);
      if (newest) this.m.lastLagMs = Date.now() - newest;
    } finally {}
  }
  /** derived events (+ the consumed offset, if any) in one transaction; on failure nothing is visible and kafkajs retries */
  async #commit(events, at) {
    const eventTime = new Date().toISOString();
    const evs = events.map((e, i) => ({ ...e, eventId: at ? `er:${at.topic}:${at.partition}:${at.offset}:${i}` : `er:oob:${Date.now()}:${this.seq + 1}:${i}`, seq: ++this.seq, eventTime }));
    const prep = evs.length ? this.pub.prepare({ batchId: at ? `er:${at.partition}@${at.offset}` : `er:oob:${this.seq}`, sourceId: this.S, partition: 0, events: evs }, { stableIds: true }) : { topicMessages: [], dlq: [] };
    const tm = [...prep.topicMessages]; if (prep.dlq.length) tm.push({ topic: this.kc.topics.dlq, messages: prep.dlq });
    for (let attempt = 0; ; attempt++) {
      const tx = await this.pub.producer.transaction();
      try {
        for (const part of chunkTopicMessages(tm)) await tx.sendBatch({ topicMessages: part, acks: -1 });
        if (at) await tx.sendOffsets({ consumerGroupId: this.groupId, topics: [{ topic: at.topic, partitions: [{ partition: at.partition, offset: String(Number(at.offset) + 1) }] }] });
        await tx.commit();
        this.m.transactions++; this.m.published += evs.length;
        return;
      } catch (e) {
        this.m.aborts++; this.m.lastError = String(e?.message || e).slice(0, 300);
        await tx.abort().catch(() => {});
        // CONCURRENT_TRANSACTIONS: the broker is still finishing the previous commit's markers - retriable, back off and redo
        const concurrent = e?.type === 'CONCURRENT_TRANSACTIONS' || /concurrent operation on the same transaction/i.test(this.m.lastError);
        if (concurrent && attempt < 8) { this.m.concurrentRetries = (this.m.concurrentRetries || 0) + 1; await new Promise(r => setTimeout(r, 20 * 2 ** attempt)); if (!this.pub.producer.isActive?.() && attempt > 2) await this.#resetProducer(); continue; }
        this.log(`[er] transaction aborted: ${this.m.lastError}`);
        this.er.engine.forget(events.map(x => x.payload.id)); // re-emitted on the retry
        await this.#resetProducer(); // a failed send leaves the idempotent sequence broken: re-init (bumps the epoch)
        throw e;
      }
    }
  }
  async #resetProducer() {
    await this.pub.producer.disconnect().catch(() => {});
    this.pub.producer = this.kafka.producer(producerOpts({ transactionalId: `${this.kc.clientId}-er-publisher`, transactionTimeout: 30000 }));
    await this.pub.producer.connect();
  }
  publishOutOfBand(events) { return events.length ? this.#serial(() => this.#commit(events, null)) : Promise.resolve(); }
  idle() { return this.busy ? new Promise(r => this.waiters.push(r)) : Promise.resolve(); }
  stats() { return { groupId: this.groupId, assigned: this.assigned, ...this.m }; }
  async close({ crash = false } = {}) { await this.consumer?.disconnect().catch(() => {}); if (!crash) await this.pub?.close().catch(() => {}); else await this.pub?.producer?.disconnect().catch(() => {}); }
}
