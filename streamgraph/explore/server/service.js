// In-memory graph service (SPEC §5, §7): merge/dedupe, conflict policies, entity resolution,
// tombstones, permissions (fail closed), sessions with working sets and ordered incremental deltas.
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { normalizeItem, deepEqual, displayLabel, envelope } from '../shared/model.js';

const DAY = 24 * 3600 * 1000;
const iso = ms => new Date(ms).toISOString();
const tms = s => (s ? Date.parse(s) : NaN);

export class GraphService extends EventEmitter {
  constructor({ conflictPolicy = 'field-merge-lww', tombstoneTtlMs = DAY, maxFutureSkewMs = 5 * 60 * 1000, resolution = [], collapseDuplicateLinks = false,
    access = null, fieldAttribution = false, coalesceMs = 16, now = () => Date.now() } = {}) {
    super(); this.setMaxListeners(0);
    Object.assign(this, { conflictPolicy, tombstoneTtlMs, maxFutureSkewMs, resolution, collapseDuplicateLinks, fieldAttribution, coalesceMs, now });
    this.access = access; // { sources: { [sourceId]: { read: ['*' | 'role:x' | 'user:y'] } } }  null = everyone may read everything
    this.items = new Map();      // id -> stored item (incl. tombstones)
    this.adj = new Map();        // node id -> Set(link ids) for links that reference it (even dangling)
    this.aliases = new Map();    // alias id -> canonical id
    this.keyIndex = new Map();   // `${type}\0${key}` -> canonical node id
    this.createdSeq = 0;
    this.sessions = new Map();
    this.connectors = new Map(); // sourceId -> connector
    this.audit = [];             // conflict audit (server-side only)
    this.metrics = { inserted: 0, updated: 0, noop: 0, removed: 0, rejected: 0, staleIgnored: 0, mergeConflicts: 0, resolved: 0, deltasSent: 0, snapshotsSent: 0, incrementalApplies: 0 };
    this.lag = {};               // sourceId -> { lagMs, status }
  }

  // ---------- identity helpers
  resolveId(id) { let c = id, n = 0; while (this.aliases.has(c) && n++ < 64) c = this.aliases.get(c); return c; }
  #link(id, nodeId) { let s = this.adj.get(nodeId); if (!s) this.adj.set(nodeId, s = new Set()); s.add(id); }
  #unlink(id, nodeId) { const s = this.adj.get(nodeId); if (s) { s.delete(id); if (!s.size) this.adj.delete(nodeId); } }
  get(id) { return this.items.get(this.resolveId(id)); }
  live(id) { const it = this.get(id); return it && !it.deleted ? it : undefined; }
  incidentLinks(nodeId) { return [...(this.adj.get(nodeId) || [])].map(l => this.items.get(l)).filter(l => l && !l.deleted); }
  counts() { let n = 0, l = 0, t = 0; for (const it of this.items.values()) { if (it.deleted) t++; else if (it.kind === 'node') n++; else l++; } return { nodes: n, links: l, tombstones: t, aliases: this.aliases.size }; }

