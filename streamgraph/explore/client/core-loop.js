// Phase 1 core loop, browser side (SPEC §23): streamed neighbourhood expansion, expand/collapse by relationship type,
// paths panel with isolate/highlight, algorithm runs mapped to node size / colour (+ legend) / edge width with
// automatic recompute when the filter changes, lasso + box selection, bulk operations, context menus and shortcuts.
// main.js passes its state and helpers in through installCoreLoop(ctx); nothing here touches the server directly
// except through the /api/explore endpoints.
let X = null; // context from main.js
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const fmt = v => (typeof v !== 'number' ? String(v) : Math.abs(v) >= 1000 || Number.isInteger(v) ? v.toLocaleString() : Math.abs(v) >= 0.01 ? v.toFixed(3) : v.toExponential(2));
export const CATEGORICAL = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac', '#86bcb6', '#d37295'];
const OTHER = '#7d8590', NOVALUE = '#4a505c';
// perceptually ordered ramp (dark blue -> green -> yellow), interpolated in RGB
const RAMP = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
export function rampColor(t) {
  t = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0)); const x = t * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(x)), f = x - i;
  const c = RAMP[i].map((a, k) => Math.round(a + (RAMP[i + 1][k] - a) * f)); return `rgb(${c[0]},${c[1]},${c[2]})`;
}
export const SHORTCUTS = [
  ['E', 'Expand selection by one hop (streamed)'], ['Shift+E', 'Expand selection by two hops'], ['C', 'Collapse selection'],
  ['H / Delete', 'Hide selection'], ['Shift+H', 'Show everything hidden'], ['I', 'Isolate selection (set as filter)'], ['X', 'Clear isolate / path filter'],
  ['P', 'Pin or unpin selection'], ['N', 'Add neighbours to the selection'], ['F', 'Fit camera to selection (or everything)'],
  ['L', 'Lasso select (drag; Shift adds, Alt removes)'], ['B', 'Box select (drag; Shift adds, Alt removes)'], ['G', 'Find paths between the two selected nodes'],
  ['A', 'Run the chosen algorithm'], ['Ctrl+A', 'Select all visible'], ['Ctrl+Z', 'Undo'], ['/', 'Search'], ['Esc', 'Close menu / tool, then clear selection'],
  ['Right-click', 'Context menu on a node, link or the canvas'], ['?', 'Show this list'],
];

const SCL = () => window.__explore?.scale; // Phase 2 (SPEC §24): progress bar + cost confirmation
export function installCoreLoop(ctx) {
  X = ctx; const { S } = X;
  S.core = { config: ctx.config || null, scope: 'full', hops: 1, last: null, streaming: 0, tool: null, paths: null, isolate: null, isolateLinks: null, auto: true, sig: {}, timer: null, menu: null, runs: 0, pending: 0 };
  S.manualHidden = S.manualHidden || new Set();
  S.enc = { size: null, color: null, edge: null };
  bindPanel(); bindKeys(); bindLasso(); bindMenu();
}

