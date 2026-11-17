import { producerOpts } from './config.js';
// KafkaPublisher: StreamGraph side of the event-driven mode. Exposes send(batch) with the same signature as the in-process
// ingest receive(), so the StreamGraph adapter, local StreamProducers and the §6 ingest endpoint publish through it unchanged.
//
//   * idempotent + transactional producer (acks=all, max.in.flight=1, enable.idempotence) - broker de-duplicates retries
//   * every batch = one transaction: change events -> graph.changes, latest state per (source,id) -> graph.state (compacted)
//   * keys: node.* by node id; link.* by fromId (sticky per link id, so later removes stay on the same partition);
//           heartbeat by "hb:<sourceId>"; snapshot markers by "snap:<sourceId>"
//   * snapshot markers (replace-source) are EXPANDED here into explicit removes, because a replace-source snapshot spans
//     partitions and no single consumer partition could evaluate it; the markers are still published (mode merge, expanded)
//   * every event validated against the versioned JSON Schema; invalid -> graph.dlq with reason (stage "produce")
//   * eventIds are re-minted as "<eventId>~<publisherRun>" (except stable command ids), so a restarted local producer that
//     reuses "<producer>:<seq>" ids cannot be swallowed by a consumer's restored eventId window
import { SCHEMA_VERSION, validateEvent, validateState, headers, parseJson } from './contracts.js';
import { runId, stateKey, readTopicToEnd } from './util.js';