  // ---------- checkpoint support (Kafka mode: state + offsets are saved together, §6 replay)
  exportState() { return { v: 1, items: [...this.items.values()], aliases: [...this.aliases], keyIndex: [...this.keyIndex], createdSeq: this.createdSeq }; }
  importState(x) {
    this.items = new Map(x.items.map(it => [it.id, it])); this.aliases = new Map(x.aliases); this.keyIndex = new Map(x.keyIndex); this.createdSeq = x.createdSeq || 0;
    this.adj = new Map(); for (const it of this.items.values()) if (it.kind === 'link') { this.#link(it.id, it.fromId); this.#link(it.id, it.toId); }
  }

  // ---------- writes (§5.2-§5.5)
  /** Upsert one canonical item. ctx: { writerSources?: string[], eventTime?, partial?, batchIndex? } */
  upsert(raw, ctx = {}) {
    const norm = normalizeItem(raw, { allowSys: !!ctx.allowSys });
    if (!norm.ok) { this.metrics.rejected++; return { status: 'rejected', error: norm.error }; }
    const inc = norm.item;
    if (ctx.writerSources && inc.sources.some(s => !ctx.writerSources.includes(s.sourceId))) { this.metrics.rejected++; return { status: 'forbidden', error: { code: 'forbidden', message: `writer may not publish for that source` } }; }
    if (!inc.sources.length && ctx.defaultSource) inc.sources.push({ sourceId: ctx.defaultSource, nativeId: inc.id, fetchedAt: iso(this.now()) });
    const warnings = [...norm.warnings];
    // clock skew (§5.8)
    const nowMs = this.now();
    if (inc.eventTime && tms(inc.eventTime) - nowMs > this.maxFutureSkewMs) { inc.eventTime = iso(nowMs); warnings.push({ code: 'future_event_time_clamped', message: `eventTime clamped for ${inc.id}` }); }
    inc.id = this.resolveId(inc.id);
    if (inc.kind === 'link') { inc.fromId = this.resolveId(inc.fromId); inc.toId = this.resolveId(inc.toId); }
    const stored = this.items.get(inc.id);
    if (stored && stored.kind !== inc.kind && !stored.deleted) { this.metrics.rejected++; return { status: 'rejected', error: { code: 'conflict', message: `id ${inc.id} is a ${stored.kind}` } }; }
    let res;
    if (stored && stored.kind !== inc.kind) { this.items.delete(inc.id); res = this.#insert(inc, stored.version + 1); }
    else if (!stored) res = this.#insert(inc);
    else res = this.#merge(stored, inc, ctx, warnings);
    if (res.status === 'inserted' || res.status === 'updated') {
      if (inc.kind === 'node') this.#resolveEntity(res.item);
      if (inc.kind === 'link' && this.collapseDuplicateLinks) this.#collapseLink(res.item);
    }
    return { ...res, warnings };
  }

  #insert(inc, version = 1) {
    const t = this.now();
    const ts = inc.eventTime ? tms(inc.eventTime) : t;
    const item = { ...inc, version: Math.max(version, inc.version || 1), updatedAt: iso(t), deleted: false, _created: ++this.createdSeq,
      _pt: Object.fromEntries(Object.keys(inc.properties).map(k => [k, ts])), _ps: Object.fromEntries(Object.keys(inc.properties).map(k => [k, inc.sources[0]?.sourceId])),
      _tt: ts, _lt: ts, _et: ts };
    this.items.set(item.id, item);
    if (item.kind === 'link') { this.#link(item.id, item.fromId); this.#link(item.id, item.toId); }
    this.metrics.inserted++;
    this.#changed([item.id]);
    return { status: 'inserted', item };
  }

  #merge(stored, inc, ctx, warnings) {
    const t = this.now();
    const ts = inc.eventTime ? tms(inc.eventTime) : t;
    const wasDeleted = stored.deleted;
    const policy = ctx.policy || this.conflictPolicy;
    if (policy === 'reject-stale' && !wasDeleted && ((inc.eventTime && ts < stored._et) || (inc.version && inc.version < stored.version))) {
      this.metrics.staleIgnored++; warnings.push({ code: 'stale_ignored', message: `older update for ${stored.id} ignored` });
      return { status: 'stale_ignored', item: stored };
    }
    // stub placeholders are fully replaced by the first real item
    const replaceAll = policy === 'replace' || wasDeleted || (stored.properties.stub === true && inc.properties.stub !== true);
    let props, pt, ps, type = stored.type, label = stored.label, tt = stored._tt, lt = stored._lt;
    if (replaceAll) {
      props = { ...inc.properties }; pt = {}; ps = {};
      for (const k of Object.keys(props)) { pt[k] = ts; ps[k] = inc.sources[0]?.sourceId; }
      type = inc.type; label = inc.label; tt = ts; lt = ts;
    } else { // field-merge-lww (also used for non-stale reject-stale updates)
      props = { ...stored.properties }; pt = { ...stored._pt }; ps = { ...stored._ps };
      for (const [k, v] of Object.entries(inc.properties)) {
        if (pt[k] == null || ts >= pt[k]) {
          if (k in props && !deepEqual(props[k], v)) { this.metrics.mergeConflicts++; if (this.audit.length < 1000) this.audit.push({ id: stored.id, key: k, old: props[k], new: v, at: iso(t) }); }
          props[k] = v; pt[k] = ts; ps[k] = inc.sources[0]?.sourceId;
        }
      }
      if (ts >= tt && inc.type !== 'Unknown') { type = inc.type; tt = ts; }
      if (inc.label != null && ts >= lt) { label = inc.label; lt = ts; }
    }
    let fromId = stored.fromId, toId = stored.toId, directed = stored.directed;
    if (stored.kind === 'link' && (replaceAll || ts >= stored._et)) { fromId = inc.fromId; toId = inc.toId; directed = inc.directed; }
    // provenance union (dedupe by sourceId+nativeId, keep latest fetchedAt)
    const prov = new Map(stored.sources.map(s => [s.sourceId + '\0' + s.nativeId, s]));
    let provChanged = false;
    for (const s of inc.sources) {
      const k = s.sourceId + '\0' + s.nativeId, old = prov.get(k);
      if (!old) { prov.set(k, s); provChanged = true; } else if (s.fetchedAt > old.fetchedAt) prov.set(k, { ...old, ...s });
    }
    const sources = [...prov.values()];
    const same = !wasDeleted && !provChanged && type === stored.type && label === stored.label && fromId === stored.fromId && toId === stored.toId && directed === stored.directed && deepEqual(props, stored.properties);
    if (same) { stored.sources = sources; this.metrics.noop++; return { status: 'noop', item: stored }; } // idempotent: no version bump, no delta
    const oldEnds = stored.kind === 'link' ? [stored.fromId, stored.toId] : null;
    Object.assign(stored, { type, label, properties: props, sources, version: stored.version + 1, updatedAt: iso(t), deleted: false, _pt: pt, _ps: ps, _tt: tt, _lt: lt, _et: Math.max(stored._et, ts) });
    if (inc.eventTime) stored.eventTime = iso(Math.max(tms(inc.eventTime), tms(stored.eventTime) || 0));
    if (label === undefined) delete stored.label;
    if (stored.kind === 'link') {
      Object.assign(stored, { fromId, toId, directed });
      if (oldEnds[0] !== fromId || oldEnds[1] !== toId) { this.#unlink(stored.id, oldEnds[0]); this.#unlink(stored.id, oldEnds[1]); }
      this.#link(stored.id, fromId); this.#link(stored.id, toId);
    }
    delete stored._removedAt;
    this.metrics.updated++;
    const affected = [stored.id]; if (oldEnds) affected.push(...oldEnds);
    this.#changed(affected);
    return { status: 'updated', item: stored, revived: wasDeleted };
  }

  /** Remove (tombstone) an id. Unknown ids become tombstones; repeated removes are no-ops (§5.5, §6.2). */
  remove(id, ctx = {}) {
    if (typeof id !== 'string' || !id) return { status: 'rejected' };
    const rid = this.resolveId(id);
    const stored = this.items.get(rid);
    const t = this.now();
    if (!stored) {
      this.items.set(rid, { id: rid, kind: ctx.kind || 'node', type: 'Unknown', properties: {}, sources: [], version: 1, updatedAt: iso(t), deleted: true, _removedAt: t, _pt: {}, _ps: {}, _tt: 0, _lt: 0, _et: 0, _created: ++this.createdSeq });
      return { status: 'noop' };
    }
    if (stored.deleted) return { status: 'noop' };
    if (ctx.writerSources && stored.sources.length && !stored.sources.some(s => ctx.writerSources.includes(s.sourceId))) return { status: 'forbidden' };
    stored.deleted = true; stored.version++; stored.updatedAt = iso(t); stored._removedAt = t;
    if (stored._rk && this.keyIndex.get(stored._rk) === rid) this.keyIndex.delete(stored._rk);
    this.metrics.removed++;
    this.#changed([rid]);
    return { status: 'removed', item: stored };
  }

  /** Garbage-collect tombstones older than tombstoneTtl. */
  gc() {
    const cut = this.now() - this.tombstoneTtlMs; let n = 0;
    for (const [id, it] of this.items) if (it.deleted && it._removedAt <= cut) {
      if (it.kind === 'link') { this.#unlink(id, it.fromId); this.#unlink(id, it.toId); }
      this.items.delete(id); n++;
    }
    return n;
  }

  // ---------- entity resolution (§5.4)
  #keyOf(node) {
    for (const r of this.resolution) {
      if (r.type && r.type !== node.type) continue;
      const vals = r.keys.map(k => node.properties[k]);
      if (vals.some(v => v == null || v === '')) continue;
      return `${node.type}\0${vals.map(v => String(v).trim().toLowerCase()).join('\0')}`;
    }
    return null;
  }
  #resolveEntity(node) {
    if (!this.resolution.length || node.deleted) return;
    const k = this.#keyOf(node); if (!k) return;
    const other = this.keyIndex.get(k);
    node._rk = k;
    if (!other || other === node.id) { this.keyIndex.set(k, node.id); return; }
    const o = this.items.get(other);
    if (!o || o.deleted) { this.keyIndex.set(k, node.id); return; }
    const [canon, alias] = o._created <= node._created ? [o, node] : [node, o];
    this.keyIndex.set(k, canon.id); canon._rk = k;
    // fold alias into canonical under the active conflict policy
    for (const [p, v] of Object.entries(alias.properties)) if (canon._pt[p] == null || alias._pt[p] >= canon._pt[p]) { canon.properties[p] = v; canon._pt[p] = alias._pt[p]; canon._ps[p] = alias._ps[p]; }
    const prov = new Map(canon.sources.map(s => [s.sourceId + '\0' + s.nativeId, s]));
    for (const s of alias.sources) prov.set(s.sourceId + '\0' + s.nativeId, s);
    canon.sources = [...prov.values()]; canon.version++; canon.updatedAt = iso(this.now());
    canon.aliases = [...new Set([...(canon.aliases || []), alias.id, ...(alias.aliases || [])])];
    this.aliases.set(alias.id, canon.id);
    for (const [a, c] of this.aliases) if (c === alias.id) this.aliases.set(a, canon.id);
    const changed = [canon.id, alias.id];
    for (const lid of [...(this.adj.get(alias.id) || [])]) {
      const l = this.items.get(lid); if (!l) continue;
      this.#unlink(lid, l.fromId); this.#unlink(lid, l.toId);
      if (l.fromId === alias.id) l.fromId = canon.id;
      if (l.toId === alias.id) l.toId = canon.id;
      this.#link(lid, l.fromId); this.#link(lid, l.toId);
      if (!l.deleted) { l.version++; l.updatedAt = iso(this.now()); }
      changed.push(lid);
    }
    this.adj.delete(alias.id);
    this.items.delete(alias.id); // alias ids are redirected, not tombstoned
    this.metrics.resolved++;
    this.#changed(changed);
  }
  #collapseLink(link) {
    for (const other of this.incidentLinks(link.fromId)) {
      if (other.id !== link.id && other.type === link.type && other.fromId === link.fromId && other.toId === link.toId && other._created < link._created) {
        this.aliases.set(link.id, other.id); this.#unlink(link.id, link.fromId); this.#unlink(link.id, link.toId); this.items.delete(link.id);
        this.#changed([link.id, other.id]); return;
      }
    }
  }

