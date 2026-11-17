// Map viewer (SPEC §22): MapLibre GL JS (BSD-3) basemap + WebGL overlays for positioned nodes, links (arcs), H3 / MGRS
// grids and Flink heat. Bundled separately to explore/public/map.js and loaded only when the map is first opened, so the
// graph-only viewer stays as before. MapLibre itself is served unbundled from /explore/vendor/maplibre/ (its worker file
// sits next to it). All graph state (visibility, time cut, selection, styles) stays in main.js; this module only draws.
import { aggregate, gridGeoJSON, arc, GRID_RES, clampRes } from '../shared/geo.js';

const ML_URL = '/explore/vendor/maplibre/maplibre-gl.mjs';
let mlPromise = null;
export const loadMapLibre = () => (mlPromise ||= import(/* @vite-ignore */ String(ML_URL)).then(m => Object.assign(Object.create(null), m.default || {}, m)));
const LAYERS = ['sg-grid-fill', 'sg-grid-line', 'sg-links', 'sg-links-dashed', 'sg-nodes-halo', 'sg-nodes', 'sg-nodes-sym'];
const empty = () => ({ type: 'FeatureCollection', features: [] });

function offlineStyle(cfg, colors) {
  return { version: 8, name: 'offline-natural-earth',
    sources: { ne: { type: 'geojson', data: cfg.offlineData, attribution: cfg.offlineAttribution } },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': colors.ocean } },
      { id: 'land', type: 'fill', source: 'ne', paint: { 'fill-color': colors.land, 'fill-opacity': 1 } },
      { id: 'borders', type: 'line', source: 'ne', paint: { 'line-color': colors.border, 'line-width': 0.6 } },
    ] };
}
function rasterStyle(cfg) {
  return { version: 8, sources: { tiles: { type: 'raster', tiles: [cfg.tileUrl], tileSize: 256, attribution: cfg.attribution, maxzoom: 19 } }, layers: [{ id: 'tiles', type: 'raster', source: 'tiles' }] };
}
async function reachable(url, ms) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { signal: ac.signal }); return r.ok; } catch { return false; } finally { clearTimeout(t); }
}