export class KafkaPublisher {
  constructor({ kafka, cfg, instanceId = 'local', log = () => {}, conflictPolicy = 'field-merge-lww' }) {
    Object.assign(this, { kafka, cfg, instanceId, log });
    this.mergeFields = String(conflictPolicy).startsWith('field-merge');
    this.run = runId();
    this.state = new Map();      // "<sourceId>|<id>" -> { kind, deleted }   (rebuilt from graph.state)
    this.linkFrom = new Map();   // link id -> fromId (sticky partition key)
    this.snap = new Map();       // sourceId -> { id, seen:Set } while a replace-source snapshot is open
    this.seen = new Map();       // original eventId -> ts  (publisher-side idempotency for resent batches)
    this.chain = Promise.resolve();
    this.metrics = { batches: 0, events: 0, published: 0, rejected: 0, expandedRemoves: 0, duplicates: 0, txAborts: 0 };
  }
  async start() {
    const t = this.cfg.topics;
    let n = 0;
    await readTopicToEnd(this.kafka, t.state, m => {
      const r = parseJson(m.value); if (!r.ok || !validateState(r.value).ok) return;
      const s = r.value; n++;
      this.state.set(stateKey(s.sourceId, s.id), { kind: s.event?.op?.split('.')[0] || 'node', deleted: s.deleted, event: s.event });
      if (s.event?.op === 'link.upsert' && s.event.payload?.fromId) this.linkFrom.set(s.id, s.event.payload.fromId);
    }, { groupPrefix: `${this.cfg.clientId}-pub-bootstrap` });
    this.producer = this.kafka.producer(producerOpts({ transactionalId: `${this.cfg.clientId}-${this.instanceId}-publisher`, transactionTimeout: 30000 }));
    this.plain = this.kafka.producer(producerOpts()); // DLQ + commands (no transaction needed)
    await this.producer.connect(); await this.plain.connect();
    this.log(`[kafka] publisher ready (run ${this.run}, ${n} state records)`);
    return this;
  }
  key(e) {
    const p = e.payload || {};
    if (e.op === 'node.upsert' || e.op === 'node.remove') return p.id;
    if (e.op === 'link.upsert') { if (!this.linkFrom.has(p.id) && p.fromId) this.linkFrom.set(p.id, p.fromId); return this.linkFrom.get(p.id) ?? p.fromId ?? p.id; }
    if (e.op === 'link.remove') return this.linkFrom.get(p.id) ?? p.fromId ?? p.id;
    if (e.op === 'heartbeat') return `hb:${e.sourceId}`;
    return `snap:${e.sourceId}`;
  }
  /**
   * Turn a §6 batch into Kafka messages (pure apart from snapshot/key bookkeeping). Used by send() and by the command worker,
   * which commits the same messages together with its consumer offsets.
   */
  prepare(batch, { stableIds = false } = {}) {
    const t = this.cfg.topics, now = Date.now(), changes = [], state = [], dlq = [];
    const ack = { batchId: batch.batchId, status: 'ok', accepted: 0, rejected: 0, duplicates: 0, lastAppliedSeq: 0, errors: [] };
    const out = [];
    const emit = (e, origId) => {
      const v = validateEvent(e);
      if (!v.ok) { dlq.push(this.dlqMessage('produce', v.reason, e, { batchId: batch.batchId, eventId: origId })); ack.rejected++; ack.errors.push({ eventId: origId, code: 'schema', message: v.reason }); return; }
      out.push(e);
    };
    for (const raw of batch.events || []) {
      ack.lastAppliedSeq = Math.max(ack.lastAppliedSeq, Number(raw?.seq) || 0);
      if (!stableIds && raw?.eventId && this.seen.has(raw.eventId)) { ack.duplicates++; this.metrics.duplicates++; continue; }
      const e = { schemaVersion: SCHEMA_VERSION, eventId: stableIds ? raw?.eventId : `${raw?.eventId}~${this.run}`, op: raw?.op, sourceId: batch.sourceId ?? raw?.sourceId, seq: raw?.seq,
        ...(batch.partition != null ? { partition: batch.partition } : {}), eventTime: raw?.eventTime ?? new Date(now).toISOString(), ...(raw?.ingestTime ? { ingestTime: raw.ingestTime } : {}),
        ...(raw?.partial ? { partial: true } : {}), payload: raw?.payload };
      if (raw?.sourceId && raw.sourceId !== batch.sourceId) { const reason = `event sourceId ${raw.sourceId} != batch sourceId ${batch.sourceId}`; dlq.push(this.dlqMessage('produce', reason, e, { batchId: batch.batchId, eventId: raw.eventId })); ack.rejected++; ack.errors.push({ eventId: raw.eventId, code: 'source_mismatch', message: reason }); continue; }
      if (e.op === 'snapshot.marker' && e.payload?.phase === 'begin' && (e.payload.mode || 'replace-source') === 'replace-source') { this.snap.set(e.sourceId, { id: e.payload.snapshotId, seen: new Set() }); emit({ ...e, payload: { ...e.payload, mode: 'merge', expanded: true } }, raw.eventId); continue; }
      if (e.op === 'snapshot.marker' && e.payload?.phase === 'end' && this.snap.get(e.sourceId)?.id === e.payload.snapshotId) {
        const sn = this.snap.get(e.sourceId); this.snap.delete(e.sourceId);
        const drop = [];
        for (const [k, s] of this.state) if (!s.deleted && k.startsWith(e.sourceId + '|') && !sn.seen.has(k.slice(e.sourceId.length + 1))) drop.push([k.slice(e.sourceId.length + 1), s.kind]);
        drop.sort((a, b) => (a[1] === b[1] ? 0 : a[1] === 'link' ? -1 : 1)); // links before nodes
        for (const [id, kind] of drop) { emit({ ...e, eventId: `${e.eventId}:rm:${id}`, op: `${kind}.remove`, payload: { id } }, raw.eventId); this.metrics.expandedRemoves++; }
        emit({ ...e, payload: { ...e.payload, expanded: true } }, raw.eventId);
        continue;
      }
      if (e.op?.endsWith('.upsert') && e.payload?.id) this.snap.get(e.sourceId)?.seen.add(e.payload.id);
      emit(e, raw?.eventId);
    }
    for (const e of out) {
      const key = this.key(e);
      if (e.op === 'link.remove' && this.linkFrom.has(e.payload.id)) e.payload = { ...e.payload, fromId: this.linkFrom.get(e.payload.id) };
      changes.push({ key, value: JSON.stringify(e), headers: { ...headers(e.op), 'x-produced-at': String(now) } });
      if (/\.(upsert|remove)$/.test(e.op)) {
        const sk = stateKey(e.sourceId, e.payload.id), prev = this.state.get(sk), deleted = e.op.endsWith('.remove');
        // partial upserts are folded into the previous state event so graph.state always holds a full item
        let ev = e;
        // full upserts are folded too when the read model merges fields (conflictPolicy field-merge-*), so a bootstrap from
        // graph.state reproduces the same item as replaying graph.changes
        if ((e.partial || this.mergeFields) && e.op.endsWith('.upsert') && prev?.event && !prev.deleted && prev.event.op === e.op) ev = { ...prev.event, eventId: e.eventId, eventTime: e.eventTime, payload: { ...prev.event.payload, ...e.payload, properties: { ...(prev.event.payload.properties || {}), ...(e.payload.properties || {}) } } };
        const rec = { schemaVersion: SCHEMA_VERSION, id: e.payload.id, sourceId: e.sourceId, deleted, event: ev, change: { eventId: e.eventId, producedAt: now } };
        this.state.set(sk, { kind: e.op.split('.')[0], deleted, event: ev });
        state.push({ key: sk, value: JSON.stringify(rec), headers: headers('state-record') });
      }
      ack.accepted++;
    }
    if (ack.rejected) ack.status = ack.accepted ? 'partial' : 'rejected';
    const topicMessages = [];
    if (changes.length) topicMessages.push({ topic: t.changes, messages: changes });
    if (state.length) topicMessages.push({ topic: t.state, messages: state });
    return { topicMessages, dlq, ack, ids: (batch.events || []).map(e => e?.eventId).filter(Boolean) };
  }
  dlqMessage(stage, reason, value, extra = {}) {
    return { key: extra.eventId || null, value: JSON.stringify({ stage, reason, at: new Date().toISOString(), instance: this.instanceId, ...extra, value }), headers: { 'content-type': 'application/json', 'x-dlq-reason': String(reason).slice(0, 500), 'x-dlq-stage': stage } };
  }
  /** §6-compatible send: resolves to an ack after the transaction is committed (published, not yet applied). */
  send(batch) {
    const job = this.chain.then(() => this.#send(batch));
    this.chain = job.catch(() => {});
    return job;
  }
  async #send(batch) {
    const { topicMessages, dlq, ack, ids } = this.prepare(batch);
    this.metrics.batches++; this.metrics.events += (batch.events || []).length; this.metrics.rejected += ack.rejected;
    if (topicMessages.length) {
      let tx;
      try {
        tx = await this.producer.transaction();
        await tx.sendBatch({ topicMessages, acks: -1 });
        await tx.commit();
      } catch (e) {
        this.metrics.txAborts++;
        await tx?.abort().catch(() => {});
        // A new topic can answer NOT_LEADER_FOR_PARTITION for a moment after creation. Retry; do not fail the batch.
        return { batchId: batch.batchId, status: 'retry', retryAfterMs: 400, error: { message: e.message } };
      }
      this.metrics.published += ack.accepted;
    }
    if (dlq.length) {
      for (let i = 0; ; i++) {
        try { await this.plain.send({ topic: this.cfg.topics.dlq, messages: dlq, acks: -1 }); break; }
        catch (e) {
          if (i >= 8 || !/leader|not available|coordinator|rebalance|UNKNOWN_TOPIC/i.test(String(e?.message || e))) throw e;
          await new Promise(r => setTimeout(r, 400 * (i + 1)));
        }
      }
    }
    const now = Date.now(); for (const id of ids) this.seen.set(id, now);
    if (this.seen.size > 200000) for (const k of [...this.seen.keys()].slice(0, 50000)) this.seen.delete(k);
    return ack;
  }
  /** Publish raw bytes (tests / tooling: proves consume-side validation). */
  async sendRaw(topic, messages) { await this.plain.send({ topic, messages, acks: -1 }); }
  async close() { await this.chain; await this.producer?.disconnect(); await this.plain?.disconnect(); }
}
