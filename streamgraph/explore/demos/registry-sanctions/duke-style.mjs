// In-process matcher with the same shape as explore/er/sidecar.js (configure / upsert / remove / compare).
// Clustering stays in ErEngine. The comparison is the Duke organization profile:
// company-name cleaner and Jaro-Winkler from explore/er/src/streamgraph/er/DukeSidecar.java,
// token similarity averaged in both directions (a short shared token cannot absorb a longer name),
// then Duke's low/high interpolation and Bayes update (Utils.computeBayes, prior 0.5).
//
// Name agreement is scored high enough that a cleaned legal-name match clears the organization
// threshold on its own. A conflicting country is scored low enough to pull that pair back under it.

const DROP = new Set(['inc', 'incorporated', 'llc', 'ltd', 'limited', 'corp', 'corporation', 'co', 'company', 'plc', 'gmbh', 'the', 'and', 'adr']);

function tokensOf(value) {
  return String(value || '').toLowerCase().replace(/[.,/]+/g, ' ').split(/\s+/).filter(t => t && !DROP.has(t));
}

export function cleanCompany(value) {
  if (value == null) return '';
  let s = String(value).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/&/g, ' and ');
  const parens = [...s.matchAll(/\(([^)]*)\)/g)].map(m => m[1]);
  const base = tokensOf(s.replace(/\([^)]*\)/g, ' '));
  for (const inner of parens) {
    const extra = tokensOf(inner);
    // "(Huawei)" repeats the legal name. "(UK)" and "(New Zealand)" do not, so they stay.
    if (extra.length && !extra.every(t => base.includes(t))) base.push(...extra);
  }
  return base.join(' ');
}

