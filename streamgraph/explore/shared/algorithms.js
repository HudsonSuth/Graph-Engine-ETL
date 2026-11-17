// Graph algorithms for the Phase 1 core loop (SPEC §23.5). Pure functions over a plain input
//   { nodes: [id], links: [{ id, s, t, directed?, w? }] }
// so the server can run them on the whole graph or on any filtered / visible / selected subgraph.
// Libraries (all MIT, see explore/LICENSES.md): graphology, graphology-metrics (PageRank),
// graphology-communities-louvain (Louvain), graphology-components (connected components),
// graphology-shortest-path (shortest paths). Written here from the published papers (no third-party code copied):
// Leiden (Traag, Waltman & van Eck 2019), Brandes betweenness with optional source sampling (Brandes 2001;
// Brandes & Pich 2007), Jaccard similarity, modularity.
import Graph from 'graphology';
import pagerankLib from 'graphology-metrics/centrality/pagerank.js';
import louvainLib from 'graphology-communities-louvain';
import { connectedComponents } from 'graphology-components';
import { bidirectional } from 'graphology-shortest-path/unweighted.js';
import { singleSourceLength } from 'graphology-shortest-path/unweighted.js';
import dijkstra from 'graphology-shortest-path/dijkstra.js';

export const ALGORITHMS = {
  degree: { level: 'node', kind: 'numeric', title: 'Degree', params: {} },
  pagerank: { level: 'node', kind: 'numeric', title: 'PageRank', params: { alpha: 0.85, directed: true } },
  betweenness: { level: 'node', kind: 'numeric', title: 'Betweenness (exact up to exactMax nodes, sampled above)', params: { exactMax: 2000, samples: 256, seed: 1 } },
  louvain: { level: 'node', kind: 'categorical', title: 'Louvain communities', params: { resolution: 1, seed: 1 } },
  leiden: { level: 'node', kind: 'categorical', title: 'Leiden communities', params: { resolution: 1, seed: 1, iterations: 2, theta: 0.01 } },
  components: { level: 'node', kind: 'categorical', title: 'Connected components', params: {} },
  shortest_path: { level: 'node', kind: 'numeric', title: 'Shortest path / hop distance from a source', params: { source: null, target: null, weightProperty: null } },
  jaccard: { level: 'link', kind: 'numeric', title: 'Jaccard similarity (per link, or top-k similar to one node)', params: { node: null, k: 20 } },
};
export const ALGORITHM_NAMES = Object.keys(ALGORITHMS);

