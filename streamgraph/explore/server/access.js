// StreamGraph access rules (ABAC) for the Explore layer, applied in two places:
//  1. viewItem(): type-level read decisions, field masking, display-label masking and key pseudonyms for one item
//     (used by ex.guard for internal computations; real ids are kept so the in-memory service still works).
//  2. egress(): a fail-closed filter over EVERY JSON / NDJSON / SSE payload that leaves /api/explore/*. It drops items of
//     denied types (and anything that references them), masks fields, and rewrites ids whose key is hidden into the same
//     pseudonyms the studio uses. ingress() maps those pseudonyms back for later requests.
// Deny by default, deny wins and hidden fields stay hidden are inherited from the StreamGraph engine (src/abac/engine.js).
import { AsyncLocalStorage } from 'node:async_hooks';
import { MASK } from '../../src/abac/engine.js';

export const SG = 'streamgraph';
const NODE_RE = /^sg:node:([A-Za-z_]\w*):([\s\S]*)$/, LINK_RE = /^sg:link:([A-Za-z_]\w*):([\s\S]*?)-\[(\w+)\]->([A-Za-z_]\w*):([\s\S]*)$/;
export const DROP = Symbol('drop');
export const als = new AsyncLocalStorage(); // { subjectId } of the current HTTP request
const BROKEN = () => process.env.EXPLORE_ABAC === 'broken'; // DELIBERATELY WRONG filter for tests: passes everything through

