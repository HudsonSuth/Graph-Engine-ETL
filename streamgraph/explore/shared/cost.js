// Approximate query cost (SPEC §24.5): a cheap estimate shown before a heavy query, algorithm, layout or bundling runs.
// Graph shape comes from counts and a degree sample; the per-operation time constants were measured on the synthetic
// 10k / 100k fixtures (explore/bench/phase2-bench.mjs, proof/phase2-perf.txt) and are refined at run time from real runs.
// wrong (SCALE_IMPL=wrong): CW1 the neighbourhood estimate ignores hops beyond the first; CW2 betweenness is always priced
// as sampled.
const ENV_WRONG = typeof process !== 'undefined' && process.env?.SCALE_IMPL === 'wrong'; // SPEC §24.7 deliberately wrong build (Node); the browser passes it explicitly
export const NS_PER_OP = { degree: 600, pagerank: 115, louvain: 650, leiden: 260, components: 4100, betweenness: 34, shortest_path: 1500, jaccard: 215, neighborhood: 2500, overview: 4000, layout_force: 25, layout_simple: 400, bundle: 22 };
export const levelOf = ms => (ms < 300 ? 'low' : ms < 2000 ? 'medium' : 'high');

/** Graph shape: n, m, mean degree, mean excess degree (E[d^2]/E[d] - 1: how many new neighbours one more hop reaches). */
export function shapeOf(n, m, degreeSample = []) {
  const k = degreeSample.length ? degreeSample.reduce((a, b) => a + b, 0) / degreeSample.length : n ? (2 * m) / n : 0;
  const k2 = degreeSample.length ? degreeSample.reduce((a, b) => a + b * b, 0) / degreeSample.length : k * k + k;
  return { n, m, meanDegree: k, excessDegree: k > 0 ? Math.max(0, k2 / k - 1) : 0 };
}
/** Neighbourhood estimate: hop 1 = sum of the seeds' real degrees, each further hop multiplies by the excess degree,
 *  saturating as the reached set approaches n (1 - e^-x). */
export function estimateNeighborhood(shape, { seedDegrees = [], hops = 1, maxNodes = Infinity, wrong = ENV_WRONG } = {}) {
  let reached = seedDegrees.length, frontier = seedDegrees.reduce((a, b) => a + b, 0);
  const H = wrong ? Math.min(1, hops) : hops; // CW1
  for (let h = 1; h <= H && frontier > 0; h++) {
    const room = Math.max(0, shape.n - reached), add = room * (1 - Math.exp(-frontier / Math.max(1, room)));
    reached += add; frontier = add * shape.excessDegree;
  }
  const estNodes = Math.round(Math.min(reached, maxNodes, shape.n)), estLinks = Math.round(Math.min(shape.m, (estNodes * shape.meanDegree) / 2));
  const ops = estNodes + estLinks, estMs = (ops * NS_PER_OP.neighborhood) / 1e6;
  return { estNodes, estLinks, ops, estMs, level: levelOf(estMs), truncated: reached > maxNodes };
}
/** Algorithm estimate on a scope of n nodes / m links. */
export function estimateAlgorithm(algo, n, m, params = {}, { wrong = ENV_WRONG, shape = null } = {}) {
  const nm = n + m; let ops = nm, approximate = false;
  switch (algo) {
    case 'pagerank': ops = 30 * nm; break;
    case 'louvain': ops = 8 * nm; break;
    case 'leiden': ops = 6 * nm * (params.iterations ?? 2); break;
    case 'betweenness': { const exactMax = params.exactMax ?? 2000; approximate = wrong || n > exactMax; ops = (approximate ? Math.min(n, params.samples ?? 256) : n) * nm; break; } // CW2
    case 'jaccard': ops = params.node ? nm : n * Math.pow(shape?.excessDegree ?? (n ? (2 * m) / n : 0), 2) + m; break;
    default: ops = nm;
  }
  const estMs = (ops * (NS_PER_OP[algo] ?? 100)) / 1e6;
  return { algo, nodes: n, links: m, ops: Math.round(ops), estMs, level: levelOf(estMs), approximate };
}
/** Client-side work: layout and bundling. */
export function estimateLayout(kind, n, m) { // calibrated on 10k/100k (proof/phase2-perf.txt): force ~25 ns x 20 per op, group-in-a-box ~0.4 of that (smaller boxes), the rest ~n log n
  const iters = n < 500 ? 400 : n < 3000 ? 200 : n < 20000 ? 120 : 60, heavy = kind === 'force' || kind === 'community' || kind === 'structural';
  const ops = heavy ? iters * (n * Math.log2(n + 2) + m) : n * Math.log2(n + 2) + m;
  const estMs = (ops * (heavy ? NS_PER_OP.layout_force * 20 * (kind === 'community' ? 0.4 : 1) : NS_PER_OP.layout_simple)) / 1e6;
  return { kind, nodes: n, links: m, ops: Math.round(ops), estMs, level: levelOf(estMs) };
}
export function estimateBundling(edges, { cycles = 5, I0 = 50, meanCompatible = 8 } = {}) {
  let work = 0, P = 1, I = I0; for (let c = 0; c < cycles; c++) { if (c) { P *= 2; I = Math.max(1, Math.round(I * 2 / 3)); } work += I * P * (1 + meanCompatible); }
  const ops = edges * work + edges * 40, estMs = (ops * NS_PER_OP.bundle) / 1e6;
  return { edges, ops: Math.round(ops), estMs, level: levelOf(estMs) };
}
