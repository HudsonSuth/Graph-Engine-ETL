// Wires entity resolution into an Explore instance (SPEC §21). Off unless explore.config.json { "er": { "enabled": true } }.
//   inprocess: a stage listens to the GraphService change stream, coalesces record changes, resolves them and publishes the
//              derived items back through the §6 contract as source "er" (a derived writer: it may only write "er:*" ids).
//   kafka:     one ER worker per cluster consumes graph.changes (consumer group "<clientId>-er") and publishes the derived
//              events + its consumed offsets in ONE transaction (consume-transform-produce, exactly-once). Its transactional
//              id is fixed, so a second worker fences the first (singleton). Restart: state rebuilt from graph.state.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { erConfig } from './config.js';
import { SidecarMatcher } from './sidecar.js';
import { ErEngine } from './engine.js';

export async function startEr(ex, config, { log = () => {}, dataDir } = {}) {
  const c = erConfig(config.er || {});
  const wrong = c.impl === 'wrong';
  const W = wrong ? await import('./wrong.js') : null;
  const matcher = wrong ? new W.WrongMatcher() : new SidecarMatcher({ engine: c.engine, java: c.java, python: c.python, heap: c.heap, log });
  await matcher.start();
  const engine = new (wrong ? W.WrongEngine : ErEngine)({ cfg: c, matcher, log });
  const modelDirs = [dataDir && join(dataDir, 'er-models'), c.modelsDir].filter(Boolean);
  const models = {};
  if (c.engine === 'splink' && !wrong) for (const t of Object.keys(c.types)) for (const d of modelDirs) { const f = join(d, `${t}.splink.json`); if (!models[t] && existsSync(f)) models[t] = JSON.parse(readFileSync(f, 'utf8')); }
  await engine.start({ models });
  ex.ingest.derivedWriters?.add(c.sourceId);
  const er = { config: c, engine, matcher, models, wrong, stage: null, worker: null };

  // Splink without a saved model: train on the first load that is big enough, save next to the app data, re-resolve
  er.maybeTrain = async () => {
    if (c.engine !== 'splink' || wrong || !matcher.trainable) return false;
    let did = false;
    for (const t of Object.keys(c.types)) {
      if (models[t]) continue;
      const n = [...engine.records.values()].filter(r => r.type === t).length;
      if (n < c.minTrainRecords) continue;
      const tr = await matcher.train(t, c.minTrainRecords); models[t] = tr.model; did = true;
      if (modelDirs[0]) { mkdirSync(modelDirs[0], { recursive: true }); writeFileSync(join(modelDirs[0], `${t}.splink.json`), JSON.stringify(tr.model)); }
      log(`[er] trained Splink model for ${t} on ${n} records in ${tr.ms} ms`);
    }
    if (!did) return false;
    for (const t of Object.keys(c.types)) await matcher.configure(t, { ...c.types[t], maxCandidates: c.maxCandidates, ...(models[t] ? { model: models[t] } : {}) });
    return true;
  };
  // the sidecar keeps its index in memory: after a crash it is restarted, reconfigured and every live record re-indexed
  matcher.onRestart = async () => {
    for (const t of Object.keys(c.types)) await matcher.configure(t, { ...c.types[t], maxCandidates: c.maxCandidates, ...(models[t] ? { model: models[t] } : {}) });
    const r = await engine.reindex(); await er.publish(r.events, 'reindex'); log(`[er] re-indexed ${engine.records.size} records after a sidecar restart`);
  };

  if (config.mode === 'kafka') {
    if (c.kafka.runWorker) { const { ErKafkaWorker } = await import('./kafka-worker.js'); er.worker = await new ErKafkaWorker({ ex, er, config, log }).start(); }
    er.publish = async events => er.worker ? er.worker.publishOutOfBand(events) : undefined;
  } else {
    er.publish = async events => { if (!events.length) return; const producer = ex.producer(c.sourceId); for (const e of events) producer.push(e.op, e.payload); await producer.flush(); };
    er.stage = new InProcessStage(ex, er, log).start();
  }
  er.idle = () => (er.stage ? er.stage.idle() : er.worker ? er.worker.idle() : Promise.resolve());
  er.stats = () => ({ enabled: true, engine: matcher.name, impl: c.impl, mode: config.mode, trainedModels: Object.keys(models), ...engine.stats(), stage: er.stage?.stats(), worker: er.worker?.stats(), sidecarRestarts: matcher.restarts || 0 });
  er.close = async (o = {}) => { await er.stage?.close(); await er.worker?.close(o); await matcher.close(); };
  log(`[er] entity resolution on: engine ${matcher.name}${wrong ? ' [WRONG IMPLEMENTATION]' : ''}, types ${Object.keys(c.types).join(', ')}, mode ${config.mode}${er.worker ? ' (worker)' : ''}`);
  return er;
}

/** in-process mode: GraphService change stream -> coalesced batches -> engine -> §6 producer "er" */
class InProcessStage {
  constructor(ex, er, log) { Object.assign(this, { ex, er, log }); this.pending = new Set(); this.timer = null; this.running = null; this.waiters = []; this.m = { flushes: 0, lastFlushMs: 0, lastBatch: 0, maxBatch: 0, errors: 0 }; }
  start() {
    const S = this.er.config.sourceId, eng = this.er.engine;
    this.onChange = ids => {
      for (const id of ids) {
        const it = this.ex.service.items.get(id);
        if (!it || it.kind !== 'node' || String(id).startsWith(`${S}:`)) continue;
        if (eng.isRecordType(it.type) || eng.records.has(id)) this.pending.add(id);
      }
      this.schedule();
    };
    this.ex.service.on('change', this.onChange);
    for (const it of this.ex.service.items.values()) if (it.kind === 'node' && !it.deleted && eng.isRecordType(it.type)) this.pending.add(it.id); // already loaded
    this.schedule();
    return this;
  }
  schedule() { if (this.timer || this.running || !this.pending.size) return; this.timer = setTimeout(() => { this.timer = null; this.run(); }, this.er.config.flushMs); }
  async run() {
    if (this.running) return;
    this.running = (async () => {
      while (this.pending.size) {
        const ids = [...this.pending]; this.pending.clear();
        const t0 = performance.now();
        const changes = ids.map(id => { const it = this.ex.service.items.get(id); return it && !it.deleted ? { op: 'upsert', item: it } : { op: 'remove', id }; });
        try {
          const r = await this.er.engine.apply(changes);
          await this.er.publish(r.events);
          if (await this.er.maybeTrain()) { const rr = await this.er.engine.reindex(); await this.er.publish(rr.events); }
        } catch (e) { this.m.errors++; this.log(`[er] resolve failed: ${e.message}`); for (const id of ids) this.pending.add(id); await new Promise(r => setTimeout(r, 500)); }
        this.m.flushes++; this.m.lastFlushMs = Math.round(performance.now() - t0); this.m.lastBatch = ids.length; this.m.maxBatch = Math.max(this.m.maxBatch, ids.length);
      }
    })();
    await this.running; this.running = null;
    if (this.pending.size) this.schedule(); else { const w = this.waiters; this.waiters = []; w.forEach(f => f()); }
  }
  /** resolves when every change seen so far is resolved and its derived items applied */
  idle() { if (!this.pending.size && !this.running && !this.timer) return Promise.resolve(); return new Promise(r => this.waiters.push(r)); }
  stats() { return { ...this.m, pending: this.pending.size }; }
  async close() { this.ex.service.off('change', this.onChange); clearTimeout(this.timer); await this.running; }
}
