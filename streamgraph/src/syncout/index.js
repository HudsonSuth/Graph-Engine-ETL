// Sync-out: streams graph changes to external sinks with persisted checkpoints.
// Delivery is at-least-once: the checkpoint is saved only after the sink accepted a batch, and sinks upsert by id.
import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { SINKS } from './sinks.js';

const ek = e => `${e.type}|${e.from?.label}:${e.from?.key}|${e.to?.label}:${e.to?.key}`;
export class SyncOut {
  constructor({ graph, engine, checkpointFile, secret = () => '', factories = {}, intervalMs = 1000, batchSize = 500 }) {
    Object.assign(this, { graph, engine, checkpointFile, secret, factories, intervalMs, batchSize });
    this.sinks = []; this.adapters = new Map(); this.cp = {}; this.busy = false; this.timer = null; this.writes = 0;
  }
  async load() { if (this.checkpointFile && existsSync(this.checkpointFile)) try { this.cp = JSON.parse(await readFile(this.checkpointFile, 'utf8')); } catch { this.cp = {}; } }
  async saveCp() {
    if (!this.checkpointFile) return;
    const body = JSON.stringify(this.cp, null, 2), tmp = `${this.checkpointFile}.${process.pid}.${++this.writes}.tmp`;
    await writeFile(tmp, body);
    try { await rename(tmp, this.checkpointFile); } // atomic replace; on Windows a virus scanner can briefly lock the target
    catch { await writeFile(this.checkpointFile, body); await rm(tmp, { force: true }); }
  }
  async configure(sinks) {
    const ids = new Set(sinks.map(s => s.id));
    for (const [id, a] of this.adapters) { const s = sinks.find(x => x.id === id); if (!ids.has(id) || JSON.stringify(s) !== JSON.stringify(this.sinks.find(x => x.id === id))) { await a.close().catch(() => {}); this.adapters.delete(id); } }
    for (const s of sinks) { const old = this.sinks.find(x => x.id === s.id); if (old && JSON.stringify({ ...old, enabled: 0 }) !== JSON.stringify({ ...s, enabled: 0 })) delete this.cp[s.id]; } // new target or user: send a fresh snapshot
    for (const id of Object.keys(this.cp)) if (!ids.has(id)) delete this.cp[id];
    this.sinks = structuredClone(sinks); await this.saveCp();
  }
  adapter(s) {
    if (!this.adapters.has(s.id)) {
      const K = SINKS[s.kind]; if (!K) throw new Error(`Unknown output type ${s.kind}`);
      const cfg = { ...s.settings, password: this.secret(s.id) || undefined };
      this.adapters.set(s.id, new K(cfg, this.factories[s.kind] || {}));
    }
    return this.adapters.get(s.id);
  }
  start() { if (!this.timer) { this.timer = setInterval(() => this.cycle().catch(() => {}), this.intervalMs); this.timer.unref?.(); } }
  async stop() { clearInterval(this.timer); this.timer = null; while (this.busy) await new Promise(r => setTimeout(r, 20)); for (const a of this.adapters.values()) await a.close().catch(() => {}); this.adapters.clear(); }
  async reset() { await this.stop(); this.sinks = []; this.cp = {}; await this.saveCp(); }

