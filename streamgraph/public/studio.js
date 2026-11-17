// Guided no-code UI. Plain JS. All technical config is compiled on the server.
const $ = s => document.querySelector(s), V = () => $('#view');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let AS = sessionStorage.getItem('sg-as') || ''; // "Test as…" preview user (admins only; enforced on the server)
const api = async (p, body, method) => { const r = await fetch(p, { method: method || (body !== undefined ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(AS ? { 'x-sg-as': AS } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Something went wrong'); return j; };
const an = w => (/^[AEIOU]/i.test(w || '') ? 'an' : 'a');
const tip = t => `<span class="tip" title="${esc(t)}">?</span>`;
const ago = t => { if (!t) return 'never'; const s = Math.round((Date.now() - t) / 1000); return s < 5 ? 'just now' : s < 60 ? `${s} seconds ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(t).toLocaleString(); };
const opts = (list, sel) => list.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
const table = (rows, cols, cls = () => '') => { cols ??= [...new Set(rows.flatMap(r => Object.keys(r || {})))]; return `<table><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${rows.map((r, i) => `<tr class="${cls(i, r) || ''}">${cols.map(c => `<td>${esc(typeof r?.[c] === 'object' ? JSON.stringify(r[c]) : r?.[c])}</td>`).join('')}</tr>`).join('')}</table>`; };
let WS = null, timer = null;
const loadWs = async () => (WS = await api('/api/studio/workspace'));
const KIND = { csv: ['📄', 'Spreadsheet (CSV)', 'Upload a .csv file exported from Excel or Google Sheets'], json: ['🗂️', 'JSON file', 'Upload a .json file of records'],
  api: ['🌐', 'Web API', 'A web address that returns data, like a CRM or loyalty service'], database: ['🛢️', 'Database', 'Postgres or a SQLite file'], stream: ['⚡', 'Live feed', 'A live stream of events (Kafka or Confluent)'],
  documents: ['📑', 'Documents', 'PDF, Word and Excel files in a folder: their text, tables and details'] };
const kb = n => (n == null ? '' : n < 1e6 ? `${Math.max(1, Math.round(n / 1e3))} KB` : `${(n / 1e6).toFixed(1)} MB`);

// ---------------- Home
async function home() {
  const h = await api('/api/studio/home');
  const allDone = h.checklist.every(c => c.done);
  V().innerHTML = `<h1>Home</h1>
  ${allDone ? '' : `<div class="card"><h2>Getting started</h2><div class="row" style="align-items:center"><ul class="check" style="flex:1;margin:0;padding:0">${h.checklist.map(c => `<li class="${c.done ? 'done' : ''}">${esc(c.text)}</li>`).join('')}</ul>
    <div>${h.demo ? '<p class="muted" style="max-width:320px">The demo shop is loaded. Next, connect your sources so matching customers and products are combined.</p><a class="btn" href="#link">Connect your sources</a> ' : ''}<p class="muted" style="max-width:320px;${h.demo ? 'display:none' : ''}">New here? Load a small sample shop (customers, orders, products and stock) and see it all come together.</p>${h.demo ? '' : '<button class="primary" id="demo">Try the demo data</button> <a class="btn" href="#add">Add my own data</a>'}</div></div></div>`}
  <div class="row">
    <div class="card tile"><div class="n">${h.sources.length}</div><div class="l">Connected sources</div></div>
    <div class="card tile"><div class="n">${h.perMinute}</div><div class="l">Records flowing per minute ${tip('How many records arrived from all your sources in the last 60 seconds')}</div></div>
    <div class="card tile"><div class="n" style="font-size:18px;padding-top:8px">${ago(h.lastUpdate)}</div><div class="l">Last update</div></div>
    <div class="card tile"><div class="n">${h.counts.nodes.toLocaleString()}</div><div class="l">Things in your graph · ${h.counts.edges.toLocaleString()} connections ${tip('Everything saved to graph: each customer, order or product is one thing; links between them are connections')}</div></div>
  </div>
  <div class="grid2">
    <div class="card"><h2>Your sources <span style="float:right">${h.sources.length ? (h.running ? '<button id="pause">Pause syncing</button>' : '<button class="good" id="resume">Resume syncing</button>') : ''}</span></h2>
      ${h.sources.length ? `<table><tr><th>Source</th><th>Status</th><th>Records</th><th>Last update</th><th></th></tr>${h.sources.map(s => `<tr><td><b>${esc(s.name)}</b><div class="small muted">${KIND[s.kind][1]}${s.kind === 'documents' ? '' : ` · ${esc(s.entity)}s`}${s.keepInSync ? ' · keep in sync' : ''}</div></td>
        <td><span class="dot ${s.health}"></span>${esc(s.note)}</td><td>${s.records}<div class="small muted">${s.perMinute}/min</div></td><td class="small">${ago(s.lastUpdate)}</td><td><button data-del="${s.id}" title="Remove this source">✕</button></td></tr>`).join('')}</table>`
      : `<div class="empty"><div class="big">🔌</div>No sources yet. <a href="#add">Add a data source</a> or try the demo data.</div>`}
      ${h.sources.length || h.counts.nodes ? '<p class="small" style="margin:12px 0 0"><button class="linkish" id="newproj">Start a new project…</button></p>' : ''}</div>
    <div class="card"><h2>Recent changes</h2>${h.recent.length ? `<ul class="recent">${h.recent.map(r => `<li>${esc(r.text)} <span class="muted small">· ${ago(r.at)}</span></li>`).join('')}</ul>` : '<div class="empty">Changes will appear here as data arrives.</div>'}
      ${h.entities.length ? `<h2 style="margin-top:14px">What's in your graph</h2>${h.entities.map(e => `<span class="chip" style="cursor:default">${esc(e.label)}s · ${e.count}</span>`).join('')}` : ''}</div>
  </div>`;
  $('#demo') && ($('#demo').onclick = async e => { e.target.disabled = true; e.target.textContent = 'Loading…'; await api('/api/studio/demo', {}); await loadWs(); home(); });
  $('#newproj') && ($('#newproj').onclick = resetDialog);
  $('#pause') && ($('#pause').onclick = async () => { await api('/api/studio/pause', {}); home(); });
  $('#resume') && ($('#resume').onclick = async () => { await api('/api/studio/resume', {}); home(); });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (confirm('Remove this source? Its records leave the graph.')) { await api('/api/studio/sources?id=' + b.dataset.del, undefined, 'DELETE'); await loadWs(); home(); } });
  timer = setTimeout(() => location.hash === '#home' || !location.hash ? home() : 0, 3000);
}

// ---------------- Add a data source wizard
const W = { step: 1 };
const STEPS = ['Pick a type', 'Connect', 'Preview', 'What is this data about?', 'Name and save'];
function wizard() {
  const s = W.step;
  const head = `<h1>Add a data source</h1><div class="steps">${STEPS.map((t, i) => `<span class="${i + 1 === s ? 'on' : i + 1 < s ? 'done' : ''}">${i + 1}. ${t}</span>`).join('')}</div>`;
  if (s === 1) {
    V().innerHTML = head + `<div class="card"><h2>Where is your data?</h2><div class="types">${Object.entries(KIND).map(([k, [ic, t, d]]) => `<div class="type ${W.kind === k ? 'sel' : ''}" data-k="${k}"><div class="ic">${ic}</div><b>${t}</b><span class="small muted">${d}</span></div>`).join('')}</div></div>`;
    document.querySelectorAll('.type').forEach(c => c.onclick = () => { Object.assign(W, { kind: c.dataset.k, step: 2, settings: {}, test: null }); wizard(); });
    return;
  }
  if (s === 2) return connectStep(head);
  if (W.kind === 'documents' && s >= 3 && s <= 4) return documentsStep(head);
  if (s === 3) {
    const t = W.test;
    V().innerHTML = head + `<div class="card"><h2>Here are the first records we found</h2><p class="muted">${esc(t.message)} Check this looks right before you continue.</p>
      ${t.preview.length ? `<div style="overflow:auto">${table(t.preview, t.columns)}</div>` : '<div class="empty">No example records yet. Go back and paste an example message.</div>'}
      <p><button id="back">Back</button> <button class="primary" id="next" ${t.preview.length ? '' : 'disabled'}>Looks right</button></p></div>`;
    $('#back').onclick = () => { W.step = 2; wizard(); }; $('#next').onclick = () => { W.step = 4; wizard(); };
    return;
  }
  if (s === 4) {
    const t = W.test, sug = t.suggestion || {}, known = [...new Set([...WS.workspace.sources.map(x => x.entity), 'Customer', 'Order', 'Product', 'Account', 'Transaction', 'Device', 'Location', 'Supplier'])];
    W.entity ??= sug.entity; W.key ??= sug.key; W.fields ??= { ...sug.fields };
    const isNew = !known.includes(W.entity);
    V().innerHTML = head + `<div class="card"><h2>What is this data about?</h2><p class="muted">Each row becomes one thing in your graph. Rows from different sources about the same thing get combined.</p>
      <label>Each row is a… ${tip('Pick an existing type to combine with other sources, or create a new one')}</label>
      <select id="ent">${opts([...known.map(k => [k, k + (WS.workspace.sources.some(x => x.entity === k) ? ' (already in your graph)' : '')]), ['__new', 'Something else…']], isNew ? '__new' : W.entity)}</select>
      <input id="entNew" placeholder="For example Patient" style="display:${isNew ? 'inline-block' : 'none'}" value="${isNew ? esc(W.entity) : ''}">
      <label>Which field identifies each ${esc((W.entity || 'record').toLowerCase())}? ${tip('A value that is different for every row, like an ID, email or product code. We use it to recognize the same thing when it shows up again.')}</label>
      <select id="key">${opts(t.columns.map(c => [c, c + (c === sug.key ? ' (suggested)' : '')]), W.key)}</select>
      <label>Fields to keep</label><table><tr><th>Keep</th><th>From this source</th><th>Call it</th><th>Example</th></tr>
      ${t.columns.map(c => { const p = Object.entries(W.fields).find(([, v]) => v === c); return `<tr><td><input type="checkbox" data-col="${esc(c)}" ${p ? 'checked' : ''}></td><td>${esc(c)}</td><td><input data-name="${esc(c)}" value="${esc(p ? p[0] : c.toLowerCase())}"></td><td class="muted">${esc(t.preview[0]?.[c])}</td></tr>`; }).join('')}</table>
      <p><button id="back">Back</button> <button class="primary" id="next">Next</button></p></div>`;
    $('#ent').onchange = e => { $('#entNew').style.display = e.target.value === '__new' ? 'inline-block' : 'none'; };
    $('#back').onclick = () => { W.step = 3; wizard(); };
    $('#next').onclick = () => {
      W.entity = $('#ent').value === '__new' ? $('#entNew').value.trim() : $('#ent').value; W.key = $('#key').value;
      W.fields = {}; document.querySelectorAll('[data-col]').forEach(c => { if (c.checked) W.fields[document.querySelector(`[data-name="${CSS.escape(c.dataset.col)}"]`).value.trim().replace(/\W+/g, '_') || c.dataset.col] = c.dataset.col; });
      if (!/^[A-Za-z]\w*$/.test(W.entity || '')) return alert('Give the type a simple name using letters, like Patient.');
      W.step = 5; wizard();
    };
    return;
  }
  if (s === 5) {
    W.name ??= W.kind === 'documents' ? (W.settings.uploaded ? 'Uploaded documents' : `Documents in ${W.settings.folder.split(/[\\/]/).filter(Boolean).pop()}`) : W.settings.fileName?.replace(/\.\w+$/, '') || `${W.entity}s from ${KIND[W.kind][1]}`;
    const docMsg = W.kind === 'documents' ? (() => { const on = W.docTables.filter(t => t.on); return `This saves every file as a <b>Document</b> with its details, text sections and tables.${on.length ? ` Rows become ${on.map(t => `<b>${esc(t.entity)}s</b>`).join(', ')}, each remembering its file, place and row.` : ''} Changed files are re-read and removed files are taken out of your graph.`; })() : null;
    V().innerHTML = head + `<div class="card"><h2>Name and save</h2>
      <label>Name</label><input id="nm" value="${esc(W.name)}" size="40">
      <label><input type="checkbox" id="sync" ${W.keepInSync !== false ? 'checked' : ''}> Keep in sync ${tip('We check for new, changed and removed records and update your graph automatically')}</label>
      <span class="muted">Check every <input id="every" type="number" min="1" value="${W.syncEverySec || (W.kind === 'documents' ? 30 : 5)}" style="width:70px"> seconds</span>
      <div class="msg info">${docMsg || `This saves ${Object.keys(W.fields).length} fields about each <b>${esc(W.entity)}</b>, identified by <b>${esc(W.key)}</b>.${W.secret ? ' Your password or key is stored on the server only.' : ''}`}</div>
      <div id="err"></div><p><button id="back">Back</button> <button class="good" id="save">Save and start syncing</button></p></div>`;
    $('#back').onclick = () => { W.step = 4; wizard(); };
    $('#save').onclick = async () => {
      try {
        const settings = { ...W.settings }; delete settings.fileName; delete settings.uploaded;
        if (W.kind === 'documents') {
          await api('/api/studio/sources', { name: $('#nm').value, kind: 'documents', settings, tables: W.docTables.filter(t => t.on).map(t => ({ sig: t.sig, entity: t.entity, key: t.key })), keepInSync: $('#sync').checked, syncEverySec: +$('#every').value });
          for (const k of Object.keys(W)) delete W[k]; W.step = 1; await loadWs(); location.hash = '#home'; return;
        }
        await api('/api/studio/sources', { name: $('#nm').value, kind: W.kind, settings, secret: W.secret, entity: W.entity, key: W.key, fields: W.fields, keepInSync: $('#sync').checked, syncEverySec: +$('#every').value, sampleRows: W.kind === 'stream' ? W.test.preview : undefined });
        for (const k of Object.keys(W)) delete W[k]; W.step = 1; await loadWs();
        location.hash = WS.workspace.sources.length >= 2 ? '#link' : '#home';
      } catch (e) { $('#err').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
    };
  }
}
function connectStep(head) {
  const k = W.kind, st = W.settings, f = (id, label, val = '', extra = '', t = '') => `<label for="${id}">${label}${t ? tip(t) : ''}</label><input id="${id}" value="${esc(val)}" ${extra} size="44">`;
  let form = '';
  if (k === 'csv' || k === 'json') form = `<label>Choose a file</label><input type="file" id="file" accept="${k === 'csv' ? '.csv' : '.json,.ndjson,.jsonl'}"> ${st.fileName ? `<span class="muted">Uploaded: ${esc(st.fileName)}</span>` : ''}`;
  if (k === 'documents') form = `<label>Upload documents ${tip('PDF, Word (.docx), Excel (.xlsx, .xls) or CSV, up to 20 MB each. Files are copied into this project and can be removed with Start a new project.')}</label>
    <input type="file" id="files" multiple accept=".pdf,.docx,.xlsx,.xls,.csv"> ${st.uploaded ? `<span class="muted">Uploaded: ${esc(st.uploaded.join(', '))}</span>` : ''}
    <p class="muted" style="margin:10px 0 0">or</p>${f('folder', 'Use a folder on this computer', st.uploaded ? '' : st.folder, 'placeholder="C:\\Users\\you\\Documents\\Invoices"', 'StreamGraph reads the files where they are and checks the folder for new, changed and removed files. Your files are never changed.')}
    <p class="muted small">Files are only read: macros are never run and links inside files are never opened. Scanned PDFs (pictures of text) need OCR, which is not included.</p>`;
  if (k === 'api') form = f('url', 'Web address', st.url, 'placeholder="https://example.com/api/customers"') + f('secret', 'Access key (optional)', '', 'type="password" autocomplete="off" placeholder="Stored on the server only"', 'Sent to the server once and kept there. It is never shown again or kept in your browser.');
  if (k === 'database') form = `<label>Kind of database</label><select id="driver">${opts([['postgres', 'PostgreSQL'], ['sqlite', 'SQLite file']], st.driver || 'postgres')}</select>
    <div id="pgf" style="display:${st.driver === 'sqlite' ? 'none' : 'block'}">${f('host', 'Server address', st.host || 'localhost')}${f('port', 'Port', st.port || '5432')}${f('database', 'Database name', st.database)}${f('user', 'Username', st.user)}${f('secret', 'Password', '', 'type="password" autocomplete="off" placeholder="Stored on the server only"', 'Kept on the server only. It is never shown again or sent back to your browser.')}</div>
    <div id="slf" style="display:${st.driver === 'sqlite' ? 'block' : 'none'}">${f('dbfile', 'Database file on the server', st.file, 'placeholder="/path/to/shop.db"')}</div>
    ${W.test?.tables ? `<label>Table</label><select id="table">${opts(['', ...W.test.tables].map(t => [t, t || 'Pick a table…']), st.table)}</select>` : ''}`;
  if (k === 'stream') form = f('brokers', 'Live feed server address', st.brokers, 'placeholder="broker1:9092"') + f('feed', 'Feed name', st.feed, '', 'The name of the live feed you want to follow') + f('user', 'Username (optional)', st.user) + f('secret', 'Password (optional)', '', 'type="password" autocomplete="off" placeholder="Stored on the server only"')
    + `<label>Example message ${tip('Paste one message so we can show you the fields before live data arrives')}</label><textarea id="example" rows="4" cols="60" placeholder='{"order_id": "O1", "customer_id": "C1"}'>${esc(st.example || '')}</textarea>`;
  V().innerHTML = head + `<div class="card"><h2>Connect to your ${KIND[k][1].toLowerCase()}</h2>${form}<div id="res">${W.test ? `<div class="msg ${W.test.ok ? 'ok' : 'err'}">${esc(W.test.message)}</div>` : ''}</div>
    <p><button id="back">Back</button> <button id="test">${k === 'documents' ? 'Scan folder' : 'Test connection'}</button> <button class="primary" id="next" ${W.test?.ok && (k !== 'database' || st.table) ? '' : 'disabled'}>Next</button></p></div>`;
  $('#driver') && ($('#driver').onchange = e => { st.driver = e.target.value; $('#pgf').style.display = st.driver === 'sqlite' ? 'none' : 'block'; $('#slf').style.display = st.driver === 'sqlite' ? 'block' : 'none'; });
  $('#file') && ($('#file').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    $('#res').innerHTML = '<div class="msg info">Uploading…</div>';
    const r = await fetch('/api/studio/upload?name=' + encodeURIComponent(file.name), { method: 'POST', body: file }).then(r => r.json());
    if (r.error) { $('#res').innerHTML = `<div class="msg err">${esc(r.error)}</div>`; return; }
    st.path = r.path; st.fileName = file.name; await runTest();
  });
  $('#files') && ($('#files').onchange = async e => {
    const files = [...e.target.files]; if (!files.length) return;
    W.docTok ??= Date.now().toString(36); const names = [];
    for (const file of files) {
      $('#res').innerHTML = `<div class="msg info">Uploading ${esc(file.name)}…</div>`;
      const r = await fetch(`/api/studio/upload?folder=${W.docTok}&name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file }).then(r => r.json());
      if (r.error) { $('#res').innerHTML = `<div class="msg err">${esc(file.name)}: ${esc(r.error)}</div>`; return; }
      st.folder = r.folder; names.push(file.name);
    }
    st.uploaded = [...new Set([...(st.uploaded || []), ...names])]; await runTest(true);
  });
  $('#table') && ($('#table').onchange = async e => { st.table = e.target.value; await runTest(); });
  $('#back').onclick = () => { W.step = 1; wizard(); };
  $('#test').onclick = runTest;
  $('#next').onclick = () => { W.step = 3; wizard(); };
  async function runTest(fromUpload) {
    const v = id => $('#' + id)?.value?.trim();
    if (k === 'documents' && fromUpload !== true && v('folder')) Object.assign(st, { folder: v('folder'), uploaded: null });
    if (k === 'api') Object.assign(st, { url: v('url') });
    if (k === 'database') Object.assign(st, st.driver === 'sqlite' ? { file: v('dbfile') } : { host: v('host'), port: v('port'), database: v('database'), user: v('user') }, { driver: st.driver || 'postgres' });
    if (k === 'stream') Object.assign(st, { brokers: v('brokers'), feed: v('feed'), user: v('user'), example: $('#example').value });
    if ($('#secret')?.value) W.secret = $('#secret').value;
    $('#res').innerHTML = '<div class="msg info">Testing…</div>';
    const { fileName, ...settings } = st;
    W.test = await api('/api/studio/test', { kind: k, settings, secret: W.secret, name: fileName || '' });
    if (W.test.itemsPath) st.itemsPath = W.test.itemsPath;
    if (W.test.timeColumn) st.changedColumn = W.test.timeColumn;
    delete W.entity; delete W.key; delete W.fields; delete W.docTables;
    if (k === 'documents' && W.test.ok) W.docTables = W.test.groups.map(g => ({ sig: g.sig, on: g.recommended, entity: g.suggestion.entity, key: g.suggestion.key }));
    connectStep(head);
  }
}

