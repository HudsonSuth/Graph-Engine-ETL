// Phase 2 "scale and readability", browser side (SPEC §24): semantic zoom over server-side clusters (bubbles with counts and
// labels when zoomed out, hulls when zoomed in, click to expand / collapse), meta-edges between clusters, force-directed edge
// bundling in a worker, the loaded-vs-total badge, a progressive loading bar and cost estimates before heavy work.
// Everything is drawn on one 2D overlay canvas above the WebGL canvas, in graph coordinates under the camera's affine
// transform, so a frame costs one setTransform + a few Path2D strokes however many points a bundle has.
// SCALE_UI_IMPL=wrong (SPEC §24.7): UW1 layouts run the wrong timeline/geo/community code, UW2 clicking a cluster never
// expands it, UW3 map clusters ignore the graph selection.
import { convexHull } from '../shared/clusters.js';
import { estimateLayout } from '../shared/cost.js';

let X = null;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const PALETTE = ['#4f8cff', '#f5a524', '#30a46c', '#e5484d', '#8e4ec6', '#12a594', '#d6409f', '#ffb224', '#0091ff', '#e54d2e', '#46a758', '#ab4aba'];
const fmt = n => Number(n).toLocaleString();

export function installScale(ctx) {
  X = ctx; const { S } = X, params = new URLSearchParams(location.search), cfg = X.config || {};
  S.scale = {
    mode: params.get('clusters') || localStorage.getItem('explore.clusters') || 'auto', // off | auto | on
    by: params.get('clusterBy') || localStorage.getItem('explore.clusterBy') || 'louvain',
    zoomT: Number(params.get('clusterZoom') || 0.6), autoAbove: Number(params.get('clusterAbove') || 1500), maxClusters: 300,
    ov: null, membership: new Map(), members: new Map(), expanded: new Set(), collapsed: new Set(), hidden: new Set(),
    zoomedOut: true, active: false, geom: new Map(), geomDirty: true, drawn: [], metaOn: true,
    bundle: { on: params.get('bundle') === '1', paths: null, stats: null, runId: 0, running: false, dirty: true, eligible: [], key: '' },
    totals: null, uiWrong: !!cfg.scaleUiWrong, progress: new Map(), skipConfirm: false, loading: false, version: 0,
  };
  // overlay canvas + progress bar + tooltip
  const main = $('main');
  const cv = document.createElement('canvas'); cv.id = 'scale-layer'; main.insertBefore(cv, $('#lasso-layer')); S.scale.canvas = cv;
  const bar = document.createElement('div'); bar.id = 'load-progress'; bar.hidden = true; bar.innerHTML = '<div class="bar"><i></i></div><span></span>'; main.appendChild(bar);
  const tip = document.createElement('div'); tip.id = 'scale-tip'; tip.hidden = true; main.appendChild(tip);
  bindControls();
  bindRenderer();
  new ResizeObserver(() => draw()).observe(main);
  return api;
}
export const api = { refresh, loadOverview, toggleCluster, setMode, setBundle, bundleNow, progress, confirmCost, onVisibilityChanged, onLayoutDone, onStageClick, nodeHiddenByCluster, geometry: () => X.S.scale.geom, markDirty, updateBadge, draw, rendererChanged: () => bindRenderer() };

