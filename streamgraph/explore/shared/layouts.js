// Layout engine (SPEC §9). Pure function of (visible graph, options, previous positions, pins).
// Runs inside a Web Worker in the UI; the same code is unit-tested in Node.
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import louvain from 'graphology-communities-louvain';

export const LAYOUT_KINDS = ['force', 'hierarchy', 'radial', 'circular', 'grid', 'structural', 'timeline', 'geo', 'community'];
export const DEFAULT_LAYOUT = { kind: 'force', spacing: 5, animate: true, durationMs: 400, incremental: true, roots: null, levelProperty: null, orientation: 'down', orderBy: 'type', pack: 'circle', iterations: null, seed: 1234, timeProperty: null, groupBy: null, wrong: false };

const ENV_WRONG = typeof process !== 'undefined' && process.env?.SCALE_IMPL === 'wrong'; // SPEC §24.7 deliberately wrong build (Node); the browser passes it explicitly
export function rng(seed = 42) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const unit = o => 40 * (11 - Math.max(0, Math.min(10, Number.isFinite(+o.spacing) ? +o.spacing : 5))) / 6; // 0..10 tightness, higher = closer

/** Normalize options; unknown keys are ignored (forward compatible). */
export function layoutOptions(o = {}) {
  const out = { ...DEFAULT_LAYOUT };
  for (const k of Object.keys(DEFAULT_LAYOUT)) if (o[k] !== undefined) out[k] = o[k];
  if (!LAYOUT_KINDS.includes(out.kind)) out.kind = 'force';
  out.wrong = !!(o.wrong ?? ENV_WRONG) || ENV_WRONG;
  return out;
}
function bbox(pos, ids) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const id of ids) { const p = pos.get(id); if (!p) continue; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return x0 === Infinity ? { x0: 0, y0: 0, x1: 0, y1: 0, diag: 0, cx: 0, cy: 0 } : { x0, y0, x1, y1, diag: Math.hypot(x1 - x0, y1 - y0), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
function adjacency(nodes, links) {
  const ids = new Set(nodes.map(n => n.id)), adj = new Map(nodes.map(n => [n.id, new Set()])), out = new Map(nodes.map(n => [n.id, new Set()])), inn = new Map(nodes.map(n => [n.id, new Set()]));
  for (const l of links) { if (!ids.has(l.source) || !ids.has(l.target) || l.source === l.target) continue; adj.get(l.source).add(l.target); adj.get(l.target).add(l.source); out.get(l.source).add(l.target); inn.get(l.target).add(l.source); }
  return { adj, out, inn };
}
function components(nodes, adj) {
  const seen = new Set(), comps = [];
  for (const n of nodes) { if (seen.has(n.id)) continue; const c = [], st = [n.id]; seen.add(n.id); while (st.length) { const u = st.pop(); c.push(u); for (const v of adj.get(u)) if (!seen.has(v)) { seen.add(v); st.push(v); } } comps.push(c); }
  return comps.sort((a, b) => b.length - a.length);
}
function orderKey(o, byId) { return id => { const n = byId.get(id); if (o.orderBy === 'type') return `${n.type ?? ''}\u0000${id}`; if (o.orderBy && o.orderBy !== 'insertion' && n.properties?.[o.orderBy] != null) return String(n.properties[o.orderBy]).padStart(20, '0') + '\u0000' + id; return null; }; }
function sortIds(ids, o, byId) { const k = orderKey(o, byId); if (o.orderBy === 'insertion' || !o.orderBy) return ids; return [...ids].sort((a, b) => { const ka = k(a), kb = k(b); return ka == null || kb == null ? 0 : ka < kb ? -1 : ka > kb ? 1 : 0; }); }

/**
 * Place new (position-less) nodes: near already-placed neighbours, else in free space outside the current mass (§9.3).
 */
/** Bounding box over the 2nd-98th percentile of positions (ignores far outliers). */
function robustBox(pos, ids) {
  if (ids.length < 20) return bbox(pos, ids);
  const xs = ids.map(id => pos.get(id).x).sort((a, b) => a - b), ys = ids.map(id => pos.get(id).y).sort((a, b) => a - b);
  const q = (a, f) => a[Math.min(a.length - 1, Math.floor(f * a.length))];
  const x0 = q(xs, 0.02), x1 = q(xs, 0.98), y0 = q(ys, 0.02), y1 = q(ys, 0.98);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, diag: Math.hypot(x1 - x0, y1 - y0) };
}
const hashUnit = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
export function placeNewNodes(nodes, links, pos, { spacing = 5, seed = 7, unitOverride = null } = {}) {
  const r = rng(seed), u = unitOverride || unit({ spacing }), { adj } = adjacency(nodes, links);
  const placedIds = nodes.filter(n => pos.has(n.id)).map(n => n.id);
  const box = robustBox(pos, placedIds);
  const pending = nodes.filter(n => !pos.has(n.id)).map(n => n.id);
  let guard = 0, ring = 0;
  while (pending.length && guard++ < 50) {
    const next = [];
    for (const id of pending) {
      const nb = [...adj.get(id)].filter(v => pos.has(v));
      if (nb.length) {
        let x = 0, y = 0; for (const v of nb) { x += pos.get(v).x; y += pos.get(v).y; } x /= nb.length; y /= nb.length;
        const a = r() * Math.PI * 2, d = u * (0.6 + r() * 0.8);
        pos.set(id, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
      } else next.push(id);
    }
    if (next.length === pending.length) {
      // no placed neighbours: start a free region on a ring outside the existing bounding box
      // angle from the id (not the shared seed) so isolated nodes added one per delta spread round the ring instead of lining up
      const id = next.shift(), R = (placedIds.length ? box.diag / 2 : 0) + u * (2 + ring++), a = (hashUnit(id) + r() * 0.1) * Math.PI * 2;
      pos.set(id, { x: box.cx + Math.cos(a) * R, y: box.cy + Math.sin(a) * R });
    }
    pending.length = 0; pending.push(...next);
  }
  return pos;
}

/** Force (organic) layout as a generator: yields intermediate positions so a worker can stream them. */
export function* forceSteps(nodes, links, o, prev, pinned, newIds) {
  const g = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });
  const r = o.wrong ? Math.random : rng(Number.isFinite(+o.seed) ? +o.seed : 1234), u = unit(o); // seeded: same seed = same drawing (SPEC §24.4)
  const pos = new Map();
  const incremental = o.incremental && prev && nodes.some(n => prev.has(n.id));
  for (const n of nodes) {
    const p = prev?.get(n.id);
    if (pinned.has(n.id) && p) pos.set(n.id, { ...p });
    else if (incremental && p && !newIds.has(n.id)) pos.set(n.id, { ...p });
  }
  if (!incremental) { const R = Math.sqrt(nodes.length) * u; for (const n of nodes) if (!pos.has(n.id)) pos.set(n.id, { x: (r() - 0.5) * 2 * R, y: (r() - 0.5) * 2 * R }); }
  if (incremental) {
    // stable placement: existing nodes stay; only new nodes are relaxed locally (springs to neighbours + short-range repulsion)
    const free = nodes.filter(n => !pinned.has(n.id) && (newIds.has(n.id) || !prev.has(n.id))).map(n => n.id);
    if (!free.length) { yield { positions: pos, done: true, progress: 1 }; return; }
    const { adj } = adjacency(nodes, links);
    const lu = localUnit(links, prev, u);
    placeNewNodes(nodes, links, pos, { spacing: o.spacing, unitOverride: lu });
    localRelax(pos, free, adj, lu, o.iterations ?? 60);
    yield { positions: pos, done: true, progress: 1 };
    return;
  }
  for (const n of nodes) { const p = pos.get(n.id); g.addNode(n.id, { x: p.x, y: p.y, fixed: pinned.has(n.id) }); }
  for (const l of links) if (l.source !== l.target && g.hasNode(l.source) && g.hasNode(l.target) && !g.hasEdge(l.source, l.target)) g.addEdge(l.source, l.target);
  // large graphs: multilevel-lite seed (label propagation -> community graph FA2 -> scatter) so FA2 starts near a clustered
  // drawing; measured on the 10k/20k synthetic fixture: better community separation with half the iterations.
  const seeded = g.order > 3000 && !pinned.size ? seedCommunities(g, Math.sqrt(g.order) * u, r) : 0;
  const free = g.filterNodes((_, a) => !a.fixed).length;
  if (!free || !g.order) { yield { positions: pos, done: true, progress: 1 }; return; }
  const settings = { ...forceAtlas2.inferSettings(g), barnesHutOptimize: g.order > 1500, scalingRatio: u / 4, gravity: 1, slowDown: 1 + Math.log10(g.order + 1) };
  const total = o.iterations ?? (g.order < 500 ? 400 : g.order < 3000 ? 200 : seeded ? 60 : g.order < 20000 ? 120 : 60);
  const chunk = Math.max(5, Math.min(25, Math.ceil(total / 8)));
  for (let done = 0; done < total; done += chunk) {
    forceAtlas2.assign(g, { iterations: Math.min(chunk, total - done), settings, getEdgeWeight: null });
    const snap = new Map(); g.forEachNode((id, a) => snap.set(id, { x: a.x, y: a.y }));
    yield { positions: snap, done: done + chunk >= total, progress: Math.min(1, (done + chunk) / total) };
  }
}