/** Small seeded PRNG (mulberry32) so community detection and sampling are reproducible. */
export function rngOf(seed = 1) { let a = (Number(seed) >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Undirected simple weighted CSR (parallel links summed, self-loops dropped). */
export function toCsr(input) {
  const ids = input.nodes, n = ids.length, index = new Map(ids.map((id, i) => [id, i]));
  const pair = new Map(); // key i*n+j (i<j) -> weight
  for (const l of input.links) {
    const a = index.get(l.s), b = index.get(l.t);
    if (a === undefined || b === undefined || a === b) continue;
    const i = Math.min(a, b), j = Math.max(a, b), k = i * n + j, w = Number.isFinite(l.w) ? l.w : 1;
    pair.set(k, (pair.get(k) || 0) + w);
  }
  const deg = new Int32Array(n);
  for (const k of pair.keys()) { deg[Math.floor(k / n)]++; deg[k % n]++; }
  const start = new Int32Array(n + 1); for (let i = 0; i < n; i++) start[i + 1] = start[i] + deg[i];
  const to = new Int32Array(start[n]), w = new Float64Array(start[n]), fill = start.slice(0, n);
  for (const [k, x] of pair) { const i = Math.floor(k / n), j = k % n; to[fill[i]] = j; w[fill[i]++] = x; to[fill[j]] = i; w[fill[j]++] = x; }
  const strength = new Float64Array(n); let m2 = 0;
  for (let i = 0; i < n; i++) { let s = 0; for (let e = start[i]; e < start[i + 1]; e++) s += w[e]; strength[i] = s; m2 += s; }
  return { n, ids, index, start, to, w, strength, m2 };
}
function simpleGraph(input, { directed = false } = {}) {
  const g = new Graph({ type: directed ? 'directed' : 'undirected', multi: false, allowSelfLoops: false });
  for (const id of input.nodes) g.addNode(id);
  for (const l of input.links) {
    if (l.s === l.t || !g.hasNode(l.s) || !g.hasNode(l.t)) continue;
    const add = (a, b) => { if (g.hasEdge(a, b)) g.updateEdgeAttribute(a, b, 'weight', x => x + (Number.isFinite(l.w) ? l.w : 1)); else g.addEdge(a, b, { weight: Number.isFinite(l.w) ? l.w : 1, id: l.id }); };
    add(l.s, l.t); if (directed && l.directed === false) add(l.t, l.s);
  }
  return g;
}

// ---------------------------------------------------------------- centrality
export function degree(input) {
  const v = Object.fromEntries(input.nodes.map(id => [id, 0])), has = new Set(input.nodes);
  for (const l of input.links) { if (!has.has(l.s) || !has.has(l.t)) continue; v[l.s]++; v[l.t]++; }
  return { values: v };
}
export function pagerank(input, { alpha = 0.85, directed = true } = {}) {
  if (!input.nodes.length) return { values: {} };
  const g = simpleGraph(input, { directed });
  return { values: pagerankLib(g, { alpha, getEdgeWeight: null, maxIterations: 500, tolerance: 1e-10 }), params: { alpha, directed } };
}
/** Brandes betweenness on the undirected simple graph, normalised like networkx (2/((n-1)(n-2)) per unordered pair).
 *  n <= exactMax: exact (every node is a source). Above: `samples` random sources, scaled by n/k (Brandes & Pich 2007). */
export function betweenness(input, { exactMax = 2000, samples = 256, seed = 1 } = {}) {
  const G = toCsr(input), n = G.n, bc = new Float64Array(n);
  let sources, approximate = false;
  if (n <= exactMax || samples >= n) sources = Array.from({ length: n }, (_, i) => i);
  else { approximate = true; const r = rngOf(seed), perm = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; } sources = perm.slice(0, samples); }
  const sigma = new Float64Array(n), dist = new Int32Array(n), delta = new Float64Array(n), order = new Int32Array(n), queue = new Int32Array(n);
  for (const s of sources) {
    dist.fill(-1); sigma.fill(0); delta.fill(0);
    dist[s] = 0; sigma[s] = 1; let qh = 0, qt = 0, on = 0; queue[qt++] = s;
    while (qh < qt) { const v = queue[qh++]; order[on++] = v; for (let e = G.start[v]; e < G.start[v + 1]; e++) { const u = G.to[e]; if (dist[u] < 0) { dist[u] = dist[v] + 1; queue[qt++] = u; } if (dist[u] === dist[v] + 1) sigma[u] += sigma[v]; } }
    for (let k = on - 1; k > 0; k--) { const w = order[k]; for (let e = G.start[w]; e < G.start[w + 1]; e++) { const v = G.to[e]; if (dist[v] === dist[w] - 1) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]); } bc[w] += delta[w]; }
  }
  let scale = n > 2 ? 1 / ((n - 1) * (n - 2)) : 1; if (approximate) scale *= n / sources.length;
  const values = {}; for (let i = 0; i < n; i++) values[G.ids[i]] = bc[i] * scale;
  return { values, approximate, samples: sources.length, exactMax };
}

// ---------------------------------------------------------------- communities
/** Newman-Girvan modularity with resolution gamma on the undirected simple weighted graph. */
export function modularity(input, membership, gamma = 1, G = toCsr(input)) {
  if (!G.m2) return 0;
  const inW = new Map(), K = new Map();
  for (let i = 0; i < G.n; i++) {
    const ci = membership[G.ids[i]]; K.set(ci, (K.get(ci) || 0) + G.strength[i]);
    for (let e = G.start[i]; e < G.start[i + 1]; e++) if (membership[G.ids[G.to[e]]] === ci) inW.set(ci, (inW.get(ci) || 0) + G.w[e]);
  }
  let q = 0; for (const [c, k] of K) q += (inW.get(c) || 0) / G.m2 - gamma * (k / G.m2) ** 2;
  return q;
}
const renumberBySize = (ids, comm) => { // community labels 0..k-1, largest first (ties by smallest member index)
  const size = new Map(), first = new Map(); comm.forEach((c, i) => { size.set(c, (size.get(c) || 0) + 1); if (!first.has(c)) first.set(c, i); });
  const order = [...size.keys()].sort((a, b) => size.get(b) - size.get(a) || first.get(a) - first.get(b)), map = new Map(order.map((c, i) => [c, i]));
  const values = {}; ids.forEach((id, i) => { values[id] = map.get(comm[i]); }); return { values, count: order.length, sizes: order.map(c => size.get(c)) };
};
export function louvain(input, { resolution = 1, seed = 1 } = {}) {
  const g = simpleGraph(input);
  if (!g.size) { const r = renumberBySize(input.nodes, input.nodes.map((_, i) => i)); return { ...r, modularity: 0 }; }
  const res = louvainLib.detailed(g, { resolution, rng: rngOf(seed), getEdgeWeight: 'weight' });
  const r = renumberBySize(input.nodes, input.nodes.map(id => res.communities[id]));
  return { ...r, modularity: modularity(input, r.values, resolution), params: { resolution, seed } };
}