  // ---------- permissions (§5.7) — fail closed
  canReadSource(principal, sourceId) {
    if (!this.access) return true;
    if (principal?.admin) return true;
    const pol = this.access.sources?.[sourceId];
    if (!pol || !Array.isArray(pol.read)) return false;
    return pol.read.some(r => r === '*' || r === `user:${principal?.id}` || (r.startsWith('role:') && principal?.roles?.includes(r.slice(5))));
  }
  /** Returns the session-visible public form of an item, or null. */
  view(item, principal) {
    if (!item || item.deleted) return null;
    if (!item.sources.length) return null;
    const readable = item.sources.map(s => this.canReadSource(principal, s.sourceId));
    if (!readable.some(Boolean)) return null;
    let properties = item.properties, sources = item.sources;
    if (!readable.every(Boolean)) {
      if (!this.fieldAttribution) return null; // cannot attribute fields: require all sources readable
      properties = Object.fromEntries(Object.entries(item.properties).filter(([k]) => item._ps[k] == null || this.canReadSource(principal, item._ps[k])));
      sources = item.sources.filter((s, i) => readable[i]);
    }
    if (item.kind === 'link') {
      const a = this.items.get(item.fromId), b = this.items.get(item.toId);
      if (!this.view(a, principal) || !this.view(b, principal)) return null;
    }
    return publicItem(item, properties, sources);
  }