// ---------------------------------------------------------------- controls
function bindControls() {
  const { S } = X;
  const mode = $('#cl-mode'), by = $('#cl-by'), zoom = $('#cl-zoom'), meta = $('#cl-meta'), bun = $('#bundle-on');
  if (mode) { mode.value = S.scale.mode; mode.onchange = e => setMode(e.target.value); }
  if (by) { if (![...by.options].some(o => o.value === S.scale.by)) by.add(new Option(S.scale.by, S.scale.by)); by.value = S.scale.by; by.onchange = e => { S.scale.by = e.target.value; localStorage.setItem('explore.clusterBy', S.scale.by); S.scale.expanded.clear(); S.scale.collapsed.clear(); loadOverview(); }; }
  if (zoom) { zoom.value = S.scale.zoomT; zoom.oninput = e => { S.scale.zoomT = Number(e.target.value); onCamera(true); }; }
  if (meta) { meta.checked = S.scale.metaOn; meta.onchange = e => { S.scale.metaOn = e.target.checked; draw(); }; }
  if (bun) { bun.checked = S.scale.bundle.on; bun.onchange = e => setBundle(e.target.checked); }
  $('#cl-expand-all') && ($('#cl-expand-all').onclick = () => { for (const c of S.scale.ov?.clusters || []) { S.scale.expanded.add(c.id); S.scale.collapsed.delete(c.id); } refresh(); });
  $('#cl-collapse-all') && ($('#cl-collapse-all').onclick = () => { S.scale.expanded.clear(); for (const c of S.scale.ov?.clusters || []) S.scale.collapsed.add(c.id); refresh(); });
  // live cost estimate under the Analyze panel
  const upd = () => { clearTimeout(S.scale.costT); S.scale.costT = setTimeout(updateAlgoCost, 150); };
  for (const id of ['#algo', '#algo-scope']) $(id)?.addEventListener('change', upd);
  setTimeout(updateAlgoCost, 300);
}
async function updateAlgoCost() {
  const el = $('#algo-cost'); if (!el || !X.S.core) return;
  try { const algo = $('#algo').value, scope = X.core.scopePayload($('#algo-scope').value), r = await X.api('/api/explore/cost', { op: 'algo', algo, scope });
    el.textContent = `≈ ${r.estMs < 1000 ? Math.max(1, Math.round(r.estMs)) + ' ms' : (r.estMs / 1000).toFixed(1) + ' s'} on ${fmt(r.nodes)} nodes / ${fmt(r.links)} links${r.approximate ? ' (sampled)' : ''}`; el.dataset.level = r.level; el.dataset.estMs = String(r.estMs);
  } catch { el.textContent = ''; }
}
function setMode(m) { const { S } = X; S.scale.mode = m; localStorage.setItem('explore.clusters', m); if ($('#cl-mode')) $('#cl-mode').value = m; if (m !== 'off' && !S.scale.ov) loadOverview(); else refresh(); }