// ---------------------------------------------------------------- streamed neighbourhood (§23.2)
const frameQueue = []; let frameScheduled = false;
function flushChunks() { frameScheduled = false; const items = frameQueue.splice(0); if (items.length) X.addItems(items); }
/** Expand `ids` by `hops` through the NDJSON stream; chunks are drawn as they arrive (batched per animation frame). */
export async function expandStream(ids, { hops = 1, linkTypes = null, direction = 'both', maxNodes = Number($('#expand-limit')?.value) || 500, chunkSize = 200, slowMs = 0, quiet = false } = {}) {
  const { S, graph } = X; if (!ids.length) return null;
  for (const id of ids) for (const k of [...S.collapsed.keys()]) if (k === id || (k.startsWith(id + '|') && (!linkTypes || linkTypes.some(t => k === `${id}|${t}`)))) S.collapsed.delete(k);
  X.applyVisibility();
  // cost before a big query (SPEC §24.5): 2+ hops are estimated first and over 5,000 nodes asks
  if (hops >= 2 && !quiet && SCL() && !(await SCL().confirmCost({ op: 'neighborhood', seeds: ids, hops, maxNodes }, `Expanding ${ids.length === 1 ? ids[0] : ids.length + ' nodes'} by ${hops} hops`))) return null;
  let estNodes = null; if (SCL()) X.api('/api/explore/cost', { op: 'neighborhood', seeds: ids, hops, maxNodes }).then(r => { estNodes = r.estNodes; }).catch(() => {});
  const prog = () => SCL()?.progress('expand', estNodes ? Math.min(0.99, st.nodes / Math.max(1, estNodes)) : null, `Loading neighbourhood: ${st.nodes.toLocaleString()}${estNodes ? ' of ~' + estNodes.toLocaleString() : ''} nodes`);
  const t0 = performance.now(), held = graph.order <= 5000 ? graph.nodes() : ids.filter(id => graph.hasNode(id));
  S.core.streaming++; document.body.dataset.streaming = '1';
  const st = { seeds: ids.length, hops, chunks: 0, nodes: 0, links: 0, firstChunkMs: null, ms: 0, truncated: false, newNodes: 0 };
  try {
    const res = await fetch(`/api/explore/session/${S.sessionId}/neighborhood`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seeds: ids, hops, linkTypes, direction, maxNodes, chunkSize, exclude: held, slowMs }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    const dec = new TextDecoder(); let buf = '';
    const before = graph.order;
    for await (const part of res.body) {
      buf += dec.decode(part, { stream: true }); let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue;
        const m = JSON.parse(line);
        if (m.type === 'chunk') { st.chunks++; st.nodes += m.nodes.length; st.links += m.links.length; prog(); if (st.firstChunkMs == null) st.firstChunkMs = performance.now() - t0; frameQueue.push(...m.nodes, ...m.links); if (!frameScheduled) { frameScheduled = true; requestAnimationFrame(flushChunks); } setStatus(st); }
        else if (m.type === 'end') { st.truncated = m.stats.truncated; st.server = m.stats; }
        else if (m.type === 'error') throw new Error(m.error);
      }
    }
    flushChunks();
    st.ms = performance.now() - t0; st.newNodes = graph.order - before;
    S.core.last = st; setStatus(st);
    if (!quiet) X.toast(`Expanded ${ids.length === 1 ? ids[0] : ids.length + ' nodes'} by ${hops} hop${hops > 1 ? 's' : ''}${linkTypes ? ` over ${linkTypes.join(', ')}` : ''}: ${st.newNodes} new nodes in ${st.chunks} chunks${st.truncated ? ` (capped at ${maxNodes}; raise "Expand limit")` : ''}`);
    return st;
  } catch (e) { X.toast('Expand failed: ' + e.message); return null; }
  finally { if (--S.core.streaming === 0) delete document.body.dataset.streaming; updateScopeBadge(); SCL()?.progress('expand', false); }
}
function setStatus(st) { X.setStatus('expand', `${st.nodes} nodes / ${st.links} links, ${st.chunks} chunks${st.firstChunkMs != null ? `, first ${Math.round(st.firstChunkMs)} ms` : ''}${st.ms ? `, ${Math.round(st.ms)} ms` : ''}${st.truncated ? ' (cap)' : ''}`); }
export function updateScopeBadge() {
  const { S, graph } = X, el = $('#scope-badge'); if (!el) return;
  const total = S.core.config?.counts?.nodes;
  el.hidden = S.core.scope !== 'focus';
  el.textContent = S.core.scope === 'focus' ? `focus: ${graph.order.toLocaleString()} of ${total != null ? total.toLocaleString() : '?'} nodes loaded` : '';
}
/** collapse neighbours of `id` reachable only through links of `linkType` (all types when null) */
export function collapseBy(ids, linkType = null) {
  const { S, graph } = X, r = X.renderer();
  S.undo.push({ kind: 'collapse', collapsed: new Map([...S.collapsed].map(([k, v]) => [k, new Set(v)])) });
  for (const id of ids) {
    if (!graph.hasNode(id)) continue;
    // candidates: neighbours through (linkType) links; keep pinned / selected ones. A candidate stays visible when it
    // still connects to something visible outside the collapsing group (fixed point), so leaf clusters fold together.
    const hide = new Set();
    graph.forEachEdge(id, (e, a, s, t) => { if (linkType && a.item.type !== linkType) return; const m = s === id ? t : s; if (m !== id && !S.pinned.has(m) && !S.selected.has(m) && !ids.includes(m) && !r.getNodeState(m).isHidden) hide.add(m); });
    for (let changed = true; changed;) {
      changed = false;
      for (const m of [...hide]) {
        let anchored = false;
        graph.forEachEdge(m, (e2, a2, s2, t2) => { if (anchored) return; const v = s2 === m ? t2 : s2; if (v === id) { if (linkType && a2.item.type !== linkType) anchored = true; return; } if (v === m || hide.has(v)) return; if (!r.getNodeState(v).isHidden) anchored = true; });
        if (anchored) { hide.delete(m); changed = true; }
      }
    }
    S.collapsed.set(linkType ? `${id}|${linkType}` : id, hide);
  }
  X.applyVisibility();
}

// ---------------------------------------------------------------- paths (§23.3)
export async function findPaths(from, to, { maxHops = Number($('#paths-hops')?.value) || 4, mode = $('#paths-mode')?.value || 'all', directed = !!$('#path-directed')?.checked, maxPaths = 50 } = {}) {
  const { S } = X;
  if (!from || !to) { const sel = [...S.selected]; if (sel.length !== 2) { X.toast('Select exactly two nodes (shift-click or lasso) to find paths'); return null; } [from, to] = sel; }
  const r = await X.api(`/api/explore/session/${S.sessionId}/paths`, { fromId: from, toId: to, maxHops, mode, directed, maxPaths });
  S.core.paths = r.found ? { ...r, from, to, idx: -1 } : null;
  if (!r.found) { S.pathIds = null; renderPaths(); X.applyHighlight(); X.toast(r.message || 'No path'); return r; }
  X.addItems(r.items);
  showPath(-1);
  X.toast(`${r.paths.length} path${r.paths.length > 1 ? 's' : ''} (shortest ${r.shortest.hops} hop${r.shortest.hops > 1 ? 's' : ''})${r.truncated ? `, capped at ${maxPaths}` : ''}`);
  if ($('#paths-isolate')?.checked) isolatePaths(true);
  return r;
}
export function showPath(idx) {
  const { S } = X, P = S.core.paths; if (!P) return;
  P.idx = idx; const list = idx < 0 ? P.paths : [P.paths[idx]];
  const nodeIds = [...new Set(list.flatMap(p => p.nodeIds))], linkIds = [...new Set(list.flatMap(p => p.linkIds))];
  S.pathIds = { nodeIds, linkIds }; S.selected.clear();
  if (S.core.isolate) isolatePaths(true);
  X.applyHighlight(); renderPaths();
}
export function isolatePaths(on) {
  const { S } = X; const P = S.core.paths;
  if (on && P) { const list = P.idx < 0 ? P.paths : [P.paths[P.idx]]; S.core.isolate = new Set(list.flatMap(p => p.nodeIds)); S.core.isolateLinks = new Set(list.flatMap(p => p.linkIds)); }
  else { S.core.isolate = null; S.core.isolateLinks = null; }
  if ($('#paths-isolate')) $('#paths-isolate').checked = !!S.core.isolate;
  X.applyVisibility();
}
function renderPaths() {
  const el = $('#paths-list'); if (!el) return; const P = X.S.core.paths;
  if (!P) { el.innerHTML = ''; return; }
  const lab = id => esc(X.graph.hasNode(id) ? X.label(id) : id);
  el.innerHTML = `<div class="path-item ${P.idx < 0 ? 'on' : ''}" data-i="-1">All ${P.paths.length} path${P.paths.length > 1 ? 's' : ''}${P.truncated ? ' (capped)' : ''}</div>` +
    P.paths.slice(0, 50).map((p, i) => `<div class="path-item ${P.idx === i ? 'on' : ''}" data-i="${i}"><b>${p.hops}</b> ${p.nodeIds.map(lab).join(' → ')}</div>`).join('');
}