// Documents: step 3 previews what was read and the tables found; step 4 turns tables into things.
function documentsStep(head) {
  const t = W.test, from = r => `${r.source_file}${r.source_location === 'file' ? '' : ` · ${r.source_location}`}${r.source_location === 'file' || /^sheet/.test(r.source_location) ? ' · row ' : ' · table row '}${r.source_row}`;
  const pv = g => table(g.preview.map(r => ({ ...Object.fromEntries(g.columns.map(c => [c, r[c]])), 'Found in': from(r) })), [...g.columns, 'Found in']);
  if (W.step === 3) {
    V().innerHTML = head + `<div class="card"><h2>Here is what we found</h2><p class="muted">${esc(t.message)}</p>
      <table><tr><th></th><th>File</th><th>Type</th><th>Size</th><th>Pages / sheets</th><th>Tables</th><th>Notes</th></tr>${t.documents.map(d => `<tr><td>${d.ok ? '✅' : '⛔'}</td><td><b>${esc(d.file)}</b>${d.title ? `<div class="small muted">${esc(d.title)}</div>` : ''}</td><td>${esc(d.type)}</td><td>${kb(d.size)}</td>
        <td>${esc(d.pages ? `${d.pages} page${d.pages === 1 ? '' : 's'}` : d.sheets || '')}</td><td>${d.ok ? d.tables : ''}</td><td class="small">${d.problem ? `<span class="msg err small" style="display:inline-block;margin:0">${esc(d.problem)}</span>` : esc((d.notes || []).join(' '))}</td></tr>`).join('')}</table>
      ${t.skipped?.length ? `<p class="small muted">Skipped (not a supported type): ${esc(t.skipped.slice(0, 8).join(', '))}${t.skipped.length > 8 ? '…' : ''}</p>` : ''}</div>
      <div class="card"><h2>Tables we found</h2>${t.groups.length ? t.groups.map(g => `<div class="card suggest"><b>${esc(g.sentence)}</b><div class="small muted" style="margin:4px 0 8px">${g.rowCount} row${g.rowCount === 1 ? '' : 's'}</div><div style="overflow:auto">${pv(g)}</div></div>`).join('')
        : '<p class="muted">No tables found. Each file will still be saved as a Document with its text and details.</p>'}
      <p><button id="back">Back</button> <button class="primary" id="next">Looks right</button></p></div>`;
    $('#back').onclick = () => { W.step = 2; wizard(); }; $('#next').onclick = () => { W.step = 4; wizard(); };
    return;
  }
  const known = [...new Set([...WS.workspace.sources.filter(x => x.kind !== 'documents').map(x => x.entity), ...W.docTables.map(x => x.entity), 'Customer', 'Order', 'Product', 'Supplier', 'Invoice', 'Employee', 'Location'])];
  V().innerHTML = head + `<div class="card"><h2>What is in these tables?</h2><p class="muted">Every file is saved as a <b>Document</b> with its details and text. For each table, pick what one row is about, or keep it as plain table rows. Rows of the same type from different sources are combined.</p>
    ${t.groups.map((g, i) => { const d = W.docTables[i], isNew = !known.includes(d.entity); return `<div class="card suggest"><div class="small muted">${esc(g.tables.map(x => `${x.file} · ${x.location}`).join('; '))} · columns: ${esc(g.columns.join(', '))}</div>
      <div class="qb" style="margin-top:8px"><label class="inl" style="margin:0"><input type="checkbox" data-on="${i}" ${d.on ? 'checked' : ''}> Turn each row into a…</label>
      <select data-ent="${i}">${opts([...known.map(k => [k, k]), ['__new', 'Something else…']], isNew ? '__new' : d.entity)}</select><input data-entnew="${i}" placeholder="For example Asset" size="12" style="display:${isNew ? 'inline-block' : 'none'}" value="${isNew ? esc(d.entity) : ''}">
      identified by <select data-key="${i}">${opts(g.columns.map(c => [c, c + (c === g.suggestion.key ? ' (suggested)' : '')]), d.key)}</select></div>
      <div class="small muted" style="margin-top:6px">${d.on ? `Each row becomes ${an(d.entity)} ${esc(d.entity)} with all ${g.columns.length} columns, plus where it came from.` : 'Kept as table rows (you can still search and export them).'}</div></div>`; }).join('') || '<p class="muted">No tables found, so there is nothing to choose here.</p>'}
    <p><button id="back">Back</button> <button class="primary" id="next">Next</button></p></div>`;
  const read = () => W.docTables.forEach((d, i) => { d.on = $(`[data-on="${i}"]`).checked; const e = $(`[data-ent="${i}"]`).value; d.entity = e === '__new' ? $(`[data-entnew="${i}"]`).value.trim() : e; d.key = $(`[data-key="${i}"]`).value; });
  document.querySelectorAll('[data-ent]').forEach(x => x.onchange = () => { $(`[data-entnew="${x.dataset.ent}"]`).style.display = x.value === '__new' ? 'inline-block' : 'none'; });
  document.querySelectorAll('[data-on]').forEach(x => x.onchange = () => { read(); documentsStep(head); });
  $('#back').onclick = () => { read(); W.step = 3; wizard(); };
  $('#next').onclick = () => { read(); const bad = W.docTables.find(d => d.on && (!/^[A-Za-z]\w*$/.test(d.entity) || ['Document', 'Section', 'Table', 'Row'].includes(d.entity)));
    if (bad) return alert('Give each type a simple name using letters, like Asset. Document, Section, Table and Row are taken.'); W.step = 5; wizard(); };
}

