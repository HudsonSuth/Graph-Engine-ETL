// Deliberately wrong algorithms (ALGO_IMPL=wrong, SPEC §23.9): only to prove the tests catch bugs. Never the default.
//  AW1 PageRank damping 0.5 instead of the requested alpha   AW2 betweenness not normalised
//  AW3 Leiden = one level of local moving (no refinement, no aggregation)
//  AW4 Jaccard divides by |A|+|B| (no intersection subtracted) AW5 components: isolated nodes join component 0
//  AW6 degree counts outgoing links only                     AW7 (server) scope "filter" ignores where-conditions
import * as real from './algorithms.js';
export const ALGORITHMS = real.ALGORITHMS, ALGORITHM_NAMES = real.ALGORITHM_NAMES, rngOf = real.rngOf, toCsr = real.toCsr, modularity = real.modularity;
export const WRONG = true;
const fns = {
  degree: input => { const v = Object.fromEntries(input.nodes.map(id => [id, 0])); for (const l of input.links) if (l.s in v && l.t in v) v[l.s]++; return { values: v }; },
  pagerank: (input, p) => real.pagerank(input, { ...p, alpha: 0.5 }),
  betweenness: (input, p) => { const r = real.betweenness(input, p), n = input.nodes.length, s = n > 2 ? (n - 1) * (n - 2) : 1; return { ...r, values: Object.fromEntries(Object.entries(r.values).map(([k, x]) => [k, x * s])) }; },
  leiden: (input, p) => real.louvain(input, { ...p, resolution: (p.resolution ?? 1) * 3 }),
  jaccard: (input, p) => { const r = real.jaccard(input, p); if (r.level !== 'link') return r; const N = new Map(input.nodes.map(id => [id, new Set()])); for (const l of input.links) if (l.s !== l.t && N.has(l.s) && N.has(l.t)) { N.get(l.s).add(l.t); N.get(l.t).add(l.s); }
    const v = {}; for (const l of input.links) if (N.has(l.s) && N.has(l.t)) { const A = N.get(l.s), B = N.get(l.t); let i = 0; for (const x of A) if (B.has(x)) i++; v[l.id] = A.size + B.size ? i / (A.size + B.size) : 0; } return { level: 'link', values: v }; },
  components: input => { const r = real.components(input); const v = { ...r.values }; const deg = new Set(); for (const l of input.links) { deg.add(l.s); deg.add(l.t); } for (const id of input.nodes) if (!deg.has(id)) v[id] = 0; return { ...r, values: v }; },
};
export function runAlgorithm(name, input, params = {}) {
  const r = real.runAlgorithm(name, input, params);
  if (!fns[name]) return r;
  const w = fns[name](input, r.params);
  return { ...r, ...w, algo: name, level: w.level || r.level, kind: r.kind, params: r.params, stats: r.stats };
}
