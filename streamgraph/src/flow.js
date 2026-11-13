import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import YAML from 'yaml';
import { FileSource } from './sources/file.js';
import { HttpSource } from './sources/http.js';
import { KafkaSource } from './sources/kafka.js';
import { SqlTableSource, CdcSource } from './sources/sql.js';
import { DocumentsSource } from './sources/documents.js';
import { TRANSFORMS, applyTransform } from './transforms.js';
import { makeMapper } from './mapper.js';
import { GraphStore } from './graph.js';
import { checkSyntax } from './expr.js';

export const SOURCES = { file: FileSource, http: HttpSource, kafka: KafkaSource, sql: SqlTableSource, cdc: CdcSource, documents: DocumentsSource };
export const KINDS = { ...Object.fromEntries(Object.keys(SOURCES).map(k => [k, 'source'])), ...Object.fromEntries(Object.keys(TRANSFORMS).map(k => [k, 'transform'])), graph: 'sink' };
const REQUIRED = { file: ['path', 'topic'], http: ['url', 'topic'], kafka: ['brokers', 'topics'], sql: ['table'], cdc: ['table', 'key'], documents: ['folder', 'topic'], graph: ['mapping'], filter: ['expr'] };

export function loadFlow(path) {
  const flow = (path.endsWith('.yaml') || path.endsWith('.yml') ? YAML.parse : JSON.parse)(readFileSync(path, 'utf8'));
  flow.baseDir ??= dirname(path); return flow;
}

export function validateFlow(flow) {
  const errs = [], steps = flow.steps || [], links = flow.links || [];
  const ids = new Map(steps.map(s => [s.id, s]));
  if (ids.size !== steps.length) errs.push('Duplicate step ids');
  for (const s of steps) {
    if (!KINDS[s.type]) { errs.push(`Step ${s.id}: unknown type "${s.type}"`); continue; }
    for (const f of REQUIRED[s.type] || []) if (s.config?.[f] == null) errs.push(`Step ${s.id}: missing config.${f}`);
    if (s.type === 'filter' && s.config?.expr) { const e = checkSyntax(s.config.expr); if (e) errs.push(`Step ${s.id}: bad expression: ${e}`); }
  }
  const kind = id => KINDS[ids.get(id)?.type];
  for (const l of links) {
    if (!ids.has(l.from) || !ids.has(l.to)) errs.push(`Link ${l.from}->${l.to}: unknown step`);
    else if (kind(l.to) === 'source') errs.push(`Link ${l.from}->${l.to}: sources cannot have inputs`);
    else if (kind(l.from) === 'sink') errs.push(`Link ${l.from}->${l.to}: sinks cannot have outputs`);
  }
  const srcs = steps.filter(s => KINDS[s.type] === 'source'), sinks = steps.filter(s => KINDS[s.type] === 'sink');
  if (!srcs.length) errs.push('Flow has no source');
  if (!sinks.length) errs.push('Flow has no sink');
  // cycle + reachability
  const adj = new Map(steps.map(s => [s.id, []])); links.forEach(l => adj.get(l.from)?.push(l.to));
  const state = new Map(); let cyc = false;
  const dfs = id => { state.set(id, 1); for (const n of adj.get(id) || []) { if (state.get(n) === 1) cyc = true; else if (!state.has(n)) dfs(n); } state.set(id, 2); };
  srcs.forEach(s => !state.has(s.id) && dfs(s.id)); steps.forEach(s => !state.has(s.id) && dfs(s.id));
  if (cyc) errs.push('Flow has a cycle');
  const reach = new Set(), st = srcs.map(s => s.id);
  while (st.length) { const n = st.pop(); if (reach.has(n)) continue; reach.add(n); st.push(...(adj.get(n) || [])); }
  for (const s of sinks) if (!reach.has(s.id)) errs.push(`Sink ${s.id} has no path from a source`);
  return errs;
}

export const copyFlow = (flow, name) => ({ ...structuredClone(flow), name });

const typeOf = v => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
function note(schema, data) { for (const [k, v] of Object.entries(data || {})) { (schema[k] ??= new Set()).add(typeOf(v)); } }

