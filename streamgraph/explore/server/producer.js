// Contract producer (SPEC §6.3/§6.6): assigns seq/eventId, batches events (linger or size),
// keeps at most maxInFlightBatches unacknowledged batches, honours retry acks, resumes from the acked cursor.
export class StreamProducer {
  constructor({ sourceId, partition = 0, producerId = sourceId, send, maxInFlightBatches = 4, maxBatchEvents = 500, lingerMs = 20, startSeq = 0 }) {
    Object.assign(this, { sourceId, partition, producerId, send, maxInFlightBatches, maxBatchEvents, lingerMs });
    this.seq = startSeq; this.ackedSeq = startSeq;
    this.queue = []; this.inFlight = 0; this.maxObservedInFlight = 0; this.batchNo = 0; this.timer = null;
    this.idle = []; this.stats = { sent: 0, acked: 0, retries: 0, events: 0 };
  }
  /** Queue one event (header fields filled in). */
  push(op, payload, { eventTime = new Date().toISOString(), partial = false } = {}) {
    const seq = ++this.seq;
    this.queue.push({ eventId: `${this.producerId}:${seq}`, op, sourceId: this.sourceId, seq, eventTime, ingestTime: new Date().toISOString(), payload, ...(partial ? { partial: true } : {}) });
    this.stats.events++;
    if (this.queue.length >= this.maxBatchEvents) this.pump();
    else if (!this.timer) { this.timer = setTimeout(() => { this.timer = null; this.pump(); }, this.lingerMs); this.timer.unref?.(); }
    return seq;
  }
  pump() {
    while (this.queue.length && this.inFlight < this.maxInFlightBatches) {
      const events = this.queue.splice(0, this.maxBatchEvents);
      this.#sendBatch({ batchId: `${this.producerId}:b${++this.batchNo}`, sourceId: this.sourceId, partition: this.partition, events, bytesApprox: 0 });
    }
    this.#checkIdle();
  }
  async #sendBatch(batch) {
    this.inFlight++; this.maxObservedInFlight = Math.max(this.maxObservedInFlight, this.inFlight); this.stats.sent++;
    let ack;
    try { ack = await this.send(batch); } catch (e) { ack = { status: 'retry', retryAfterMs: 200, error: { message: e.message } }; }
    if (ack?.status === 'retry') {
      this.stats.retries++;
      await new Promise(r => setTimeout(r, ack.retryAfterMs || 100));
      this.inFlight--; return this.#sendBatch(batch); // resend the same batch (idempotent by eventId/seq)
    }
    this.inFlight--; this.stats.acked++;
    if (Number.isInteger(ack?.lastAppliedSeq)) this.ackedSeq = Math.max(this.ackedSeq, ack.lastAppliedSeq);
    this.pump();
  }
  #checkIdle() { if (!this.queue.length && !this.inFlight) { const w = this.idle; this.idle = []; w.forEach(f => f()); } }
  /** Resolves when every queued event has been acknowledged. */
  flush() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } this.pump(); return new Promise(r => { this.idle.push(r); this.#checkIdle(); }); }
}