  // Masks a change for the sink's user; denied types become deletes so revoked access propagates.
  async view(sink, changes) {
    const subject = this.engine.subject(sink.asUser), env = { via: 'sync-out' };
    const ok = async l => !!l && (await this.engine.decide({ subject, action: 'sync-out', entity: l, env })).allow;
    const key = (l, k) => this.engine.viewKey(subject, l, k);
    const last = new Map();
    for (const c of changes) last.set(c.kind + '|' + c.id, c); // coalesce: last change per id wins
    const b = { nodes: [], edges: [], delNodes: [], delEdges: [] }, seenE = new Set();
    for (const c of last.values()) {
      const d = c.data;
      if (c.kind === 'node') {
        const ref = { label: d.label, key: key(d.label, d.key) };
        if (c.op === 'upsert' && await ok(d.label)) b.nodes.push({ ...ref, props: this.engine.maskProps(subject, d.label, d.props).props });
        else b.delNodes.push(ref);
      } else {
        if (!d.from || !d.to) continue;
        const e = { type: d.type, from: { label: d.from.label, key: key(d.from.label, d.from.key) }, to: { label: d.to.label, key: key(d.to.label, d.to.key) } };
        if (seenE.has(ek(e))) continue; seenE.add(ek(e));
        if (c.op === 'upsert' && await ok(d.type) && await ok(d.from.label) && await ok(d.to.label)) b.edges.push({ ...e, props: this.engine.maskProps(subject, d.type, d.props).props });
        else b.delEdges.push(e);
      }
    }
    return b;
  }
  async snapshot(sink, a, cp) {
    const seq = this.graph.maxSeq(), run = Math.max(Date.now(), (cp.run || 0) + 1); // a time-based run id stays above rows left by a lost checkpoint
    const nodes = this.graph.nodes(), byId = new Map(nodes.map(n => [n.id, n]));
    const changes = [...nodes.map(n => ({ kind: 'node', op: 'upsert', id: n.id, data: n })),
      ...this.graph.edges().map(e => ({ kind: 'edge', op: 'upsert', id: e.id, data: { type: e.type, from: byId.get(e.from) && { label: byId.get(e.from).label, key: byId.get(e.from).key }, to: byId.get(e.to) && { label: byId.get(e.to).label, key: byId.get(e.to).key }, props: e.props } }))];
    for (let i = 0; i < changes.length || i === 0; i += this.batchSize) {
      const b = await this.view(sink, changes.slice(i, i + this.batchSize));
      await a.apply({ ...b, run }); // denied items go out as deletes, so revoked access also clears Kafka topics
      cp.sent = (cp.sent || 0) + b.nodes.length + b.edges.length;
      if (!changes.length) break;
    }
    await a.sweep(run); // remove what the sink still has from before (stale after a wipe or downtime)
    Object.assign(cp, { epoch: this.graph.epoch, seq, run, policy: this.engine.snap?.version, snapshots: (cp.snapshots || 0) + 1 });
  }
  async cycle() {
    if (this.busy) return; this.busy = true;
    try {
      for (const s of this.sinks.filter(x => x.enabled !== false)) {
        const cp = this.cp[s.id] ??= { seq: 0, sent: 0 };
        try {
          const a = this.adapter(s);
          const min = this.graph.minSeq(), gap = cp.seq < (min == null ? this.graph.maxSeq() : min - 1); // changes it missed were pruned
          // Resend everything after a wipe, a gap, or any access-rule change (so revoked data is removed downstream right away).
          if (cp.epoch !== this.graph.epoch || gap || cp.policy !== this.engine.snap?.version) await this.snapshot(s, a, cp);
          for (;;) {
            const ch = this.graph.changesAfter(cp.seq, this.batchSize); if (!ch.length) break;
            const b = await this.view(s, ch);
            await a.apply({ ...b, run: cp.run || 1 });
            cp.seq = ch.at(-1).seq; cp.sent += b.nodes.length + b.edges.length + b.delNodes.length + b.delEdges.length;
            await this.saveCp();
          }
          Object.assign(cp, { lastAt: Date.now(), lastError: null });
        } catch (e) { Object.assign(cp, { lastError: e.message, lastErrorAt: Date.now() }); this.adapters.get(s.id)?.close().catch(() => {}); this.adapters.delete(s.id); }
        await this.saveCp();
      }
      // Drop change-log entries every active sink already has.
      const active = this.sinks.filter(x => x.enabled !== false).map(x => this.cp[x.id]).filter(c => c?.epoch === this.graph.epoch);
      if (!this.sinks.some(x => x.enabled !== false)) this.graph.pruneChanges(this.graph.maxSeq());
      else if (active.length === this.sinks.filter(x => x.enabled !== false).length) this.graph.pruneChanges(Math.min(...active.map(c => c.seq)));
    } finally { this.busy = false; }
  }
  status() {
    const max = this.graph.maxSeq();
    return this.sinks.map(s => {
      const c = this.cp[s.id] || {};
      const lag = c.epoch === this.graph.epoch ? Math.max(0, max - (c.seq || 0)) : null;
      const health = s.enabled === false ? 'amber' : c.lastError ? 'red' : c.epoch !== this.graph.epoch ? 'amber' : 'green';
      return { id: s.id, name: s.name, kind: s.kind, asUser: s.asUser, enabled: s.enabled !== false, health, sent: c.sent || 0, lastAt: c.lastAt || null, lastError: c.lastError || null, waiting: lag, snapshots: c.snapshots || 0 };
    });
  }
  async test(s) { const K = SINKS[s.kind]; if (!K) throw new Error('Pick an output type.'); const a = new K({ ...s.settings, password: s.password }, this.factories[s.kind] || {}); try { await a.test(); } finally { await a.close().catch(() => {}); } }
}
