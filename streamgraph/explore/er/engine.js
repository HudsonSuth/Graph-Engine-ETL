// Incremental, entity-centric resolution (SPEC §21). Engine-neutral: the matcher (Splink or Duke sidecar, or the
// deliberately wrong one) only scores record pairs; this class owns records, the scored-pair graph, clustering, stable
// entity ids, merge/split on re-resolution and the derived graph items (Entity nodes, RESOLVES_TO, POSSIBLY_SAME).
//
// Behaviour modelled on Senzing's PUBLIC documentation (entity-centric, every record resolves to exactly one entity,
// "why" explanations, possible-match relationships, data source + record id, re-resolution that can merge or split
// entities as records arrive or change). No Senzing code, API or data model is used.
import { createHash } from 'node:crypto';

const pairKey = (a, b) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
const h = s => createHash('sha1').update(s).digest('hex').slice(0, 12);
const stable = v => JSON.stringify(v);

export class ErEngine {
  /** cfg = erConfig(); matcher = SidecarMatcher | WrongMatcher (configure/upsert/remove/compare) */
  constructor({ cfg, matcher, log = () => {}, now = () => Date.now() }) {
    Object.assign(this, { cfg, matcher, log, now });
    this.S = cfg.sourceId;
    this.records = new Map();   // record id -> { id, type, values, sig, dataSource, recordId, label, sourceIds }
    this.edges = new Map();     // record id -> Map(other id -> edge)    edge = { a, b, score, matchWeight, prior, why }
    this.recEntity = new Map(); // record id -> entity id
    this.entities = new Map();  // entity id -> { id, type, members: Set, created }
    this.everIds = new Set();   // entity ids ever issued (never reused for a different entity)
    this.redirects = new Map(); // retired entity id -> surviving entity id (merges), for resolve_entity on old ids
    this.published = new Map(); // derived item id -> signature last emitted
    this.possible = new Map();  // entity id -> Set(POSSIBLY_SAME link ids)
    this.human = new Map();     // integration: reviewer decisions per record pair 'a|b' -> 'same' | 'different' (override the score)
    this.humanSame = new Map(); // record id -> Set(record ids a reviewer said are the same)
    this.seq = 0;
    this.history = [];          // last re-resolution events (merge / split / create / retire), newest last
    this.metrics = { upserts: 0, removes: 0, unchanged: 0, merges: 0, splits: 0, created: 0, retired: 0, pairsScored: 0, batches: 0, matcherMs: 0, resolveMs: 0 };
  }
  typeCfg(t) { return this.cfg.types[t]; }
  isRecordType(t) { return !!this.cfg.types[t]; }
  async start({ models = {} } = {}) {
    for (const [t, tc] of Object.entries(this.cfg.types)) await this.matcher.configure(t, { ...tc, maxCandidates: this.cfg.maxCandidates, ...(models[t] ? { model: models[t] } : {}) });
    return this;
  }
  /** Values the matcher sees for one record (config "from" properties; arrays become multi-values). */
  values(type, props) {
    const out = {};
    for (const p of this.typeCfg(type).properties) {
      const vs = [];
      for (const k of p.from || [p.name]) { const v = props?.[k]; if (v == null || v === '') continue; if (Array.isArray(v)) vs.push(...v.map(String)); else vs.push(String(v)); }
      if (p.join && vs.length) out[p.name] = [vs.join(' ')]; else if (vs.length) out[p.name] = vs;
    }
    return out;
  }
  /** graph item -> record descriptor (or null when it is not a record) */
  recordOf(item) {
    if (!item || item.kind !== 'node' || !this.isRecordType(item.type) || item.deleted) return null;
    if (String(item.id).startsWith(`${this.S}:`)) return null;
    const src = (item.sources || []).map(s => s.sourceId).filter(s => s !== this.S);
    const values = this.values(item.type, item.properties);
    return { id: item.id, type: item.type, values, sig: stable([item.type, values]), label: item.label || item.properties?.name || item.id,
      dataSource: String(item.properties?.[this.cfg.dataSourceProperty] ?? src[0] ?? 'unknown'), recordId: String(item.properties?.[this.cfg.recordIdProperty] ?? item.sources?.[0]?.nativeId ?? item.id),
      sourceIds: [...new Set(src)] };
  }

