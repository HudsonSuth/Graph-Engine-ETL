// Deliberately WRONG entity resolution (tests / proof only: ER_IMPL=wrong). Plausible-looking shortcuts that a careless
// implementation might take; the real suites must fail on them (npm run proof:er).
//   W1 matcher: "same family name or same e-mail" = match (no fuzzy names, ignores contradicting dob/phone)  -> precision collapses
//   W2 explanation: reports only the first agreeing feature, weight 1 each, prior ignored               -> why != score
//   W3 no un-merge: a changed record keeps its old pair links, so a wrong merge is never split
//   W4 unstable ids: every re-resolution mints a fresh random entity id
import { randomUUID } from 'node:crypto';
import { ErEngine } from './engine.js';

const fam = v => String(v || '').toLowerCase().replace(/[^a-z ]/g, ' ').trim().split(/\s+/).pop() || '';
export class WrongMatcher {
  constructor() { this.name = 'wrong'; this.recs = new Map(); this.trainable = false; }
  async start() { return this; }
  async configure(ns) { this.recs.set(ns, new Map()); return {}; }
  async upsert(ns, records) {
    const live = this.recs.get(ns); for (const r of records) live.set(r.id, r);
    return records.map(r => ({ id: r.id, matches: [...live.values()].filter(o => o.id !== r.id && this.#same(r, o)).map(o => ({ id: o.id, score: 0.99, matchWeight: 6.6, prior: 0, why: this.#why(r, o) })) }));
  }
  #same(a, b) { const n1 = fam(a.values.name?.[0]), n2 = fam(b.values.name?.[0]); const e1 = (a.values.email?.[0] || '').toLowerCase(), e2 = (b.values.email?.[0] || '').toLowerCase(); return (n1 && n1 === n2) || (e1 && e1 === e2); }
  #why(a, b) { return [{ property: 'name', a: a.values.name?.[0], b: b.values.name?.[0], level: 'same family name', weight: 1 }]; }
  async remove(ns, ids) { for (const id of ids) this.recs.get(ns).delete(id); return {}; }
  async compare(ns, a, b) { const ra = this.recs.get(ns).get(a), rb = this.recs.get(ns).get(b); return { score: this.#same(ra, rb) ? 0.99 : 0.01, matchWeight: 0, prior: 0, why: this.#why(ra, rb) }; }
  async stats() { return {}; }
  async close() {}
}
export class WrongEngine extends ErEngine {
  _dropEdges() { return []; }                                       // W3
  _mint() { return `${this.S}:entity:${randomUUID().slice(0, 12)}`; } // W4 (and below: every component re-mints)
  async apply(changes) {
    for (const e of this.entities.values()) e.created = -Math.random(); // tie-break noise
    const out = await super.apply(changes);
    return out;
  }
}
