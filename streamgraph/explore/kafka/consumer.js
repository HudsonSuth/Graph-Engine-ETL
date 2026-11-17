// KafkaGraphConsumer: Explore's read model as a Kafka consumer group member.
//
//   * group id: one group PER VIEW INSTANCE ("<viewPrefix>-<instanceId>") - every instance must see every partition to build
//     a full read model. A shared group would split partitions between instances (that is the worker pattern, see commands.js);
//     if this consumer is ever assigned only part of the topic it reports status "partial-assignment".
//   * mapping to the SPEC §6 contract: partition = "kafka:<topic>:<p>", seq = offset + 1 (ingest seqMode "monotonic").
//     Per-(sourceId, partition) seq tracking in ingest makes redelivered offsets no-ops; the eventId window catches duplicate
//     publications (same event at a different offset).
//   * offsets: autoCommit OFF. A checkpoint file (read model + ingest cursors + change-feed tail + next offsets) is written
//     atomically first, then the same offsets are committed to the group. On restart the checkpoint is restored and the group
//     is re-pointed at it (admin.setOffsets), so nothing is applied twice and nothing is skipped. Offsets below the restored
//     position that are redelivered anyway (rebalance, setOffsets refused) are skipped locally.
//   * no checkpoint: bootstrap from the compacted graph.state topic, then consume graph.changes from the earliest retained
//     offset, skipping, per (sourceId,id), every change up to and including the one the state record was built from.
//   * invalid messages (bad JSON, schema violation, unknown version) -> graph.dlq with reason (stage "consume"); offset advances.
//   * rebalance: on REBALANCING a checkpoint+commit is forced; on GROUP_JOIN the assignment is checked.
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { validateEvent, parseJson, validateState } from './contracts.js';
import { within, partLabel, stateKey, readTopicToEnd, hdr, pct, runId } from './util.js';

export class KafkaGraphConsumer {
  constructor({ kafka, cfg, ex, instanceId, groupId, checkpointFile, log = () => {}, dlqProducer = null, bootstrap = 'state' }) {
    Object.assign(this, { kafka, cfg, ex, instanceId, groupId, checkpointFile, log, dlqProducer, bootstrap });
    this.topic = cfg.topics.changes;
    this.next = {};            // partition -> next offset to apply (the read model's position)
    this.skip = new Map();     // bootstrap: "<sourceId>|<id>" -> eventId already reflected by graph.state
    this.bootHW = null;        // partition -> high watermark when bootstrap ran (skip map is dropped once passed)
    this.assigned = []; this.status = 'starting'; this.dirty = false;
    this.latencies = []; this.maxLatencies = 200000;
    this.metrics = { messages: 0, applied: 0, duplicates: 0, skippedBootstrap: 0, skippedCheckpoint: 0, dlq: 0, checkpoints: 0, commits: 0, rebalances: 0, restoredFrom: null, bootstrapRecords: 0 };
    this.waiters = [];
  }

