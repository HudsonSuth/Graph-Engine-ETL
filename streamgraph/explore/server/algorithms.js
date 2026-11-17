// Algorithm runner (SPEC §23.5): builds the analysis input from the permissioned read model for a scope
// ("all" | "filter" | "ids"), runs one algorithm, keeps recent results by runId for the UI and MCP tools.
import { createHash } from 'node:crypto';
import { algorithms as A, ALGO_IMPLEMENTATION } from '../shared/algorithms-impl.js';
import { compileFilter } from '../shared/core-filter.js';

const MAX_RESULTS = 32;
export function algoService(ex) {
  const { service } = ex;
  const results = new Map(); let graphVersion = 0, seq = 0;
  const inputs = new Map();
  service.on('change', () => { graphVersion++; inputs.clear(); });
  /** scope -> { nodes, links, info } using only items the principal (and StreamGraph user) may see */
  async function buildInput(scope = {}, { principal, actAs, weightProperty = null } = {}) {
    const kind = ['all', 'filter', 'ids'].includes(scope.kind) ? scope.kind : scope.ids ? 'ids' : 'all';
    const f = compileFilter(kind === 'filter' ? { ...scope, where: ALGO_IMPLEMENTATION === 'wrong' ? [] : scope.where } : { hiddenLinkTypes: scope.hiddenLinkTypes, linkTypes: scope.linkTypes });
    const idSet = kind === 'ids' ? new Set((scope.ids || []).map(id => service.resolveId(String(id)))) : null;
    const nodeViews = [];
    if (idSet) { for (const id of idSet) { const it = service.live(id); if (it?.kind === 'node') { const v = service.view(it, principal); if (v) nodeViews.push(v); } } }
    else for (const it of service.items.values()) if (it.kind === 'node' && !it.deleted && f.node(it)) { const v = service.view(it, principal); if (v) nodeViews.push(v); }
    const nodes = (await ex.guard(nodeViews, actAs)).map(n => n.id), has = new Set(nodes);
    const linkViews = [];
    for (const id of nodes) for (const l of service.incidentLinks(id)) { if (l.fromId !== id && l.fromId !== l.toId && has.has(l.fromId)) continue; if (!has.has(l.fromId) || !has.has(l.toId) || !f.link(l)) continue; const v = service.view(l, principal); if (v) linkViews.push(v); }
    const links = (await ex.guard(linkViews, actAs)).map(l => ({ id: l.id, s: l.fromId, t: l.toId, directed: l.directed !== false, type: l.type, w: weightProperty ? Number(l.properties?.[weightProperty]) : undefined }));
    for (const l of links) if (weightProperty && !Number.isFinite(l.w)) l.w = 1;
    return { nodes, links, info: { kind, nodes: nodes.length, links: links.length } };
  }
  /** permission-checked input for a scope, shared by algorithms and the Phase 2 cluster overview (same scope + graph version) */
  async function cachedInput(scope = { kind: 'all' }, who = {}, weightProperty = null) {
    const ikey = JSON.stringify([scope, who?.principal?.id, who?.actAs, weightProperty, graphVersion]);
    let input = inputs.get(ikey);
    if (!input) { input = await buildInput(scope, { ...who, weightProperty }); inputs.set(ikey, input); if (inputs.size > 4) inputs.delete(inputs.keys().next().value); }
    return input;
  }
  const sig = (algo, params, scope, who) => createHash('sha1').update(JSON.stringify([algo, params, scope, who?.principal?.id, who?.actAs, graphVersion])).digest('hex').slice(0, 16);
  async function run({ algo, params = {}, scope = { kind: 'all' } } = {}, who = {}) {
    if (!A.ALGORITHMS[algo]) throw Object.assign(new Error(`unknown algorithm "${algo}"; one of ${A.ALGORITHM_NAMES.join(', ')}`), { code: 'bad_request' });
    const key = sig(algo, params, scope, who);
    for (const r of results.values()) if (r.key === key) return { ...r, cached: true };
    const t0 = performance.now();
    // the scoped input (permission-checked node / link lists) is shared by algorithms run on the same scope + graph version
    const input = await cachedInput(scope, who, params.weightProperty || null);
    const tBuild = performance.now() - t0;
    const r = A.runAlgorithm(algo, input, params);
    const runId = `r${++seq}-${key.slice(0, 6)}`;
    const top = Object.entries(r.values).sort((a, b) => (r.kind === 'categorical' ? 0 : b[1] - a[1]) || (a[0] < b[0] ? -1 : 1)).slice(0, 20).map(([id, value]) => ({ id, value }));
    const out = { runId, key, algo, level: r.level, kind: r.kind, params: r.params, scope: { ...input.info, filter: scope.kind === 'filter' ? scope : undefined }, values: r.values,
      stats: { ...r.stats, buildMs: tBuild, totalMs: performance.now() - t0 }, top: r.kind === 'categorical' ? [] : top,
      ...(r.count != null ? { count: r.count, sizes: r.sizes?.slice(0, 50) } : {}), ...(r.modularity != null ? { modularity: r.modularity } : {}),
      ...(r.approximate != null ? { approximate: r.approximate, samples: r.samples } : {}), ...(r.path !== undefined ? { path: r.path, distance: r.distance, reachable: r.reachable } : {}),
      ...(r.node != null ? { node: r.node, candidates: r.candidates } : {}), implementation: ALGO_IMPLEMENTATION, at: new Date().toISOString(), graphVersion };
    if (out.level === 'node' && r.kind === 'categorical') out.top = [];
    results.set(runId, out); while (results.size > MAX_RESULTS) results.delete(results.keys().next().value);
    return out;
  }
  const summary = r => { const { values, key, ...rest } = r; return rest; };
  function get(runId) { return results.get(runId) || null; }
  return { run, get, summary, buildInput, cachedInput, list: () => [...results.values()].map(summary), names: A.ALGORITHM_NAMES, defs: A.ALGORITHMS, implementation: ALGO_IMPLEMENTATION };
}
