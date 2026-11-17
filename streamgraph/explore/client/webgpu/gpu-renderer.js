// WebGPU graph renderer with the subset of the sigma 4 API the explorer uses, so main.js / core-loop.js / scale.js /
// studio-extras.js drive it exactly like the sigma renderer: node + edge states, camera, events (enterNode, clickNode,
// doubleClickNode, rightClickNode/Edge/Stage, clickStage, nodeDragStart/End, afterRender), getNodeDisplayData,
// framedGraphToViewport / graphToViewport, setCustomBBox, settings, resize, refresh, kill.
//
// It reads ONLY the graphology graph the explorer already holds (filled from the explore API, which passes the ABAC
// egress filter in explore/server/access.js) and opens no data path of its own.
//
// Drawing: gpu-core.js (instanced quads, hand-written WGSL). Picking: CPU uniform grid (spatial.js) for nodes,
// brute force for edges on right-click only. Labels: a 2D canvas overlay with a budget (see drawLabels).
import { GpuCore, GpuError, getDevice, onDeviceLost, MAX_IN_FLIGHT } from './gpu-core.js';
import { Camera, normalization, viewTransform, framedToViewport, viewportToFramed, graphToFramed, framedToGraph, sizeFactor, DEFAULT_PADDING } from './camera.js';
import { parseColor, withAlpha, unpack } from './color.js';
import { GridIndex } from './spatial.js';

const SHAPES = { circle: 0, square: 1, diamond: 2, triangle: 3 };
const DEFAULT_STATE = Object.freeze({ isHidden: false, isHighlighted: false, isSelected: false, isHovered: false, isPath: false, isDragged: false });
const DEFAULT_SETTINGS = { readback: false, enableNodeDrag: true, enableEdgeEvents: true, labelDensity: 0.7, labelRenderedSizeThreshold: 6, labelGridCellSize: 110, labelBudget: 80, labelFont: 'system-ui, sans-serif', stagePadding: DEFAULT_PADDING, zoomingRatio: 1.7, doubleClickZoomingRatio: 2.2, dragTolerance: 3, minEdgePx: 0.6 };
const POS_KEYS = new Set(['x', 'y', 'placed']);

/**
 * styles: { nodeSize(a, s), nodeColor(a, s, g), nodeBorder(a, s, g), nodeShape(a), nodeOpacity(a), label(a),
 *           labelColor(a, s, g), labelSize(), labelVisibility(a, s, g), edgeSize(a, s), edgeColor(a, s, g),
 *           edgeDashed(a, s), background(), backdrop() }   (all optional; sigma-like defaults)
 */
