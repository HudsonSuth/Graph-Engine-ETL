// StreamGraph Explore — WebGL exploration UI (SPEC §8-§11). Sigma.js v4 + graphology.
import Graph from 'graphology';
import Sigma from 'sigma';
import { sdfCircle, sdfSquare, sdfDiamond, sdfTriangle, layerFill, pathLine, pathLoop, pathCurved, extremityArrow, layerDashed } from 'sigma/rendering';
import { layerBorder } from '@sigma/node-border';
import { layerImage } from '@sigma/node-image';
import { SymbolAtlas } from './symbols.js';
import { fieldLevel, fieldLabel, resolveSymbol } from '../shared/symbols.js';
import { compileStyle, THEMES } from '../shared/style.js';
import { ViewStore, neighborhood } from '../shared/view-store.js';
import { LAYOUT_KINDS, DEFAULT_LAYOUT } from '../shared/layouts.js';
import { displayLabel } from '../shared/model.js';
import { geoOf } from '../shared/geo-core.js';
import * as CL from './core-loop.js';
import * as SC from './scale.js';
import { whereOk as whereOkShared } from '../shared/core-filter.js';
import { WebGPURenderer } from './webgpu/gpu-renderer.js';
import { loadPref, savePref, resolveRenderer, fallbackAfterFailure, RENDERER_LABEL } from '../shared/renderer-select.js';
import { installIndexSearch } from './index-search.js';

const $ = s => document.querySelector(s);
const api = async (path, body) => { const r = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText); return r.json(); };
const params = new URLSearchParams(location.search);

// ---------------------------------------------------------------- state
const S = {
  sizeScale: 1,
  theme: localStorage.getItem('explore.theme') || params.get('theme') || 'dark',
  styleConfig: null, style: null,
  layout: { ...DEFAULT_LAYOUT, ...JSON.parse(localStorage.getItem('explore.layout') || '{}') },
  pinned: new Set(), selected: new Set(), hovered: null,
  hiddenTypes: new Set(), collapsed: new Map(), timeCut: null, live: true,
  sessionId: null, queue: [], newNodes: new Set(), pathIds: null,
  metrics: { fps: 0, frameMs: [], deltaApplyMs: [], lastLayoutMs: 0, layoutRuns: 0, worker: true, degraded: false },
  undo: [], lag: {},
  // optional Flink processor overlay (SPEC §18): per-node metrics + alerts, polled from /api/explore/processor/metrics
  pm: { enabled: false, size: true, alerts: true, metrics: {}, alertIds: new Set(), polls: 0 },
  // saved views (SPEC §19): extra view-only filters a view can carry. All empty by default = unchanged behaviour.
  hiddenEdgeTypes: new Set(), where: [], neighborhood: null, hideIsolated: false, nbSet: null,
  styleUrl: null, currentView: null, presenting: false, present: null,
  // entity resolution (SPEC §21): 'all' | 'records' | 'entities'; recEntity = record id -> entity id (from RESOLVES_TO links)
  // map viewer (SPEC §22): mode graph | map | split; the MapLibre bundle loads on first use
  map: { mode: ['map', 'split'].includes(params.get('mode')) ? params.get('mode') : 'graph', view: null, loading: null, config: null, grid: { kind: 'none', resolution: 3 }, heat: false, links: true, points: true, cluster: params.get('mapcluster') === '1', dirty: true, hlDirty: true, geo: new Map(), heatData: null, timer: null },
  er: { enabled: false, view: params.get('er') || 'all', possible: true, recEntity: new Map(), proj: new Set(), dirty: true, token: 0 },
};
const graph = new Graph({ type: 'directed', multi: true, allowSelfLoops: true });
const store = new ViewStore(graph, {
  onNodeAdded: it => { S.newNodes.add(it.id); },
  onItemChanged: it => { S.dirtyStyle.add(it.id); },
});
S.dirtyStyle = new Set();

// ---------------------------------------------------------------- style
async function loadStyle() {
  const stylePath = params.get('style');
  const saved = stylePath ? null : localStorage.getItem('explore.style');
  S.styleConfig = saved ? JSON.parse(saved) : await api(stylePath || '/explore/style-config.v1.json');
  S.styleUrl = saved ? null : stylePath || '/explore/style-config.v1.json';
  applyStyleConfig(S.styleConfig, false);
}
function applyStyleConfig(cfg, persist = true) {
  S.style = compileStyle(cfg, { theme: S.theme });
  if (S.style.symbols) atlas.configure({ size: S.style.symbols.size, defaultSet: S.style.symbols.defaultSet });
  // the symbol image layer exists only while the style has a "symbols" block (default renderer is unchanged)
  if (renderer && !!S.style.symbols !== rendererHasSymbols) { renderer.kill(); renderer = null; createRenderer(); S.fieldLevel = 0; applyVisibility(); applyHighlight(); }
  S.styleConfig = cfg;
  if (persist) { localStorage.setItem('explore.style', JSON.stringify(cfg)); S.styleUrl = null; }
  $('#style-warnings').textContent = S.style.warnings.length ? S.style.warnings.join('\n') : '';
  $('#style-version').textContent = `style v${cfg?.version ?? '?'}`;
  document.documentElement.dataset.theme = S.theme;
  const c = S.style.colors; for (const [k, v] of Object.entries(c)) document.documentElement.style.setProperty(`--${k}`, v);
  restyleAll();
}
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
function restyleNode(id) {
  if (!graph.hasNode(id)) return;
  const it = graph.getNodeAttribute(id, 'item'), st = S.style.nodeStyle(it);
  const pinned = S.pinned.has(id);
  const pm = S.pm.enabled ? S.pm.metrics[id] : null, alert = pm?.alert && S.pm.alerts;
  const size = pm && S.pm.size ? st.size * Math.min(3, 1 + 0.35 * Math.log2(1 + pm.degree)) : st.size;
  const badges = [...(st.badges || []), ...(alert ? ['\u26a0'] : [])];
  if (it.type === 'Entity' && !st.symbol && it.properties?.recordCount > 1) badges.push(`\u00d7${it.properties.recordCount}`); // record-count badge (symbol styles use a count corner)
  const sym = st.symbol ? atlas.get(st.symbol) : null; // null until the symbol image is composed (falls back to the plain shape)
  const base = trunc(displayLabel(it), st.labelMaxLength || 28);
  graph.mergeNodeAttributes(id, { size: sym ? size * 1.45 : size, color: st.color, shape: sym ? 'square' : st.renderShape, image: sym ? sym.image : null, imageDim: sym ? sym.imageDim : null, symbol: !!sym, symKey: st.symbol && !sym ? st.symbol.key : null, symId: st.symbol ? st.symbol.key : null,
    label: (S.style.symbols ? fieldLabel(it, base, S.style.symbols, S.fieldLevel || 0) : base) + (badges.length ? ' ' + badges.join('') : ''),
    borderColor: pinned ? S.style.colors.hover : alert ? (pm.alert.severity === 'high' ? '#e5484d' : '#f5a524') : st.borderWidth > 0 && st.borderColor ? st.borderColor : st.color, opacity: st.opacity, labelShow: st.labelVisible,
    streamDegree: pm ? pm.degree : null, streamAlert: alert ? pm.alert.alertId : null });
  if (S.enc && (S.enc.size || S.enc.color)) CL.encodeNode(id); // algorithm results mapped to size / colour (SPEC §23.5)
}
function restyleEdge(id) {
  if (!graph.hasEdge(id)) return;
  const it = graph.getEdgeAttribute(id, 'item'), st = S.style.linkStyle(it);
  graph.mergeEdgeAttributes(id, { size: st.width, color: st.color, head: st.arrow === 'to' || st.arrow === 'both' ? 'arrow' : 'none', tail: st.arrow === 'both' ? 'arrow' : 'none',
    dashed: st.dash === 'dashed' || st.dash === 'dotted', label: it.label || it.type });
  if (S.enc?.edge) CL.encodeEdge(id);
}
function restyleAll() { if (!S.style) return; graph.forEachNode(restyleNode); graph.forEachEdge(restyleEdge); renderer?.refresh(); updateLegend(); S.map.dirty = true; }

