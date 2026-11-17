// Phase 1 core loop, server side (SPEC §23.2-§23.4): k-hop neighbourhood materialisation streamed in chunks, path
// finding (shortest + all simple paths up to a hop limit) and per-node link-type summaries. Everything runs on the
// permissioned in-memory read model (the same GraphService the UI session and the MCP tools use), so the browser only
// ever receives the part of the graph it asks for. Every item passes service.view() (source policy) and the caller's
// guard (StreamGraph access rules) before it leaves the server.
import { compileFilter } from '../shared/core-filter.js';

export const NB_LIMITS = { maxHops: 6, maxNodes: 20000, defaultNodes: 500, defaultChunk: 500, maxPathHops: 8, maxPaths: 500 };
const int = (v, d) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.trunc(Number(v)) : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const noGuard = async items => items;

export function normalizeNbOptions(o = {}) {
  return {
    seeds: [...new Set((Array.isArray(o.seeds) ? o.seeds : o.seeds != null ? [o.seeds] : []).map(String))],
    hops: clamp(int(o.hops, 1), 0, NB_LIMITS.maxHops),
    maxNodes: clamp(int(o.maxNodes, NB_LIMITS.defaultNodes), 1, NB_LIMITS.maxNodes),
    chunkSize: clamp(int(o.chunkSize, NB_LIMITS.defaultChunk), 1, 5000),
    direction: ['in', 'out', 'both'].includes(o.direction) ? o.direction : 'both',
    linkTypes: Array.isArray(o.linkTypes) && o.linkTypes.length ? o.linkTypes.map(String) : null,
    nodeTypes: Array.isArray(o.nodeTypes) && o.nodeTypes.length ? o.nodeTypes.map(String) : null,
    where: Array.isArray(o.where) ? o.where : [], linkWhere: Array.isArray(o.linkWhere) ? o.linkWhere : [],
    exclude: Array.isArray(o.exclude) ? o.exclude.map(String) : [],
  };
}

/**
 * k-hop neighbourhood of `seeds` as an async generator of chunks, breadth first (hop 0 = the seeds):
 *   { type: 'chunk', hop, nodes: [view], links: [view] }   ... then one { type: 'end', stats }.
 * Filters: nodeTypes / where apply to every non-seed node, linkTypes / linkWhere to every traversed or returned link,
 * direction to traversal over directed links. Links between any two returned nodes that pass the link filter are
 * returned (the induced subgraph), each exactly once, in the chunk of the later of its two ends.
 * maxNodes caps the returned nodes (seeds included); `truncated` says some reachable node was left out.
 * `exclude` = node ids the client already holds: they are traversed through but not re-sent.
 */