/**
 * Leiden (Traag, Waltman & van Eck, "From Louvain to Leiden: guaranteeing well-connected communities", Sci Rep 2019),
 * modularity quality with resolution gamma. Phases per level: fast local moving (queue), refinement (merge only
 * well-connected singletons into well-connected sub-communities, randomised with temperature theta), aggregation on
 * the refined partition with the non-refined partition as the starting point. Communities are guaranteed connected.
 */
export function leiden(input, { resolution = 1, seed = 1, iterations = 2, theta = 0.01, maxLevels = 64 } = {}) {
  const G0 = toCsr(input), n0 = G0.n, rnd = rngOf(seed), gamma = resolution;
  if (!G0.m2) { const r = renumberBySize(input.nodes, input.nodes.map((_, i) => i)); return { ...r, modularity: 0 }; }
  const m2 = G0.m2;
  let memb = Int32Array.from({ length: n0 }, (_, i) => i);
  for (let it = 0; it < iterations; it++) {
    const before = memb.slice();
    let G = { n: n0, start: G0.start, to: G0.to, w: G0.w, K: G0.strength };
    let P = memb.slice(), nodeMap = Int32Array.from({ length: n0 }, (_, i) => i);
    for (let level = 0; level < maxLevels; level++) {
      P = moveNodesFast(G, P, gamma, m2, rnd);
      const nc = new Set(P).size;
      if (nc === G.n) break;
      let Pref = refine(G, P, gamma, m2, rnd, theta);
      if (new Set(Pref).size === G.n) Pref = P; // nothing merged: aggregate on the non-refined partition (as leidenalg does)
      const { G: G2, map } = aggregate(G, Pref);
      const P2 = new Int32Array(G2.n); for (let v = 0; v < G.n; v++) P2[map[v]] = P[v];
      for (let i = 0; i < n0; i++) nodeMap[i] = map[nodeMap[i]];
      G = G2; P = P2;
    }
    for (let i = 0; i < n0; i++) memb[i] = P[nodeMap[i]];
    memb = Int32Array.from(renumberArr(memb));
    if (it > 0 && before.every((c, i) => c === memb[i])) break;
  }
  const r = renumberBySize(input.nodes, [...memb]);
  return { ...r, modularity: modularity(input, r.values, gamma, G0), params: { resolution, seed, iterations, theta } };
}
function renumberArr(a) { const m = new Map(); return Array.from(a, c => { if (!m.has(c)) m.set(c, m.size); return m.get(c); }); }
function shuffled(n, rnd) { const p = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p; }
/** Fast local moving: visit nodes from a queue; a node that moves re-queues neighbours outside its new community. */
function moveNodesFast(G, P0, gamma, m2, rnd) {
  const n = G.n, P = renumberArr(P0), K = new Float64Array(n + 1); let nextFree = [];
  for (let v = 0; v < n; v++) K[P[v]] += G.K[v];
  const used = new Uint8Array(n + 1); for (const c of P) used[c] = 1; for (let c = n - 1; c >= 0; c--) if (!used[c]) nextFree.push(c);
  const size = new Int32Array(n + 1); for (const c of P) size[c]++;
  const queue = shuffled(n, rnd), inQ = new Uint8Array(n).fill(1); let qh = 0;
  const wTo = new Float64Array(n + 1), touched = [];
  while (qh < queue.length) {
    const v = queue[qh++]; inQ[v] = 0; const old = P[v], kv = G.K[v];
    for (let e = G.start[v]; e < G.start[v + 1]; e++) { const c = P[G.to[e]]; if (wTo[c] === 0) touched.push(c); wTo[c] += G.w[e]; }
    K[old] -= kv; size[old]--;
    let best = old, bestScore = wTo[old] - gamma * kv * K[old] / m2;
    for (const c of touched) { if (c === old) continue; const s = wTo[c] - gamma * kv * K[c] / m2; if (s > bestScore + 1e-12) { bestScore = s; best = c; } }
    if (bestScore < -1e-12 && size[old] > 0) { best = nextFree.length ? nextFree.pop() : old; } // an empty community scores 0
    for (const c of touched) wTo[c] = 0; touched.length = 0;
    K[best] += kv; size[best]++;
    if (size[old] === 0 && old !== best) nextFree.push(old);
    if (best !== old) { P[v] = best; for (let e = G.start[v]; e < G.start[v + 1]; e++) { const u = G.to[e]; if (P[u] !== best && !inQ[u]) { inQ[u] = 1; queue.push(u); } } }
  }
  return Int32Array.from(renumberArr(P));
}
/** Refinement: within each community S of P, merge singletons that are well connected to S into well-connected sub-communities. */
function refine(G, P, gamma, m2, rnd, theta) {
  const n = G.n, R = Int32Array.from({ length: n }, (_, i) => i), KR = Float64Array.from(G.K), sizeR = new Int32Array(n).fill(1), ext = new Float64Array(n);
  const members = new Map(); for (let v = 0; v < n; v++) { if (!members.has(P[v])) members.set(P[v], []); members.get(P[v]).push(v); }
  const KS = new Map(); for (const [c, vs] of members) KS.set(c, vs.reduce((s, v) => s + G.K[v], 0));
  for (let v = 0; v < n; v++) { let x = 0; for (let e = G.start[v]; e < G.start[v + 1]; e++) { const u = G.to[e]; if (u !== v && P[u] === P[v]) x += G.w[e]; } ext[v] = x; }
  const wTo = new Float64Array(n), touched = [];
  for (const [c, vs] of members) {
    if (vs.length === 1) continue;
    const ks = KS.get(c);
    const order = vs.filter(v => ext[v] >= gamma * G.K[v] * (ks - G.K[v]) / m2); // well-connected nodes only
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (const v of order) {
      if (sizeR[R[v]] !== 1) continue; // only singletons move
      for (let e = G.start[v]; e < G.start[v + 1]; e++) { const u = G.to[e]; if (u === v || P[u] !== c) continue; const r = R[u]; if (wTo[r] === 0) touched.push(r); wTo[r] += G.w[e]; }
      const own = R[v], kv = G.K[v], cands = [[own, 0]];
      for (const r of touched) {
        if (r === own) continue;
        if (ext[r] < gamma * KR[r] * (ks - KR[r]) / m2) continue; // target sub-community must be well connected
        const dh = wTo[r] - gamma * kv * KR[r] / m2;
        if (dh >= 0) cands.push([r, dh]);
      }
      let pick = own;
      if (cands.length > 1) {
        const mx = Math.max(...cands.map(x => x[1])), ws = cands.map(([, d]) => Math.exp((d - mx) / theta)), tot = ws.reduce((a, b) => a + b, 0);
        let x = rnd() * tot; for (let i = 0; i < cands.length; i++) { x -= ws[i]; if (x <= 0) { pick = cands[i][0]; break; } }
        if (x > 0) pick = cands[cands.length - 1][0];
      }
      if (pick !== own) {
        const wv = wTo[pick];
        ext[pick] = ext[pick] + ext[own] - 2 * wv; KR[pick] += kv; sizeR[pick]++; sizeR[own] = 0; KR[own] = 0; R[v] = pick;
      }
      for (const r of touched) wTo[r] = 0; touched.length = 0;
    }
  }
  return Int32Array.from(renumberArr(R));
}
function aggregate(G, Pref) {
  const k = Math.max(-1, ...Pref) + 1, K = new Float64Array(k), maps = Array.from({ length: k }, () => new Map());
  for (let v = 0; v < G.n; v++) {
    const cv = Pref[v]; K[cv] += G.K[v];
    for (let e = G.start[v]; e < G.start[v + 1]; e++) { const cu = Pref[G.to[e]]; if (cu !== cv) maps[cv].set(cu, (maps[cv].get(cu) || 0) + G.w[e]); }
  }
  const start = new Int32Array(k + 1); for (let c = 0; c < k; c++) start[c + 1] = start[c] + maps[c].size;
  const to = new Int32Array(start[k]), w = new Float64Array(start[k]);
  for (let c = 0; c < k; c++) { let e = start[c]; for (const [u, x] of maps[c]) { to[e] = u; w[e++] = x; } }
  return { G: { n: k, start, to, w, K }, map: Pref };
}

