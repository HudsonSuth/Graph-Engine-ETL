// In-browser API for the static demo. Reads are precomputed engine output (window.__SG_DEMO).
// Writes change this tab's memory only. Search is MiniSearch (MIT), labeled as standing in for OpenSearch.
(function () {
  const SNAP = window.__SG_DEMO;
  if (!SNAP) { console.error('StreamGraph demo snapshot is missing'); return; }
  const origFetch = window.fetch.bind(window);
  const RealES = window.EventSource;
  let dataset = 'maritime';
  let live = null;
  const indexes = new Map();
  const sessions = new Map();
  let seq = 1;
  let dirty = false;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function principalOf(headers) {
    const as = (headers.get('x-sg-as') || '').trim();
    return !as || as === 'owner' ? 'owner' : as;
  }
  function bundleFor(p) {
    const ds = SNAP.datasets[dataset];
    if (p === 'owner') return live;
    return ds.principals[p] || live;
  }
  function itemsOf(b) {
    const s = b && b.session;
    if (!s) return [];
    if (Array.isArray(s.snapshot?.items)) return s.snapshot.items;
    if (Array.isArray(s.items)) return s.items;
    return [];
  }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  function visibleProps(props) {
    const out = {};
    for (const [k, v] of Object.entries(props || {})) if (v !== '[hidden]' && !String(k).startsWith('_')) out[k] = v;
    return out;
  }
  function docsOf(b) {
    const docs = [];
    for (const it of itemsOf(b)) {
      if (it.kind && it.kind !== 'node') continue;
      const props = it.properties || it.props || {};
      const vis = visibleProps(props);
      const name = vis.name || vis.title || vis.vessel_name || it.label || props.key || it.id;
      const lat = num(vis.lat ?? vis.latitude), lon = num(vis.lon ?? vis.longitude ?? vis.lng);
      const time = it.eventTime || vis.ts || vis.time || null;
      docs.push({
        id: it.id, type: it.type || it.label || 'Thing', name: String(name ?? ''), key: String(vis.key || props.key || ''),
        text: Object.entries(vis).map(([k, v]) => (v != null && typeof v !== 'object' ? `${k} ${v}` : '')).join(' '),
        time: time ? String(time) : '', lat, lon, exploreId: it.id,
        props: vis,
      });
    }
    return docs;
  }
  function indexFor(p) {
    const key = dataset + '|' + p;
    if (indexes.has(key)) return indexes.get(key);
    const docs = docsOf(bundleFor(p));
    const ms = new window.MiniSearch({
      idField: 'id',
      fields: ['name', 'key', 'type', 'text'],
      storeFields: ['id'],
      searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' },
    });
    ms.addAll(docs);
    const byId = new Map(docs.map(d => [d.id, d]));
    const rec = { ms, docs, byId };
    indexes.set(key, rec);
    return rec;
  }
  function normalize(b) {
    if (b.sinks && Array.isArray(b.sinks.status)) {
      const n = b.state?.counts?.nodes || b.graph?.nodes?.length || 0;
      for (const st of b.sinks.status) { st.health = 'amber'; st.waiting = n; st.sent = 0; st.lastError = null; st.lastAt = null; }
    }
    const docs = (b.session && itemsOf(b).filter(it => !it.kind || it.kind === 'node').length) || 0;
    b.searchStatus = {
      index: 'healthy', configured: true, engine: 'minisearch', docs,
      sink: b.sinks?.sinks?.find(s => s.kind === 'opensearch')?.id || null,
      name: 'Search index', lastSync: Date.now(), waiting: 0, lastError: null,
      note: 'MiniSearch (MIT) stands in for OpenSearch. Results stay filtered by this user\'s access rules.',
    };
    if (b.core) b.core = { ...b.core, datasetCredit: b.core.datasetCredit || 'NOAA / MarineCadastre AIS (CC0), 1 Jan 2018, mid-Atlantic slice, plus Natural Earth ports (public domain). Search: MiniSearch standing in for OpenSearch.' };
    if (b.geo) b.geo = { ...b.geo, basemap: 'offline' };
  }
  function useDataset(name) {
    dataset = SNAP.datasets[name] ? name : 'maritime';
    live = clone(SNAP.datasets[dataset].principals.owner);
    normalize(live);
    indexes.clear();
    sessions.clear();
  }
  for (const ds of Object.values(SNAP.datasets)) for (const principal of Object.values(ds.principals || {})) normalize(principal);
  useDataset('maritime');

  function banner(extra) {
    const el = document.getElementById('sg-demo-banner');
    if (!el) return;
    const base = 'Demo mode: changes are not saved. Search uses MiniSearch (MIT) in place of OpenSearch.';
    el.textContent = extra ? base + ' ' + extra : base;
    el.classList.toggle('dirty', dirty);
  }
  function markDirty(extra) { dirty = true; banner(extra || 'Last change is kept in this tab only.'); }
  function installChrome() {
    if (!document.body || document.getElementById('sg-demo-banner')) return;
    const bar = document.createElement('div');
    bar.id = 'sg-demo-banner';
    document.body.prepend(bar);
    const css = document.createElement('style');
    css.textContent = '#sg-demo-banner{background:#14304f;color:#fff;padding:8px 16px;font:13px/1.4 system-ui,sans-serif}#sg-demo-banner.dirty{background:#7a4b00}';
    document.head.appendChild(css);
    banner();
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (href !== '/api/studio/backup' && href !== '/api/export.cypher') return;
      e.preventDefault();
      window.fetch(href).then(async r => {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const d = document.createElement('a');
        d.href = url; d.download = href.includes('backup') ? 'streamgraph-backup.json' : 'streamgraph.cypher';
        document.body.appendChild(d); d.click(); d.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    }, true);
  }
  if (document.body) installChrome(); else document.addEventListener('DOMContentLoaded', installChrome);

  function json(obj, status = 200, headers) {
    return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'x-robots-tag': 'noindex', ...(headers || {}) } });
  }
  function text(body, type) {
    return new Response(body, { status: 200, headers: { 'content-type': type, 'x-robots-tag': 'noindex' } });
  }
  function headersOf(init) { try { return new Headers(init && init.headers); } catch { return new Headers(); } }
  async function readBody(init) {
    if (!init || init.body == null) return null;
    if (typeof init.body === 'string') return init.body;
    if (init.body instanceof Blob) return init.body;
    return null;
  }
  function parseSearch(url, body) {
    const g = k => (body && body[k] != null ? body[k] : url.searchParams.get(k));
    let geo = g('geo');
    if (typeof geo === 'string' && geo.trim().startsWith('{')) { try { geo = JSON.parse(geo); } catch { geo = null; } }
    if (!geo && g('bbox')) { const bb = String(g('bbox')).split(',').map(Number); if (bb.length === 4) geo = { bbox: bb }; }
    let time = g('time');
    if (typeof time === 'string' && time.trim().startsWith('{')) { try { time = JSON.parse(time); } catch { time = null; } }
    const from = time?.from ?? g('from'), to = time?.to ?? g('to');
    const types = g('types');
    return {
      q: String(g('q') ?? '').trim(),
      types: Array.isArray(types) ? types : String(types || '').split(',').map(s => s.trim()).filter(Boolean),
      geo: geo && geo.bbox ? geo : null,
      time: from || to ? { from: from || null, to: to || null } : null,
      size: Math.max(1, Math.min(Number(g('size')) || 20, 200)),
    };
  }
  function inBbox(d, bb) { return d.lat != null && d.lon != null && d.lon >= bb[0] && d.lon <= bb[2] && d.lat >= bb[1] && d.lat <= bb[3]; }
  function mark(text, q) {
    if (!q) return null;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
    if (!re.test(text)) return null;
    return String(text).slice(0, 160).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), m => `<mark>${m}</mark>`);
  }
  function search(p, url, body) {
    const o = parseSearch(url, body);
    const t0 = performance.now();
    const ix = indexFor(p);
    let ids;
    if (o.q) ids = ix.ms.search(o.q, { fuzzy: 0.2, prefix: true }).map(h => h.id);
    else ids = ix.docs.map(d => d.id);
    const results = [];
    for (const id of ids) {
      const d = ix.byId.get(id); if (!d) continue;
      if (o.types.length && !o.types.includes(d.type)) continue;
      if (o.geo?.bbox && !inBbox(d, o.geo.bbox)) continue;
      if (o.time) {
        if (!d.time) continue;
        if (o.time.from && d.time < o.time.from) continue;
        if (o.time.to && d.time > o.time.to) continue;
      }
      const frag = mark(d.name, o.q) || mark(d.text, o.q);
      results.push({
        id: d.id, exploreId: d.exploreId, type: d.type, label: d.type, key: d.key, name: d.name, props: d.props,
        ...(d.lat != null && d.lon != null ? { geo: { lat: d.lat, lon: d.lon } } : {}),
        ...(d.time ? { time: d.time } : {}),
        score: results.length ? 1 : 2,
        highlights: frag ? [{ field: 'name', fragments: [frag] }] : [],
      });
      if (results.length >= o.size) break;
    }
    const groups = [];
    for (const r of results) {
      let g = groups.find(x => x.type === r.type);
      if (!g) { g = { type: r.type, count: 0, results: [] }; groups.push(g); }
      g.results.push(r); g.count++;
    }
    return {
      q: o.q, total: results.length, groups, results, ms: Math.round(performance.now() - t0),
      index: 'healthy', engine: 'minisearch', indexed: ix.docs.length,
      note: 'MiniSearch (MIT) stands in for OpenSearch. Still filtered for this user.',
      testAs: p === 'owner' ? null : p,
    };
  }
  function localAsk(question, b) {
    const nodes = (b.graph && b.graph.nodes) || [];
    const edges = (b.graph && b.graph.edges) || [];
    const match = n => {
      if (n.label !== question.entity) return false;
      for (const f of question.filters || []) {
        const v = f.field === 'key' ? n.key : n.props?.[f.field];
        if (f.op === 'is' && String(v) !== String(f.value)) return false;
        if (f.op === 'is not' && String(v) === String(f.value)) return false;
        if (f.op === 'contains' && !String(v ?? '').toLowerCase().includes(String(f.value).toLowerCase())) return false;
        if (f.op === 'has a value' && (v == null || v === '' || v === '[hidden]')) return false;
        if (f.op === 'more than' && !(Number(v) > Number(f.value))) return false;
        if (f.op === 'less than' && !(Number(v) < Number(f.value))) return false;
      }
      return true;
    };
    let rows = nodes.filter(match).slice(0, 40).map(n => ({ a: n }));
    if (question.related?.entity) {
      const dir = question.related.dir;
      const joined = [];
      for (const row of rows) {
        for (const e of edges) {
          if (e.type !== question.related.edge) continue;
          const from = dir === 'in' ? e.to : e.from, to = dir === 'in' ? e.from : e.to;
          if (from !== row.a.id) continue;
          const bnode = nodes.find(n => n.id === to && n.label === question.related.entity);
          if (bnode) joined.push({ a: row.a, b: bnode });
        }
      }
      rows = joined.slice(0, 40);
    }
    const table = rows.map(r => {
      const o = {};
      for (const n of Object.values(r)) {
        o[n.label] = n.props?.name && n.props.name !== '[hidden]' ? n.props.name : n.key;
        for (const [k, v] of Object.entries(n.props || {})) if (k !== 'name' && !k.startsWith('_')) o[`${n.label} ${k}`] = v;
      }
      return o;
    });
    const columns = [...new Set(table.flatMap(r => Object.keys(r)))];
    return { count: rows.length, hidden: 0, masked: [], columns, table, graph: rows, testAs: null };
  }
  function ask(question, p) {
    const b = bundleFor(p);
    const hit = (b.asks || []).find(a => JSON.stringify(a.question) === JSON.stringify(question));
    if (hit?.result) return { ...hit.result, testAs: p === 'owner' ? null : p };
    return { ...localAsk(question, b), testAs: p === 'owner' ? null : p };
  }
  function csvOf(result) {
    const cols = result.columns || [];
    const q = x => `"${String(x ?? '').replace(/"/g, '""')}"`;
    return [cols.map(q).join(','), ...(result.table || []).map(r => cols.map(c => q(r[c])).join(','))].join('\r\n') + '\r\n';
  }
  function applyCleanup(before, steps) {
    return (before || []).map(row => {
      const o = { ...row };
      for (const step of steps || []) {
        const v = o[step.field];
        if (step.do === 'trim' && v != null) o[step.field] = String(v).trim();
        else if (step.do === 'lowercase' && v != null) o[step.field] = String(v).toLowerCase();
        else if (step.do === 'uppercase' && v != null) o[step.field] = String(v).toUpperCase();
        else if (step.do === 'number' && v != null && v !== '' && !Number.isNaN(Number(v))) o[step.field] = Number(v);
        else if (step.do === 'keepIf') {
          const s = String(v ?? '');
          const drop = (step.op === 'is' && s !== String(step.value)) || (step.op === 'is not' && s === String(step.value)) || (step.op === 'contains' && !s.toLowerCase().includes(String(step.value).toLowerCase()));
          if (drop) return null;
        }
      }
      return o;
    });
  }
  function queryGraph(b, pattern) {
    const nodes = b.graph?.nodes || [], edges = b.graph?.edges || [];
    const bits = [...String(pattern || '').matchAll(/\((\w+):(\w+)(?:\s*\{([^}]*)\})?\)/g)].map(m => ({ alias: m[1], label: m[2], raw: m[3] || '' }));
    const rel = String(pattern || '').match(/\[:(\w+)\]/);
    const propsOf = raw => {
      const o = {};
      if (!raw) return o;
      for (const part of raw.split(',')) {
        const i = part.indexOf(':'); if (i < 0) continue;
        const k = part.slice(0, i).trim(); let v = part.slice(i + 1).trim().replace(/^"|"$/g, '');
        if (v === 'true') v = true; else if (v === 'false') v = false; else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
        o[k] = v;
      }
      return o;
    };
    const ok = (n, spec) => n.label === spec.label && Object.entries(propsOf(spec.raw)).every(([k, v]) => (k === 'key' ? n.key : n.props?.[k]) === v);
    if (!bits.length) return { rows: [] };
    if (bits.length === 1) return { rows: nodes.filter(n => ok(n, bits[0])).slice(0, 50).map(n => ({ [bits[0].alias]: n })) };
    const [A, B] = bits, type = rel ? rel[1] : null, incoming = /<-\s*\[/.test(pattern);
    const rows = [];
    for (const e of edges) {
      if (type && e.type !== type) continue;
      const from = nodes.find(n => n.id === e.from), to = nodes.find(n => n.id === e.to);
      if (!from || !to) continue;
      const left = incoming ? to : from, right = incoming ? from : to;
      if (!ok(left, A) || !ok(right, B)) continue;
      rows.push({ [A.alias]: left, [B.alias]: right });
      if (rows.length >= 50) break;
    }
    return { rows };
  }
  function openSession(p) {
    const b = bundleFor(p);
    const id = `demo-${dataset}-${p}-${seq++}`;
    const snap = b.session?.snapshot || { items: itemsOf(b) };
    sessions.set(id, { p, snap });
    return { sessionId: id, snapshot: snap };
  }
  function sessionOf(url) {
    const m = url.pathname.match(/^\/api\/explore\/session\/([^/]+)(?:\/(\w+))?/);
    return m ? { id: m[1], cmd: m[2] || '', rec: sessions.get(m[1]) } : null;
  }
  function degreeOf(b, scope) {
    if (b.degree && (!scope || scope.kind === 'all' || !scope.kind)) return b.degree;
    const items = itemsOf(b);
    const deg = {};
    for (const it of items) if (it.kind === 'link') { deg[it.fromId] = (deg[it.fromId] || 0) + 1; deg[it.toId] = (deg[it.toId] || 0) + 1; }
    const nodes = items.filter(it => it.kind === 'node').map(it => it.id);
    const top = Object.entries(deg).sort((a, c) => c[1] - a[1]).slice(0, 12).map(([id, value]) => ({ id, value }));
    return { algo: 'degree', values: deg, top, scope: { nodes: nodes.length, links: items.filter(it => it.kind === 'link').length }, stats: { ms: 1 }, approximate: false, cached: false };
  }
  function neighborhood(body) {
    const lines = [
      { type: 'start', seeds: body.seeds || [], hops: body.hops ?? 1, maxNodes: body.maxNodes ?? null },
      { type: 'chunk', nodes: [], links: [] },
      { type: 'end', stats: { truncated: false, nodes: 0, links: 0 } },
    ];
    return text(lines.map(x => JSON.stringify(x)).join('\n') + '\n', 'application/x-ndjson');
  }
  function backupOf(b) {
    return {
      kind: 'streamgraph-backup', version: 1, exportedAt: new Date().toISOString(),
      note: 'Demo mode: changes are not saved. Passwords are not included. Graph and workspace are engine output.',
      workspace: b.workspace?.workspace || {}, access: b.access || {}, flow: b.flow?.flow || {}, graph: { nodes: b.graph?.nodes || [], edges: b.graph?.edges || [] },
    };
  }
  function requireOwner(p) {
    if (p !== 'owner') return json({ error: 'Your access rules do not allow managing this project.' }, 403);
    return null;
  }

  async function handle(url, init) {
    const method = (init.method || 'GET').toUpperCase();
    const headers = headersOf(init);
    const p = principalOf(headers);
    const b = () => bundleFor(p);
    const path = url.pathname;
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      const raw = await readBody(init);
      if (typeof raw === 'string' && raw.length) { try { body = JSON.parse(raw); } catch { body = raw; } }
      else body = raw;
    }
    const ownerOnly = () => requireOwner(p);

    if (path === '/api/events' || /\/events$/.test(path)) return text('', 'text/event-stream');
    if (path === '/mcp') return mcp(method, body, p);

    if (path === '/api/studio/workspace' && method === 'GET') return json(b().workspace);
    if (path === '/api/studio/home' && method === 'GET') return json(b().home);
    if (path === '/api/studio/explore' && method === 'GET') return json(b().explore || { entities: [], ideas: [] });
    if (path === '/api/studio/search/status' && method === 'GET') return json(b().searchStatus);
    if ((path === '/api/studio/search') && (method === 'GET' || method === 'POST')) return json(search(p, url, body));
    if (path === '/api/studio/ask' && method === 'POST') return json(ask(body?.question, p));
    if (path === '/api/studio/export.csv' && method === 'POST') return text(csvOf(ask(body?.question, p)), 'text/csv; charset=utf-8');
    if (path === '/api/studio/backup' && method === 'GET') { const d = ownerOnly(); if (d) return d; return json(backupOf(live)); }
    if (path === '/api/studio/access' && method === 'GET') { const d = ownerOnly(); if (d) return d; return json(live.access); }
    if (path === '/api/studio/access/matrix' && method === 'POST') { const d = ownerOnly(); if (d) return d; return json(live.matrices?.[body.user] || live.matrices?.owner); }
    if (path === '/api/studio/access/audit' && method === 'GET') { const d = ownerOnly(); if (d) return d; return json({ audit: live.access?.audit || [] }); }
    if (path === '/api/studio/access/explain' && method === 'POST') { const d = ownerOnly(); if (d) return d; const row = live.matrices?.[body.user]; const ent = row?.entities?.find(e => e.entity === body.entity); return json(ent?.actions?.[body.action] || { allow: false, trace: ['Demo mode: no stored explanation for that pair.'] }); }
    if (path === '/api/studio/access/user' && method === 'POST') { const d = ownerOnly(); if (d) return d; const u = { id: body.id, name: body.name, role: body.role, clearance: Number(body.clearance) }; const i = live.access.users.findIndex(x => x.id === u.id); if (i >= 0) live.access.users[i] = { ...live.access.users[i], ...u }; else live.access.users.push(u); markDirty(); return json(live.access); }
    if (path === '/api/studio/access/user' && method === 'DELETE') { const d = ownerOnly(); if (d) return d; const id = url.searchParams.get('id'); if (id === 'owner') return json({ error: 'The owner cannot be removed.' }, 400); live.access.users = live.access.users.filter(u => u.id !== id); markDirty(); return json(live.access); }
    if (path === '/api/studio/access/rule' && method === 'POST') { const d = ownerOnly(); if (d) return d; live.access.rules.push({ id: 'demo-' + seq++, ...body.rule, enabled: true }); markDirty(); return json(live.access); }
    if (path === '/api/studio/access/rule' && method === 'DELETE') { const d = ownerOnly(); if (d) return d; live.access.rules = live.access.rules.filter(r => r.id !== url.searchParams.get('id') || r.locked); markDirty(); return json(live.access); }
    if (path === '/api/studio/access/field' && method === 'POST') { const d = ownerOnly(); if (d) return d; const ent = live.access.entities.find(e => e.label === body.entity); const f = ent?.fields?.find(x => x.field === body.field); if (f) f.sensitivity = body.sensitivity; markDirty(); return json(live.access); }
    if (path === '/api/studio/access/entity' && method === 'POST') { const d = ownerOnly(); if (d) return d; const ent = live.access.entities.find(e => e.label === body.entity); if (ent) { ent.classification = Number(body.classification); ent.tags = body.tags || []; } markDirty(); return json(live.access); }
    if (path === '/api/studio/access/opa' && method === 'POST') { const d = ownerOnly(); if (d) return d; if (live.access.settings?.opa) { live.access.settings.opa.enabled = !!body.enabled; live.access.settings.opa.url = body.url || live.access.settings.opa.url; } markDirty(); return json(live.access); }
    if (path === '/api/studio/sinks' && method === 'GET') { const d = ownerOnly(); if (d) return d; return json(live.sinks); }
    if (path === '/api/studio/sinks/test' && method === 'POST') { const d = ownerOnly(); if (d) return d; markDirty('Connection check ran in memory and was not sent to a live server.'); return json({ ok: true, message: 'Demo mode: connection check ran in memory and was not sent to a live server. Changes are not saved. Search is answered by MiniSearch (MIT), which stands in for OpenSearch.' }); }
    if (path === '/api/studio/sinks' && method === 'POST') {
      const d = ownerOnly(); if (d) return d;
      const id = body.id || ('demo_' + (body.kind || 'sink') + '_' + (seq++));
      const s = { id, name: body.name || 'Output', kind: body.kind, settings: body.settings || {}, asUser: body.asUser || 'sync-service', enabled: body.enabled !== false, secret: body.secret ? '••••••••' : '', hasSecret: !!body.secret };
      const i = live.sinks.sinks.findIndex(x => x.id === id);
      if (i >= 0) live.sinks.sinks[i] = { ...live.sinks.sinks[i], ...s };
      else live.sinks.sinks.push(s);
      if (!live.sinks.status.find(x => x.id === id)) live.sinks.status.push({ id, health: 'amber', waiting: live.state?.counts?.nodes || 0, sent: 0, lastAt: null, lastError: null });
      const st = live.sinks.status.find(x => x.id === id); if (body.enabled === false && st) st.health = 'amber';
      markDirty(); return json(live.sinks);
    }
    if (path === '/api/studio/sinks' && method === 'DELETE') { const d = ownerOnly(); if (d) return d; const id = url.searchParams.get('id'); live.sinks.sinks = live.sinks.sinks.filter(s => s.id !== id); live.sinks.status = live.sinks.status.filter(s => s.id !== id); markDirty(); return json(live.sinks); }
    if (path === '/api/studio/sinks/sync-now' && method === 'POST') {
      const d = ownerOnly(); if (d) return d;
      for (const st of live.sinks.status) { st.sent = (st.sent || 0) + (st.waiting || 0); st.waiting = 0; st.health = 'green'; st.lastAt = Date.now(); st.lastError = null; }
      markDirty('Sync ran against this tab. Nothing was sent to a live database.'); return json(live.sinks);
    }
    if (path === '/api/studio/upload' && method === 'POST') {
      const d = ownerOnly(); if (d) return d;
      const name = url.searchParams.get('name') || 'upload.csv';
      if (url.searchParams.get('folder')) return json({ path: 'memory://docs/' + name, folder: 'memory://docs', name });
      return json({ path: 'memory://' + name, name });
    }
    if (path === '/api/studio/test' && method === 'POST') {
      const d = ownerOnly(); if (d) return d;
      if (body?.kind === 'documents') return json(SNAP.wizard.documents);
      const name = body?.name || String(body?.settings?.path || '').split('/').pop();
      const hit = SNAP.wizard.csv[name] || SNAP.wizard.csv['vessels.csv'];
      return json(hit || { ok: false, message: 'Demo mode: that file was not part of the precomputed snapshot.' });
    }
    if (path === '/api/studio/sources' && method === 'POST') {
      const d = ownerOnly(); if (d) return d;
      const id = String(body.name || 'source').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'source';
      const src = { id, name: body.name, kind: body.kind, entity: body.entity, key: body.key, keepInSync: body.keepInSync !== false, fields: body.fields || {}, secret: '' };
      live.workspace.workspace.sources = live.workspace.workspace.sources.filter(s => s.id !== id).concat([src]);
      live.home.sources = (live.home.sources || []).filter(s => s.id !== id).concat([{ id, name: body.name, kind: body.kind, entity: body.entity, health: 'amber', note: 'Demo mode: not written to the engine', records: 0, perMinute: 0, lastUpdate: Date.now(), keepInSync: src.keepInSync }]);
      markDirty('The source was added in this tab. The graph itself stays the precomputed engine snapshot.');
      return json({ id, workspace: live.workspace.workspace });
    }
    if (path === '/api/studio/sources' && method === 'DELETE') {
      const d = ownerOnly(); if (d) return d;
      const id = url.searchParams.get('id');
      live.workspace.workspace.sources = live.workspace.workspace.sources.filter(s => s.id !== id);
      live.home.sources = (live.home.sources || []).filter(s => s.id !== id);
      markDirty(); return json({ workspace: live.workspace.workspace });
    }
    if (path === '/api/studio/suggestions' && method === 'GET') { const d = ownerOnly(); if (d) return d; return json(live.suggestions || { matches: [], relationships: [], current: { entities: {}, relationships: [] }, sources: (live.workspace.workspace.sources || []).map(s => ({ ...s, columns: [] })) }); }
    if (path === '/api/studio/linked-sample' && method === 'POST') { const d = ownerOnly(); if (d) return d; return json({ entities: {}, relationships: [], errors: [] }); }
    if (path === '/api/studio/links' && method === 'POST') { const d = ownerOnly(); if (d) return d; live.workspace.workspace.linked = true; if (live.home.checklist) for (const c of live.home.checklist) if (c.id === 'link') c.done = true; markDirty(); return json({ workspace: live.workspace.workspace }); }
    if (path === '/api/studio/cleanup-preview' && method === 'POST') {
      const d = ownerOnly(); if (d) return d;
      const before = live.cleanup?.before || [];
      const after = applyCleanup(before, body.cleanup);
      return json({ before, after, kept: after.filter(Boolean).length });
    }
    if (path === '/api/studio/cleanup' && method === 'POST') { const d = ownerOnly(); if (d) return d; markDirty(); return json({ workspace: live.workspace.workspace }); }
    if (path === '/api/studio/demo' && method === 'POST') { useDataset('retail'); markDirty('Loaded the retail shop snapshot (real engine output) into this tab.'); return json({ workspace: live.workspace.workspace }); }
    if (path === '/api/studio/pause' && method === 'POST') { const d = ownerOnly(); if (d) return d; live.home.running = false; if (live.state) live.state.running = false; for (const s of live.home.sources || []) { s.health = 'amber'; s.note = 'Paused'; } markDirty(); return json(live.home); }
    if (path === '/api/studio/resume' && method === 'POST') { const d = ownerOnly(); if (d) return d; live.home.running = true; if (live.state) live.state.running = true; markDirty(); return json(live.home); }
    if (path === '/api/studio/reset' && method === 'POST') { const d = ownerOnly(); if (d) return d; if (body?.confirm !== 'RESET') return json({ error: 'To start a new project, confirm with RESET.' }, 400); useDataset('empty'); markDirty('Project reset in this tab. Reload the page to bring the maritime snapshot back.'); return json(live.home); }

    if (path === '/api/flow' && method === 'GET') return json(b().flow);
    if (path === '/api/flow' && method === 'PUT') { const d = ownerOnly(); if (d) return d; live.flow = { ...live.flow, flow: body }; markDirty(); return json({ errors: [] }); }
    if (path === '/api/validate' && method === 'POST') return json({ errors: [] });
    if (path === '/api/copy' && method === 'POST') { const d = ownerOnly(); if (d) return d; markDirty(); return json({ saved: 'memory://' + (body.name || 'copy') + '.json' }); }
    if (path === '/api/run' && method === 'POST') { const d = ownerOnly(); if (d) return d; if (live.state) live.state.running = true; markDirty(); return json(live.state); }
    if (path === '/api/stop' && method === 'POST') { const d = ownerOnly(); if (d) return d; if (live.state) live.state.running = false; markDirty(); return json(live.state); }
    if (path === '/api/state' && method === 'GET') return json(b().state);
    if (path === '/api/graph' && method === 'GET') return json(b().graph || { nodes: [], edges: [], version: 0 });
    if (path === '/api/query' && method === 'POST') return json(queryGraph(b(), body?.pattern));
    if (path === '/api/export.cypher' && method === 'GET') return text(b().cypher || live.cypher || '// demo export\n', 'text/plain; charset=utf-8');

    if (path === '/api/explore/session' && method === 'POST') return json(openSession(p));
    const sess = sessionOf(url);
    if (sess) {
      if (!sess.rec) return json({ error: 'unknown session' }, 404);
      if (sess.cmd === 'events') return text(': connected\n\n', 'text/event-stream');
      if (sess.cmd === 'resync') return json(sess.rec.snap);
      if (sess.cmd === 'search') {
        const q = String(body?.text || '').toLowerCase();
        const items = itemsOf(bundleFor(sess.rec.p)).filter(it => it.kind === 'node' && (!q || JSON.stringify(it).toLowerCase().includes(q))).slice(0, body?.limit || 200);
        return json({ items, truncated: false, nextCursor: null });
      }
      if (sess.cmd === 'expand') return json({ items: [], truncated: false, nextCursor: null, warnings: [] });
      if (sess.cmd === 'path' || sess.cmd === 'paths') return json({ found: false, paths: [], items: [], message: 'Pick two things that are both in the snapshot.' });
      if (sess.cmd === 'summary') return json({ id: url.searchParams.get('id') || body?.id, linkTypes: [] });
      if (sess.cmd === 'neighborhood') return neighborhood(body || {});
      if (sess.cmd === 'release' || sess.cmd === 'follow') return json({ ok: true });
      if (sess.cmd === 'close') { sessions.delete(sess.id); return json({ closed: true }); }
    }
    if (path === '/api/explore/core/config') return json(b().core || { counts: { nodes: 0, links: 0 }, algorithms: [], limits: {} });
    if (path === '/api/explore/geo/config') return json(b().geo || { basemap: 'offline', offlineData: '/explore/geo/ne_110m_admin_0_countries.geojson' });
    if (path === '/api/explore/views' && method === 'GET') return json(b().views || { views: [], presentations: [] });
    if (path === '/api/explore/views' && method === 'POST') { const d = ownerOnly(); if (d) return d; const view = { id: 'view-' + seq++, name: body.name || 'View', description: body.description || '', state: body.state || {} }; (live.views ||= { views: [], presentations: [] }).views.push(view); markDirty(); return json({ view, warnings: [] }); }
    if (path === '/api/explore/views-export') return json({ views: b().views?.views || [], presentations: [] });
    if (path === '/api/explore/presentations') return json({ presentations: [] });
    if (path === '/api/explore/processor') return json(b().processor || { enabled: false });
    if (path === '/api/explore/processor/metrics' && method === 'POST') return json({ metrics: {}, alerts: [], stats: { job: { status: 'disabled' } } });
    if (path === '/api/explore/er/stats') return json(b().er || { enabled: false });
    if (path === '/api/explore/clusters' && method === 'POST') {
      const nodes = itemsOf(b()).filter(it => it.kind === 'node');
      const membership = {};
      const buckets = new Map();
      for (const n of nodes) {
        const id = 'c:' + (n.type || 'Thing');
        membership[n.id] = id;
        const c = buckets.get(id) || { id, type: n.type, count: 0, label: n.type || 'Things' };
        c.count++; buckets.set(id, c);
      }
      const clusters = [...buckets.values()].map((c, i) => ({ ...c, x: Math.cos(i * 1.2) * 90, y: Math.sin(i * 1.2) * 90, r: 14 + Math.sqrt(c.count) }));
      return json({ by: body?.by || 'type', clusters, membership, metaEdges: [], links: [], totals: { clusters: clusters.length, nodes: nodes.length }, timings: { totalMs: 1 }, cached: true });
    }
    if (path === '/api/explore/clusters/members' && method === 'POST') {
      const nodes = itemsOf(b()).filter(it => it.kind === 'node' && ('c:' + (it.type || 'Thing')) === body?.cluster);
      return json({ ids: nodes.slice(0, body?.max || 2000).map(n => n.id), truncated: false });
    }
    if (path === '/api/explore/cost' && method === 'POST') {
      const nodes = b().cost?.nodes ?? b().state?.counts?.nodes ?? 0;
      const links = b().cost?.links ?? b().state?.counts?.edges ?? 0;
      return json({ ...(b().cost || {}), op: body.op, level: 'low', estMs: 30, estNodes: Math.min(50, nodes), estLinks: Math.min(50, links), nodes, links, basis: 'precomputed snapshot' });
    }
    if (path === '/api/explore/algo/run' && method === 'POST') return json(degreeOf(b(), body?.scope));
    if (path === '/api/explore/algo/results') return json({ results: [] });
    if (path === '/api/explore/search/status') return json(b().searchStatus);
    if (path === '/api/explore/search' && (method === 'GET' || method === 'POST')) return json(search(p, url, body));
    if (path === '/api/explore/stats') return json({ counts: { nodes: b().state?.counts?.nodes || 0, links: b().state?.counts?.edges || 0 }, mode: 'demo' });
    if (path === '/api/explore/deltas') return json({ events: [], cursor: 0 });
    if (path === '/api/explore/icons') return json({ sets: [{ id: 'lucide', license: 'ISC', count: 0 }, { id: 'majesticons:line', license: 'MIT', count: 0 }] });
    if (path === '/api/explore/x/processing' && method === 'GET') return json(b().processing || { available: false });
    if (path === '/api/explore/x/processing' && method === 'POST') { const d = ownerOnly(); if (d) return d; markDirty('Stream processing is not started in the static demo.'); return json({ ...(live.processing || {}), lastError: 'Demo mode: Flink and Duke are not started. This screen shows the install check captured when the snapshot was built.' }); }
    if (path === '/api/explore/x/processing/metrics') return json(b().metrics || { enabled: false });
    if (path === '/api/explore/x/me') return json(b().me || { admin: p === 'owner', subject: p });
    if (path === '/api/explore/x/er/review') return json(b().review || { enabled: false, matches: [], decisions: [] });
    if (path === '/api/explore/x/er/decide' && method === 'POST') { markDirty(); return json({ ok: true, note: 'Demo mode: changes are not saved.' }); }
    if (path === '/api/explore/x/meta') return json(b().meta || { types: [], fields: {} });
    if (path === '/api/explore/x/nl/settings' && method === 'GET') return json(b().nl || { provider: 'off', providers: [{ id: 'off', name: 'Off' }] });
    if (path === '/api/explore/x/nl/settings' && method === 'POST') { const d = ownerOnly(); if (d) return d; live.nl = { ...(live.nl || {}), provider: body.provider }; markDirty(); return json({ provider: body.provider }); }
    if (path === '/api/explore/x/history/timeline') return json(b().timeline || { events: 0, buckets: [] });
    if (path === '/api/explore/x/notebooks' && method === 'GET') return json({ notebooks: live._notebooks || [] });
    if (path === '/api/explore/x/notebooks' && method === 'POST') { const n = { id: 'nb-' + seq++, title: body.title || 'Case', author: p, at: Date.now(), entries: 0 }; (live._notebooks ||= []).unshift(n); markDirty(); return json({ notebook: n }); }
    if (path === '/api/explore/x/comments' && method === 'GET') return json({ comments: [] });
    if (path === '/api/explore/x/comments' && method === 'POST') { markDirty(); return json({ comment: { id: 'c-' + seq++, target: body.target, author: p, text: body.text, at: Date.now() } }); }
    if (path === '/api/explore/x/summary' && method === 'POST') return json({ text: `Demo snapshot: ${((body && body.ids) || []).length} things selected.` });
    if (path === '/api/explore/x/query' && method === 'POST') return json({ rows: [], count: 0, cypher: 'MATCH (n) RETURN n LIMIT 5', truncated: false });
    if (path === '/api/explore/x/cypher' && method === 'POST') return json({ cypher: 'MATCH (n) RETURN n LIMIT 5' });
    if (path === '/api/explore/x/edit' && method === 'POST') { markDirty(); return json({ ok: true, done: [{ id: 'sg:node:Note:demo', op: 'addNode' }], note: 'Demo mode: changes are not saved.' }); }
    if (path === '/api/explore/bench/webgpu' && method === 'POST') { markDirty(); return json({ ok: true, file: 'memory://bench.json', runs: (body && body.runs && body.runs.length) || 0 }); }
    if (path === '/demo/api/loyalty') return json([{ cust_id: 'c1', tier: 'gold', points: '920' }]);

    return json({ error: 'Demo mode has no handler for ' + method + ' ' + path }, 404);
  }

  function mcp(method, body, p) {
    if (method !== 'POST') return json({ error: 'POST JSON-RPC' }, 405);
    const id = body && body.id;
    const reply = (result) => json({ jsonrpc: '2.0', id, result });
    if (!body || body.method === 'initialize') return reply({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'streamgraph-explore', version: 'demo' }, instructions: 'Demo mode. Tools answer from the precomputed engine snapshot. Changes are not saved.' });
    if (body.method === 'notifications/initialized' || body.method === 'initialized') return new Response(null, { status: 202 });
    if (body.method === 'tools/list') return reply({ tools: [
      { name: 'graph_stats', description: 'Counts from the precomputed snapshot (access-filtered).', inputSchema: { type: 'object', properties: {} } },
      { name: 'search_nodes', description: 'MiniSearch over the precomputed snapshot, standing in for OpenSearch.', inputSchema: { type: 'object', properties: { text: { type: 'string' } } } },
    ] });
    if (body.method === 'tools/call') {
      const name = body.params?.name;
      const b = bundleFor(p);
      if (name === 'graph_stats') return reply({ content: [{ type: 'text', text: JSON.stringify({ nodes: b.state?.counts?.nodes || 0, edges: b.state?.counts?.edges || 0, dataset, principal: p, engine: 'snapshot' }) }] });
      if (name === 'search_nodes') {
        const r = search(p, new URL('http://x/'), { q: body.params?.arguments?.text || '', size: 20 });
        return reply({ content: [{ type: 'text', text: JSON.stringify({ total: r.total, engine: r.engine, note: r.note, results: r.results.slice(0, 20).map(x => ({ id: x.exploreId, type: x.type, name: x.name })) }) }] });
      }
      return reply({ content: [{ type: 'text', text: 'Tool ' + name + ' is not wired in the static demo.' }], isError: true });
    }
    return reply({});
  }

  window.fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : (input && input.url) || '', location.origin);
    if (url.origin === location.origin && (url.pathname.startsWith('/api/') || url.pathname === '/mcp' || url.pathname.startsWith('/demo/api/'))) {
      return handle(url, init || {}).catch(e => json({ error: e.message || String(e) }, 500));
    }
    return origFetch(input, init);
  };

  class DemoEventSource {
    constructor(url) {
      this.url = String(url);
      this.readyState = 0;
      this.listeners = {};
      const u = new URL(this.url, location.origin);
      const as = u.searchParams.get('sg-as') || '';
      const p = !as || as === 'owner' ? 'owner' : as;
      const state = (p === 'owner' ? live.state : (SNAP.datasets[dataset].principals[p] || live).state) || live.state;
      queueMicrotask(() => {
        this.readyState = 1;
        this.onopen && this.onopen({ type: 'open' });
        if (u.pathname === '/api/events' && state) this.emit('state', JSON.stringify(state));
      });
    }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn); }
    emit(type, data) { const ev = { type, data }; for (const fn of this.listeners[type] || []) fn(ev); }
    close() { this.readyState = 2; }
  }
  DemoEventSource.CONNECTING = 0; DemoEventSource.OPEN = 1; DemoEventSource.CLOSED = 2;
  window.EventSource = DemoEventSource;
  window.__sgDemo = { get dataset() { return dataset; }, useDataset, snapshot: SNAP };
  void RealES;
})();