  async start() {
    const { ex } = this;
    const cp = this.loadCheckpoint();
    if (cp) {
      ex.service.importState(cp.service); ex.ingest.importState(cp.ingest); ex.feed?.importState(cp.feed);
      this.next = cp.offsets || {}; this.skip = new Map(cp.skip || []); this.bootHW = cp.bootHW || null;
      this.metrics.restoredFrom = { file: this.checkpointFile, at: cp.at, offsets: this.next };
      this.log(`[kafka] view ${this.groupId}: restored checkpoint ${cp.at} offsets ${JSON.stringify(this.next)}`);
    } else if (this.bootstrap === 'state') await this.bootstrapFromState();
    await this.alignGroupOffsets(!!cp);
    // A topic that has just elected a leader answers NOT_LEADER for a short while. Retry longer than the default burst.
    this.consumer = this.kafka.consumer({ groupId: this.groupId, sessionTimeout: 15000, heartbeatInterval: 1500, maxWaitTimeInMs: 50, retry: { retries: 20, initialRetryTime: 300, maxRetryTime: 5000 } });
    const E = this.consumer.events;
    this.joined = new Promise(r => { this._joined = r; });
    this.consumer.on(E.GROUP_JOIN, e => {
      this.assigned = e.payload.memberAssignment?.[this.topic] || [];
      this.partitions ??= null;
      this.status = this.partitions && this.assigned.length < this.partitions ? 'partial-assignment' : 'live';
      if (this.status === 'partial-assignment') this.log(`[kafka] WARNING view group ${this.groupId} got partitions ${this.assigned} of ${this.partitions}: another member shares this group id; the read model is incomplete. Give each view instance its own instanceId.`);
      this._joined();
    });
    this.consumer.on(E.REBALANCING, () => { this.metrics.rebalances++; this.checkpoint().catch(() => {}); });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: true });
    await this.consumer.run({ autoCommit: false, partitionsConsumedConcurrently: 1, eachBatchAutoResolve: false, eachBatch: b => this.onBatch(b) });
    this.timer = setInterval(() => this.checkpoint().catch(e => this.log(`[kafka] checkpoint failed: ${e.message}`)), this.cfg.checkpointEveryMs || 1000);
    this.timer.unref?.();
    await within(this.joined, 15000);
    return this;
  }

  /** Point the group's committed offsets at the read model position (or earliest when we start empty). */
  async alignGroupOffsets(fromCheckpoint) {
    const admin = this.kafka.admin(); await admin.connect();
    try {
      const offs = await admin.fetchTopicOffsets(this.topic);
      this.partitions = offs.length;
      const partitions = offs.map(o => ({ partition: o.partition, offset: String(Math.max(Number(o.low), this.next[o.partition] ?? 0)) }));
      if (!fromCheckpoint) for (const o of offs) this.next[o.partition] ??= 0;
      await admin.setOffsets({ groupId: this.groupId, topic: this.topic, partitions }).catch(e => this.log(`[kafka] setOffsets for ${this.groupId} refused (${e.message}); local skip keeps the position`));
    } finally { await admin.disconnect(); }
  }

  async bootstrapFromState() {
    const admin = this.kafka.admin(); await admin.connect();
    try { this.bootHW = Object.fromEntries((await admin.fetchTopicOffsets(this.topic)).map(o => [o.partition, Number(o.high ?? o.offset)])); } finally { await admin.disconnect(); }
    const recs = [];
    await readTopicToEnd(this.kafka, this.cfg.topics.state, m => {
      const r = parseJson(m.value); if (!r.ok) return;
      const v = validateState(r.value); if (!v.ok) return;
      recs.push(r.value);
    }, { groupPrefix: `${this.groupId}-bootstrap` });
    const latest = new Map(); for (const s of recs) latest.set(stateKey(s.sourceId, s.id), s); // compaction may not have run yet
    const bySource = new Map();
    for (const [k, s] of latest) {
      this.skip.set(k, s.change.eventId);
      if (s.deleted || !s.event) continue;
      if (!bySource.has(s.sourceId)) bySource.set(s.sourceId, []);
      bySource.get(s.sourceId).push(s.event);
    }
    const label = `kafka:${this.cfg.topics.state}`;
    for (const [sourceId, evs] of bySource) {
      evs.sort((a, b) => (a.op === b.op ? 0 : a.op === 'node.upsert' ? -1 : 1));
      let seq = 0;
      for (let i = 0; i < evs.length; i += 1000) {
        const events = evs.slice(i, i + 1000).map(e => ({ ...e, partial: false, seq: ++seq }));
        await this.ex.receive({ batchId: `${label}:${sourceId}:${i}`, sourceId, partition: label, seqMode: 'monotonic', events: events.map(({ partial, ...e }) => e) });
      }
    }
    this.metrics.bootstrapRecords = latest.size;
    this.dirty = true;
    this.log(`[kafka] view ${this.groupId}: bootstrapped ${latest.size} keys from ${this.cfg.topics.state}`);
  }

  async onBatch({ batch, resolveOffset, heartbeat, isRunning, isStale }) {
    const p = batch.partition, label = partLabel(this.topic, p);
    let run = null;
    const flush = async () => {
      if (!run) return;
      const r = run; run = null;
      for (;;) {
        const ack = await this.ex.receive({ batchId: `${label}@${r.first}`, sourceId: r.sourceId, partition: label, seqMode: 'monotonic', events: r.events });
        if (ack.status === 'retry') { await new Promise(res => setTimeout(res, ack.retryAfterMs || 50)); continue; }
        this.metrics.applied += ack.accepted; this.metrics.duplicates += ack.duplicates || 0;
        break;
      }
      const now = Date.now();
      for (const t of r.at) if (t && this.latencies.length < this.maxLatencies) this.latencies.push(now - t);
      this.next[p] = r.last + 1; this.dirty = true;
      resolveOffset(String(r.last));
    };
    for (const m of batch.messages) {
      if (!isRunning() || isStale()) break;
      const off = Number(m.offset);
      this.metrics.messages++;
      if (off < (this.next[p] ?? 0)) { this.metrics.skippedCheckpoint++; resolveOffset(m.offset); continue; }
      const parsed = parseJson(m.value || Buffer.alloc(0));
      const v = parsed.ok ? validateEvent(parsed.value) : parsed;
      if (!v.ok) {
        await flush();
        await this.toDlq(v.reason, m, p);
        this.next[p] = off + 1; this.dirty = true; resolveOffset(m.offset); continue;
      }
      const e = this.mapEvent(parsed.value, off, p);
      if (this.skip.size && e.payload?.id && /\.(upsert|remove)$/.test(e.op)) {
        const k = stateKey(e.sourceId, e.payload.id), want = this.skip.get(k);
        if (want !== undefined) {
          if (want === e.eventId) this.skip.delete(k);
          this.metrics.skippedBootstrap++;
          await flush(); this.next[p] = off + 1; this.dirty = true; resolveOffset(m.offset); continue;
        }
      }
      if (run && run.sourceId !== e.sourceId) await flush();
      run ??= { sourceId: e.sourceId, events: [], at: [], first: off, last: off };
      run.events.push(e); run.at.push(Number(hdr(m.headers, 'x-produced-at')) || 0); run.last = off;
      if (run.events.length >= 500) { await flush(); await heartbeat(); }
    }
    await flush();
    if (this.bootHW && this.skip.size && Object.entries(this.bootHW).every(([q, hw]) => (this.next[q] ?? 0) >= hw)) { this.skip.clear(); this.bootHW = null; }
    await heartbeat();
    this.wake();
  }
  /** Contract event for ingest: seq = offset + 1 (monotonic per Kafka partition). */
  mapEvent(e, off) { const { schemaVersion, partition, ...rest } = e; return { ...rest, seq: off + 1 }; }

  async toDlq(reason, m, p) {
    this.metrics.dlq++;
    const value = JSON.stringify({ stage: 'consume', reason, at: new Date().toISOString(), instance: this.instanceId, group: this.groupId, topic: this.topic, partition: p, offset: m.offset,
      key: m.key?.toString('utf8') ?? null, raw: m.value ? m.value.toString('utf8').slice(0, 100000) : null });
    await this.dlqProducer.send({ topic: this.cfg.topics.dlq, messages: [{ key: m.key, value, headers: { 'x-dlq-reason': String(reason).slice(0, 500), 'x-dlq-stage': 'consume' } }], acks: -1 });
  }

  loadCheckpoint() {
    if (!this.checkpointFile || !existsSync(this.checkpointFile)) return null;
    try { const cp = JSON.parse(readFileSync(this.checkpointFile, 'utf8')); return cp.v === 1 && cp.topic === this.topic ? cp : null; } catch (e) { this.log(`[kafka] checkpoint unreadable (${e.message}); bootstrapping`); return null; }
  }
  /** Write the checkpoint (atomic rename), then commit the same offsets. The file is the authority on restart. */
  async checkpoint({ force = false } = {}) {
    if (this.checkpointing) return this.checkpointing;
    if (!this.dirty && !force) return;
    this.checkpointing = (async () => {
      this.dirty = false;
      await this.ex.ingest.chain; // quiesce: nothing half-applied
      const offsets = { ...this.next };
      const body = JSON.stringify({ v: 1, at: new Date().toISOString(), instanceId: this.instanceId, groupId: this.groupId, topic: this.topic, offsets,
        service: this.ex.service.exportState(), ingest: this.ex.ingest.exportState(), feed: this.ex.feed?.exportState(), skip: [...this.skip], bootHW: this.bootHW });
      if (this.checkpointFile) {
        mkdirSync(dirname(this.checkpointFile), { recursive: true });
        const tmp = `${this.checkpointFile}.${runId()}.tmp`;
        await writeFile(tmp, body); await rename(tmp, this.checkpointFile);
        this.metrics.checkpoints++;
      }
      const mine = Object.entries(offsets).filter(([q]) => this.assigned.includes(Number(q)));
      if (mine.length && this.consumer) {
        await this.consumer.commitOffsets(mine.map(([q, o]) => ({ topic: this.topic, partition: Number(q), offset: String(o) }))).then(() => this.metrics.commits++).catch(() => {}); // a rebalance in progress can refuse; the file still holds the position
      }
    })().finally(() => { this.checkpointing = null; });
    return this.checkpointing;
  }
  /** Read model position, per Kafka partition (next offset). */
  position() { return { ...this.next }; }
  /** Resolves once every partition's position is at or past `target` ({partition: nextOffset}). */
  waitFor(target, timeoutMs = 30000) {
    const ok = () => Object.entries(target).every(([q, o]) => (this.next[q] ?? 0) >= o);
    if (ok()) return Promise.resolve(true);
    return new Promise(res => { const w = { ok, res }; this.waiters.push(w); setTimeout(() => { this.waiters = this.waiters.filter(x => x !== w); res(false); }, timeoutMs).unref?.(); });
  }
  wake() { const keep = []; for (const w of this.waiters) (w.ok() ? w.res(true) : keep.push(w)); this.waiters = keep; }
  stats() { return { groupId: this.groupId, status: this.status, assigned: this.assigned, position: this.position(), ...this.metrics, latencyMs: pct(this.latencies) }; }
  async close({ checkpoint = true } = {}) {
    clearInterval(this.timer);
    if (this.consumer) { if (checkpoint) await this.checkpoint({ force: true }).catch(() => {}); await this.consumer.disconnect().catch(() => {}); }
  }
}