/** Label propagation + a small FA2 on the community graph; writes x/y seeds into g. Returns the number of communities. */
export function seedCommunities(g, R, r) {
  const lab = new Map(); g.forEachNode(n => lab.set(n, n));
  const order = g.nodes();
  for (let pass = 0; pass < 8; pass++) {
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    let changed = 0;
    for (const n of order) { const cnt = new Map(); g.forEachNeighbor(n, m => { const l = lab.get(m); cnt.set(l, (cnt.get(l) || 0) + 1); }); let best = lab.get(n), bc = 0; for (const [l, c] of cnt) if (c > bc || (c === bc && r() < 0.5)) { best = l; bc = c; } if (best !== lab.get(n)) { lab.set(n, best); changed++; } }
    if (changed < order.length * 0.01) break;
  }
  const groups = new Map(); for (const [n, l] of lab) { if (!groups.has(l)) groups.set(l, []); groups.get(l).push(n); }
  const cg = new Graph({ type: 'undirected' }); for (const l of groups.keys()) cg.addNode(l, { x: (r() - 0.5) * R, y: (r() - 0.5) * R });
  g.forEachEdge((e, a, s, t) => { const ls = lab.get(s), lt = lab.get(t); if (ls !== lt) { if (cg.hasEdge(ls, lt)) cg.updateEdgeAttribute(ls, lt, 'weight', w => w + 1); else cg.addEdge(ls, lt, { weight: 1 }); } });
  if (cg.size) forceAtlas2.assign(cg, { iterations: 200, settings: { ...forceAtlas2.inferSettings(cg), scalingRatio: 10, gravity: 1, barnesHutOptimize: cg.order > 1500 }, getEdgeWeight: 'weight' });
  let ext = 0; cg.forEachNode((l, a) => { ext = Math.max(ext, Math.hypot(a.x, a.y)); }); const k = ext ? R / ext : 1, unitR = R / Math.sqrt(g.order);
  for (const [l, ns] of groups) { const c = cg.getNodeAttributes(l), rad = Math.sqrt(ns.length) * unitR * 0.6; for (const n of ns) { const ang = r() * 2 * Math.PI, d = Math.sqrt(r()) * rad; g.mergeNodeAttributes(n, { x: c.x * k + Math.cos(ang) * d, y: c.y * k + Math.sin(ang) * d }); } }
  return groups.size;
}

