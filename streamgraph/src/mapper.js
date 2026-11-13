// Schema-driven mapping: change events -> graph upserts/deletes keyed by (label, key).
import { evaluate } from './expr.js';
import { nodeId, edgeId } from './graph.js';

async function props(spec, data) {
  if (!spec) return {};
  if (spec === '*') return { ...data };
  const out = {};
  for (const [k, ex] of Object.entries(spec)) { const v = await evaluate(ex, data); if (v !== undefined) out[k] = v; }
  return out;
}
async function key(ex, data) {
  const v = await evaluate(ex, data);
  return v === undefined || v === null || v === '' ? null : String(v);
}

export class Mapper {
  constructor(mapping) { this.mapping = mapping || {}; }
  id(label, k) { return nodeId(label, k); }
  async endpoints(spec, data) {
    const out = [];
    for (const e of spec.edges || []) {
      const a = await key(e.from.key, data), b = await key(e.to.key, data);
      if (a && b) out.push({ e, from: this.id(e.from.label, a), to: this.id(e.to.label, b), fk: a, tk: b });
    }
    return out;
  }
  // Returns a list of graph ops applied, for live deltas.
  async apply(ev, graph) {
    const spec = this.mapping[ev.topic];
    if (!spec) return [];
    const ops = [], data = ev.data || {};
    if (spec.asEdge) {
      const e = spec.asEdge;
      const a = await key(e.from.key, data), b = await key(e.to.key, data);
      if (!a || !b) return ops;
      const from = this.id(e.from.label, a), to = this.id(e.to.label, b);
      if (ev.op === 'd') { graph.deleteEdge(edgeId(e.type, from, to)); return [{ op: 'del-edge' }]; }
      if (!graph.hasNode(from)) graph.upsertNode(from, e.from.label, a);
      if (!graph.hasNode(to)) graph.upsertNode(to, e.to.label, b);
      graph.upsertEdge(e.type, from, to, await props(e.props, data));
      return [{ op: 'edge' }];
    }
    if (ev.op === 'd') {
      for (const x of await this.endpoints(spec, data)) { graph.deleteEdge(edgeId(x.e.type, x.from, x.to)); ops.push({ op: 'del-edge' }); }
      for (const n of spec.nodes || []) {
        const k = await key(n.key, data);
        if (k && (n.ownsLifecycle ?? true)) { graph.deleteNode(this.id(n.label, k)); ops.push({ op: 'del-node', label: n.label, key: k }); break; }
      }
      return ops;
    }
    for (const n of spec.nodes || []) {
      const k = await key(n.key, data);
      if (!k) continue;
      const id = this.id(n.label, k), created = !graph.hasNode(id);
      graph.upsertNode(id, n.label, k, await props(n.props, data)); ops.push({ op: 'node', label: n.label, key: k, created });
    }
    const now = await this.endpoints(spec, data);
    if (ev.op === 'u' && ev.before) { // drop edges whose endpoints moved
      const keep = new Set(now.map(x => edgeId(x.e.type, x.from, x.to)));
      for (const x of await this.endpoints(spec, ev.before)) {
        const id = edgeId(x.e.type, x.from, x.to);
        if (!keep.has(id)) { graph.deleteEdge(id); ops.push({ op: 'del-edge' }); }
      }
    }
    for (const x of now) {
      if (!graph.hasNode(x.from)) graph.upsertNode(x.from, x.e.from.label, x.fk);
      if (!graph.hasNode(x.to)) graph.upsertNode(x.to, x.e.to.label, x.tk);
      graph.upsertEdge(x.e.type, x.from, x.to, await props(x.e.props, data)); ops.push({ op: 'edge' });
    }
    return ops;
  }
}

// DELIBERATELY WRONG: ignores keys, so every record mints a fresh node. Used only to prove tests catch it.
export class BrokenMapper extends Mapper {
  #n = 0;
  id(label, k) { return nodeId(label, `${k}#${this.#n++}`); }
}

export function makeMapper(mapping) {
  return process.env.STREAMGRAPH_MAPPER === 'broken' ? new BrokenMapper(mapping) : new Mapper(mapping);
}