export function cleanAddress(value) {
  if (value == null) return '';
  const map = { street: 'st', avenue: 'ave', road: 'rd', drive: 'dr', boulevard: 'blvd', suite: 'ste', floor: 'fl' };
  return String(value).toLowerCase().replace(/[.,#]/g, ' ').split(/\s+/).filter(Boolean).map(t => map[t] || t).join(' ');
}

export function cleanExact(value) {
  return String(value || '').trim().toLowerCase();
}

/** Jaro-Winkler, prefix scale 0.1, prefix cap 4. The usual Duke settings. */
export function jaroWinkler(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const s1 = [...a];
  const s2 = [...b];
  const n1 = s1.length;
  const n2 = s2.length;
  const matchDist = Math.max(0, Math.floor(Math.max(n1, n2) / 2) - 1);
  const m1 = new Array(n1).fill(false);
  const m2 = new Array(n2).fill(false);
  let matches = 0;
  for (let i = 0; i < n1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, n2);
    for (let j = start; j < end; j++) {
      if (m2[j] || s1[i] !== s2[j]) continue;
      m1[i] = true;
      m2[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let trans = 0;
  let k = 0;
  for (let i = 0; i < n1; i++) {
    if (!m1[i]) continue;
    while (!m2[k]) k++;
    if (s1[i] !== s2[k]) trans++;
    k++;
  }
  const jaro = (matches / n1 + matches / n2 + (matches - trans / 2) / matches) / 3;
  let prefix = 0;
  const cap = Math.min(4, n1, n2);
  for (let i = 0; i < cap; i++) {
    if (s1[i] !== s2[i]) break;
    prefix++;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function hasCjk(s) { return /[\u3400-\u9fff]/.test(s); }

/** Mean of both directions so an extra unmatched token lowers the score.
 *  Unequal CJK legal names share long prefixes and suffixes; Jaro-Winkler treats that as a match.
 *  They only agree when the cleaned names are the same string. English aliases are compared on their own. */
export function jaroWinklerTokenized(a, b) {
  if (a === b) return 1;
  if ((hasCjk(a) || hasCjk(b)) && a !== b) return 0;
  const t1 = a.split(/\s+/).filter(Boolean);
  const t2 = b.split(/\s+/).filter(Boolean);
  if (!t1.length || !t2.length) return 0;
  const avg = (from, to) => {
    let sum = 0;
    for (const x of from) {
      let best = 0;
      for (const y of to) best = Math.max(best, jaroWinkler(x, y));
      sum += best;
    }
    return sum / from.length;
  };
  return (avg(t1, t2) + avg(t2, t1)) / 2;
}

export function tokenJaccard(a, b) {
  const A = new Set(a.split(/\s+/).filter(Boolean));
  const B = new Set(b.split(/\s+/).filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

function similarity(comparator, a, b) {
  if (comparator === 'exact') return a === b ? 1 : 0;
  if (comparator === 'jaccard') return tokenJaccard(a, b);
  if (comparator === 'jaro-winkler-tokenized') return jaroWinklerTokenized(a, b);
  if (comparator === 'jaro-winkler') return jaroWinkler(a, b);
  throw new Error(`unknown comparator ${comparator}`);
}

function cleanerFor(name) {
  if (name === 'company') return cleanCompany;
  if (name === 'address') return cleanAddress;
  if (name === 'lowercase' || name === 'exact') return cleanExact;
  throw new Error(`unknown cleaner ${name}`);
}

export function log2odds(p) {
  const x = Math.min(1 - 1e-15, Math.max(1e-15, p));
  return Math.log(x / (1 - x)) / Math.log(2);
}

function bayes(prior, p) {
  return (prior * p) / (prior * p + (1 - prior) * (1 - p));
}

function cleanValues(raw, clean) {
  const list = Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw];
  const out = [];
  for (const v of list) {
    const c = clean(v);
    if (c) out.push(c);
  }
  return out;
}

export class DukeStyleMatcher {
  constructor() {
    this.name = 'duke-style';
    this.trainable = false;
    this.ns = new Map();
  }
  async start() { return this; }
  async configure(ns, config) {
    const props = (config.properties || []).map(p => ({
      ...p,
      clean: cleanerFor(Array.isArray(p.cleaner) ? p.cleaner[0] : p.cleaner),
    }));
    this.ns.set(ns, {
      props,
      threshold: config.threshold,
      maybe: config.maybeThreshold,
      live: new Map(),
    });
    return { engine: this.name };
  }
  #score(state, a, b) {
    let prob = 0.5;
    const why = [];
    for (const prop of state.props) {
      const vs1 = a.values[prop.name] || [];
      const vs2 = b.values[prop.name] || [];
      if (!vs1.length || !vs2.length) continue;
      let best = null;
      for (const v1 of vs1) for (const v2 of vs2) {
        const sim = similarity(prop.comparator, v1, v2);
        const p = prop.low + sim * (prop.high - prop.low);
        if (!best || p > best.probability) best = { a: v1, b: v2, similarity: sim, probability: p };
      }
      if (!best) continue;
      prob = bayes(prob, best.probability);
      why.push({
        property: prop.name,
        a: best.a,
        b: best.b,
        similarity: Math.round(best.similarity * 1000) / 1000,
        probability: Math.round(best.probability * 1000) / 1000,
        level: `${prop.comparator} similarity ${best.similarity.toFixed(2)}`,
        weight: log2odds(best.probability),
      });
    }
    return { score: prob, matchWeight: log2odds(prob), prior: 0, why };
  }
  #prepared(state, rec) {
    const values = {};
    for (const prop of state.props) values[prop.name] = cleanValues(rec.values?.[prop.name], prop.clean);
    return { id: rec.id, values };
  }
  async upsert(ns, records) {
    const state = this.ns.get(ns);
    const prepared = records.map(r => this.#prepared(state, r));
    for (const rec of prepared) state.live.set(rec.id, rec);
    return prepared.map(rec => {
      const matches = [];
      for (const other of state.live.values()) {
        if (other.id === rec.id) continue;
        const scored = this.#score(state, rec, other);
        if (scored.score >= state.maybe) matches.push({ id: other.id, ...scored });
      }
      return { id: rec.id, matches };
    });
  }
  async remove(ns, ids) {
    const state = this.ns.get(ns);
    for (const id of ids) state.live.delete(id);
    return {};
  }
  async compare(ns, a, b) {
    const state = this.ns.get(ns);
    const ra = state.live.get(a);
    const rb = state.live.get(b);
    if (!ra || !rb) throw new Error(`unknown record ${ra ? b : a}`);
    return this.#score(state, ra, rb);
  }
  async stats() { return {}; }
  async close() {}
}

/** Organization profile used for this demo. Threshold stays in the Duke organization range. */
export const ORGANIZATION_PROFILE = {
  threshold: 0.975,
  maybeThreshold: 0.8,
  properties: [
    { name: 'name', from: ['name'], comparator: 'jaro-winkler-tokenized', cleaner: 'company', low: 0.12, high: 0.99, lookup: 'true' },
    { name: 'country', from: ['country'], comparator: 'exact', cleaner: 'lowercase', low: 0.02, high: 0.55, lookup: 'false' },
    { name: 'address', from: ['address'], comparator: 'jaccard', cleaner: 'address', low: 0.35, high: 0.6, lookup: 'false' },
  ],
};