export class Pipeline extends EventEmitter {
  constructor(flow, { graph, ctx = {} } = {}) {
    super();
    this.flow = flow; this.graph = graph || new GraphStore(); this.ctx = { baseDir: flow.baseDir || '.', ...ctx, onError: e => this.#err('source', e) };
    this.errors = validateFlow(flow);
    this.steps = new Map((flow.steps || []).map(s => [s.id, s]));
    this.next = new Map(); for (const l of flow.links || []) (this.next.get(l.from) ?? this.next.set(l.from, []).get(l.from)).push(l.to);
    this.stats = Object.fromEntries([...this.steps.keys()].map(id => [id, { in: 0, out: 0, dropped: 0, errors: 0, inSchema: {}, outSchema: {} }]));
    this.mappers = new Map(); this.queue = Promise.resolve(); this.running = false; this.lastErrors = [];
  }
  #err(where, e) { this.lastErrors = [...this.lastErrors.slice(-19), `${where}: ${e.message}`]; this.emit('error-event', { where, message: e.message }); }
  #tick() { if (this.tickT) return; this.tickT = setTimeout(() => { this.tickT = null; this.emit('tick'); }, 150); }
  sources() {
    return (this.flow.steps || []).filter(s => KINDS[s.type] === 'source').map(s => ({ step: s, src: new SOURCES[s.type](s.config, { ...this.ctx,
      onError: e => { const st = this.stats[s.id]; st.errors++; st.lastErrorAt = Date.now(); st.lastError = e.message; this.#err(s.id, e); },
      onPoll: () => { this.stats[s.id].lastPollAt = Date.now(); } }) }));
  }
  emitter(stepId) {
    return ev => (this.closed ? Promise.resolve() : this.queue = this.queue.then(async () => {
      if (this.closed) return; // in-flight record arrived after stop/reset: drop it
      const st = this.stats[stepId]; st.out++; note(st.outSchema, ev.data); st.lastAt = Date.now(); (st.times ??= []).push(st.lastAt); if (st.times.length > 5000) st.times.splice(0, 1000);
      await this.#route(stepId, ev);
    }));
  }
  async #route(fromId, ev) {
    for (const id of this.next.get(fromId) || []) {
      const step = this.steps.get(id), st = this.stats[id];
      st.in++; note(st.inSchema, ev.data);
      try {
        if (this.closed) return;
        if (KINDS[step.type] === 'sink') {
          const m = this.mappers.get(id) ?? this.mappers.set(id, makeMapper(step.config.mapping)).get(id);
          const ops = await m.apply(ev, this.graph); st.out += ops.length;
          this.emit('applied', { ev, ops });
        } else {
          const out = await applyTransform(step, ev);
          if (!out) { st.dropped++; continue; }
          st.out++; note(st.outSchema, out.data);
          await this.#route(id, out);
        }
      } catch (e) { st.errors++; this.#err(id, e); }
    }
    this.#tick();
  }
  assertValid() { if (this.errors.length) throw new Error('Invalid flow:\n' + this.errors.join('\n')); }
  async runOnce() { // batch mode
    this.assertValid();
    for (const { step, src } of this.sources()) { await src.poll(this.emitter(step.id)); await src.stop?.(); }
    await this.queue; this.emit('tick'); return this.graph.counts();
  }
  async start() { // continuous mode
    this.assertValid(); this.running = true; this.live = this.sources();
    for (const { step, src } of this.live) src.start(this.emitter(step.id)).catch(e => this.#err(step.id, e));
  }
  async stop() { this.running = false; this.closed = true; for (const { src } of this.live || []) await src.stop(); this.live = []; await this.queue; }
  async drain() { await this.queue; }
  stepSchemas() {
    const ser = s => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, [...v].join('|')]));
    const now = Date.now();
    return Object.fromEntries(Object.entries(this.stats).map(([id, { times, ...s }]) => [id, { ...s, perMinute: (times || []).filter(t => now - t < 60000).length, inSchema: ser(s.inSchema), outSchema: ser(s.outSchema) }]));
  }
}