  // ---------- change fan-out to sessions (§6.8, §7.2)
  #changed(ids) {
    const affected = new Set();
    for (const id of ids) {
      affected.add(id);
      const it = this.items.get(id);
      if (!it || it.kind === 'node') for (const l of this.adj.get(id) || []) affected.add(l);
    }
    this.emit('change', affected);
    for (const s of this.sessions.values()) s.markDirty(affected);
  }

  openSession({ principal = { id: 'anonymous', roles: [] }, follow = true, types = null, initialSearch = null, coalesceMs = this.coalesceMs, grow = false, growLinkTypes = null, growMax = 5000 } = {}) {
    const s = new Session(this, { principal, follow, types, coalesceMs, grow: !follow && !!grow, growLinkTypes, growMax });
    this.sessions.set(s.id, s);
    if (initialSearch) this.search(s.id, initialSearch);
    else if (follow) for (const it of this.items.values()) { if (s.wants(it)) s.ws.add(it.id); }
    return { sessionId: s.id, snapshot: s.snapshot() };
  }
  closeSession(id) { const s = this.sessions.get(id); if (s) { s.close(); this.sessions.delete(id); } }
  session(id) { const s = this.sessions.get(id); if (!s) throw Object.assign(new Error('unknown session'), { code: 'not_found' }); return s; }

  // ---------- commands (§7.3)
  search(sessionId, { text = '', types = null, limit = 50, cursor = 0 } = {}) {
    const s = this.session(sessionId), q = String(text).toLowerCase(), out = [];
    let skipped = 0, truncated = false;
    for (const it of this.items.values()) {
      if (it.kind !== 'node' || it.deleted || (types && !types.includes(it.type))) continue;
      const hay = [it.id, displayLabel(it), ...Object.values(it.properties).filter(v => typeof v !== 'object').map(String)].join('\u0001').toLowerCase();
      if (q && !hay.includes(q)) continue;
      if (this.searchVisible && !this.searchVisible(it, q)) continue;
      const v = this.view(it, s.principal); if (!v) continue;
      if (skipped++ < cursor) continue;
      if (out.length >= limit) { truncated = true; break; }
      out.push(v);
    }
    s.addToWorkingSet(out.map(i => i.id));
    return { items: out, truncated, nextCursor: truncated ? cursor + limit : null };
  }

  /** Expand (§5.6): visible in-memory neighbors, optionally refreshed from connectors. */
  async expand(sessionId, { ids = [], direction = 'both', types = null, limit = 100, cursor = 0, useConnectors = true } = {}) {
    const s = this.session(sessionId), warnings = [];
    if (useConnectors) {
      const bySource = new Map();
      for (const id of ids) { const it = this.live(id); for (const p of it?.sources || []) { const c = this.connectors.get(p.sourceId); if (c?.capabilities().expand) { if (!bySource.has(p.sourceId)) bySource.set(p.sourceId, []); bySource.get(p.sourceId).push(id); } } }
      for (const [sid, sids] of bySource) {
        const r = await this.fetchFromConnector(sid, 'expand', { ids: sids, direction, types, limit: limit + cursor + 1 });
        if (r.error) warnings.push({ code: r.error.code, message: `${sid}: ${r.error.message}` });
      }
    }
    const neighbors = new Map(), links = new Map();
    for (const raw of ids) {
      const id = this.resolveId(raw);
      for (const l of this.incidentLinks(id)) {
        const out = l.fromId === id, other = out ? l.toId : l.fromId;
        const dirOk = direction === 'both' || !l.directed || (direction === 'out' ? out : !out);
        if (!dirOk) continue;
        const n = this.live(other); if (!n || (types && !types.includes(n.type))) continue;
        const lv = this.view(l, s.principal), nv = this.view(n, s.principal);
        if (!lv || !nv) continue;
        if (!neighbors.has(n.id)) neighbors.set(n.id, nv);
        if (!links.has(l.id)) links.set(l.id, { lv, other: n.id });
      }
    }
    const order = [...neighbors.keys()].sort();
    const page = order.slice(cursor, cursor + limit), keep = new Set(page);
    const truncated = order.length > cursor + limit;
    const seeds = ids.map(i => this.view(this.live(i), s.principal)).filter(Boolean);
    const items = [...seeds, ...page.map(id => neighbors.get(id)), ...[...links.values()].filter(x => keep.has(x.other)).map(x => x.lv)];
    s.addToWorkingSet(items.map(i => i.id));
    return { items, truncated, nextCursor: truncated ? cursor + limit : null, warnings };
  }

  release(sessionId, ids) { const s = this.session(sessionId); for (const id of ids) s.ws.delete(this.resolveId(id)); return { released: ids.length }; }

  /** Unweighted shortest path on the permissioned in-memory graph (§11.4). */
  path(sessionId, { fromId, toId, directed = true, maxLength = 8 } = {}) {
    const s = this.session(sessionId);
    const a = this.resolveId(fromId), b = this.resolveId(toId);
    if (!this.view(this.items.get(a), s.principal) || !this.view(this.items.get(b), s.principal)) return { found: false, message: 'start or end is not visible', incomplete: this.connectors.size > 0 };
    const prev = new Map([[a, null]]); let frontier = [a], depth = 0;
    while (frontier.length && depth < maxLength && !prev.has(b)) {
      const next = [];
      for (const u of frontier) for (const l of this.incidentLinks(u)) {
        let v; if (l.fromId === u) v = l.toId; else if (!directed || !l.directed) v = l.fromId; else continue;
        if (l.fromId === u && l.toId === u) continue;
        if (prev.has(v) || !this.view(l, s.principal)) continue;
        prev.set(v, { u, l: l.id }); next.push(v);
      }
      frontier = next.sort(); depth++;
    }
    if (!prev.has(b)) return { found: false, message: `No path within ${maxLength} hops`, incomplete: this.connectors.size > 0 };
    const nodeIds = [b], linkIds = []; let c = b;
    while (prev.get(c)) { const { u, l } = prev.get(c); linkIds.unshift(l); nodeIds.unshift(u); c = u; }
    const items = [...nodeIds, ...linkIds].map(id => this.view(this.items.get(id), s.principal));
    s.addToWorkingSet(items.map(i => i.id));
    return { found: true, nodeIds, linkIds, items, incomplete: this.connectors.size > 0 };
  }

  // ---------- connectors (§4)
  registerConnector(c) { this.connectors.set(c.sourceId, c); }
  /** Run a connector op and merge its items. A failed request never deletes existing items. */
  async fetchFromConnector(sourceId, op, req) {
    const c = this.connectors.get(sourceId);
    if (!c) return envelope({ sourceId, error: { code: 'not_found', message: 'unknown source' } });
    let env;
    try { env = await c[op](req); } catch (e) { env = envelope({ sourceId, error: { code: 'source_unavailable', message: 'connector failed' } }); }
    if (env.error) return env;
    for (const it of env.items) this.upsert(it, { writerSources: [sourceId], defaultSource: sourceId });
    return env;
  }

  setLag(sourceId, lag) { this.lag[sourceId] = lag; }
}