// ---------------------------------------------------------------- renderer
let renderer = null, rendererHasSymbols = false;
const CLEAR = 'rgba(0,0,0,0)';
let symTimer = null;
const readyKeys = new Set(); // symbol keys composed since the last frame: only nodes waiting on those are restyled
const atlas = new SymbolAtlas({ onReady: key => { readyKeys.add(key); if (symTimer) return; symTimer = requestAnimationFrame(() => { symTimer = null; const k = new Set(readyKeys); readyKeys.clear(); graph.forEachNode((id, a) => { if (a.symKey && k.has(a.symKey)) restyleNode(id); }); renderer?.refresh(); updateLegend(); if (S.presenting) renderPresenterOverlay(); S.map.dirty = true; S.map.view?.refreshSymbols(); }); } });
// dense views: shrink nodes so links and structure stay visible (1 up to 1,500 nodes, down to 0.35 at ~12k)
const sizeScaleFor = n => Math.max(0.35, Math.min(1, Math.sqrt(1500 / Math.max(1, n))));
// Renderer choice (toolbar: Auto / WebGPU / WebGL, persisted in localStorage 'explore.renderer'; ?renderer= overrides once).
// Both renderers draw the same graphology graph with the same style functions below; WebGPU is optional and falls back
// to WebGL (sigma) with a visible note when it cannot start or the device is lost.
S.rnd = { pref: 'auto', active: 'webgl', note: null, device: null, adapter: null, drawMs: [], t0: 0 };
const C0 = () => S.style.colors;
const dimmed = (s, g) => g.hasHighlighted && !s.isHighlighted && S.style.settings.highlight.dimOthers;
/** style functions shared by the WebGPU renderer (sigma gets the same logic through its styles block) */
const gpuStyles = {
  nodeSize: (a, s) => (a.size || 6) * S.sizeScale * (s.isHovered ? 1.35 : s.isSelected ? 1.2 : 1),
  // symbol images are not drawn by the WebGPU renderer: those nodes show as their plain coloured shape
  nodeColor: (a, s, g) => (dimmed(s, g) ? C0().dim : a.color),
  nodeBorder: (a, s, g) => (s.isSelected ? C0().select : dimmed(s, g) ? C0().dim : a.borderColor || a.color),
  nodeShape: a => a.shape || 'circle', nodeOpacity: a => a.opacity ?? 1,
  label: a => a.label, labelSize: () => (S.presenting ? 20 : 14),
  labelColor: (a, s, g) => (g.hasHighlighted && !s.isHighlighted ? C0().muted : C0().text),
  labelVisibility: (a, s, g) => (s.isHovered || s.isSelected || (g.hasHighlighted && s.isHighlighted) ? 'visible' : a.labelShow === 'never' ? 'hidden' : a.labelShow === 'always' ? 'visible' : 'auto'),
  edgeSize: (a, s) => (a.size || 1) * (s.isHighlighted || s.isPath ? 2 : 1),
  edgeColor: (a, s, g) => (s.isPath ? C0().hover : g.hasHighlighted && !s.isHighlighted ? C0().dim : a.color),
  edgeDashed: (a, s) => !!a.dashed && !s.isPath,
  background: () => C0().background, backdrop: () => C0().panel,
};
async function chooseRenderer(pref = S.rnd.pref) {
  S.rnd.pref = pref;
  const r = await resolveRenderer(pref);
  S.rnd.note = r.note; S.rnd.active = r.renderer;
  if (r.renderer === 'webgpu') {
    try { S.rnd.device = await WebGPURenderer.prepare(r.adapter); }
    catch (e) { const f = fallbackAfterFailure(pref, e); S.rnd.active = f.renderer; S.rnd.note = f.note; S.rnd.device = null; }
  }
  return S.rnd.active;
}
function rendererFailed(err) {
  // runtime failure (device lost, out of memory, pipeline error): fall back to WebGL, keep the camera, say so
  if (S.rnd.active !== 'webgpu') return;
  const f = fallbackAfterFailure(S.rnd.pref, err); S.rnd.note = f.note; S.rnd.device = null;
  console.warn(f.note);
  setTimeout(() => rebuildRenderer('webgl'), 0);
}
function rebuildRenderer(active) {
  const cam = renderer?.getCamera().getState();
  if (renderer) { renderer.kill(); renderer = null; }
  S.rnd.active = active; createRenderer(); applyVisibility(); applyHighlight();
  if (cam) renderer.getCamera().setState(cam);
  renderer.refresh(); updateRendererStatus(true);
}
async function switchRenderer(pref) {
  pref = savePref(pref);
  const active = await chooseRenderer(pref);
  rebuildRenderer(active);
  return S.rnd;
}
function updateRendererStatus(noteToast = false) {
  const el = $('#renderer-status'); if (!el) return;
  const fps = S.metrics.fps, fm = S.metrics.frameMs.slice(-30), frame = fm.length ? fm.reduce((a, b) => a + b, 0) / fm.length : 0;
  const dm = S.rnd.drawMs.slice(-30), draw = dm.length ? dm.reduce((a, b) => a + b, 0) / dm.length : 0;
  const fb = S.rnd.note ? ' (fallback)' : '';
  el.textContent = `${RENDERER_LABEL[S.rnd.active]}${fb} · ${fps} fps · ${frame.toFixed(1)} ms`;
  el.title = `Frame time ${frame.toFixed(1)} ms (between animation frames), draw ${draw.toFixed(2)} ms (CPU time inside the renderer)\n` + (S.rnd.note ? S.rnd.note + '\n' : '') + (S.rnd.active === 'webgpu' && renderer?.info ? `Adapter: ${[renderer.info.vendor, renderer.info.architecture, renderer.info.description].filter(Boolean).join(' · ') || 'unknown'}${renderer.info.isFallbackAdapter ? ' (software fallback)' : ''}` : 'sigma.js on WebGL');
  el.classList.toggle('warn', !!S.rnd.note);
  document.body.dataset.renderer = S.rnd.active;
  const sel = $('#renderer-kind'); if (sel && sel.value !== S.rnd.pref) sel.value = S.rnd.pref;
  if (noteToast && S.rnd.note) toast(S.rnd.note);
}
function bindRendererControl() {
  const sel = $('#renderer-kind'); if (!sel) return;
  sel.value = S.rnd.pref;
  sel.onchange = () => switchRenderer(sel.value).catch(e => toast('Renderer: ' + e.message));
}
function createRenderer() {
  const withSymbols = rendererHasSymbols = !!S.style?.symbols;
  if (S.rnd.active === 'webgpu' && S.rnd.device) {
    try {
      renderer = new WebGPURenderer(graph, $('#canvas'), { device: S.rnd.device, styles: gpuStyles, onFail: rendererFailed,
        settings: { readback: params.get('gpuReadback') === '1', enableNodeDrag: true, labelRenderedSizeThreshold: 6, labelDensity: S.presenting ? 0.35 : 0.7, enableEdgeEvents: graph.size <= 300000 } });
    } catch (e) { const f = fallbackAfterFailure(S.rnd.pref, e); S.rnd.active = 'webgl'; S.rnd.note = f.note; S.rnd.device = null; renderer = null; console.warn(f.note); }
  } else if (S.rnd.active === 'webgpu') S.rnd.active = 'webgl';
  if (!renderer) createSigma(withSymbols);
  renderer.on('beforeRender', () => { S.rnd.t0 = performance.now(); });
  renderer.on('afterRender', () => { S.rnd.drawMs.push(performance.now() - S.rnd.t0); if (S.rnd.drawMs.length > 120) S.rnd.drawMs.shift(); });
  wireRenderer();
}
function createSigma(withSymbols) {
  const C = () => S.style.colors;
  const edgeColor = (a, s, g) => (s.isPath ? C().hover : g.hasHighlighted && !s.isHighlighted ? C().dim : a.color);
  renderer = new Sigma(graph, $('#canvas'), {
    primitives: {
      nodes: { shapes: [sdfCircle(), sdfSquare({ cornerRadius: 0.15 }), sdfDiamond(), sdfTriangle()],
        // NOTE: @sigma/node-border 4.0.0 drops instances when the border *size* is attribute-driven (verified headless),
        // so the ring is a fixed 2px and 'no border' is drawn in the fill colour.
        layers: [layerBorder({ borders: [{ size: 2, color: { attribute: 'borderColor', default: '#000' }, mode: 'pixels' }, { size: 0, color: { attribute: 'color' }, fill: true }] }),
          // symbols (SPEC §20): composed images in a texture atlas, drawn over a transparent square
          ...(withSymbols ? [layerImage({ drawingMode: 'image', imageAttribute: 'image', padding: 0, textureManagerOptions: { size: { mode: 'force', value: S.style.symbols.size }, objectFit: 'contain' } })] : [])] },
      edges: { paths: [pathLine(), pathLoop(), pathCurved()], extremities: [extremityArrow()], // Attribute-driven dash sizes drop instances in sigma 4.0.6 (verified headless), so dash geometry is constant
        // and solid links paint their gaps in the link colour via an attribute-driven gapColor.
        layers: [layerDashed({ dashSize: { value: 7, mode: 'pixels' }, gapSize: { value: 5, mode: 'pixels' }, gapColor: { attribute: 'gapColor' } })] },
    },
    customNodeState: { isSelected: false, isPath: false },
    customEdgeState: { isPath: false },
    styles: {
      nodes: {
        x: { attribute: 'x' }, y: { attribute: 'y' },
        shape: { attribute: 'shape', defaultValue: 'circle' },
        size: (a, s) => (a.size || 6) * S.sizeScale * (s.isHovered ? 1.35 : s.isSelected ? 1.2 : 1),
        color: (a, s, g) => (a.symbol ? CLEAR : g.hasHighlighted && !s.isHighlighted && S.style.settings.highlight.dimOthers ? C().dim : a.color),
        borderColor: (a, s, g) => (s.isSelected ? C().select : a.symbol ? CLEAR : g.hasHighlighted && !s.isHighlighted && S.style.settings.highlight.dimOthers ? C().dim : a.borderColor || a.color),
        ...(withSymbols ? { image: (a, s, g) => (!a.symbol ? null : g.hasHighlighted && !s.isHighlighted && S.style.settings.highlight.dimOthers ? a.imageDim : a.image) } : {}),
        label: { attribute: 'label' },
        labelSize: () => (S.presenting ? 20 : 14), // 14 = sigma's default; presenter mode enlarges labels
        labelColor: (a, s, g) => (g.hasHighlighted && !s.isHighlighted ? C().muted : C().text),
        labelVisibility: (a, s, g) => (s.isHidden ? 'hidden' : s.isHovered || s.isSelected || (g.hasHighlighted && s.isHighlighted) ? 'visible' : a.labelShow === 'never' ? 'hidden' : a.labelShow === 'always' ? 'visible' : 'auto'),
        visibility: { whenState: 'isHidden', then: 'hidden', else: 'visible' },
        depth: (a, s) => (s.isHovered || s.isSelected || s.isHighlighted ? 'topNodes' : 'nodes'),
        backdropVisibility: (a, s) => (s.isHovered ? 'visible' : 'hidden'),
        backdropColor: () => C().panel, backdropShadowColor: () => C().hover, backdropShadowBlur: 14, backdropPadding: 5,
        opacity: { attribute: 'opacity', defaultValue: 1 },
      },
      edges: {
        size: (a, s) => (a.size || 1) * (s.isHighlighted || s.isPath ? 2 : 1),
        color: edgeColor,
        gapColor: (a, s, g) => (a.dashed && !s.isPath ? 'rgba(0,0,0,0)' : edgeColor(a, s, g)),
        head: { attribute: 'head', defaultValue: 'none' }, tail: { attribute: 'tail', defaultValue: 'none' },
        parallelPath: 'curved',
        visibility: { whenState: 'isHidden', then: 'hidden', else: 'visible' },
        depth: (a, s) => (s.isHighlighted || s.isPath ? 'topEdges' : 'edges'),
      },
      stage: { background: () => C().background },
    },
    settings: { enableNodeDrag: true, enableEdgeEvents: graph.size <= 50000, hideEdgesOnMove: false, labelRenderedSizeThreshold: 6, labelDensity: 0.7, zoomToSizeRatioFunction: r => Math.sqrt(r), itemSizesReference: 'screen', autoRescale: true },
  });
  if (withSymbols) renderer.getCamera().on('updated', st => { const l = fieldLevel(S.style.symbols, st.ratio); if (l !== (S.fieldLevel || 0)) { S.fieldLevel = l; graph.forEachNode(restyleNode); } });
  // link picking costs a second edge pass every frame; on big views switch it off while the camera moves and back on
  // when it rests (right-click / hover on links still works whenever the view is still) (SPEC §23.8)
  { let t = null; renderer.getCamera().on('updated', () => { if (graph.size <= 5000 || graph.size > 50000) return; if (renderer.getSetting('enableEdgeEvents')) renderer.setSetting('enableEdgeEvents', false); clearTimeout(t); t = setTimeout(() => renderer.setSetting('enableEdgeEvents', true), 250); }); }
}
function wireRenderer() {
  renderer.on('enterNode', ({ node }) => { S.hovered = node; });
  renderer.on('leaveNode', () => { S.hovered = null; });
  renderer.on('clickNode', ({ node, event }) => select(node, event?.original?.shiftKey || event?.original?.metaKey || event?.original?.ctrlKey));
  renderer.on('doubleClickNode', ({ node, event }) => { event?.preventSigmaDefault?.(); expand([node]); });
  renderer.on('clickStage', ({ event }) => { if (S.scale && SC.onStageClick(event)) return; clearSelection(); }); // cluster bubbles / hull labels first (SPEC §24.1)
  // context menus (SPEC §23.7): right-click a node, a link or the canvas
  const menuAt = ev => { ev?.original?.preventDefault?.(); ev?.preventSigmaDefault?.(); const r = $('main').getBoundingClientRect(); return [ev.original.clientX - r.left, ev.original.clientY - r.top]; };
  renderer.on('rightClickNode', ({ node, event }) => { const [x, y] = menuAt(event); CL.nodeMenu(node, x, y); });
  renderer.on('rightClickEdge', ({ edge, event }) => { const [x, y] = menuAt(event); CL.edgeMenu(edge, x, y); });
  renderer.on('rightClickStage', ({ event }) => { const [x, y] = menuAt(event); CL.stageMenu(x, y); });
  renderer.on('nodeDragStart', ({ node }) => { stopAnimation(node); });
  renderer.on('nodeDragEnd', ({ allDraggedNodes }) => { if ($('#pin-on-drag').checked) for (const n of allDraggedNodes) pin(n, true); if (S.scale) SC.onLayoutDone(); });
  if (S.scale) SC.api.rendererChanged();
}

// ---------------------------------------------------------------- selection + highlight (§10.2)
function applyHighlight() {
  renderer.setNodesState(graph.nodes(), { isHighlighted: false, isSelected: false, isPath: false });
  renderer.setEdgesState(graph.edges(), { isHighlighted: false, isPath: false });
  const nodes = new Set(), edges = new Set();
  if (S.pathIds) { for (const n of S.pathIds.nodeIds) if (graph.hasNode(n)) nodes.add(n); for (const e of S.pathIds.linkIds) if (graph.hasEdge(e)) { edges.add(e); renderer.setEdgeState(e, { isPath: true }); } }
  for (const id of S.selected) { if (!graph.hasNode(id)) continue; const nb = neighborhood(graph, id); nb.nodes.forEach(n => nodes.add(n)); nb.links.forEach(e => edges.add(e)); }
  if (nodes.size) renderer.setNodesState([...nodes], { isHighlighted: true });
  if (edges.size) renderer.setEdgesState([...edges], { isHighlighted: true });
  const sel = [...S.selected].filter(id => graph.hasNode(id)); if (sel.length) renderer.setNodesState(sel, { isSelected: true });
  S.hlSets = { nodes, edges }; S.map.hlDirty = true;
  showDetails(); if (S.core) CL.updateBulkbar();
}
function select(id, additive = false) { if (!additive) S.selected.clear(); if (S.selected.has(id) && additive) S.selected.delete(id); else S.selected.add(id); S.pathIds = null; applyHighlight(); }
function clearSelection() { S.selected.clear(); S.pathIds = null; applyHighlight(); }
function selectAllVisible() { if (graph.order > 20000) return toast('Select all is capped at 20,000 visible nodes'); S.selected = new Set(graph.filterNodes(n => !renderer.getNodeState(n).isHidden)); applyHighlight(); }

