// Streaming ingest (SPEC §6): batches applied in order, per-(sourceId, partition) seq tracking,
// eventId idempotency window, gap policy, backpressure, snapshots and stub endpoints.
const OPS = new Set(['node.upsert', 'node.remove', 'link.upsert', 'link.remove', 'heartbeat', 'snapshot.marker']);

export class StreamIngest {
  constructor(service, { orderWaitMs = 2000, gapPolicy = 'block', maxQueuedEvents = 20000, eventIdWindow = 100000, eventIdTtlMs = 3600 * 1000,
    autoStub = true, snapshotMode = 'merge', allowedSources = null, maxErrors = 50, derivedWriters = [] } = {}) {
    Object.assign(this, { service, orderWaitMs, gapPolicy, maxQueuedEvents, eventIdWindow, eventIdTtlMs, autoStub, snapshotMode, allowedSources, maxErrors });
    // derived writers (SPEC §21: the entity-resolution stage) may attribute their items to the sources they were derived from,
    // so the read policy of every contributing source applies to the derived item (fail closed). Their own id is always kept.
    this.derivedWriters = new Set(derivedWriters);
    this.streams = new Map();   // `${sourceId}#${partition}` -> state
    this.seen = new Map();      // eventId -> receive time (insertion ordered => sliding window)
    this.chain = Promise.resolve();
    this.paused = false; this.resumeWaiters = [];
    this.queued = 0;
    this.metrics = { batches: 0, applied: 0, duplicates: 0, failed: 0, gaps: 0, holes: 0, retries: 0 };
  }
  #state(sourceId, partition) {
    const k = `${sourceId}#${partition}`;
    let s = this.streams.get(k);
    if (!s) this.streams.set(k, s = { sourceId, partition, lastAppliedSeq: 0, pending: new Map(), gapSince: null, gapTimer: null, status: 'live', lastEventAt: null, snapshot: null });
    return s;
  }
  /** Resume cursor for a producer (§6.7). */
  cursor(sourceId, partition = 0) { const s = this.#state(sourceId, partition); return { sourceId, partition, lastAppliedSeq: s.lastAppliedSeq }; }
  pause() { this.paused = true; }
  resume() { this.paused = false; const w = this.resumeWaiters; this.resumeWaiters = []; w.forEach(f => f()); }

  /** Receive one batch. Resolves with the ack once applied (delayed while paused = backpressure). */
  receive(batch) {
    const n = Array.isArray(batch?.events) ? batch.events.length : 0;
    if (this.queued + n > this.maxQueuedEvents) { this.metrics.retries++; return Promise.resolve({ batchId: batch?.batchId, status: 'retry', retryAfterMs: 50, lastAppliedSeq: this.cursor(batch?.sourceId, batch?.partition || 0).lastAppliedSeq, accepted: 0, skipped: 0, failed: 0 }); }
    this.queued += n;
    const p = this.chain.then(async () => {
      if (this.paused) await new Promise(r => this.resumeWaiters.push(r));
      try { return this.#apply(batch); } finally { this.queued -= n; }
    });
    this.chain = p.catch(() => {});
    return p;
  }

  #apply(batch) {
    this.metrics.batches++;
    const ack = { batchId: batch?.batchId ?? null, status: 'ok', lastAppliedSeq: 0, accepted: 0, skipped: 0, failed: 0, duplicates: 0, buffered: 0, errors: [] };
    const err = (e, code, message) => { ack.failed++; this.metrics.failed++; if (ack.errors.length < this.maxErrors) ack.errors.push({ eventId: e?.eventId ?? null, seq: e?.seq ?? null, code, message }); };
    if (!batch || typeof batch.sourceId !== 'string' || !Array.isArray(batch.events)) { ack.status = 'error'; ack.error = { code: 'invalid', message: 'batch needs sourceId and events[]' }; return ack; }
    if (this.allowedSources && !this.allowedSources.includes(batch.sourceId)) { ack.status = 'error'; ack.error = { code: 'forbidden', message: 'stream not authorized for this sourceId' }; return ack; }
    const st = this.#state(batch.sourceId, batch.partition || 0);
    for (const e of batch.events) {
      if (!e || !Number.isInteger(e.seq) || e.seq < 1) { err(e, 'invalid', 'event needs integer seq >= 1'); continue; }
      if (e.sourceId && e.sourceId !== batch.sourceId) { err(e, 'invalid', 'event sourceId differs from batch'); continue; }
      if (e.seq <= st.lastAppliedSeq || st.pending.has(e.seq)) { ack.duplicates++; ack.skipped++; this.metrics.duplicates++; continue; }
      // seqMode 'monotonic' (Kafka transport): seq = partition offset + 1, ordered by the broker but not contiguous
      if (e.seq > st.lastAppliedSeq + 1 && batch.seqMode !== 'monotonic') { st.pending.set(e.seq, e); ack.buffered++; continue; }
      this.#applyOne(st, e, ack, err);
      this.#drain(st, ack, err);
    }
    if (st.pending.size) this.#gap(st);
    else this.#clearGap(st);
    ack.lastAppliedSeq = st.lastAppliedSeq;
    if (st.status === 'gap') ack.status = 'gap';
    else if (ack.failed) ack.status = 'partial';
    return ack;
  }
  #drain(st, ack, err) { while (st.pending.has(st.lastAppliedSeq + 1)) { const e = st.pending.get(st.lastAppliedSeq + 1); st.pending.delete(e.seq); if (ack.buffered) ack.buffered--; this.#applyOne(st, e, ack, err); } }
  #gap(st) {
    if (st.status !== 'gap') { st.status = 'gap'; st.gapSince = Date.now(); this.metrics.gaps++; this.service.setLag(st.sourceId, { lagMs: 0, status: 'gap' }); }
    if (st.gapTimer) return;
    st.gapTimer = setTimeout(() => {
      st.gapTimer = null;
      if (!st.pending.size) return;
      if (this.gapPolicy === 'skip-forward') {
        this.chain = this.chain.then(() => {
          const ack = { accepted: 0, skipped: 0, failed: 0, duplicates: 0, buffered: 0, errors: [] };
          while (st.pending.size) { const next = Math.min(...st.pending.keys()); this.metrics.holes += next - st.lastAppliedSeq - 1; st.lastAppliedSeq = next - 1; this.#drain(st, ack, () => {}); }
          this.#clearGap(st);
        });
      } // 'block': keep waiting; later events stay buffered and lag status stays 'gap'
    }, this.orderWaitMs);
    st.gapTimer.unref?.();
  }
  #clearGap(st) { if (st.gapTimer) { clearTimeout(st.gapTimer); st.gapTimer = null; } if (st.status === 'gap') { st.status = 'live'; st.gapSince = null; } this.service.setLag(st.sourceId, { lagMs: st.lastEventAt ? Math.max(0, Date.now() - st.lastEventAt) : 0, status: 'live' }); }

  #remember(id) {
    const now = Date.now();
    this.seen.set(id, now);
    if (this.seen.size > this.eventIdWindow) this.seen.delete(this.seen.keys().next().value);
    // drop expired ids from the head
    for (const [k, t] of this.seen) { if (now - t > this.eventIdTtlMs) this.seen.delete(k); else break; }
  }

  #applyOne(st, e, ack, err) {
    st.lastAppliedSeq = e.seq; // a seq is consumed even when its event is invalid, so the stream cannot wedge
    if (typeof e.eventId !== 'string' || !e.eventId) { err(e, 'invalid', 'missing eventId'); return; }
    if (this.seen.has(e.eventId)) { ack.duplicates++; ack.skipped++; this.metrics.duplicates++; return; }
    if (!OPS.has(e.op)) { err(e, 'invalid', `unknown op ${e.op}`); return; }
    this.#remember(e.eventId);
    st.lastEventAt = Date.now();
    const sid = st.sourceId, derived = this.derivedWriters.has(sid), ctx = { writerSources: derived ? null : [sid], defaultSource: sid };
    const p = e.payload || {};
    const own = it => (derived && it.sources?.length && !it.sources.some(s => s.sourceId === sid) ? [{ sourceId: sid, nativeId: it.id }, ...it.sources] : it.sources);
    const withTime = it => ({ ...it, eventTime: it.eventTime || e.eventTime, sources: it.sources?.length ? own(it) : [{ sourceId: sid, nativeId: it.id, fetchedAt: new Date().toISOString() }] });
    let r;
    // a derived writer only ever writes its own namespace ("<sourceId>:..."), never another source's items
    if (derived && /\.upsert$/.test(e.op) && !(typeof p.id === 'string' && p.id.startsWith(`${sid}:`))) { err(e, 'forbidden', `derived writer ${sid} may only write ids starting with ${sid}:`); return; }
    // ...and no other source may write or remove inside a derived writer's namespace (entities are derived, not edited)
    if (!derived && typeof p.id === 'string' && /\.(upsert|remove)$/.test(e.op) && [...this.derivedWriters].some(d => p.id.startsWith(`${d}:`))) { err(e, 'forbidden', `${p.id} belongs to the derived writer ${p.id.split(':')[0]}`); return; }
    if (derived && /\.remove$/.test(e.op) && !(typeof p.id === 'string' && p.id.startsWith(`${sid}:`))) { err(e, 'forbidden', `derived writer ${sid} may only remove ids starting with ${sid}:`); return; }
    switch (e.op) {
      case 'heartbeat': ack.accepted++; this.service.setLag(sid, { lagMs: e.eventTime ? Math.max(0, Date.now() - Date.parse(e.eventTime)) : 0, status: st.status }); return;
      case 'snapshot.marker': this.#snapshot(st, p); ack.accepted++; this.onApplied?.(st, e); return;
      case 'node.upsert': {
        const it = withTime({ ...p, kind: 'node' });
        r = e.partial ? this.#partial(it, ctx) : this.service.upsert(it, ctx);
        if (st.snapshot && r.item) st.snapshot.seen.add(r.item.id);
        break;
      }
      case 'link.upsert': {
        const it = withTime({ ...p, kind: 'link' });
        if (this.autoStub) for (const end of [it.fromId, it.toId]) if (typeof end === 'string' && end && !this.service.live(end))
          this.service.upsert({ id: end, kind: 'node', type: 'Unknown', properties: { stub: true }, sources: it.sources, eventTime: '1970-01-01T00:00:00.000Z' }, ctx);
        r = e.partial ? this.#partial(it, ctx) : this.service.upsert(it, ctx);
        if (st.snapshot && r.item) st.snapshot.seen.add(r.item.id);
        break;
      }
      case 'node.remove': case 'link.remove': r = this.service.remove(p.id, { ...ctx, writerSources: [sid], kind: e.op.split('.')[0] }); break;
    }
    if (r.status === 'rejected' || r.status === 'forbidden') err(e, r.error?.code || r.status, r.error?.message || r.status);
    else { ack.accepted++; this.metrics.applied++; this.onApplied?.(st, e); }
  }
  #partial(it, ctx) {
    const cur = this.service.live(it.id);
    if (!cur) return this.service.upsert(it, ctx);
    return this.service.upsert({ ...cur, ...it, type: it.type ?? cur.type, properties: { ...it.properties }, fromId: it.fromId ?? cur.fromId, toId: it.toId ?? cur.toId }, { ...ctx, policy: 'field-merge-lww' });
  }
  #snapshot(st, p) {
    if (p.phase === 'begin') st.snapshot = { id: p.snapshotId, mode: p.mode || this.snapshotMode, seen: new Set() };
    else if (p.phase === 'end' && st.snapshot) {
      if (st.snapshot.mode === 'replace-source') {
        const drop = [];
        for (const it of this.service.items.values()) if (!it.deleted && !st.snapshot.seen.has(it.id) && it.sources.length && it.sources.every(s => s.sourceId === st.sourceId)) drop.push(it);
        drop.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'link' ? -1 : 1));
        for (const it of drop) this.service.remove(it.id, { writerSources: [st.sourceId] });
      }
      st.snapshot = null;
    }
  }
  /** Checkpoint support (Kafka mode): stream cursors + eventId window. */
  exportState() { return { streams: [...this.streams.values()].map(s => ({ sourceId: s.sourceId, partition: s.partition, lastAppliedSeq: s.lastAppliedSeq })), seen: [...this.seen.keys()] }; }
  importState(x) {
    for (const s of x?.streams || []) this.#state(s.sourceId, s.partition).lastAppliedSeq = s.lastAppliedSeq;
    const now = Date.now(); for (const id of x?.seen || []) this.seen.set(id, now);
  }
  status() { return [...this.streams.values()].map(s => ({ sourceId: s.sourceId, partition: s.partition, lastAppliedSeq: s.lastAppliedSeq, buffered: s.pending.size, status: s.status })); }
}