  // ------------------------------------------------------------------ apply a batch of record changes
  /**
   * changes: [{ op: 'upsert', item } | { op: 'remove', id }]. Returns { events } - §6 events (payloads) for the derived
   * items that changed, in a safe order (nodes before links, link removes before node removes).
   */
  async apply(changes) {
    const t0 = performance.now();
    this.metrics.batches++;
    const dirty = new Set(), byType = new Map(), removed = [], prevEntities = new Set(), labelOnly = new Set();
    const last = new Map(); for (const c of changes) last.set(c.op === 'remove' ? c.id : c.item.id, c); // last change per id wins
    for (const [id, c] of last) {
      const old = this.records.get(id);
      const rec = c.op === 'upsert' ? this.recordOf(c.item) : null;
      if (!rec) { if (old) { removed.push(old); this.metrics.removes++; } continue; }
      if (old && old.type !== rec.type) removed.push(old);
      else if (old && old.sig === rec.sig) { // matching values unchanged: only the entity's display data may change
        this.metrics.unchanged++;
        if (old.label !== rec.label || old.dataSource !== rec.dataSource || stable(old.sourceIds) !== stable(rec.sourceIds)) { this.records.set(id, rec); labelOnly.add(id); }
        continue;
      }
      this.metrics.upserts++;
      let l = byType.get(rec.type); if (!l) byType.set(rec.type, l = []); l.push(rec);
    }
    // removals
    const rmByType = new Map();
    for (const r of removed) {
      for (const o of this._dropEdges(r.id)) dirty.add(o);
      if (this.recEntity.has(r.id)) prevEntities.add(this.recEntity.get(r.id));
      this.records.delete(r.id);
      let l = rmByType.get(r.type); if (!l) rmByType.set(r.type, l = []); l.push(r.id);
    }
    const tm = performance.now();
    for (const [t, ids] of rmByType) await this.matcher.remove(t, ids);
    // upserts: score against everything live (the matcher indexes the batch first, so pairs inside the batch are found too)
    for (const [t, recs] of byType) {
      for (let i = 0; i < recs.length; i += this.cfg.maxBatch) {
        const chunk = recs.slice(i, i + this.cfg.maxBatch);
        const results = await this.matcher.upsert(t, chunk.map(r => ({ id: r.id, values: r.values })));
        for (const r of chunk) { for (const o of this._dropEdges(r.id)) dirty.add(o); this.records.set(r.id, r); dirty.add(r.id); }
        for (const res of results) for (const m of res.matches) {
          if (!this.records.has(m.id) || m.id === res.id) continue;
          this.metrics.pairsScored++;
          const e = { a: res.id < m.id ? res.id : m.id, b: res.id < m.id ? m.id : res.id, score: m.score, matchWeight: m.matchWeight, prior: m.prior ?? 0, why: m.why || [] };
          this.#setEdge(e); dirty.add(m.id);
        }
      }
    }
    this.metrics.matcherMs += performance.now() - tm;
    for (const id of labelOnly) if (this.recEntity.has(id)) prevEntities.add(this.recEntity.get(id));
    const out = this.#recluster(dirty, prevEntities, removed);
    this.metrics.resolveMs += performance.now() - t0;
    return out;
  }

