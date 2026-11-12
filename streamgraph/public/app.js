const $ = s => document.querySelector(s), NS = 'http://www.w3.org/2000/svg';
let flow, kinds, sel = null, selLink = null, st = { steps: {} }, drag = null, wire = null;
const W = 132, H = 56;
const api = (p, body, method) => fetch(p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) }).then(r => r.json());
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent?.appendChild(e); return e; };

function autoLayout() { // layered: longest path from sources, then order by parent barycenter
  const layer = {}, ins = {}; flow.steps.forEach(s => { layer[s.id] = 0; ins[s.id] = []; });
  flow.links.forEach(l => ins[l.to]?.push(l.from));
  for (let k = 0; k < flow.steps.length; k++) flow.links.forEach(l => { if (layer[l.to] < layer[l.from] + 1) layer[l.to] = layer[l.from] + 1; });
  const sinks = flow.steps.filter(s => kinds[s.type] === 'sink'), maxL = Math.max(...Object.values(layer));
  sinks.forEach(s => layer[s.id] = maxL);
  flow.steps.filter(s => kinds[s.type] === 'source').forEach(s => { const t = flow.links.filter(l => l.from === s.id).map(l => layer[l.to]); if (t.length) layer[s.id] = Math.min(...t) - 1; });
  const minL = Math.min(...Object.values(layer)); for (const k in layer) layer[k] -= minL;
  const cols = {}; flow.steps.forEach(s => (cols[layer[s.id]] ??= []).push(s));
  const y = {};
  Object.keys(cols).sort((a, b) => a - b).forEach(L => {
    cols[L].sort((a, b) => { const bc = s => ins[s.id].length ? ins[s.id].reduce((t, p) => t + (y[p] ?? 0), 0) / ins[s.id].length : 1e9; return bc(a) - bc(b); });
    cols[L].forEach((s, i) => { s.x = 20 + L * (W + 30); s.y = 20 + i * (H + 10); y[s.id] = i; });
  });
  draw();
}

