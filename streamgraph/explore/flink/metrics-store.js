// Viewer-side read model of the processor's outputs: latest node.metrics per node, latest tumbling window per node, recent
// alerts (deduplicated by alertId). Reads graph.metrics + graph.alerts from the beginning (both compacted) with read_committed,
// so only records from committed Flink checkpoints are shown. Records failing the v1 contract are counted and ignored.
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { validateDerived } from './contracts.js';

export class MetricsStore extends EventEmitter {
  constructor({ kafka, c, instanceId = 'local', log = () => {} }) {
    super();
    Object.assign(this, { kafka, c, instanceId, log });
    this.nodes = new Map(); this.windows = new Map(); this.alertsById = new Map();
    this.counts = { metrics: 0, windows: 0, alerts: 0, geo: 0, invalid: 0 }; this.lastAt = null;
    this.geoEnabled = !!c.geo?.enabled; this.geo = new Map(); // windowStartMs -> Map(cell -> count)   (graph.geo-metrics, SPEC §22.7)
  }
  async start() {
    const t = this.c.topics;
    this.consumer = this.kafka.consumer({ groupId: `${this.c.processorId}-viewer-${this.instanceId}-${randomUUID().slice(0, 8)}`, readUncommitted: false, sessionTimeout: 15000 });
    await this.consumer.connect();
    await this.consumer.subscribe({ topics: [t.metrics, t.alerts, ...(this.geoEnabled ? [t.geo] : [])], fromBeginning: true });
    await this.consumer.run({ autoCommit: false, eachBatch: async ({ batch }) => { for (const m of batch.messages) this.apply(m); this.emit('update'); } });
    return this;
  }
  apply(m) {
    if (m.value == null) { const k = m.key?.toString(); if (k) { this.nodes.delete(k); this.alertsById.delete(k); } return; } // tombstones
    let r; try { r = JSON.parse(m.value.toString()); } catch { this.counts.invalid++; return; }
    if (!validateDerived(r).ok) { this.counts.invalid++; return; }
    this.lastAt = Date.now();
    if (r.kind === 'geo.window') { this.counts.geo++; const w = Date.parse(r.windowStart); let m = this.geo.get(w); if (!m) this.geo.set(w, m = new Map()); m.set(r.cell, r.count); return; } // keyed upsert: replays are idempotent
    if (r.kind === 'node.metrics') { this.counts.metrics++; this.nodes.set(r.nodeId, r); }
    else if (r.kind === 'node.window') { this.counts.windows++; if (r.window === 'tumbling') { const p = this.windows.get(r.nodeId); if (!p || p.windowStart <= r.windowStart) this.windows.set(r.nodeId, r); } }
    else if (r.kind === 'degree.spike') {
      this.counts.alerts++; this.alertsById.set(r.alertId, r);
      if (this.alertsById.size > this.c.alertsKept) { const oldest = [...this.alertsById.values()].sort((a, b) => a.windowStart.localeCompare(b.windowStart))[0]; this.alertsById.delete(oldest.alertId); }
    }
  }
  /** newest first; optional nodeId filter */
  alerts({ nodeId, limit = 50 } = {}) { return [...this.alertsById.values()].filter(a => !nodeId || a.nodeId === nodeId).sort((a, b) => b.windowStart.localeCompare(a.windowStart) || a.nodeId.localeCompare(b.nodeId)).slice(0, limit); }
  metricsFor(id) {
    const m = this.nodes.get(id); if (!m) return null;
    const w = this.windows.get(id), al = this.alerts({ nodeId: id, limit: 1 })[0];
    return { nodeId: id, degree: m.degree, inDegree: m.inDegree, outDegree: m.outDegree, changes: m.changes, removed: m.removed, updatedAt: m.updatedAt,
      lastWindow: w ? { start: w.windowStart, end: w.windowEnd, changes: w.changes, degreeGained: w.degreeGained, degreeLost: w.degreeLost } : null,
      alert: al ? { alertId: al.alertId, severity: al.severity, degreeGained: al.degreeGained, windowStart: al.windowStart } : null };
  }
  /** per-cell counts summed over the latest `windows` closed tumbling windows (H3 only) */
  geoCounts({ kind = 'h3', windows = this.c.geo?.windows ?? 10 } = {}) {
    const g = this.c.geo || {};
    if (kind !== 'h3') return { kind, available: false, reason: 'the Flink job counts H3 cells only' };
    const starts = [...this.geo.keys()].sort((a, b) => b - a).slice(0, windows), counts = {}; let events = 0;
    for (const w of starts) for (const [cell, n] of this.geo.get(w)) { counts[cell] = (counts[cell] || 0) + n; events += n; }
    return { kind: 'h3', resolution: g.resolution, windowMs: g.windowMs, windows: starts.length, from: starts.length ? new Date(starts.at(-1)).toISOString() : null, to: starts.length ? new Date(starts[0] + g.windowMs).toISOString() : null, events, counts };
  }
  stats() { return { nodes: this.nodes.size, alerts: this.alertsById.size, ...this.counts, lastRecordAt: this.lastAt && new Date(this.lastAt).toISOString() }; }
  async close() { await this.consumer?.disconnect().catch(() => {}); }
}