/** Typical link length among already-placed nodes, so incremental placement matches the existing drawing's scale. */
export function localUnit(links, prev, fallback) {
  const d = []; for (const l of links) { const a = prev?.get(l.source), b = prev?.get(l.target); if (a && b && l.source !== l.target) d.push(Math.hypot(a.x - b.x, a.y - b.y)); if (d.length > 5000) break; }
  if (d.length < 3) return fallback;
  d.sort((x, y) => x - y); const m = d[d.length >> 1]; return m > 0 ? m : fallback;
}

/** Local relaxation for incremental placement: only `free` nodes move. Spatial hash keeps it O(free * local). */
export function localRelax(pos, free, adj, u, iterations = 60) {
  const cell = u * 2, key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  const freeSet = new Set(free);
  const hash = new Map();
  const put = (id, p) => { const k = key(p.x, p.y); let b = hash.get(k); if (!b) hash.set(k, b = []); b.push(id); };
  for (const [id, p] of pos) if (!freeSet.has(id)) put(id, p);
  for (let it = 0; it < iterations; it++) {
    const step = u * 0.5 * (1 - it / iterations) + u * 0.02;
    for (const id of free) {
      const p = pos.get(id); let fx = 0, fy = 0;
      for (const v of adj.get(id) || []) { const q = pos.get(v); if (!q) continue; const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1e-6; const f = (d - u) / d * 0.5; fx += dx * f; fy += dy * f; }
      const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
      const near = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const b = hash.get(`${cx + i},${cy + j}`); if (b) near.push(...b); }
      for (const v of free) if (v !== id) near.push(v);
      for (const v of near) { if (v === id) continue; const q = pos.get(v); const dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy; if (d2 > cell * cell) continue; const d = Math.sqrt(d2) || 1e-3; const f = (u * u) / (d * d) * 0.25; fx += (dx / d) * f * u; fy += (dy / d) * f * u; }
      const m = Math.hypot(fx, fy); if (m > step) { fx *= step / m; fy *= step / m; }
      p.x += fx; p.y += fy;
    }
  }
  return pos;
}

