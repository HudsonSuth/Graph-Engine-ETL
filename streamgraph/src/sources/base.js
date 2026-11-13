export class Source {
  constructor(cfg, ctx = {}) { this.cfg = cfg; this.ctx = ctx; this.timer = null; this.busy = false; }
  get topic() { return this.cfg.topic; }
  async poll(_emit) {}
  async start(emit) {
    const tick = async () => { if (this.busy) return; this.busy = true; try { await this.poll(emit); this.ctx.onPoll?.(); } catch (e) { this.ctx.onError?.(e); } finally { this.busy = false; } };
    await tick();
    this.timer = setInterval(tick, this.cfg.intervalMs || 2000);
  }
  async stop() { clearInterval(this.timer); this.timer = null; }
}
// Snapshot differ: turns successive full snapshots into c/u/d events by key.
export class Differ {
  constructor(key) { this.key = key; this.prev = new Map(); }
  diff(rows, topic, detectDeletes = true) {
    const out = [], seen = new Set();
    for (const r of rows) {
      const k = String(r[this.key]); seen.add(k);
      const before = this.prev.get(k);
      if (!before) out.push({ op: 'c', topic, data: r });
      else if (JSON.stringify(before) !== JSON.stringify(r)) out.push({ op: 'u', topic, data: r, before });
      this.prev.set(k, r);
    }
    if (detectDeletes) for (const [k, before] of this.prev) if (!seen.has(k)) { out.push({ op: 'd', topic, data: before, before }); this.prev.delete(k); }
    return out;
  }
}
// A record may carry _op: 'c'|'u'|'d' (handy for files and webhooks).
export function toEvent(rec, topic) {
  if (rec && typeof rec === 'object' && ['c', 'u', 'd'].includes(rec._op)) { const { _op, ...data } = rec; return { op: _op, topic, data }; }
  return { op: 'c', topic, data: rec };
}