// ---------------------------------------------------------------- algorithms + visual encoding (§23.5)
const PARAMS = { pagerank: [['alpha', 0.85], ['directed', true]], betweenness: [['samples', 256], ['exactMax', 2000]], louvain: [['resolution', 1], ['seed', 1]], leiden: [['resolution', 1], ['seed', 1]], shortest_path: [['source', ''], ['target', '']], jaccard: [['node', ''], ['k', 20]] };
function renderParams() {
  const a = $('#algo').value, ps = PARAMS[a] || [];
  $('#algo-params').innerHTML = ps.map(([k, d]) => typeof d === 'boolean' ? `<label class="small"><input type="checkbox" data-p="${k}" ${d ? 'checked' : ''}> ${k}</label>` : `<label class="small">${k} <input data-p="${k}" value="${esc(d)}" size="8"></label>`).join('');
  if (['shortest_path', 'jaccard'].includes(a)) { const sel = [...X.S.selected]; const f = $('#algo-params [data-p="source"], #algo-params [data-p="node"]'); if (f && sel[0]) f.value = sel[0]; const t = $('#algo-params [data-p="target"]'); if (t && sel[1]) t.value = sel[1]; }
}
function readParams() {
  const p = {}; for (const el of document.querySelectorAll('#algo-params [data-p]')) { const k = el.dataset.p; if (el.type === 'checkbox') p[k] = el.checked; else if (el.value !== '') p[k] = /^-?\d+(\.\d+)?$/.test(el.value) ? Number(el.value) : el.value; }
  return p;
}
/** the scope payload for the server (SPEC §23.5.2) */
export function scopePayload(kind) {
  const { S, graph } = X, r = X.renderer();
  if (kind === 'filter') return { kind: 'filter', hiddenTypes: [...S.hiddenTypes], hiddenLinkTypes: [...S.hiddenEdgeTypes], where: S.where };
  if (kind === 'visible') return { kind: 'ids', ids: graph.filterNodes(n => !r.getNodeState(n).isHidden), hiddenLinkTypes: [...S.hiddenEdgeTypes] };
  if (kind === 'selection') return { kind: 'ids', ids: [...S.selected], hiddenLinkTypes: [...S.hiddenEdgeTypes] };
  return { kind: 'all' };
}
/** Run an algorithm. channels: subset of ['size','color','edge'] to map the result to. */
export async function runAlgo(algo = $('#algo').value, { params = readParams(), scopeKind = $('#algo-scope').value, channels = null, ask = false } = {}) {
  const { S } = X;
  if (ask && SCL() && !(await SCL().confirmCost({ op: 'algo', algo, params, scope: scopePayload(scopeKind) }, algo))) return null; // SPEC §24.5
  S.core.pending++; document.body.dataset.algoBusy = '1';
  try {
    const scope = scopePayload(scopeKind);
    const t0 = performance.now(), r = await X.api('/api/explore/algo/run', { algo, params, scope });
    r.clientMs = performance.now() - t0; r.scopeKind = scopeKind; r.request = { algo, params, scopeKind };
    S.core.result = r; S.core.runs++;
    renderResult(r);
    for (const ch of channels || []) mapTo(ch, r);
    return r;
  } catch (e) { X.toast(`${algo} failed: ${e.message}`); return null; }
  finally { if (--S.core.pending === 0) delete document.body.dataset.algoBusy; }
}
function renderResult(r) {
  const el = $('#algo-result'); if (!el) return;
  const head = `<p class="small"><b>${esc(r.algo)}</b> on ${r.scope.nodes.toLocaleString()} nodes / ${r.scope.links.toLocaleString()} links (${esc(r.scopeKind)}) · ${Math.round(r.stats.ms)} ms server${r.approximate ? ` · sampled ${r.samples}` : ''}${r.cached ? ' · cached' : ''}</p>`;
  const extra = r.modularity != null ? `<p class="small">${r.count} communities · modularity ${r.modularity.toFixed(4)}</p>` : r.count != null ? `<p class="small">${r.count} components, largest ${r.sizes?.[0]}</p>` : r.path ? `<p class="small">distance ${r.distance} via ${r.path.length} nodes</p>` : '';
  const top = (r.top || []).slice(0, 8).map(t => `<div class="top-item" data-id="${esc(t.id)}"><span>${esc(X.graph.hasNode(t.id) ? X.label(t.id) : t.id)}</span><span class="muted">${fmt(t.value)}</span></div>`).join('');
  el.innerHTML = head + extra + top;
}
/** Map a result to one visual channel. Numeric -> linear scale; categorical -> palette (colour) or community size (size). */
export function mapTo(ch, r = X.S.core.result) {
  const { S } = X; if (!r) return X.toast('Run an algorithm first');
  if (r.level === 'link' && ch !== 'edge') return X.toast('This result is per link: map it to edge width');
  const values = new Map(Object.entries(r.values));
  let min = Infinity, max = -Infinity; for (const v of values.values()) { if (v < min) min = v; if (v > max) max = v; }
  const enc = { algo: r.algo, runId: r.runId, kind: r.kind, level: r.level, values, min, max, request: r.request, count: r.count };
  if (r.kind === 'categorical') { const sizes = new Map(); for (const v of values.values()) sizes.set(v, (sizes.get(v) || 0) + 1); enc.sizes = sizes; enc.maxSize = Math.max(1, ...sizes.values()); }
  S.enc[ch] = enc; S.core.sig[ch] = scopeSig(r.request.scopeKind);
  if (ch === 'edge') X.graph.forEachEdge(X.restyleEdge); else X.graph.forEachNode(X.restyleNode);
  X.renderer()?.refresh(); renderEncLegend();
  document.body.dataset.enc = Object.entries(S.enc).filter(([, v]) => v).map(([k, v]) => `${k}:${v.algo}`).join(',');
}
export function clearEncodings() { const { S } = X; S.enc = { size: null, color: null, edge: null }; X.restyleAll(); renderEncLegend(); delete document.body.dataset.enc; }
const tOf = (enc, v) => (enc.max > enc.min ? (v - enc.min) / (enc.max - enc.min) : 0.5);
export function encodeNode(id) {
  const { S, graph } = X; if (!S.enc || (!S.enc.size && !S.enc.color)) return;
  const a = graph.getNodeAttributes(id), patch = {};
  if (S.enc.size) { const e = S.enc.size, v = e.values.get(id); patch.size = v == null ? 3 : e.kind === 'categorical' ? 4 + 14 * Math.sqrt((e.sizes.get(v) || 1) / e.maxSize) : 4 + 16 * Math.sqrt(tOf(e, v)); patch.encSize = v ?? null; }
  if (S.enc.color) { const e = S.enc.color, v = e.values.get(id); const c = v == null ? NOVALUE : e.kind === 'categorical' ? (v < CATEGORICAL.length ? CATEGORICAL[v] : OTHER) : rampColor(tOf(e, v)); patch.color = c; patch.encColor = c; if (!a.symbol) patch.borderColor = c; else patch.borderColor = c; }
  graph.mergeNodeAttributes(id, patch);
}
export function encodeEdge(id) {
  const { S, graph } = X, e = S.enc?.edge; if (!e) return;
  let v; if (e.level === 'link') v = e.values.get(id); else { const [s, t] = graph.extremities(id), a = e.values.get(s), b = e.values.get(t); v = a == null || b == null ? null : (a + b) / 2; }
  graph.mergeEdgeAttributes(id, { size: v == null ? 0.4 : 0.6 + 6 * (e.kind === 'categorical' ? 1 : tOf(e, v)), encWeight: v ?? null });
}
export function renderEncLegend() {
  const { S } = X, el = $('#enc-legend'); if (!el) return;
  const parts = [];
  if (S.enc.color) {
    const e = S.enc.color;
    if (e.kind === 'categorical') { const order = [...e.sizes].sort((a, b) => a[0] - b[0]); const shown = order.slice(0, CATEGORICAL.length), rest = order.slice(CATEGORICAL.length).reduce((s, x) => s + x[1], 0);
      parts.push(`<div class="enc-h">Colour = ${esc(e.algo)} (${order.length} groups)</div>` + shown.map(([c, n]) => `<div class="enc-row" data-cat="${c}"><span class="sw" style="background:${CATEGORICAL[c]}"></span>#${c}<span class="muted">${n.toLocaleString()}</span></div>`).join('') + (rest ? `<div class="enc-row"><span class="sw" style="background:${OTHER}"></span>other<span class="muted">${rest.toLocaleString()}</span></div>` : ''));
    } else parts.push(`<div class="enc-h">Colour = ${esc(e.algo)}</div><div class="ramp" style="background:linear-gradient(90deg,${[0, 0.25, 0.5, 0.75, 1].map(rampColor).join(',')})"></div><div class="enc-row small"><span>${fmt(e.min)}</span><span>${fmt(e.max)}</span></div>`);
    parts.push(`<div class="enc-row small"><span class="sw" style="background:${NOVALUE}"></span>not in scope</div>`);
  }
  if (S.enc.size) { const e = S.enc.size; parts.push(`<div class="enc-h">Size = ${esc(e.algo)}</div><div class="enc-row small"><span>● ${fmt(e.kind === 'categorical' ? 1 : e.min)}</span><span style="font-size:18px">●</span><span>${fmt(e.kind === 'categorical' ? e.maxSize : e.max)}${e.kind === 'categorical' ? ' members' : ''}</span></div>`); }
  if (S.enc.edge) { const e = S.enc.edge; parts.push(`<div class="enc-h">Edge width = ${esc(e.algo)}${e.level === 'node' ? ' (mean of ends)' : ''}</div><div class="enc-row small"><span>${fmt(e.min)}</span><span>${fmt(e.max)}</span></div>`); }
  el.innerHTML = parts.join(''); el.hidden = !parts.length;
}
/** filter-change hook from applyVisibility(): re-run encodings whose scope depends on the filter / visible set */
function scopeSig(kind) {
  const { S, graph } = X;
  if (kind === 'filter') return JSON.stringify([[...S.hiddenTypes].sort(), [...S.hiddenEdgeTypes].sort(), S.where]);
  if (kind === 'visible') { const r = X.renderer(); let h = 0, n = 0; graph.forEachNode(id => { if (!r.getNodeState(id).isHidden) { n++; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; } }); return `${n}:${h}:${[...S.hiddenEdgeTypes].sort()}`; }
  return 'static';
}
export function onVisibilityChanged() {
  const { S } = X; if (!S.core?.auto || !S.enc) return;
  const stale = Object.entries(S.enc).filter(([ch, e]) => e && ['filter', 'visible'].includes(e.request.scopeKind) && scopeSig(e.request.scopeKind) !== S.core.sig[ch]);
  if (!stale.length) return;
  clearTimeout(S.core.timer);
  S.core.timer = setTimeout(async () => {
    const groups = new Map(); for (const [ch, e] of stale) { const k = JSON.stringify(e.request); if (!groups.has(k)) groups.set(k, { req: e.request, chs: [] }); groups.get(k).chs.push(ch); }
    for (const { req, chs } of groups.values()) await runAlgo(req.algo, { params: req.params, scopeKind: req.scopeKind, channels: chs });
    X.toast('Re-ran analysis for the new filter');
  }, 250);
}
export function detailsExtra(id) {
  const { S } = X, rows = [];
  for (const [ch, e] of Object.entries(S.enc || {})) if (e && e.level === 'node') { const v = e.values.get(id); rows.push(`<tr><th>${esc(e.algo)} (${ch})</th><td>${v == null ? '<span class="muted">not in scope</span>' : fmt(v)}</td></tr>`); }
  return rows.length ? `<table class="enc-values">${rows.join('')}</table>` : '';
}