export function components(input) {
  const g = simpleGraph(input), comps = connectedComponents(g).sort((a, b) => b.length - a.length || (a[0] < b[0] ? -1 : 1));
  const values = {}; comps.forEach((c, i) => c.forEach(id => { values[id] = i; }));
  return { values, count: comps.length, sizes: comps.map(c => c.length) };
}

// ---------------------------------------------------------------- paths + similarity
/** Hop distance (or weighted distance) from `source` to every reachable node, plus the shortest path to `target`. */
export function shortestPath(input, { source, target = null, weightProperty = null, directed = false } = {}) {
  const g = simpleGraph(input, { directed });
  if (!g.hasNode(source)) throw Object.assign(new Error(`source ${source} is not in the scope`), { code: 'bad_request' });
  if (weightProperty) {
    const w = new Map(input.links.map(l => [l.id, Number.isFinite(l.w) ? l.w : 1]));
    g.forEachEdge((e, a) => { g.setEdgeAttribute(e, 'cost', w.get(a.id) ?? a.weight); });
    const paths = dijkstra.singleSource(g, source, 'cost'), values = {};
    for (const [id, p] of Object.entries(paths)) { let d = 0; for (let i = 1; i < p.length; i++) d += g.getEdgeAttribute(p[i - 1], p[i], 'cost'); values[id] = d; }
    const path = target && paths[target] ? paths[target] : null;
    return { values, path, distance: target ? values[target] ?? null : null, reachable: Object.keys(values).length };
  }
  const values = singleSourceLength(g, source);
  const path = target && g.hasNode(target) ? bidirectional(g, source, target) : null;
  return { values, path, distance: path ? path.length - 1 : null, reachable: Object.keys(values).length };
}
const nbrSets = input => { const s = new Map(input.nodes.map(id => [id, new Set()])); for (const l of input.links) { if (l.s === l.t || !s.has(l.s) || !s.has(l.t)) continue; s.get(l.s).add(l.t); s.get(l.t).add(l.s); } return s; };
export const jaccardOf = (A, B) => { if (!A.size && !B.size) return 0; let i = 0; const [x, y] = A.size < B.size ? [A, B] : [B, A]; for (const v of x) if (y.has(v)) i++; return i / (A.size + B.size - i); };
/** Jaccard similarity |N(u)∩N(v)| / |N(u)∪N(v)| (networkx jaccard_coefficient convention: open neighbourhoods).
 *  Default: one value per link (its two ends). With `node`: the k most similar nodes within two hops. */