// ---------------- Connect your sources (federation)
let L = null;
async function link() {
  V().innerHTML = '<h1>Connect your sources</h1><div class="card">Looking for matches…</div>';
  const s = await api('/api/studio/suggestions'); const R = WS.rules;
  if (s.sources.length < 2) { V().innerHTML = `<h1>Connect your sources</h1><div class="card empty"><div class="big">🔗</div>Add at least two sources and we will suggest how they fit together.<p><a class="btn" href="#add">Add a data source</a></p></div>`; return; }
  L = { matches: s.matches.map(m => ({ ...m, on: true })), relationships: s.relationships.map(r => ({ ...r, on: true })), sources: s.sources };
  for (const r of s.current.relationships) if (!L.relationships.some(x => x.source === r.source && x.field === r.field)) L.relationships.push({ ...r, on: true, sentence: `Each ${s.sources.find(x => x.id === r.source)?.entity} belongs to ${an(r.toEntity)} ${r.toEntity} via ${r.field}` });
  const name = id => s.sources.find(x => x.id === id)?.name, cols = id => s.sources.find(x => x.id === id)?.columns || [];
  const draw = () => {
    V().innerHTML = `<h1>Connect your sources</h1><p class="muted">We compared your sources and found records that look like the same things, and fields that point from one thing to another. Accept, adjust, then preview before you confirm.</p>
    <div class="card"><h2>Same things in different sources</h2>${L.matches.length ? L.matches.map((m, i) => `<div class="card suggest"><label style="margin:0"><input type="checkbox" data-m="${i}" ${m.on ? 'checked' : ''}> <b>${esc(m.sentence)}</b></label>
      <div class="qb" style="margin-top:8px">Match <select data-mf="${i}:a">${opts(cols(m.a.source), m.a.field)}</select> in ${esc(name(m.a.source))} with <select data-mf="${i}:b">${opts(cols(m.b.source), m.b.field)}</select> in ${esc(name(m.b.source))}, comparing
      <select data-mr="${i}">${opts(Object.entries(R), m.rule)}</select> ${tip('Exactly the same: values must match letter for letter. Ignore case and spaces: " C1" and "c1" match. Same ID: "C-001" and "c001" match.')}</div>
      <div class="small muted" style="margin-top:6px">For example: ${m.examples.map(([a, b]) => `“${esc(a)}” ↔ “${esc(b)}”`).join(', ')}</div></div>`).join('') : '<p class="muted">No obvious matches yet. Sources about the same kind of thing (for example two Customer lists) are compared here.</p>'}</div>
    <div class="card"><h2>How things relate</h2>${L.relationships.map((r, i) => `<div class="card suggest rel"><label style="margin:0"><input type="checkbox" data-r="${i}" ${r.on ? 'checked' : ''}> ${esc(r.sentence)}</label></div>`).join('') || '<p class="muted">No links found yet.</p>'}
      <div class="qb"><b>Add a link:</b> Each <select id="nrs">${opts(s.sources.map(x => [x.id, `${x.entity} (${x.name})`]))}</select> belongs to a(n) <input id="nrt" placeholder="Category" size="12"> via <select id="nrf"></select> <button id="nra">Add</button></div></div>
    <div class="card"><button id="pv">Preview linked records</button> <button class="good" id="ok">Confirm and link</button><div id="sample"></div></div>`;
    const fillF = () => { $('#nrf').innerHTML = opts(cols($('#nrs').value)); }; fillF(); $('#nrs').onchange = fillF;
    document.querySelectorAll('[data-m]').forEach(c => c.onchange = () => L.matches[c.dataset.m].on = c.checked);
    document.querySelectorAll('[data-r]').forEach(c => c.onchange = () => L.relationships[c.dataset.r].on = c.checked);
    document.querySelectorAll('[data-mr]').forEach(c => c.onchange = () => L.matches[c.dataset.mr].rule = c.value);
    document.querySelectorAll('[data-mf]').forEach(c => c.onchange = () => { const [i, side] = c.dataset.mf.split(':'); L.matches[i][side].field = c.value; });
    $('#nra').onclick = () => { const src = s.sources.find(x => x.id === $('#nrs').value), to = $('#nrt').value.trim(); if (!/^[A-Za-z]\w*$/.test(to)) return alert('Type a simple name such as Category.');
      const T = to[0].toUpperCase() + to.slice(1); L.relationships.push({ source: src.id, field: $('#nrf').value, toEntity: T, on: true, sentence: `Each ${src.entity} belongs to ${an(T)} ${T} via ${$('#nrf').value}` }); draw(); };
    $('#pv').onclick = preview; $('#ok').onclick = async () => { await api('/api/studio/links', draft()); await loadWs(); location.hash = '#explore'; };
  };
  const draft = () => ({ matches: L.matches.filter(m => m.on), relationships: L.relationships.filter(r => r.on) });
  async function preview() {
    $('#sample').innerHTML = '<div class="msg info">Building a preview…</div>';
    try {
      const r = await api('/api/studio/linked-sample', draft());
      $('#sample').innerHTML = Object.entries(r.entities).map(([label, e]) => `<h2 style="margin-top:14px">${esc(label)}s: ${e.total} in total, ${e.inSeveral} combined from more than one source</h2>
        ${e.examples.length ? table(e.examples.map(x => ({ [label]: x.props.name || x.key, 'Found in': x.sources.join(' + '), ...x.props }))) : '<p class="muted">Only one source has these, so there is nothing to combine.</p>'}`).join('')
        + r.relationships.map(x => `<p><b>${esc(x.sentence)}</b>: ${x.links} links, for example ${x.examples.map(esc).join('; ') || 'none'}</p>`).join('');
    } catch (e) { $('#sample').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
  }
  draw();
}

// ---------------- Clean up
const C = { sourceId: null, steps: [] };
function describe(c) {
  const p = WS.presets[c.do]?.label || c.do;
  if (c.do === 'combine') return `Combine ${c.fields.join(' + ')} into “${c.into}”`;
  if (c.do === 'keepIf') return `Keep only rows where ${c.field} ${c.op}${c.op === 'is not empty' ? '' : ` “${c.value}”`}`;
  if (c.do === 'parseDate') return `Read ${c.field} as a date (${c.format})`;
  return `${p}: ${c.field}`;
}
async function clean() {
  const srcs = WS.workspace.sources;
  if (!srcs.length) { V().innerHTML = `<h1>Clean up</h1><div class="card empty"><div class="big">🧹</div>Add a data source first, then tidy its fields here.</div>`; return; }
  if (!srcs.some(s => s.id === C.sourceId)) { C.sourceId = srcs[0].id; C.steps = structuredClone(srcs[0].cleanup || []); }
  const cols = (await api('/api/studio/cleanup-preview', { sourceId: C.sourceId, cleanup: [] })).before.flatMap(Object.keys).filter((v, i, a) => a.indexOf(v) === i);
  const P = WS.presets;
  V().innerHTML = `<h1>Clean up</h1><p class="muted">Tidy your data before it is saved to graph. Changes apply to new and existing records.</p>
  <div class="card"><label style="margin-top:0">Source</label><select id="src">${opts(srcs.map(s => [s.id, s.name]), C.sourceId)}</select>
    <h2 style="margin-top:14px">Steps</h2>${C.steps.length ? `<ol>${C.steps.map((c, i) => `<li>${esc(describe(c))} <button data-x="${i}" title="Remove this step">✕</button></li>`).join('')}</ol>` : '<p class="muted">No clean-up steps yet.</p>'}
    <div class="qb"><b>Add:</b><select id="pre">${opts(Object.entries(P).map(([k, v]) => [k, v.label]))}</select><select id="fld">${opts(cols)}</select><span id="extra"></span><button id="add">Add step</button></div>
    <div id="err"></div></div>
  <div class="card"><h2>Before and after <span class="muted small" id="kept"></span></h2><div class="grid2"><div><b>Before</b><div id="bef" style="overflow:auto"></div></div><div><b>After</b><div id="aft" style="overflow:auto"></div></div></div>
    <p><button class="good" id="save">Save clean-up</button></p></div>`;
  const extra = () => { const k = $('#pre').value;
    $('#extra').innerHTML = k === 'combine' ? `+ <select id="f2">${opts(cols)}</select> into <input id="into" placeholder="full_name" size="12"> with <input id="sep" value=" " size="2">`
      : k === 'keepIf' ? `<select id="op">${opts(P.keepIf.options.op)}</select><input id="val" size="12" placeholder="value">` : k === 'parseDate' ? `<select id="fmt">${opts(P.parseDate.options.format.map(f => [f, f === 'auto' ? 'Figure it out' : f]))}</select>` : ''; };
  extra(); $('#pre').onchange = extra;
  $('#src').onchange = e => { C.sourceId = e.target.value; C.steps = structuredClone(srcs.find(s => s.id === C.sourceId).cleanup || []); clean(); };
  document.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { C.steps.splice(+b.dataset.x, 1); clean(); });
  $('#add').onclick = () => { const k = $('#pre').value, field = $('#fld').value, step = { do: k, field };
    if (k === 'combine') Object.assign(step, { fields: [field, $('#f2').value], into: $('#into').value.trim(), separator: $('#sep').value });
    if (k === 'combine' && !step.into) return $('#err').innerHTML = '<div class="msg err">Pick a name for the combined field.</div>';
    if (k === 'keepIf') Object.assign(step, { op: $('#op').value, value: $('#val').value });
    if (k === 'parseDate') step.format = $('#fmt').value;
    C.steps.push(step); clean(); };
  $('#save').onclick = async () => { try { await api('/api/studio/cleanup', { sourceId: C.sourceId, cleanup: C.steps }); await loadWs(); $('#err').innerHTML = '<div class="msg ok">Saved. Your graph is updating.</div>'; } catch (e) { $('#err').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; } };
  try {
    const r = await api('/api/studio/cleanup-preview', { sourceId: C.sourceId, cleanup: C.steps });
    const ac = [...new Set(r.after.filter(Boolean).flatMap(Object.keys))];
    $('#bef').innerHTML = table(r.before, cols);
    $('#aft').innerHTML = `<table><tr>${ac.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${r.after.map((a, i) => a ? `<tr>${ac.map(c => `<td class="${String(a[c]) !== String(r.before[i][c]) ? 'changed' : ''}">${esc(a[c])}</td>`).join('')}</tr>` : `<tr class="dropped">${ac.map(c => `<td>${esc(r.before[i][c])}</td>`).join('')}</tr>`).join('')}</table>`;
    $('#kept').textContent = `${r.kept} of ${r.before.length} example rows kept`;
  } catch (e) { $('#err').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
}

// ---------------- Explore
let Q = null, M = null, cyx = null, lastAns = null;
const OPS = ['is', 'is not', 'contains', 'more than', 'less than', 'has a value'];
async function explore() {
  M = await api('/api/studio/explore');
  if (!M.entities.length) { V().innerHTML = `<h1>Explore</h1><div class="card empty"><div class="big">🔎</div>Your graph is empty. Add a data source or try the demo data on the Home page.</div>`; return; }
  Q ??= M.ideas[0]?.question || { entity: M.entities[0].label, filters: [], related: null };
  const ent = l => M.entities.find(e => e.label === l) || M.entities[0];
  const filterRow = (f, path, i, e) => { const fld = e.fields[f.field] || {}; const vals = fld.values || [];
    return `<span class="qb">where <select data-ff="${path}:${i}">${opts(Object.keys(e.fields), f.field)}</select><select data-fo="${path}:${i}">${opts(OPS, f.op)}</select>
      ${f.op === 'has a value' ? '' : vals.length && !fld.many && !['contains', 'more than', 'less than'].includes(f.op) ? `<select data-fv="${path}:${i}">${opts(vals, f.value)}</select>` : `<input data-fv="${path}:${i}" value="${esc(f.value ?? '')}" size="10">`}<button data-fx="${path}:${i}" title="Remove filter">✕</button></span>`; };
  const e0 = ent(Q.entity), rel = e0.related;
  V().innerHTML = `<h1>Explore</h1>${exploreTabs('ask')}
  <div class="card"><div class="qb"><input id="search" placeholder="Search everything, for example Ada or Trail Shoe" size="50"><button id="go">Search</button></div><div id="sres"></div></div>
  <div class="card"><h2>Ask a question</h2><div>${M.ideas.map((x, i) => `<button class="chip" data-idea="${i}">${esc(x.text)}</button>`).join('')}</div>
    <div class="qb" style="margin-top:10px"><b>Show</b><select id="qe">${opts(M.entities.map(e => [e.label, `${e.label}s (${e.count})`]), Q.entity)}</select>
      ${(Q.filters || []).map((f, i) => filterRow(f, 'a', i, e0)).join('')}<button id="addf">+ filter</button></div>
    <div class="qb" style="margin-top:8px"><b>and their</b><select id="qr">${opts([['', '(nothing else)'], ...rel.map((r, i) => [i, `${r.entity}s`])], Q.related ? rel.findIndex(r => r.edge === Q.related.edge && r.dir === Q.related.dir && r.entity === Q.related.entity) : '')}</select>
      ${Q.related ? (Q.related.filters || []).map((f, i) => filterRow(f, 'b', i, ent(Q.related.entity))).join('') + '<button id="addfb">+ filter</button>' : ''}</div>
    <p><button class="primary" id="ask">Show me</button></p></div>
  <div id="ans"></div>`;
  const F = p => p === 'a' ? Q.filters : Q.related.filters;
  $('#qe').onchange = e => { Q = { entity: e.target.value, filters: [], related: null }; explore(); };
  $('#qr').onchange = e => { Q.related = e.target.value === '' ? null : { ...rel[+e.target.value], filters: [] }; explore(); };
  $('#addf').onclick = () => { const f = Object.keys(e0.fields)[0]; Q.filters.push({ field: f, op: 'is', value: e0.fields[f]?.values[0] }); explore(); };
  $('#addfb') && ($('#addfb').onclick = () => { const e = ent(Q.related.entity), f = Object.keys(e.fields)[0]; Q.related.filters.push({ field: f, op: 'is', value: e.fields[f]?.values[0] }); explore(); });
  document.querySelectorAll('[data-ff]').forEach(s => s.onchange = () => { const [p, i] = s.dataset.ff.split(':'); const e = p === 'a' ? e0 : ent(Q.related.entity); F(p)[i] = { field: s.value, op: 'is', value: e.fields[s.value]?.values[0] }; explore(); });
  document.querySelectorAll('[data-fo]').forEach(s => s.onchange = () => { const [p, i] = s.dataset.fo.split(':'); F(p)[i].op = s.value; explore(); });
  document.querySelectorAll('[data-fv]').forEach(s => s.onchange = () => { const [p, i] = s.dataset.fv.split(':'); const e = p === 'a' ? e0 : ent(Q.related.entity), t = e.fields[F(p)[i].field]?.type; F(p)[i].value = t === 'number' && s.value !== '' && !isNaN(s.value) ? Number(s.value) : s.value; });
  document.querySelectorAll('[data-fx]').forEach(b => b.onclick = () => { const [p, i] = b.dataset.fx.split(':'); F(p).splice(+i, 1); explore(); });
  document.querySelectorAll('[data-idea]').forEach(b => b.onclick = () => { Q = structuredClone(M.ideas[+b.dataset.idea].question); explore().then(ask); });
  $('#ask').onclick = ask;
  $('#go').onclick = search; $('#search').onkeydown = e => e.key === 'Enter' && search();
  if (lastAns) render(lastAns);
}
async function search() {
  const r = await api('/api/studio/search?size=50&q=' + encodeURIComponent($('#search').value));
  $('#sres').innerHTML = (r.offline ? '<div class="msg warn">Search index offline: showing the built-in search (still filtered by your access rules).</div>' : '')
    + (r.results.length ? table(r.results.map(x => ({ Type: x.type, Name: x.name || x.key, ...x.props }))) : '<p class="muted">Nothing found.</p>');
}
async function ask() {
  try { lastAns = await api('/api/studio/ask', { question: Q }); render(lastAns); } catch (e) { $('#ans').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; }
}
function render(r) {
  const cols = r.columns;
  $('#ans').innerHTML = `<div class="card"><h2>${r.count} result${r.count === 1 ? '' : 's'} <button id="csv" style="float:right">Download CSV</button></h2>${r.masked?.length || r.hidden ? `<div class="msg info small">🔒 ${r.masked.length ? `Hidden by your access rules: ${esc(r.masked.join(', '))}.` : ''} ${r.hidden ? `${r.hidden} result${r.hidden === 1 ? '' : 's'} left out.` : ''}</div>` : ''}<div style="display:grid;grid-template-columns:3fr 2fr;gap:14px"><div style="overflow:auto;max-height:440px">${r.count ? table(r.table, cols) : '<p class="muted">No matches. Try removing a filter.</p>'}</div><div id="cy"></div></div></div>`;
  $('#csv').onclick = async () => { // built on the server so export rules and masking apply
    const res = await fetch('/api/studio/export.csv', { method: 'POST', headers: { 'content-type': 'application/json', ...(AS ? { 'x-sg-as': AS } : {}) }, body: JSON.stringify({ question: Q }) });
    if (!res.ok) { alert((await res.json()).error); return; }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(await res.blob()), download: 'streamgraph-results.csv' }); a.click();
  };
  const els = new Map(), colors = ['#2563eb', '#1f9d55', '#e8a317', '#9b51e0', '#d92d20'], col = {};
  for (const row of r.graph) { const ns = Object.values(row).filter(x => x.label);
    ns.forEach(n => els.set(n.id, { data: { id: n.id, label: n.props.name || n.key, c: col[n.label] ??= colors[Object.keys(col).length % 5] } }));
    if (ns[1]) els.set(ns[0].id + '>' + ns[1].id, { data: { id: ns[0].id + '>' + ns[1].id, source: ns[0].id, target: ns[1].id } }); }
  cyx = cytoscape({ container: $('#cy'), elements: [...els.values()], layout: { name: 'cose', animate: false, padding: 20 },
    style: [{ selector: 'node', style: { label: 'data(label)', 'background-color': 'data(c)', 'font-size': 11, width: 22, height: 22, 'text-valign': 'bottom' } },
      { selector: 'edge', style: { width: 1.5, 'line-color': '#b8c0cc', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#b8c0cc', 'curve-style': 'bezier' } }] });
}

// ---------------- Start a new project (reset)
async function resetDialog() {
  const h = await api('/api/studio/home');
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="rt"><h2 id="rt">Start a new project?</h2>
    <p>This deletes everything in this project and takes you back to the start. It can't be undone.</p>
    <ul><li>${h.sources.length} connected source${h.sources.length === 1 ? '' : 's'}${h.sources.length ? ` (${h.sources.map(s => esc(s.name)).join(', ')})` : ''}</li>
      <li>${h.counts.nodes.toLocaleString()} things and ${h.counts.edges.toLocaleString()} connections in your graph</li>
      <li>Saved passwords and access keys</li><li>Uploaded files, matching rules, links and clean-up steps</li></ul>
    <p class="muted small">Your original files and databases are not touched. Syncing stops right away.</p>
    <p><a class="btn" href="/api/studio/backup" download id="bk">⬇ Download a backup first</a> <span class="muted small">(settings and graph as JSON, without passwords)</span></p>
    <label for="rc">Type <b>RESET</b> to confirm</label><input id="rc" autocomplete="off" placeholder="RESET">
    <div id="rerr"></div><p style="text-align:right"><button id="rno">Cancel</button> <button class="danger" id="ryes" disabled>Delete everything and start over</button></p></div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  $('#rno').onclick = close; bg.onclick = e => e.target === bg && close();
  document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
  $('#rc').oninput = e => { $('#ryes').disabled = e.target.value.trim().toUpperCase() !== 'RESET'; };
  $('#rc').focus();
  $('#ryes').onclick = async () => {
    $('#ryes').disabled = true; $('#ryes').textContent = 'Deleting…';
    try {
      await api('/api/studio/reset', { confirm: 'RESET' });
      for (const k of Object.keys(W)) delete W[k]; W.step = 1; Q = null; lastAns = null; L = null; C.sourceId = null; C.steps = [];
      close(); await loadWs(); location.hash = '#home'; route();
    } catch (e) { $('#rerr').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; $('#ryes').textContent = 'Delete everything and start over'; }
  };
}
async function settings() {
  const h = await api('/api/studio/home');
  V().innerHTML = `<h1>Settings</h1>
  <div class="card"><h2>This project</h2><p>${esc(WS.workspace.name)} · ${h.sources.length} sources · ${h.counts.nodes.toLocaleString()} things in your graph</p>
    <p><a class="btn" href="/api/studio/backup" download>⬇ Download a backup</a> <span class="muted small">Settings and graph as a JSON file. Passwords and access keys are not included.</span></p></div>
  <div class="card" style="border-color:#f3b4ae"><h2 style="color:#9b1c13">Start a new project</h2><p class="muted">Stop syncing and delete all sources, saved passwords, uploaded files and everything in your graph. Your original files and databases are not touched.</p>
    <button class="danger" id="reset">Start a new project…</button></div>`;
  $('#reset').onclick = resetDialog;
}


// ---------------- Send data out (live output connectors)
const SINK = {
  neo4j: ['🟢', 'Neo4j', 'Keep a Neo4j graph database up to date', [['url', 'Address', 'bolt://127.0.0.1:7687'], ['user', 'User name', 'neo4j'], ['database', 'Database (optional)', 'neo4j']]],
  memgraph: ['🟠', 'Memgraph', 'Keep a Memgraph database up to date', [['url', 'Address', 'bolt://127.0.0.1:7687'], ['user', 'User name (optional)', '']]],
  postgres: ['🐘', 'PostgreSQL', 'Write things and connections into two tables', [['host', 'Server', '127.0.0.1'], ['port', 'Port', '5432'], ['database', 'Database', 'postgres'], ['user', 'User name', 'postgres'], ['tablePrefix', 'Table name prefix', 'sg_']]],
  kafka: ['📡', 'Kafka / Confluent', 'Publish every change to a live feed (topic)', [['brokers', 'Servers', '127.0.0.1:9092'], ['topic', 'Live feed (topic) name', 'streamgraph.graph'], ['user', 'API key (Confluent Cloud, optional)', '']]],
  opensearch: ['🔎', 'OpenSearch', 'A search index: fast, typo-tolerant search that keeps your access rules', [['url', 'Address', 'http://127.0.0.1:9200'], ['user', 'User name (optional; leave empty for a local index without login)', ''], ['index', 'Index name prefix', 'streamgraph-']]],
};
const S = { kind: null };
async function syncout() {
  const r = await api('/api/studio/sinks');
  const st = id => r.status.find(s => s.id === id) || {};
  const word = { green: 'Up to date', amber: 'Catching up', red: 'Problem' };
  V().innerHTML = `<h1>Send data out</h1><p class="muted">Keep another database or a live feed in step with your graph. Changes are sent within a few seconds, and StreamGraph remembers where each one got to, so nothing is lost if the app restarts. Hidden fields stay hidden: data is sent as the user you pick, under your access rules.</p>
  ${r.sinks.length ? `<div class="card"><h2>Your outputs</h2><table><tr><th>Output</th><th>Status</th><th>Sent as</th><th>Waiting to send</th><th>Sent so far</th><th>Last sent</th><th></th></tr>${r.sinks.map(s => { const x = st(s.id); return `<tr><td><b>${esc(s.name)}</b><div class="muted small">${esc(SINK[s.kind][1])}</div></td>
    <td><span class="dot ${x.health}"></span>${s.enabled ? word[x.health] : 'Paused'}${s.kind === 'opensearch' ? ' <span class="small muted os-status" data-os="1"></span>' : ''}${x.lastError ? `<div class="msg err small">${esc(x.lastError)}</div>` : ''}</td><td>${esc(r.users.find(u => u.id === s.asUser)?.name || s.asUser)}</td>
    <td>${x.waiting == null ? 'sending everything' : `${x.waiting} change${x.waiting === 1 ? '' : 's'}`}</td><td>${x.sent}</td><td>${ago(x.lastAt)}</td>
    <td><button data-pause="${esc(s.id)}">${s.enabled ? 'Pause' : 'Resume'}</button> <button class="linkish" data-del="${esc(s.id)}">Remove</button></td></tr>`; }).join('')}</table>
    <p><button id="now">Send now</button></p></div>` : ''}
  <div class="card"><h2>${r.sinks.length ? 'Add another output' : 'Where should the data go?'}</h2><div class="types" style="grid-template-columns:repeat(4,1fr)">${Object.entries(SINK).map(([k, [ic, n, d]]) => `<div class="type ${S.kind === k ? 'sel' : ''}" data-kind="${k}"><div class="ic">${ic}</div><b>${n}</b><span class="muted small">${d}</span></div>`).join('')}</div>
  ${S.kind ? `<div class="grid2" style="margin-top:12px"><div><label>Name</label><input id="sn" value="${esc(S.name || `My ${SINK[S.kind][1]}`)}" size="30">
    ${SINK[S.kind][3].map(([f, l, ph]) => `<label>${esc(l)}</label><input data-sf="${f}" placeholder="${esc(ph)}" value="${esc(S.settings?.[f] ?? ph)}" size="30">`).join('')}
    <label>Password ${tip('Stored on this computer only, never shown again or sent to the browser.')}</label><input id="sp" type="password" autocomplete="new-password" size="30"></div>
    <div><label>Send as ${tip('Only data this user may see is sent. Fields hidden from them go out as [hidden].')}</label><select id="sa">${opts(r.users.map(u => [u.id, u.name]), 'sync-service')}</select>
    ${S.kind === 'opensearch' ? '<p class="muted small"><b>Search index:</b> fields hidden from this user are never indexed. Every search is filtered again for the person searching, so you can index as the Owner and an analyst still only finds what they may see. A password is only needed if your OpenSearch has its security plugin on.</p>' : ''}
    <p class="muted small">The built-in "Sync-out service" user has clearance 1, so high and unclassified fields are not sent. Change this on the Access rules page.</p>
    <div id="smsg"></div><p><button id="stest">Test connection</button> <button class="primary" id="ssave">Save and start sending</button></p></div></div>` : ''}</div>`;
  document.querySelectorAll('[data-kind]').forEach(d => d.onclick = () => { S.kind = d.dataset.kind; S.settings = null; S.name = null; syncout(); });
  const form = () => ({ kind: S.kind, name: $('#sn').value, settings: Object.fromEntries([...document.querySelectorAll('[data-sf]')].map(i => [i.dataset.sf, i.value.trim()]).filter(([, v]) => v)), secret: $('#sp').value || undefined, asUser: $('#sa').value });
  if (S.kind) {
    $('#stest').onclick = async () => { $('#smsg').innerHTML = '<div class="msg info">Connecting…</div>'; const t = await api('/api/studio/sinks/test', form()); $('#smsg').innerHTML = `<div class="msg ${t.ok ? 'ok' : 'err'}">${esc(t.message)}</div>`; };
    $('#ssave').onclick = async () => { try { await api('/api/studio/sinks', form()); S.kind = null; syncout(); } catch (e) { $('#smsg').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; } };
  }
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (confirm('Stop sending to this output? Data already sent stays there.')) { await api('/api/studio/sinks?id=' + encodeURIComponent(b.dataset.del), undefined, 'DELETE'); syncout(); } });
  document.querySelectorAll('[data-pause]').forEach(b => b.onclick = async () => { const s = r.sinks.find(x => x.id === b.dataset.pause); await api('/api/studio/sinks', { ...s, secret: undefined, enabled: !s.enabled }); syncout(); });
  if (r.sinks.some(s => s.kind === 'opensearch')) api('/api/studio/search/status').then(st => document.querySelectorAll('[data-os]').forEach(e => { e.textContent = `· ${GS_WORD[st.index] || st.index}${st.docs != null ? `, ${st.docs.toLocaleString()} docs` : ''}`; })).catch(() => {});
  $('#now') && ($('#now').onclick = async () => { await api('/api/studio/sinks/sync-now', {}); syncout(); });
  if (r.sinks.length && !S.kind) timer = setTimeout(() => location.hash === '#syncout' && syncout(), 3000);
}

// ---------------- Access rules (who can see what)
const ACT = { read: 'view', query: 'ask questions about', export: 'export', 'sync-out': 'send out', write: 'edit', admin: 'manage', '*': 'do anything with' };
const LEVEL = [[0, 'Public'], [1, 'Internal'], [2, 'Confidential'], [3, 'Restricted']];
const SENS = [['low', 'Anyone can see'], ['medium', 'Clearance 2 or more'], ['high', 'Clearance 3 only'], ['unclassified', 'Not reviewed yet (hidden below 3)']];
const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a.at(-1);
function sentence(r) {
  const who = r.subjects?.users?.length ? list(r.subjects.users) : (r.subjects?.roles || ['*']).includes('*') ? 'anyone' : `people with the ${list(r.subjects.roles)} role`;
  const cl = r.subjects?.minClearance != null ? ` with clearance ${r.subjects.minClearance} or more` : '';
  const what = (r.resources?.entities || ['*']).includes('*') ? 'all data' : list(r.resources.entities.map(e => e + 's'));
  const tags = r.resources?.tagsAny?.length ? ` tagged ${list(r.resources.tagsAny)}` : '';
  const cond = r.condition === 'clearanceBelowClassification' ? ' when their clearance is below the data\'s level' : '';
  return `${r.effect === 'allow' ? 'Allow' : 'Don\'t allow'} ${who}${cl} to ${list((r.actions || []).map(a => ACT[a] || a))} ${what}${tags}${cond}.`;
}
const R = { as: 'analyst', rule: { effect: 'allow', role: '*', min: '', actions: ['read'], entity: '*', tag: '' } };
async function access() {
  const a = await api('/api/studio/access'), roles = [...new Set(['admin', 'analyst', 'service', ...a.users.map(u => u.role)])];
  const m = await api('/api/studio/access/matrix', { user: R.as });
  const b = R.rule;
  V().innerHTML = `<h1>Access rules</h1>
  <div class="msg info">${esc(a.note)}</div>
  <div class="card" id="testas"><h2>Test as… ${tip('See exactly what another user would be allowed to do and see. Click a ✓ or ✕ to see why.')}</h2>
    <div class="qb">Show what <select id="asu">${opts(a.users.map(u => [u.id, `${u.name} (clearance ${u.clearance})`]), R.as)}</select> can do <button id="prev" class="primary">Preview Explore as this user</button></div>
    <table style="margin-top:10px"><tr><th>Data</th>${Object.keys(ACT).filter(k => k !== '*').map(k => `<th>${ACT[k].replace(/ about$/, '')}</th>`).join('')}<th>Fields they will see</th></tr>
    ${m.entities.map(e => `<tr><td><b>${esc(e.entity)}</b></td>${Object.entries(e.actions).map(([k, d]) => `<td><button class="linkish yn ${d.allow ? 'y' : 'n'}" data-why="${esc(e.entity)}|${k}">${d.allow ? '✓' : '✕'}</button></td>`).join('')}
      <td>${e.fields.map(f => `<span class="fchip ${f.visible ? '' : 'off'}" title="${esc(SENS.find(s => s[0] === f.sensitivity)?.[1])}">${f.visible ? '' : '🔒 '}${esc(f.field)}</span>`).join(' ')}</td></tr>`).join('')}</table><div id="why"></div></div>
  <div class="card"><h2>Rules</h2><p class="muted small">Nobody can do anything unless a rule allows it. A "don't allow" rule always wins over an "allow" rule.</p>
    <table>${a.rules.map(r => `<tr class="${r.enabled === false ? 'dropped' : ''}"><td>${r.effect === 'allow' ? '✅' : '⛔'} ${esc(sentence(r))}${r.locked ? ' <span class="muted small">(built in)</span>' : ''}</td><td style="width:90px">${r.locked ? '' : `<button class="linkish" data-rdel="${esc(r.id)}">Remove</button>`}</td></tr>`).join('')}</table>
    <h2 style="margin-top:14px">Add a rule</h2>
    <div class="qb"><select id="re">${opts([['allow', 'Allow'], ['deny', 'Don\'t allow']], b.effect)}</select><select id="rr">${opts([['*', 'anyone'], ...roles.map(r => [r, `people with the ${r} role`])], b.role)}</select>
      <select id="rm">${opts([['', 'at any clearance'], ['1', 'with clearance 1+'], ['2', 'with clearance 2+'], ['3', 'with clearance 3']], b.min)}</select> to
      ${['read', 'query', 'export', 'sync-out', 'write'].map(k => `<label class="inl"><input type="checkbox" data-ra="${k}" ${b.actions.includes(k) ? 'checked' : ''}> ${ACT[k].replace(/ about$/, '')}</label>`).join('')}
      <select id="rt">${opts([['*', 'all data'], ...a.entities.map(e => [e.label, e.label + 's'])], b.entity)}</select>
      <input id="rg" placeholder="only data tagged… (optional)" value="${esc(b.tag)}" size="18"></div>
    <p class="muted" id="rprev"></p><div id="rmsg"></div><button id="radd" class="primary">Add rule</button></div>
  <div class="card"><h2>What's in your data ${tip('Mark sensitive fields. People only see a field if their clearance is high enough. New fields start as "not reviewed yet" and are hidden from everyone below clearance 3.')}</h2>
    ${a.entities.length ? `<div class="grid2">${a.entities.map(e => `<div class="card" style="margin:0"><h2>${esc(e.label)}</h2>
      <div class="qb small">Level <select data-ecl="${esc(e.label)}">${opts(LEVEL.map(([v, l]) => [v, `${v} · ${l}`]), e.classification)}</select> Tags <input data-etg="${esc(e.label)}" value="${esc((e.tags || []).join(', '))}" placeholder="for example pii" size="14"></div>
      <table>${e.fields.map(f => `<tr><td>${esc(f.field)}</td><td><select data-fs="${esc(e.label)}|${esc(f.field)}" class="${f.sensitivity}">${opts(SENS, f.sensitivity)}</select></td></tr>`).join('') || '<tr><td class="muted">No fields yet</td></tr>'}</table></div>`).join('')}</div>` : '<p class="muted">Add a data source first; its fields will show up here.</p>'}
    <p class="muted small">Data tagged <b>pii</b> is only shown to people whose clearance is at least its level (built-in rule).</p></div>
  <div class="card"><h2>People ${tip('A simple local list until real sign-in (OAuth 2.0 / Keycloak) is added.')}</h2>
    <table><tr><th>Name</th><th>Role</th><th>Clearance</th><th></th></tr>${a.users.map(u => `<tr><td>${esc(u.name)} <span class="muted small">${esc(u.id)}</span></td><td>${esc(u.role)}</td><td><select data-uc="${esc(u.id)}">${opts([0, 1, 2, 3], u.clearance)}</select></td><td>${u.id === 'owner' ? '' : `<button class="linkish" data-udel="${esc(u.id)}">Remove</button>`}</td></tr>`).join('')}</table>
    <div class="qb" style="margin-top:8px"><input id="un" placeholder="Name" size="16"><select id="ur">${opts(roles, 'analyst')}</select><select id="ucl">${opts([[0, 'clearance 0'], [1, 'clearance 1'], [2, 'clearance 2'], [3, 'clearance 3']], 1)}</select><button id="uadd">Add person</button></div></div>
  <details class="card"><summary><b>Advanced: also ask an OPA server</b></summary><p class="muted small">Off by default. When on, an "allow" here must also be allowed by OPA (same input as a Kafka authorizer: input.action.operation, resourcePattern, requestContext.principal). If OPA can't be reached or gives no clear answer, access is denied.</p>
    <label class="inl"><input type="checkbox" id="oon" ${a.settings.opa.enabled ? 'checked' : ''}> Use OPA</label><label>Decision address</label><input id="ourl" size="60" value="${esc(a.settings.opa.url)}"><label>Token (optional) ${a.settings.opa.hasToken ? '<span class="muted small">saved</span>' : ''}</label><input id="otok" type="password" size="30"> <button id="osave">Save</button></details>
  <div class="card"><h2>Recent decisions</h2>${a.audit.length ? table(a.audit.slice(0, 12).map(x => ({ When: new Date(x.at).toLocaleTimeString(), Who: x.user, Did: ACT[x.action] || x.action, What: x.entity, Via: x.via || '', Result: x.allow ? 'allowed' : 'denied', Why: x.why }))) : '<p class="muted">Nothing yet.</p>'}<p class="muted small">Full log: data/audit.ndjson</p></div>`;
  const refresh = () => access();
  $('#asu').onchange = e => { R.as = e.target.value; refresh(); };
  $('#prev').onclick = () => { setAs(R.as); location.hash = '#explore'; };
  document.querySelectorAll('[data-why]').forEach(x => x.onclick = () => { const [en, ac] = x.dataset.why.split('|'), d = m.entities.find(e => e.entity === en).actions[ac];
    $('#why').innerHTML = `<div class="msg ${d.allow ? 'ok' : 'err'}"><b>Why can ${esc(m.user.name)} ${d.allow ? '' : 'not '}${esc(ACT[ac])} ${esc(en)}s?</b><ol>${d.trace.map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>`; });
  const readRule = () => { b.effect = $('#re').value; b.role = $('#rr').value; b.min = $('#rm').value; b.actions = [...document.querySelectorAll('[data-ra]:checked')].map(i => i.dataset.ra); b.entity = $('#rt').value; b.tag = $('#rg').value.trim().toLowerCase();
    return { effect: b.effect, subjects: { roles: [b.role], ...(b.min ? { minClearance: Number(b.min) } : {}) }, actions: b.actions, resources: { entities: [b.entity], ...(b.tag ? { tagsAny: b.tag.split(/[, ]+/).filter(Boolean) } : {}) } }; };
  const showRule = () => { const r = readRule(); $('#rprev').textContent = r.actions.length ? sentence(r) : 'Pick at least one thing people can do.'; };
  document.querySelectorAll('#re,#rr,#rm,#rt,#rg,[data-ra]').forEach(x => (x.oninput = x.onchange = showRule)); showRule();
  $('#radd').onclick = async () => { const r = readRule(); try { await api('/api/studio/access/rule', { rule: { ...r, name: sentence(r) } }); R.rule = { effect: 'allow', role: '*', min: '', actions: ['read'], entity: '*', tag: '' }; refresh(); } catch (e) { $('#rmsg').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; } };
  document.querySelectorAll('[data-rdel]').forEach(x => x.onclick = async () => { await api('/api/studio/access/rule?id=' + encodeURIComponent(x.dataset.rdel), undefined, 'DELETE'); refresh(); });
  document.querySelectorAll('[data-fs]').forEach(x => x.onchange = async () => { const [entity, field] = x.dataset.fs.split('|'); await api('/api/studio/access/field', { entity, field, sensitivity: x.value }); refresh(); });
  document.querySelectorAll('[data-ecl]').forEach(x => x.onchange = async () => { await api('/api/studio/access/entity', { entity: x.dataset.ecl, classification: Number(x.value), tags: document.querySelector(`[data-etg="${x.dataset.ecl}"]`).value.split(',') }); refresh(); });
  document.querySelectorAll('[data-etg]').forEach(x => x.onchange = async () => { await api('/api/studio/access/entity', { entity: x.dataset.etg, classification: Number(document.querySelector(`[data-ecl="${x.dataset.etg}"]`).value), tags: x.value.split(',') }); refresh(); });
  document.querySelectorAll('[data-uc]').forEach(x => x.onchange = async () => { const u = a.users.find(y => y.id === x.dataset.uc); await api('/api/studio/access/user', { ...u, clearance: Number(x.value) }); refresh(); });
  document.querySelectorAll('[data-udel]').forEach(x => x.onclick = async () => { await api('/api/studio/access/user?id=' + encodeURIComponent(x.dataset.udel), undefined, 'DELETE'); refresh(); });
  $('#uadd').onclick = async () => { const n = $('#un').value.trim(); if (!n) return; await api('/api/studio/access/user', { id: n.toLowerCase().replace(/[^\w.-]+/g, '-'), name: n, role: $('#ur').value, clearance: Number($('#ucl').value) }); refresh(); };
  $('#osave').onclick = async () => { try { await api('/api/studio/access/opa', { enabled: $('#oon').checked, url: $('#ourl').value.trim(), token: $('#otok').value || undefined }); refresh(); } catch (e) { alert(e.message); } };
}


// ---------------- Explore: graph explorer tab (the full interactive explorer, studio-styled, same access rules)
const plural = w => /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + 'ies' : /(s|x|ch|sh)$/i.test(w) ? w + 'es' : w + 's';
const exploreTabs = on => `<div class="subtabs" role="tablist"><a href="#explore" role="tab" class="${on === 'ask' ? 'on' : ''}">Search and ask</a><a href="#explore-graph" role="tab" class="${on === 'graph' ? 'on' : ''}">Graph explorer</a></div>`;
const gxSrc = () => { const f = sessionStorage.getItem('sg-focus'); sessionStorage.removeItem('sg-focus'); if (!f) return '/explore/studio'; const m = JSON.parse(f); return `/explore/studio?focus=${encodeURIComponent(m.id)}&focusName=${encodeURIComponent(m.name || '')}${m.geo ? `&flat=${m.geo.lat}&flon=${m.geo.lon}` : ''}`; };
async function exploreGraph() {
  V().innerHTML = `<h1>Explore</h1>${exploreTabs('graph')}<p class="muted small" style="margin:-4px 0 8px">Tools on the left, measures and questions under <b>Analyze</b>, look and saved views under <b>View</b>, pictures and files under <b>Export</b>. Table, chart, history, query and case notebook open at the bottom. <a href="/explore/studio" target="_blank">Open in its own window ↗</a></p>
  <details class="card" style="padding:8px 14px;margin-bottom:8px"><summary><b>Use this viewer in another app, or from code</b></summary><p class="small muted">Copy one of these. Everything goes through the same access rules as this studio. The SDK files are in <code>sdk/js</code> and <code>sdk/python</code>.</p>
    <label class="small">Embed in a web page served by this app</label><textarea readonly rows="3" style="width:100%;font-family:monospace;font-size:12px">&lt;div id="graph"&gt;&lt;/div&gt;&lt;script type="module"&gt;import { embedViewer } from '/sdk/streamgraph.js'; embedViewer(document.getElementById('graph'), { search: 'Ada', drawer: 'table' });&lt;/script&gt;</textarea>
    <label class="small">Python</label><textarea readonly rows="2" style="width:100%;font-family:monospace;font-size:12px">from streamgraph_client import StreamGraph
print(StreamGraph("http://127.0.0.1:8080").query({"a": {"type": "Customer"}})["count"])</textarea></details>
  <iframe id="gx" title="Graph explorer" src="${gxSrc()}" style="width:100%;height:calc(100vh - 190px);min-height:520px;border:1px solid #dde2e8;border-radius:10px;background:#fff"></iframe>`;
}

// ---------------- Live processing: Flink (stream metrics + alerts) and entity matching (Duke / Splink)
let procTimer = null;
const yes = (ok, txt, fix) => `<li class="${ok ? 'done' : ''}">${esc(txt)}${ok ? '' : ` <span class="muted small">· not installed yet. Setup command: <code>${esc(fix)}</code></span>`}</li>`;
async function processing() {
  let st, me = {};
  try { st = await api('/api/explore/x/processing'); me = await api('/api/explore/x/me'); } catch (e) { V().innerHTML = `<h1>Live processing</h1><div class="msg err">${esc(e.message)}</div>`; return; }
  const a = st.availability, s = st.settings, admin = !!me.admin;
  const streamOn = s.stream.enabled, erOn = s.er.enabled, canStream = a.java.ok && a.kafka.installed && a.flink.installed && a.flink.jobBuilt;
  const canEr = eng => a.java.ok && (eng === 'duke' ? a.duke.installed && a.duke.sidecarBuilt : a.splink.installed);
  const types = (await api('/api/studio/explore').catch(() => ({ entities: [] }))).entities.map(e => e.label);
  V().innerHTML = `<h1>Live processing</h1>
  ${st.lastError ? `<div class="msg err">Last change failed and was undone: ${esc(st.lastError)}</div>` : ''}${st.busy ? '<div class="msg info">Switching… this takes 10–40 seconds.</div>' : ''}
  ${admin ? '' : '<div class="msg info">You can look, but only an admin can start or stop processing.</div>'}
  <div class="grid2">
  <div class="card"><h2><span class="dot ${streamOn ? (st.processor.enabled ? 'green' : 'amber') : 'red'}"></span>Stream processing (Apache Flink) ${tip('Runs a local Kafka broker and a Flink job on this computer. Flink keeps live counts per thing (links, activity) and raises alerts, shown here and as badges in the graph explorer.')}</h2>
    <p>${streamOn ? `<b>Running.</b> Kafka: ${esc(st.broker.status)}${st.broker.brokers ? ' on ' + esc(st.broker.brokers.join(', ')) : ''}. Flink job: ${st.processor.enabled ? esc(st.processor.job?.status || 'running') : 'starting'}.` : '<b>Stopped.</b> Your graph still works; live metrics and alerts are off.'}</p>
    <ul class="ready">${yes(a.java.ok, `Java ${a.java.major || '(not found)'}`, 'set JAVA_HOME to a JDK 17+')}${yes(a.kafka.installed, 'Kafka broker', a.kafka.fix)}${yes(a.flink.installed && a.flink.jobBuilt, 'Flink and the StreamGraph job (built from source)', a.flink.fix)}</ul>
    ${streamOn ? `<button class="danger" id="pstop" ${admin ? '' : 'disabled'}>Stop stream processing</button>` : `<button class="good" id="pstart" ${admin && canStream ? '' : 'disabled'}>Start stream processing</button>`}
    <div id="pm" style="margin-top:12px"></div></div>
  <div class="card"><h2><span class="dot ${erOn ? (st.er.enabled ? 'green' : 'amber') : 'red'}"></span>Entity matching ${tip('Finds records that are the same person or organization across your sources, even with typos. Sure matches are combined; unsure ones wait below for your decision.')}</h2>
    <p>${erOn ? `<b>Running</b> with ${esc(s.er.engine === 'duke' ? 'Duke' : 'Splink')}.` : '<b>Stopped.</b>'}</p>
    <label>Matching engine</label>
    <label class="inl"><input type="radio" name="eng" value="duke" ${s.er.engine === 'duke' ? 'checked' : ''} ${canEr('duke') ? '' : 'disabled'}> Duke (Java, recommended on Windows)</label><br>
    <label class="inl"><input type="radio" name="eng" value="splink" ${s.er.engine === 'splink' ? 'checked' : ''} ${canEr('splink') ? '' : 'disabled'}> Splink (Python; needs a Python setup)</label>
    <ul class="ready">${yes(a.duke.installed && a.duke.sidecarBuilt, 'Duke', a.duke.fix)}${yes(a.splink.installed, 'Splink', a.splink.fix)}</ul>
    <label>What to match</label>
    <table>${types.map(t => `<tr><td>${esc(plural(t))}</td><td><select data-ert="${esc(t)}">${opts([['none', 'Don\'t match'], ['person', 'They are people'], ['organization', 'They are organizations']], s.er.types?.[t] || 'none')}</select></td></tr>`).join('') || '<tr><td class="muted">Add data first.</td></tr>'}</table>
    <p style="margin-top:10px">${erOn ? `<button id="esave" ${admin ? '' : 'disabled'}>Save changes</button> <button class="danger" id="estop" ${admin ? '' : 'disabled'}>Stop matching</button>` : `<button class="good" id="estart" ${admin ? '' : 'disabled'}>Start matching</button>`}</p>
    ${st.er.enabled ? `<p class="small muted">${esc(Object.entries(st.er).filter(([k, v]) => typeof v !== 'object' && k !== 'enabled').map(([k, v]) => `${k}: ${v}`).join(' · '))}</p>` : ''}
    <div id="pmsg"></div></div></div>
  <div class="card"><h2>Possible matches to review ${tip('Pairs the engine is unsure about. "Same thing" combines them; "Not the same" keeps them apart. Your decision is saved as a link in the graph, so it also goes out through Send data out.')}</h2><div id="rev"><p class="muted">Loading…</p></div></div>`;
  const engine = () => document.querySelector('input[name=eng]:checked')?.value || 'duke';
  const erTypes = () => Object.fromEntries([...document.querySelectorAll('[data-ert]')].map(x => [x.dataset.ert, x.value]));
  const go = async (patch, btn) => { if (btn) { btn.disabled = true; btn.textContent = 'Working… (10–40 s)'; } try { await api('/api/explore/x/processing', patch); $('#pmsg') && ($('#pmsg').innerHTML = ''); } catch (e) { alert(e.message); } processing(); };
  $('#pstart') && ($('#pstart').onclick = e => go({ stream: { enabled: true } }, e.target));
  $('#pstop') && ($('#pstop').onclick = e => go({ stream: { enabled: false } }, e.target));
  $('#estart') && ($('#estart').onclick = e => go({ er: { enabled: true, engine: engine(), types: erTypes() } }, e.target));
  $('#esave') && ($('#esave').onclick = e => go({ er: { enabled: true, engine: engine(), types: erTypes() } }, e.target));
  $('#estop') && ($('#estop').onclick = e => go({ er: { enabled: false } }, e.target));
  const metrics = async () => {
    if (!$('#pm')) return; if (!streamOn) { $('#pm').innerHTML = ''; return; }
    const m = await api('/api/explore/x/processing/metrics').catch(() => ({ enabled: false }));
    if (!m.enabled) { $('#pm').innerHTML = '<p class="muted">Waiting for the Flink job…</p>'; return; }
    $('#pm').innerHTML = `<h2>Alerts (${m.alerts.length})</h2>${m.alerts.length ? table(m.alerts.slice(0, 10).map(x => ({ When: new Date(x.windowStart).toLocaleTimeString(), What: `${x.type || ''} ${x.label || x.nodeId}`, Alert: `Sudden jump: +${x.degreeGained} links in one window`, Severity: x.severity }))) : '<p class="muted small">No alerts.</p>'}
      <h2 style="margin-top:10px">Most connected right now</h2>${table(m.top.slice(0, 8).map(r => ({ Thing: `${r.type || ''} ${r.label || r.id}`, Links: r.degree ?? '', Changes: r.changes ?? '', 'Latest window': r.lastWindow ? `${r.lastWindow.changes} changes` : '', Alert: r.alert ? r.alert.severity : '' })))}
      <p class="small muted">Flink job ${esc(m.stats?.job?.status || '?')}${m.stats?.job?.flinkVersion ? ' · Flink ' + esc(m.stats.job.flinkVersion) : ''} · ${m.stats?.store?.nodes ?? 0} things measured · ${m.stats?.store?.alerts ?? 0} alerts kept${m.stats?.store?.lastRecordAt ? ' · last update ' + esc(new Date(m.stats.store.lastRecordAt).toLocaleTimeString()) : ''}</p>`;
  };
  const review = async () => {
    const r = await api('/api/explore/x/er/review').catch(e => ({ error: e.message, matches: [], decisions: [] }));
    if (!$('#rev')) return;
    $('#rev').innerHTML = `${r.error ? `<div class="msg err">${esc(r.error)}</div>` : ''}${!r.enabled ? '<p class="muted">Start entity matching to see possible matches.</p>' : r.matches.length ? `<table><tr><th>Record</th><th>Possible match</th><th>Score</th><th>Why</th><th></th></tr>${r.matches.slice(0, 50).map((m, i) => `<tr><td><b>${esc(m.labelA || m.entityA)}</b></td><td><b>${esc(m.labelB || m.entityB)}</b></td><td>${Math.round((m.score || 0) * 100)}%</td><td class="small muted">${esc(Array.isArray(m.why) ? m.why.map(w => `${w.property}: ${String(w.level).replace(/ExactComparator similarity 0.00/, 'different').replace(/ExactComparator similarity 1.00/, 'same').replace(/JaroWinkler similarity/, 'similarity')}`).join(' · ') : m.why || '')}</td>
      <td style="white-space:nowrap"><button class="good" data-dec="same" data-i="${i}">Same thing</button> <button data-dec="different" data-i="${i}">Not the same</button></td></tr>`).join('')}</table>` : '<p class="muted">Nothing to review right now.</p>'}
      ${r.decisions.length ? `<h2 style="margin-top:12px">Your decisions</h2>${table(r.decisions.slice(0, 10).map(d => ({ When: new Date(d.at).toLocaleString(), Decision: d.decision === 'same' ? 'Same thing' : 'Not the same', By: d.author })))}` : ''}`;
    document.querySelectorAll('[data-dec]').forEach(b => b.onclick = async () => { const m = r.matches[+b.dataset.i]; b.disabled = true; try { await api('/api/explore/x/er/decide', { a: m.entityA, b: m.entityB, decision: b.dataset.dec, score: m.score }); } catch (e) { alert(e.message); } review(); });
  };
  metrics(); review();
  procTimer = setInterval(() => { if (location.hash !== '#processing') return clearInterval(procTimer); metrics(); }, 4000);
}

function setAs(id) { AS = id && id !== 'owner' ? id : ''; AS ? sessionStorage.setItem('sg-as', AS) : sessionStorage.removeItem('sg-as'); lastAns = null; Q = null; banner(); }
function banner() {
  let el = $('#asbar'); if (!AS) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'asbar'; document.body.insertBefore(el, $('main')); }
  el.innerHTML = `👁 Previewing as <b>${esc(AS)}</b>: you see only what they would see. <button id="asoff">Stop preview</button>`;
  $('#asoff').onclick = () => { setAs(''); route(); };
}
const ROUTES = { '#home': home, '#add': wizard, '#link': link, '#clean': clean, '#explore': explore, '#explore-graph': exploreGraph, '#processing': processing, '#syncout': syncout, '#access': access, '#settings': settings };
async function route() {
  clearTimeout(timer); if (!WS) await loadWs();
  const h = ROUTES[location.hash] ? location.hash : '#home';
  const navH = h === '#explore-graph' ? '#explore' : h; document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === navH));
  $('main').classList.toggle('wide', h === '#explore-graph'); clearInterval(procTimer);
  await ROUTES[h]();
}
window.onhashchange = route; banner(); route();