function draw() {
  const svg = $('#flow'); svg.innerHTML = '';
  const d = el('defs', {}, svg), m = el('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, d); el('path', { d: 'M0,0L10,5L0,10z', fill: '#8a94a6' }, m);
  const byId = Object.fromEntries(flow.steps.map(s => [s.id, s]));
  let maxX = 0, maxY = 0;
  flow.links.forEach((l, i) => {
    const a = byId[l.from], b = byId[l.to]; if (!a || !b) return;
    const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = (x1 + x2) / 2;
    const dd = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
    el('path', { d: dd, class: 'link' + (selLink === i ? ' sel' : '') }, svg);
    el('path', { d: dd, class: 'hit' }, svg).onclick = () => { selLink = i; sel = null; draw(); };
  });
  for (const s of flow.steps) {
    const k = kinds[s.type], g = el('g', { class: `step ${k}${sel === s.id ? ' sel' : ''}`, transform: `translate(${s.x},${s.y})` }, svg);
    el('rect', { width: W, height: H }, g);
    el('text', { x: 8, y: 16, class: 't' }, g).textContent = s.id;
    el('text', { x: 8, y: 31, fill: '#5b6576' }, g).textContent = `${k} · ${s.type}`;
    const x = st.steps[s.id]; el('text', { x: 8, y: 47, fill: '#5b6576' }, g).textContent = x ? `in ${x.in} · out ${x.out}${x.dropped ? ' · drop ' + x.dropped : ''}${x.errors ? ' · err ' + x.errors : ''}` : '';
    if (k !== 'sink') el('circle', { cx: W, cy: H / 2, r: 5, class: 'port' }, g).onmousedown = e => { e.stopPropagation(); wire = { from: s.id }; };
    g.onmousedown = e => { drag = { s, dx: e.offsetX - s.x, dy: e.offsetY - s.y }; sel = s.id; selLink = null; inspect(); };
    g.onmouseup = () => { if (wire && wire.from !== s.id && k !== 'source') { flow.links.push({ from: wire.from, to: s.id }); wire = null; sync(); } };
    maxX = Math.max(maxX, s.x + W); maxY = Math.max(maxY, s.y + H);
  }
  svg.setAttribute('viewBox', `0 0 ${Math.max(maxX + 20, 600)} ${Math.max(maxY + 20, 250)}`);
}
$('#flow').onmousemove = e => { if (drag) { const pt = toSvg(e); drag.s.x = pt.x - W / 2; drag.s.y = pt.y - H / 2; draw(); } };
const toSvg = e => { const svg = $('#flow'), p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
document.onmouseup = () => { drag = null; wire = null; };
document.onkeydown = e => { if (e.key === 'Delete' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
  if (selLink != null) flow.links.splice(selLink, 1); else if (sel) { flow.steps = flow.steps.filter(s => s.id !== sel); flow.links = flow.links.filter(l => l.from !== sel && l.to !== sel); }
  sel = selLink = null; sync(); } };

const schemaTable = (title, s) => `<b>${title}</b><table>${Object.entries(s || {}).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('') || '<tr><td><i>none yet</i></td></tr>'}</table>`;
function inspect() {
  const s = flow.steps.find(x => x.id === sel); if (!s) { $('#insp').textContent = 'Nothing selected'; return; }
  const k = kinds[s.type], x = st.steps[s.id] || {};
  $('#insp').innerHTML = `<b>${s.id}</b> (${k}: ${s.type})<textarea id="cfg">${JSON.stringify(s.config, null, 2)}</textarea><div><button id="apply">Apply config</button></div>
   ${k !== 'source' ? schemaTable('Input schema', x.inSchema) : ''}${k !== 'sink' ? schemaTable('Output schema', x.outSchema) : ''}`;
  $('#apply').onclick = () => { try { s.config = JSON.parse($('#cfg').value); sync(); } catch (e) { alert(e.message); } };
}
async function sync() { const r = await api('/api/flow', flow, 'PUT'); $('#msgs').textContent = r.errors.length ? '⚠ ' + r.errors.join(' · ') : ''; draw(); }

$('#add').onclick = () => { const t = $('#addtype').value; let n = 1; while (flow.steps.some(s => s.id === `${t}_${n}`)) n++; flow.steps.push({ id: `${t}_${n}`, type: t, config: {}, x: 20, y: 300 }); sel = `${t}_${n}`; sync(); inspect(); };
$('#layout').onclick = autoLayout;
$('#validate').onclick = async () => { const r = await api('/api/validate', flow); $('#msgs').textContent = r.errors.length ? '⚠ ' + r.errors.join(' · ') : '✓ Flow is valid'; $('#msgs').style.color = r.errors.length ? '#b42318' : '#1f9d55'; };
$('#save').onclick = () => api('/api/flow?save=1', flow, 'PUT').then(() => $('#msgs').textContent = 'Saved');
$('#copy').onclick = async () => { const name = prompt('New flow name', flow.name + '-copy'); if (name) { const r = await api('/api/copy', { name }); $('#msgs').textContent = 'Copied to ' + r.saved; } };
$('#batch').onclick = () => api('/api/run', { mode: 'batch' }).then(r => r.errors && ($('#msgs').textContent = r.errors.join(' · ')));
$('#live').onclick = () => api('/api/run', { mode: 'continuous' }).then(r => r.errors && ($('#msgs').textContent = r.errors.join(' · ')));
$('#stop').onclick = () => api('/api/stop', {});

// schema viewer + graph preview
const COLORS = ['#3b7ddd', '#1f9d55', '#d48a00', '#9b51e0', '#d92d20', '#0e9aa7', '#6b7280'], color = {};
const col = l => color[l] ??= COLORS[Object.keys(color).length % COLORS.length];
const schemaCy = cytoscape({ container: $('#schemaGraph'), style: [
  { selector: 'node', style: { label: 'data(label)', 'background-color': 'data(c)', color: '#1d2430', 'font-size': 10, 'text-valign': 'bottom', width: 'data(s)', height: 'data(s)' } },
  { selector: 'edge', style: { label: 'data(label)', 'font-size': 8, 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', width: 1.5, 'line-color': '#9aa4b2', 'target-arrow-color': '#9aa4b2', 'text-rotation': 'autorotate', 'text-background-color': '#fff', 'text-background-opacity': 0.85 } }] });
const cy = cytoscape({ container: $('#cy'), style: [
  { selector: 'node', style: { label: 'data(label)', 'background-color': 'data(c)', 'font-size': 9, color: '#1d2430', 'text-valign': 'bottom', width: 22, height: 22 } },
  { selector: 'node.hl', style: { 'border-width': 3, 'border-color': '#d92d20' } },
  { selector: 'edge', style: { 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', width: 1, 'line-color': '#c0c7d1', 'target-arrow-color': '#c0c7d1', label: 'data(label)', 'font-size': 7, color: '#8a94a6' } }] });

let schemaKey = '', gVer = -1, gBusy = false, gN = 0;
function renderSchema(s) {
  $('#counts').textContent = `${st.counts.nodes} nodes · ${st.counts.edges} edges`;
  $('#schemaTree').innerHTML = `<div class="tree"><ul>${s.nodeTypes.map(n => `<li><b style="color:${col(n.label)}">${n.label}</b> (${n.count})<ul><li>${n.props.join(', ') || '—'}</li>${s.edgeTypes.filter(e => e.from.includes(n.label)).map(e => `<li>-[${e.type}]→ ${e.to.join('|')} (${e.count})</li>`).join('')}</ul></li>`).join('')}</ul></div>`;
  const key = JSON.stringify([s.nodeTypes.map(n => n.label), s.edgeTypes.map(e => [e.type, e.from, e.to])]);
  const els = [...s.nodeTypes.map(n => ({ data: { id: n.label, label: `${n.label} (${n.count})`, c: col(n.label), s: 14 + Math.min(26, Math.sqrt(n.count) * 5) } })),
    ...s.edgeTypes.flatMap(e => e.from.flatMap(f => e.to.map(t => ({ data: { id: `${f}-${e.type}-${t}`, source: f, target: t, label: `${e.type} (${e.count})` } }))))];
  if (key !== schemaKey) { schemaKey = key; schemaCy.elements().remove(); schemaCy.add(els); schemaCy.layout({ name: 'circle', padding: 30 }).run(); }
  else els.forEach(e => { const x = schemaCy.getElementById(e.data.id); x.data(e.data); });
}
async function refreshGraph() {
  if (gBusy || st.version === gVer) return; gBusy = true; gVer = st.version;
  const g = await api('/api/graph'); const want = new Set();
  cy.batch(() => {
    for (const n of g.nodes) { want.add(n.id); const lab = n.props.name || n.key; const ex = cy.getElementById(n.id); if (ex.length) ex.data({ label: lab }); else cy.add({ data: { id: n.id, label: lab, c: col(n.label) } }); }
    for (const e of g.edges) { want.add(e.id); if (!cy.getElementById(e.id).length) cy.add({ data: { id: e.id, source: e.from, target: e.to, label: e.type } }); }
    cy.elements().forEach(x => { if (!want.has(x.id())) cy.remove(x); });
  });
  if (cy.nodes().length !== gN) { gN = cy.nodes().length; cy.layout({ name: 'cose', animate: false, nodeRepulsion: () => 12000, idealEdgeLength: () => 50, gravity: 0.6, randomize: true, fit: true, padding: 20 }).run(); }
  gBusy = false;
}
$('#runq').onclick = async () => {
  const r = await api('/api/query', { pattern: $('#q').value || $('#q').placeholder }); cy.nodes().removeClass('hl');
  if (r.error) return $('#qout').textContent = r.error;
  r.rows.forEach(row => Object.values(row).forEach(v => v.label && cy.getElementById(v.id).addClass('hl')));
  $('#qout').textContent = `${r.rows.length} rows\n` + r.rows.slice(0, 15).map(row => Object.entries(row).map(([k, v]) => `${k}=${v.label ? v.label + ':' + v.key : v.type}`).join('  ')).join('\n');
};

(async () => {
  ({ flow, kinds } = await api('/api/flow'));
  $('#flowname').textContent = flow.name; $('#addtype').innerHTML = Object.keys(kinds).map(k => `<option>${k}</option>`).join('');
  autoLayout();
  const es = new EventSource('/api/events');
  es.addEventListener('state', e => { st = JSON.parse(e.data); $('#status').textContent = `${st.running ? '● live' : '○ stopped'} · v${st.version}${st.errors.length ? ' · ' + st.errors.at(-1) : ''}`; renderSchema(st.schema); draw(); if (sel) inspect(); refreshGraph(); });
})();