export function jaccard(input, { node = null, k = 20 } = {}) {
  const N = nbrSets(input);
  if (node != null) {
    if (!N.has(node)) throw Object.assign(new Error(`node ${node} is not in the scope`), { code: 'bad_request' });
    const A = N.get(node), cand = new Set(); for (const u of A) for (const v of N.get(u)) if (v !== node) cand.add(v);
    const values = {}; for (const v of cand) values[v] = jaccardOf(A, N.get(v));
    const top = Object.entries(values).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, k);
    return { level: 'node', values: Object.fromEntries(top), node, candidates: cand.size };
  }
  const values = {}; for (const l of input.links) if (N.has(l.s) && N.has(l.t)) values[l.id] = l.s === l.t ? 1 : jaccardOf(N.get(l.s), N.get(l.t));
  return { level: 'link', values };
}

/** Run one algorithm by name. Returns { algo, level, kind, values, stats, ...extras }. */
export function runAlgorithm(name, input, params = {}) {
  const def = ALGORITHMS[name]; if (!def) throw Object.assign(new Error(`unknown algorithm ${name}; one of ${ALGORITHM_NAMES.join(', ')}`), { code: 'bad_request' });
  const p = { ...def.params, ...Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')) };
  const fn = { degree, pagerank, betweenness, louvain, leiden, components, shortest_path: shortestPath, jaccard }[name];
  const t0 = performance.now(), r = fn(input, p), ms = performance.now() - t0;
  const level = r.level || def.level, vals = Object.values(r.values);
  let min = Infinity, max = -Infinity, sum = 0; for (const x of vals) { if (x < min) min = x; if (x > max) max = x; sum += x; }
  return { ...r, algo: name, level, kind: def.kind, params: p, stats: { count: vals.length, min: vals.length ? min : null, max: vals.length ? max : null, mean: vals.length ? sum / vals.length : null, ms, nodes: input.nodes.length, links: input.links.length } };
}