// ---------------- Global search box in the header (OpenSearch index when set up, else the built-in search; always access-filtered)
const GS_WORD = { healthy: 'Index healthy', stale: 'Index catching up', offline: 'Search index offline', none: 'Built-in search (no index set up)' };
function globalSearch() {
  let last = null, t = null, seq = 0;
  const gx = () => { const f = document.getElementById('gx'); try { return f?.contentWindow?.__explore || null; } catch { return null; } };
  async function status() {
    try { const s = await api('/api/studio/search/status'); $('#gs-dot').className = `gs-dot ${s.index}`; $('#gs-dot').title = GS_WORD[s.index] || s.index;
      $('#gs-status').innerHTML = `<b>${esc(GS_WORD[s.index] || s.index)}</b>${s.configured ? ` · ${(s.docs ?? 0).toLocaleString()} docs · last sync ${ago(s.lastSync)}${s.waiting ? ` · ${s.waiting} waiting` : ''}` : ' · <a href="#syncout">add an OpenSearch output</a>'}`;
    } catch { $('#gs-dot').className = 'gs-dot offline'; }
  }
  async function run() {
    const q = $('#gs-q').value.trim(), body = { q, size: 30 };
    if ($('#gs-type').value) body.types = [$('#gs-type').value];
    if ($('#gs-from').value || $('#gs-to').value) { const iso = v => (v ? new Date(v).toISOString() : null); body.time = { from: iso($('#gs-from').value), to: iso($('#gs-to').value) }; } // the pickers are in the browser's local time
    const mv = gx()?.mapView; if ($('#gs-near').checked && mv?.map) { const b = mv.map.getBounds(); body.geo = { bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] }; }
    if (!q && !body.geo && !body.time) { $('#gs-results').hidden = true; return; }
    const my = ++seq; let r;
    try { r = await api('/api/studio/search', body); } catch (e) { $('#gs-results').innerHTML = `<div class="msg err">${esc(e.message)}</div>`; $('#gs-results').hidden = false; return; }
    if (my !== seq) return; last = r; $('#gs-dot').className = `gs-dot ${r.index}`;
    const frag = f => esc(f).replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>');
    $('#gs-results').innerHTML = (r.offline ? '<div class="msg warn small" id="gs-offline">⚠ Search index offline: showing the built-in search (still filtered by your access rules).</div>' : '')
      + (r.groups.length ? r.groups.map(g => `<div class="gs-group"><div class="gs-gh">${esc(g.type)} <span>${g.count}</span></div>${g.results.map(x => `<button class="gs-hit" role="option" data-id="${esc(x.exploreId)}"><b>${esc(x.name)}</b>${x.geo ? ' <span title="Has a location">📍</span>' : ''}${x.time ? ` <span class="muted small">${esc(x.time.slice(0, 16).replace('T', ' '))}</span>` : ''}${(x.highlights || []).slice(0, 2).map(h => `<div class="gs-frag"><span class="muted">${esc(h.field)}:</span> ${frag(h.fragments[0])}</div>`).join('')}</button>`).join('')}</div>`).join('')
        : `<div class="gs-msg muted">No matches${r.note ? ` · ${esc(r.note)}` : ''}.</div>`)
      + `<div class="gs-foot muted small">${r.total} result${r.total === 1 ? '' : 's'}${r.indexed > r.total ? ` (about ${r.indexed.toLocaleString()} in the index)` : ''} · ${r.engine === 'opensearch' ? 'OpenSearch' : 'built-in search'}${r.testAs ? ` · as ${esc(r.testAs)}` : ''} · ${r.ms} ms</div>`;
    $('#gs-results').hidden = false;
    document.querySelectorAll('.gs-hit').forEach(b => b.onclick = () => { $('#gs-results').hidden = true; focusInExplorer(last.results.find(x => x.exploreId === b.dataset.id)); });
  }
  // Clicking a result opens the graph explorer focused on that node (and its location on the map, if it has one).
  function focusInExplorer(x) {
    if (!x) return; const msg = { type: 'sg-focus', id: x.exploreId, name: x.name, geo: x.geo || null };
    if (location.hash === '#explore-graph' && gx()?.focusFromIndex) { document.getElementById('gx').contentWindow.postMessage(msg, location.origin); return; }
    sessionStorage.setItem('sg-focus', JSON.stringify(msg)); location.hash = '#explore-graph';
  }
  $('#gs-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 250); });
  $('#gs-q').addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(t); run(); } if (e.key === 'Escape') $('#gs-results').hidden = true; });
  $('#gs-q').addEventListener('focus', () => { if (last && $('#gs-q').value) $('#gs-results').hidden = false; });
  $('#gs-fbtn').onclick = async () => { const p = $('#gs-filters'); p.hidden = !p.hidden; $('#gs-fbtn').setAttribute('aria-expanded', String(!p.hidden)); if (!p.hidden) { status(); const ts = (await api('/api/studio/explore').catch(() => ({ entities: [] }))).entities.map(e => e.label); const cur = $('#gs-type').value; $('#gs-type').innerHTML = '<option value="">all types</option>' + ts.map(x => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join(''); } };
  ['#gs-type', '#gs-from', '#gs-to', '#gs-near'].forEach(id => $(id).addEventListener('change', run));
  document.addEventListener('click', e => { if (!$('#gs').contains(e.target)) { $('#gs-results').hidden = true; $('#gs-filters').hidden = true; } });
  status(); setInterval(status, 15000);
}
const es = new EventSource('/api/events');
es.addEventListener('state', e => { const s = JSON.parse(e.data); $('#live').textContent = s.running ? `● Syncing · ${s.counts.nodes} things saved to graph` : '○ Paused'; });
globalSearch();
