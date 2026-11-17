// Canonical graph model (SPEC §3): validation and normalization shared by connectors, stream, service and UI.
export const RESERVED = new Set(['id', 'kind', 'fromId', 'toId', 'sources', 'version', 'deleted']);
export const KINDS = new Set(['node', 'link']);

export function isValidId(id, { allowSys = false } = {}) {
  if (typeof id !== 'string' || id.length === 0 || id.trim().length === 0) return false;
  if (!allowSys && id.startsWith('sys:')) return false;
  return true;
}

function jsonSafe(v, depth = 0) {
  if (depth > 32) return false;
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(x => jsonSafe(x, depth + 1));
  if (typeof v === 'object') { const p = Object.getPrototypeOf(v); return (p === Object.prototype || p === null) && Object.values(v).every(x => jsonSafe(x, depth + 1)); }
  return false; // undefined, function, bigint, symbol, class instances
}

const isoOrNull = t => { if (t == null || t === '') return null; const d = new Date(t); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };

/**
 * Validate and normalize one incoming canonical item.
 * Returns { ok, item, warnings, error }. Rejection is per item (§3.7).
 */
export function normalizeItem(raw, { allowSys = false, requireSources = false } = {}) {
  const warnings = [];
  if (!raw || typeof raw !== 'object') return { ok: false, error: { code: 'invalid', message: 'item must be an object' } };
  if (!isValidId(raw.id, { allowSys })) return { ok: false, error: { code: 'invalid', message: `invalid id ${JSON.stringify(raw.id)}` } };
  if (!KINDS.has(raw.kind)) return { ok: false, error: { code: 'invalid', message: `invalid kind for ${raw.id}` } };
  let type = raw.type;
  if (type == null) type = 'Unknown';
  if (typeof type !== 'string' || type.trim() === '') return { ok: false, error: { code: 'invalid', message: `invalid type for ${raw.id}` } };
  const item = { id: raw.id, kind: raw.kind, type };
  if (raw.label != null) item.label = String(raw.label);
  if (raw.kind === 'link') {
    if (!isValidId(raw.fromId, { allowSys: true }) || !isValidId(raw.toId, { allowSys: true })) return { ok: false, error: { code: 'invalid', message: `link ${raw.id} needs fromId and toId` } };
    item.fromId = raw.fromId; item.toId = raw.toId;
    item.directed = raw.directed === false ? false : true;
  }
  const props = {};
  const src = raw.properties && typeof raw.properties === 'object' && !Array.isArray(raw.properties) ? raw.properties : {};
  for (const [k, v] of Object.entries(src)) {
    if (RESERVED.has(k)) { warnings.push({ code: 'reserved_property', message: `property ${k} ignored (reserved)` }); continue; }
    if (!jsonSafe(v)) { warnings.push({ code: 'invalid_property', message: `property ${k} is not JSON-serializable` }); continue; }
    props[k] = v;
  }
  item.properties = props;
  const sources = Array.isArray(raw.sources) ? raw.sources.filter(s => s && typeof s.sourceId === 'string' && s.sourceId).map(s => ({
    sourceId: s.sourceId, nativeId: s.nativeId == null ? raw.id : String(s.nativeId), fetchedAt: isoOrNull(s.fetchedAt) || new Date().toISOString(), ...(s.queryId ? { queryId: String(s.queryId) } : {}),
  })) : [];
  if (requireSources && !sources.length) return { ok: false, error: { code: 'invalid', message: `item ${raw.id} has no provenance` } };
  item.sources = sources;
  const et = isoOrNull(raw.eventTime); if (et) item.eventTime = et;
  if (Number.isInteger(raw.version) && raw.version > 0) item.version = raw.version;
  if (typeof raw.x === 'number' && Number.isFinite(raw.x)) item.x = raw.x;
  if (typeof raw.y === 'number' && Number.isFinite(raw.y)) item.y = raw.y;
  if (raw.deleted === true) item.deleted = true;
  return { ok: true, item, warnings };
}

/** Display label rule (§3.2): label, else configured property keys, else id. */
export function displayLabel(item, keys = ['name', 'title', 'label']) {
  if (item.label) return item.label;
  for (const k of keys) { const v = item.properties?.[k]; if (v != null && v !== '') return String(v); }
  return item.id;
}

/** Result envelope (§4.2). */
export function envelope({ requestId = null, sourceId, items = [], nextCursor = null, truncated = false, warnings = [], error = null, startedAt = Date.now() } = {}) {
  return { requestId, sourceId, items, page: { nextCursor, truncated }, warnings, error, timingMs: Date.now() - startedAt };
}

export const stableStringify = v => JSON.stringify(sortKeys(v));
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])]));
  return v;
}
export const deepEqual = (a, b) => stableStringify(a) === stableStringify(b);
