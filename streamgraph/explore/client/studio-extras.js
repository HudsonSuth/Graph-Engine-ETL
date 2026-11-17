// Studio additions to the graph explorer (Phase 3 + 4): table and chart linked to the graph, history compare, editing,
// comments, case notebooks, fixed-layout SVG/PNG export, query builder with Cypher, plain-English questions and captions,
// RDF, 3D mode, keyboard navigation, high contrast and text summaries. Everything goes through /api/explore/x/*, which the
// server filters with the same access rules as the rest of StreamGraph.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = t => new Date(t).toLocaleString();
async function api(path, body, method) {
  const r = await fetch(path, body === undefined && !method ? {} : { method: method || 'POST', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const ct = r.headers.get('content-type') || ''; const out = ct.includes('json') ? await r.json() : await r.text();
  if (!r.ok) throw new Error(out?.error || out || r.statusText); return out;
}
const say = t => { const l = $('#x-live'); l.textContent = ''; setTimeout(() => { l.textContent = t; }, 30); };
const note = (sel, t, bad) => { const e = $(sel); if (e) { e.textContent = t; e.style.color = bad ? 'var(--c-warn)' : ''; } };
const download = (name, blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };

const ready = () => new Promise(res => { const t = setInterval(() => { if (window.__explore?.renderer && window.__explore.graph) { clearInterval(t); res(window.__explore); } }, 50); });
const X = await ready();
const { graph, S } = X;
const visibleNodes = () => graph.filterNodes(n => { try { return !X.renderer.getNodeState(n).isHidden; } catch { return true; } });
const item = id => graph.hasNode(id) ? graph.getNodeAttribute(id, 'item') : (graph.hasEdge(id) ? graph.getEdgeAttribute(id, 'item') : null);
const label = id => item(id)?.label ?? id;
const selected = () => [...S.selected].filter(id => graph.hasNode(id) || graph.hasEdge(id));
const selectMany = ids => { S.selected = new Set(ids.filter(id => graph.hasNode(id))); S.pathIds = null; X.applyHighlight(); };
let me = null;
try { me = await api('/api/explore/x/me'); } catch {}
if (window.__sgAs?.()) $('#x-as').textContent = `Previewing as ${window.__sgAs()}`;
if (me && !me.canEdit) { for (const b of ['#x-add', '#x-connect', '#x-editprops', '#x-remove']) { $(b).disabled = true; $(b).title = 'Your access rules do not allow editing'; } note('#x-edit-msg', 'Your access rules do not allow editing.'); }

// ---------------------------------------------------------------- selection change hook (drives table/chart/comments)
const selListeners = []; let lastSel = '';
setInterval(() => { const k = [...S.selected].sort().join('|'); if (k !== lastSel) { lastSel = k; for (const f of selListeners) try { f(); } catch {} } }, 250);

// ---------------------------------------------------------------- menus: close others / close on outside click
for (const d of document.querySelectorAll('details.menu')) d.addEventListener('toggle', () => { if (d.open) for (const o of document.querySelectorAll('details.menu')) if (o !== d) o.open = false; });
document.addEventListener('click', e => { if (!e.target.closest('details.menu')) for (const d of document.querySelectorAll('details.menu')) d.open = false; });

// ---------------------------------------------------------------- bottom drawer
const drawer = $('#x-drawer'), body = $('#x-drawer-body'); let tab = null;
const TABS = { table: renderTable, chart: renderChart, history: renderHistory, query: renderQuery, notebook: renderNotebook };
function openTab(t) {
  if (tab === t && drawer.classList.contains('open')) { drawer.classList.remove('open'); tab = null; markTabs(); return; }
  tab = t; drawer.classList.add('open'); markTabs(); TABS[t]();
  X.renderer.refresh?.(); setTimeout(() => X.renderer.resize?.(), 30);
}
const markTabs = () => { for (const b of drawer.querySelectorAll('.dtabs button[data-d]')) { b.classList.toggle('on', b.dataset.d === tab); b.setAttribute('aria-selected', b.dataset.d === tab); } };
for (const b of drawer.querySelectorAll('.dtabs button[data-d]')) b.onclick = () => openTab(b.dataset.d);
$('#x-drawer-close').onclick = () => { drawer.classList.remove('open'); tab = null; markTabs(); };
selListeners.push(() => { if (tab === 'table') markTableSel(); if (tab === 'chart') renderChart(); });

// ---- Table
let tableType = '';
function renderTable() {
  const ids = visibleNodes(), types = [...new Set(ids.map(id => graph.getNodeAttribute(id, 'type')))].sort();
  if (tableType && !types.includes(tableType)) tableType = '';
  const rows = ids.filter(id => !tableType || graph.getNodeAttribute(id, 'type') === tableType).slice(0, 2000);
  const cols = []; for (const id of rows) for (const k of Object.keys(item(id)?.properties || {})) if (!cols.includes(k) && cols.length < 12) cols.push(k);
  body.innerHTML = `<div class="drow"><label class="small">Type <select id="x-t-type"><option value="">All types (${ids.length})</option>${types.map(t => `<option ${t === tableType ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
    <span class="muted small">Click a row to select it on the graph; Shift-click adds. Selected rows are highlighted.</span><span class="spacer"></span><button id="x-t-csv">Download CSV</button><button id="x-t-refresh">Refresh</button></div>
    <table><thead><tr><th>Name</th><th>Type</th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(id => { const it = item(id) || {}; return `<tr data-id="${esc(id)}"><td>${esc(it.label)}</td><td>${esc(it.type)}</td>${cols.map(c => `<td>${esc(it.properties?.[c])}</td>`).join('')}</tr>`; }).join('')}</tbody></table>${rows.length >= 2000 ? '<p class="muted small">First 2,000 rows.</p>' : ''}`;
  $('#x-t-type').onchange = e => { tableType = e.target.value; renderTable(); };
  $('#x-t-refresh').onclick = renderTable;
  $('#x-t-csv').onclick = () => { const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`; download('table.csv', new Blob([[['name', 'type', ...cols].map(q).join(','), ...rows.map(id => { const it = item(id) || {}; return [it.label, it.type, ...cols.map(c => it.properties?.[c])].map(q).join(','); })].join('\r\n')], { type: 'text/csv' })); };
  body.querySelector('tbody').onclick = e => { const tr = e.target.closest('tr[data-id]'); if (!tr) return; X.select(tr.dataset.id, e.shiftKey); if (!e.shiftKey) X.fitCamera?.([tr.dataset.id]); };
  markTableSel();
}
function markTableSel() { for (const tr of body.querySelectorAll('tr[data-id]')) tr.classList.toggle('sel', S.selected.has(tr.dataset.id)); const f = body.querySelector('tr.sel'); if (f && !f.dataset.seen) { f.scrollIntoView({ block: 'nearest' }); } }

// ---- Chart
let chartBy = 'type';
function renderChart() {
  const ids = visibleNodes(); const fields = new Set(); for (const id of ids.slice(0, 3000)) for (const k of Object.keys(item(id)?.properties || {})) fields.add(k);
  const val = id => chartBy === 'type' ? graph.getNodeAttribute(id, 'type') : (item(id)?.properties?.[chartBy] ?? '(empty)');
  const groups = new Map(); for (const id of ids) { const v = String(val(id)); if (!groups.has(v)) groups.set(v, []); groups.get(v).push(id); }
  const bars = [...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 20), max = Math.max(1, ...bars.map(b => b[1].length));
  const W = 760, bh = 20, H = bars.length * (bh + 4) + 10;
  body.innerHTML = `<div class="drow"><label class="small">Count by <select id="x-c-by"><option value="type">Type</option>${[...fields].sort().map(f => `<option ${f === chartBy ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label><span class="muted small">Click a bar to select those things on the graph. Bars holding selected things are dark.</span></div>
    <svg class="chart" width="${W}" height="${H}" role="img" aria-label="Bar chart of ${esc(chartBy)}">${bars.map(([k, list], i) => { const w = Math.max(2, (W - 260) * list.length / max), sel = list.some(id => S.selected.has(id)); return `<g data-k="${esc(k)}"><text x="0" y="${i * (bh + 4) + 15}">${esc(k.length > 28 ? k.slice(0, 27) + '…' : k)}</text><rect class="bar${sel ? ' sel' : ''}" x="200" y="${i * (bh + 4)}" width="${w}" height="${bh}" rx="3"><title>${esc(k)}: ${list.length}</title></rect><text x="${206 + w}" y="${i * (bh + 4) + 15}">${list.length}</text></g>`; }).join('')}</svg>`;
  $('#x-c-by').value = chartBy; $('#x-c-by').onchange = e => { chartBy = e.target.value; renderChart(); };
  for (const g of body.querySelectorAll('g[data-k]')) g.onclick = () => { const list = groups.get(g.dataset.k) || []; selectMany(list); X.fitCamera?.(list); say(`Selected ${list.length} with ${chartBy} ${g.dataset.k}.`); };
}

// ---- History compare
async function renderHistory() {
  body.innerHTML = '<p class="muted">Loading history…</p>';
  let tl; try { tl = await api('/api/explore/x/history/timeline'); } catch (e) { body.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
  if (!tl.events) { body.innerHTML = '<p class="muted">No history yet. Changes are recorded from now on.</p>'; return; }
  const max = Math.max(...tl.buckets.map(b => b.count)), W = 600;
  const toLocal = t => { const d = new Date(t - new Date(t).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 19); };
  body.innerHTML = `<div class="drow"><svg width="${W}" height="36" aria-label="Changes over time">${tl.buckets.map(b => `<rect x="${(b.at - tl.from) / Math.max(1, tl.to - tl.from + tl.bucketMs) * W}" y="${34 - 32 * b.count / max}" width="${Math.max(2, W / tl.buckets.length - 1)}" height="${32 * b.count / max}" fill="#93b4f5"><title>${fmtTime(b.at)}: ${b.count} changes</title></rect>`).join('')}</svg><span class="muted small">${tl.events} changes recorded, ${fmtTime(tl.from)} – ${fmtTime(tl.to)}</span></div>
   <div class="drow"><label class="small">From <input type="datetime-local" step="1" id="x-h-from" value="${toLocal(Math.round((tl.from + tl.to) / 2))}"></label><label class="small">To <input type="datetime-local" step="1" id="x-h-to" value="${toLocal(Date.now())}"></label>
   <button class="primary" id="x-h-go">Compare</button><button id="x-h-show" disabled title="Select the added and changed things that are on the graph">Select on graph</button><span id="x-h-sum" class="muted small" role="status"></span></div><div id="x-h-out"></div>`;
  let last = null;
  $('#x-h-go').onclick = async () => {
    const a = new Date($('#x-h-from').value).getTime(), b = new Date($('#x-h-to').value).getTime();
    try { last = await api(`/api/explore/x/history/compare?from=${a}&to=${b}`); } catch (e) { note('#x-h-sum', e.message, true); return; }
    const s = last.summary; note('#x-h-sum', `${s.added} added, ${s.removed} removed, ${s.changed} changed between the two times.`); say($('#x-h-sum').textContent);
    const li = (it, cls) => `<li class="${cls}" data-id="${esc(it.id)}">${esc(it.type)} <b>${esc(it.label)}</b></li>`;
    $('#x-h-out').innerHTML = `<div class="dcols"><div><h2>Added (${s.added})</h2><ul>${last.added.slice(0, 300).map(i => li(i, 'diff-add')).join('')}</ul></div>
      <div><h2>Removed (${s.removed})</h2><ul>${last.removed.slice(0, 300).map(i => li(i, 'diff-del')).join('')}</ul></div>
      <div><h2>Changed (${s.changed})</h2><ul>${last.changed.slice(0, 300).map(c => `<li class="diff-chg" data-id="${esc(c.after.id)}">${esc(c.after.type)} <b>${esc(c.after.label)}</b><br><span class="small">${c.fields.map(f => `${esc(f)}: <span class="diff-del">${esc(c.before.properties?.[f] ?? '—')}</span> → <span class="diff-add">${esc(c.after.properties?.[f] ?? '—')}</span>`).join('<br>')}</span></li>`).join('')}</ul></div></div>`;
    for (const l of $('#x-h-out').querySelectorAll('li[data-id]')) l.onclick = () => { if (graph.hasNode(l.dataset.id)) { X.select(l.dataset.id); X.fitCamera?.([l.dataset.id]); } else X.toast?.('Not on the graph right now (removed, or not loaded).'); };
    $('#x-h-show').disabled = false;
  };
  $('#x-h-show').onclick = () => { if (!last) return; const ids = [...last.added.map(i => i.id), ...last.changed.map(c => c.after.id)].filter(id => graph.hasNode(id)); selectMany(ids); say(`${ids.length} added or changed things selected.`); };
}

// ---- Query builder
let metaCache = null; const metaGet = async () => (metaCache ??= await api('/api/explore/x/meta'));
const OPS = ['=', '<>', 'CONTAINS', 'STARTS WITH', '>', '<', '>=', '<=', 'IS NOT NULL'];
let qState = { a: { type: '', where: [] }, rel: null, b: { type: '', where: [] }, limit: 100 };
async function renderQuery() {
  let m; try { m = await metaGet(); } catch (e) { body.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
  const linkTypes = [...new Set(graph.mapEdges((e, a) => a.type))].sort();
  const side = (k, s) => `<div class="drow"><b>${k === 'a' ? 'Find' : 'connected to'}</b><select data-s="${k}" class="x-q-type"><option value="">anything</option>${m.types.map(t => `<option ${t === s.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
    ${s.where.map((w, i) => `<span class="drow">where <select data-s="${k}" data-i="${i}" class="x-q-f">${['label', ...(m.fields[s.type] || [])].map(f => `<option ${f === w.field ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select><select data-s="${k}" data-i="${i}" class="x-q-op">${OPS.map(o => `<option ${o === w.op ? 'selected' : ''}>${o}</option>`).join('')}</select>${w.op === 'IS NOT NULL' ? '' : `<input data-s="${k}" data-i="${i}" class="x-q-v" value="${esc(w.value)}" size="12" aria-label="value">`}<button data-s="${k}" data-i="${i}" class="x-q-del" aria-label="Remove condition">✕</button></span>`).join('')}
    <button data-s="${k}" class="x-q-add">+ condition</button></div>`;
  body.innerHTML = `${side('a', qState.a)}
    <div class="drow">${qState.rel ? `<b>through</b><select id="x-q-rt"><option value="">any link</option>${linkTypes.map(t => `<option ${t === qState.rel.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><select id="x-q-dir"><option value="out">going out →</option><option value="in">coming in ←</option><option value="both">either way ↔</option></select><button id="x-q-norel">Remove link step</button>` : '<button id="x-q-rel">+ follow a link</button>'}
    <label class="small">Most results <input type="number" id="x-q-limit" value="${qState.limit}" min="1" max="5000"></label></div>
    ${qState.rel ? side('b', qState.b) : ''}
    <div class="drow"><button class="primary" id="x-q-run">Run</button><button id="x-q-add2" disabled>Add results to graph</button><span id="x-q-msg" class="muted small" role="status"></span></div>
    <label class="small">Cypher (you can edit it and press Run Cypher)</label><textarea class="cypher" id="x-q-cy" spellcheck="false"></textarea><div class="drow"><button id="x-q-runcy">Run Cypher</button><button id="x-q-copy">Copy Cypher</button></div><div id="x-q-out"></div>`;
  if (qState.rel) $('#x-q-dir').value = qState.rel.dir;
  const sideOf = el => qState[el.dataset.s];
  const re = () => renderQuery();
  for (const el of body.querySelectorAll('.x-q-type')) el.onchange = () => { sideOf(el).type = el.value; sideOf(el).where = []; re(); };
  for (const el of body.querySelectorAll('.x-q-add')) el.onclick = () => { sideOf(el).where.push({ field: 'label', op: '=', value: '' }); re(); };
  for (const el of body.querySelectorAll('.x-q-del')) el.onclick = () => { sideOf(el).where.splice(+el.dataset.i, 1); re(); };
  for (const el of body.querySelectorAll('.x-q-f')) el.onchange = () => { sideOf(el).where[+el.dataset.i].field = el.value; showCy(); };
  for (const el of body.querySelectorAll('.x-q-op')) el.onchange = () => { sideOf(el).where[+el.dataset.i].op = el.value; re(); };
  for (const el of body.querySelectorAll('.x-q-v')) el.oninput = () => { sideOf(el).where[+el.dataset.i].value = el.value; showCy(); };
  if ($('#x-q-rel')) $('#x-q-rel').onclick = () => { qState.rel = { type: '', dir: 'out' }; re(); };
  if ($('#x-q-norel')) $('#x-q-norel').onclick = () => { qState.rel = null; re(); };
  if ($('#x-q-rt')) $('#x-q-rt').onchange = e => { qState.rel.type = e.target.value; showCy(); };
  if ($('#x-q-dir')) $('#x-q-dir').onchange = e => { qState.rel.dir = e.target.value; showCy(); };
  $('#x-q-limit').oninput = e => { qState.limit = +e.target.value || 100; showCy(); };
  const payload = () => ({ a: { type: qState.a.type || null, where: qState.a.where }, rel: qState.rel ? { type: qState.rel.type || null, dir: qState.rel.dir } : null, b: qState.rel ? { type: qState.b.type || null, where: qState.b.where } : null, limit: qState.limit });
  async function showCy() { try { $('#x-q-cy').value = (await api('/api/explore/x/cypher', { query: payload() })).cypher; } catch {} }
  let lastItems = [];
  const show = r => {
    lastItems = []; for (const row of r.rows) for (const k of ['a', 'r', 'b']) if (row[k]) lastItems.push(row[k]);
    $('#x-q-cy').value = r.cypher; note('#x-q-msg', `${r.count}${r.truncated ? '+' : ''} result${r.count === 1 ? '' : 's'}.`); say($('#x-q-msg').textContent);
    $('#x-q-out').innerHTML = `<table><thead><tr>${r.columns.map(c => `<th>${c === 'a' ? 'Found' : c === 'r' ? 'Link' : 'Connected to'}</th>`).join('')}</tr></thead><tbody>${r.rows.slice(0, 500).map(row => `<tr data-id="${esc(row.a.id)}">${r.columns.map(c => `<td>${c === 'r' ? esc(row.r.type) : `${esc(row[c].type)} <b>${esc(row[c].label)}</b>`}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    $('#x-q-add2').disabled = !lastItems.length;
    for (const tr of $('#x-q-out').querySelectorAll('tr[data-id]')) tr.onclick = () => { if (!graph.hasNode(tr.dataset.id)) X.addItems(lastItems); X.select(tr.dataset.id); X.fitCamera?.([tr.dataset.id]); };
  };
  $('#x-q-run').onclick = async () => { try { show(await api('/api/explore/x/query', { query: payload() })); } catch (e) { note('#x-q-msg', e.message, true); } };
  $('#x-q-runcy').onclick = async () => { try { show(await api('/api/explore/x/query', { cypher: $('#x-q-cy').value })); } catch (e) { note('#x-q-msg', e.message, true); } };
  $('#x-q-copy').onclick = () => navigator.clipboard?.writeText($('#x-q-cy').value).then(() => note('#x-q-msg', 'Cypher copied.'), () => {});
  $('#x-q-add2').onclick = () => { X.addItems(lastItems); const ids = lastItems.filter(i => i.kind === 'node').map(i => i.id); selectMany(ids); X.fitCamera?.(ids); note('#x-q-msg', `${ids.length} added to the graph and selected.`); };
  showCy();
}
$('#x-open-query').onclick = () => { $('#menu-analyze').open = false; tab = null; openTab('query'); };

// ---- Case notebooks
let openNb = null;
async function renderNotebook() {
  if (openNb) return renderEntries();
  const r = await api('/api/explore/x/notebooks').catch(e => ({ notebooks: [], error: e.message }));
  body.innerHTML = `<div class="drow"><input id="x-nb-title" placeholder="Name of a new case, e.g. Supplier fraud review" size="40"><button class="primary" id="x-nb-new">New case</button><span id="x-nb-msg" class="muted small"></span></div>
    <table><thead><tr><th>Case</th><th>Entries</th><th>Started by</th><th>When</th></tr></thead><tbody>${r.notebooks.map(n => `<tr data-id="${esc(n.id)}"><td><b>${esc(n.title)}</b></td><td>${n.entries}</td><td>${esc(n.author)}</td><td>${fmtTime(n.at)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No cases yet.</td></tr>'}</tbody></table>`;
  $('#x-nb-new').onclick = async () => { try { const n = await api('/api/explore/x/notebooks', { title: $('#x-nb-title').value }); openNb = n.notebook.id; renderNotebook(); } catch (e) { note('#x-nb-msg', e.message, true); } };
  for (const tr of body.querySelectorAll('tr[data-id]')) tr.onclick = () => { openNb = tr.dataset.id; renderNotebook(); };
}
async function renderEntries() {
  let r; try { r = await api(`/api/explore/x/notebook?id=${encodeURIComponent(openNb)}`); } catch (e) { openNb = null; return renderNotebook(); }
  const view = S.currentView?.id || S.viewId || null;
  body.innerHTML = `<div class="drow"><button id="x-nb-back">← All cases</button><b>${esc(r.notebook.title)}</b><span class="muted small">by ${esc(r.notebook.author)}</span><span class="spacer"></span><button id="x-nb-md">Download as text</button><button id="x-nb-del" class="warn">Delete case</button></div>
    <div class="drow"><textarea id="x-nb-text" placeholder="Write a note. Add the selection to attach the things you are looking at." style="flex:1;min-height:44px"></textarea>
    <div><button class="primary" id="x-nb-note">Add note</button><br><button id="x-nb-snap" title="Attach the selected things (or everything shown) with a written summary">Add selection</button></div></div>
    <ol>${r.entries.map(e => `<li class="cmt"><span class="when">${fmtTime(e.at)} · ${e.kind === 'snapshot' ? 'selection' : e.kind}</span><div>${esc(e.text).replace(/\n/g, '<br>')}</div>${e.ids.length ? `<button data-ids="${esc(JSON.stringify(e.ids))}" class="x-nb-show">Show ${e.ids.length} on graph</button>` : ''} <button class="x-nb-rm linkish" data-id="${esc(e.id)}">remove</button></li>`).join('') || '<p class="muted">Empty case. Add a note or the current selection.</p>'}</ol>`;
  $('#x-nb-back').onclick = () => { openNb = null; renderNotebook(); };
  $('#x-nb-note').onclick = async () => { await api('/api/explore/x/notebook/entry', { nb: openNb, kind: 'note', text: $('#x-nb-text').value, ids: selected().filter(id => graph.hasNode(id)) }).catch(e => X.toast?.(e.message)); renderEntries(); };
  $('#x-nb-snap').onclick = async () => { const ids = selected().length ? selected().filter(id => graph.hasNode(id)) : visibleNodes(); const s = await api('/api/explore/x/summary', { ids }).catch(() => ({ text: '' })); await api('/api/explore/x/notebook/entry', { nb: openNb, kind: 'snapshot', text: [$('#x-nb-text').value, s.text].filter(Boolean).join('\n\n'), ids, viewId: view }).catch(e => X.toast?.(e.message)); renderEntries(); };
  $('#x-nb-del').onclick = async () => { if (!confirm('Delete this case and all its entries?')) return; await api(`/api/explore/x/notebook?id=${encodeURIComponent(openNb)}`, undefined, 'DELETE').catch(e => X.toast?.(e.message)); openNb = null; renderNotebook(); };
  $('#x-nb-md').onclick = () => download(`${r.notebook.title.replace(/[^\w -]/g, '')}.md`, new Blob([`# ${r.notebook.title}\n\n` + r.entries.map(e => `## ${fmtTime(e.at)} (${e.kind})\n\n${e.text}\n\n${e.ids.length ? 'Things: ' + e.ids.map(label).join(', ') + '\n' : ''}`).join('\n')], { type: 'text/markdown' }));
  for (const b of body.querySelectorAll('.x-nb-show')) b.onclick = async () => { const ids = JSON.parse(b.dataset.ids); const missing = ids.filter(id => !graph.hasNode(id)); if (missing.length) { try { const r2 = await api('/api/explore/x/history/at?t=' + Date.now()); X.addItems(r2.items.filter(i => missing.includes(i.id) || (i.kind === 'link' && ids.includes(i.fromId) && ids.includes(i.toId)))); } catch {} } selectMany(ids); X.fitCamera?.(ids.filter(id => graph.hasNode(id))); };
  for (const b of body.querySelectorAll('.x-nb-rm')) b.onclick = async () => { await api(`/api/explore/x/notebook/entry?id=${encodeURIComponent(b.dataset.id)}`, undefined, 'DELETE'); renderEntries(); };
}

// ---------------------------------------------------------------- comments on the selected thing
async function renderComments() {
  const box = $('#x-comments'), sel = selected();
  if (sel.length !== 1) { box.className = 'small muted'; box.textContent = 'Select one thing to see and add comments.'; return; }
  const id = sel[0]; let r; try { r = await api(`/api/explore/x/comments?target=${encodeURIComponent(id)}`); } catch (e) { box.textContent = e.message; return; }
  if (selected()[0] !== id) return;
  box.className = 'small';
  box.innerHTML = `${r.comments.map(c => `<div class="cmt"><b>${esc(c.author)}</b> <span class="when">${fmtTime(c.at)}</span><div>${esc(c.text)}</div>${c.author === me?.actor || me?.admin ? `<button class="linkish x-c-del" data-id="${esc(c.id)}">remove</button>` : ''}</div>`).join('') || '<p class="muted">No comments yet.</p>'}
    <textarea id="x-c-text" placeholder="Add a comment about ${esc(label(id))}" aria-label="New comment"></textarea><button class="primary" id="x-c-post">Post comment</button> <span id="x-c-msg" class="muted"></span>`;
  $('#x-c-post').onclick = async () => { try { await api('/api/explore/x/comments', { target: id, text: $('#x-c-text').value }); renderComments(); } catch (e) { note('#x-c-msg', e.message, true); } };
  for (const b of box.querySelectorAll('.x-c-del')) b.onclick = async () => { await api(`/api/explore/x/comments?id=${encodeURIComponent(b.dataset.id)}`, undefined, 'DELETE').catch(e => note('#x-c-msg', e.message, true)); renderComments(); };
}
selListeners.push(renderComments);

// ---------------------------------------------------------------- editing
const dlg = $('#x-dialog'), form = $('#x-dialog-form');
function dialog(html, onOk) {
  form.innerHTML = html + '<p class="msg" id="x-d-msg"></p><div class="row"><button value="ok" class="primary" id="x-d-ok">Save</button><button value="cancel" formnovalidate>Cancel</button></div>';
  dlg.showModal();
  $('#x-d-ok').onclick = async e => { e.preventDefault(); try { await onOk(); dlg.close(); } catch (err) { $('#x-d-msg').textContent = err.message; } };
}
const fieldRows = (props = {}) => Object.entries(props).map(([k, v]) => `<div class="frow"><input class="fk" value="${esc(k)}" aria-label="Field name" readonly><input class="fv" value="${esc(v)}" aria-label="Value for ${esc(k)}"><span></span></div>`).join('');
const readFields = () => { const o = {}; for (const r of form.querySelectorAll('.frow')) { const k = r.querySelector('.fk').value.trim(), v = r.querySelector('.fv').value; if (k) o[k] = v !== '' && !isNaN(v) && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v; } return o; };
const editDone = r => { note('#x-edit-msg', r.note || 'Saved.'); say('Saved to your graph.'); metaCache = null; };
$('#x-add').onclick = async () => {
  const m = await metaGet().catch(() => ({ types: [] }));
  dialog(`<h2>Add a thing</h2><label>Type</label><input id="x-a-type" list="x-a-types" placeholder="Person" required><datalist id="x-a-types">${m.types.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
    <label>Identifier (unique within the type)</label><input id="x-a-key" placeholder="e.g. p-1001" required><label>Name</label><input id="x-a-name">
    <label>Other fields</label><div id="x-a-fields"></div><button type="button" id="x-a-more">+ field</button>`, async () => {
    const props = readFields(); const name = $('#x-a-name').value; if (name) props.name = name;
    const r = await api('/api/explore/x/edit', { ops: [{ op: 'addNode', type: $('#x-a-type').value.trim(), key: $('#x-a-key').value.trim(), props }] }); editDone(r);
    const id = r.done[0].id; setTimeout(() => { if (graph.hasNode(id)) { X.select(id); X.fitCamera?.([id]); } else X.searchGraph?.(name || $('#x-a-key').value); }, 900);
  });
  $('#x-a-more').onclick = () => { $('#x-a-fields').insertAdjacentHTML('beforeend', '<div class="frow"><input class="fk" placeholder="field" aria-label="Field name"><input class="fv" placeholder="value" aria-label="Value"><span></span></div>'); };
};
$('#x-editprops').onclick = () => {
  const sel = selected().filter(id => graph.hasNode(id)); if (sel.length !== 1) return note('#x-edit-msg', 'Select one thing first.', true);
  const it = item(sel[0]); if (!it.id.startsWith('sg:node:')) return note('#x-edit-msg', 'Only things from your StreamGraph sources can be edited (matched records are computed).', true);
  dialog(`<h2>Edit ${esc(it.type)} ${esc(it.label)}</h2><p class="muted small">Hidden fields are not shown and cannot be changed.</p><div id="x-a-fields">${fieldRows(it.properties)}</div><button type="button" id="x-a-more">+ field</button>`, async () => {
    const before = it.properties || {}, now = readFields(), changed = Object.fromEntries(Object.entries(now).filter(([k, v]) => String(before[k] ?? '') !== String(v)));
    if (!Object.keys(changed).length) return; editDone(await api('/api/explore/x/edit', { ops: [{ op: 'setProps', id: it.id, props: changed }] }));
  });
  $('#x-a-more').onclick = () => { $('#x-a-fields').insertAdjacentHTML('beforeend', '<div class="frow"><input class="fk" placeholder="field" aria-label="Field name"><input class="fv" placeholder="value" aria-label="Value"><span></span></div>'); };
};
$('#x-connect').onclick = () => {
  const sel = selected().filter(id => graph.hasNode(id)); if (sel.length !== 2) return note('#x-edit-msg', 'Select exactly two things (Shift-click the second).', true);
  const types = [...new Set(graph.mapEdges((e, a) => a.type))].sort();
  dialog(`<h2>Connect</h2><p><b>${esc(label(sel[0]))}</b> → <b>${esc(label(sel[1]))}</b> <button type="button" id="x-cn-swap">Swap direction</button></p><label>Kind of link</label><input id="x-cn-type" list="x-cn-types" placeholder="KNOWS" required><datalist id="x-cn-types">${types.map(t => `<option value="${esc(t)}">`).join('')}</datalist>`, async () => {
    editDone(await api('/api/explore/x/edit', { ops: [{ op: 'addEdge', type: $('#x-cn-type').value.trim(), from: sel[0], to: sel[1] }] }));
  });
  const swap = () => { sel.reverse(); form.querySelector('p').innerHTML = `<b>${esc(label(sel[0]))}</b> → <b>${esc(label(sel[1]))}</b> <button type="button" id="x-cn-swap">Swap direction</button>`; $('#x-cn-swap').onclick = swap; };
  $('#x-cn-swap').onclick = swap;
};
$('#x-remove').onclick = async () => {
  const sel = selected(); if (!sel.length) return note('#x-edit-msg', 'Select what to remove first.', true);
  if (!confirm(`Remove ${sel.length === 1 ? `"${label(sel[0])}"` : `${sel.length} things`} from your graph? This also removes it from outputs on "Send data out".`)) return;
  const ops = sel.map(id => graph.hasEdge(id) ? { op: 'deleteEdge', id } : { op: 'deleteNode', id });
  try { editDone(await api('/api/explore/x/edit', { ops })); X.clearSelection(); } catch (e) { note('#x-edit-msg', e.message, true); }
};

// ---------------------------------------------------------------- export
const positions = ids => Object.fromEntries(ids.map(id => [id, { x: graph.getNodeAttribute(id, 'x'), y: graph.getNodeAttribute(id, 'y') }]));
async function svgText() {
  const ids = visibleNodes(), theme = document.documentElement.classList.contains('hc') ? 'contrast' : S.theme;
  const r = await fetch('/api/explore/x/export/svg', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids, positions: positions(ids), theme, title: S.currentView?.name || 'StreamGraph view' }) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Export failed'); return r.text();
}
$('#x-svg').onclick = async () => { try { download('streamgraph-view.svg', new Blob([await svgText()], { type: 'image/svg+xml' })); } catch (e) { X.toast?.(e.message); } };
$('#x-png').onclick = async () => {
  try { const svg = await svgText(), img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth * 2; c.height = img.naturalHeight * 2; const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0);
    c.toBlob(b => download('streamgraph-view.png', b), 'image/png'); } catch (e) { X.toast?.(e.message); }
};
for (const [btn, fmt, ext] of [['#x-rdf-ttl', 'turtle', 'ttl'], ['#x-rdf-nt', 'ntriples', 'nt']]) $(btn).onclick = async () => { try { const r = await fetch(`/api/explore/x/rdf?format=${fmt}`); if (!r.ok) throw new Error((await r.json()).error); download(`streamgraph.${ext}`, await r.blob()); } catch (e) { note('#x-rdf-msg', e.message, true); } };
$('#x-rdf-import').onclick = () => $('#x-rdf-file').click();
$('#x-rdf-file').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const r = await api('/api/explore/x/rdf/import', { text: await f.text(), format: /\.nt$/i.test(f.name) ? 'ntriples' : 'turtle' }); note('#x-rdf-msg', `Imported ${r.nodes} things and ${r.edges} links.`); metaCache = null; } catch (err) { note('#x-rdf-msg', err.message, true); } e.target.value = ''; };

// ---------------------------------------------------------------- plain-English questions + captions
async function nlInit() {
  try { const s = await api('/api/explore/x/nl/settings'); $('#x-nl-provider').value = s.provider; $('#x-ask').hidden = s.provider === 'off';
    $('#x-nl-provider').disabled = !me?.admin; note('#x-nl-note', s.provider === 'off' ? 'Off. Turn on to ask questions like "how many customers" or "path from Ada to Trail Shoe". No internet, no paid service.' : 'On: built-in rules answer in this app, nothing leaves your computer.' + (me?.admin ? '' : ' Only an admin can change this.')); } catch {}
}
$('#x-nl-provider').onchange = async e => { try { await api('/api/explore/x/nl/settings', { provider: e.target.value }); } catch (err) { note('#x-nl-note', err.message, true); } nlInit(); };
async function ask() {
  const q = $('#search').value.trim(); if (!q) return note('#search-info', 'Type a question first.');
  try { const r = await api('/api/explore/x/nl/ask', { question: q }); showCaption(r.answer + (r.cypher ? `\nCypher: ${r.cypher}` : ''));
    const items = r.rows ? r.rows.flatMap(row => [row.a, row.r, row.b].filter(Boolean)) : null; if (items?.length) X.addItems(items);
    const ids = r.ids || (items ? items.filter(i => i.kind === 'node').map(i => i.id) : []);
    if (ids.length) { const missing = ids.filter(id => !graph.hasNode(id)); for (const id of missing.slice(0, 50)) await X.searchGraph?.(''); selectMany(ids); X.fitCamera?.(ids.filter(id => graph.hasNode(id))); }
  } catch (e) { showCaption(e.message); }
}
$('#x-ask').onclick = ask;
function showCaption(t) { const b = $('#x-caption-bar'); b.hidden = false; b.innerHTML = `${esc(t).replace(/\n/g, '<br>')}<button class="close" aria-label="Close">✕</button>`; b.querySelector('.close').onclick = () => { b.hidden = true; }; }
$('#x-caption').onclick = async () => { $('#menu-analyze').open = false; try { const r = await api('/api/explore/x/nl/caption', { ids: visibleNodes() }); showCaption(r.caption); } catch (e) { showCaption(e.message); } };

// ---------------------------------------------------------------- accessibility: describe, high contrast, keyboard steps
async function describe() { const sel = selected().filter(id => graph.hasNode(id)); const ids = sel.length ? sel : visibleNodes(); try { const r = await api('/api/explore/x/summary', { ids }); showCaption((sel.length ? 'Selection: ' : 'Shown: ') + r.text); say(r.text); } catch (e) { showCaption(e.message); } }
$('#x-describe').onclick = () => { $('#menu-view').open = false; describe(); };
const setContrast = on => { document.documentElement.classList.toggle('hc', on); localStorage.setItem('sg.contrast', on ? '1' : '0'); $('#x-contrast').setAttribute('aria-pressed', on); if (on && S.theme !== 'dark') X.setTheme('dark'); X.renderer.refresh?.(); };
$('#x-contrast').onclick = () => setContrast(!document.documentElement.classList.contains('hc'));
if (document.documentElement.classList.contains('hc')) setContrast(true);
let order = [], pos = -1;
function step(d) {
  order = visibleNodes().sort((a, b) => String(label(a)).localeCompare(String(label(b))));
  if (!order.length) return; const cur = selected()[0]; pos = Math.max(-1, order.indexOf(cur)); pos = (pos + d + order.length) % order.length;
  const id = order[pos]; X.select(id); X.fitCamera?.([id]); announce(id);
}
function announce(id) { const it = item(id); say(`${it?.type || ''} ${it?.label || id}, ${graph.degree(id)} link${graph.degree(id) === 1 ? '' : 's'}. ${pos + 1} of ${order.length}.`); }
function neighbourStep() { const cur = selected()[0]; if (!cur || !graph.hasNode(cur)) return step(1); const nb = graph.neighbors(cur).filter(n => visibleNodes().includes(n)); if (!nb.length) return say('No neighbours shown.'); const k = (nb.indexOf(S._lastNb) + 1) % nb.length; S._lastNb = nb[k]; X.select(nb[k]); X.fitCamera?.([nb[k]]); const it = item(nb[k]); say(`Neighbour of ${label(cur)}: ${it?.type} ${it?.label}.`); }
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '[') { e.preventDefault(); step(-1); } else if (e.key === ']') { e.preventDefault(); step(1); } else if (e.key === '\\') { e.preventDefault(); neighbourStep(); }
  else if (e.key === 'd' || e.key === 'D') { describe(); } else if (e.key === 't' || e.key === 'T') { openTab(tab || 'table'); }
});

// ---------------------------------------------------------------- 3D mode (lazy bundle, 3d-force-graph, MIT)
let three = null; const THREE_URL = '/explore/three-d.js';
$('#x-3d').onclick = async () => {
  const on = $('#x-3d').getAttribute('aria-pressed') !== 'true';
  $('#x-3d').setAttribute('aria-pressed', on); $('#x-3d').textContent = on ? '2D' : '3D'; $('#x-3d').title = on ? 'Back to the flat 2D graph' : 'Show the graph in 3D (press again to go back to 2D)';
  const el = $('#x-three');
  if (!on) { el.hidden = true; three?.destroy(); three = null; say('2D view.'); return; }
  el.hidden = false; el.textContent = 'Loading 3D…';
  const { mount3d } = await import(/* @vite-ignore */ THREE_URL);
  const ids = new Set(visibleNodes()); const nodes = [...ids].map(id => ({ id, name: label(id), type: graph.getNodeAttribute(id, 'type'), color: graph.getNodeAttribute(id, 'color') }));
  const links = graph.filterEdges((e, a, s, t) => ids.has(s) && ids.has(t)).map(e => ({ source: graph.source(e), target: graph.target(e), type: graph.getEdgeAttribute(e, 'type') }));
  el.textContent = ''; three = mount3d(el, { nodes, links, dark: S.theme === 'dark' || document.documentElement.classList.contains('hc'), selected: new Set(S.selected), onClick: id => { X.select(id); } });
  say(`3D view of ${nodes.length} things. Press 2D to go back.`);
};
selListeners.push(() => three?.highlight(new Set(S.selected)));

// ---------------------------------------------------------------- deep links from the studio (?q=… search, ?drawer=…, ?select=…)
const params = new URLSearchParams(location.search);
if (params.get('q')) { $('#search').value = params.get('q'); X.searchGraph(params.get('q')); }
if (params.get('drawer') && TABS[params.get('drawer')]) setTimeout(() => openTab(params.get('drawer')), 600);
nlInit();
window.__studioExtras = { openTab, describe, step, ask, setContrast, renderComments };