function hierarchy(nodes, links, o, pinned, prev) {
  const byId = new Map(nodes.map(n => [n.id, n])), { adj, out, inn } = adjacency(nodes, links), u = unit(o);
  const level = new Map();
  if (o.levelProperty) for (const n of nodes) { const v = Number(n.properties?.[o.levelProperty] ?? n[o.levelProperty]); if (Number.isFinite(v)) level.set(n.id, v); }
  if (level.size < nodes.length) {
    // BFS along link direction from declared roots, else from nodes with no incoming links; cycles are broken by first visit
    const roots = (o.roots || []).filter(id => byId.has(id) && !level.has(id));
    const queue = [];
    const seedFrom = list => { for (const id of list) if (!level.has(id)) { level.set(id, 0); queue.push(id); } };
    seedFrom(roots.length ? roots : nodes.filter(n => !level.has(n.id) && ![...inn.get(n.id)].length).map(n => n.id));
    for (;;) {
      while (queue.length) { const x = queue.shift(); for (const y of out.get(x)) if (!level.has(y)) { level.set(y, level.get(x) + 1); queue.push(y); } }
      const rest = nodes.filter(n => !level.has(n.id)); if (!rest.length) break;
      // unreached (cycle or pointed-to-only): seed the one with fewest incoming links, or undirected neighbours
      const pick = rest.reduce((a, b) => (inn.get(a.id).size <= inn.get(b.id).size ? a : b));
      const nbLevels = [...adj.get(pick.id)].filter(v => level.has(v)).map(v => level.get(v));
      level.set(pick.id, nbLevels.length ? Math.max(...nbLevels) + 1 : 0); queue.push(pick.id);
    }
  }
  const levels = new Map();
  for (const n of nodes) { const l = level.get(n.id); if (!levels.has(l)) levels.set(l, []); levels.get(l).push(n.id); }
  const keys = [...levels.keys()].sort((a, b) => a - b);
  for (const k of keys) levels.set(k, sortIds(levels.get(k), o, byId));
  // barycentre sweeps to reduce crossings
  const idx = new Map(); const reindex = () => { for (const k of keys) levels.get(k).forEach((id, i) => idx.set(id, i)); }; reindex();
  for (let pass = 0; pass < 4; pass++) {
    const seq = pass % 2 ? [...keys].reverse() : keys;
    for (const k of seq) {
      const bc = id => { const nb = [...adj.get(id)].filter(v => level.get(v) !== k); return nb.length ? nb.reduce((s, v) => s + idx.get(v), 0) / nb.length : idx.get(id); };
      const arr = levels.get(k).map(id => [id, bc(id)]).sort((a, b) => a[1] - b[1]).map(x => x[0]); levels.set(k, arr); arr.forEach((id, i) => idx.set(id, i));
    }
  }
  const pos = new Map(), gapL = u * 3, gapN = u * 1.5;
  for (const k of keys) { const arr = levels.get(k); arr.forEach((id, i) => {
    const a = (i - (arr.length - 1) / 2) * gapN, b = (k - keys[0]) * gapL;
    const p = o.orientation === 'up' ? { x: a, y: b } : o.orientation === 'left' ? { x: -b, y: a } : o.orientation === 'right' ? { x: b, y: a } : { x: a, y: -b };
    pos.set(id, p);
  }); }
  return { pos, level };
}