// ---------------------------------------------------------------- overview (server-side aggregation)
export async function loadOverview() {
  const { S } = X; if (S.scale.mode === 'off') return refresh();
  const by = S.scale.by === 'encoding' ? (S.enc?.color?.kind === 'categorical' ? 'run:' + S.enc.color.runId : 'louvain') : S.scale.by;
  S.scale.loading = true; progress('overview', null, 'Building cluster overview…'); document.body.dataset.overview = 'loading';
  try {
    const t0 = performance.now();
    const ov = await X.api('/api/explore/clusters', { by, seed: S.layout.seed ?? 1, maxClusters: S.scale.maxClusters, membership: true });
    ov.clientMs = performance.now() - t0; ov.reqBy = by;
    S.scale.ov = ov; S.scale.membership = new Map(Object.entries(ov.membership || {})); S.scale.members = new Map();
    for (const [id, c] of S.scale.membership) { if (!S.scale.members.has(c)) S.scale.members.set(c, []); S.scale.members.get(c).push(id); }
    S.scale.cIndex = new Map(ov.clusters.map((c, i) => [c.id, i])); S.scale.cById = new Map(ov.clusters.map(c => [c.id, c]));
    S.scale.version++; S.scale.geomDirty = true;
    X.setStatus('overview', `${ov.totals.clusters} clusters (${ov.by}) of ${fmt(ov.totals.nodes)} nodes in ${Math.round(ov.timings.totalMs)} ms${ov.cached ? ' (cached)' : ''}`);
    document.body.dataset.overview = String(ov.totals.clusters);
  } catch (e) { X.toast('Cluster overview failed: ' + e.message); document.body.dataset.overview = 'error'; }
  finally { S.scale.loading = false; progress('overview', false); }
  refresh();
}
const isActive = () => { const { S } = X; if (!S.scale.ov || S.scale.mode === 'off') return false; if (S.scale.mode === 'on') return true; if (S.map?.mode && S.map.mode !== 'graph') return false; return S.core?.scope === 'focus' || X.graph.order > S.scale.autoAbove; }; // auto stays off while the map is shown (the map has its own clustering, §24.3)
const loadedMembers = c => (X.S.scale.members.get(c) || []).filter(id => X.graph.hasNode(id));
/** a cluster is drawn as one bubble when zoomed out (unless the user expanded it) or when the user collapsed it */
// auto in focus scope: nodes the user loaded (stream, search, seeds) stay visible; only clusters with nothing loaded are bubbles, unless collapsed explicitly
function aggregated(cid) { const s = X.S.scale; if (!s.active) return false; if (s.collapsed.has(cid)) return true; if (s.zoomedOut && !s.expanded.has(cid)) return !(s.mode === 'auto' && X.S.core?.scope === 'focus' && loadedMembers(cid).length); return false; }
export function nodeHiddenByCluster(id) { return X.S.scale?.hidden.has(id) || false; }
/** recompute which members hide behind bubbles, then re-apply visibility (only when the set changes) */
export function refresh() {
  const { S } = X; S.scale.active = isActive(); document.body.dataset.clusters = S.scale.active ? (S.scale.zoomedOut ? 'overview' : 'detail') : 'off';
  const hidden = new Set();
  if (S.scale.active) for (const c of S.scale.ov.clusters) if (aggregated(c.id)) for (const id of loadedMembers(c.id)) hidden.add(id);
  const changed = hidden.size !== S.scale.hidden.size || [...hidden].some(id => !S.scale.hidden.has(id));
  S.scale.hidden = hidden;
  if (focusBBox()) X.renderer()?.refresh();
  if (changed) X.applyVisibility(); else { updateBadge(); draw(); }
  S.scale.bundle.dirty = true; scheduleBundle();
}
/** focus scope: the overview lives in the server's cluster coordinates, so fix sigma's frame to that extent (empty graph too) */
function focusBBox() {
  const { S } = X, r = X.renderer(); if (!r) return false;
  if (!(S.scale.active && S.core?.scope === 'focus')) { if (S.scale.bbox) { r.setCustomBBox(null); S.scale.bbox = null; return true; } return false; }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const c of S.scale.ov.clusters) { x0 = Math.min(x0, c.x - c.r); x1 = Math.max(x1, c.x + c.r); y0 = Math.min(y0, c.y - c.r); y1 = Math.max(y1, c.y + c.r); }
  X.graph.forEachNode((id, a) => { if (Number.isFinite(a.x)) { x0 = Math.min(x0, a.x); x1 = Math.max(x1, a.x); y0 = Math.min(y0, a.y); y1 = Math.max(y1, a.y); } });
  const key = [x0, x1, y0, y1].map(v => Math.round(v)).join(',');
  if (S.scale.bbox === key) return false;
  S.scale.bbox = key; r.setCustomBBox({ x: [x0, x1], y: [y0, y1] }); return true;
}

// ---------------------------------------------------------------- geometry (graph coordinates; recomputed when positions change)
export function markDirty() { const s = X.S.scale; if (!s) return; s.geomDirty = true; s.bundle.dirty = true; }
function geometry() {
  const { S, graph } = X; if (!S.scale.geomDirty) return S.scale.geom; S.scale.geomDirty = false;
  const geom = new Map();
  for (const c of S.scale.ov?.clusters || []) {
    const ids = loadedMembers(c.id);
    if (!ids.length) { geom.set(c.id, { x: c.x, y: c.y, r: c.r, hull: null, loaded: 0 }); continue; }
    let sx = 0, sy = 0, n = 0; const pts = [];
    const step = Math.max(1, Math.floor(ids.length / 4000));
    for (let i = 0; i < ids.length; i += 1) { const a = graph.getNodeAttributes(ids[i]); if (!Number.isFinite(a.x)) continue; sx += a.x; sy += a.y; n++; if (i % step === 0) pts.push([a.x, a.y]); }
    if (!n) { geom.set(c.id, { x: c.x, y: c.y, r: c.r, hull: null, loaded: 0 }); continue; }
    const cx = sx / n, cy = sy / n; let d2 = 0; for (const [x, y] of pts) d2 += (x - cx) ** 2 + (y - cy) ** 2;
    geom.set(c.id, { x: cx, y: cy, r: Math.max(Math.sqrt(d2 / pts.length) * 1.2, 1e-9), hull: pts.length >= 3 ? convexHull(pts) : pts, loaded: ids.length });
  }
  // clusters known only from the server (focus scope): keep their server positions. In full scope, size small bubbles from
  // the typical member spread so a 1-node cluster is still visible and clickable.
  S.scale.geom = geom; return geom;
}

