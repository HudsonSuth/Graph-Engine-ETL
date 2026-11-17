// Generic HTTP connector (SPEC §4.4.3): templates + JSON-pointer response mapping. `fetch` is injectable for tests.
import { envelope, capLimit, fail } from './common.js';
export function pointer(obj, ptr) {
  if (!ptr || ptr === '/') return obj;
  return ptr.split('/').slice(1).map(p => p.replace(/~1/g, '/').replace(/~0/g, '~')).reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export class HttpConnector {
  constructor({ sourceId = 'http', baseUrl, headers = {}, search, expand, nodesPointer = '/nodes', linksPointer = '/links', fetch: f = globalThis.fetch, timeoutMs = 10000, secrets = [] } = {}) {
    Object.assign(this, { sourceId, baseUrl, headers, searchT: search, expandT: expand, nodesPointer, linksPointer, fetch: f, timeoutMs, secrets: [...secrets, ...Object.values(headers)] });
  }
  capabilities() { return { queryLanguage: 'http-template', expand: !!this.expandT, maxPageSize: 1000, stream: false, estimatedLagMs: null }; }
  async health() { return { status: 'ok' }; }
  #url(tpl, vars) { return new URL(tpl.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(Array.isArray(vars[k]) ? vars[k].join(',') : vars[k] ?? '')), this.baseUrl).toString(); }
  async #call(tpl, vars, requestId) {
    const startedAt = Date.now();
    let res;
    try { res = await this.fetch(this.#url(tpl, vars), { headers: this.headers, signal: AbortSignal.timeout(this.timeoutMs) }); }
    catch (e) { return fail(this.sourceId, e?.name === 'TimeoutError' ? 'timeout' : 'source_unavailable', e, this.secrets, startedAt); }
    if (res.status === 429) return fail(this.sourceId, 'source_throttled', `HTTP 429`, this.secrets, startedAt);
    if (res.status === 503 || res.status >= 500) return fail(this.sourceId, 'source_unavailable', `HTTP ${res.status}`, this.secrets, startedAt);
    if (!res.ok) return fail(this.sourceId, 'invalid', `HTTP ${res.status}`, this.secrets, startedAt);
    let body; try { body = JSON.parse(await res.text()); } catch { return fail(this.sourceId, 'invalid_response', 'response is not complete JSON', this.secrets, startedAt); }
    const nodes = pointer(body, this.nodesPointer) || [], links = pointer(body, this.linksPointer) || [];
    if (!Array.isArray(nodes) || !Array.isArray(links)) return fail(this.sourceId, 'invalid_response', 'mapped value is not an array', this.secrets, startedAt);
    const fetchedAt = new Date().toISOString(), src = id => [{ sourceId: this.sourceId, nativeId: String(id), fetchedAt }];
    const items = [
      ...nodes.map(n => ({ id: `${this.sourceId}:node:${n.id}`, kind: 'node', type: n.type || 'Unknown', label: n.label ?? n.name, properties: n.properties || {}, sources: src(n.id) })),
      ...links.map(l => ({ id: `${this.sourceId}:link:${l.id}`, kind: 'link', type: l.type || 'Unknown', fromId: `${this.sourceId}:node:${l.from}`, toId: `${this.sourceId}:node:${l.to}`, properties: l.properties || {}, sources: src(l.id) })),
    ];
    return envelope({ requestId, sourceId: this.sourceId, items, truncated: !!pointer(body, '/truncated'), nextCursor: pointer(body, '/nextCursor') ?? null, startedAt });
  }
  search({ text = '', limit = 100, cursor = '', requestId = null } = {}) { return this.#call(this.searchT, { text, limit: capLimit(limit), cursor }, requestId); }
  expand({ ids = [], limit = 100, requestId = null } = {}) { return this.#call(this.expandT, { ids: ids.map(i => i.split(':node:')[1] ?? i), limit: capLimit(limit) }, requestId); }
  async refresh() { return envelope({ sourceId: this.sourceId, warnings: [{ code: 'unsupported', message: 'refresh not configured' }] }); }
}