// ---------------------------------------------------------------- visibility: type filter, collapse, time window (§11.3, §11.6)
function itemTime(it) { const t = Date.parse(it.eventTime || it.updatedAt); return Number.isNaN(t) ? null : t; }
function nodeHidden(id) {
  const it = graph.getNodeAttribute(id, 'item');
  if (S.scale?.hidden.has(id)) return true; // inside a collapsed / zoomed-out cluster bubble (SPEC §24.1)
  if (S.hiddenTypes.has(it.type)) return true;
  if (S.manualHidden?.has(id) || (S.core?.isolate && !S.core.isolate.has(id))) return true; // bulk hide / path isolate (SPEC §23)
  if (S.er.view !== 'all') { const isEnt = it.type === 'Entity' && String(id).startsWith('er:'); if (S.er.view === 'records' ? isEnt : (!isEnt && S.er.recEntity.has(id))) return true; }
  if (S.where.length && !S.where.every(w => whereOk(w, it))) return true;
  if (S.nbSet && !S.nbSet.has(id)) return true;
  for (const set of S.collapsed.values()) if (set.has(id)) return true;
  if (S.timeCut != null) { const t = itemTime(it); if (t != null && t > S.timeCut) return true; }
  return false;
}
const whereOk = whereOkShared; // same semantics as the server-side scopes (shared/core-filter.js)
/** neighbourhood focus: the seed nodes plus everything within `depth` hops over non-hidden link types */
function computeNeighborhood() {
  const nb = S.neighborhood; if (!nb) { S.nbSet = null; return; }
  const ok = new Set(nb.ids.filter(id => graph.hasNode(id))); let frontier = [...ok];
  for (let d = 0; d < (nb.depth ?? 1); d++) { // depth 0 = exactly these nodes (selection set as filter)
    const next = [];
    for (const id of frontier) graph.forEachEdge(id, (e, a, src, tgt) => { const t = a.item.type; if (S.hiddenEdgeTypes.has(t) || (nb.linkTypes && !nb.linkTypes.includes(t))) return; const o = src === id ? tgt : src; if (!ok.has(o)) { ok.add(o); next.push(o); } });
    frontier = next;
  }
  S.nbSet = ok;
}
function applyVisibility() {
  computeNeighborhood();
  const hidden = [], shown = [];
  graph.forEachNode(n => (nodeHidden(n) ? hidden : shown).push(n));
  if (hidden.length) renderer.setNodesState(hidden, { isHidden: true });
  if (shown.length) renderer.setNodesState(shown, { isHidden: false });
  const he = [], se = [];
  graph.forEachEdge((e, a, s, t) => { const it = a.item; const tHide = S.timeCut != null && (itemTime(it) ?? 0) > S.timeCut; (tHide || renderer.getNodeState(s).isHidden || renderer.getNodeState(t).isHidden || S.hiddenEdgeTypes?.has(it.type) || (S.core?.isolateLinks && !S.core.isolateLinks.has(e)) || (!S.er.possible && it.type === 'POSSIBLY_SAME') ? he : se).push(e); });
  if (he.length) renderer.setEdgesState(he, { isHidden: true });
  if (se.length) renderer.setEdgesState(se, { isHidden: false });
  if (S.hideIsolated) { // nodes left without a visible link are hidden too (view option)
    const deg = new Map(); for (const e of se) { const [s, t] = graph.extremities(e); deg.set(s, 1); deg.set(t, 1); }
    const iso = graph.filterNodes(n => !renderer.getNodeState(n).isHidden && !deg.has(n) && !S.selected.has(n));
    if (iso.length) renderer.setNodesState(iso, { isHidden: true });
  }
  for (const id of S.selected) if (renderer.getNodeState(id)?.isHidden && !S.scale?.hidden.has(id)) S.selected.delete(id); // selection survives cluster aggregation
  if (S.scale) { S.scale.visCount = shown.length - (S.hideIsolated ? 0 : 0); if (SC.onVisibilityChanged(se)) renderer.setEdgesState(se, { isHidden: true }); } // bundling draws these links as curves
  updateLegend(); updateCounts(); S.map.dirty = true;
  if (S.core) { CL.onVisibilityChanged(); CL.updateScopeBadge(); }
}
function toggleType(type) { S.undo.push({ kind: 'filter', hiddenTypes: new Set(S.hiddenTypes) }); if (S.hiddenTypes.has(type)) S.hiddenTypes.delete(type); else S.hiddenTypes.add(type); applyVisibility(); }

// ---------------------------------------------------------------- legend (§10.4)
let legendTimer = null;
function updateLegend() {
  if (legendTimer) return;
  legendTimer = requestAnimationFrame(() => {
    legendTimer = null;
    const counts = new Map(), all = new Set();
    graph.forEachNode((n, a) => { all.add(a.type); if (!renderer?.getNodeState(n).isHidden || S.hiddenTypes.has(a.type)) counts.set(a.type, (counts.get(a.type) || 0) + (renderer?.getNodeState(n).isHidden ? 0 : 1)); });
    for (const t of S.hiddenTypes) if (all.has(t)) counts.set(t, counts.get(t) || 0);
    const entries = S.style.legend(new Map([...counts].map(([t, c]) => [t, S.hiddenTypes.has(t) ? 1 : c])));
    $('#legend-title').textContent = S.styleConfig?.legend?.title || 'Types';
    $('#legend').innerHTML = entries.map(e => `<label class="legend-item ${S.hiddenTypes.has(e.type) ? 'off' : ''}" data-type="${esc(e.type)}"><input type="checkbox" ${S.hiddenTypes.has(e.type) ? '' : 'checked'}>${e.symbol && S.symbols.img(e.symbol) ? `<img class="lg-sym" src="${S.symbols.img(e.symbol)}" alt="">` : `<span class="glyph ${e.shape}" style="--c:${e.color}"></span>`}<span class="lt">${esc(e.type)}</span><span class="lc">${S.hiddenTypes.has(e.type) ? 'hidden' : counts.get(e.type)}</span></label>`).join('');
  });
}
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

// ---------------------------------------------------------------- layout (worker + animation) §9
const worker = new Worker('/explore/layout.worker.js', { type: 'module' });
let runId = 0, runNodes = null, layoutT0 = 0; const layoutWaiters = [];
worker.onmessage = ({ data: m }) => {
  if (m.type === 'error') return toast('Layout error: ' + m.message);
  if (m.runId !== runId || !runNodes) return;
  // large graphs: show intermediate force frames at most every 750 ms (each frame re-uploads every position to the GPU)
  if (!m.done && runNodes.length > 3000) { const t = performance.now(); if (t - (S.lastStreamApply || 0) < 750) return; S.lastStreamApply = t; }
  const target = new Map();
  runNodes.forEach((id, i) => { const x = m.positions[2 * i], y = m.positions[2 * i + 1]; if (Number.isFinite(x) && Number.isFinite(y) && graph.hasNode(id) && !S.pinned.has(id)) target.set(id, { x, y }); });
  animateTo(target, m.done ? S.layout.durationMs : Math.min(S.layout.durationMs, 180));
  setStatus('layout', m.done ? `${S.layout.kind} ${Math.round(m.ms)} ms${m.watchdog ? ' (watchdog stop)' : ''}` : `${S.layout.kind} ${Math.round(m.progress * 100)}%`);
  if (S.scale) { SC.progress('layout', m.done ? false : m.progress, `Layout (${S.layout.kind})`); if (m.done) { S.scale.lastLayout = { kind: S.layout.kind, ms: m.ms, nodes: runNodes.length }; setTimeout(() => SC.onLayoutDone(), (S.layout.animate ? S.layout.durationMs : 0) + 30); } }
  if (m.done) { S.metrics.lastLayoutMs = m.ms; S.metrics.layoutRuns++; runNodes = null; const w = layoutWaiters.splice(0); w.forEach(f => f()); }
};
function runLayout({ full = false } = {}) {
  const visible = graph.filterNodes(n => !renderer.getNodeState(n).isHidden);
  if (!visible.length) return;
  const vis = new Set(visible);
  const incremental = !full && S.layout.incremental;
  const kindNow = incremental ? 'force' : S.layout.kind;
  const needProps = S.layout.levelProperty || (S.layout.orderBy && !['type', 'insertion'].includes(S.layout.orderBy)) || (kindNow === 'community' && S.layout.groupBy && S.layout.groupBy !== 'louvain' && S.layout.groupBy !== 'encoding');
  // Phase 2 layouts (SPEC §24.4): time for timeline, lat/lon for geo, group for group-in-a-box (current categorical colour, else Louvain in the worker)
  const encGroup = kindNow === 'community' && (S.layout.groupBy === 'encoding' || !S.layout.groupBy) && S.enc?.color?.kind === 'categorical' ? S.enc.color.values : null;
  const nodes = visible.map(id => { const a = graph.getNodeAttributes(id), it = a.item, n = { id, type: a.type, ...(needProps ? { properties: it.properties } : {}) };
    if (kindNow === 'timeline') { const raw = S.layout.timeProperty ? it.properties?.[S.layout.timeProperty] : it.eventTime ?? it.properties?.date ?? it.properties?.time ?? it.updatedAt; const t = typeof raw === 'number' ? (raw < 1e11 ? raw * 1000 : raw) : Date.parse(raw); if (Number.isFinite(t)) n.time = t; }
    else if (kindNow === 'geo') { const g = geoOf(it); if (g) n.geo = { lat: g.lat, lon: g.lon }; }
    else if (encGroup) { const v = encGroup.get(id); if (v != null) n.group = v; }
    return n; });
  if (!incremental && visible.length > 5000) { const e = SC.layoutEstimate(kindNow, visible.length, 0); setStatus('layout', `${kindNow} on ${visible.length.toLocaleString()} nodes, est. ${e.estMs < 1000 ? Math.round(e.estMs) + ' ms' : (e.estMs / 1000).toFixed(1) + ' s'}`); }
  const links = []; graph.forEachEdge((e, a, s, t) => { if (vis.has(s) && vis.has(t)) links.push([s, t]); });
  const prev = {}; for (const id of visible) { const a = graph.getNodeAttributes(id); if (Number.isFinite(a.x) && a.placed !== false) prev[id] = [a.x, a.y]; }
  const kind = incremental ? 'force' : S.layout.kind; // incremental placement always uses stable local relaxation
  runNodes = visible; runId++; layoutT0 = performance.now();
  worker.postMessage({ type: 'run', runId, nodes, links, options: { ...S.layout, kind, incremental, groupBy: S.layout.groupBy === 'encoding' ? (encGroup ? null : 'louvain') : S.layout.groupBy || (encGroup ? null : 'louvain'), wrong: !!S.core?.config?.scaleUiWrong }, prev: incremental || S.pinned.size ? prev : Object.fromEntries([...S.pinned].filter(id => prev[id]).map(id => [id, prev[id]])), pinned: [...S.pinned], newIds: [...S.newNodes] });
  S.newNodes.clear();
}
let incTimer = null;
function scheduleIncremental() { if (incTimer) return; incTimer = setTimeout(() => { incTimer = null; runLayout({ full: false }); }, 120); }

// animation: blend from current to latest target (§9.5)
let anim = null;
function animateTo(target, durationMs) {
  if (!S.layout.animate || S.metrics.degraded || durationMs <= 0) { for (const [id, p] of target) if (graph.hasNode(id)) graph.mergeNodeAttributes(id, { x: p.x, y: p.y, placed: true }); return; }
  const from = new Map(); for (const id of target.keys()) { const a = graph.getNodeAttributes(id); from.set(id, { x: Number.isFinite(a.x) ? a.x : target.get(id).x, y: Number.isFinite(a.y) ? a.y : target.get(id).y }); }
  anim = { from, target, t0: performance.now(), d: durationMs };
}
function stepAnimation(now) {
  if (!anim) return;
  const k = Math.min(1, (now - anim.t0) / anim.d), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  for (const [id, p] of anim.target) { if (!graph.hasNode(id) || S.pinned.has(id)) continue; const f = anim.from.get(id); graph.mergeNodeAttributes(id, { x: f.x + (p.x - f.x) * e, y: f.y + (p.y - f.y) * e, placed: true }); }
  if (k >= 1) anim = null;
  if (S.scale?.active) S.scale.geomDirty = true; // hulls / bubbles follow the animation
}
function stopAnimation(id) { if (anim) anim.target.delete(id); }

/** Immediate placement for streamed newcomers so they appear next to their neighbours before the worker refines them (§9.3). */
function placeNewcomers(ids) {
  // extents from the 2nd-98th percentile so earlier isolated newcomers (outliers) do not push later ones ever further out
  const xs = [], ys = []; graph.forEachNode((id, a) => { if (Number.isFinite(a.x) && a.placed !== false) { xs.push(a.x); ys.push(a.y); } });
  const n = xs.length; xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
  const q = (arr, f) => arr[Math.min(arr.length - 1, Math.floor(f * arr.length))];
  const x0 = q(xs, 0.02), x1 = q(xs, 0.98), y0 = q(ys, 0.02), y1 = q(ys, 0.98);
  const cx = n ? (x0 + x1) / 2 : 0, cy = n ? (y0 + y1) / 2 : 0, R = n ? Math.hypot(x1 - x0, y1 - y0) / 2 : 50, step = n ? Math.max(1, R / Math.sqrt(n + 1)) : 10;
  for (const id of ids) {
    if (!graph.hasNode(id)) continue;
    let sx = 0, sy = 0, k = 0;
    graph.forEachNeighbor(id, (v, a) => { if (Number.isFinite(a.x) && a.placed !== false) { sx += a.x; sy += a.y; k++; } });
    const ang = Math.random() * Math.PI * 2;
    if (k) graph.mergeNodeAttributes(id, { x: sx / k + Math.cos(ang) * step, y: sy / k + Math.sin(ang) * step, placed: true });
    else graph.mergeNodeAttributes(id, { x: cx + Math.cos(ang) * (R + step * 3), y: cy + Math.sin(ang) * (R + step * 3), placed: true });
  }
}

// ---------------------------------------------------------------- pins (§9.4)
function pin(id, on) { if (on) S.pinned.add(id); else S.pinned.delete(id); restyleNode(id); localStorage.setItem('explore.pins', JSON.stringify(Object.fromEntries([...S.pinned].filter(i => graph.hasNode(i)).map(i => [i, [graph.getNodeAttribute(i, 'x'), graph.getNodeAttribute(i, 'y')]])))); }