export class WebGPURenderer {
  static async prepare(adapter) { return getDevice(adapter); }
  constructor(graph, container, { device, styles = {}, settings = {}, onFail = null } = {}) {
    if (!device) throw new GpuError('WebGPURenderer needs a device (await WebGPURenderer.prepare() first)', 'device');
    this.kind = 'webgpu'; this.graph = graph; this.container = container; this.styles = styles; this.onFail = onFail;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.camera = new Camera(); this.listeners = new Map();
    this.nodeStates = new Map(); this.edgeStates = new Map();
    this.customBBox = null; this.killed = false; this.frameId = 0;
    this.dirty = { structure: true, style: true, pos: true, labels: true, pick: true };
    this.stats = { renders: 0, cpuMs: [], last: 0, uploads: 0, uploadMs: 0, lastUploadMs: 0 };
    // DOM: GPU canvas + label overlay (both fill the container; pointer events land on the label canvas)
    const mk = cls => { const c = document.createElement('canvas'); c.className = cls; Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' }); container.appendChild(c); return c; };
    this.canvas = mk('sigma-webgpu gpu-canvas'); this.labelCanvas = mk('sigma-mouse gpu-labels');
    this.labelCanvas.style.touchAction = 'none';
    this.core = new GpuCore(device, this.canvas, { readback: !!this.settings.readback });
    this.core.onError = err => this.fail(err);
    this.core.onIdle = () => { if (this.pendingRender && !this.killed) { this.pendingRender = false; this.scheduleRender(); } };
    this.unlost = onDeviceLost(info => this.fail(new GpuError(`WebGPU device lost${info?.reason ? ` (${info.reason})` : ''}: ${info?.message || ''}`, 'device-lost')));
    this.info = device.__info || {};
    this.grid = new GridIndex();
    this.u = new Float32Array(16);
    this.bindGraph(); this.bindPointer();
    this.camera.on('updated', () => { this.dirty.labels = true; this.scheduleRender(); });
    this.resize(); this.process(); this.renderNow();
  }

  // ------------------------------------------------------------ events
  on(ev, fn) { if (!this.listeners.has(ev)) this.listeners.set(ev, new Set()); this.listeners.get(ev).add(fn); return this; }
  once(ev, fn) { const w = a => { this.off(ev, w); fn(a); }; return this.on(ev, w); }
  off(ev, fn) { this.listeners.get(ev)?.delete(fn); return this; }
  removeListener(ev, fn) { return this.off(ev, fn); }
  removeAllListeners(ev) { if (ev) this.listeners.delete(ev); else this.listeners.clear(); return this; }
  emit(ev, a) { for (const f of [...(this.listeners.get(ev) || [])]) { try { f(a); } catch (e) { console.error(e); } } }
  fail(err) { if (this.killed || this.failed) return; this.failed = err; this.emit('fail', err); this.onFail?.(err); }

  // ------------------------------------------------------------ graph binding
  bindGraph() {
    const g = this.graph, D = this.dirty, sched = () => this.scheduleRender();
    const structure = () => { D.structure = true; sched(); };
    const nodeAttr = p => {
      const i = this.idx?.get(p.key);
      if (i !== undefined && p.type === 'merge' && p.data && Object.keys(p.data).every(k => POS_KEYS.has(k))) {
        // position-only change (layout animation, drag): patch in place, re-upload positions only
        const a = p.attributes; this.pos[2 * i] = a.x; this.pos[2 * i + 1] = a.y; D.pos = true; D.pick = true; D.labels = true;
      } else {
        if (i !== undefined && p.attributes) { const a = p.attributes; this.pos[2 * i] = Number.isFinite(a.x) ? a.x : 0; this.pos[2 * i + 1] = Number.isFinite(a.y) ? a.y : 0; }
        D.style = true; D.pos = true;
      }
      sched();
    };
    const style = () => { D.style = true; sched(); };
    const all = () => { D.style = true; D.pos = true; D.readPos = true; sched(); };
    this.graphHandlers = { nodeAdded: structure, nodeDropped: structure, edgeAdded: structure, edgeDropped: structure, cleared: structure, edgesCleared: structure,
      nodeAttributesUpdated: nodeAttr, edgeAttributesUpdated: style, eachNodeAttributesUpdated: all, eachEdgeAttributesUpdated: style };
    for (const [k, f] of Object.entries(this.graphHandlers)) g.on(k, f);
  }
  rebuildIndex() {
    const g = this.graph, n = g.order;
    this.nodeIds = new Array(n); this.idx = new Map(); let i = 0;
    g.forEachNode(id => { this.nodeIds[i] = id; this.idx.set(id, i); i++; });
    const cap = Math.max(16, n);
    if (!this.pos || this.pos.length < 2 * cap) { this.pos = new Float32Array(2 * cap); this.nstyle = new Uint32Array(4 * cap); this.order = new Uint32Array(cap); this.radius = new Float32Array(cap); this.hidden = new Uint8Array(cap); this.top = new Uint8Array(cap); }
    for (let k = 0; k < n; k++) { const a = g.getNodeAttributes(this.nodeIds[k]); this.pos[2 * k] = Number.isFinite(a.x) ? a.x : 0; this.pos[2 * k + 1] = Number.isFinite(a.y) ? a.y : 0; }
    const ecap = Math.max(16, g.size);
    if (!this.edgeBuf || this.edgeBuf.length < 4 * ecap) { this.edgeBuf = new Uint32Array(4 * ecap); this.edgeF = new Float32Array(this.edgeBuf.buffer); this.edgeIdsDrawn = new Array(ecap); }
    // label candidates: the most connected nodes first (computed once per structure change, not per frame)
    const deg = []; for (let k = 0; k < n; k++) deg.push(k);
    if (n > 4000) { const d = new Float64Array(n); for (let k = 0; k < n; k++) d[k] = g.degree(this.nodeIds[k]); deg.sort((a, b) => d[b] - d[a]); deg.length = 4000; }
    else deg.sort((a, b) => g.degree(this.nodeIds[b]) - g.degree(this.nodeIds[a]));
    this.labelOrder = deg;
    for (const id of this.nodeStates.keys()) if (!g.hasNode(id)) this.nodeStates.delete(id);
    for (const id of this.edgeStates.keys()) if (!g.hasEdge(id)) this.edgeStates.delete(id);
  }

  // ------------------------------------------------------------ states (sigma API)
  getNodeState(id) { return this.nodeStates.get(id) || DEFAULT_STATE; }
  getEdgeState(id) { return this.edgeStates.get(id) || DEFAULT_STATE; }
  setNodeState(id, st) { const cur = this.nodeStates.get(id); this.nodeStates.set(id, cur ? Object.assign(cur, st) : { ...DEFAULT_STATE, ...st }); this.dirty.style = true; this.scheduleRender(); return this; }
  setNodesState(ids, st) { for (const id of ids) { const cur = this.nodeStates.get(id); if (cur) Object.assign(cur, st); else this.nodeStates.set(id, { ...DEFAULT_STATE, ...st }); } this.dirty.style = true; this.scheduleRender(); return this; }
  setEdgeState(id, st) { return this.setEdgesState([id], st); }
  setEdgesState(ids, st) { for (const id of ids) { const cur = this.edgeStates.get(id); if (cur) Object.assign(cur, st); else this.edgeStates.set(id, { ...DEFAULT_STATE, ...st }); } this.dirty.style = true; this.scheduleRender(); return this; }
  getNodesState() { return this.nodeStates; }
  getGraph() { return this.graph; }
  getContainer() { return this.container; }
  getCamera() { return this.camera; }
  getSetting(k) { return this.settings[k]; }
  setSetting(k, v) { this.settings[k] = v; this.dirty.labels = true; this.scheduleRender(); return this; }
  updateSetting(k, fn) { return this.setSetting(k, fn(this.settings[k])); }
  getSettings() { return { ...this.settings }; }
  setCustomBBox(b) { this.customBBox = b ? { x: [...b.x], y: [...b.y] } : null; this.dirty.pos = true; this.scheduleRender(); return this; }
  getCustomBBox() { return this.customBBox; }
  getBBox() { return this.extent; }
  getDimensions() { return { width: this.width, height: this.height }; }
  getStagePadding() { return this.settings.stagePadding; }

  // ------------------------------------------------------------ processing: graphology -> typed arrays
  process() {
    const D = this.dirty;
    if (D.structure) { this.rebuildIndex(); D.structure = false; D.style = true; D.pos = true; D.upload = true; D.readPos = false; }
    if (D.readPos) { const g = this.graph; for (let k = 0; k < this.nodeIds.length; k++) { const a = g.getNodeAttributes(this.nodeIds[k]); this.pos[2 * k] = Number.isFinite(a.x) ? a.x : 0; this.pos[2 * k + 1] = Number.isFinite(a.y) ? a.y : 0; } D.readPos = false; D.pos = true; D.pick = true; }
    if (D.pos) this.computeExtent();
    if (D.style) this.rebuildStyle();
    return this;
  }
  computeExtent() {
    const n = this.nodeIds.length, p = this.pos;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    if (this.customBBox) { [x0, x1] = this.customBBox.x; [y0, y1] = this.customBBox.y; }
    else for (let i = 0; i < n; i++) { const x = p[2 * i], y = p[2 * i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (!Number.isFinite(x0)) { x0 = 0; x1 = 1; y0 = 0; y1 = 1; }
    this.extent = { x: [x0, x1], y: [y0, y1] };
    this.norm = normalization(this.extent);
  }
  rebuildStyle() {
    const g = this.graph, S = this.styles, n = this.nodeIds.length;
    let hasHighlighted = false; for (const st of this.nodeStates.values()) if (st.isHighlighted) { hasHighlighted = true; break; }
    const gs = this.graphState = { hasHighlighted, hasHovered: !!this.hoveredNode };
    const ns = this.nstyle, rad = this.radius, hid = this.hidden, top = this.top;
    let lo = 0; const topList = [];
    for (let i = 0; i < n; i++) {
      const id = this.nodeIds[i], a = g.getNodeAttributes(id), s = this.nodeStates.get(id) || DEFAULT_STATE;
      if (s.isHidden || a.hidden) { hid[i] = 1; top[i] = 0; continue; }
      hid[i] = 0;
      const size = S.nodeSize ? S.nodeSize(a, s, gs) : a.size || 10;
      const op = S.nodeOpacity ? S.nodeOpacity(a) : a.opacity ?? 1;
      const fill = withAlpha(parseColor(S.nodeColor ? S.nodeColor(a, s, gs) : a.color || '#666'), op);
      const ring = withAlpha(parseColor(S.nodeBorder ? S.nodeBorder(a, s, gs) : a.borderColor || a.color || '#666'), op);
      const shape = SHAPES[S.nodeShape ? S.nodeShape(a) : a.shape] ?? 0;
      rad[i] = size; ns[4 * i] = f2u(size); ns[4 * i + 1] = fill; ns[4 * i + 2] = ring; ns[4 * i + 3] = shape;
      const isTop = s.isHovered || s.isSelected || s.isHighlighted; top[i] = isTop ? 1 : 0;
      if (isTop) topList.push(i); else this.order[lo++] = i;
    }
    for (const i of topList) this.order[lo++] = i;
    this.orderCount = lo;
    // edges: skip hidden ones and edges touching hidden nodes; highlighted / path edges go last (drawn on top)
    const eb = this.edgeBuf, ef = this.edgeF, drawn = this.edgeIdsDrawn; let ne = 0; const topE = [];
    g.forEachEdge((e, a, src, tgt) => {
      const s = this.edgeStates.get(e) || DEFAULT_STATE; if (s.isHidden || a.hidden) return;
      const si = this.idx.get(src), ti = this.idx.get(tgt); if (si === undefined || ti === undefined || hid[si] || hid[ti]) return;
      if (s.isHighlighted || s.isPath) { topE.push([e, a, s, si, ti]); return; }
      this.writeEdge(eb, ef, drawn, ne++, e, a, s, si, ti, gs);
    });
    for (const [e, a, s, si, ti] of topE) this.writeEdge(eb, ef, drawn, ne++, e, a, s, si, ti, gs);
    this.edgeCount = ne;
    this.dirty.style = false; this.dirty.upload = true; this.dirty.labels = true; this.dirty.pick = true;
  }
  writeEdge(eb, ef, drawn, k, e, a, s, si, ti, gs) {
    const S = this.styles;
    const w = S.edgeSize ? S.edgeSize(a, s, gs) : a.size || 1, dashed = S.edgeDashed ? S.edgeDashed(a, s) : !!a.dashed;
    eb[4 * k] = si; eb[4 * k + 1] = ti; eb[4 * k + 2] = parseColor(S.edgeColor ? S.edgeColor(a, s, gs) : a.color || '#ccc'); ef[4 * k + 3] = dashed ? -Math.max(w, 1e-3) : Math.max(w, 1e-3);
    drawn[k] = e;
  }

  // ------------------------------------------------------------ rendering
  scheduleRender() { if (this.killed || this.raf) return this; this.raf = requestAnimationFrame(() => { this.raf = null; this.renderNow(); }); return this; }
  scheduleRefresh() { this.dirty.style = true; return this.scheduleRender(); }
  refresh() { if (this.killed) return this; this.dirty.style = true; this.dirty.readPos = true; this.renderNow(); return this; }
  render() { return this.renderNow(); }
  transform(camState = this.camera.getState()) { return viewTransform(camState, this.width || 1, this.height || 1, this.norm || normalization({ x: [0, 1], y: [0, 1] }), this.settings.stagePadding); }
  renderNow() {
    if (this.killed || this.failed) return this;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    const t0 = performance.now();
    this.emit('beforeRender');
    try {
      this.process();
      // backpressure: never queue more than MAX_IN_FLIGHT frames ahead of the GPU (a slow GPU would otherwise pile up
      // frames and memory); the frame is redrawn as soon as one finishes
      if (this.core.inFlight >= MAX_IN_FLIGHT) { this.pendingRender = true; this.stats.skipped = (this.stats.skipped || 0) + 1; return this; }
      const D = this.dirty;
      if (D.upload) { const tu = performance.now(); this.core.setNodes(this.pos, this.nstyle, this.nodeIds.length); this.core.setOrder(this.order, this.orderCount); this.core.setEdges(this.edgeBuf, this.edgeCount); D.upload = false; D.pos = false; this.stats.uploads++; this.stats.lastUploadMs = performance.now() - tu; this.stats.uploadMs += this.stats.lastUploadMs; }
      else if (D.pos) { this.core.setPositions(this.pos, this.nodeIds.length); D.pos = false; }
      const t = this.transform(), u = this.u, cam = this.camera;
      u[0] = this.width; u[1] = this.height; u[2] = cam.x; u[3] = cam.y;
      u[4] = t.c; u[5] = t.s; u[6] = t.k; u[7] = sizeFactor(cam.ratio);
      u[8] = this.norm.dX; u[9] = this.norm.dY; u[10] = 1 / this.norm.ratio; u[11] = 2;
      u[12] = 7; u[13] = 5; u[14] = this.settings.minEdgePx; u[15] = 0;
      const bg = unpack(parseColor(this.styles.background ? this.styles.background() : '#ffffff'));
      this.core.render(u, [bg[0] / 255, bg[1] / 255, bg[2] / 255, bg[3]]);
      if (D.labels) { this.drawLabels(t); D.labels = false; }
    } catch (err) { this.fail(err); return this; }
    this.frameId++;
    const ms = performance.now() - t0, st = this.stats; st.renders++; st.cpuMs.push(ms); if (st.cpuMs.length > 120) st.cpuMs.shift(); st.last = ms;
    this.emit('afterRender');
    return this;
  }
  resize() {
    const r = this.container.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(r.width || this.container.clientWidth || 1)), h = Math.max(1, Math.round(r.height || this.container.clientHeight || 1));
    if (w === this.width && h === this.height && dpr === this.dpr) return this;
    this.width = w; this.height = h; this.dpr = dpr;
    this.core.resize(Math.round(w * dpr), Math.round(h * dpr));
    this.labelCanvas.width = Math.round(w * dpr); this.labelCanvas.height = Math.round(h * dpr);
    this.dirty.labels = true; this.scheduleRender();
    return this;
  }

  // ------------------------------------------------------------ labels (2D overlay)
  // Shown: the hovered node, selected and highlighted nodes (capped at 300), labelVisibility 'visible' ones, then
  // automatic labels for the most connected on-screen nodes (top 4,000 by degree) whose disc is at least
  // labelRenderedSizeThreshold px, one per grid cell, at most labelBudget * labelDensity per frame.
  drawLabels(t) {
    const g = this.graph, S = this.styles, cv = this.labelCanvas, c = cv.getContext('2d'), dpr = this.dpr || 1;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.nodeIds?.length) return;
    const gs = this.graphState || { hasHighlighted: false }, sf = sizeFactor(this.camera.ratio), W = this.width, H = this.height;
    const size = S.labelSize ? S.labelSize() : 14, font = `${size}px ${this.settings.labelFont}`; c.font = font; c.textBaseline = 'middle';
    const cell = this.settings.labelGridCellSize, used = new Set(), drawnIds = new Set();
    const at = i => { const f = graphToFramed(this.norm, this.pos[2 * i], this.pos[2 * i + 1]); return framedToViewport(t, f.x, f.y); };
    const draw = (i, force) => {
      const id = this.nodeIds[i]; if (drawnIds.has(id) || this.hidden[i]) return false;
      const a = g.getNodeAttributes(id), s = this.nodeStates.get(id) || DEFAULT_STATE;
      const vis = S.labelVisibility ? S.labelVisibility(a, s, gs) : 'auto'; if (vis === 'hidden') return false;
      const text = S.label ? S.label(a) : a.label; if (!text) return false;
      const p = at(i), r = this.radius[i] * sf; if (p.x < -200 || p.y < -50 || p.x > W + 50 || p.y > H + 50) return false;
      if (!force && vis !== 'visible') {
        if (r < this.settings.labelRenderedSizeThreshold) return false;
        const k = `${Math.floor(p.x / cell)}:${Math.floor(p.y / (cell / 3))}`; if (used.has(k)) return false; used.add(k);
      }
      const x = p.x + r + 3, y = p.y;
      if (s.isHovered) { const w = c.measureText(text).width; c.fillStyle = S.backdrop ? S.backdrop() : 'rgba(255,255,255,0.9)'; c.beginPath(); c.roundRect?.(x - 4, y - size / 2 - 4, w + 8, size + 8, 5); c.fill(); } // backdrop behind the text only: the node itself is on the GPU canvas underneath
      c.fillStyle = S.labelColor ? S.labelColor(a, s, gs) : '#000'; c.fillText(text, x, y); drawnIds.add(id); return true;
    };
    if (this.hoveredNode != null && this.idx.has(this.hoveredNode)) draw(this.idx.get(this.hoveredNode), true);
    let forced = 0;
    for (const [id, s] of this.nodeStates) { if (forced >= 300) break; if ((s.isSelected || s.isHighlighted) && this.idx.has(id)) { if (draw(this.idx.get(id), true)) forced++; } }
    let budget = Math.round(this.settings.labelBudget * (this.settings.labelDensity ?? 0.7) / 0.7);
    for (const i of this.labelOrder) { if (budget <= 0) break; if (draw(i, false)) budget--; }
  }

  // ------------------------------------------------------------ coordinates (sigma API)
  graphToFramedGraph(p) { return graphToFramed(this.norm, p.x, p.y); }
  framedGraphToGraph(p) { return framedToGraph(this.norm, p.x, p.y); }
  framedGraphToViewport(p, o = {}) { return framedToViewport(this.transform(o.cameraState || this.camera.getState()), p.x, p.y); }
  viewportToFramedGraph(p, o = {}) { return viewportToFramed(this.transform(o.cameraState || this.camera.getState()), p.x, p.y); }
  graphToViewport(p, o = {}) { const f = graphToFramed(this.norm, p.x, p.y); return this.framedGraphToViewport(f, o); }
  viewportToGraph(p, o = {}) { const f = this.viewportToFramedGraph(p, o); return framedToGraph(this.norm, f.x, f.y); }
  getGraphToViewportRatio() { return this.transform().k / this.norm.ratio; }
  getNodeDisplayData(id) {
    const i = this.idx?.get(id); if (i === undefined) return undefined;
    const f = graphToFramed(this.norm, this.pos[2 * i], this.pos[2 * i + 1]);
    return { x: f.x, y: f.y, size: this.radius[i], color: this.styles.nodeColor ? this.styles.nodeColor(this.graph.getNodeAttributes(id), this.getNodeState(id), this.graphState || {}) : this.graph.getNodeAttribute(id, 'color'), hidden: !!this.hidden[i], label: this.graph.getNodeAttribute(id, 'label') };
  }

  // ------------------------------------------------------------ picking
  ensurePick() {
    if (!this.dirty.pick) return;
    const n = this.nodeIds.length, xs = new Float32Array(n), ys = new Float32Array(n);
    for (let i = 0; i < n; i++) { xs[i] = this.pos[2 * i]; ys[i] = this.pos[2 * i + 1]; }
    this.maxRadius = 0; for (let k = 0; k < this.orderCount; k++) { const r = this.radius[this.order[k]]; if (r > this.maxRadius) this.maxRadius = r; }
    this.grid.build(xs, ys, this.order, this.orderCount); this.dirty.pick = false;
  }
  /** topmost visible node under a viewport point, or null */
  getNodeAtPosition(p) {
    if (!this.nodeIds?.length) return null;
    this.process(); this.ensurePick();
    const t = this.transform(), f = viewportToFramed(t, p.x, p.y), gp = framedToGraph(this.norm, f.x, f.y);
    const pxPerGraph = t.k / this.norm.ratio, sf = sizeFactor(this.camera.ratio);
    const rGraph = (this.maxRadius * sf + 2) / pxPerGraph;
    let best = null, bestScore = Infinity;
    this.grid.query(gp.x, gp.y, rGraph, i => {
      const dx = (this.pos[2 * i] - gp.x) * pxPerGraph, dy = (this.pos[2 * i + 1] - gp.y) * pxPerGraph, d = Math.hypot(dx, dy), r = this.radius[i] * sf + 1;
      if (d > r) return;
      const score = d - (this.top[i] ? 1e6 : 0) - i * 1e-9; // highlighted nodes are drawn on top, so they win
      if (score < bestScore) { bestScore = score; best = i; }
    });
    return best == null ? null : this.nodeIds[best];
  }
  /** nearest visible edge within a few px (brute force; used on right-click only, capped at 300k drawn edges) */
  getEdgeAtPosition(p) {
    if (!this.edgeCount || this.edgeCount > 300000) return null;
    const t = this.transform(), sf = sizeFactor(this.camera.ratio); let best = null, bd = Infinity;
    const vp = i => { const f = graphToFramed(this.norm, this.pos[2 * i], this.pos[2 * i + 1]); return framedToViewport(t, f.x, f.y); };
    for (let k = 0; k < this.edgeCount; k++) {
      const a = vp(this.edgeBuf[4 * k]), b = vp(this.edgeBuf[4 * k + 1]);
      const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy; let q = L ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L : 0; q = Math.max(0, Math.min(1, q));
      const d = Math.hypot(p.x - a.x - q * dx, p.y - a.y - q * dy), tol = Math.max(3, Math.abs(this.edgeF[4 * k + 3]) * sf / 2 + 2);
      if (d <= tol && d < bd) { bd = d; best = this.edgeIdsDrawn[k]; }
    }
    return best;
  }

  // ------------------------------------------------------------ pointer interaction (pan, wheel zoom, hover, click, drag)
  bindPointer() {
    const el = this.labelCanvas, S = this.settings;
    const pt = e => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const evt = (e, p) => { const ev = { x: p.x, y: p.y, original: e, sigmaDefaultPrevented: false, preventSigmaDefault() { ev.sigmaDefaultPrevented = true; } }; return ev; };
    let down = null, hoverRaf = null, lastMove = null;
    const setHover = id => {
      if (id === this.hoveredNode) return;
      if (this.hoveredNode != null) { const prev = this.hoveredNode; this.hoveredNode = null; if (this.graph.hasNode(prev)) this.setNodeState(prev, { isHovered: false }); this.emit('leaveNode', { node: prev }); }
      if (id != null) { this.hoveredNode = id; this.setNodeState(id, { isHovered: true }); this.emit('enterNode', { node: id }); }
      el.style.cursor = id != null ? 'pointer' : down?.panning ? 'grabbing' : '';
    };
    const h = {
      pointerdown: e => {
        if (e.button !== 0) return;
        const p = pt(e), node = this.getNodeAtPosition(p);
        down = { p, start: p, node, cam: this.camera.getState(), moved: false, panning: !node, dragging: false, id: e.pointerId };
        el.setPointerCapture?.(e.pointerId);
        this.emit(node ? 'downNode' : 'downStage', { node, event: evt(e, p) });
      },
      pointermove: e => {
        const p = pt(e);
        if (down) {
          const dist = Math.hypot(p.x - down.start.x, p.y - down.start.y);
          if (!down.moved && dist < S.dragTolerance) return;
          down.moved = true;
          if (down.node && S.enableNodeDrag) {
            if (!down.dragging) { down.dragging = true; this.setNodeState(down.node, { isDragged: true }); this.emit('nodeDragStart', { node: down.node, event: evt(e, p) }); }
            const gp = this.viewportToGraph(p); this.graph.mergeNodeAttributes(down.node, { x: gp.x, y: gp.y });
            this.emit('nodeDrag', { node: down.node, event: evt(e, p) });
          } else if (down.panning || !S.enableNodeDrag) {
            const t = this.transform(down.cam), f0 = viewportToFramed(t, down.start.x, down.start.y), f1 = viewportToFramed(t, p.x, p.y);
            this.camera.setState({ x: down.cam.x - (f1.x - f0.x), y: down.cam.y - (f1.y - f0.y) }); el.style.cursor = 'grabbing';
          }
          return;
        }
        lastMove = p; if (hoverRaf) return;
        hoverRaf = requestAnimationFrame(() => { hoverRaf = null; if (!down && lastMove && !this.killed) setHover(this.getNodeAtPosition(lastMove)); });
      },
      pointerup: e => {
        if (!down) return; const d = down; down = null; const p = pt(e);
        el.releasePointerCapture?.(d.id); el.style.cursor = this.hoveredNode != null ? 'pointer' : '';
        if (d.dragging) { this.setNodeState(d.node, { isDragged: false }); this.emit('nodeDragEnd', { node: d.node, allDraggedNodes: [d.node], event: evt(e, p) }); return; }
        if (d.moved) return;
        if (d.node) this.emit('clickNode', { node: d.node, event: evt(e, p) }); else this.emit('clickStage', { event: evt(e, p) });
      },
      pointerleave: () => { if (!down) setHover(null); this.emit('leaveStage', {}); },
      dblclick: e => {
        const p = pt(e), node = this.getNodeAtPosition(p), ev = evt(e, p);
        this.emit(node ? 'doubleClickNode' : 'doubleClickStage', { node, event: ev });
        if (!ev.sigmaDefaultPrevented) this.zoomAround(p, S.doubleClickZoomingRatio, 250);
      },
      contextmenu: e => {
        e.preventDefault();
        const p = pt(e), node = this.getNodeAtPosition(p), ev = evt(e, p);
        if (node) return this.emit('rightClickNode', { node, event: ev });
        const edge = this.settings.enableEdgeEvents !== false ? this.getEdgeAtPosition(p) : null;
        if (edge) return this.emit('rightClickEdge', { edge, event: ev });
        this.emit('rightClickStage', { event: ev });
      },
      wheel: e => {
        e.preventDefault();
        const p = pt(e), factor = Math.pow(S.zoomingRatio, Math.max(-1, Math.min(1, -e.deltaY / (e.deltaMode === 1 ? 3 : 100))));
        this.zoomAround(p, factor, 0);
        this.emit('wheelStage', { event: evt(e, p) });
      },
    };
    this.domHandlers = h;
    for (const [k, f] of Object.entries(h)) el.addEventListener(k, f, k === 'wheel' ? { passive: false } : undefined);
  }
  /** zoom by `factor` (>1 zooms in) keeping the framed point under viewport point p fixed */
  zoomAround(p, factor, duration = 0) {
    const cam = this.camera, st = cam.getState(), ratio = cam.getBoundedRatio(st.ratio / factor);
    const f0 = viewportToFramed(this.transform(st), p.x, p.y), next = { ...st, ratio }, f1 = viewportToFramed(this.transform(next), p.x, p.y);
    const target = { x: st.x + (f0.x - f1.x), y: st.y + (f0.y - f1.y), ratio };
    return duration ? cam.animate(target, { duration }) : cam.setState(target);
  }

  // ------------------------------------------------------------ lifecycle
  kill() {
    if (this.killed) return;
    this.killed = true; if (this.raf) cancelAnimationFrame(this.raf);
    for (const [k, f] of Object.entries(this.graphHandlers || {})) this.graph.removeListener(k, f);
    for (const [k, f] of Object.entries(this.domHandlers || {})) this.labelCanvas.removeEventListener(k, f);
    this.unlost?.(); this.core.destroy(); this.canvas.remove(); this.labelCanvas.remove();
    this.emit('kill'); this.listeners.clear();
  }
  /** for the status readout and the benchmark */
  perf() { const a = [...this.stats.cpuMs].sort((x, y) => x - y); return { renders: this.stats.renders, cpuMedianMs: a.length ? a[Math.floor(a.length / 2)] : 0, lastUploadMs: this.stats.lastUploadMs, nodes: this.orderCount || 0, edges: this.edgeCount || 0, adapter: this.info }; }
}
const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
function f2u(v) { f32[0] = v; return u32[0]; }