export class MapView {
  /** opts: container, config (/api/explore/geo/config), theme colors, onSelect(id|null, additive), onCellSelect(ids, additive, cell), symbolUrl(key) */
  constructor(ml, opts) {
    Object.assign(this, { ml, ...opts });
    this.nodes = []; this.links = []; this.idx = new Map(); this.linkIdx = new Map();
    this.grid = { kind: 'none', resolution: GRID_RES.h3.default }; this.heat = null; this.heatOn = false; this.gridResult = null;
    this.hl = { selected: new Set(), nodes: new Set(), links: new Set(), any: false };
    this.images = new Set(); this.pendingImages = new Map(); this.basemap = null; this.ready = null; this.showLinks = true;
    this.metrics = { setDataMs: [], gridMs: 0, symbols: 0 };
  }
  async init(mode = this.config.basemap || 'auto') {
    const style = await this.styleFor(mode);
    this.map = new this.ml.Map({ container: this.container, style, center: [0, 20], zoom: 1.3, attributionControl: { compact: false }, preserveDrawingBuffer: true, fadeDuration: 0, renderWorldCopies: true });
    this.map.addControl(new this.ml.NavigationControl({ showCompass: true }), 'top-right');
    this.map.addControl(new this.ml.ScaleControl({ unit: 'metric' }), 'bottom-left');
    this.map.on('styleimagemissing', e => (String(e.id).startsWith('cnt:') ? this.countImage(e.id) : this.loadImage(e.id)));
    this.bindEvents();
    this.ready = new Promise(r => this.map.once('load', r)).then(() => this.addOverlays());
    await this.ready;
    return this;
  }
  async styleFor(mode) {
    const c = this.config;
    if (mode === 'offline') { this.basemap = 'offline'; return offlineStyle(c, this.colors); }
    if (c.tileUrl) { this.basemap = 'raster'; return rasterStyle(c); }
    if (mode === 'auto' && !(await reachable(c.styleUrl, c.fallbackMs || 6000))) { this.basemap = 'offline'; this.fellBack = true; return offlineStyle(c, this.colors); }
    this.basemap = 'online'; return c.styleUrl;
  }
  async setBasemap(mode) {
    const style = await this.styleFor(mode);
    await new Promise(r => { this.map.once('style.load', r); this.map.setStyle(style, { diff: false }); });
    this.images.clear(); this.addOverlays();
  }
  addOverlays() {
    const m = this.map, C = this.colors;
    for (const id of ['sg-grid', 'sg-links', 'sg-nodes']) if (!m.getSource(id)) m.addSource(id, { type: 'geojson', data: empty() });
    const heatColor = v => ['interpolate', ['linear'], ['get', v], 0, C.grid0, 0.5, C.grid1, 1, C.grid2];
    m.addLayer({ id: 'sg-grid-fill', type: 'fill', source: 'sg-grid', paint: { 'fill-color': heatColor('norm'), 'fill-opacity': ['case', ['boolean', ['feature-state', 'sel'], false], 0.85, 0.6] } });
    m.addLayer({ id: 'sg-grid-line', type: 'line', source: 'sg-grid', paint: { 'line-color': ['case', ['boolean', ['feature-state', 'sel'], false], C.select, C.gridLine], 'line-width': ['case', ['boolean', ['feature-state', 'sel'], false], 2.5, 0.7] } });
    const lineOpacity = ['case', ['boolean', ['feature-state', 'hl'], false], 1, 0.55];
    m.addLayer({ id: 'sg-links', type: 'line', source: 'sg-links', filter: ['!', ['get', 'dashed']], layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['*', ['get', 'width'], ['case', ['boolean', ['feature-state', 'hl'], false], 2, 1]], 'line-opacity': lineOpacity } });
    m.addLayer({ id: 'sg-links-dashed', type: 'line', source: 'sg-links', filter: ['get', 'dashed'], paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': lineOpacity, 'line-dasharray': [3, 2] } });
    m.addLayer({ id: 'sg-nodes-halo', type: 'circle', source: 'sg-nodes', paint: { 'circle-radius': ['+', ['get', 'r'], 4], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': C.select, 'circle-stroke-width': 3, 'circle-stroke-opacity': ['case', ['boolean', ['feature-state', 'sel'], false], 1, 0] } });
    m.addLayer({ id: 'sg-nodes', type: 'circle', source: 'sg-nodes', filter: ['!', ['has', 'sym']], paint: { 'circle-radius': ['get', 'r'], 'circle-color': ['get', 'color'], 'circle-stroke-color': ['case', ['boolean', ['feature-state', 'sel'], false], C.select, ['get', 'border']], 'circle-stroke-width': ['case', ['boolean', ['feature-state', 'sel'], false], 3, 1] } });
    m.addLayer({ id: 'sg-nodes-sym', type: 'symbol', source: 'sg-nodes', filter: ['has', 'sym'], layout: { 'icon-image': ['get', 'sym'], 'icon-size': ['/', ['get', 'r'], 20], 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
    // point clustering (SPEC §24.3): MapLibre's built-in GeoJSON clustering (supercluster inside maplibre-gl, ISC). A second source
    // carries the same points with a selected flag, summed per cluster, so a cluster that holds selected nodes gets a ring.
    if (!m.getSource('sg-cl')) m.addSource('sg-cl', { type: 'geojson', data: empty(), cluster: true, clusterRadius: this.clusterRadius || 50, clusterMaxZoom: 14, clusterProperties: { sel: ['+', ['get', 's']] } });
    const vis = on => ({ visibility: on ? 'visible' : 'none' }), on = !!this.clusterOn;
    m.addLayer({ id: 'sg-cl-circle', type: 'circle', source: 'sg-cl', filter: ['has', 'point_count'], layout: vis(on), paint: { 'circle-color': ['step', ['get', 'point_count'], C.cl1 || '#4f8cff', 50, C.cl2 || '#7a5cff', 500, C.cl3 || '#e5484d'], 'circle-opacity': 0.82,
      'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 50, 23, 200, 28, 1000, 34, 10000, 42], 'circle-stroke-color': ['case', ['>', ['get', 'sel'], 0], C.select, 'rgba(255,255,255,0.85)'], 'circle-stroke-width': ['case', ['>', ['get', 'sel'], 0], 4, 1.5] } });
    m.addLayer({ id: 'sg-cl-count', type: 'symbol', source: 'sg-cl', filter: ['has', 'point_count'], layout: { ...vis(on), 'icon-image': ['concat', 'cnt:', ['get', 'point_count_abbreviated']], 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
    m.addLayer({ id: 'sg-cl-point', type: 'circle', source: 'sg-cl', filter: ['!', ['has', 'point_count']], layout: vis(on), paint: { 'circle-radius': ['get', 'r'], 'circle-color': ['get', 'color'], 'circle-stroke-color': ['case', ['==', ['get', 's'], 1], C.select, ['get', 'border']], 'circle-stroke-width': ['case', ['==', ['get', 's'], 1], 3, 1] } });
    this.flush(); this.applyHighlight(); this.applyDim(); this.applyClusterVisibility();
  }
  /** Turn point clustering on or off (graph selection stays coordinated: clusters holding selected nodes are ringed). */
  setClustering(on, { radius } = {}) {
    this.clusterOn = !!on; if (radius && radius !== this.clusterRadius) { this.clusterRadius = radius; }
    this.applyClusterVisibility(); this.flushClusters();
  }
  applyClusterVisibility() {
    const m = this.map; if (!m?.getLayer('sg-cl-circle')) return; const on = !!this.clusterOn;
    if (m.boxZoom) on ? m.boxZoom.disable() : m.boxZoom.enable(); // Shift-click on a cluster selects it; MapLibre's Shift-drag box zoom would swallow that click
    for (const l of ['sg-cl-circle', 'sg-cl-count', 'sg-cl-point']) m.setLayoutProperty(l, 'visibility', on ? 'visible' : 'none');
    for (const l of ['sg-nodes', 'sg-nodes-sym', 'sg-nodes-halo']) m.setLayoutProperty(l, 'visibility', on ? 'none' : 'visible');
  }
  flushClusters() {
    const m = this.map, src = m?.getSource('sg-cl'); if (!src) return;
    if (!this.clusterOn) { src.setData(empty()); return; }
    const sel = this.hl.selected, wrongSel = !!this.uiWrong; // SCALE_UI_IMPL=wrong (UW3): clusters ignore the graph selection
    src.setData({ type: 'FeatureCollection', features: this.nodes.map((n, i) => ({ type: 'Feature', id: i, geometry: { type: 'Point', coordinates: [n.lon, n.lat] }, properties: { id: n.id, label: n.label, color: n.color, border: n.border || n.color, r: n.size, s: !wrongSel && sel.has(n.id) ? 1 : 0 } })) });
  }
  /** Rendered clusters (for tests and the status line): [{ id, count, sel, lon, lat }] */
  renderedClusters() { const m = this.map; if (!m?.getLayer('sg-cl-circle') || !this.clusterOn) return []; return m.queryRenderedFeatures({ layers: ['sg-cl-circle'] }).map(f => ({ id: f.properties.cluster_id, count: f.properties.point_count, sel: f.properties.sel, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] })); }
  async clusterLeaves(clusterId) { return (await this.map.getSource('sg-cl').getClusterLeaves(clusterId, Infinity, 0)).map(f => f.properties.id); }
  countImage(id) { // 'cnt:<abbrev>' -> white text drawn on a canvas (the offline basemap has no glyphs, so no text layers)
    const t = id.slice(4), c = document.createElement('canvas'), k = 2, w = Math.max(28, t.length * 9 + 10) * k, h = 22 * k; c.width = w; c.height = h;
    const g = c.getContext('2d'); g.font = `bold ${13 * k}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(t, w / 2, h / 2 + k);
    if (!this.map.hasImage(id)) this.map.addImage(id, g.getImageData(0, 0, w, h), { pixelRatio: k });
  }
  bindEvents() {
    const m = this.map, add = e => !!(e.originalEvent?.shiftKey || e.originalEvent?.metaKey || e.originalEvent?.ctrlKey);
    m.on('click', async e => {
      if (this.clusterOn && m.getLayer('sg-cl-circle')) { // clusters: click zooms in until it splits; Shift-click selects every point inside
        const c = m.queryRenderedFeatures(e.point, { layers: ['sg-cl-circle'] })[0];
        if (c) { const id = c.properties.cluster_id, src = m.getSource('sg-cl');
          if (add(e)) { const ids = await this.clusterLeaves(id); return this.onCellSelect(ids, false, { kind: 'cluster', cell: `#${id}`, count: ids.length }); }
          const z = await src.getClusterExpansionZoom(id); this.lastExpansion = { id, zoom: z }; return m.easeTo({ center: c.geometry.coordinates, zoom: z + 0.01, duration: 400 }); }
        const p = m.queryRenderedFeatures(e.point, { layers: ['sg-cl-point'] })[0];
        if (p) return this.onSelect(p.properties.id, add(e));
      }
      const hit = m.queryRenderedFeatures(e.point, { layers: ['sg-nodes', 'sg-nodes-sym'].filter(l => m.getLayer(l)) }).find(f => this.showPoints !== false || m.getFeatureState({ source: 'sg-nodes', id: f.id }).hl); // hidden points are not clickable
      if (hit) return this.onSelect(hit.properties.id, add(e));
      const cell = this.grid.kind !== 'none' && m.getLayer('sg-grid-fill') ? m.queryRenderedFeatures(e.point, { layers: ['sg-grid-fill'] })[0] : null;
      if (cell) return this.selectCell(cell.properties.cell, add(e));
      this.onSelect(null, false);
    });
    for (const l of ['sg-nodes', 'sg-nodes-sym', 'sg-cl-point', 'sg-cl-circle']) {
      m.on('mouseenter', l, e => { m.getCanvas().style.cursor = 'pointer'; const f = e.features?.[0]; if (f) this.tip(e.lngLat, f.properties.point_count ? `${f.properties.point_count} nodes${f.properties.sel ? ` (${f.properties.sel} selected)` : ''} · click to zoom, Shift-click to select` : f.properties.label); });
      m.on('mouseleave', l, () => { m.getCanvas().style.cursor = ''; this.popup?.remove(); });
    }
    m.on('moveend', () => this.onMove?.());
  }
  tip(lngLat, text) { this.popup ||= new this.ml.Popup({ closeButton: false, closeOnClick: false, className: 'sg-popup', offset: 10 }); this.popup.setLngLat(lngLat).setText(text).addTo(this.map); }
  selectCell(cell, additive) {
    const c = this.gridResult?.cells.find(x => x.cell === cell); if (!c) return;
    this.selectedCell = cell; this.paintCellSel(); this.onCellSelect(c.ids, additive, { kind: this.grid.kind, cell, count: c.count });
  }
  paintCellSel() {
    const src = this.map.getSource('sg-grid'); if (!src || !this.gridResult) return;
    this.map.removeFeatureState({ source: 'sg-grid' });
    const i = this.gridResult.cells.findIndex(x => x.cell === this.selectedCell); if (i >= 0) this.map.setFeatureState({ source: 'sg-grid', id: i }, { sel: true });
  }
  // ---------------------------------------------------------------- data
  /** nodes: [{ id, lat, lon, color, border, size, sym, label }] (visible only); links: [{ id, a, b, color, width, dashed }] */
  setData(nodes, links) { this.nodes = nodes; this.links = links; this.flush(); }
  flush() {
    const m = this.map; if (!m?.getSource('sg-nodes')) return;
    const t0 = performance.now();
    this.idx = new Map(); this.linkIdx = new Map();
    const nf = this.nodes.map((n, i) => { this.idx.set(n.id, i); if (n.sym) this.loadImage(n.sym);
      return { type: 'Feature', id: i, geometry: { type: 'Point', coordinates: [n.lon, n.lat] }, properties: { id: n.id, label: n.label, color: n.color, border: n.border || n.color, r: n.size, ...(n.sym ? { sym: n.sym } : {}) } }; });
    const lf = this.showLinks ? this.links.map((l, i) => { this.linkIdx.set(l.id, i); return { type: 'Feature', id: i, geometry: { type: 'LineString', coordinates: arc(l.a, l.b, { steps: l.steps || 24 }) }, properties: { id: l.id, color: l.color, width: l.width, dashed: !!l.dashed } }; }) : [];
    m.getSource('sg-nodes').setData({ type: 'FeatureCollection', features: nf });
    m.getSource('sg-links').setData({ type: 'FeatureCollection', features: lf });
    this.flushClusters();
    this.recomputeGrid();
    this.metrics.setDataMs.push(performance.now() - t0); if (this.metrics.setDataMs.length > 50) this.metrics.setDataMs.shift();
    this.applyHighlight();
  }
  setGrid({ kind = this.grid.kind, resolution = this.grid.resolution } = {}) {
    this.grid = { kind, resolution: kind === 'none' ? resolution : clampRes(kind, resolution) }; this.selectedCell = null; this.recomputeGrid();
  }
  setHeat(heat, on = this.heatOn) { this.heat = heat; this.heatOn = on; this.recomputeGrid(); }
  recomputeGrid() {
    const src = this.map?.getSource('sg-grid'); if (!src) return;
    if (this.grid.kind === 'none') { this.gridResult = null; src.setData(empty()); return; }
    const t0 = performance.now();
    const heat = this.heatOn && this.heat && this.heat.kind === this.grid.kind && this.heat.resolution === this.grid.resolution ? this.heat.counts : null;
    const r = this.gridResult = aggregate(this.nodes, { kind: this.grid.kind, resolution: this.grid.resolution });
    // heat mode: also draw stream-only cells (events whose nodes are not on the map), coloured by the stream count
    const cells = heat ? [...r.cells, ...Object.keys(heat).filter(c => !r.cells.some(x => x.cell === c)).map(c => ({ cell: c, count: 0, ids: [] }))] : r.cells;
    if (heat) r.cells = cells;
    src.setData(gridGeoJSON(this.grid.kind, cells, { heat }));
    this.map.setPaintProperty('sg-grid-fill', 'fill-color', ['interpolate', ['linear'], ['get', heat ? 'heatNorm' : 'norm'], 0, heat ? this.colors.heat0 : this.colors.grid0, 0.5, heat ? this.colors.heat1 : this.colors.grid1, 1, heat ? this.colors.heat2 : this.colors.grid2]);
    this.paintCellSel(); this.metrics.gridMs = performance.now() - t0;
  }
  loadImage(key) {
    if (!key || this.images.has(key) || this.pendingImages.has(key) || !this.map) return;
    const url = this.symbolUrl?.(key); if (!url) return; // not composed yet: main.js calls refreshSymbols() when it is
    const p = new Promise(res => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = url; }).then(img => {
      this.pendingImages.delete(key); if (!img || this.map.hasImage(key)) return;
      this.map.addImage(key, img, { pixelRatio: 2 }); this.images.add(key); this.metrics.symbols++;
    });
    this.pendingImages.set(key, p);
  }
  refreshSymbols() { for (const n of this.nodes) if (n.sym) this.loadImage(n.sym); }
  // ---------------------------------------------------------------- highlight (synced with the graph view)
  setPoints(on) { this.showPoints = on; this.applyDim(); }
  setHighlight(hl) { const selChanged = this.clusterOn && (hl.selected.size !== this.hl.selected.size || [...hl.selected].some(id => !this.hl.selected.has(id))); this.hl = hl; this.applyHighlight(); if (selChanged) this.flushClusters(); }
  applyHighlight() {
    const m = this.map; if (!m?.getSource('sg-nodes')) return;
    m.removeFeatureState({ source: 'sg-nodes' }); m.removeFeatureState({ source: 'sg-links' });
    for (const id of this.hl.nodes) { const i = this.idx.get(id); if (i != null) m.setFeatureState({ source: 'sg-nodes', id: i }, { hl: true }); }
    for (const id of this.hl.selected) { const i = this.idx.get(id); if (i != null) m.setFeatureState({ source: 'sg-nodes', id: i }, { hl: true, sel: true }); }
    for (const id of this.hl.links) { const i = this.linkIdx.get(id); if (i != null) m.setFeatureState({ source: 'sg-links', id: i }, { hl: true }); }
    this.applyDim();
  }
  applyDim() {
    const m = this.map; if (!m?.getLayer('sg-nodes')) return; const any = this.hl.any, base = this.showPoints === false ? 0 : 1;
    const op = any ? ['case', ['boolean', ['feature-state', 'hl'], false], 1, base * 0.22] : base === 1 ? 1 : ['case', ['boolean', ['feature-state', 'hl'], false], 1, 0];
    m.setPaintProperty('sg-nodes', 'circle-opacity', op); m.setPaintProperty('sg-nodes', 'circle-stroke-opacity', op); m.setPaintProperty('sg-nodes-sym', 'icon-opacity', op);
    const lo = any ? ['case', ['boolean', ['feature-state', 'hl'], false], 1, 0.12] : 0.55;
    m.setPaintProperty('sg-links', 'line-opacity', lo); m.setPaintProperty('sg-links-dashed', 'line-opacity', lo);
  }
  // ---------------------------------------------------------------- camera
  getCamera() { const c = this.map.getCenter(); return { center: [+c.lng.toFixed(6), +c.lat.toFixed(6)], zoom: +this.map.getZoom().toFixed(3), bearing: +this.map.getBearing().toFixed(2), pitch: +this.map.getPitch().toFixed(2) }; }
  setCamera(cam, animate = false) { if (!cam) return; const o = { center: cam.center, zoom: cam.zoom, bearing: cam.bearing || 0, pitch: cam.pitch || 0 }; if (animate) this.map.easeTo({ ...o, duration: 450 }); else this.map.jumpTo(o); }
  fitTo(points, animate = false) {
    if (!points.length) return;
    let w = 180, s = 90, e = -180, n = -90; for (const p of points) { w = Math.min(w, p.lon); e = Math.max(e, p.lon); s = Math.min(s, p.lat); n = Math.max(n, p.lat); }
    if (w === e && s === n) return this.setCamera({ center: [w, s], zoom: 8 }, animate);
    this.map.fitBounds([[w, s], [e, n]], { padding: 50, duration: animate ? 450 : 0, maxZoom: 12 });
  }
  project(lon, lat) { const p = this.map.project([lon, lat]); return [p.x, p.y]; }
  resize() { this.map?.resize(); }
  stats() { return { basemap: this.basemap, fellBack: !!this.fellBack, points: this.nodes.length, links: this.showLinks ? this.links.length : 0, cells: this.gridResult?.cells.length || 0, grid: this.grid, symbols: this.images.size, setDataMs: this.metrics.setDataMs.at(-1) ?? null, gridMs: this.metrics.gridMs, layers: LAYERS.filter(l => this.map.getLayer(l)) }; }
}
export async function createMap(opts) { const ml = await loadMapLibre(); return new MapView(ml, opts).init(opts.basemap); }