function radial(nodes, links, o) {
  const byId = new Map(nodes.map(n => [n.id, n])), { adj } = adjacency(nodes, links), u = unit(o), pos = new Map();
  const comps = components(nodes, adj); let offsetX = 0;
  for (const comp of comps) {
    const inComp = new Set(comp);
    let roots = (o.roots || []).filter(id => inComp.has(id));
    if (!roots.length) roots = [comp.reduce((a, b) => (adj.get(a).size >= adj.get(b).size ? a : b))];
    const lvl = new Map(roots.map(r => [r, 0])), parent = new Map(), q = [...roots];
    while (q.length) { const x = q.shift(); for (const y of sortIds([...adj.get(x)], o, byId)) if (!lvl.has(y)) { lvl.set(y, lvl.get(x) + 1); parent.set(y, x); q.push(y); } }
    const rings = new Map(); for (const id of comp) { const l = lvl.get(id) ?? 0; if (!rings.has(l)) rings.set(l, []); rings.get(l).push(id); }
    const ang = new Map(), R = u * 3;
    const maxL = Math.max(...rings.keys());
    for (const l of [...rings.keys()].sort((a, b) => a - b)) {
      let ids = rings.get(l);
      if (l > 0) ids = ids.sort((a, b) => (ang.get(parent.get(a)) ?? 0) - (ang.get(parent.get(b)) ?? 0));
      ids.forEach((id, i) => {
        const a = l === 0 ? (ids.length === 1 ? 0 : (2 * Math.PI * i) / ids.length) : (2 * Math.PI * i) / ids.length;
        ang.set(id, a);
        const rr = l === 0 && ids.length === 1 ? 0 : (l + (l === 0 ? 0.5 : 0)) * R;
        pos.set(id, { x: offsetX + Math.cos(a) * rr, y: Math.sin(a) * rr });
      });
    }
    offsetX += (maxL + 1) * R * 2 + u * 4;
  }
  return pos;
}

function circular(nodes, links, o) {
  const byId = new Map(nodes.map(n => [n.id, n])), u = unit(o), pos = new Map();
  const groups = o.pack === 'keep' || o.perComponent === false ? [nodes.map(n => n.id)] : components(nodes, adjacency(nodes, links).adj);
  let offsetX = 0;
  for (const g of groups) {
    const ids = sortIds(g, o, byId), R = Math.max(u, (ids.length * u * 1.2) / (2 * Math.PI));
    ids.forEach((id, i) => { const a = (2 * Math.PI * i) / ids.length; pos.set(id, { x: offsetX + R + Math.cos(a) * R, y: Math.sin(a) * R }); });
    offsetX += 2 * R + u * 3;
  }
  return pos;
}

function grid(nodes, o) {
  const byId = new Map(nodes.map(n => [n.id, n])), u = unit(o) * 1.5, ids = sortIds(nodes.map(n => n.id), o, byId), cols = Math.max(1, Math.ceil(Math.sqrt(ids.length))), pos = new Map();
  ids.forEach((id, i) => pos.set(id, { x: (i % cols) * u, y: -Math.floor(i / cols) * u }));
  return pos;
}

function structural(nodes, links, o) {
  // nodes with the same neighbour set share a cluster; clusters are placed by a force pass on the quotient graph
  const { adj } = adjacency(nodes, links), u = unit(o), sig = new Map();
  for (const n of nodes) { const s = [...adj.get(n.id)].sort().join('\u0001'); if (!sig.has(s)) sig.set(s, []); sig.get(s).push(n.id); }
  const clusters = [...sig.values()], of = new Map(); clusters.forEach((c, i) => c.forEach(id => of.set(id, i)));
  const qNodes = clusters.map((c, i) => ({ id: 'c' + i })), qLinks = [];
  const seen = new Set(); for (const l of links) { const a = of.get(l.source), b = of.get(l.target); if (a == null || b == null || a === b) continue; const k = a < b ? `${a}-${b}` : `${b}-${a}`; if (!seen.has(k)) { seen.add(k); qLinks.push({ source: 'c' + a, target: 'c' + b }); } }
  let centers; for (const s of forceSteps(qNodes, qLinks, { ...o, incremental: false, spacing: o.spacing - 2 }, null, new Set(), new Set())) centers = s.positions;
  const pos = new Map();
  clusters.forEach((c, i) => { const ctr = centers.get('c' + i), R = c.length > 1 ? (u * 0.6 * c.length) / (2 * Math.PI) + u * 0.3 : 0; c.forEach((id, j) => { const a = (2 * Math.PI * j) / c.length; pos.set(id, { x: ctr.x * 1.5 + Math.cos(a) * R, y: ctr.y * 1.5 + Math.sin(a) * R }); }); });
  return pos;
}

