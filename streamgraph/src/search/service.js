// Search API behind GET/POST /api/studio/search and /api/explore/search.
// Access control, in three layers (deny by default, fail closed):
//  1. The query sent to OpenSearch always carries a server-side filter built from the CALLER's subject and the LIVE policy:
//     only types the caller may read (engine.decide 'read'), and per type only the fields the caller may see are searched,
//     highlighted, or used for geo/time filtering. If the caller may read nothing, OpenSearch is not asked at all.
//  2. Every hit is re-checked against the graph: the node must still exist, its type must still be readable, its fields are
//     masked with engine.viewNode, and highlight fragments of fields the caller cannot see are dropped.
//  3. If OpenSearch is unreachable or errors, the built-in search runs instead, over viewGraph() output (already filtered and
//     masked), and the reply says index: 'offline'. The search is never answered unfiltered.
import { MASK } from '../abac/engine.js';
import { OpenSearchClient, indexName, safeField, geoOf, timeOf } from './opensearch.js';

const BROKEN = () => process.env.STREAMGRAPH_SEARCH === 'broken'; // DELIBERATELY WRONG search for the proof run: no access filter, no re-check
const R = 6371008.8, rad = d => (d * Math.PI) / 180;
export const haversine = (a, b) => { const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const DIST = { m: 1, km: 1000, mi: 1609.344, nm: 1852 };
export const meters = r => { if (typeof r === 'number') return r; const m = /^\s*([\d.]+)\s*(m|km|mi|nm)?\s*$/i.exec(String(r ?? '')); if (!m) throw Object.assign(new Error('Radius should look like 20km, 5mi or 10nm.'), { friendly: true }); return Number(m[1]) * DIST[(m[2] || 'm').toLowerCase()]; };

/** Normalise query options from a GET query string or a POST body. */
export function parseSearch(src = {}) {
  const g = k => (src instanceof URLSearchParams ? src.get(k) : src[k]);
  const list = v => (Array.isArray(v) ? v : String(v || '').split(',')).map(s => String(s).trim()).filter(Boolean);
  const num = v => (v === '' || v == null ? null : Number(v));
  let geo = g('geo'); if (typeof geo === 'string' && geo.trim().startsWith('{')) geo = JSON.parse(geo);
  if (!geo && g('lat') != null && g('lon') != null) geo = { lat: num(g('lat')), lon: num(g('lon')), radius: g('radius') || '10km' };
  if (!geo && g('bbox')) { const [w, s, e, n] = list(g('bbox')).map(Number); geo = { bbox: [w, s, e, n] }; }
  if (geo?.bbox && typeof geo.bbox === 'string') geo.bbox = list(geo.bbox).map(Number);
  if (geo && !geo.bbox && !(Number.isFinite(Number(geo.lat)) && Number.isFinite(Number(geo.lon)))) throw Object.assign(new Error('Geo search needs lat and lon, or a bbox.'), { friendly: true });
  if (geo?.bbox && (geo.bbox.length !== 4 || geo.bbox.some(x => !Number.isFinite(x)))) throw Object.assign(new Error('bbox should be west,south,east,north.'), { friendly: true });
  if (geo && !geo.bbox) geo = { lat: Number(geo.lat), lon: Number(geo.lon), radius: meters(geo.radius ?? '10km') };
  let time = g('time'); if (typeof time === 'string' && time.trim().startsWith('{')) time = JSON.parse(time);
  const from = time?.from ?? g('from'), to = time?.to ?? g('to');
  const iso = v => { if (v == null || v === '') return null; const d = new Date(v); if (Number.isNaN(d.getTime())) throw Object.assign(new Error(`"${v}" is not a date.`), { friendly: true }); return d.toISOString(); };
  return { q: String(g('q') ?? '').trim().slice(0, 200), types: list(g('types')), geo: geo || null, time: from || to ? { from: iso(from), to: iso(to) } : null, size: Math.max(1, Math.min(Number(g('size')) || 20, 200)) };
}

export function createSearch({ graph, engine, syncout, sinks, secret, fetchImpl = globalThis.fetch, timeoutMs = 3000 }) {
  const sinkOf = () => sinks().find(s => s.kind === 'opensearch' && s.enabled !== false) || null;
  const client = s => new OpenSearchClient({ ...s.settings, password: secret(s.id) || undefined }, { fetchImpl, timeoutMs });

  /** Per readable type: which fields this caller may see (from the graph schema; '_' fields never). */
  async function access(subject, wantTypes) {
    const sch = graph.schema(), out = new Map();
    for (const t of sch.nodeTypes) {
      if (wantTypes.length && !wantTypes.includes(t.label)) continue;
      if (!subject || !(await engine.decide({ subject, action: 'read', entity: t.label, env: { via: 'ui' } })).allow) continue;
      const vis = t.props.filter(f => !f.startsWith('_') && engine.visible(subject, t.label, f));
      out.set(t.label, { vis, hidden: t.props.filter(f => !vis.includes(f)), keyVisible: !engine.keyHidden(subject, t.label) });
    }
    return out;
  }

  // ---- layer 1: the OpenSearch query with the mandatory access filter
  function buildQuery(o, acc) {
    const perType = [];
    for (const [label, a] of acc) {
      const filter = [{ term: { 'acl.label': label } }], fields = a.vis.map(f => `p.${safeField(f)}`);
      if (o.geo) filter.push({ terms: { geo_fields: a.vis } }, { bool: { must_not: { terms: { geo_fields: a.hidden.length ? a.hidden : ['\u0000'] } } } });
      if (o.time) filter.push({ terms: { time_field: a.vis } });
      const should = [];
      if (o.q) {
        if (fields.length) should.push({ multi_match: { query: o.q, fields, fuzziness: 'AUTO', prefix_length: 1, operator: 'and' } });
        should.push({ bool: { filter: [{ terms: { name_field: a.vis } }], should: [{ match: { name: { query: o.q, fuzziness: 'AUTO', prefix_length: 1, operator: 'and', boost: 4 } } }, { match_phrase_prefix: { 'name.prefix': { query: o.q, boost: 2 } } }], minimum_should_match: 1 } });
        should.push({ bool: { filter: [{ term: { kind: 'chunk' } }, { terms: { field: a.vis } }], must: [{ match: { text: { query: o.q, fuzziness: 'AUTO', prefix_length: 1 } } }] } });
        if (a.keyVisible) should.push({ match: { key: { query: o.q, fuzziness: 'AUTO', prefix_length: 1, boost: 2 } } });
      }
      perType.push({ bool: { filter, ...(should.length ? { should, minimum_should_match: 1 } : {}) } });
    }
    const filter = [{ bool: { should: perType, minimum_should_match: 1 } }];
    if (o.geo) filter.push(o.geo.bbox ? { geo_bounding_box: { geo: { top_left: { lat: o.geo.bbox[3], lon: o.geo.bbox[0] }, bottom_right: { lat: o.geo.bbox[1], lon: o.geo.bbox[2] } } } } : { geo_distance: { distance: `${Math.round(o.geo.radius)}m`, geo: { lat: o.geo.lat, lon: o.geo.lon } } });
    if (o.time) filter.push({ range: { time: { ...(o.time.from ? { gte: o.time.from } : {}), ...(o.time.to ? { lte: o.time.to } : {}) } } });
    if (!o.q) filter.push({ term: { kind: 'node' } });
    return {
      size: o.size * 3, track_total_hits: true, query: { bool: { filter } },
      ...(o.geo && !o.geo.bbox && !o.q ? { sort: [{ _geo_distance: { geo: { lat: o.geo.lat, lon: o.geo.lon }, order: 'asc', unit: 'm' } }] } : {}),
      highlight: { pre_tags: ['<mark>'], post_tags: ['</mark>'], fragment_size: 120, number_of_fragments: 2, require_field_match: true, fields: { 'p.*': {}, name: {}, text: {}, key: {} } },
      aggs: { types: { terms: { field: 'label', size: 50 } } },
    };
  }
  const brokenQuery = o => ({ size: o.size * 3, query: o.q ? { multi_match: { query: o.q, fields: ['p.*', 'name^4', 'text', 'key'], fuzziness: 'AUTO' } } : { match_all: {} }, highlight: { pre_tags: ['<mark>'], post_tags: ['</mark>'], fields: { 'p.*': {}, name: {}, text: {} } } });

  // ---- layer 2: re-check every hit against the graph and the live policy
  const pseudo = new Map(); // label -> Map(pseudonym -> node id), rebuilt when the graph changes
  let pseudoVer = -1;
  function resolve(nodeId) {
    const n = graph.getNode(nodeId); if (n) return n;
    const i = nodeId.indexOf(':'), label = nodeId.slice(0, i), key = nodeId.slice(i + 1);
    if (!key.startsWith('anon-')) return null;
    if (pseudoVer !== graph.version) { pseudo.clear(); pseudoVer = graph.version; }
    if (!pseudo.has(label)) pseudo.set(label, new Map(graph.nodes(label).map(x => [engine.pseudonym(label, x.key), x.id])));
    const id = pseudo.get(label).get(key); return id ? graph.getNode(id) : null;
  }
  function present(subject, n, a, extra = {}) {
    const v = engine.viewNode(subject, n), props = v.props;
    const nf = ['name', 'title', 'vessel_name', 'heading', 'label'].map(w => Object.keys(props).find(k => k.toLowerCase() === w)).find(k => k && props[k] !== MASK && props[k] !== '' && Number.isNaN(Number(props[k]))); // first readable, non-numeric name-like field
    const g = geoOf(Object.fromEntries(Object.entries(props).filter(([, x]) => x !== MASK))), t = timeOf(Object.fromEntries(Object.entries(props).filter(([, x]) => x !== MASK)));
    return { _gid: n.id, id: v.id, exploreId: `sg:node:${v.id}`, type: n.label, label: n.label, key: v.key, name: nf ? String(props[nf]) : v.key, props, ...(g ? { geo: { lat: g.lat, lon: g.lon } } : {}), ...(t ? { time: t.time } : {}), ...extra };
  }
  async function recheck(subject, hits, acc, o) {
    const out = new Map();
    for (const h of hits) {
      const s = h._source || {};
      if (BROKEN()) { const n = resolve(s.node_id || ''); if (n && !out.has(n.id)) out.set(n.id, { id: `${n.label}:${n.key}`, exploreId: `sg:node:${n.label}:${n.key}`, type: n.label, key: n.key, name: s.name || n.key, props: n.props, score: h._score, highlights: Object.entries(h.highlight || {}).map(([f, fr]) => ({ field: f.replace(/^p\./, ''), fragments: fr })) }); continue; }
      const n = resolve(s.node_id || ''); if (!n) continue; // deleted since it was indexed
      const a = acc.get(n.label); if (!a) continue; // type not readable now (or filtered out)
      if (!(await engine.decide({ subject, action: 'read', entity: n.label, env: { via: 'ui' } })).allow) continue;
      const hl = [];
      for (const [f, fr] of Object.entries(h.highlight || {})) {
        const field = f === 'name' ? s.name_field : f === 'text' ? s.field : f === 'key' ? null : (a.vis.find(x => `p.${safeField(x)}` === f) ?? null);
        if (f === 'key' ? !a.keyVisible : !field || !engine.visible(subject, n.label, field)) continue; // never return a fragment of a hidden field
        const fname = f === 'key' ? 'key' : field; if (!hl.some(x => x.field === fname)) hl.push({ field: fname, fragments: fr });
      }
      if (o.geo) { const g = geoOf(Object.fromEntries(Object.entries(n.props).filter(([k]) => engine.visible(subject, n.label, k)))); if (!g) continue; if (o.geo.bbox ? !(g.lon >= o.geo.bbox[0] && g.lon <= o.geo.bbox[2] && g.lat >= o.geo.bbox[1] && g.lat <= o.geo.bbox[3]) : haversine(o.geo, g) > o.geo.radius * 1.001) continue; }
      const prev = out.get(n.id);
      if (prev) { for (const x of hl) if (!prev.highlights.some(y => y.field === x.field)) prev.highlights.push(x); continue; }
      out.set(n.id, present(subject, n, a, { score: h._score, highlights: hl, ...(s.kind === 'chunk' ? { matchedIn: s.field } : {}) }));
      if (out.size >= o.size) break;
    }
    return [...out.values()];
  }

  // ---- layer 3: built-in search over already-filtered, masked graph data
  const lev = (a, b) => { // optimal string alignment distance (a swap of two neighbouring letters counts as one typo)
    if (Math.abs(a.length - b.length) > 2) return 9;
    const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i ? (j ? 0 : i) : j)));
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  };
  async function builtin(subject, o, acc) {
    const out = [], words = o.q.toLowerCase().split(/\s+/).filter(Boolean);
    for (const n of graph.nodes()) {
      const a = acc.get(n.label); if (!a) continue;
      const vis = Object.fromEntries(Object.entries(n.props).filter(([k, v]) => !k.startsWith('_') && v != null && engine.visible(subject, n.label, k)));
      if (o.geo) { const g = geoOf(vis); if (!g || (o.geo.bbox ? !(g.lon >= o.geo.bbox[0] && g.lon <= o.geo.bbox[2] && g.lat >= o.geo.bbox[1] && g.lat <= o.geo.bbox[3]) : haversine(o.geo, g) > o.geo.radius)) continue; }
      if (o.time) { const t = timeOf(vis); if (!t || (o.time.from && t.time < o.time.from) || (o.time.to && t.time > o.time.to)) continue; }
      const hl = [];
      if (words.length) {
        const vals = Object.entries(vis).map(([k, v]) => [k, String(v)]); if (a.keyVisible) vals.push(['key', n.key]);
        const ok = words.every(w => vals.some(([, v]) => { const l = v.toLowerCase(); return l.includes(w) || (w.length >= 4 && l.split(/\W+/).some(t => lev(t, w) <= (w.length > 7 ? 2 : 1))); }));
        if (!ok) continue;
        for (const [k, v] of vals) if (words.some(w => v.toLowerCase().includes(w))) hl.push({ field: k, fragments: [v.slice(0, 120).replace(new RegExp(words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi'), m => `<mark>${m}</mark>`)] });
      }
      out.push(present(subject, n, a, { score: hl.length, highlights: hl }));
      if (out.length >= o.size * 5) break;
    }
    return out.sort((x, y) => y.score - x.score).slice(0, o.size);
  }

  const group = results => { const m = new Map(); for (const r of results) (m.get(r.type) ?? m.set(r.type, []).get(r.type)).push(r); return [...m].map(([type, rs]) => ({ type, count: rs.length, results: rs })); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const safeHl = rs => rs.map(r => ({ ...r, highlights: (r.highlights || []).map(h => ({ ...h, fragments: h.fragments.map(f => esc(f).replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>')) })) }));

  async function status() {
    const s = sinkOf(); if (!s) return { index: 'none', configured: false };
    const st = syncout.status().find(x => x.id === s.id) || {};
    const base = { configured: true, sink: s.id, name: s.name, indexName: indexName(s.settings || {}), lastSync: st.lastAt || null, waiting: st.waiting, lastError: st.lastError || null };
    try {
      const os = client(s), h = await os.req('GET', '/_cluster/health');
      const c = await os.req('GET', `/${indexName(s.settings || {})}/_count`, null, { ok404: true });
      const healthy = h.status !== 'red' && c && st.health === 'green' && !st.lastError;
      return { ...base, index: healthy ? 'healthy' : 'stale', cluster: h.status, docs: c?.count ?? 0 };
    } catch (e) { return { ...base, index: 'offline', error: e.message }; }
  }

  async function search(subject, raw, { realIds = false } = {}) {
    const o = raw && raw.q !== undefined && raw.size !== undefined && 'geo' in raw ? raw : parseSearch(raw);
    const t0 = Date.now(), s = sinkOf();
    const acc = await access(subject, o.types);
    const fin = rs => safeHl(rs).map(({ _gid, ...r }) => (realIds && _gid ? { ...r, exploreId: `sg:node:${_gid}` } : r)); // realIds: for /api/explore/search, whose egress filter re-checks and pseudonymizes them
    const reply = (results, extra) => { const rs = fin(results); return { q: o.q, total: rs.length, groups: group(rs), results: rs, ms: Date.now() - t0, ...extra }; };
    if (!subject) return reply([], { index: s ? 'healthy' : 'none', engine: 'none', note: 'No user: nothing is visible (fail closed).' });
    if (!acc.size && !BROKEN()) return reply([], { index: s ? 'healthy' : 'none', engine: s ? 'opensearch' : 'built-in', note: 'You may not read any of these types.' });
    if (!s) return reply(await builtin(subject, o, acc), { index: 'none', engine: 'built-in' });
    try {
      const st = syncout.status().find(x => x.id === s.id) || {};
      const body = BROKEN() ? brokenQuery(o) : buildQuery(o, acc);
      const r = await client(s).req('POST', `/${indexName(s.settings || {})}/_search`, body);
      const results = await recheck(subject, r.hits?.hits || [], acc, o);
      return reply(results, { index: st.health === 'green' && !st.lastError ? 'healthy' : 'stale', engine: 'opensearch', indexed: r.hits?.total?.value ?? null, lastSync: st.lastAt || null });
    } catch (e) {
      return reply(await builtin(subject, o, acc), { index: 'offline', engine: 'built-in', offline: true, error: `Search index offline (${String(e.message).slice(0, 160)}); showing built-in search.` });
    }
  }
  return { search, status, parseSearch, buildQuery, access };
}