// ---------------------------------------------------------------- session + live deltas (§7)
let es = null;
async function openSession({ focus = S.core?.scope === 'focus' } = {}) {
  // focus scope (SPEC §23.2): no full snapshot; the working set grows only by what the user expands, plus live growth
  if (S.scale) SC.progress('snapshot', null, focus ? 'Opening focus session…' : 'Loading graph snapshot…');
  const tf = performance.now(); const { sessionId, snapshot } = await api('/api/explore/session', focus ? { follow: false, grow: true } : { follow: true }).finally(() => S.scale && SC.progress('snapshot', false)); S.metrics.fetchMs = performance.now() - tf;
  S.sessionId = sessionId;
  loadSnapshot(snapshot);
  es?.close();
  es = new EventSource(`/api/explore/session/${sessionId}/events`);
  es.addEventListener('delta', ev => S.queue.push(JSON.parse(ev.data)));
  es.onopen = () => setStatus('live', 'live');
  es.onerror = () => setStatus('live', 'reconnecting…');
}
function loadSnapshot(snap) {
  const saved = JSON.parse(localStorage.getItem('explore.pins') || '{}');
  const pos = new Map(Object.entries(saved).map(([k, v]) => [k, { x: v[0], y: v[1] }]));
  // big snapshots load into a detached graph (no per-item renderer events), then one renderer is built on top
  const big = snap.items.length > 2000 && renderer;
  const ph = S.metrics.phases = { t0: performance.now() };
  if (big) { renderer.kill(); renderer = null; }
  store.loadSnapshot(snap, pos); ph.store = performance.now() - ph.t0;
  S.sizeScale = sizeScaleFor(graph.order);
  if (big) createRenderer(); ph.renderer = performance.now() - ph.t0;
  for (const id of Object.keys(saved)) if (graph.hasNode(id)) S.pinned.add(id);
  const unplaced = graph.filterNodes((n, a) => !a.placed);
  S.newNodes = new Set(unplaced);
  // provisional positions so the first frame is useful immediately, then a full layout in the worker
  const cols = Math.ceil(Math.sqrt(unplaced.length || 1)); unplaced.forEach((id, i) => graph.mergeNodeAttributes(id, { x: (i % cols) * 10, y: Math.floor(i / cols) * 10, placed: false }));
  S.dirtyStyle.clear(); restyleAll(); ph.style = performance.now() - ph.t0; applyVisibility(); ph.visibility = performance.now() - ph.t0;
  runLayout({ full: true }); ph.layoutPosted = performance.now() - ph.t0;
  updateTimeRange(); // the time slider works on snapshot data too (it used to need a first delta)
}
async function resync() { const snap = await api(`/api/explore/session/${S.sessionId}/resync`, {}); loadSnapshot(snap); toast('Resynced after a delta gap'); }

function drainDeltas() {
  if (!S.queue.length) return;
  const batch = S.queue.splice(0); // coalesce every delta that arrived this frame (§8.2.7)
  const t0 = performance.now();
  for (const d of batch) {
    const r = store.applyDelta(d);
    if (r.resync) { S.queue.length = 0; resync(); return; }
    S.lag = d.lag || S.lag;
  }
  const fresh = [...S.newNodes].filter(id => graph.hasNode(id) && !graph.getNodeAttribute(id, 'placed'));
  placeNewcomers(fresh);
  for (const id of S.dirtyStyle) { if (graph.hasNode(id)) restyleNode(id); else if (graph.hasEdge(id)) restyleEdge(id); }
  for (const id of fresh) restyleNode(id);
  S.dirtyStyle.clear();
  if (S.er.enabled) erAfterDelta(batch);
  if (fresh.length) { applyVisibility(); scheduleIncremental(); } else updateCounts();
  if (S.selected.size) applyHighlight();
  const ms = performance.now() - t0; S.metrics.deltaApplyMs.push(ms); if (S.metrics.deltaApplyMs.length > 200) S.metrics.deltaApplyMs.shift();
  updateTimeRange();
}

// ---------------------------------------------------------------- commands: search, expand, collapse, path (§11)
function searchView(text) {
  const q = text.trim().toLowerCase(); if (!q) return [];
  const hits = graph.filterNodes((n, a) => !renderer.getNodeState(n).isHidden && [n, displayLabel(a.item), ...Object.values(a.item.properties).filter(v => typeof v !== 'object').map(String)].some(s => s.toLowerCase().includes(q)));
  S.selected = new Set(hits); S.pathIds = null; applyHighlight();
  if (hits.length) focusNode(hits[0]);
  $('#search-info').textContent = hits.length ? `${hits.length} in view` : 'no match in view — try "graph"';
  return hits;
}
function focusNode(id) { const d = renderer.getNodeDisplayData(id); if (d) renderer.getCamera().animate({ x: d.x, y: d.y, ratio: Math.min(renderer.getCamera().ratio, 0.35) }, { duration: 500 }); }
async function searchGraph(text) {
  const r = await api(`/api/explore/session/${S.sessionId}/search`, { text, limit: 200 });
  addItems(r.items); $('#search-info').textContent = `${r.items.length} from graph${r.truncated ? ' (more…)' : ''}`;
  setTimeout(() => searchView(text), 50);
}
function addItems(items) { store.addItems(items); const fresh = [...S.newNodes].filter(id => graph.hasNode(id) && !graph.getNodeAttribute(id, 'placed')); placeNewcomers(fresh); fresh.forEach(restyleNode); graph.forEachEdge((e, a) => { if (a.size == null) restyleEdge(e); }); applyVisibility(); if (fresh.length) scheduleIncremental(); }
let moreCursor = null;
async function expand(ids, cursor = 0) {
  if (!cursor) return CL.expandStream(ids, { hops: 1 }); // streamed k-hop neighbourhood (SPEC §23.2)
  for (const id of ids) if (S.collapsed.has(id)) { S.collapsed.delete(id); } // restore collapsed neighbours without a snapshot
  applyVisibility();
  try {
    const r = await api(`/api/explore/session/${S.sessionId}/expand`, { ids, limit: Number($('#expand-limit').value) || 50, cursor });
    addItems(r.items);
    moreCursor = r.truncated ? { ids, cursor: r.nextCursor } : null;
    $('#more').hidden = !moreCursor;
    toast(`Expanded: ${r.items.filter(i => i.kind === 'node').length - ids.length} neighbours${r.truncated ? ' (more available)' : ''}${r.warnings?.length ? ' — ' + r.warnings.map(w => w.message).join('; ') : ''}`);
  } catch (e) { toast('Expand failed: ' + e.message); }
}
function collapse(ids) {
  S.undo.push({ kind: 'collapse', collapsed: new Map([...S.collapsed].map(([k, v]) => [k, new Set(v)])) });
  for (const id of ids) {
    const hide = new Set();
    graph.forEachNeighbor(id, m => {
      if (S.pinned.has(m) || S.selected.has(m) || ids.includes(m)) return;
      let onlyVia = true; graph.forEachNeighbor(m, v => { if (v !== id && !renderer.getNodeState(v).isHidden && !hide.has(v)) onlyVia = false; });
      if (onlyVia) hide.add(m);
    });
    S.collapsed.set(id, hide);
  }
  applyVisibility();
}
async function findPath() {
  if (S.core) return CL.findPaths(); // shortest + all simple paths panel (SPEC §23.3)
  const sel = [...S.selected]; if (sel.length !== 2) return toast('Select exactly two nodes (shift-click) for a path');
  const r = await api(`/api/explore/session/${S.sessionId}/path`, { fromId: sel[0], toId: sel[1], directed: $('#path-directed').checked });
  if (!r.found) { S.pathIds = null; toast(r.message || 'No path'); return; }
  addItems(r.items); S.pathIds = { nodeIds: r.nodeIds, linkIds: r.linkIds }; S.selected.clear(); applyHighlight();
  toast(`Path: ${r.linkIds.length} hops${r.incomplete ? ' (in-memory graph only; may be incomplete)' : ''}`);
}

// ---------------------------------------------------------------- time slider (§11.6)
let tMin = null, tMax = null;
function updateTimeRange() {
  let a = Infinity, b = -Infinity; for (const it of store.items.values()) { const t = itemTime(it); if (t != null) { if (t < a) a = t; if (t > b) b = t; } }
  if (a === Infinity) return; tMin = a; tMax = b;
  if (S.live) { $('#time').value = 1000; $('#time-label').textContent = 'live'; if (S.timeCut != null) { S.timeCut = null; applyVisibility(); } }
}
function onTime() {
  const v = Number($('#time').value); S.live = v >= 1000; $('#live').checked = S.live;
  S.timeCut = S.live || tMin == null ? null : tMin + (tMax - tMin) * (v / 1000);
  $('#time-label').textContent = S.timeCut == null ? 'live' : new Date(S.timeCut).toLocaleTimeString();
  applyVisibility();
}