// ---------------------------------------------------------------- selection tools: lasso / box (§23.7)
export function pointInPolygon(x, y, poly) {
  if (X?.S.core.config?.uiWrong) { const xs = poly.map(p => p[0]); return x >= Math.min(...xs) && x <= Math.max(...xs); } // CORE_UI_IMPL=wrong: ignores y
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; }
  return inside;
}
/** nodes (visible) whose viewport position falls inside `poly` (viewport px) */
export function nodesInPolygon(poly) {
  const { graph } = X, r = X.renderer(), out = [];
  graph.forEachNode(id => { if (r.getNodeState(id).isHidden) return; const d = r.getNodeDisplayData(id); if (!d) return; const p = r.framedGraphToViewport({ x: d.x, y: d.y }); if (pointInPolygon(p.x, p.y, poly)) out.push(id); });
  return out;
}
export function applySelection(ids, mode = 'replace') {
  const { S } = X;
  if (mode === 'replace') S.selected = new Set(ids); else if (mode === 'add') ids.forEach(id => S.selected.add(id)); else ids.forEach(id => S.selected.delete(id));
  S.pathIds = null; X.applyHighlight(); updateBulkbar();
}
export function setTool(tool) {
  const { S } = X; S.core.tool = S.core.tool === tool ? null : tool;
  const layer = $('#lasso-layer'); layer.hidden = !S.core.tool; document.body.dataset.tool = S.core.tool || '';
  for (const b of document.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === S.core.tool);
  if (S.core.tool) { const c = $('#canvas').getBoundingClientRect(); layer.width = c.width; layer.height = c.height; }
}
function bindLasso() {
  const layer = $('#lasso-layer'), g = layer.getContext('2d'); let pts = null, mode = 'replace';
  layer.addEventListener('pointerdown', e => { e.preventDefault(); layer.setPointerCapture(e.pointerId); const r = layer.getBoundingClientRect(); pts = [[e.clientX - r.left, e.clientY - r.top]]; mode = e.altKey ? 'remove' : e.shiftKey ? 'add' : 'replace'; });
  layer.addEventListener('pointermove', e => {
    if (!pts) return; const r = layer.getBoundingClientRect(), p = [e.clientX - r.left, e.clientY - r.top];
    if (X.S.core.tool === 'box') pts = [pts[0], p]; else pts.push(p);
    g.clearRect(0, 0, layer.width, layer.height); g.strokeStyle = X.S.style.colors.select || '#4c9aff'; g.fillStyle = 'rgba(76,154,255,0.12)'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath();
    const poly = X.S.core.tool === 'box' ? boxPoly(pts[0], pts[1]) : pts; poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.stroke();
  });
  layer.addEventListener('pointerup', () => {
    if (!pts) return; const poly = X.S.core.tool === 'box' ? boxPoly(pts[0], pts.at(-1)) : pts; pts = null;
    g.clearRect(0, 0, layer.width, layer.height);
    if (poly.length >= 3) { const ids = nodesInPolygon(poly); applySelection(ids, mode); X.toast(`${mode === 'remove' ? 'Removed' : 'Selected'} ${ids.length} node${ids.length === 1 ? '' : 's'}`); }
    setTool(null);
  });
}
const boxPoly = (a, b) => [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]];