// ---------------------------------------------------------------- renderer hooks
let boundRenderer = null;
function bindRenderer() {
  const r = X.renderer(); if (!r || r === boundRenderer) return; boundRenderer = r;
  r.on('afterRender', draw);
  r.getCamera().on('updated', () => onCamera());
  const container = $('#canvas');
  container.addEventListener('mousemove', e => { const s = X.S.scale; if (!s?.active) { $('#scale-tip').hidden = true; return; } const rect = container.getBoundingClientRect(), h = hit(e.clientX - rect.left, e.clientY - rect.top), tip = $('#scale-tip');
    if (!h) { tip.hidden = true; container.style.cursor = ''; return; }
    const c = s.cById.get(h.id); container.style.cursor = 'pointer'; tip.hidden = false; tip.style.left = `${e.clientX - rect.left + 14}px`; tip.style.top = `${e.clientY - rect.top + 10}px`;
    const types = Object.entries(c.types).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${esc(t)} ${fmt(n)}`).join(' · ');
    tip.innerHTML = `<b>${esc(c.label)}</b><br>${fmt(c.count)} nodes · ${types}<br>${c.top.map(t => esc(t.label)).join(', ')}<br><span class="muted">${h.kind === 'bubble' ? 'click to expand' : 'click to collapse'}</span>`; });
  container.addEventListener('mouseleave', () => { $('#scale-tip').hidden = true; });
}
function onCamera(force = false) {
  const { S } = X; if (!S.scale) return; const ratio = X.renderer().getCamera().ratio, z = ratio > S.scale.zoomT;
  if (z !== S.scale.zoomedOut || force) { S.scale.zoomedOut = z; if (S.scale.ov) refresh(); }
}
export function onStageClick(event) {
  const { S } = X; if (!S.scale?.active) return false;
  const h = hit(event.x, event.y); if (!h) return false;
  toggleCluster(h.id); return true;
}
function hit(x, y) {
  const list = X.S.scale.drawn;
  for (let i = list.length - 1; i >= 0; i--) { const d = list[i]; if (d.kind === 'bubble' && Math.hypot(x - d.x, y - d.y) <= d.r + 3) return d; }
  for (let i = list.length - 1; i >= 0; i--) { const d = list[i]; if (d.kind === 'hull' && d.label && x >= d.label[0] && x <= d.label[2] && y >= d.label[1] && y <= d.label[3]) return d; }
  return null;
}
/** Expand (show members) or collapse (one bubble) a cluster. Focus scope fetches the members first. */
export async function toggleCluster(cid) {
  const { S, graph } = X;
  if (aggregated(cid)) {
    if (S.scale.uiWrong) return refresh(); // UW2
    const c = S.scale.cById.get(cid), g = geometry().get(cid);
    S.scale.expanded.add(cid); S.scale.collapsed.delete(cid);
    if (!loadedMembers(cid).length || (S.core?.scope === 'focus' && loadedMembers(cid).length < Math.min(c.count, 2000))) await fetchMembers(c);
    // progressive disclosure: members fly out of the bubble centre to their positions
    const ids = loadedMembers(cid), target = new Map();
    for (const id of ids) { const a = graph.getNodeAttributes(id); if (Number.isFinite(a.x)) { target.set(id, { x: a.x, y: a.y }); graph.mergeNodeAttributes(id, { x: g.x, y: g.y }); } }
    refresh(); X.animateTo(target, 450); markDirty();
    document.body.dataset.lastToggle = `expand:${cid}`;
  } else { S.scale.collapsed.add(cid); S.scale.expanded.delete(cid); refresh(); document.body.dataset.lastToggle = `collapse:${cid}`; }
}
async function fetchMembers(c) {
  const { S, graph } = X; progress('members', null, `Loading ${c.label}…`);
  try {
    const m = await X.api('/api/explore/clusters/members', { by: S.scale.ov.reqBy, seed: S.layout.seed ?? 1, maxClusters: S.scale.maxClusters, cluster: c.id, max: 2000 });
    const held = graph.order <= 5000 ? graph.nodes() : [];
    const r = await X.api(`/api/explore/session/${S.sessionId}/neighborhood?stream=0`, { seeds: [...m.ids, ...held], exclude: held, hops: 0, maxNodes: 20000 });
    for (const id of m.ids) { S.scale.membership.set(id, c.id); }
    S.scale.members.set(c.id, [...new Set([...(S.scale.members.get(c.id) || []), ...m.ids])]);
    X.addItems([...r.nodes, ...r.links]);
    // phyllotaxis inside the bubble (deterministic), so the cluster opens in place; the incremental layout then relaxes it
    const g = geometry().get(c.id) || c, n = m.ids.length, golden = Math.PI * (3 - Math.sqrt(5));
    m.ids.forEach((id, i) => { if (!graph.hasNode(id)) return; const rr = c.r * 0.92 * Math.sqrt((i + 0.5) / n); graph.mergeNodeAttributes(id, { x: c.x + rr * Math.cos(i * golden), y: c.y + rr * Math.sin(i * golden), placed: true }); S.newNodes.delete(id); });
    void g; markDirty();
    X.toast(`${c.label}: loaded ${fmt(m.ids.length)} of ${fmt(m.count)} members${m.truncated ? ' (highest degree first)' : ''}`);
  } catch (e) { X.toast('Loading cluster failed: ' + e.message); }
  finally { progress('members', false); }
}

// ---------------------------------------------------------------- drawing
export function draw() {
  const { S } = X, cv = S.scale?.canvas, r = X.renderer(); if (!cv || !r) return;
  const main = $('main'), dpr = window.devicePixelRatio || 1, w = main.clientWidth, h = main.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
  const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  S.scale.drawn = [];
  const showBundles = S.scale.bundle.on && S.scale.bundle.paths, showClusters = S.scale.active;
  if (!showBundles && !showClusters) return;
  // graph -> viewport is affine: read it off three points once per frame
  // (cameraState override: sigma skips refreshing its matrix while the graph is empty, as in a fresh focus-scope overview)
  const ov0 = { cameraState: r.getCamera().getState() }, o = r.graphToViewport({ x: 0, y: 0 }, ov0), ex = r.graphToViewport({ x: 1, y: 0 }, ov0), ey = r.graphToViewport({ x: 0, y: 1 }, ov0);
  const A = [ex.x - o.x, ex.y - o.y, ey.x - o.x, ey.y - o.y, o.x, o.y], scale = Math.hypot(A[0], A[1]) || 1;
  const toVp = (x, y) => [A[0] * x + A[2] * y + A[4], A[1] * x + A[3] * y + A[5]];
  const colors = S.style?.colors || {};
  if (showBundles) drawBundles(g, A, dpr, scale, colors);
  if (!showClusters) return;
  const geom = geometry(), ov = S.scale.ov, sel = S.selected;
  // meta-edges between bubbles (thickness ~ log count), drawn under the bubbles
  if (S.scale.metaOn && S.scale.zoomedOut && !(showBundles && S.scale.bundle.meta)) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.strokeStyle = colors.muted || '#8b93a7'; g.globalAlpha = 0.45; g.lineCap = 'round';
    let k = 0; for (const m of ov.metaEdges) { if (k++ > 4000) break; const a = geom.get(m.source), b = geom.get(m.target); if (!a || !b || !(aggregated(m.source) || aggregated(m.target))) continue;
      const [x1, y1] = toVp(a.x, a.y), [x2, y2] = toVp(b.x, b.y); g.lineWidth = Math.min(14, 0.8 + 1.6 * Math.log2(1 + m.count)); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    g.globalAlpha = 1;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const labels = [], maxCount = Math.max(1, ...ov.clusters.map(c => c.count)), zoomK = Math.max(0.7, Math.min(2.2, Math.sqrt(1 / r.getCamera().ratio)));
  ov.clusters.forEach((c, i) => {
    const gm = geom.get(c.id); if (!gm) return; const col = PALETTE[i % PALETTE.length];
    if (aggregated(c.id)) {
      // screen-space bubbles: area ~ member count (largest ~ 42 px), growing gently as you zoom in
      // clusters known only from the server keep the server's non-overlapping radius (graph units)
      const [x, y] = toVp(gm.x, gm.y), rad = gm.loaded ? (7 + 35 * Math.sqrt(c.count / maxCount)) * zoomK : Math.max(4, gm.r * scale);
      if (x < -rad || y < -rad || x > cv.width / dpr + rad || y > cv.height / dpr + rad) return;
      const anySel = sel.size && loadedMembers(c.id).some(id => sel.has(id));
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fillStyle = col; g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
      g.lineWidth = anySel ? 4 : 1.5; g.strokeStyle = anySel ? colors.select || '#ffd400' : col; g.stroke();
      S.scale.drawn.push({ id: c.id, kind: 'bubble', x, y, r: rad });
      labels.push({ x, y, rad, count: c.count, label: c.label, i, kind: 'bubble' });
    } else if (gm.hull && gm.hull.length >= 3) {
      g.beginPath(); gm.hull.forEach(([hx, hy], j) => { const [x, y] = toVp(hx, hy); if (j) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath();
      g.fillStyle = col; g.globalAlpha = 0.07; g.fill(); g.globalAlpha = 0.7; g.setLineDash([5, 4]); g.lineWidth = 1.2; g.strokeStyle = col; g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      let top = Infinity, tx = 0; for (const [hx, hy] of gm.hull) { const [x, y] = toVp(hx, hy); if (y < top) { top = y; tx = x; } }
      labels.push({ x: tx, y: top - 8, rad: 0, count: c.count, label: c.label, i, kind: 'hull', id: c.id });
    }
  });
  // labels: biggest clusters first, skip overlaps (progressive disclosure: more labels appear as you zoom in)
  g.textAlign = 'center'; g.textBaseline = 'middle'; const boxes = [];
  labels.sort((a, b) => b.count - a.count);
  for (const L of labels) {
    const cnt = fmt(L.count), name = L.label.length > 28 ? L.label.slice(0, 27) + '…' : L.label;
    if (L.kind === 'bubble') {
      g.font = `bold ${Math.max(10, Math.min(18, 8 + L.rad / 5))}px system-ui, sans-serif`; g.fillStyle = '#fff'; g.fillText(cnt, L.x, L.y);
      if (L.rad < 16) continue;
      g.font = '12px system-ui, sans-serif'; const w = g.measureText(name).width, bx = [L.x - w / 2 - 3, L.y + L.rad + 3, L.x + w / 2 + 3, L.y + L.rad + 19];
      if (boxes.some(b => !(bx[2] < b[0] || bx[0] > b[2] || bx[3] < b[1] || bx[1] > b[3]))) continue; boxes.push(bx);
      g.fillStyle = colors.text || '#e6e8ee'; g.fillText(name, L.x, L.y + L.rad + 11);
    } else {
      g.font = '12px system-ui, sans-serif'; const text = `${name} (${cnt})`, w = g.measureText(text).width, bx = [L.x - w / 2 - 4, L.y - 9, L.x + w / 2 + 4, L.y + 9];
      if (boxes.some(b => !(bx[2] < b[0] || bx[0] > b[2] || bx[3] < b[1] || bx[1] > b[3]))) continue; boxes.push(bx);
      g.fillStyle = colors.panel || '#1b1f2a'; g.globalAlpha = 0.85; g.fillRect(bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1]); g.globalAlpha = 1;
      g.fillStyle = PALETTE[L.i % PALETTE.length]; g.fillText(text, L.x, L.y);
      S.scale.drawn.push({ id: L.id, kind: 'hull', label: bx });
    }
  }
}
function drawBundles(g, A, dpr, scale, colors) {
  const b = X.S.scale.bundle; if (!b.path) return;
  g.setTransform(A[0] * dpr, A[1] * dpr, A[2] * dpr, A[3] * dpr, A[4] * dpr, A[5] * dpr);
  g.lineWidth = (b.meta ? 1.6 : 1) / scale; g.strokeStyle = colors.muted || '#8b93a7'; g.globalAlpha = b.meta ? 0.55 : 0.28; g.stroke(b.path);
  if (b.hlPath) { g.globalAlpha = 0.95; g.strokeStyle = colors.hover || '#ffd400'; g.lineWidth = 2 / scale; g.stroke(b.hlPath); }
  g.globalAlpha = 1; g.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ---------------------------------------------------------------- edge bundling (worker)
let bworker = null, bTimer = null;
export function setBundle(on) { const { S } = X; S.scale.bundle.on = !!on; if ($('#bundle-on')) $('#bundle-on').checked = !!on; document.body.dataset.bundle = on ? 'pending' : 'off'; if (!on) { S.scale.bundle.paths = null; S.scale.bundle.path = null; X.applyVisibility(); draw(); return; } S.scale.bundle.dirty = true; bundleNow(); }
function scheduleBundle() { const b = X.S.scale?.bundle; if (!b?.on || !b.dirty) return; clearTimeout(bTimer); bTimer = setTimeout(bundleNow, 350); }
export function bundleNow() {
  const { S, graph } = X, b = S.scale.bundle; if (!b.on) return;
  const r = X.renderer(); b.dirty = false;
  // meta level when the overview shows bubbles, else the visible links
  const edges = []; let meta = false;
  if (S.scale.active && S.scale.zoomedOut) {
    meta = true; const geom = geometry();
    for (const m of S.scale.ov.metaEdges) { const a = geom.get(m.source), c = geom.get(m.target); if (a && c) edges.push({ id: m.id, x1: a.x, y1: a.y, x2: c.x, y2: c.y, w: m.count }); if (edges.length >= 3000) break; }
  } else {
    for (const e of b.eligible) { if (!graph.hasEdge(e)) continue; const [s, t] = graph.extremities(e); if (s === t) continue; const p = graph.getNodeAttributes(s), q = graph.getNodeAttributes(t); if (r.getNodeState(s).isHidden || r.getNodeState(t).isHidden) continue; edges.push({ id: e, x1: p.x, y1: p.y, x2: q.x, y2: q.y }); }
  }
  const max = 5000, total = edges.length, use = edges.slice(0, max);
  bworker ||= new Worker('/explore/bundle.worker.js', { type: 'module' });
  const runId = ++b.runId; b.running = true; b.meta = meta; progress('bundle', 0, `Bundling ${fmt(use.length)} ${meta ? 'cluster links' : 'links'}…`);
  const t0 = performance.now();
  bworker.onmessage = ({ data: m }) => {
    if (m.runId !== b.runId) return;
    if (m.type === 'progress') return progress('bundle', m.progress, `Bundling ${fmt(use.length)} ${meta ? 'cluster links' : 'links'}…`);
    b.running = false; progress('bundle', false);
    if (m.type === 'error') { X.toast('Bundling failed: ' + m.message); return; }
    const paths = new Map(); for (let i = 0; i < m.ids.length; i++) paths.set(m.ids[i], m.points.subarray(m.offsets[i], m.offsets[i + 1]));
    b.paths = paths; b.stats = { ...m.stats, total, clientMs: performance.now() - t0, meta };
    buildBundlePath(edges.slice(max));
    X.setStatus('bundle', `${fmt(m.stats.edges)} ${meta ? 'cluster links' : 'links'} bundled in ${Math.round(m.stats.ms)} ms${total > max ? ` (${fmt(total - max)} drawn straight)` : ''}`);
    document.body.dataset.bundle = String(m.stats.edges);
    if (!meta) X.applyVisibility(); else draw();
  };
  bworker.postMessage({ type: 'run', runId, edges: use, options: { wrong: S.scale.uiWrong } });
}
function buildBundlePath(straight = []) {
  const b = X.S.scale.bundle, p = new Path2D(), hl = new Path2D(), hlSet = X.S.hlSets?.edges; let anyHl = false;
  for (const [id, a] of b.paths) { const target = hlSet?.has(id) ? (anyHl = true, hl) : p; target.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) target.lineTo(a[i], a[i + 1]); }
  for (const e of straight) { p.moveTo(e.x1, e.y1); p.lineTo(e.x2, e.y2); }
  b.path = p; b.hlPath = anyHl ? hl : null;
}
/** main.js applyVisibility hands over the links that would be drawn; while bundling is on, sigma hides them and we draw curves */
export function onVisibilityChanged(shownEdges) {
  const { S } = X; if (!S.scale) return false;
  const b = S.scale.bundle;
  if (b.on) { const key = shownEdges.length + ':' + (shownEdges[0] || '') + ':' + (shownEdges[shownEdges.length - 1] || ''); if (key !== b.key) { b.key = key; b.dirty = true; } b.eligible = shownEdges; scheduleBundle(); if (b.paths && !b.meta) buildBundlePath(); }
  updateBadge(); draw();
  return b.on && !!b.paths && !b.meta; // true = hide sigma's straight links
}
export function onLayoutDone() { markDirty(); scheduleBundle(); draw(); }

// ---------------------------------------------------------------- loaded vs total badge, progress bar, cost confirmation
export async function updateBadge() {
  const { S, graph } = X, el = $('#perf-badge'); if (!el || !X.renderer()) return;
  if (!S.scale.totals && !S.scale.totalsLoading) { S.scale.totalsLoading = true; X.api('/api/explore/cost', { op: 'overview' }).then(t => { S.scale.totals = { nodes: t.nodes, links: t.links }; updateBadge(); }).catch(() => {}).finally(() => { S.scale.totalsLoading = false; }); }
  const t = S.scale.totals, n = graph.order, m = graph.size, pct = t?.nodes ? Math.min(100, (100 * n) / t.nodes) : 100;
  const vis = S.scale.visCount ?? n;
  el.innerHTML = `<span class="pb-bar"><i style="width:${pct.toFixed(1)}%"></i></span>nodes <b>${fmt(n)}</b> / ${t ? fmt(t.nodes) : '?'} loaded (${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%) · links <b>${fmt(m)}</b> / ${t ? fmt(t.links) : '?'}${S.scale.active ? ` · overview ${fmt(S.scale.ov.totals.clusters)} clusters` : ''} · drawn ${fmt(vis)}`;
  Object.assign(el.dataset, { loadedNodes: n, loadedLinks: m, totalNodes: t?.nodes ?? '', totalLinks: t?.links ?? '' });
}
/** progress(key, fraction 0..1 | null = indeterminate | false = done, label) */
export function progress(key, frac, label) {
  const { S } = X, el = $('#load-progress'); if (!S.scale || !el) return;
  if (frac === false) S.scale.progress.delete(key); else S.scale.progress.set(key, { frac, label: label ?? S.scale.progress.get(key)?.label ?? key, at: performance.now() });
  const cur = [...S.scale.progress.values()].sort((a, b) => b.at - a.at)[0];
  el.hidden = !cur; document.body.dataset.loading = cur ? [...S.scale.progress.keys()].join(',') : '';
  if (!cur) return;
  el.classList.toggle('indet', cur.frac == null); el.querySelector('i').style.width = cur.frac == null ? '30%' : `${Math.round(Math.max(0.02, Math.min(1, cur.frac)) * 100)}%`;
  el.querySelector('span').textContent = cur.label + (cur.frac != null ? ` ${Math.round(cur.frac * 100)}%` : '');
}
/** Estimate first; ask before anything priced "high" (≥ 2 s) or a neighbourhood over 5,000 nodes. Resolves true = go ahead. */
export async function confirmCost(body, what) {
  const { S } = X; let r;
  try { r = await X.api('/api/explore/cost', body); } catch { return true; }
  S.scale.lastCost = r; document.body.dataset.lastCost = `${r.op}:${r.level}`;
  const heavy = r.level === 'high' || (r.op === 'neighborhood' && r.estNodes > 5000);
  if (!heavy || S.scale.skipConfirm) return true;
  const d = $('#cost-dialog'); if (!d) return true;
  const time = r.estMs < 1000 ? `${Math.round(r.estMs)} ms` : `${(r.estMs / 1000).toFixed(1)} s`;
  $('#cost-text').innerHTML = r.op === 'neighborhood' ? `${esc(what)} would load about <b>${fmt(r.estNodes)}</b> nodes and <b>${fmt(r.estLinks)}</b> links${r.truncated ? ' (capped)' : ''}.` : `${esc(what)} on <b>${fmt(r.nodes)}</b> nodes / <b>${fmt(r.links)}</b> links takes about <b>${time}</b>${r.approximate ? ' (sampled)' : ''}.`;
  $('#cost-basis').textContent = r.basis ? `Estimate from ${r.basis}.` : '';
  d.showModal(); document.body.dataset.costDialog = 'open';
  return new Promise(res => d.addEventListener('close', () => { delete document.body.dataset.costDialog; res(d.returnValue === 'run'); }, { once: true }));
}
export function layoutEstimate(kind, n, m) { return estimateLayout(kind, n, m); }