/**
 * Compute a layout synchronously.
 * input: { nodes:[{id,type?,properties?}], links:[{source,target}], options, prev?: Map|object id->{x,y}, pinned?: Iterable<id>, newIds?: Iterable<id> }
 * returns Map id -> {x,y}. Pinned nodes always keep their previous coordinates (§9.4).
 */
export function computeLayout({ nodes, links, options, prev, pinned = [], newIds = [] }) {
  const o = layoutOptions(options);
  const prevMap = prev instanceof Map ? prev : new Map(Object.entries(prev || {}));
  const pins = new Set(pinned), fresh = new Set(newIds);
  if (o.incremental && prevMap.size) for (const n of nodes) if (!prevMap.has(n.id)) fresh.add(n.id);
  let pos;
  if (o.kind === 'force') { for (const s of forceSteps(nodes, links, o, prevMap, pins, fresh)) pos = s.positions; }
  else if (o.kind === 'hierarchy') pos = hierarchy(nodes, links, o, pins, prevMap).pos;
  else if (o.kind === 'radial') pos = radial(nodes, links, o);
  else if (o.kind === 'circular') pos = circular(nodes, links, o);
  else if (o.kind === 'grid') pos = grid(nodes, o);
  else if (o.kind === 'timeline') pos = timeline(nodes, links, o);
  else if (o.kind === 'geo') pos = geographic(nodes, links, o);
  else if (o.kind === 'community') pos = groupInABox(nodes, links, o);
  else pos = structural(nodes, links, o);
  for (const id of pins) { const p = prevMap.get(id); if (p && pos.has(id)) pos.set(id, { x: p.x, y: p.y }); }
  return pos;
}
export { hierarchy as hierarchyLevels };

/** Movement statistic used by the stability acceptance test (§9.7). */
export function movement(before, after, ids) {
  const box = bbox(before, ids), thr = box.diag;
  const d = ids.filter(id => before.has(id) && after.has(id)).map(id => Math.hypot(after.get(id).x - before.get(id).x, after.get(id).y - before.get(id).y));
  return { diag: thr, distances: d, fractionWithin: frac => (d.length ? d.filter(x => x < frac * thr).length / d.length : 1) };
}

// ---------------------------------------------------------------- Phase 2 layouts (SPEC §24.4): timeline, geographic, group-in-a-box
// Written here from the published descriptions (no third-party code): squarified treemap (Bruls, Huizing & van Wijk 2000),
// group-in-a-box (Rodrigues et al. 2011), Web Mercator projection (EPSG:3857).

