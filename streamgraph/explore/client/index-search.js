// Search-index box for the explorer toolbar (OpenSearch when an OpenSearch output is set up, else the built-in search).
// Results come from /api/explore/search (access-filtered on the server, then through the explore egress filter), grouped by
// type with highlighted matches. Clicking a result focuses that node in the graph and, if it has a location, on the map.
// The studio page can also ask for a focus with postMessage({ type: 'sg-focus', id, geo }) or ?focus=<explore id>.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hl = s => esc(s).replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>'); // server already escaped; only <mark> survives
const ago = t => { if (!t) return 'never'; const s = Math.round((Date.now() - t) / 1000); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(t).toLocaleString(); };
export const STATUS_WORD = { healthy: 'Index healthy', stale: 'Index catching up', offline: 'Search index offline', none: 'Built-in search (no index set up)' };

export function installIndexSearch({ api, focus, mapView, types = () => [] }) {
  const header = document.querySelector('header'); if (!header || document.getElementById('ix')) return;
  const box = document.createElement('div'); box.id = 'ix'; box.className = 'ix';
  // compact toolbar button (the header is already full at 1280 px); the box itself opens in a panel under it (Ctrl+K)
  box.innerHTML = `<button id="ix-open" class="ix-open" title="Search the index: typo-tolerant, grouped by type (Ctrl+K)" aria-expanded="false" aria-controls="ix-panel">🔎<span id="ix-dot" class="ix-dot none"></span></button>
    <div id="ix-panel" class="ix-pop ix-panel" hidden><div class="ix-row"><input id="ix-q" type="search" placeholder="Search index (typos ok)…" aria-label="Search the index" autocomplete="off"><button id="ix-filters-btn" title="Filter by type, time and map view" aria-expanded="false">Filters</button></div>
    <div id="ix-filters" class="ix-filters" hidden><label>Type <select id="ix-type"><option value="">all types</option></select></label>
      <label>From <input id="ix-from" type="datetime-local"></label><label>To <input id="ix-to" type="datetime-local"></label>
      <label><input id="ix-near" type="checkbox"> Near map view (only things inside the map)</label></div><div id="ix-status" class="muted small"></div>
    <div id="ix-results" class="ix-results" hidden role="listbox" aria-label="Search results"></div></div>`;
  const anchor = document.getElementById('search-info'); anchor ? anchor.after(box) : header.appendChild(box);
  const $ = s => box.querySelector(s);
  let last = null, timer = null, seq = 0;
  async function status() {
    try { const s = await api('/api/explore/search/status'); $('#ix-dot').className = `ix-dot ${s.index}`; $('#ix-dot').title = STATUS_WORD[s.index] || s.index;
      $('#ix-status').innerHTML = `<b>${esc(STATUS_WORD[s.index] || s.index)}</b>${s.configured ? ` · ${(s.docs ?? 0).toLocaleString()} docs · last sync ${ago(s.lastSync)}${s.waiting ? ` · ${s.waiting} waiting` : ''}` : ' · add an OpenSearch output under Send data out'}`;
    } catch { $('#ix-dot').className = 'ix-dot offline'; }
  }
  function fillTypes() { const sel = $('#ix-type'), cur = sel.value, ts = types(); sel.innerHTML = '<option value="">all types</option>' + ts.map(t => `<option ${t === cur ? 'selected' : ''}>${esc(t)}</option>`).join(''); }
  async function run() {
    const q = $('#ix-q').value.trim(), body = { q, size: 30 };
    if ($('#ix-type').value) body.types = [$('#ix-type').value];
    if ($('#ix-from').value || $('#ix-to').value) { const iso = v => (v ? new Date(v).toISOString() : null); body.time = { from: iso($('#ix-from').value), to: iso($('#ix-to').value) }; } // the pickers are in the browser's local time
    const mv = mapView?.(); if ($('#ix-near').checked && mv?.map) { const b = mv.map.getBounds(); body.geo = { bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] }; }
    if (!q && !body.geo && !body.time) { $('#ix-results').hidden = true; return; }
    const my = ++seq; let r;
    try { r = await api('/api/explore/search', body); } catch (e) { $('#ix-results').innerHTML = `<div class="ix-msg err">${esc(e.message)}</div>`; $('#ix-results').hidden = false; return; }
    if (my !== seq) return; last = r;
    $('#ix-dot').className = `ix-dot ${r.index}`;
    $('#ix-results').innerHTML = (r.offline || r.index === 'offline' ? `<div class="ix-msg warn" id="ix-offline">⚠ Search index offline: showing the built-in search (still filtered by your access rules).</div>` : '')
      + (r.groups.length ? r.groups.map(g => `<div class="ix-group"><div class="ix-gh">${esc(g.type)} <span class="muted">${g.count}</span></div>${g.results.map(x => `<button class="ix-hit" role="option" data-id="${esc(x.exploreId)}" title="Show in the graph${x.geo ? ' and on the map' : ''}"><b>${esc(x.name)}</b>${x.geo ? ' <span class="ix-pin" title="Has a location">📍</span>' : ''}${x.time ? ` <span class="muted small">${esc(x.time.slice(0, 16).replace('T', ' '))}</span>` : ''}
          ${(x.highlights || []).slice(0, 2).map(h => `<div class="ix-frag"><span class="muted">${esc(h.field)}:</span> ${hl(h.fragments[0])}</div>`).join('')}</button>`).join('')}</div>`).join('')
        : `<div class="ix-msg">No matches${r.note ? ` · ${esc(r.note)}` : ''}.</div>`)
      + `<div class="ix-foot muted small">${r.total} result${r.total === 1 ? '' : 's'}${r.indexed > r.total ? ` (about ${r.indexed.toLocaleString()} matches in the index; narrow the search to see others)` : ''} · ${r.engine === 'opensearch' ? 'OpenSearch' : 'built-in search'} · ${r.ms} ms</div>`;
    $('#ix-results').hidden = false;
    for (const b of $('#ix-results').querySelectorAll('.ix-hit')) b.onclick = () => { const x = last.results.find(y => y.exploreId === b.dataset.id); openPanel(false); focus(b.dataset.id, x); };
  }
  $('#ix-q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 250); });
  $('#ix-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); clearTimeout(timer); run(); } if (e.key === 'Escape') openPanel(false); });
  $('#ix-q').addEventListener('focus', () => { if (last && $('#ix-q').value) $('#ix-results').hidden = false; });
  const openPanel = (on = $('#ix-panel').hidden) => { $('#ix-panel').hidden = !on; $('#ix-open').setAttribute('aria-expanded', String(on)); if (on) { status(); $('#ix-q').focus(); } };
  $('#ix-open').onclick = () => openPanel();
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPanel(true); } });
  $('#ix-filters-btn').onclick = () => { const p = $('#ix-filters'); p.hidden = !p.hidden; $('#ix-filters-btn').setAttribute('aria-expanded', String(!p.hidden)); if (!p.hidden) fillTypes(); };
  for (const id of ['#ix-type', '#ix-from', '#ix-to', '#ix-near']) $(id).addEventListener('change', run);
  document.addEventListener('click', e => { if (!box.contains(e.target)) openPanel(false); });
  window.addEventListener('message', e => { if (e.origin === location.origin && e.data?.type === 'sg-focus' && e.data.id) focus(e.data.id, e.data); });
  window.__explore && (window.__explore.indexSearch = { open: openPanel, run });
  status(); setInterval(status, 15000);
  return { run, status, open: openPanel };
}