// ---------------------------------------------------------------- bulk operations (§23.7)
export const bulk = {
  hide(ids = [...X.S.selected]) { const { S } = X; if (!ids.length) return; S.undo.push({ kind: 'hidden', hidden: new Set(S.manualHidden) }); ids.forEach(id => S.manualHidden.add(id)); S.selected.clear(); X.applyVisibility(); X.applyHighlight(); updateBulkbar(); X.toast(`Hid ${ids.length} (Shift+H shows them again)`); },
  unhideAll() { const { S } = X; const n = S.manualHidden.size; S.manualHidden.clear(); X.applyVisibility(); X.toast(`Showing ${n} hidden node${n === 1 ? '' : 's'} again`); },
  pin(ids = [...X.S.selected], on = null) { const { S } = X; const set = on ?? !ids.every(id => S.pinned.has(id)); ids.forEach(id => X.pin(id, set)); X.toast(`${set ? 'Pinned' : 'Unpinned'} ${ids.length}`); },
  isolate(ids = [...X.S.selected]) { const { S } = X; if (!ids.length) return; S.undo.push({ kind: 'neighborhood', neighborhood: S.neighborhood }); S.neighborhood = { ids, depth: 0 }; X.applyVisibility(); X.toast(`Filter: only the ${ids.length} selected node${ids.length === 1 ? '' : 's'} (X clears)`); },
  clearFilter() { const { S } = X; S.neighborhood = null; isolatePaths(false); X.applyVisibility(); },
  selectNeighbors() { const { S, graph } = X, r = X.renderer(); const add = new Set(); for (const id of S.selected) if (graph.hasNode(id)) graph.forEachNeighbor(id, n => { if (!r.getNodeState(n).isHidden) add.add(n); }); applySelection([...add], 'add'); },
  async analyze(ids = [...X.S.selected]) { if (!ids.length) return; $('#algo-scope').value = 'selection'; return runAlgo($('#algo').value, { scopeKind: 'selection', channels: [$('#algo').selectedOptions[0]?.dataset.kind === 'categorical' ? 'color' : 'size'] }); },
  async saveAsView(name = null, ids = [...X.S.selected]) {
    if (!ids.length) return null; name = name || prompt('Name for a view of the selection', `Selection of ${ids.length}`); if (!name) return null;
    const st = X.captureState(); st.selection = ids; st.filters = { ...st.filters, neighborhood: { ids, depth: 0 } }; st.camera = null; st.fit = 'selection';
    const r = await X.api('/api/explore/views', { name, description: `Saved from a selection of ${ids.length} nodes`, state: st });
    await X.refreshViews?.(); X.toast(`Saved view "${r.view.name}"`); return r.view;
  },
  async query(ids = [...X.S.selected]) {
    if (!ids.length) return; const hops = Number($('#q-hops').value) || 1, dir = $('#q-dir').value, types = [...$('#q-types').selectedOptions].map(o => o.value);
    return expandStream(ids, { hops, direction: dir, linkTypes: types.length ? types : null });
  },
};
export function updateBulkbar() {
  const { S } = X, bar = $('#bulkbar'); if (!bar) return; const n = [...S.selected].filter(id => X.graph.hasNode(id)).length;
  bar.hidden = n === 0; $('#bulk-count').textContent = `${n} selected`; $('#bulk-paths').hidden = n !== 2;
  const types = new Set(); X.graph.forEachEdge((e, a) => types.add(a.item.type)); const cur = [...$('#q-types').selectedOptions].map(o => o.value);
  const want = [...types].sort().join('\u0001'); if ($('#q-types').dataset.types !== want) { $('#q-types').dataset.types = want; $('#q-types').innerHTML = [...types].sort().map(t => `<option ${cur.includes(t) ? 'selected' : ''}>${esc(t)}</option>`).join(''); }
}

