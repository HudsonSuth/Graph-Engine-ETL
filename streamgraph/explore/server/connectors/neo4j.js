// Graph-query connector (SPEC §4.4.1) for Neo4j and Cypher-compatible stores.
// `driver` is a neo4j-driver Driver (or any object with session({database}).run(cypher, params) and verifyConnectivity()).
// Tests inject a fake driver; no database is needed to unit-test the mapping.
import { envelope, capLimit, fail } from './common.js';

const isInt = v => v && typeof v === 'object' && typeof v.low === 'number' && typeof v.high === 'number';
/** Integers beyond the safe JSON range become strings (§4.4.1). */
export function toJson(v) {
  if (isInt(v)) { const n = typeof v.inSafeRange === 'function' ? (v.inSafeRange() ? v.toNumber() : null) : (v.high === 0 || (v.high === -1 && v.low < 0) ? v.high * 2 ** 32 + (v.low >>> 0) : null); return n == null || !Number.isSafeInteger(n) ? (typeof v.toString === 'function' && v.toString !== Object.prototype.toString ? v.toString() : String(BigInt(v.high) * 2n ** 32n + BigInt(v.low >>> 0))) : n; }
  if (typeof v === 'bigint') return Number.isSafeInteger(Number(v)) ? Number(v) : v.toString();
  if (typeof v === 'number' && !Number.isSafeInteger(v) && Number.isInteger(v)) return String(v);
  if (Array.isArray(v)) return v.map(toJson);
  if (v && typeof v === 'object') {
    if (typeof v.toString === 'function' && ('year' in v || 'hour' in v || 'srid' in v)) return v.toString(); // temporal / spatial
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toJson(x)]));
  }
  return v;
}
const nativeNodeId = n => String(n.elementId ?? toJson(n.identity));
const nativeRelId = r => String(r.elementId ?? toJson(r.identity));
const isNode = v => v && typeof v === 'object' && Array.isArray(v.labels) && v.properties && ('elementId' in v || 'identity' in v);
const isRel = v => v && typeof v === 'object' && typeof v.type === 'string' && v.properties && ('startNodeElementId' in v || 'start' in v);
const isPath = v => v && typeof v === 'object' && Array.isArray(v.segments) && v.start && v.end;

export class Neo4jConnector {
  constructor({ sourceId = 'neo4j', driver, database, maxPageSize = 1000, maxDepth = 3, labelKeys = ['name', 'title'], timeoutMs = 10000, secrets = [], stubEndpoints = true } = {}) {
    Object.assign(this, { sourceId, driver, database, maxPageSize, maxDepth, labelKeys, timeoutMs, secrets, stubEndpoints });
  }
  capabilities() { return { queryLanguage: 'cypher', expand: true, maxPageSize: this.maxPageSize, stream: false, estimatedLagMs: null }; }
  id(kind, native) { return `${this.sourceId}:${kind}:${native}`; }
  async health() { try { await this.driver.verifyConnectivity?.(); return { status: 'ok' }; } catch { return { status: 'unavailable', message: 'cannot reach graph store' }; } }

