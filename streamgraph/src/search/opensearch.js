// OpenSearch (Apache-2.0) search index: REST client over plain fetch, index mapping, document builder and the sync-out sink.
// Each indexed document carries the access attributes needed to decide who may see it:
//   acl.label / acl.tags / acl.classification   the type's ABAC attributes at index time
//   need.<field>                               clearance needed to see that field (engine.fieldNeeds)
//   name_field / geo_fields / time_field       which source fields fed name, geo and time (so a caller who cannot see them
//                                              cannot match, filter or sort on them either)
// The index is written as the sink's "send as" user (like every sync-out sink), so hidden fields never reach it.
// Searches never trust these stored attributes alone: src/search/service.js builds the access filter from the live policy
// and re-checks every hit against the graph before it is returned.
export const DEFAULT_PREFIX = 'streamgraph-';
export const indexName = cfg => `${String(cfg.index || cfg.indexPrefix || DEFAULT_PREFIX).toLowerCase().replace(/[^a-z0-9_.\-]/g, '-')}graph`;
const CHUNK = 600, OVERLAP = 80, LONG = 800; // document text longer than LONG chars is split into overlapping chunks
const NAME_FIELDS = ['name', 'title', 'vessel_name', 'heading', 'label'];
const LAT = ['lat', 'latitude', 'y_lat'], LON = ['lon', 'lng', 'long', 'longitude', 'x_lon'];
const TIME = ['ts', 'updated_at', 'time', 'date', 'eventtime', 'event_time', 'timestamp'];
export const safeField = f => String(f).replace(/[.\s]+/g, '_').replace(/^_+/, '') || 'field';

export class OpenSearchClient {
  constructor(cfg = {}, { fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
    this.base = String(cfg.url || 'http://127.0.0.1:9200').replace(/\/+$/, ''); this.fetch = fetchImpl; this.timeoutMs = timeoutMs;
    this.auth = cfg.user ? 'Basic ' + Buffer.from(`${cfg.user}:${cfg.password || ''}`).toString('base64') : null;
  }
  async req(method, path, body, { ndjson = false, ok404 = false } = {}) {
    const headers = { 'content-type': ndjson ? 'application/x-ndjson' : 'application/json', ...(this.auth ? { authorization: this.auth } : {}) };
    const r = await this.fetch(this.base + path, { method, headers, body: body == null ? undefined : ndjson ? body : JSON.stringify(body), signal: AbortSignal.timeout(this.timeoutMs) });
    const text = await r.text(); let j; try { j = text ? JSON.parse(text) : {}; } catch { j = { raw: text }; }
    if (r.status === 404 && ok404) return null;
    if (!r.ok) { const why = j?.error?.reason || j?.error?.type || j?.raw || r.statusText; throw Object.assign(new Error(`OpenSearch ${r.status}: ${typeof why === 'string' ? why.slice(0, 300) : JSON.stringify(why)}`), { status: r.status }); }
    return j;
  }
}

export const MAPPING = {
  settings: {
    number_of_shards: 1, number_of_replicas: 0, 'mapping.total_fields.limit': 5000,
    analysis: {
      filter: { sg_edge: { type: 'edge_ngram', min_gram: 2, max_gram: 15 } },
      analyzer: {
        sg_text: { type: 'custom', tokenizer: 'standard', filter: ['lowercase', 'asciifolding'] },
        sg_prefix: { type: 'custom', tokenizer: 'standard', filter: ['lowercase', 'asciifolding', 'sg_edge'] },
      },
    },
  },
  mappings: {
    dynamic: true,
    dynamic_templates: [
      { props: { path_match: 'p.*', mapping: { type: 'text', analyzer: 'sg_text', fields: { kw: { type: 'keyword', ignore_above: 256 } } } } },
      { needs: { path_match: 'need.*', mapping: { type: 'integer' } } },
    ],
    properties: {
      kind: { type: 'keyword' }, node_id: { type: 'keyword' }, parent: { type: 'keyword' }, label: { type: 'keyword' },
      key: { type: 'text', analyzer: 'sg_text', fields: { kw: { type: 'keyword' } } },
      name: { type: 'text', analyzer: 'sg_text', fields: { kw: { type: 'keyword', ignore_above: 256 }, prefix: { type: 'text', analyzer: 'sg_prefix', search_analyzer: 'sg_text' } } },
      name_field: { type: 'keyword' }, field: { type: 'keyword' }, text: { type: 'text', analyzer: 'sg_text' },
      geo: { type: 'geo_point' }, geo_fields: { type: 'keyword' }, time: { type: 'date' }, time_field: { type: 'keyword' },
      acl: { properties: { label: { type: 'keyword' }, tags: { type: 'keyword' }, classification: { type: 'integer' }, policy: { type: 'keyword' }, sink_user: { type: 'keyword' } } },
      run: { type: 'long' }, indexed_at: { type: 'date' },
      p: { type: 'object', dynamic: true }, need: { type: 'object', dynamic: true },
    },
  },
};

const pick = (props, names) => { const ks = Object.keys(props); for (const n of names) { const k = ks.find(x => x.toLowerCase() === n); if (k != null && props[k] !== '' && props[k] != null) return k; } return null; };
const pickName = props => NAME_FIELDS.map(n => Object.keys(props).find(k => k.toLowerCase() === n)).find(k => k && typeof props[k] === 'string' && props[k] && Number.isNaN(Number(props[k]))) || Object.keys(props).find(k => /name$/i.test(k) && typeof props[k] === 'string' && props[k]) || null;
const toTime = v => { if (v == null || v === '') return null; const n = Number(v); const d = Number.isFinite(n) && String(v).trim() !== '' ? new Date(n < 1e11 ? n * 1000 : n) : new Date(String(v)); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };
export const geoOf = props => {
  const la = pick(props, LAT), lo = pick(props, LON); if (!la || !lo) return null;
  const lat = Number(props[la]), lon = Number(props[lo]);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon, fields: [la, lo] } : null;
};
export const timeOf = props => { const k = pick(props, TIME); const t = k && toTime(props[k]); return t ? { time: t, field: k } : null; };