export function createAccess({ engine = null, service = null, derivedTypes = () => null } = {}) {
  const pseudo = new Map(); // pseudonym id -> real id
  const fromSG = it => it?.sources?.some(s => s.sourceId === SG) || (typeof it?.id === 'string' && it.id.startsWith('sg:'));
  // per-call decision cache: type -> allow
  const ctx = (subjectId, action = 'read') => {
    const subject = engine && subjectId ? engine.subject(subjectId) : null;
    const ok = new Map();
    return { subject, async allowed(type) { if (!subject) return false; if (!ok.has(type)) ok.set(type, (await engine.decide({ subject, action, entity: type, env: { via: action === 'export' ? 'export' : 'api' } })).allow); return ok.get(type); } };
  };
  const vkey = (c, label, key) => (engine.viewKey ? engine.viewKey(c.subject, label, key) : key);
  const canSee = (subject, type, f) => engine.maskProps(subject, type, { [f]: 1 }).props[f] !== MASK;
  const nodeId = (c, label, key) => { const v = vkey(c, label, key); const id = `sg:node:${label}:${v}`; if (v !== key) pseudo.set(id, `sg:node:${label}:${key}`); return id; };
  const linkId = (c, m) => { const id = `sg:link:${m[1]}:${vkey(c, m[1], m[2])}-[${m[3]}]->${m[4]}:${vkey(c, m[4], m[5])}`; if (id !== m[0]) pseudo.set(id, m[0]); return id; };
  /** Rewrite one id string: returns DROP when it points at something the subject may not read. */
  async function viewId(c, s) {
    let m = NODE_RE.exec(s);
    if (m) return (await c.allowed(m[1])) ? nodeId(c, m[1], m[2]) : DROP;
    m = LINK_RE.exec(s);
    if (m) return (await c.allowed(m[3])) && (await c.allowed(m[1])) && (await c.allowed(m[4])) ? linkId(c, m) : DROP;
    return s;
  }
  const labelField = p => (p?.name != null ? 'name' : p?.title != null ? 'title' : null);
  /** One StreamGraph item as the subject may see it (null = not visible). ids: 'real' keeps ids, 'view' pseudonymizes. */
  // entity-resolution items copy values from StreamGraph records: visible only if every matched record type is readable,
  // and a field only if it is visible on every matched type (fail closed)
  const isDerived = it => it?.sources?.some(s => s.sourceId === 'er') || (typeof it?.id === 'string' && it.id.startsWith('er:'));
  async function derivedOk(c) { const ts = derivedTypes(); if (!ts) return true; if (!c.subject) return false; for (const t of ts) if (!(await c.allowed(t))) return false; return true; }
  async function viewDerived(c, it) {
    if (!(await derivedOk(c))) return null; const ts = derivedTypes() || [];
    const vis = f => ts.every(t => canSee(c.subject, t, f)), props = {};
    for (const [k, v] of Object.entries(it.properties || {})) props[k] = ['score', 'matchKey', 'records', 'recordCount', 'size', 'decision'].includes(k) || vis(k) ? v : MASK;
    const out = { ...it, properties: props }; if (it.kind === 'node' && !vis('name')) out.label = MASK;
    if (it.kind === 'link') for (const end of [it.fromId, it.toId]) { const e = NODE_RE.exec(end || ''); if (e && !(await c.allowed(e[1]))) return null; }
    return out;
  }
  async function viewItem(c, it, ids = 'real') {
    if (it && isDerived(it) && derivedTypes()) { if (!engine) return null; return viewDerived(c, it); }
    if (!it || !fromSG(it)) return it;
    if (!c.subject) return null; // no StreamGraph user: fail closed
    if (it.kind === 'link') {
      const m = LINK_RE.exec(it.id);
      if (!(await c.allowed(it.type))) return null;
      for (const end of [it.fromId, it.toId]) { const e = NODE_RE.exec(end || ''); if (e && !(await c.allowed(e[1]))) return null; }
      const out = { ...it, properties: engine.maskProps(c.subject, it.type, it.properties).props };
      if (ids === 'view') { out.id = m ? linkId(c, m) : it.id; out.fromId = await viewId(c, it.fromId); out.toId = await viewId(c, it.toId); out.sources = it.sources?.map(s => ({ ...s, nativeId: m ? out.id.slice(8) : s.nativeId })); }
      return out;
    }
    if (it.kind !== 'node') return it;
    if (!(await c.allowed(it.type))) return null;
    const m = NODE_RE.exec(it.id), key = m ? m[2] : String(it.properties?.key ?? '');
    const raw = service?.live?.(it.id)?.properties || it.properties || {};
    const { key: _k, ...rest } = it.properties || {};
    const props = engine.maskProps(c.subject, it.type, rest).props, vk = vkey(c, it.type, key);
    props.key = vk;
    const lf = labelField(raw), label = lf ? (canSee(c.subject, it.type, lf) ? String(raw[lf]) : vk === key ? MASK : vk) : vk;
    const out = { ...it, label, properties: props };
    if (ids === 'view' && m) { out.id = nodeId(c, it.type, key); out.sources = it.sources?.map(s => (s.sourceId === SG ? { ...s, nativeId: `${it.type}:${vk}` } : s)); }
    return out;
  }
  const isItem = o => (o.kind === 'node' || o.kind === 'link') && typeof o.id === 'string';
  async function walk(c, v) {
    if (typeof v === 'string') return v.startsWith('sg:') ? viewId(c, v) : v.startsWith('er:') && derivedTypes() && !(await derivedOk(c)) ? DROP : v;
    if (Array.isArray(v)) { const out = []; for (const x of v) { const y = await walk(c, x); if (y !== DROP) out.push(y); } return out; }
    if (!v || typeof v !== 'object') return v;
    if (isItem(v) && (fromSG(v) || (isDerived(v) && derivedTypes()))) {
      const it = await viewItem(c, v, 'view'); if (!it) return DROP;
      const out = {}; for (const [k, x] of Object.entries(it)) out[k] = ['properties', 'sources', 'id', 'fromId', 'toId', 'label'].includes(k) ? x : await walk(c, x);
      for (const k of Object.keys(out)) if (out[k] === DROP) return DROP;
      return out;
    }
    const out = {}, envelope = typeof v.deltaSeq === 'number';
    for (const [k, x] of Object.entries(v)) {
      const nk = k.startsWith('sg:') ? await viewId(c, k) : k; if (nk === DROP) continue;
      const y = await walk(c, x); if (y === DROP) { if (envelope) continue; return DROP; } // anything that references hidden data is left out whole (a live-update envelope keeps its sequence number so the viewer sees no gap)
      out[nk] = y;
    }
    return out;
  }
  return {
    pseudo, fromSG, ctx, viewItem, canSee,
    /** internal guard: keeps real ids (the in-memory service works on them) */
    async guard(items, subjectId) { const c = ctx(subjectId), out = []; for (const it of items) { const v = await viewItem(c, it, 'real'); if (v) out.push(v); } return out; },
    /** filter any outgoing payload for subjectId; returns DROP if the whole payload is hidden */
    async egress(payload, subjectId) { if (BROKEN()) return payload; return walk(ctx(subjectId), payload); },
    /** map pseudonym ids in an incoming body / query value back to real ids */
    ingress(v) {
      const f = x => (typeof x === 'string' ? (pseudo.get(x) ?? x) : Array.isArray(x) ? x.map(f) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, y]) => [pseudo.get(k) ?? k, f(y)])) : x);
      return f(v);
    },
  };
}