// ---------------------------------------------------------------- context menus (§23.7)
function bindMenu() {
  document.addEventListener('pointerdown', e => { if (X.S.core.menu && !e.target.closest('#ctx-menu')) closeMenu(); }, true);
  $('#canvas').addEventListener('contextmenu', e => e.preventDefault());
  $('#ctx-menu').addEventListener('click', e => { const it = e.target.closest('[data-act]'); if (!it || it.classList.contains('dis')) return; const fn = X.S.core.menu?.acts[it.dataset.act]; closeMenu(); fn?.(); });
}
export function closeMenu() { const m = $('#ctx-menu'); m.hidden = true; X.S.core.menu = null; }
function showMenu(x, y, title, items) {
  const m = $('#ctx-menu'), acts = {}; let k = 0;
  const html = items.map(it => { if (it === '-') return '<hr>'; if (it.head) return `<div class="mh">${esc(it.head)}</div>`; const a = `a${k++}`; acts[a] = it.run; return `<div class="mi ${it.disabled ? 'dis' : ''}" data-act="${a}" data-key="${esc(it.key || '')}">${esc(it.label)}${it.hint ? `<span class="muted">${esc(it.hint)}</span>` : ''}</div>`; }).join('');
  m.innerHTML = `<div class="mt">${esc(title)}</div>${html}`; m.hidden = false;
  const r = $('main').getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = `${Math.min(x, r.width - w - 4)}px`; m.style.top = `${Math.min(y, r.height - h - 4)}px`;
  X.S.core.menu = { acts, items };
  return m;
}
export async function nodeMenu(id, x, y) {
  const { S } = X; if (!S.selected.has(id)) { S.selected = new Set([id]); S.pathIds = null; X.applyHighlight(); updateBulkbar(); }
  const sel = [...S.selected], multi = sel.length > 1;
  const items = [
    { label: multi ? `Expand ${sel.length} selected` : 'Expand neighbours', key: 'expand', hint: 'E', run: () => expandStream(sel, { hops: 1 }) },
    { label: 'Expand 2 hops', key: 'expand2', hint: '⇧E', run: () => expandStream(sel, { hops: 2 }) },
    { head: 'Expand by relationship' }, { label: 'loading…', key: 'loading', disabled: true },
    { label: 'Collapse neighbours', key: 'collapse', hint: 'C', run: () => collapseBy(sel) },
    '-',
    { label: 'Select neighbours', key: 'neighbours', hint: 'N', run: () => bulk.selectNeighbors() },
    { label: S.pinned.has(id) ? 'Unpin' : 'Pin', key: 'pin', hint: 'P', run: () => bulk.pin(sel) },
    { label: 'Hide', key: 'hide', hint: 'H', run: () => bulk.hide(sel) },
    { label: 'Isolate (set as filter)', key: 'isolate', hint: 'I', run: () => bulk.isolate(sel) },
    ...(sel.length === 2 ? [{ label: 'Find paths between', key: 'paths', hint: 'G', run: () => findPaths(sel[0], sel[1]) }] : []),
    '-',
    { label: 'Hop distance from here', key: 'distance', run: () => runAlgo('shortest_path', { params: { source: id }, scopeKind: $('#algo-scope').value === 'selection' ? 'all' : $('#algo-scope').value, channels: ['color'] }) },
    { label: 'Similar nodes (Jaccard)', key: 'similar', run: async () => { const r = await runAlgo('jaccard', { params: { node: id, k: 20 }, scopeKind: 'all', channels: ['color'] }); if (r) { const ids = Object.keys(r.values); await expandStream([id, ...ids].slice(0, 21), { hops: 0, quiet: true }); applySelection(ids, 'replace'); } } },
    { label: 'Save selection as view…', key: 'saveview', run: () => bulk.saveAsView() },
  ];
  const m = showMenu(x, y, multi ? `${sel.length} nodes` : X.label(id), items);
  try {
    const s = await X.api(`/api/explore/session/${S.sessionId}/summary?id=${encodeURIComponent(id)}`);
    if (S.core.menu?.items !== items) return; // menu was closed or replaced
    const idx = items.findIndex(i => i.key === 'loading');
    const byType = s.linkTypes.flatMap(t => [{ label: `Expand ${t.type}`, key: `expand:${t.type}`, hint: `${t.total}${t.out && t.in ? ` (${t.out}→ ${t.in}←)` : t.out ? '→' : '←'}`, run: () => expandStream(sel, { hops: 1, linkTypes: [t.type] }) },
      { label: `Collapse ${t.type}`, key: `collapse:${t.type}`, run: () => collapseBy(sel, t.type) }]);
    items.splice(idx, 1, ...(byType.length ? byType : [{ label: 'no links', key: 'none', disabled: true }]));
    showMenu(parseFloat(m.style.left), parseFloat(m.style.top), multi ? `${sel.length} nodes` : X.label(id), items);
  } catch { /* summary unavailable: keep the generic menu */ }
}
export function edgeMenu(edge, x, y) {
  const { graph, S } = X, a = graph.getEdgeAttributes(edge), [s, t] = graph.extremities(edge);
  showMenu(x, y, `${a.item.type} link`, [
    { label: 'Select both ends', key: 'ends', run: () => applySelection([s, t], 'replace') },
    { label: 'Isolate both ends', key: 'isolate', run: () => bulk.isolate([s, t]) },
    { label: `Hide all ${a.item.type} links`, key: 'hidetype', run: () => { S.hiddenEdgeTypes.add(a.item.type); X.applyVisibility(); } },
    { label: `Expand ends over ${a.item.type}`, key: 'expandtype', run: () => expandStream([s, t], { hops: 1, linkTypes: [a.item.type] }) },
    { label: 'Show properties', key: 'props', run: () => { $('#details').innerHTML = `<h3>${esc(a.item.type)}</h3><p class="muted">${esc(edge)}<br>${esc(s)} → ${esc(t)}</p><table>${Object.entries(a.item.properties || {}).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</td></tr>`).join('')}</table>`; } },
  ]);
}
export function stageMenu(x, y) {
  const { S } = X;
  showMenu(x, y, 'Canvas', [
    { label: 'Fit everything', key: 'fit', hint: 'F', run: () => X.fitCamera(X.graph.filterNodes(n => !X.renderer().getNodeState(n).isHidden)) },
    { label: 'Select all visible', key: 'selectall', hint: 'Ctrl+A', run: () => X.selectAllVisible() },
    { label: 'Lasso select', key: 'lasso', hint: 'L', run: () => setTool('lasso') },
    { label: 'Box select', key: 'box', hint: 'B', run: () => setTool('box') },
    '-',
    { label: `Show hidden (${S.manualHidden.size})`, key: 'unhide', disabled: !S.manualHidden.size, run: () => bulk.unhideAll() },
    { label: 'Clear isolate / path filter', key: 'clearfilter', disabled: !S.neighborhood && !S.core.isolate, run: () => bulk.clearFilter() },
    { label: 'Clear analysis colours / sizes', key: 'clearenc', disabled: !S.enc.size && !S.enc.color && !S.enc.edge, run: () => clearEncodings() },
    { label: 'Relayout', key: 'relayout', run: () => X.runLayout({ full: true }) },
    { label: 'Keyboard shortcuts', key: 'help', hint: '?', run: () => $('#help-dialog').showModal() },
  ]);
}

// ---------------------------------------------------------------- panel wiring + keys
function bindPanel() {
  const defs = X.S.core.config?.algorithms;
  $('#algo').innerHTML = Object.entries(defs || {}).map(([k, d]) => `<option value="${k}" data-kind="${d.kind}" data-level="${d.level}">${esc(d.title.split(' (')[0])}</option>`).join('') || $('#algo').innerHTML;
  $('#algo').onchange = renderParams; renderParams();
  $('#algo-run').onclick = () => runAlgo(undefined, { ask: true });
  for (const ch of ['size', 'color', 'edge']) $(`#algo-map-${ch}`).onclick = async () => { if (!X.S.core.result || X.S.core.result.algo !== $('#algo').value || X.S.core.result.scopeKind !== $('#algo-scope').value) await runAlgo(); mapTo(ch); };
  $('#algo-clear').onclick = clearEncodings;
  $('#algo-auto').onchange = e => { X.S.core.auto = e.target.checked; };
  $('#algo-result').onclick = e => { const t = e.target.closest('[data-id]'); if (t && X.graph.hasNode(t.dataset.id)) { X.select(t.dataset.id); X.focusNode(t.dataset.id); } };
  $('#enc-legend').onclick = e => { const r = e.target.closest('[data-cat]'); if (!r || !X.S.enc.color) return; const c = Number(r.dataset.cat); applySelection([...X.S.enc.color.values].filter(([id, v]) => v === c && X.graph.hasNode(id)).map(([id]) => id), e.shiftKey ? 'add' : 'replace'); };
  $('#paths-find').onclick = () => findPaths();
  $('#paths-isolate').onchange = e => isolatePaths(e.target.checked);
  $('#paths-list').onclick = e => { const it = e.target.closest('[data-i]'); if (it) showPath(Number(it.dataset.i)); };
  for (const b of document.querySelectorAll('[data-tool]')) b.onclick = () => setTool(b.dataset.tool);
  const B = { 'bulk-expand': () => expandStream([...X.S.selected], { hops: 1 }), 'bulk-expand2': () => expandStream([...X.S.selected], { hops: 2 }), 'bulk-hide': () => bulk.hide(), 'bulk-pin': () => bulk.pin(), 'bulk-isolate': () => bulk.isolate(),
    'bulk-paths': () => findPaths(), 'bulk-analyze': () => bulk.analyze(), 'bulk-view': () => bulk.saveAsView(), 'bulk-query': () => bulk.query(), 'bulk-clear': () => X.clearSelection(), 'bulk-neighbours': () => bulk.selectNeighbors() };
  for (const [id, fn] of Object.entries(B)) $('#' + id).onclick = fn;
  $('#help-list').innerHTML = SHORTCUTS.map(([k, d]) => `<tr><th><kbd>${esc(k)}</kbd></th><td>${esc(d)}</td></tr>`).join('');
}
function bindKeys() {
  document.addEventListener('keydown', e => {
    const { S } = X;
    if (S.presenting || e.target.matches('input, textarea, select') || e.ctrlKey || e.metaKey) return;
    const sel = [...S.selected].filter(id => X.graph.hasNode(id)), k = e.key; let handled = true;
    if (k === 'Escape') { if (S.core.menu) { closeMenu(); e.stopImmediatePropagation(); } else if (S.core.tool) { setTool(null); e.stopImmediatePropagation(); } else handled = false; }
    else if (k === 'e' || k === 'E') { if (sel.length) expandStream(sel, { hops: e.shiftKey ? 2 : 1 }); }
    else if (k === 'c') { if (sel.length) collapseBy(sel); }
    else if (k === 'h' || k === 'Delete' || k === 'Backspace') bulk.hide(sel);
    else if (k === 'H') bulk.unhideAll();
    else if (k === 'i') bulk.isolate(sel);
    else if (k === 'x') bulk.clearFilter();
    else if (k === 'p') { if (sel.length) bulk.pin(sel); }
    else if (k === 'n') bulk.selectNeighbors();
    else if (k === 'f') X.fitCamera(sel.length ? sel : X.graph.filterNodes(n => !X.renderer().getNodeState(n).isHidden));
    else if (k === 'l') setTool('lasso');
    else if (k === 'b') setTool('box');
    else if (k === 'g') findPaths();
    else if (k === 'a') runAlgo(undefined, { ask: true });
    else if (k === '?') $('#help-dialog').open ? $('#help-dialog').close() : $('#help-dialog').showModal();
    else handled = false;
    if (handled) e.preventDefault();
  }, true); // capture: runs before main.js's Escape-clears-selection, so Esc closes a menu / tool first
}