// ---------------------------------------------------------------- details / status / perf
function showDetails() {
  queueMicrotask(erDetails);
  const id = [...S.selected][0];
  if (!id || !graph.hasNode(id)) { $('#details').innerHTML = '<p class="muted">Click a node to see its properties. Double-click to expand. Shift-click to multi-select.</p>'; return; }
  const it = graph.getNodeAttribute(id, 'item');
  $('#details').innerHTML = `<h3>${esc(displayLabel(it))}</h3><p class="muted">${esc(it.type)} · v${it.version}${S.pinned.has(id) ? ' · pinned' : ''}</p>
    <table>${Object.entries(it.properties).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</td></tr>`).join('')}</table>
    <p class="muted small">id ${esc(id)}<br>sources: ${it.sources.map(s => esc(s.sourceId)).join(', ')}<br>degree ${graph.degree(id)}</p>${S.core ? CL.detailsExtra(id) : ''}`;
}
const status = {};
function setStatus(k, v) { status[k] = v; $('#status').textContent = Object.entries(status).map(([a, b]) => `${a}: ${b}`).join('  ·  '); }
function updateCounts() {
  const vis = graph.filterNodes(n => !renderer.getNodeState(n).isHidden).length;
  $('#counts').textContent = `${vis.toLocaleString()} / ${graph.order.toLocaleString()} nodes · ${graph.size.toLocaleString()} links`;
  const over = vis > (S.style?.settings.autoClusterAbove || 15000);
  $('#banner').hidden = !over; if (over) $('#banner').textContent = `${vis.toLocaleString()} visible nodes is over the ${S.style.settings.autoClusterAbove.toLocaleString()} budget: zoom out for the cluster overview (Scale → Clusters) or filter types in the legend to stay interactive.`;
  // NOTE: sigma 4.0.6's hideEdgesOnMove never re-shows edges while our rAF loop runs (verified headless), so it stays off.
}
let toastTimer; function toast(msg) { const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 3500); }

let lastFrame = performance.now(), fpsAcc = 0, fpsN = 0, fpsT = performance.now(), slowUntil = 0;
function frame(now) {
  const dt = now - lastFrame; lastFrame = now;
  S.metrics.frameMs.push(dt); if (S.metrics.frameMs.length > 600) S.metrics.frameMs.shift();
  if (dt > 200) { S.metrics.degraded = true; slowUntil = now + 2000; } else if (now > slowUntil) S.metrics.degraded = false; // §8.4 watchdog
  fpsAcc += dt; fpsN++;
  if (now - fpsT > 500) { S.metrics.fps = Math.round(1000 / (fpsAcc / fpsN)); fpsAcc = 0; fpsN = 0; fpsT = now; const lagTxt = Object.entries(S.lag).map(([k, v]) => `${k} ${v.status}${v.lagMs > 1500 ? ` ${Math.round(v.lagMs / 1000)}s` : ''}`).join(', ');
    updateRendererStatus();
    $('#perf').textContent = `${S.metrics.fps} fps${S.metrics.degraded ? ' (degraded)' : ''} · delta ${(S.metrics.deltaApplyMs.at(-1) ?? 0).toFixed(1)} ms${lagTxt ? ' · ' + lagTxt : ''}`; }
  drainDeltas(); stepAnimation(now);
  if (S.map.view && S.map.mode !== 'graph') { if (S.map.dirty) mapSync(); else if (S.map.hlDirty) mapHighlight(); }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- wiring
function setTheme(t) { if (S.map.view) { S.map.view.colors = MAP_COLORS[t] || MAP_COLORS.dark; if (S.map.view.basemap === 'offline') S.map.view.setBasemap('offline').then(() => { S.map.dirty = true; lastMapSync = 0; }); else S.map.view.recomputeGrid(); }
  S.theme = t; localStorage.setItem('explore.theme', t); applyStyleConfig(S.styleConfig, false); $('#theme').textContent = t === 'dark' ? '☀ Light' : '☾ Dark'; }
function bind() {
  $('#layout-kind').innerHTML = LAYOUT_KINDS.map(k => `<option ${k === S.layout.kind ? 'selected' : ''}>${k}</option>`).join('');
  $('#layout-kind').onchange = e => { S.undo.push({ kind: 'layout', layout: { ...S.layout } }); S.layout.kind = e.target.value; saveLayout(); runLayout({ full: true }); };
  $('#relayout').onclick = () => runLayout({ full: true });
  for (const k of ['incremental', 'animate']) { $('#' + k).checked = !!S.layout[k]; $('#' + k).onchange = e => { S.layout[k] = e.target.checked; saveLayout(); }; }
  $('#layout-seed').value = S.layout.seed ?? 1234; $('#layout-seed').onchange = e => { S.layout.seed = Number(e.target.value) || 1; saveLayout(); runLayout({ full: true }); };
  $('#layout-time').value = S.layout.timeProperty || ''; $('#layout-time').onchange = e => { S.layout.timeProperty = e.target.value.trim() || null; saveLayout(); if (S.layout.kind === 'timeline') runLayout({ full: true }); };
  $('#layout-group').value = S.layout.groupBy || ''; $('#layout-group').onchange = e => { S.layout.groupBy = e.target.value.trim() || null; saveLayout(); if (S.layout.kind === 'community') runLayout({ full: true }); };
  $('#spacing').value = S.layout.spacing; $('#spacing').oninput = e => { S.layout.spacing = Number(e.target.value); saveLayout(); };
  $('#orientation').value = S.layout.orientation; $('#orientation').onchange = e => { S.layout.orientation = e.target.value; saveLayout(); if (S.layout.kind === 'hierarchy') runLayout({ full: true }); };
  $('#roots-from-selection').onclick = () => { S.layout.roots = [...S.selected]; saveLayout(); toast(`Roots: ${S.layout.roots.length ? S.layout.roots.join(', ') : 'auto'}`); if (['hierarchy', 'radial'].includes(S.layout.kind)) runLayout({ full: true }); };
  $('#theme').onclick = () => setTheme(S.theme === 'dark' ? 'light' : 'dark');
  $('#search').onkeydown = e => { if (e.key === 'Enter') (e.shiftKey ? searchGraph : searchView)(e.target.value); if (e.key === 'Escape') { e.target.value = ''; clearSelection(); } };
  $('#search-graph').onclick = () => searchGraph($('#search').value);
  $('#pin').onclick = () => { for (const id of S.selected) pin(id, true); toast(`Pinned ${S.selected.size}`); };
  $('#unpin').onclick = () => { for (const id of S.selected) pin(id, false); };
  $('#expand').onclick = () => S.selected.size && expand([...S.selected]);
  $('#more').onclick = () => moreCursor && expand(moreCursor.ids, moreCursor.cursor);
  $('#collapse').onclick = () => S.selected.size && collapse([...S.selected]);
  $('#path').onclick = findPath;
  $('#undo').onclick = undo;
  $('#legend').onclick = e => { const el = e.target.closest('.legend-item'); if (el) { e.preventDefault(); toggleType(el.dataset.type); } };
  $('#time').oninput = onTime; $('#live').onchange = e => { S.live = e.target.checked; if (S.live) { $('#time').value = 1000; onTime(); } };
  $('#style-edit').onclick = () => { $('#style-dialog').showModal(); $('#style-json').value = JSON.stringify(S.styleConfig, null, 2); };
  $('#style-apply').onclick = e => { e.preventDefault(); let cfg; try { cfg = JSON.parse($('#style-json').value); } catch (err) { $('#style-warnings').textContent = 'Not valid JSON: ' + err.message; return; } applyStyleConfig(cfg); };
  $('#style-reset').onclick = async e => { e.preventDefault(); localStorage.removeItem('explore.style'); await loadStyle(); $('#style-json').value = JSON.stringify(S.styleConfig, null, 2); };
  $('#style-download').onclick = e => { e.preventDefault(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S.styleConfig, null, 2)], { type: 'application/json' })); a.download = `style-config.v${S.styleConfig.version}.json`; a.click(); };
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'Escape') clearSelection();
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); selectAllVisible(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
  });
}
function saveLayout() { localStorage.setItem('explore.layout', JSON.stringify(S.layout)); }
function undo() {
  const u = S.undo.pop(); if (!u) return toast('Nothing to undo');
  if (u.kind === 'layout') { S.layout = u.layout; $('#layout-kind').value = S.layout.kind; saveLayout(); runLayout({ full: true }); }
  if (u.kind === 'filter') { S.hiddenTypes = u.hiddenTypes; applyVisibility(); }
  if (u.kind === 'collapse') { S.collapsed = u.collapsed; applyVisibility(); }
  if (u.kind === 'hidden') { S.manualHidden = u.hidden; applyVisibility(); }
  if (u.kind === 'neighborhood') { S.neighborhood = u.neighborhood; applyVisibility(); }
}

// ---------------------------------------------------------------- saved views + presenter mode (SPEC §19)
function captureState({ positions = false } = {}) {
  const cam = renderer.getCamera().getState();
  const st = {
    version: 1, layout: { ...S.layout },
    positions: positions ? Object.fromEntries(graph.filterNodes((n, a) => Number.isFinite(a.x)).map(n => [n, [+graph.getNodeAttribute(n, 'x').toFixed(3), +graph.getNodeAttribute(n, 'y').toFixed(3)]])) : null,
    filters: { hiddenTypes: [...S.hiddenTypes], hiddenLinkTypes: [...S.hiddenEdgeTypes], where: S.where, neighborhood: S.neighborhood, hideIsolated: S.hideIsolated, hiddenIds: [...(S.manualHidden || [])] },
    analysis: S.enc ? Object.fromEntries(Object.entries(S.enc).filter(([, e]) => e).map(([ch, e]) => [ch, { algo: e.request.algo, params: e.request.params, scope: e.request.scopeKind }])) : null,
    style: S.styleUrl ? { url: S.styleUrl } : { inline: S.styleConfig }, theme: S.theme,
    camera: { x: cam.x, y: cam.y, ratio: cam.ratio, angle: cam.angle || 0 },
    selection: [...S.selected], pinned: [...S.pinned],
    time: { live: S.live, cut: S.live ? null : Number($('#time').value) },
    processor: { size: S.pm.size, alerts: S.pm.alerts },
    map: { mode: S.map.mode, camera: S.map.view ? S.map.view.getCamera() : S.map.camera || null, grid: { ...S.map.grid }, heat: S.map.heat, links: S.map.links, points: S.map.points, cluster: !!S.map.cluster, basemap: S.map.view ? $('#map-basemap').value : S.map.basemap || null },
  };
  if (S.currentView?.state?.presenter) st.presenter = S.currentView.state.presenter;
  return st;
}
function waitLayout(ms = 15000) { return new Promise(r => { const t = setTimeout(r, ms); layoutWaiters.push(() => { clearTimeout(t); r(); }); }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** camera frame for a set of nodes (camera coordinates are sigma's normalised framed graph space) */
function fitCamera(ids, animate = true) {
  renderer.refresh();
  const pts = ids.map(id => renderer.getNodeDisplayData(id)).filter(d => d && Number.isFinite(d.x));
  if (!pts.length) return (animate ? renderer.getCamera().reset({ duration: 400 }) : renderer.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 }));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const d of pts) { x0 = Math.min(x0, d.x); x1 = Math.max(x1, d.x); y0 = Math.min(y0, d.y); y1 = Math.max(y1, d.y); }
  const st = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, ratio: Math.max(0.08, Math.min(1.2, Math.max(x1 - x0, y1 - y0) * 1.25)), angle: 0 };
  return animate ? renderer.getCamera().animate(st, { duration: 450 }) : renderer.getCamera().setState(st);
}
async function applyViewState(st, { animate = true } = {}) {
  st = st || {};
  const themeChanged = st.theme && st.theme !== S.theme; if (themeChanged) { S.theme = st.theme; $('#theme').textContent = S.theme === 'dark' ? '☀ Light' : '☾ Dark'; }
  if (st.style?.url) { const cfg = await api(st.style.url); applyStyleConfig(cfg, false); S.styleUrl = st.style.url; }
  else if (st.style?.inline) { applyStyleConfig(st.style.inline, false); S.styleUrl = null; }
  else if (themeChanged) applyStyleConfig(S.styleConfig, false);
  const f = st.filters || {};
  S.hiddenTypes = new Set(f.hiddenTypes || []); S.hiddenEdgeTypes = new Set(f.hiddenLinkTypes || []);
  S.where = f.where || []; S.neighborhood = f.neighborhood || null; S.hideIsolated = !!f.hideIsolated;
  S.collapsed.clear(); S.pathIds = null;
  if (S.manualHidden) S.manualHidden = new Set(f.hiddenIds || []);
  if (S.core) { S.core.isolate = null; S.core.isolateLinks = null; }
  if (st.processor) { S.pm.size = st.processor.size !== false; S.pm.alerts = st.processor.alerts !== false; $('#pm-size').checked = S.pm.size; $('#pm-alerts').checked = S.pm.alerts; if (S.pm.enabled) graph.forEachNode(restyleNode); }
  for (const id of [...S.pinned]) if (graph.hasNode(id)) { S.pinned.delete(id); restyleNode(id); }
  for (const id of st.pinned || []) if (graph.hasNode(id)) { S.pinned.add(id); restyleNode(id); }
  if (st.time) { $('#time').value = st.time.live !== false || st.time.cut == null ? 1000 : Math.min(999, st.time.cut); onTime(); }
  if (st.layout) { S.layout = { ...DEFAULT_LAYOUT, ...st.layout }; syncLayoutControls(); }
  S.selected = new Set((st.selection || []).filter(id => graph.hasNode(id)));
  applyVisibility(); applyHighlight();
  await applyMapState(st.map, { animate });
  const pos = st.positions && Object.keys(st.positions).length ? st.positions : null;
  if (pos) { for (const [id, p] of Object.entries(pos)) if (graph.hasNode(id)) graph.mergeNodeAttributes(id, { x: p[0], y: p[1], placed: true }); anim = null; }
  else { const w = waitLayout(); runLayout({ full: true }); await w; if (S.layout.animate) await sleep((S.layout.durationMs || 400) + 60); }
  renderer.refresh();
  if (st.camera) { if (animate) await renderer.getCamera().animate(st.camera, { duration: 450 }); else renderer.getCamera().setState(st.camera); }
  else await fitCamera(st.fit === 'selection' && S.selected.size ? [...S.selected] : graph.filterNodes(n => !renderer.getNodeState(n).isHidden), animate);
  restyleAll(); updateLegend(); updateCounts();
  if (S.core) await applyAnalysis(st.analysis);
}
/** re-run the analysis encodings a saved view carries (SPEC §23.5.4) */
async function applyAnalysis(a) {
  const had = S.enc.size || S.enc.color || S.enc.edge; S.enc = { size: null, color: null, edge: null };
  const groups = new Map(); for (const [ch, x] of Object.entries(a || {})) { if (!x?.algo) continue; const k = JSON.stringify([x.algo, x.params || {}, x.scope || 'all']); if (!groups.has(k)) groups.set(k, { x, chs: [] }); groups.get(k).chs.push(ch); }
  for (const { x, chs } of groups.values()) await CL.runAlgo(x.algo, { params: x.params || {}, scopeKind: x.scope || 'all', channels: chs });
  if (had && !groups.size) { restyleAll(); CL.renderEncLegend(); }
}
function syncLayoutControls() {
  $('#layout-kind').value = S.layout.kind; $('#spacing').value = S.layout.spacing; $('#orientation').value = S.layout.orientation;
  $('#incremental').checked = !!S.layout.incremental; $('#animate').checked = !!S.layout.animate;
  $('#layout-seed').value = S.layout.seed ?? 1234; $('#layout-time').value = S.layout.timeProperty || ''; $('#layout-group').value = S.layout.groupBy || '';
}
const views = { list: [], presentations: [] };
async function refreshViews() {
  const r = await api('/api/explore/views'); views.list = r.views; views.presentations = r.presentations;
  const sel = $('#view-list'), cur = S.currentView?.id;
  sel.innerHTML = r.views.map(v => `<option value="${esc(v.id)}" ${v.id === cur ? 'selected' : ''} title="${esc(v.description || '')}">${esc(v.name)}</option>`).join('');
  $('#views-empty').hidden = r.views.length > 0;
  return r;
}
async function loadView(id, { animate = true, updateUrl = true } = {}) {
  const v = await api(`/api/explore/views/${encodeURIComponent(id)}`);
  await applyViewState(v.state, { animate });
  S.currentView = v; // only once the view is applied, so readers of currentView never see the previous view's filters
  if (updateUrl && !S.presenting) { const u = new URL(location.href); u.searchParams.set('view', v.id); history.replaceState(null, '', u); }
  $('#view-list').value = v.id; $('#view-current').textContent = v.name;
  document.body.dataset.view = v.id;
  return v;
}
async function saveView(name, { description = '', positions = $('#view-positions').checked, id } = {}) {
  const r = await api('/api/explore/views', { id, name, description, state: captureState({ positions }) });
  S.currentView = r.view; await refreshViews(); $('#view-current').textContent = r.view.name; toast(`Saved view "${r.view.name}"`);
  return r.view;
}
async function updateView(id = S.currentView?.id) {
  if (!id) return toast('Load or save a view first');
  const r = await req('PUT', `/api/explore/views/${encodeURIComponent(id)}`, { state: captureState({ positions: $('#view-positions').checked }) });
  S.currentView = r.view; toast(`Updated "${r.view.name}"`); return r.view;
}
async function renameView(id, name) { const r = await req('PUT', `/api/explore/views/${encodeURIComponent(id)}`, { name }); await refreshViews(); if (S.currentView?.id === id) { S.currentView = r.view; $('#view-current').textContent = name; } return r.view; }
async function deleteView(id) { await req('DELETE', `/api/explore/views/${encodeURIComponent(id)}`); if (S.currentView?.id === id) { S.currentView = null; $('#view-current').textContent = ''; } await refreshViews(); }
const viewUrl = id => `${location.origin}/explore?view=${encodeURIComponent(id)}`;
async function req(method, path, body) { const r = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.statusText); return j; }
function bindViews() {
  const pick = () => $('#view-list').value || null;
  $('#view-list').ondblclick = () => pick() && loadView(pick()).catch(e => toast(e.message));
  $('#view-load').onclick = () => pick() ? loadView(pick()).catch(e => toast(e.message)) : toast('Pick a view');
  $('#view-save').onclick = async () => { const name = prompt('Name for this view', S.currentView ? `${S.currentView.name} (copy)` : ''); if (name) await saveView(name).catch(e => toast(e.message)); };
  $('#view-update').onclick = () => updateView().catch(e => toast(e.message));
  $('#view-rename').onclick = async () => { const id = pick(); if (!id) return; const name = prompt('New name', views.list.find(v => v.id === id)?.name || ''); if (name) await renameView(id, name).catch(e => toast(e.message)); };
  $('#view-delete').onclick = async () => { const id = pick(); if (id && confirm(`Delete view "${views.list.find(v => v.id === id)?.name}"?`)) await deleteView(id).catch(e => toast(e.message)); };
  $('#view-link').onclick = async () => { const id = pick() || S.currentView?.id; if (!id) return toast('Pick a view'); const u = viewUrl(id); try { await navigator.clipboard.writeText(u); toast('Link copied: ' + u); } catch { prompt('Link to this view', u); } };
  $('#view-export').onclick = async () => { const b = await api('/api/explore/views-export'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' })); a.download = 'explore-views.json'; a.click(); };
  $('#view-import').onclick = () => $('#view-import-file').click();
  $('#view-import-file').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const r = await api('/api/explore/views-import', { bundle: JSON.parse(await f.text()), mode: 'merge' }); await refreshViews(); toast(`Imported ${r.added.length} new, ${r.updated.length} updated`); } catch (err) { toast('Import failed: ' + err.message); } e.target.value = ''; };
  $('#present').onclick = () => (S.presenting ? exitPresenter() : enterPresenter());
  // presenter keys run first (capture) so Esc leaves presenter mode instead of clearing the selection
  document.addEventListener('keydown', e => {
    if (!S.presenting || e.target.matches('input, textarea, select')) return;
    const k = e.key; let handled = true;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') stepSlide(1); else if (k === 'ArrowLeft' || k === 'PageUp') stepSlide(-1);
    else if (k === 'Home') goSlide(0); else if (k === 'End') goSlide((S.present?.viewIds.length || 1) - 1); else if (k === 'Escape') exitPresenter(); else handled = false;
    if (handled) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
}
async function enterPresenter(deckId = params.get('deck')) {
  const r = await refreshViews();
  const deck = (deckId && r.presentations.find(p => p.id === deckId)) || r.presentations[0] || { id: 'all', name: 'All views', viewIds: r.views.map(v => v.id) };
  S.presenting = true; document.body.classList.add('presenting'); $('#present').textContent = 'Exit presenter';
  S.present = { deck, viewIds: deck.viewIds, i: -1 };
  renderer.setSetting?.('labelDensity', 0.35);
  renderer.resize?.(); renderer.refresh();
  const cur = S.currentView ? deck.viewIds.indexOf(S.currentView.id) : -1;
  if (deck.viewIds.length) await goSlide(cur >= 0 ? cur : 0); else renderPresenterOverlay();
  document.body.dataset.presenting = '1';
}
function exitPresenter() {
  S.presenting = false; document.body.classList.remove('presenting'); delete document.body.dataset.presenting; $('#present').textContent = 'Present';
  S.present = null; renderer.setSetting?.('labelDensity', 0.7); renderer.resize?.(); renderer.refresh();
  if (S.currentView) { const u = new URL(location.href); u.searchParams.delete('present'); u.searchParams.set('view', S.currentView.id); history.replaceState(null, '', u); }
}
let slideBusy = Promise.resolve();
function stepSlide(d) { if (!S.present) return; const n = S.present.viewIds.length; return goSlide(Math.max(0, Math.min(n - 1, S.present.i + d))); }
function goSlide(i) {
  return (slideBusy = slideBusy.then(async () => {
    if (!S.present || i === S.present.i || !S.present.viewIds[i]) return;
    S.present.i = i; await loadView(S.present.viewIds[i], { updateUrl: false }).catch(e => toast(e.message)); renderPresenterOverlay();
    document.body.dataset.slide = String(i);
  }));
}
/** presenter overlay: title, caption, slide counter and a clean legend (node types + link colours + symbol modifiers) */
function renderPresenterOverlay() {
  const v = S.currentView, pr = v?.state?.presenter || {};
  $('#present-title').textContent = pr.title || v?.name || S.styleConfig?.legend?.title || 'Explore';
  $('#present-caption').textContent = pr.caption || v?.description || '';
  $('#present-count').textContent = S.present ? `${S.present.i + 1} / ${S.present.viewIds.length}  ·  ← → to step · Esc to exit` : '';
  $('#present-legend').innerHTML = presenterLegendHtml();
}
function presenterLegendHtml() {
  const counts = new Map(); graph.forEachNode((n, a) => { if (!renderer.getNodeState(n).isHidden) counts.set(a.type, (counts.get(a.type) || 0) + 1); });
  const nodes = S.style.legend(counts);
  const sym = S.symbols?.legend?.(counts) || null;
  const nodeHtml = (sym?.types || nodes).map(e => `<div class="pl-item">${e.img ? `<img class="pl-sym" src="${e.img}" alt="">` : `<span class="glyph ${e.shape}" style="--c:${e.color}"></span>`}<span>${esc(e.type)}</span><span class="pl-c">${counts.get(e.type) ?? ''}</span></div>`).join('');
  const linkCounts = new Map(); graph.forEachEdge((e, a) => { if (!renderer.getEdgeState(e).isHidden) linkCounts.set(a.item.type, (linkCounts.get(a.item.type) || 0) + 1); });
  const links = linkLegend().filter(l => linkCounts.has(l.type));
  const linkHtml = links.map(l => `<div class="pl-item"><span class="pl-line${l.dash ? ' dashed' : ''}" style="--c:${l.color}"></span><span>${esc(l.label)}</span><span class="pl-c">${linkCounts.get(l.type).toLocaleString()}</span></div>`).join('');
  const modHtml = (sym?.modifiers || []).map(m => `<div class="pl-item"><img class="pl-sym" src="${m.img}" alt=""><span>${esc(m.label)}</span></div>`).join('');
  const credits = S.symbols?.credits?.() || '';
  return `${nodeHtml ? `<h3>${esc(S.styleConfig?.legend?.title || 'Types')}</h3>${nodeHtml}` : ''}${linkHtml ? `<h3>${esc(S.styleConfig?.legend?.linksTitle || 'Links')}</h3>${linkHtml}` : ''}${modHtml ? `<h3>Modifiers</h3>${modHtml}` : ''}${credits ? `<p class="pl-credit">${esc(credits)}</p>` : ''}`;
}
/** link legend: style config legend.links if given, else every link rule keyed by a single type with a colour */
function linkLegend() {
  const cfg = S.styleConfig || {}, labels = cfg.legend?.linkLabels || {};
  if (Array.isArray(cfg.legend?.links)) return cfg.legend.links.map(l => ({ type: l.type, label: l.label || l.type, color: S.style.linkStyle({ kind: 'link', type: l.type, properties: {} }).color, dash: false }));
  const out = [], seen = new Set();
  for (const r of cfg.rules || []) { const t = r.when?.type; if (r.when?.kind !== 'link' || typeof t !== 'string' || seen.has(t) || !r.apply?.color) continue; seen.add(t); const st = S.style.linkStyle({ kind: 'link', type: t, properties: {} }); out.push({ type: t, label: labels[t] || t, color: st.color, dash: st.dash !== 'solid' }); }
  return out;
}
// symbol legend + icon credits for presenter mode and the side legend (SPEC §20.6)
S.symbols = {
  img: desc => atlas.get(desc)?.dataUrl || null,
  legend(counts) {
    const sym = S.style.symbols; if (!sym) return null;
    const types = S.style.legend(counts).map(e => ({ ...e, img: e.symbol ? S.symbols.img(e.symbol) : null }));
    const modifiers = (S.styleConfig.symbols?.legend?.modifiers || []).map(m => ({ label: m.label, img: S.symbols.img(resolveSymbol({ id: '', properties: {} }, m.apply || {}, sym, m.fill || '#7A8599')) })).filter(m => m.label);
    return { types, modifiers };
  },
  credits() {
    const sym = S.style.symbols; if (!sym) return '';
    const used = new Set([sym.defaultSet]); for (const r of S.styleConfig.rules || []) { const g = r.apply?.glyph; if (typeof g === 'string' && g.includes('/')) used.add(g.slice(0, g.lastIndexOf('/'))); }
    return 'Icons: ' + [...used].filter(k => sym.sets[k]).map(k => `${sym.sets[k].name} (${sym.sets[k].license})${sym.sets[k].attribution ? ' — ' + sym.sets[k].attribution : ''}`).join(', ');
  },
};
async function initViews() {
  bindViews();
  await refreshViews().catch(e => console.warn('views', e));
  const id = params.get('view');
  if (id) await loadView(id, { animate: false }).catch(e => toast(`View "${id}": ${e.message}`));
  if (params.get('present') === '1') await enterPresenter();
}

// expose for automated checks (tests / screenshots / benchmarks)
window.__explore = { graph, store, S, get renderer() { return renderer; }, core: CL, applyVisibility, applyHighlight, searchView, searchGraph, expand, collapse, toggleType, setTheme, runLayout, applyStyleConfig, select, clearSelection, addItems, toast, neighborhood, findPath, pin,
  switchRenderer, get rendererInfo() { return { pref: S.rnd.pref, active: S.rnd.active, note: S.rnd.note, adapter: renderer?.info || null }; }, captureState, applyViewState, loadView, saveView, updateView, renameView, deleteView, refreshViews, enterPresenter, exitPresenter, stepSlide, goSlide, viewUrl, views, fitCamera, get atlas() { return atlas; } };

async function pollProcessor() {
  try {
    const ids = []; graph.forEachNode(id => { if (ids.length < 20000) ids.push(id); });
    const r = await api('/api/explore/processor/metrics', { ids });
    const before = S.pm.metrics; S.pm.metrics = r.metrics; S.pm.polls++;
    const changed = new Set([...Object.keys(before), ...Object.keys(r.metrics)].filter(id => JSON.stringify(before[id]) !== JSON.stringify(r.metrics[id])));
    changed.forEach(restyleNode); if (changed.size) renderer?.refresh();
    const st = r.stats?.job || {};
    $('#pm-status').textContent = `Flink ${st.flinkVersion || ''} · ${st.status || '?'} · ${st.delivery || ''} · ${Object.keys(r.metrics).length} nodes · ${r.alerts.length} alerts`;
  } catch (e) { $('#pm-status').textContent = 'processor: ' + e.message; }
}
async function initProcessor() {
  const st = await api('/api/explore/processor').catch(() => ({ enabled: false }));
  if (!st.enabled) return;
  S.pm.enabled = true; $('#stream-metrics').hidden = false;
  for (const k of ['size', 'alerts']) $('#pm-' + k).onchange = e => { S.pm[k] = e.target.checked; graph.forEachNode(restyleNode); renderer?.refresh(); };
  await pollProcessor(); setInterval(pollProcessor, Number(params.get('pmEvery')) || 2000);
}
window.__explore.pm = S.pm;


// ---------------------------------------------------------------- entity resolution (SPEC §21)
// Toggle records / resolved entities, record-count badges, projected links in the entity view and a why-panel.
const ER_LINKS = new Set(['RESOLVES_TO', 'POSSIBLY_SAME']);
function erIndex() {
  const m = new Map();
  graph.forEachEdge((e, a, src, tgt) => { if (a.item?.type === 'RESOLVES_TO') m.set(src, tgt); });
  S.er.recEntity = m; S.er.dirty = false;
}
/** entity view: links between records are drawn between their entities (client-only, one per type + entity pair) */
function erProject() {
  for (const k of S.er.proj) if (graph.hasEdge(k)) graph.dropEdge(k);
  S.er.proj.clear();
  if (S.er.view !== 'entities') return;
  const agg = new Map();
  graph.forEachEdge((e, a, src, tgt) => {
    const it = a.item; if (!it || ER_LINKS.has(it.type) || a.projected) return;
    const ea = S.er.recEntity.get(src) || (graph.getNodeAttribute(src, 'item')?.type === 'Entity' ? src : null), eb = S.er.recEntity.get(tgt) || (graph.getNodeAttribute(tgt, 'item')?.type === 'Entity' ? tgt : null);
    if (!ea || !eb || ea === eb || (ea === src && eb === tgt)) return;
    const k = `proj:${it.type}:${ea}>${eb}`; const x = agg.get(k); if (x) x.n++; else agg.set(k, { ea, eb, type: it.type, n: 1 });
  });
  for (const [k, x] of agg) {
    if (!graph.hasNode(x.ea) || !graph.hasNode(x.eb)) continue;
    const item = { id: k, kind: 'link', type: x.type, fromId: x.ea, toId: x.eb, label: x.n > 1 ? `${x.type} ×${x.n}` : x.type, properties: { projected: true, records: x.n }, sources: [], version: 1 };
    graph.addEdgeWithKey(k, x.ea, x.eb, { item, projected: true }); S.er.proj.add(k); restyleEdge(k);
  }
}
function setErView(v) {
  S.er.view = v; if (S.er.dirty) erIndex();
  erProject(); applyVisibility(); renderer?.refresh();
  const u = new URL(location.href); if (v === 'all') u.searchParams.delete('er'); else u.searchParams.set('er', v); history.replaceState(null, '', u);
  for (const b of document.querySelectorAll('#er-view button')) b.classList.toggle('active', b.dataset.v === v);
  erStatus();
}
let erTimer = null;
function erAfterDelta(batch) {
  if (!batch.some(d => d.upserts?.some(u => ER_LINKS.has(u.type) || u.type === 'Entity') || d.removes?.length)) return;
  S.er.dirty = true;
  if (erTimer) return;
  erTimer = setTimeout(() => { erTimer = null; erIndex(); if (S.er.view === 'entities') erProject(); if (S.er.view !== 'all') applyVisibility(); erStatus(); }, 300);
}
function erStatus() {
  let ents = 0, multi = 0, ps = 0; graph.forEachNode((id, a) => { if (a.item?.type === 'Entity') { ents++; if (a.item.properties?.recordCount > 1) multi++; } });
  graph.forEachEdge((e, a) => { if (a.item?.type === 'POSSIBLY_SAME') ps++; });
  $('#er-status').textContent = `${S.er.recEntity.size} records → ${ents} entities (${multi} with 2+ records) · ${ps} possible matches${S.er.engine ? ' · ' + S.er.engine : ''}`;
}
const pct = x => (x == null ? '–' : `${(x * 100).toFixed(x >= 0.9995 ? 0 : 1)}%`);
function whyBars(features, { values = true } = {}) {
  if (!features?.length) return '<p class="muted small">No comparable features.</p>';
  const max = Math.max(1, ...features.map(f => Math.abs(f.weight)));
  return `<table class="er-why">${features.map(f => `<tr title="${esc(f.level || '')}"><th>${esc(f.property)}</th><td class="er-bar"><span class="${f.weight >= 0 ? 'pos' : 'neg'}" style="width:${Math.round(Math.abs(f.weight) / max * 100)}%"></span></td><td class="num">${f.weight >= 0 ? '+' : ''}${Number(f.weight).toFixed(1)}</td></tr>
    ${values && (f.a != null || f.b != null) ? `<tr class="er-vals"><td></td><td colspan="2">${esc(f.a ?? '∅')} <span class="muted">vs</span> ${esc(f.b ?? '∅')}<br><span class="muted">${esc(f.level || '')}</span></td></tr>` : ''}`).join('')}</table>`;
}
async function erDetails() {
  if (!S.er.enabled) return;
  const tok = ++S.er.token, ids = [...S.selected].filter(id => graph.hasNode(id));
  const box = document.createElement('div'); box.id = 'er-panel'; box.className = 'er-panel';
  const put = html => { if (tok !== S.er.token) return; document.querySelector('#er-panel')?.remove(); box.innerHTML = html; $('#details').append(box); };
  try {
    if (ids.length === 2) {
      const w = await api(`/api/explore/er/why?a=${encodeURIComponent(ids[0])}&b=${encodeURIComponent(ids[1])}`);
      return put(`<h3>Why: ${esc(w.decision)}</h3><p class="small">score <b>${pct(w.score)}</b> · match ≥ ${w.threshold} · possible ≥ ${w.maybeThreshold}<br>${esc(w.matchKey || '')} · ${w.sameEntity ? 'same entity' + (w.viaChain ? ' (through other records)' : '') : 'different entities'} · ${esc(w.engine || '')}</p>
        ${whyBars(w.features)}<p class="muted small">Weights are log2 Bayes factors: prior ${Number(w.prior || 0).toFixed(1)} + Σ weights = ${Number(w.matchWeight).toFixed(1)}.</p>`);
    }
    if (ids.length !== 1) return;
    const it = graph.getNodeAttribute(ids[0], 'item');
    if (it.type !== 'Entity' && !S.er.recEntity.has(ids[0])) return;
    const r = await api(`/api/explore/er/entity?id=${encodeURIComponent(ids[0])}`);
    const recs = r.records.map(x => `<tr class="er-rec" data-id="${esc(x.id)}"><td>${esc(x.dataSource)}</td><td>${esc(x.recordId)}</td><td>${esc(x.label)}</td><td class="num">${x.matchedWith ? pct(x.score) : '–'}</td><td class="small">${esc(x.matchKey || '')}</td></tr>`).join('');
    const ps = r.possible.map(p => `<li><a href="#" data-goto="${esc(p.entityId)}">${esc(p.label || p.entityId)}</a> ${pct(p.score)} <span class="muted small">${esc(p.matchKey || '')}</span></li>`).join('');
    let mine = '';
    if (it.type !== 'Entity') { const w = await api(`/api/explore/er/why?a=${encodeURIComponent(ids[0])}`).catch(() => null); if (w && w.features) mine = `<h4>Why this record is in the entity</h4><p class="small">matched with ${esc(w.b || '–')} at <b>${pct(w.score)}</b> ${esc(w.matchKey || '')}</p>${whyBars(w.features)}`; }
    put(`<h3>Resolved entity</h3><p class="small"><a href="#" data-goto="${esc(r.entity.id)}">${esc(r.entity.label)}</a> · ${esc(r.entity.entityType)} · <b>${r.entity.recordCount}</b> record${r.entity.recordCount === 1 ? '' : 's'} from ${r.entity.dataSources.map(esc).join(', ')}</p>
      ${mine}<h4>Records</h4><table class="er-recs"><tr><th>source</th><th>record</th><th>name</th><th>score</th><th>key</th></tr>${recs}</table>
      ${ps ? `<h4>Possible matches</h4><ul class="er-ps">${ps}</ul>` : ''}
      ${r.history?.length ? `<h4>History</h4><ul class="small">${r.history.map(h => `<li>${esc(h.at.slice(11, 19))} ${esc(h.kind)}${h.absorbed ? ' ← ' + h.absorbed.length : ''}${h.splitOff ? ' → ' + h.splitOff.length + ' split off' : ''}</li>`).join('')}</ul>` : ''}
      <p class="muted small">Shift-click two records, then see why they match.</p>`);
    for (const a of box.querySelectorAll('[data-goto]')) a.onclick = ev => { ev.preventDefault(); const id = a.dataset.goto; if (graph.hasNode(id)) { select(id); focusNode(id); } };
    for (const tr of box.querySelectorAll('.er-rec')) tr.onclick = () => { const id = tr.dataset.id; if (graph.hasNode(id)) { if (S.er.view === 'entities') setErView('all'); select(id); focusNode(id); } };
  } catch (e) { put(`<p class="muted small">entity resolution: ${esc(e.message)}</p>`); }
}
async function initEr() {
  const st = await api('/api/explore/er/stats').catch(() => null);
  if (!st?.enabled) return;
  S.er.enabled = true; S.er.engine = st.engine; $('#er-section').hidden = false;
  for (const b of document.querySelectorAll('#er-view button')) b.onclick = () => setErView(b.dataset.v);
  $('#er-possible').onchange = e => { S.er.possible = e.target.checked; applyVisibility(); renderer?.refresh(); };
  erIndex(); setErView(S.er.view);
}
window.__explore.setErView = setErView; window.__explore.erDetails = erDetails;

// ---------------------------------------------------------------- map viewer + geo grids (SPEC §22)
const MAP_COLORS = { dark: { ocean: '#0f1722', land: '#1f2a37', border: '#3a4a5e', grid0: '#3b82f6', grid1: '#22d3ee', grid2: '#fde047', heat0: '#7c2d12', heat1: '#f97316', heat2: '#fef08a', gridLine: 'rgba(255,255,255,0.35)', select: '#ff3ea5' },
  light: { ocean: '#dbe7f3', land: '#f6f4ef', border: '#a9b4c2', grid0: '#93c5fd', grid1: '#2563eb', grid2: '#1e1b4b', heat0: '#fed7aa', heat1: '#f97316', heat2: '#7f1d1d', gridLine: 'rgba(0,0,0,0.35)', select: '#d6007a' } };
function geoCached(id, it) { const c = S.map.geo.get(id); if (c && c.v === it.version && c.it === it) return c.g; const g = geoOf(it); S.map.geo.set(id, { v: it.version, it, g }); return g; }
function geoNodesVisible() {
  const out = []; graph.forEachNode((id, a) => { if (renderer.getNodeState(id).isHidden) return; const g = geoCached(id, a.item); if (g) out.push({ id, lat: g.lat, lon: g.lon }); }); return out;
}
let lastMapSync = 0;
function mapSync() {
  const now = performance.now(); if (now - lastMapSync < 200) return; lastMapSync = now;
  S.map.dirty = false;
  const nodes = [], pos = new Map(), k = Math.max(0.45, sizeScaleFor(graph.order));
  graph.forEachNode((id, a) => {
    if (renderer.getNodeState(id).isHidden) return; const g = geoCached(id, a.item); if (!g) return; pos.set(id, g);
    nodes.push({ id, lat: g.lat, lon: g.lon, color: a.color, border: a.borderColor, size: Math.max(2.5, Math.min(16, (a.size || 6) * 0.75 * k)), sym: a.symbol ? a.symId : null, label: a.label || id });
  });
  const links = [];
  if (S.map.links) graph.forEachEdge((e, a, s, t) => { if (links.length >= 30000 || renderer.getEdgeState(e).isHidden) return; const gs = pos.get(s), gt = pos.get(t); if (gs && gt && s !== t) links.push({ id: e, a: gs, b: gt, color: a.color, width: Math.max(0.6, Math.min(4, a.size || 1)), dashed: !!a.dashed }); });
  S.map.view.showLinks = S.map.links; S.map.view.setData(nodes, links);
  mapHighlight(); mapStatus();
}
function mapHighlight() {
  S.map.hlDirty = false; if (!S.map.view) return;
  const h = S.hlSets || { nodes: new Set(), edges: new Set() };
  S.map.view.setHighlight({ selected: new Set(S.selected), nodes: h.nodes, links: h.edges, any: h.nodes.size > 0 || S.selected.size > 0 });
  // selection sync graph -> map: a single node selected (e.g. in the graph pane) that is off-screen on the map is panned into view
  const key = [...S.selected].join('\n');
  if (key !== S.map.lastSel) {
    S.map.lastSel = key;
    if (S.selected.size === 1 && performance.now() > (S.map.noRevealUntil || 0)) {
      const id0 = [...S.selected][0], g = graph.hasNode(id0) && geoCached(id0, graph.getNodeAttribute(id0, 'item')), m = S.map.view.map;
      if (g && m && !m.getBounds().contains([g.lon, g.lat])) m.easeTo({ center: [g.lon, g.lat], duration: 600 });
    }
  }
}
function mapStatus() {
  const st = S.map.view?.stats(); if (!st) return;
  $('#map-status').textContent = `${st.points.toLocaleString()} on map · ${st.links.toLocaleString()} links${st.grid.kind !== 'none' ? ` · ${st.cells.toLocaleString()} ${st.grid.kind.toUpperCase()} cells` : ''} · basemap ${st.basemap}${st.fellBack ? ' (online style unreachable)' : ''}`;
}
async function ensureMap() {
  if (S.map.view) return S.map.view;
  return (S.map.loading ||= (async () => {
    S.map.config ||= await api('/api/explore/geo/config');
    const mapUrl = '/explore/map.js'; const { createMap } = await import(/* @vite-ignore */ mapUrl);
    const v = await createMap({ container: $('#map'), config: S.map.config, basemap: params.get('basemap') || S.map.basemap || S.map.config.basemap, colors: MAP_COLORS[S.theme] || MAP_COLORS.dark,
      symbolUrl: key => { const c = atlas.cache.get(key); return c?.ready ? c.dataUrl : null; },
      onSelect: (id, add) => (id ? select(id, add) : clearSelection()),
      onCellSelect: (ids, add, cell) => { if (!add) S.selected.clear(); for (const id of ids) if (graph.hasNode(id)) S.selected.add(id); S.pathIds = null; applyHighlight(); $('#map-cell').textContent = `${cell.kind.toUpperCase()} ${cell.cell}: ${cell.count} node${cell.count === 1 ? '' : 's'} selected`; },
    });
    v.onMove = () => { document.body.dataset.mapMoved = String(Date.now()); };
    v.uiWrong = !!S.core?.config?.scaleUiWrong; v.setClustering(S.map.cluster);
    S.map.view = v; v.setPoints(S.map.points); S.map.basemap = v.basemap; $('#map-basemap').value = params.get('basemap') || S.map.config.basemap;
    v.setGrid(S.map.grid); S.map.dirty = true; lastMapSync = 0; mapSync();
    if (!S.map.camera) v.fitTo(geoNodesVisible()); else v.setCamera(S.map.camera);
    document.body.dataset.mapReady = '1';
    return v;
  })().catch(e => { S.map.loading = null; toast('Map failed to load: ' + e.message); throw e; }));
}
/** saved-view map state (SPEC §22.5): mode, map camera, grid kind + resolution, heat, links, basemap. No map block = graph mode. */
async function applyMapState(m, { animate = false } = {}) {
  m = m || { mode: 'graph' }; S.map.noRevealUntil = performance.now() + 2000; // a restored camera wins over the reveal-selection pan
  S.map.links = m.links !== false; $('#map-links').checked = S.map.links; S.map.points = m.points !== false; $('#map-points').checked = S.map.points; S.map.view?.setPoints(S.map.points); S.map.heat = !!m.heat; $('#map-heat').checked = S.map.heat; S.map.cluster = !!m.cluster; $('#map-cluster').checked = S.map.cluster; S.map.view?.setClustering(S.map.cluster);
  S.map.camera = m.camera || null;
  if (m.grid) setGrid(m.grid.kind || 'none', m.grid.resolution);
  if (m.mode && m.mode !== 'graph') {
    await setMapMode(m.mode);
    if (m.basemap && m.basemap !== $('#map-basemap').value) { $('#map-basemap').value = m.basemap; await S.map.view.setBasemap(m.basemap); S.map.basemap = m.basemap; }
    lastMapSync = 0; mapSync();
    if (m.camera) S.map.view.setCamera(m.camera, animate); else S.map.view.fitTo(geoNodesVisible(), animate);
    if (animate) await sleep(500);
    if (S.map.heat) await pollHeat();
  } else await setMapMode('graph');
}
async function setMapMode(mode, { fit = false } = {}) {
  if (!['graph', 'map', 'split'].includes(mode)) mode = 'graph';
  S.map.mode = mode; document.body.dataset.mode = mode;
  if (S.scale) SC.refresh(); // auto aggregation is off while the map is shown (§24.1)
  for (const b of document.querySelectorAll('#view-mode button')) b.classList.toggle('on', b.dataset.m === mode);
  $('#map').hidden = mode === 'graph'; $('#map-section').hidden = mode === 'graph';
  renderer?.resize?.(); renderer?.refresh();
  if (mode !== 'graph') { const v = await ensureMap(); v.resize(); S.map.dirty = true; lastMapSync = 0; mapSync(); if (fit) v.fitTo(geoNodesVisible()); }
}
function setGrid(kind, resolution) {
  S.map.grid = { kind, resolution: resolution ?? S.map.grid.resolution };
  const r = { h3: [0, 10], mgrs: [0, 4] }[kind];
  if (r) { S.map.grid.resolution = Math.max(r[0], Math.min(r[1], S.map.grid.resolution)); $('#map-res').min = r[0]; $('#map-res').max = r[1]; }
  $('#map-grid').value = kind; $('#map-res').value = S.map.grid.resolution; $('#map-res').disabled = kind === 'none';
  $('#map-res-label').textContent = kind === 'h3' ? `res ${S.map.grid.resolution}` : kind === 'mgrs' ? ['100 km', '10 km', '1 km', '100 m', '10 m'][S.map.grid.resolution] : '';
  $('#map-cell').textContent = '';
  S.map.view?.setGrid(S.map.grid); if (S.map.heat) pollHeat(); mapStatus();
}
async function pollHeat() {
  if (!S.map.heat || !S.map.view || S.map.grid.kind !== 'h3') { S.map.view?.setHeat(null, false); return; }
  try {
    const r = await api(`/api/explore/geo/grid?kind=h3&res=${S.map.config.streamGeoResolution ?? S.map.grid.resolution}&stream=1&limit=1`);
    const st = r.stream || {};
    if (!st.available) { $('#map-heat-status').textContent = st.reason || 'no stream heat'; S.map.view.setHeat(null, false); return; }
    S.map.heatData = st; S.map.view.setHeat({ kind: 'h3', resolution: st.resolution, counts: st.counts }, true);
    $('#map-heat-status').textContent = `Flink: ${Object.keys(st.counts).length} cells · ${st.events} events in the last ${st.windows} × ${Math.round(st.windowMs / 1000)} s windows (res ${st.resolution})`;
  } catch (e) { $('#map-heat-status').textContent = 'heat: ' + e.message; }
}
function bindMap() {
  for (const b of document.querySelectorAll('#view-mode button')) b.onclick = () => setMapMode(b.dataset.m, { fit: !S.map.view }).catch(() => {});
  $('#map-grid').onchange = e => setGrid(e.target.value, e.target.value === 'h3' ? 3 : e.target.value === 'mgrs' ? 0 : undefined);
  $('#map-res').oninput = e => setGrid(S.map.grid.kind, Number(e.target.value));
  $('#map-points').onchange = e => { S.map.points = e.target.checked; S.map.view?.setPoints(S.map.points); };
  $('#map-cluster').checked = !!S.map.cluster; $('#map-cluster').onchange = e => { S.map.cluster = e.target.checked; S.map.view?.setClustering(S.map.cluster); };
  $('#map-links').onchange = e => { S.map.links = e.target.checked; S.map.dirty = true; lastMapSync = 0; };
  $('#map-fit').onclick = () => S.map.view?.fitTo(S.selected.size ? [...S.selected].map(id => graph.hasNode(id) && geoCached(id, graph.getNodeAttribute(id, 'item'))).filter(Boolean) : geoNodesVisible(), true);
  $('#map-basemap').onchange = async e => { await ensureMap(); await S.map.view.setBasemap(e.target.value); S.map.basemap = e.target.value; S.map.dirty = true; lastMapSync = 0; mapSync(); mapStatus(); };
  $('#map-heat').onchange = e => { S.map.heat = e.target.checked; if (S.map.heat && S.map.grid.kind !== 'h3') setGrid('h3', S.map.config?.streamGeoResolution ?? 4); pollHeat(); };
  setInterval(() => { if (S.map.heat) pollHeat(); }, Number(params.get('heatEvery')) || 2000);
}
async function initMap() {
  bindMap();
  S.map.config = await api('/api/explore/geo/config').catch(() => null);
  if (S.map.config?.streamGeo) $('#map-heat-row').hidden = false;
  const g = params.get('grid'); if (g && ['h3', 'mgrs', 'none'].includes(g)) S.map.grid = { kind: g, resolution: Number(params.get('res') ?? (g === 'mgrs' ? 0 : 3)) };
  else if (S.map.config?.defaultGrid && S.map.mode !== 'graph') S.map.grid = { ...S.map.config.defaultGrid };
  setGrid(S.map.grid.kind, S.map.grid.resolution);
  if (S.map.mode !== 'graph') await setMapMode(S.map.mode, { fit: true }); else document.body.dataset.mode = 'graph';
}
/** Focus a node picked in the search index: load it if this view does not have it yet, select it, centre the graph on it,
 *  and, when it has a location, centre the map too (opening split view if the map is closed). */
async function focusFromIndex(id, hit = {}) {
  if (!graph.hasNode(id)) { try { const r = await api(`/api/explore/session/${S.sessionId}/search`, { text: hit.name || id.replace(/^sg:node:[^:]+:/, ''), limit: 200 }); addItems(r.items); } catch { /* fall through */ } }
  if (!graph.hasNode(id)) { toast('That result is not in this graph view (it may be hidden by a filter).'); return false; }
  if (S.hiddenTypes.has(graph.getNodeAttribute(id, 'item')?.type)) toggleType(graph.getNodeAttribute(id, 'item').type);
  select(id); focusNode(id); $('#search-info').textContent = `focused: ${hit.name || id}`;
  document.body.dataset.focused = id;
  const geo = hit.geo || geoOf(graph.getNodeAttribute(id, 'item'));
  if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lon)) {
    try { if (S.map.mode === 'graph') await setMapMode('split', { fit: false }); S.map.view?.map?.easeTo({ center: [geo.lon, geo.lat], zoom: Math.max(S.map.view.map.getZoom(), 11), duration: 500 }); document.body.dataset.focusedGeo = `${geo.lat},${geo.lon}`; } catch (e) { console.warn('map focus', e); }
  }
  return true;
}
window.__explore.focusFromIndex = focusFromIndex;
window.__explore.setMapMode = setMapMode; window.__explore.setGrid = setGrid; window.__explore.ensureMap = ensureMap; window.__explore.mapSync = () => { lastMapSync = 0; mapSync(); };
Object.defineProperty(window.__explore, 'mapView', { get: () => S.map.view });

(async function main() {
  await loadStyle();
  $('#theme').textContent = S.theme === 'dark' ? '☀ Light' : '☾ Dark';
  await chooseRenderer(loadPref(localStorage, params.get('renderer')));
  createRenderer(); bind(); bindRendererControl(); updateRendererStatus(true);
  // search index box goes into the toolbar before the first layout, so the canvas does not move later
  installIndexSearch({ api, mapView: () => S.map.view, types: () => [...new Set(graph.mapNodes((n, a) => a.item?.type).filter(Boolean))].sort(), focus: focusFromIndex });
  // Phase 1 core loop (SPEC §23): decide full vs focus scope before the first snapshot
  const coreCfg = await api('/api/explore/core/config').catch(() => null);
  { const el = document.getElementById('dataset-credit'); const credit = coreCfg?.datasetCredit; if (el && credit) { el.textContent = credit; el.hidden = false; el.title = credit; } }
  CL.installCoreLoop({ config: coreCfg, S, graph, store, api, toast, setStatus, addItems, applyVisibility, applyHighlight, restyleNode, restyleEdge, restyleAll, select, clearSelection, selectAllVisible, pin, fitCamera, focusNode, runLayout, captureState, refreshViews: () => refreshViews(), renderer: () => renderer, label: id => displayLabel(graph.getNodeAttribute(id, 'item')) });
  // Phase 2 scale and readability (SPEC §24): semantic zoom, bundling, loaded/total badge, progress bar, cost estimates
  SC.installScale({ config: coreCfg, S, graph, api, toast, setStatus, applyVisibility, addItems, animateTo, renderer: () => renderer, core: CL });
  window.__explore.scale = SC.api;
  const scope = params.get('scope') || coreCfg?.scope || 'auto';
  S.core.scope = scope === 'focus' || (scope === 'auto' && coreCfg && coreCfg.counts.nodes > coreCfg.fullSnapshotMax) ? 'focus' : 'full';
  document.body.dataset.scope = S.core.scope;
  await openSession();
  if (S.core.scope === 'focus') {
    const seeds = params.get('seeds')?.split(',').filter(Boolean) || [];
    if (seeds.length) await CL.expandStream(seeds, { hops: Number(params.get('hops') || 1), maxNodes: Number(params.get('max') || $('#expand-limit').value || 500), quiet: true });
    else toast(`Large graph (${coreCfg?.counts.nodes.toLocaleString()} nodes): focus mode loads only what you search for (Shift+Enter) or expand.`);
    CL.updateScopeBadge();
  }
  if (S.scale.mode === 'on' || (S.scale.mode === 'auto' && (S.core.scope === 'focus' || graph.order > S.scale.autoAbove))) await SC.loadOverview();
  SC.updateBadge(); if (S.scale.bundle.on) SC.setBundle(true);
  initProcessor().catch(e => console.warn('processor overlay', e));
  await initEr().catch(e => console.warn('entity resolution', e));
  requestAnimationFrame(frame);
  // first useful frame: the frame after the snapshot is styled and drawn (page clock, ms since navigation start)
  requestAnimationFrame(() => requestAnimationFrame(() => { S.metrics.firstFrameAt = performance.now(); }));
  S.metrics.readyAt = performance.now();
  document.body.dataset.ready = '1';
  await initMap().catch(e => console.warn('map', e)); document.body.dataset.mapInit = '1';
  await initViews(); document.body.dataset.viewsReady = '1';
  // search index (OpenSearch / built-in): toolbar box, results grouped by type; a click focuses the node (and the map)
  { const f = params.get('focus'); if (f) focusFromIndex(f, { name: params.get('focusName') || '', geo: params.get('flat') ? { lat: Number(params.get('flat')), lon: Number(params.get('flon')) } : null }); }
  document.body.dataset.indexSearch = '1';
})().catch(e => { console.error(e); toast('Failed to start: ' + e.message); });