/** Time of a node for the timeline layout: n.time (ms) from the client, else a date-like property, else eventTime / updatedAt. */
export function nodeTime(n, prop) {
  const raw = n.time ?? (prop ? n.properties?.[prop] : null) ?? n.eventTime ?? n.properties?.eventTime ?? n.properties?.date ?? n.properties?.time ?? n.updatedAt;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? (raw < 1e11 ? raw * 1000 : raw) : null; // seconds or ms
  const t = Date.parse(raw); return Number.isNaN(t) ? null : t;
}
/** timeline / axis: x = time (linear), one lane per type (orderBy); inside a lane, nodes that would overlap stack into rows. */
function timeline(nodes, links, o) {
  const u = unit(o), pos = new Map(), width = Math.max(20, Math.sqrt(nodes.length)) * u * 2;
  const times = new Map(); for (const n of nodes) times.set(n.id, o.wrong ? null : nodeTime(n, o.timeProperty));
  const ts = [...times.values()].filter(t => t != null); const t0 = ts.length ? Math.min(...ts) : 0, t1 = ts.length ? Math.max(...ts) : 1;
  const span = t1 - t0 || 1, X = t => ((t - t0) / span) * width;
  const laneOf = n => (o.orderBy && o.orderBy !== 'type' && o.orderBy !== 'insertion' ? String(n.properties?.[o.orderBy] ?? '') : String(n.type ?? ''));
  const lanes = new Map(); for (const n of nodes) { const k = laneOf(n); if (!lanes.has(k)) lanes.set(k, []); lanes.get(k).push(n); }
  let y = 0; const gap = u * 0.9, undated = [];
  for (const k of [...lanes.keys()].sort()) {
    const list = lanes.get(k).filter(n => times.get(n.id) != null).sort((a, b) => times.get(a.id) - times.get(b.id) || (a.id < b.id ? -1 : 1));
    if (o.wrong) list.sort((a, b) => (a.id < b.id ? -1 : 1)); // wrong: ignores the time axis (ordered by id)
    const rowEnd = []; // greedy interval packing: first row whose last x is far enough left
    list.forEach((n, i) => { const x = o.wrong ? (i / Math.max(1, list.length - 1)) * width : X(times.get(n.id)); let r = rowEnd.findIndex(e => x - e >= gap); if (r < 0) { r = rowEnd.length; rowEnd.push(-Infinity); } rowEnd[r] = x; pos.set(n.id, { x, y: -(y + r * gap) }); });
    for (const n of lanes.get(k)) if (times.get(n.id) == null) undated.push(n.id);
    y += Math.max(1, rowEnd.length) * gap + u * 2;
  }
  // nodes without a date: a column left of the axis
  undated.sort().forEach((id, i) => pos.set(id, { x: -u * 4 - Math.floor(i / 40) * gap, y: -(i % 40) * gap }));
  return pos;
}
/** Web Mercator (x, y) in [-1, 1] for lon / lat (y up). */
export function mercator(lon, lat) { const φ = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180; return { x: lon / 180, y: Math.log(Math.tan(Math.PI / 4 + φ / 2)) / Math.PI }; }
/** geographic pinning: nodes with lat / lon (n.geo = {lat, lon} or [lon, lat], or lat/lon properties) are placed by Web Mercator;
 *  others go to the mean of their placed neighbours (or a ring below the map). */
function geographic(nodes, links, o) {
  const u = unit(o), pos = new Map(), R = Math.max(30, Math.sqrt(nodes.length)) * u * 3, { adj } = adjacency(nodes, links);
  const ll = n => { const g = n.geo; if (Array.isArray(g)) return { lon: +g[0], lat: +g[1] }; if (g && Number.isFinite(+g.lat)) return { lat: +g.lat, lon: +g.lon };
    const p = n.properties || {}; const lat = +(p.lat ?? p.latitude), lon = +(p.lon ?? p.lng ?? p.longitude); return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null; };
  for (const n of nodes) { const g = ll(n); if (!g || Math.abs(g.lat) > 90 || Math.abs(g.lon) > 180) continue; const m = o.wrong ? mercator(g.lat, g.lon) : mercator(g.lon, g.lat); pos.set(n.id, { x: m.x * R, y: m.y * R }); }
  const rest = nodes.filter(n => !pos.has(n.id)).map(n => n.id);
  for (let pass = 0; pass < 3; pass++) for (const id of rest) { if (pos.has(id)) continue; let x = 0, y = 0, k = 0; for (const v of adj.get(id)) { const p = pos.get(v); if (p) { x += p.x; y += p.y; k++; } } if (k) { const a = hashUnit(id) * Math.PI * 2; pos.set(id, { x: x / k + Math.cos(a) * u, y: y / k + Math.sin(a) * u }); } }
  const left = rest.filter(id => !pos.has(id)).sort(), box = pos.size ? bbox(pos, [...pos.keys()]) : { cx: 0, cy: 0, diag: R };
  left.forEach((id, i) => pos.set(id, { x: box.cx - box.diag / 2 + (i % 50) * u, y: box.cy - box.diag / 2 - u * 3 - Math.floor(i / 50) * u }));
  return pos;
}
/** Squarified treemap: items [{key, value}] in rect {x, y, w, h} -> Map key -> rect. */
export function squarify(items, rect) {
  const out = new Map(), total = items.reduce((s, i) => s + i.value, 0) || 1;
  const scaled = items.filter(i => i.value > 0).sort((a, b) => b.value - a.value || (a.key < b.key ? -1 : 1)).map(i => ({ key: i.key, a: (i.value / total) * rect.w * rect.h }));
  let { x, y, w, h } = rect, row = [];
  const worst = (r, side) => { const s = r.reduce((t, i) => t + i.a, 0), mx = Math.max(...r.map(i => i.a)), mn = Math.min(...r.map(i => i.a)); return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn)); };
  const layoutRow = r => { const s = r.reduce((t, i) => t + i.a, 0); if (w >= h) { const cw = s / h; let cy = y; for (const i of r) { const ch = i.a / cw; out.set(i.key, { x, y: cy, w: cw, h: ch }); cy += ch; } x += cw; w -= cw; } else { const ch = s / w; let cx = x; for (const i of r) { const cw = i.a / ch; out.set(i.key, { x: cx, y, w: cw, h: ch }); cx += cw; } y += ch; h -= ch; } };
  for (const it of scaled) { const side = Math.min(w, h); if (!row.length || worst([...row, it], side) <= worst(row, side)) row.push(it); else { layoutRow(row); row = [it]; } }
  if (row.length) layoutRow(row);
  return out;
}
/** group-in-a-box: one treemap box per group (n.group, else groupBy property, else type), area ~ group size; inside each box a
 *  seeded force layout of the group's induced subgraph scaled to fit. Links between groups are left to the renderer. */