export async function* neighborhoodStream(svc, opts, guard = noGuard, principal) {
  const t0 = performance.now(), o = normalizeNbOptions(opts), f = compileFilter({ types: o.nodeTypes, linkTypes: o.linkTypes, where: o.where, linkWhere: o.linkWhere });
  const included = new Map(), emitted = new Set(), skip = new Set(o.exclude), perHop = [];
  let truncated = false, scanned = 0, nNodes = 0, nLinks = 0, firstChunkMs = null;
  const linksFor = async ids => { // links from each newly admitted node to any admitted node
    const out = [];
    for (const id of ids) for (const l of svc.incidentLinks(id)) {
      const other = l.fromId === id ? l.toId : l.fromId;
      if (emitted.has(l.id) || !included.has(other) || !f.link(l)) continue;
      const v = svc.view(l, principal); if (v) { out.push(v); emitted.add(l.id); }
    }
    return guard(out);
  };
  async function* admit(views, hop) {
    for (const v of views) included.set(v.id, hop);
    const links = await linksFor(views.map(v => v.id));
    const nodes = views.filter(v => !skip.has(v.id)), lks = links;
    perHop.push({ hop, nodes: views.length, links: lks.length });
    nNodes += views.length; nLinks += lks.length;
    for (let i = 0; i < nodes.length; i += o.chunkSize) { // nodes first so a client can attach links immediately
      if (firstChunkMs == null) firstChunkMs = performance.now() - t0;
      yield { type: 'chunk', hop, nodes: nodes.slice(i, i + o.chunkSize), links: [] };
    }
    for (let i = 0; i < lks.length; i += o.chunkSize) { if (firstChunkMs == null) firstChunkMs = performance.now() - t0; yield { type: 'chunk', hop, nodes: [], links: lks.slice(i, i + o.chunkSize) }; }
  }
  // hop 0: the seeds (no filter, but still access-checked)
  const sv = []; for (const id of o.seeds) { const it = svc.live(id); if (it?.kind === 'node') { const v = svc.view(it, principal); if (v && !sv.some(x => x.id === v.id)) sv.push(v); } }
  let seeds = await guard(sv); if (seeds.length > o.maxNodes) { seeds = seeds.slice(0, o.maxNodes); truncated = true; }
  yield* admit(seeds, 0);
  let frontier = seeds.map(v => v.id);
  for (let hop = 1; hop <= o.hops && frontier.length; hop++) {
    const remaining = o.maxNodes - included.size; if (remaining <= 0) { truncated ||= frontier.some(u => hasCandidate(u)); break; }
    const cand = new Map(); let stop = false;
    for (const u of frontier.sort()) {
      for (const l of svc.incidentLinks(u)) {
        scanned++;
        const other = l.fromId === u ? l.toId : l.fromId;
        if (included.has(other) || cand.has(other) || !f.link(l) || !dirOk(l, u, o.direction)) continue;
        const n = svc.live(other); if (!n || n.kind !== 'node' || !f.node(n)) continue;
        if (!svc.view(l, principal)) continue;
        const nv = svc.view(n, principal); if (!nv) continue;
        cand.set(nv.id, nv);
        if (cand.size > remaining) { stop = true; break; }
      }
      if (stop) break;
    }
    if (cand.size > remaining) truncated = true;
    const next = (await guard([...cand.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)))).slice(0, remaining);
    yield* admit(next, hop);
    frontier = next.map(v => v.id);
  }
  function hasCandidate(u) { for (const l of svc.incidentLinks(u)) { const other = l.fromId === u ? l.toId : l.fromId; if (!included.has(other) && f.link(l) && dirOk(l, u, o.direction)) { const n = svc.live(other); if (n && f.node(n) && svc.view(n, principal)) return true; } } return false; }
  yield { type: 'end', stats: { nodes: nNodes, links: nLinks, sentNodes: nNodes - [...included.keys()].filter(id => skip.has(id)).length, hops: perHop, truncated, maxNodes: o.maxNodes, scannedLinks: scanned, firstChunkMs: firstChunkMs ?? 0, ms: performance.now() - t0 } };
}
export function dirOk(l, u, direction) {
  if (direction === 'both' || !l.directed) return true;
  const out = l.fromId === u;
  return direction === 'out' ? out : !out;
}
/** Non-streaming convenience: collect every chunk. */
export async function neighborhood(svc, opts, guard, principal) {
  const nodes = [], links = []; let stats = null; const hopOf = {};
  for await (const c of neighborhoodStream(svc, opts, guard, principal)) {
    if (c.type === 'end') stats = c.stats; else { for (const n of c.nodes) { nodes.push(n); hopOf[n.id] = c.hop; } links.push(...c.links); }
  }
  return { nodes, links, hopOf, stats, truncated: stats.truncated };
}

/**
 * Paths between two nodes (SPEC §23.3). Undirected by default (directed: follow link direction).
 * Returns the shortest path and every simple path of length <= maxHops, shortest first (iterative deepening with a
 * distance-to-target bound, so the search never wanders further than the remaining hop budget), capped at maxPaths.
 * Parallel links between the same two nodes count once (the lowest link id is reported).
 */
