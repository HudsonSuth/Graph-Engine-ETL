// Saved views (SPEC §19): pure state schema shared by the server store, the MCP tools and the browser.
// A view state is plain JSON. normalizeViewState() keeps known fields, drops junk, and never throws
// (bad parts become defaults + warnings), so an imported or hand-edited view can always be loaded.
export const VIEW_STATE_VERSION = 1;
export const VIEW_BUNDLE_FORMAT = 'streamgraph-explore-views';
const LAYOUT_KEYS = ['kind', 'spacing', 'orientation', 'incremental', 'animate', 'roots', 'durationMs', 'levelProperty', 'orderBy', 'pack', 'iterations', 'seed', 'timeProperty', 'groupBy'];
const OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'exists', 'in']);
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const strs = (v, max = 5000) => (Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && x.length <= 500))].slice(0, max) : []);
const fin = v => typeof v === 'number' && Number.isFinite(v);

/** slug id from a name: "RTX 5060: what fits" -> "rtx-5060-what-fits" */
export const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'view';

export function normalizeViewState(input, warnings = []) {
  const s = isObj(input) ? input : (warnings.push('state must be an object'), {});
  if (s.version != null && s.version !== VIEW_STATE_VERSION) warnings.push(`state version ${s.version} read as v${VIEW_STATE_VERSION}`);
  const out = { version: VIEW_STATE_VERSION };
  // layout: type + settings (only known keys)
  if (isObj(s.layout)) {
    out.layout = {};
    for (const k of LAYOUT_KEYS) if (s.layout[k] !== undefined) out.layout[k] = k === 'roots' ? strs(s.layout[k], 200) : s.layout[k];
  } else out.layout = null;
  // node positions (optional): { id: [x, y] }
  out.positions = null;
  if (isObj(s.positions)) { out.positions = {}; let n = 0; for (const [id, p] of Object.entries(s.positions)) { if (n >= 50000) { warnings.push('positions capped at 50,000'); break; } if (Array.isArray(p) && fin(p[0]) && fin(p[1])) { out.positions[id] = [p[0], p[1]]; n++; } } }
  // filters: type toggles, link-type toggles, property conditions, neighbourhood focus, isolated nodes
  const f = isObj(s.filters) ? s.filters : {};
  out.filters = { hiddenTypes: strs(f.hiddenTypes, 500), hiddenLinkTypes: strs(f.hiddenLinkTypes, 500), where: [], neighborhood: null, hideIsolated: f.hideIsolated === true };
  if (strs(f.hiddenIds).length) out.filters.hiddenIds = strs(f.hiddenIds, 5000);
  for (const w of Array.isArray(f.where) ? f.where.slice(0, 50) : []) {
    if (!isObj(w) || typeof w.property !== 'string') { warnings.push('filters.where entry needs a property'); continue; }
    const op = w.op || 'eq'; if (!OPS.has(op)) { warnings.push(`filters.where: unknown op ${op}`); continue; }
    out.filters.where.push({ ...(typeof w.type === 'string' ? { type: w.type } : {}), property: w.property, op, ...(w.value !== undefined ? { value: w.value } : {}) });
  }
  if (isObj(f.neighborhood) && strs(f.neighborhood.ids).length) out.filters.neighborhood = { ids: strs(f.neighborhood.ids, 5000), depth: Number(f.neighborhood.depth) === 0 ? 0 : Math.max(1, Math.min(3, Number(f.neighborhood.depth) || 1)), /* depth 0 = exactly these nodes (SPEC §23.7) */ ...(f.neighborhood.linkTypes ? { linkTypes: strs(f.neighborhood.linkTypes, 100) } : {}) };
  // style: by URL (same-origin path only) or inline JSON
  out.style = null;
  if (isObj(s.style)) {
    if (typeof s.style.url === 'string') { if (/^\/[\w\-./]*$/.test(s.style.url) && !s.style.url.includes('..')) out.style = { url: s.style.url }; else warnings.push('style.url must be a same-origin path like /explore/x.json'); }
    else if (isObj(s.style.inline)) out.style = { inline: s.style.inline };
  }
  out.theme = s.theme === 'light' || s.theme === 'dark' ? s.theme : null;
  out.camera = isObj(s.camera) && fin(s.camera.x) && fin(s.camera.y) && fin(s.camera.ratio) && s.camera.ratio > 0 ? { x: s.camera.x, y: s.camera.y, ratio: s.camera.ratio, angle: fin(s.camera.angle) ? s.camera.angle : 0 } : null;
  out.fit = s.fit === 'selection' || s.fit === 'visible' ? s.fit : null; // camera fallback when no camera is stored
  out.selection = strs(s.selection, 2000);
  out.pinned = strs(s.pinned, 2000);
  const t = isObj(s.time) ? s.time : {};
  out.time = { live: t.live !== false, cut: fin(t.cut) ? Math.max(0, Math.min(1000, t.cut)) : null };
  const pm = isObj(s.processor) ? s.processor : {};
  out.processor = { size: pm.size !== false, alerts: pm.alerts !== false };
  // map viewer (SPEC §22.5): absent = graph mode
  out.map = null;
  if (isObj(s.map)) {
    const m = s.map, cam = isObj(m.camera) ? m.camera : null, g = isObj(m.grid) ? m.grid : {};
    const kind = ['none', 'h3', 'mgrs'].includes(g.kind) ? g.kind : 'none', max = kind === 'mgrs' ? 4 : 10;
    out.map = { mode: ['graph', 'map', 'split'].includes(m.mode) ? m.mode : (warnings.push(`map.mode ${m.mode} read as graph`), 'graph'),
      camera: cam && Array.isArray(cam.center) && fin(cam.center[0]) && fin(cam.center[1]) && Math.abs(cam.center[1]) <= 90 && fin(cam.zoom) ? { center: [cam.center[0], cam.center[1]], zoom: Math.max(0, Math.min(24, cam.zoom)), bearing: fin(cam.bearing) ? cam.bearing : 0, pitch: fin(cam.pitch) ? Math.max(0, Math.min(85, cam.pitch)) : 0 } : null,
      grid: { kind, resolution: fin(g.resolution) ? Math.max(0, Math.min(max, Math.round(g.resolution))) : (kind === 'mgrs' ? 0 : 3) },
      heat: m.heat === true, links: m.links !== false, points: m.points !== false, cluster: m.cluster === true, basemap: ['auto', 'online', 'offline'].includes(m.basemap) ? m.basemap : null };
  }
  // analysis encodings (SPEC §23.5.4): which algorithm drives size / colour / edge width; re-run on load
  out.analysis = null;
  if (isObj(s.analysis)) {
    const ALG = new Set(['degree', 'pagerank', 'betweenness', 'louvain', 'leiden', 'components', 'shortest_path', 'jaccard']);
    for (const ch of ['size', 'color', 'edge']) { const a = s.analysis[ch]; if (!isObj(a)) continue; if (!ALG.has(a.algo)) { warnings.push(`analysis.${ch}: unknown algorithm ${a.algo}`); continue; }
      const params = isObj(a.params) ? Object.fromEntries(Object.entries(a.params).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v)).slice(0, 20)) : {};
      (out.analysis ||= {})[ch] = { algo: a.algo, params, scope: ['all', 'filter', 'visible', 'selection'].includes(a.scope) ? a.scope : 'all' }; }
  }
  const pr = isObj(s.presenter) ? s.presenter : {};
  out.presenter = { title: typeof pr.title === 'string' ? pr.title.slice(0, 200) : null, caption: typeof pr.caption === 'string' ? pr.caption.slice(0, 600) : null };
  return out;
}