/** Seeded Louvain communities for layouts that group by community when the caller sent no groups. */
export function louvainGroups(nodes, links, seed = 1) {
  const g = new Graph({ type: 'undirected' }); for (const n of nodes) g.addNode(n.id);
  for (const l of links) if (l.source !== l.target && g.hasNode(l.source) && g.hasNode(l.target) && !g.hasEdge(l.source, l.target)) g.addEdge(l.source, l.target);
  return g.size ? louvain(g, { rng: rng(seed) }) : Object.fromEntries(nodes.map(n => [n.id, 0]));
}
function groupInABox(nodes, links, o) {
  if (o.groupBy === 'louvain' && !nodes.some(n => n.group != null)) { const c = louvainGroups(nodes, links, o.seed); nodes = nodes.map(n => ({ ...n, group: c[n.id] })); }
  const u = unit(o), groupOf = n => (o.wrong ? 'all' : String(n.group ?? (o.groupBy ? n.properties?.[o.groupBy] : null) ?? n.type ?? '')); // wrong: ignores the groups
  const groups = new Map(); for (const n of nodes) { const g = groupOf(n); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(n); }
  const side = Math.sqrt(nodes.length) * u * 1.6 + u, rects = squarify([...groups].map(([key, ns]) => ({ key, value: ns.length })), { x: 0, y: 0, w: side * 1.4, h: side });
  const byId = new Map(nodes.map(n => [n.id, n])), pos = new Map();
  for (const [key, ns] of groups) {
    const r = rects.get(key); if (!r) continue;
    const ids = new Set(ns.map(n => n.id)), sub = links.filter(l => ids.has(l.source) && ids.has(l.target));
    let inner;
    if (ns.length === 1) inner = new Map([[ns[0].id, { x: 0, y: 0 }]]);
    else for (const s of forceSteps(ns, sub, { ...o, incremental: false, iterations: ns.length > 3000 ? 40 : ns.length > 500 ? 80 : 150 }, null, new Set(), new Set())) inner = s.positions;
    const b = bbox(inner, [...ids]); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of inner.values()) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const pad = Math.min(r.w, r.h) * 0.1, k = Math.min((r.w - 2 * pad) / ((x1 - x0) || 1), (r.h - 2 * pad) / ((y1 - y0) || 1));
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    for (const [id, p] of inner) pos.set(id, { x: cx + (p.x - (x0 + x1) / 2) * (ns.length === 1 ? 0 : k), y: -(cy + (p.y - (y0 + y1) / 2) * (ns.length === 1 ? 0 : k)) });
    void b; void byId;
  }
  return pos;
}
/** Group-in-a-box boxes (for drawing frames): Map group -> rect, same geometry as the layout. */
export function groupBoxes(nodes, o = {}) {
  o = layoutOptions(o); const u = unit(o), groups = new Map();
  if (o.groupBy === 'louvain' && o.links && !nodes.some(n => n.group != null)) { const c = louvainGroups(nodes, o.links, o.seed); nodes = nodes.map(n => ({ ...n, group: c[n.id] })); }
  for (const n of nodes) { const g = String(n.group ?? (o.groupBy ? n.properties?.[o.groupBy] : null) ?? n.type ?? ''); groups.set(g, (groups.get(g) || 0) + 1); }
  const side = Math.sqrt(nodes.length) * u * 1.6 + u; return squarify([...groups].map(([key, value]) => ({ key, value })), { x: 0, y: 0, w: side * 1.4, h: side });
}