export async function findPaths(svc, opts = {}, guard = noGuard, principal) {
  const t0 = performance.now();
  const maxHops = clamp(int(opts.maxHops, 4), 1, NB_LIMITS.maxPathHops), maxPaths = clamp(int(opts.maxPaths, 50), 1, NB_LIMITS.maxPaths);
  const directed = !!opts.directed, mode = opts.mode === 'shortest' ? 'shortest' : 'all';
  const f = compileFilter({ types: opts.nodeTypes, linkTypes: opts.linkTypes, where: opts.where, linkWhere: opts.linkWhere });
  const a = svc.resolveId(String(opts.fromId ?? '')), b = svc.resolveId(String(opts.toId ?? ''));
  const na = svc.live(a), nb = svc.live(b);
  if (!na || !nb || na.kind !== 'node' || nb.kind !== 'node' || !svc.view(na, principal) || !svc.view(nb, principal)) return { found: false, message: 'start or end is not visible', paths: [], shortest: null, items: [] };
  if ((await guard([svc.view(na, principal), svc.view(nb, principal)])).length !== 2) return { found: false, message: 'start or end is not visible', paths: [], shortest: null, items: [] };
  const nodeOk = new Map(), nbrCache = new Map();
  const visible = id => { if (!nodeOk.has(id)) { const n = svc.live(id); nodeOk.set(id, !!n && n.kind === 'node' && (id === a || id === b || f.node(n)) && !!svc.view(n, principal)); } return nodeOk.get(id); };
  // neighbours of u following (reverse = against) link direction: Map(v -> lowest link id)
  const nbrs = (u, reverse = false) => {
    const k = (reverse ? 'r' : 'f') + u; if (nbrCache.has(k)) return nbrCache.get(k);
    const m = new Map();
    for (const l of svc.incidentLinks(u)) {
      if (l.fromId === l.toId || !f.link(l)) continue;
      let v; if (!directed || !l.directed) v = l.fromId === u ? l.toId : l.fromId; else if (!reverse && l.fromId === u) v = l.toId; else if (reverse && l.toId === u) v = l.fromId; else continue;
      if (!visible(v) || !svc.view(l, principal)) continue;
      if (!m.has(v) || l.id < m.get(v)) m.set(v, l.id);
    }
    const out = [...m].sort((x, y) => (x[0] < y[0] ? -1 : 1)); nbrCache.set(k, out); return out;
  };
  // BFS distances to b (over reversed edges) up to maxHops: dist bound for pruning
  const dist = new Map([[b, 0]]); let fr = [b];
  for (let d = 1; d <= maxHops && fr.length; d++) { const nx = []; for (const u of fr) for (const [v] of nbrs(u, true)) if (!dist.has(v)) { dist.set(v, d); nx.push(v); } fr = nx; }
  if (!dist.has(a)) return { found: false, message: `No path within ${maxHops} hops`, paths: [], shortest: null, items: [], stats: { ms: performance.now() - t0 } };
  const paths = []; let truncated = false; const sp = dist.get(a);
  const maxLen = mode === 'shortest' ? sp : maxHops;
  outer: for (let L = sp; L <= maxLen; L++) {
    const stackN = [a], stackL = [], on = new Set([a]);
    const dfs = u => {
      const depth = stackN.length - 1;
      if (u === b) { if (depth === L) { if (paths.length >= maxPaths) { truncated = true; return true; } paths.push({ nodeIds: [...stackN], linkIds: [...stackL], hops: L }); } return false; }
      for (const [v, lid] of nbrs(u)) {
        if (on.has(v) || !dist.has(v) || depth + 1 + dist.get(v) > L) continue;
        stackN.push(v); stackL.push(lid); on.add(v);
        const stop = dfs(v);
        stackN.pop(); stackL.pop(); on.delete(v);
        if (stop) return true;
      }
      return false;
    };
    if (dfs(a)) break outer;
  }
  // access rules: drop any path that contains an item the caller may not see
  const ids = new Set(); for (const p of paths) { p.nodeIds.forEach(i => ids.add(i)); p.linkIds.forEach(i => ids.add(i)); }
  const views = [...ids].map(id => svc.view(svc.items.get(id), principal)).filter(Boolean);
  const ok = await guard(views), okIds = new Set(ok.map(v => v.id));
  const kept = paths.filter(p => p.nodeIds.every(i => okIds.has(i)) && p.linkIds.every(i => okIds.has(i)));
  const used = new Set(); for (const p of kept) { p.nodeIds.forEach(i => used.add(i)); p.linkIds.forEach(i => used.add(i)); }
  const items = ok.filter(v => used.has(v.id)).sort((x, y) => (x.kind === y.kind ? 0 : x.kind === 'node' ? -1 : 1));
  if (!kept.length) return { found: false, message: 'No path you are allowed to see', paths: [], shortest: null, items: [], stats: { ms: performance.now() - t0 } };
  return { found: true, shortest: kept[0], paths: mode === 'shortest' ? kept.filter(p => p.hops === kept[0].hops) : kept, truncated, maxHops, items, stats: { ms: performance.now() - t0, pathCount: kept.length } };
}

/** Link-type counts around a node (drives "expand by relationship type" menus). */
export async function nodeSummary(svc, id, guard = noGuard, principal) {
  const n = svc.live(String(id)); if (!n || n.kind !== 'node') return null;
  const nv = svc.view(n, principal); if (!nv || !(await guard([nv])).length) return null;
  const others = new Map(), byType = new Map();
  for (const l of svc.incidentLinks(n.id)) {
    const lv = svc.view(l, principal); if (!lv) continue;
    const other = l.fromId === n.id ? l.toId : l.fromId, o = svc.live(other); if (!o) continue;
    others.set(other, svc.view(o, principal));
    const t = byType.get(l.type) || { type: l.type, out: 0, in: 0, total: 0, _l: [] };
    if (l.fromId === n.id) t.out++; else t.in++; t.total++; t._l.push([lv, other]); byType.set(l.type, t);
  }
  const okNodes = new Set((await guard([...others.values()].filter(Boolean))).map(v => v.id));
  const linkTypes = [...byType.values()].map(t => { const ok = t._l.filter(([, o]) => okNodes.has(o)); return { type: t.type, total: ok.length, out: ok.filter(([l]) => l.fromId === n.id).length, in: ok.filter(([l]) => l.fromId !== n.id).length }; }).filter(t => t.total).sort((x, y) => y.total - x.total || (x.type < y.type ? -1 : 1));
  return { id: n.id, type: n.type, degree: linkTypes.reduce((s, t) => s + t.total, 0), linkTypes };
}
