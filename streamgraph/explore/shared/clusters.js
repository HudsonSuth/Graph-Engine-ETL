// Cluster aggregation for semantic zoom (SPEC §24.1-§24.2). Pure functions over a plain input so the server can build the
// overview without the client holding the graph:
//   input  { nodes: [{ id, type?, label?, group }], links: [{ id?, s, t, type? }] }
//   output { clusters: [{ id, key, label, count, types, top, internal }], metaEdges: [{ id, source, target, count, types }] }
// Meta-edges are undirected and count every link whose two ends fall in different clusters (parallel links counted).
// opts.wrong (SCALE_IMPL=wrong, SPEC §24.7): SW1 meta-edges only count links whose source cluster sorts before the target
// cluster; SW2 cluster counts drop nodes that have no links.
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { rng } from './layouts.js';

const ENV_WRONG = typeof process !== 'undefined' && process.env?.SCALE_IMPL === 'wrong'; // SPEC §24.7 deliberately wrong build (Node); the browser passes it explicitly
export const OTHER = '__other';
export function aggregate({ nodes, links }, { maxClusters = 300, wrong = ENV_WRONG, labelOf = null } = {}) {
  const t0 = performance.now();
  const size = new Map(); for (const n of nodes) { const k = String(n.group ?? OTHER); size.set(k, (size.get(k) || 0) + 1); }
  // keep the biggest maxClusters groups; the rest fold into "other"
  const keep = new Set([...size].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, maxClusters).map(([k]) => k));
  const keyOf = new Map(), deg = new Map();
  for (const n of nodes) { const k = String(n.group ?? OTHER); keyOf.set(n.id, keep.has(k) ? k : OTHER); }
  for (const l of links) { if (!keyOf.has(l.s) || !keyOf.has(l.t)) continue; deg.set(l.s, (deg.get(l.s) || 0) + 1); deg.set(l.t, (deg.get(l.t) || 0) + 1); }
  const C = new Map(), get = k => { if (!C.has(k)) C.set(k, { key: k, count: 0, types: {}, internal: 0, best: [] }); return C.get(k); };
  for (const n of nodes) {
    const c = get(keyOf.get(n.id));
    if (wrong && !deg.get(n.id)) continue; // SW2
    c.count++; c.types[n.type ?? ''] = (c.types[n.type ?? ''] || 0) + 1;
    // top 3 members by degree (ties by id) for the label and the tooltip
    const d = deg.get(n.id) || 0; c.best.push([d, n.id, n.label ?? n.id]); if (c.best.length > 12) { c.best.sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1)); c.best.length = 3; }
  }
  const M = new Map();
  for (const l of links) {
    const a = keyOf.get(l.s), b = keyOf.get(l.t); if (a == null || b == null) continue;
    if (a === b) { get(a).internal++; continue; }
    if (wrong && !(a < b)) continue; // SW1
    const [x, y] = a < b ? [a, b] : [b, a], id = `m:${x}|${y}`;
    let m = M.get(id); if (!m) M.set(id, m = { id, source: 'c:' + x, target: 'c:' + y, count: 0, types: {} });
    m.count++; const t = l.type ?? ''; m.types[t] = (m.types[t] || 0) + 1;
  }
  const clusters = [...C.values()].filter(c => c.count > 0).map(c => {
    c.best.sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1));
    const top = c.best.slice(0, 3).map(([degree, id, label]) => ({ id, label, degree }));
    const mainType = Object.entries(c.types).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    const label = labelOf ? labelOf(c.key, c, top) : c.key === OTHER ? 'Other (small groups)' : `${c.key}`;
    return { id: 'c:' + c.key, key: c.key, label, count: c.count, types: c.types, mainType, top, internal: c.internal };
  }).sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : 1));
  const ids = new Set(clusters.map(c => c.id));
  const metaEdges = [...M.values()].filter(m => ids.has(m.source) && ids.has(m.target)).sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : 1));
  return { clusters, metaEdges, keyOf, ms: performance.now() - t0 };
}

/** Seeded positions for the cluster overview: ForceAtlas2 on the cluster graph (meta-edge weight = count), then overlap removal
 *  so circles of radius ~ sqrt(count) do not cover each other. Returns Map clusterId -> {x, y, r}. */
export function clusterPositions(clusters, metaEdges, { seed = 1, unit = 10 } = {}) {
  const r = rng(seed), g = new Graph({ type: 'undirected' });
  const R = Math.sqrt(clusters.length) * unit * 4;
  for (const c of clusters) g.addNode(c.id, { x: (r() - 0.5) * R, y: (r() - 0.5) * R, size: Math.sqrt(c.count) });
  for (const m of metaEdges) if (g.hasNode(m.source) && g.hasNode(m.target) && !g.hasEdge(m.source, m.target)) g.addEdge(m.source, m.target, { weight: Math.log2(1 + m.count) });
  if (g.order > 1) forceAtlas2.assign(g, { iterations: g.order > 2000 ? 150 : 300, getEdgeWeight: 'weight', settings: { ...forceAtlas2.inferSettings(g), adjustSizes: false, scalingRatio: 10, gravity: 1, barnesHutOptimize: g.order > 1000 } });
  const pos = new Map(); g.forEachNode((id, a) => pos.set(id, { x: a.x, y: a.y, r: Math.sqrt(a.size) }));
  // scale so the mean neighbour gap fits the radii, then push overlapping circles apart (a few passes over a uniform grid)
  const list = [...pos.values()], maxR = Math.max(1, ...list.map(p => p.r));
  for (const p of list) p.r = p.r * unit;
  let ext = 1; for (const p of list) ext = Math.max(ext, Math.abs(p.x), Math.abs(p.y));
  const k = (Math.sqrt(list.reduce((s, p) => s + p.r * p.r * 4, 0)) * 1.2) / ext; for (const p of list) { p.x *= k; p.y *= k; }
  for (let pass = 0; pass < 40; pass++) {
    const cell = maxR * unit * 2.2, grid = new Map(); let moved = 0;
    list.forEach((p, i) => { const key = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(i); });
    for (let i = 0; i < list.length; i++) { const p = list[i], gx = Math.floor(p.x / cell), gy = Math.floor(p.y / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${gx + dx},${gy + dy}`) || []) { if (j <= i) continue; const q = list[j], d = Math.hypot(q.x - p.x, q.y - p.y) || 1e-6, need = (p.r + q.r) * 1.08;
        if (d < need) { const push = (need - d) / 2, ux = (q.x - p.x) / d || 1, uy = (q.y - p.y) / d; p.x -= ux * push; p.y -= uy * push; q.x += ux * push; q.y += uy * push; moved++; } } }
    if (!moved) break;
  }
  return pos;
}

/** Convex hull (Andrew's monotone chain) of [[x, y]]; returns the hull in counter-clockwise order. */
export function convexHull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = []; for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const up = []; for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