/** Build the documents for one node, as the sink user sees it (props already masked; masked values are left out). */
export function buildDocs(node, { engine, run, sinkUser, mask = '[hidden]' }) {
  const props = Object.fromEntries(Object.entries(node.props || {}).filter(([k, v]) => !k.startsWith('_') && v !== mask && v != null && typeof v !== 'object'));
  const ent = engine?.snap?.entities?.[node.label] || {}, need = f => (engine ? engine.fieldNeeds(node.label, f) : 3);
  const node_id = `${node.label}:${node.key}`, acl = { label: node.label, tags: ent.tags || [], classification: Number.isInteger(ent.classification) ? ent.classification : null, policy: String(engine?.snap?.version ?? ''), sink_user: sinkUser || null };
  const p = {}, needs = {}, chunks = [];
  for (const [k, v] of Object.entries(props)) {
    const f = safeField(k), s = String(v); needs[f] = need(k);
    if (s.length > LONG) {
      p[f] = s.slice(0, 300);
      for (let i = 0, n = 0; i < s.length; i += CHUNK - OVERLAP, n++) {
        chunks.push({ _id: `${node_id}#${f}#${n}`, kind: 'chunk', parent: node_id, node_id, label: node.label, field: k, text: s.slice(i, i + CHUNK), acl, need: { [f]: needs[f] }, run, indexed_at: new Date().toISOString() });
        if (i + CHUNK >= s.length) break;
      }
    } else p[f] = s;
  }
  const nf = pickName(props), g = geoOf(props), t = timeOf(props);
  const doc = { _id: node_id, kind: 'node', node_id, label: node.label, key: String(node.key), p, need: needs, acl, run, indexed_at: new Date().toISOString(),
    ...(nf ? { name: String(props[nf]), name_field: nf } : {}),
    ...(g ? { geo: { lat: g.lat, lon: g.lon }, geo_fields: g.fields } : {}),
    ...(t ? { time: t.time, time_field: t.field } : {}) };
  return [doc, ...chunks];
}

// ---- sync-out sink: batch = { run, nodes: [{label,key,props}], delNodes: [{label,key}], edges, delEdges } (edges are not indexed)
export class OpenSearchSink {
  constructor(cfg, { engine, fetchImpl, sinkUser } = {}) { this.cfg = cfg; this.engine = engine; this.sinkUser = sinkUser; this.os = new OpenSearchClient(cfg, { fetchImpl, timeoutMs: 30000 }); this.index = indexName(cfg); this.ready = false; }
  async ensure() {
    if (this.ready) return;
    if (!(await this.os.req('HEAD', `/${this.index}`, null, { ok404: true }))) {
      try { await this.os.req('PUT', `/${this.index}`, MAPPING); } catch (e) { if (!/resource_already_exists/.test(e.message)) throw e; }
    }
    this.ready = true;
  }
  async test() {
    const h = await this.os.req('GET', '/_cluster/health');
    if (h.status === 'red') throw new Error(`OpenSearch cluster ${h.cluster_name} is red`);
    await this.ensure();
    const id = `__streamgraph_write_test_${process.pid}`;
    await this.os.req('PUT', `/${this.index}/_doc/${encodeURIComponent(id)}?refresh=true`, { kind: 'test', node_id: id, label: '__test__', acl: { label: '__test__' } });
    await this.os.req('DELETE', `/${this.index}/_doc/${encodeURIComponent(id)}?refresh=true`);
    return { status: h.status, cluster: h.cluster_name, index: this.index };
  }
  async bulk(lines) {
    if (!lines.length) return;
    const r = await this.os.req('POST', '/_bulk?refresh=true', lines.map(l => JSON.stringify(l)).join('\n') + '\n', { ndjson: true });
    const bad = r.errors && r.items.find(i => { const x = Object.values(i)[0]; return x.error && !(x.status === 404 && i.delete); });
    if (bad) { const x = Object.values(bad)[0]; throw new Error(`OpenSearch rejected ${x._id}: ${x.error.reason || x.error.type}`); }
  }
  async apply(b) {
    await this.ensure();
    const touched = [...b.nodes, ...b.delNodes].map(n => `${n.label}:${n.key}`);
    if (touched.length) await this.os.req('POST', `/${this.index}/_delete_by_query?refresh=true&conflicts=proceed`, { query: { bool: { filter: [{ term: { kind: 'chunk' } }, { terms: { parent: touched } }] } } });
    const lines = [];
    for (const n of b.delNodes) lines.push({ delete: { _index: this.index, _id: `${n.label}:${n.key}` } });
    for (const n of b.nodes) for (const { _id, ...d } of buildDocs(n, { engine: this.engine, run: b.run, sinkUser: this.sinkUser })) lines.push({ index: { _index: this.index, _id } }, d);
    await this.bulk(lines);
  }
  async sweep(run) { await this.ensure(); await this.os.req('POST', `/${this.index}/_delete_by_query?refresh=true&conflicts=proceed`, { query: { range: { run: { lt: run } } } }); }
  async count() { await this.ensure(); return (await this.os.req('GET', `/${this.index}/_count`)).count; }
  async close() { this.ready = false; }
}