  mapNode(n, fetchedAt) {
    const props = toJson(n.properties || {});
    const native = nativeNodeId(n);
    const label = this.labelKeys.map(k => props[k]).find(v => v != null && v !== '');
    return { id: this.id('node', native), kind: 'node', type: n.labels[0] || 'Unknown', ...(label != null ? { label: String(label) } : {}), properties: { ...props, ...(n.labels.length > 1 ? { labels: n.labels } : {}) }, sources: [{ sourceId: this.sourceId, nativeId: native, fetchedAt }] };
  }
  mapRel(r, fetchedAt) {
    const native = nativeRelId(r);
    const s = String(r.startNodeElementId ?? toJson(r.start)), e = String(r.endNodeElementId ?? toJson(r.end));
    return { id: this.id('link', native), kind: 'link', type: r.type, fromId: this.id('node', s), toId: this.id('node', e), directed: true, properties: toJson(r.properties || {}), sources: [{ sourceId: this.sourceId, nativeId: native, fetchedAt }] };
  }
  /** Flatten any record values (nodes, rels, paths, lists, maps) into unique canonical items. */
  mapRecords(records, fetchedAt = new Date().toISOString()) {
    const out = new Map();
    const visit = v => {
      if (v == null) return;
      if (isPath(v)) { visit(v.start); for (const s of v.segments) { visit(s.start); visit(s.relationship); visit(s.end); } return; }
      if (isNode(v)) { const it = this.mapNode(v, fetchedAt); out.set(it.id, it); return; }
      if (isRel(v)) { const it = this.mapRel(v, fetchedAt); out.set(it.id, it); return; }
      if (Array.isArray(v)) return v.forEach(visit);
      if (typeof v === 'object' && !isInt(v)) Object.values(v).forEach(visit);
    };
    for (const rec of records) visit(typeof rec?.toObject === 'function' ? rec.toObject() : rec?.keys && rec?._fields ? rec._fields : rec);
    const items = [...out.values()];
    const warnings = [];
    if (this.stubEndpoints) for (const l of items.filter(i => i.kind === 'link')) for (const end of [l.fromId, l.toId]) if (!out.has(end)) {
      const stub = { id: end, kind: 'node', type: 'Unknown', properties: { stub: true }, sources: [{ sourceId: this.sourceId, nativeId: end.split(':node:')[1], fetchedAt }] };
      out.set(end, stub); items.push(stub);
    }
    return { items, warnings };
  }
  async #run(cypher, params) {
    const session = this.driver.session({ database: this.database, defaultAccessMode: 'READ' });
    try { const r = await session.run(cypher, params, { timeout: this.timeoutMs }); return r.records; } finally { await session.close?.(); }
  }
  async search({ types = null, text = null, limit = 100, cursor = null, requestId = null } = {}) {
    const startedAt = Date.now(), lim = capLimit(limit, this.maxPageSize), skip = Number(cursor) || 0;
    const cypher = 'MATCH (n) WHERE ($types IS NULL OR any(l IN labels(n) WHERE l IN $types)) AND ($text IS NULL OR any(k IN $keys WHERE toLower(toString(n[k])) CONTAINS toLower($text))) RETURN n ORDER BY elementId(n) SKIP $skip LIMIT $limit';
    try {
      const recs = await this.#run(cypher, { types, text, keys: this.labelKeys, skip: int(skip), limit: int(lim + 1) });
      const truncated = recs.length > lim;
      const { items, warnings } = this.mapRecords(recs.slice(0, lim));
      return envelope({ requestId, sourceId: this.sourceId, items, truncated, nextCursor: truncated ? String(skip + lim) : null, warnings, startedAt });
    } catch (e) { return fail(this.sourceId, 'source_unavailable', e, this.secrets, startedAt); }
  }
  async expand({ ids = [], direction = 'both', types = null, depth = 1, limit = 100, requestId = null } = {}) {
    const startedAt = Date.now(), lim = capLimit(limit, this.maxPageSize), d = Math.max(1, Math.min(depth | 0 || 1, this.maxDepth));
    const natives = ids.filter(i => i.startsWith(`${this.sourceId}:node:`)).map(i => i.slice(`${this.sourceId}:node:`.length));
    const pat = direction === 'out' ? `-[r*1..${d}]->` : direction === 'in' ? `<-[r*1..${d}]-` : `-[r*1..${d}]-`;
    const cypher = `MATCH p=(n)${pat}(m) WHERE elementId(n) IN $ids AND ($types IS NULL OR any(l IN labels(m) WHERE l IN $types)) RETURN p LIMIT $limit`;
    try {
      const recs = await this.#run(cypher, { ids: natives, types, limit: int(lim + 1) });
      const truncated = recs.length > lim;
      const { items, warnings } = this.mapRecords(recs.slice(0, lim));
      return envelope({ requestId, sourceId: this.sourceId, items, truncated, warnings, startedAt });
    } catch (e) { return fail(this.sourceId, 'source_unavailable', e, this.secrets, startedAt); }
  }
  async refresh({ ids = [], requestId = null } = {}) {
    const startedAt = Date.now();
    const natives = ids.filter(i => i.startsWith(`${this.sourceId}:node:`)).map(i => i.slice(`${this.sourceId}:node:`.length));
    try {
      const recs = await this.#run('MATCH (n) WHERE elementId(n) IN $ids RETURN n', { ids: natives });
      const { items } = this.mapRecords(recs);
      const found = new Set(items.map(i => i.id));
      const warnings = ids.filter(i => !found.has(i)).map(i => ({ code: 'not_found', message: i }));
      return envelope({ requestId, sourceId: this.sourceId, items, warnings, startedAt });
    } catch (e) { return fail(this.sourceId, 'source_unavailable', e, this.secrets, startedAt); }
  }
}
// neo4j-driver needs integers for SKIP/LIMIT; a plain number works with fakes. Use driver's int() when available.
let neoInt = null;
try { neoInt = (await import('neo4j-driver')).default.int; } catch {}
const int = n => (neoInt ? neoInt(n) : n);