/** every node id a state refers to (for access filtering) */
export function referencedIds(state) {
  const ids = new Set([...(state.selection || []), ...(state.pinned || []), ...(state.layout?.roots || []), ...(state.filters?.neighborhood?.ids || []), ...(state.filters?.hiddenIds || []), ...Object.keys(state.positions || {})]);
  return [...ids];
}
/** copy of state keeping only ids in `visible` (Set). Hidden ids are dropped, never reported. */
export function restrictState(state, visible) {
  const keep = a => (a || []).filter(id => visible.has(id));
  const out = { ...state, selection: keep(state.selection), pinned: keep(state.pinned) };
  if (state.layout) out.layout = { ...state.layout, ...(state.layout.roots ? { roots: keep(state.layout.roots) } : {}) };
  if (state.positions) out.positions = Object.fromEntries(Object.entries(state.positions).filter(([id]) => visible.has(id)));
  if (state.filters?.neighborhood) { const ids = keep(state.filters.neighborhood.ids); out.filters = { ...state.filters, neighborhood: ids.length ? { ...state.filters.neighborhood, ids } : null }; }
  if (state.filters?.hiddenIds?.length) out.filters = { ...(out.filters || state.filters), hiddenIds: keep(state.filters.hiddenIds) };
  return out;
}
