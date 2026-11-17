// Phase 2 "scale and readability", server side (SPEC §24): cluster overview for semantic zoom (server-side aggregation,
// so the browser can draw an overview of a graph it does not hold), cluster membership for expand-on-click, and
// approximate cost estimates. Everything is built from the permissioned read model through algoService.buildInput, so
// clusters and counts only ever include what the principal may see.
// SCALE_IMPL=wrong swaps in the deliberately wrong aggregation / cost model (SPEC §24.7).
import { aggregate, clusterPositions, OTHER } from '../shared/clusters.js';
import { shapeOf, estimateNeighborhood, estimateAlgorithm, estimateLayout, estimateBundling, NS_PER_OP, levelOf } from '../shared/cost.js';
import { displayLabel } from '../shared/model.js';

export const SCALE_IMPLEMENTATION = process.env.SCALE_IMPL === 'wrong' ? 'wrong' : 'correct';
export const SCALE_LIMITS = { maxClusters: 2000, defaultClusters: 300, membershipMax: 60000, membersMax: 20000 };
const COMMUNITY = ['louvain', 'leiden', 'components'];

export function scaleService(ex) {
  const { service } = ex, wrong = SCALE_IMPLEMENTATION === 'wrong';
  let version = 0; const cache = new Map();
  service.on('change', () => { version++; cache.clear(); });

  const keyFor = ({ by = 'louvain', scope = { kind: 'all' }, maxClusters = SCALE_LIMITS.defaultClusters, seed = 1 }, who) =>
    JSON.stringify([by, scope, Math.max(1, Math.min(SCALE_LIMITS.maxClusters, Number(maxClusters) || SCALE_LIMITS.defaultClusters)), seed, who?.principal?.id, who?.actAs, version]);
  /** Group assignment for every node in scope: { values: id -> key, runId?, by } */
  async function groups(by, input, scope, who, seed) {
    if (COMMUNITY.includes(by)) { const r = await ex.algo.run({ algo: by, params: by === 'components' ? {} : { seed }, scope }, who); return { values: r.values, runId: r.runId, modularity: r.modularity ?? null }; }
    if (String(by).startsWith('run:')) { const r = ex.algo.get(by.slice(4)); if (!r || r.kind !== 'categorical') throw Object.assign(new Error(`no categorical result ${by.slice(4)}`), { code: 'bad_request' }); return { values: r.values, runId: r.runId }; }
    const values = {};
    if (by === 'type') for (const id of input.nodes) values[id] = service.live(id)?.type ?? '';
    else if (String(by).startsWith('property:')) { const prop = by.slice(9); for (const id of input.nodes) { const it = service.live(id); const v = it ? service.view(it, who.principal)?.properties?.[prop] : undefined; values[id] = v == null ? '(none)' : typeof v === 'object' ? JSON.stringify(v) : String(v); } }
    else throw Object.assign(new Error(`unknown grouping "${by}"; use louvain, leiden, components, type, property:<name> or run:<runId>`), { code: 'bad_request' });
    return { values };
  }

  /** Cluster overview: clusters with counts, labels and seeded positions, meta-edges with counts. */
  async function overview({ by = 'louvain', scope = { kind: 'all' }, maxClusters = SCALE_LIMITS.defaultClusters, seed = 1, membership = false } = {}, who = {}) {
    maxClusters = Math.max(1, Math.min(SCALE_LIMITS.maxClusters, Number(maxClusters) || SCALE_LIMITS.defaultClusters));
    const key = keyFor({ by, scope, maxClusters, seed }, who);
    let base = cache.get(key); const t0 = performance.now(), cached = !!base;
    if (!base) {
      const input = await ex.algo.cachedInput(scope, who), tIn = performance.now() - t0;
      const g = await groups(by, input, scope, who, seed), tGroup = performance.now() - t0 - tIn;
      const nodes = input.nodes.map(id => { const it = service.live(id); return { id, type: it?.type, label: it ? displayLabel(it) : id, group: g.values[id] }; });
      const agg = aggregate({ nodes, links: input.links }, { maxClusters, wrong,
        labelOf: (k, c, top) => (k === OTHER ? `Other (${c.count} in small groups)` : COMMUNITY.includes(by) || by.startsWith('run:') ? `${by === 'components' ? 'Component' : 'Community'} ${k}${top[0] ? ' · ' + top[0].label : ''}` : `${by === 'type' ? '' : by.slice(9) + ' = '}${k}`) });
      const pos = clusterPositions(agg.clusters, agg.metaEdges, { seed, unit: 10 });
      for (const c of agg.clusters) { const p = pos.get(c.id); Object.assign(c, { x: +p.x.toFixed(2), y: +p.y.toFixed(2), r: +p.r.toFixed(2) }); }
      base = { by, runId: g.runId ?? null, modularity: g.modularity ?? null, clusters: agg.clusters, metaEdges: agg.metaEdges, keyOf: agg.keyOf,
        totals: { nodes: input.nodes.length, links: input.links.length, clusters: agg.clusters.length, metaEdges: agg.metaEdges.length },
        timings: { inputMs: tIn, groupMs: tGroup, aggregateMs: agg.ms, totalMs: performance.now() - t0 }, version, implementation: SCALE_IMPLEMENTATION };
      cache.set(key, base); while (cache.size > 8) cache.delete(cache.keys().next().value);
    }
    const { keyOf, ...out } = base;
    if (membership) { if (keyOf.size > SCALE_LIMITS.membershipMax) out.membershipTruncated = true; else out.membership = Object.fromEntries([...keyOf].map(([id, k]) => ['' + id, 'c:' + k])); }
    return { ...out, cached, ms: performance.now() - t0 };
  }
  /** Member ids of one cluster (ordered by degree, capped) for expand-on-click. */
  async function members({ cluster, max = 5000, ...o } = {}, who = {}) {
    const ov = await overview(o, who), base = cache.get(keyFor(o, who)), k = String(cluster).replace(/^c:/, '');
    if (!ov.clusters.some(c => c.key === k)) throw Object.assign(new Error(`no cluster ${cluster}`), { code: 'not_found' });
    const ids = [...base.keyOf].filter(([, kk]) => kk === k).map(([id]) => id);
    const deg = id => service.incidentLinks(id).length;
    ids.sort((a, b) => deg(b) - deg(a) || (a < b ? -1 : 1));
    const cap = Math.max(1, Math.min(SCALE_LIMITS.membersMax, Number(max) || 5000));
    return { cluster: 'c:' + k, count: ids.length, ids: ids.slice(0, cap), truncated: ids.length > cap };
  }

  // ---- cost estimates (SPEC §24.5)
  const shapes = new Map(); // permissioned shape per (principal, version): counts never include items the caller may not see
  async function shape(who = {}) {
    const k = JSON.stringify([who?.principal?.id, who?.actAs, version]);
    if (!shapes.has(k)) {
      const inp = await ex.algo.cachedInput({ kind: 'all' }, who), deg = new Map();
      for (const l of inp.links) { deg.set(l.s, (deg.get(l.s) || 0) + 1); deg.set(l.t, (deg.get(l.t) || 0) + 1); }
      const step = Math.max(1, Math.floor(inp.nodes.length / 2000)), sampleDeg = []; // every k-th node (deterministic), up to 2,000
      for (let i = 0; i < inp.nodes.length; i += step) sampleDeg.push(deg.get(inp.nodes[i]) || 0);
      shapes.clear(); shapes.set(k, { ...shapeOf(inp.nodes.length, inp.links.length, sampleDeg), deg });
    }
    return shapes.get(k);
  }
  async function estimate(b = {}, who = {}) {
    const { deg, ...sh } = await shape(who), op = b.op || 'algo';
    if (op === 'neighborhood') {
      const seeds = (Array.isArray(b.seeds) ? b.seeds : [b.seeds]).filter(x => x != null).map(String);
      const seedDegrees = seeds.map(id => deg.get(service.resolveId(id))).filter(d => d != null); // unknown / invisible seeds count as nothing
      return { op, ...estimateNeighborhood(sh, { seedDegrees, hops: Math.max(0, Math.min(6, Number(b.hops ?? 1))), maxNodes: Number(b.maxNodes) || Infinity, wrong }), shape: sh };
    }
    if (op === 'algo') {
      const scope = b.scope || { kind: 'all' };
      let n = sh.n, m = sh.m;
      if (scope.kind === 'ids') { n = (scope.ids || []).length; m = Math.round(Math.min(sh.m, (n * sh.meanDegree) / 2 * Math.min(1, n / Math.max(1, sh.n)) + n)); }
      else if (scope.kind === 'filter' && (scope.types?.length || scope.hiddenTypes?.length || scope.where?.length)) { const inp = await ex.algo.cachedInput(scope, who); n = inp.nodes.length; m = inp.links.length; }
      const est = estimateAlgorithm(b.algo, n, m, b.params || {}, { wrong, shape: sh });
      // refine the time constant from this server's own recent runs of the same algorithm (median ns per op)
      const seen = ex.algo.list().filter(r => r.algo === b.algo && r.stats?.ms > 5 && r.scope?.nodes).slice(-5).map(r => (r.stats.ms * 1e6) / Math.max(1, estimateAlgorithm(b.algo, r.scope.nodes, r.scope.links, r.params || {}, { shape: sh }).ops)).sort((x, y) => x - y);
      if (seen.length) { est.estMs = (est.ops * seen[seen.length >> 1]) / 1e6; est.level = levelOf(est.estMs); est.basis = `observed (${seen.length} run${seen.length > 1 ? 's' : ''})`; } else est.basis = 'default constants';
      return { op, ...est };
    }
    if (op === 'overview') { const ops = sh.n + sh.m, base = COMMUNITY.includes(b.by ?? 'louvain') ? estimateAlgorithm(b.by ?? 'louvain', sh.n, sh.m).estMs : 0, estMs = base + (ops * NS_PER_OP.overview) / 1e6; return { op, nodes: sh.n, links: sh.m, ops, estMs, level: levelOf(estMs) }; }
    if (op === 'layout') return { op, ...estimateLayout(b.kind || 'force', Number(b.nodes ?? sh.n), Number(b.links ?? sh.m)) };
    if (op === 'bundle') return { op, ...estimateBundling(Number(b.edges ?? sh.m)) };
    throw Object.assign(new Error(`unknown op "${op}"; use neighborhood, algo, overview, layout or bundle`), { code: 'bad_request' });
  }
  return { overview, members, estimate, shape, implementation: SCALE_IMPLEMENTATION, limits: SCALE_LIMITS };
}