export function publicItem(it, properties = it.properties, sources = it.sources) {
  const o = { id: it.id, kind: it.kind, type: it.type, properties, sources, version: it.version, updatedAt: it.updatedAt };
  if (it.label != null) o.label = it.label;
  if (it.eventTime) o.eventTime = it.eventTime;
  if (it.kind === 'link') { o.fromId = it.fromId; o.toId = it.toId; o.directed = it.directed; }
  if (it.aliases) o.aliases = it.aliases;
  if (it.x != null) o.x = it.x; if (it.y != null) o.y = it.y;
  return o;
}

class Session extends EventEmitter {
  constructor(svc, { principal, follow, types, coalesceMs, grow = false, growLinkTypes = null, growMax = 5000 }) {
    super();
    Object.assign(this, { svc, principal, follow, types, coalesceMs, grow, growLinkTypes, growMax });
    this.grown = 0;           // items added by live growth (SPEC §23.2.4), capped by growMax
    this.id = randomUUID();
    this.ws = new Set();      // working set (ids)
    this.sent = new Map();    // id -> version last sent to the client
    this.deltaSeq = 0;
    this.dirty = new Set();
    this.timer = null;
    this.closed = false;
  }
  wants(it) {
    if (!it || it.deleted) return false;
    if (this.types && it.kind === 'node' && !this.types.includes(it.type)) return false;
    return !!this.svc.view(it, this.principal);
  }
  snapshot() {
    this.sent.clear();
    const items = [];
    for (const id of this.ws) { const v = this.svc.view(this.svc.items.get(id), this.principal); if (v) { items.push(v); this.sent.set(id, v.version); } else this.ws.delete(id); }
    this.dirty.clear();
    this.svc.metrics.snapshotsSent++;
    return { sessionId: this.id, items, groups: [], deltaCursor: this.deltaSeq, serverTime: iso(this.svc.now()) };
  }
  addToWorkingSet(ids) { for (const id of ids) { this.ws.add(id); this.dirty.add(id); } this.schedule(); }
  /** Items already delivered in a command response (e.g. a streamed neighbourhood): join the working set as sent. */
  adopt(views) { for (const v of views) { this.ws.add(v.id); this.sent.set(v.id, v.version); } }
  markDirty(ids) {
    for (const id of ids) {
      if (this.grow) this.growWith(id);
      if (this.ws.has(id) || this.sent.has(id)) this.dirty.add(id);
      else if (this.follow) { const it = this.svc.items.get(id); if (it && this.wants(it)) { this.ws.add(id); this.dirty.add(id); } }
    }
    if (this.dirty.size) this.schedule();
  }
  /** Live neighbourhood growth (SPEC §23.2.4): a link that touches a node in the working set joins it with its other end. */
  growWith(id) {
    const it = this.svc.items.get(id);
    if (!it || it.deleted || it.kind !== 'link' || this.grown >= this.growMax) return;
    if (!this.ws.has(it.fromId) && !this.ws.has(it.toId)) return;
    if (this.growLinkTypes && !this.growLinkTypes.includes(it.type)) return;
    for (const x of this.svc.growWrong ? [it.id] : [it.id, it.fromId, it.toId]) if (!this.ws.has(x)) { this.ws.add(x); this.dirty.add(x); this.grown++; }
  }
  schedule() {
    if (this.closed || this.timer || !this.dirty.size) return;
    if (this.coalesceMs <= 0) { queueMicrotask(() => this.flush()); this.timer = true; return; }
    this.timer = setTimeout(() => this.flush(), this.coalesceMs);
  }
  /** Build and emit one coalesced delta. Returns it (or null if nothing changed). */
  flush() {
    if (this.timer && this.timer !== true) clearTimeout(this.timer);
    this.timer = null;
    if (this.closed || !this.dirty.size) return null;
    const upserts = [], removes = [];
    for (const id of this.dirty) {
      const it = this.svc.items.get(id);
      const v = this.ws.has(id) ? this.svc.view(it, this.principal) : null;
      if (v) { if (this.sent.get(id) !== v.version) { upserts.push(v); this.sent.set(id, v.version); } }
      else if (this.sent.has(id)) { removes.push(id); this.sent.delete(id); if (!it || it.deleted) this.ws.delete(id); }
    }
    this.dirty.clear();
    if (!upserts.length && !removes.length) return null;
    // nodes before links so a client can attach links immediately
    upserts.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'node' ? -1 : 1));
    const delta = { sessionId: this.id, deltaSeq: ++this.deltaSeq, baseCursor: String(this.deltaSeq - 1), serverTime: iso(this.svc.now()), upserts, removes, groups: [], groupRemoves: [], lag: this.svc.lag };
    this.svc.metrics.deltasSent++;
    this.emit('delta', delta);
    return delta;
  }
  close() { this.closed = true; if (this.timer && this.timer !== true) clearTimeout(this.timer); this.removeAllListeners(); }
}