  _dropEdges(id) {
    const m = this.edges.get(id); if (!m) return [];
    for (const o of m.keys()) this.edges.get(o)?.delete(id);
    this.edges.delete(id);
    return [...m.keys()];
  }
  #setEdge(e) {
    for (const [x, y] of [[e.a, e.b], [e.b, e.a]]) { let m = this.edges.get(x); if (!m) this.edges.set(x, m = new Map()); m.set(y, e); }
  }
  isMatch(e, type) { const h = this.human.get(e.a < e.b ? `${e.a}|${e.b}` : `${e.b}|${e.a}`); if (h) return h === 'same'; return e.score >= this.typeCfg(type).threshold; }
  /** integration: a reviewer's decision on two records. 'same' joins them even below the threshold; 'different' stops their
   *  direct match and hides the possible-match link (they can still end up together through other records that match both). */
  async decide(a, b, decision) {
    if (!this.records.has(a) || !this.records.has(b) || a === b) return { events: [] };
    const k = a < b ? `${a}|${b}` : `${b}|${a}`; this.human.set(k, decision);
    for (const [x, y] of [[a, b], [b, a]]) { let s = this.humanSame.get(x); if (!s) this.humanSame.set(x, s = new Set()); if (decision === 'same') s.add(y); else s.delete(y); }
    const prev = new Set([this.recEntity.get(a), this.recEntity.get(b)].filter(Boolean));
    return this.#recluster(new Set([a, b]), prev, []);
  }

  // ------------------------------------------------------------------ clustering + stable ids
  #recluster(dirty, prevEntities, removed) {
    // seeds: changed records, their old/new neighbours and every member of the entities they belonged to
    const seeds = new Set([...dirty].filter(id => this.records.has(id)));
    for (const id of dirty) { const e = this.recEntity.get(id); if (e) prevEntities.add(e); }
    for (const eid of prevEntities) for (const m of this.entities.get(eid)?.members || []) if (this.records.has(m)) seeds.add(m);
    // connected components over match edges (score >= type threshold), within one record type
    const comps = [], seen = new Set();
    for (const s of seeds) {
      if (seen.has(s)) continue;
      const type = this.records.get(s).type, comp = [], stack = [s]; seen.add(s);
      while (stack.length) {
        const x = stack.pop(); comp.push(x);
        const pe = this.recEntity.get(x); if (pe) prevEntities.add(pe);
        for (const [y, e] of this.edges.get(x) || []) if (!seen.has(y) && this.records.get(y)?.type === type && this.isMatch(e, type)) { seen.add(y); stack.push(y); }
        for (const y of this.humanSame.get(x) || []) if (!seen.has(y) && this.records.get(y)?.type === type) { seen.add(y); stack.push(y); }
      }
      comp.sort(); comps.push({ type, members: comp });
    }
    for (const eid of prevEntities) for (const m of this.entities.get(eid)?.members || []) if (this.records.has(m) && !seen.has(m)) { // members cut off from any seed (should not happen) stay put
      seen.add(m); comps.push({ type: this.records.get(m).type, members: [m] });
    }
    // id assignment: biggest component first keeps the id of the previous entity it shares most records with (ties: older entity)
    comps.sort((x, y) => y.members.length - x.members.length || (x.members[0] < y.members[0] ? -1 : 1));
    const claimed = new Map(), oldMembers = new Map([...prevEntities].map(e => [e, new Set(this.entities.get(e)?.members || [])]));
    for (const c of comps) {
      const votes = new Map();
      for (const m of c.members) { const e = this.recEntity.get(m); if (e && oldMembers.has(e)) votes.set(e, (votes.get(e) || 0) + 1); }
      const ranked = [...votes].filter(([e]) => !claimed.has(e)).sort((x, y) => y[1] - x[1] || (this.entities.get(x[0]).created - this.entities.get(y[0]).created));
      c.id = ranked.length ? ranked[0][0] : this._mint(c.type, c.members[0]);
      c.fromIds = [...votes.keys()];
      claimed.set(c.id, c);
    }
    // apply: history (merge / split), membership, retire
    const touched = new Set();
    for (const c of comps) {
      const prev = this.entities.get(c.id);
      const absorbed = c.fromIds.filter(e => e !== c.id);
      if (absorbed.length) { this.metrics.merges++; for (const e of absorbed) if (!claimed.has(e)) this.redirects.set(e, c.id); this.#hist({ kind: 'merge', entityId: c.id, absorbed, records: c.members.length }); }
      if (prev && c.fromIds.includes(c.id)) {
        const lost = [...oldMembers.get(c.id)].filter(m => this.records.has(m) && !c.members.includes(m));
        if (lost.length) { this.metrics.splits++; this.#hist({ kind: 'split', entityId: c.id, records: c.members.length, splitOff: [...new Set(lost.map(m => claimed.get(this.#compOf(comps, m))?.id ?? this.#compOf(comps, m)))] }); }
      }
      if (!prev) { this.metrics.created++; this.entities.set(c.id, { id: c.id, type: c.type, members: new Set(), created: ++this.seq }); }
      const ent = this.entities.get(c.id); ent.members = new Set(c.members); ent.type = c.type;
      for (const m of c.members) this.recEntity.set(m, c.id);
      touched.add(c.id);
    }
    for (const r of removed) if (!this.records.has(r.id)) this.recEntity.delete(r.id);
    for (const e of prevEntities) if (!claimed.has(e) && this.entities.has(e)) {
      const ent = this.entities.get(e); for (const m of ent.members) if (this.recEntity.get(m) === e) this.recEntity.delete(m);
      this.entities.delete(e); this.metrics.retired++; touched.add(e);
      if (!this.redirects.has(e)) this.#hist({ kind: 'retire', entityId: e });
    }
    return { events: this.#emit(touched, removed), comps: comps.length };
  }
  #compOf(comps, m) { for (const c of comps) if (c.members.includes(m)) return c.id; return null; }
  _mint(type, minRecord) {
    let base = `${this.S}:entity:${h(`${type}|${minRecord}`)}`, id = base, n = 1;
    while (this.everIds.has(id) || this.entities.has(id)) id = `${base}-${++n}`;
    this.everIds.add(id);
    return id;
  }
  #hist(e) { this.history.push({ at: new Date(this.now()).toISOString(), ...e }); if (this.history.length > 500) this.history.shift(); }

  // ------------------------------------------------------------------ explanations
  /** best match edge that ties record r into its entity (the "why" of RESOLVES_TO) */
  bestEdge(r) {
    const eid = this.recEntity.get(r); let best = null;
    for (const [o, e] of this.edges.get(r) || []) if (this.recEntity.get(o) === eid && this.isMatch(e, this.records.get(r).type) && (!best || e.score > best.score)) best = e;
    return best;
  }
  edge(a, b) { return this.edges.get(a)?.get(b) || null; }
  /** Senzing-style match key: +FEATURE for supporting evidence, -FEATURE for contradicting evidence */
  static matchKey(why) { return why.filter(w => Math.abs(w.weight) >= 0.5).sort((x, y) => y.weight - x.weight).map(w => `${w.weight > 0 ? '+' : '-'}${w.property.toUpperCase()}`).join(''); }
  static whySummary(why) { return why.map(w => ({ property: w.property, level: w.level, weight: Math.round(w.weight * 100) / 100 })); }

  // ------------------------------------------------------------------ derived items
  #entityItem(ent) {
    const recs = [...ent.members].map(m => this.records.get(m)).filter(Boolean);
    const tc = this.typeCfg(ent.type), feat = {};
    for (const p of tc.properties) {
      const c = new Map();
      for (const r of recs) for (const v of r.values[p.name] || []) c.set(v, (c.get(v) || 0) + 1);
      const vs = [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, this.cfg.featureValues).map(x => x[0]);
      if (vs.length) feat[p.name] = vs;
    }
    const labels = new Map(); for (const r of recs) labels.set(r.label, (labels.get(r.label) || 0) + 1);
    const label = [...labels].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0]))[0]?.[0] || ent.id;
    const dataSources = [...new Set(recs.map(r => r.dataSource))].sort();
    const sourceIds = [...new Set(recs.flatMap(r => r.sourceIds))].sort();
    const scores = recs.map(r => this.bestEdge(r.id)?.score).filter(x => x != null);
    return { id: ent.id, type: this.cfg.entityType, label,
      properties: { entityType: ent.type, recordCount: recs.length, dataSources, records: recs.slice(0, 50).map(r => `${r.dataSource}:${r.recordId}`), features: feat,
        minMatchScore: scores.length ? Math.round(Math.min(...scores) * 1000) / 1000 : null, engine: this.matcher.name, resolution: recs.length > 1 ? 'resolved' : 'singleton' },
      sources: [{ sourceId: this.S, nativeId: ent.id }, ...sourceIds.map(s => ({ sourceId: s, nativeId: ent.id }))] };
  }
  #emit(touched, removed) {
    const want = new Map(); // id -> { op, payload }
    const recsTouched = new Set();
    for (const eid of touched) {
      const ent = this.entities.get(eid);
      if (!ent) { want.set(eid, null); for (const l of this.possible.get(eid) || []) want.set(l, null); this.possible.delete(eid); continue; }
      want.set(eid, { op: 'node.upsert', payload: this.#entityItem(ent) });
      for (const m of ent.members) recsTouched.add(m);
    }
    for (const r of removed) if (!this.records.has(r.id)) want.set(`${this.S}:rt:${r.id}`, null);
    for (const r of recsTouched) {
      const rec = this.records.get(r), eid = this.recEntity.get(r), be = this.bestEdge(r);
      const other = be ? this.records.get(be.a === r ? be.b : be.a) : null;
      const why = be ? (be.a === r ? be.why : be.why.map(w => ({ ...w, a: w.b, b: w.a }))) : [];
      const src = [...new Set([...rec.sourceIds, ...(other?.sourceIds || [])])].sort();
      want.set(`${this.S}:rt:${r}`, { op: 'link.upsert', payload: { id: `${this.S}:rt:${r}`, type: this.cfg.resolvesType, fromId: r, toId: eid, directed: true,
        properties: { score: be ? Math.round(be.score * 10000) / 10000 : 1, matchKey: be ? ErEngine.matchKey(why) : '', matchedWith: other ? other.id : null, why: ErEngine.whySummary(why), dataSource: rec.dataSource, recordId: rec.recordId },
        sources: [{ sourceId: this.S, nativeId: r }, ...src.map(s => ({ sourceId: s, nativeId: r }))] } });
    }
    // possible matches between touched entities and any other entity (best record pair per entity pair)
    for (const eid of touched) {
      const ent = this.entities.get(eid); if (!ent) continue;
      const best = new Map();
      for (const m of ent.members) for (const [o, e] of this.edges.get(m) || []) {
        const oe = this.recEntity.get(o); if (!oe || oe === eid || this.isMatch(e, ent.type) || this.human.get(e.a < e.b ? `${e.a}|${e.b}` : `${e.b}|${e.a}`) === 'different') continue;
        const k = pairKey(eid, oe); if (!best.has(k) || best.get(k).e.score < e.score) best.set(k, { e, a: eid < oe ? eid : oe, b: eid < oe ? oe : eid });
      }
      const ids = new Set();
      for (const { e, a, b } of best.values()) {
        const id = `${this.S}:ps:${h(`${a}|${b}`)}`; ids.add(id);
        const src = [...new Set([...this.records.get(e.a).sourceIds, ...this.records.get(e.b).sourceIds])].sort();
        want.set(id, { op: 'link.upsert', payload: { id, type: this.cfg.possibleType, fromId: a, toId: b, directed: false,
          properties: { score: Math.round(e.score * 10000) / 10000, recordA: e.a, recordB: e.b, matchKey: ErEngine.matchKey(e.why), why: ErEngine.whySummary(e.why) },
          sources: [{ sourceId: this.S, nativeId: id }, ...src.map(s => ({ sourceId: s, nativeId: id }))] } });
        for (const x of [a, b]) { let s = this.possible.get(x); if (!s) this.possible.set(x, s = new Set()); s.add(id); }
      }
      for (const old of this.possible.get(eid) || []) if (!ids.has(old) && !want.has(old)) want.set(old, null);
      const keep = new Set([...(this.possible.get(eid) || [])].filter(x => ids.has(x) || want.get(x)));
      this.possible.set(eid, keep);
    }
    // diff against what was published
    const ups = [], rms = [];
    for (const [id, v] of want) {
      if (v === null) { if (this.published.has(id)) { this.published.delete(id); rms.push({ op: id.includes(':entity:') ? 'node.remove' : 'link.remove', payload: { id } }); } continue; }
      const sig = stable(v.payload); if (this.published.get(id) === sig) continue;
      this.published.set(id, sig); ups.push(v);
    }
    ups.sort((a, b) => (a.op === b.op ? 0 : a.op === 'node.upsert' ? -1 : 1));
    rms.sort((a, b) => (a.op === b.op ? 0 : a.op === 'link.remove' ? -1 : 1));
    return [...ups.filter(e => e.op === 'node.upsert'), ...rms.filter(e => e.op === 'link.remove'), ...ups.filter(e => e.op === 'link.upsert'), ...rms.filter(e => e.op === 'node.remove')];
  }
  /** forget published signatures (a failed transaction): the next apply re-emits them */
  forget(ids) { for (const id of ids) this.published.delete(id); }
  /** seed from a previous run (Kafka bootstrap): previous record -> entity assignment and published items */
  seed({ assignment = new Map(), published = new Map() } = {}) {
    for (const [rec, eid] of assignment) {
      if (!this.entities.has(eid)) this.entities.set(eid, { id: eid, type: null, members: new Set(), created: ++this.seq });
      this.entities.get(eid).members.add(rec); this.recEntity.set(rec, eid); this.everIds.add(eid);
    }
    for (const [id, sig] of published) this.published.set(id, sig);
  }
  /** re-index everything (sidecar restart or a retrained model) and re-resolve */
  async reindex() {
    const items = [...this.records.values()];
    this.records.clear(); this.edges.clear();
    const prev = new Set(this.entities.keys());
    const changes = items.map(r => ({ op: 'upsert', item: { kind: 'node', id: r.id, type: r.type, _rec: r } }));
    const saved = this.recordOf; this.recordOf = it => it._rec || saved.call(this, it);
    try { return await this.apply(changes); } finally { this.recordOf = saved; void prev; }
  }

  // ------------------------------------------------------------------ queries (MCP / HTTP); callers filter by access
  entityOf(id) { const r = this.recEntity.get(id); if (r) return r; let e = id, n = 0; while (this.redirects.has(e) && n++ < 32) e = this.redirects.get(e); return this.entities.has(e) ? e : null; }
  entityView(eid) {
    const ent = this.entities.get(eid); if (!ent) return null;
    return { entityId: eid, entityType: ent.type, records: [...ent.members].map(m => { const r = this.records.get(m), be = this.bestEdge(m); return { id: m, dataSource: r.dataSource, recordId: r.recordId, label: r.label, score: be ? be.score : null, matchedWith: be ? (be.a === m ? be.b : be.a) : null, matchKey: be ? ErEngine.matchKey(be.why) : '' }; }),
      possible: [...(this.possible.get(eid) || [])].map(id => this.published.has(id) ? JSON.parse(this.published.get(id)) : null).filter(Boolean).map(p => ({ entityId: p.fromId === eid ? p.toId : p.fromId, score: p.properties.score, recordA: p.properties.recordA, recordB: p.properties.recordB, matchKey: p.properties.matchKey })) };
  }
  async why(a, b) {
    const ra = this.records.get(a), rb = this.records.get(b);
    if (!ra || !rb) return null;
    if (ra.type !== rb.type) return { a, b, comparable: false, reason: `different record types (${ra.type} vs ${rb.type})` };
    const e = this.edge(a, b);
    const r = e ? { score: e.score, matchWeight: e.matchWeight, prior: e.prior, why: e.a === a ? e.why : e.why.map(w => ({ ...w, a: w.b, b: w.a })) } : await this.matcher.compare(ra.type, a, b).then(x => (a < b ? x : { ...x, why: x.why.map(w => ({ ...w, a: w.b, b: w.a })) }));
    const tc = this.typeCfg(ra.type), sameEntity = this.recEntity.get(a) === this.recEntity.get(b);
    const decision = r.score >= tc.threshold ? 'match' : r.score >= tc.maybeThreshold ? 'possible' : 'no-match';
    return { a, b, type: ra.type, engine: this.matcher.name, score: r.score, matchWeight: r.matchWeight, prior: r.prior, decision, threshold: tc.threshold, maybeThreshold: tc.maybeThreshold,
      sameEntity, entityA: this.recEntity.get(a), entityB: this.recEntity.get(b), viaChain: sameEntity && decision !== 'match', matchKey: ErEngine.matchKey(r.why),
      features: r.why.map(w => ({ property: w.property, a: w.a, b: w.b, level: w.level, weight: w.weight })) };
  }
  possibleMatches({ minScore = 0, limit = 100 } = {}) {
    const out = [];
    for (const [id, sig] of this.published) if (id.startsWith(`${this.S}:ps:`)) { const p = JSON.parse(sig); if (p.properties.score >= minScore) out.push({ linkId: id, entityA: p.fromId, entityB: p.toId, ...p.properties }); }
    return out.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  stats() {
    let multi = 0; for (const e of this.entities.values()) if (e.members.size > 1) multi++;
    return { engine: this.matcher.name, records: this.records.size, entities: this.entities.size, multiRecordEntities: multi, possibleLinks: [...this.published.keys()].filter(k => k.startsWith(`${this.S}:ps:`)).length, ...this.metrics, history: this.history.slice(-20) };
  }
}
