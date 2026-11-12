// Suggests how records from different sources line up (federation) and how entities relate.
const an = w => (/^[AEIOU]/i.test(w) ? 'an' : 'a');
export function normalize(v, rule) {
  if (v == null) return '';
  const s = String(v);
  if (rule === 'ignoreCase') return s.replace(/\s+/g, '').toLowerCase();
  if (rule === 'normalizedId') return s.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  return s;
}
// DELIBERATELY WRONG: ignores normalization; used only to prove the tests catch it.
const naiveNormalize = v => (v == null ? '' : String(v));
const norm = (v, rule) => (process.env.STREAMGRAPH_MATCHER === 'naive' ? naiveNormalize(v) : normalize(v, rule));
export const RULE_ORDER = ['exact', 'ignoreCase', 'normalizedId'];
const valuesOf = (rows, col, rule) => rows.map(r => norm(r[col], rule)).filter(v => v !== '');
const unique = (rows, col) => { const v = rows.map(r => r[col]).filter(x => x != null && x !== ''); return v.length ? new Set(v.map(String)).size / v.length : 0; };
const columns = rows => [...new Set(rows.flatMap(r => Object.keys(r)))];

export function overlap(a, b) {
  const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return { score: 0, matched: 0 };
  let m = 0; for (const x of A) if (B.has(x)) m++;
  return { score: m / Math.min(A.size, B.size), matched: m };
}

// sources: [{id, name, entity, rows}] -> best match per pair with the same entity type
export function suggestMatches(sources, { min = 0.3 } = {}) {
  const out = [];
  for (let i = 0; i < sources.length; i++) for (let j = i + 1; j < sources.length; j++) {
    const A = sources[i], B = sources[j]; if (A.entity !== B.entity) continue;
    let best = null;
    for (const ca of columns(A.rows)) for (const cb of columns(B.rows)) {
      if (unique(A.rows, ca) < 0.8 || unique(B.rows, cb) < 0.8) continue; // a match field must identify one record
      for (const rule of RULE_ORDER) {
        const { score, matched } = overlap(valuesOf(A.rows, ca, rule), valuesOf(B.rows, cb, rule));
        const s = score + (ca.toLowerCase() === cb.toLowerCase() ? 0.001 : 0) - RULE_ORDER.indexOf(rule) * 0.0001;
        if (score >= min && (!best || s > best._s)) best = { _s: s, entity: A.entity, a: { source: A.id, field: ca }, b: { source: B.id, field: cb }, rule, overlap: Math.round(score * 100), matched };
      }
    }
    if (best) {
      const bv = new Map(B.rows.map(r => [norm(r[best.b.field], best.rule), r[best.b.field]]));
      best.examples = A.rows.map(r => [r[best.a.field], bv.get(norm(r[best.a.field], best.rule))]).filter(([, y]) => y !== undefined).slice(0, 3);
      best.sentence = `${A.entity}s in ${A.name} and ${B.name} look like the same ${A.entity.toLowerCase()}s, matched on ${best.a.field === best.b.field ? best.a.field : best.a.field + ' / ' + best.b.field}, ${best.overlap}% overlap.`;
      delete best._s; out.push(best);
    }
  }
  return out.sort((x, y) => y.overlap - x.overlap);
}

// Columns whose values point at another entity's keys: "Each Order belongs to a Customer via customer_id"
export function suggestRelationships(sources, rules = {}, { min = 0.6 } = {}) {
  const out = [], seen = new Set();
  for (const S of sources) for (const col of columns(S.rows)) {
    if (col === S.key) continue;
    for (const T of sources) {
      if (T.entity === S.entity || seen.has(`${S.id}.${col}->${T.entity}`)) continue;
      const rule = rules[T.entity] || 'exact';
      const keys = new Set(valuesOf(T.rows, T.key, rule)), vals = valuesOf(S.rows, col, rule);
      if (!vals.length || !keys.size) continue;
      const hit = vals.filter(v => keys.has(v)).length / vals.length;
      if (hit >= min) {
        seen.add(`${S.id}.${col}->${T.entity}`);
        out.push({ source: S.id, field: col, toEntity: T.entity, fromEntity: S.entity, type: `HAS_${S.entity.toUpperCase()}`, coverage: Math.round(hit * 100),
          sentence: `Each ${S.entity} belongs to ${an(T.entity)} ${T.entity} via ${col} (${Math.round(hit * 100)}% of ${S.name} rows find their ${T.entity.toLowerCase()}).` });
      }
    }
  }
  return out;
}

// Wizard step 4: what is this data about?
const KNOWN = ['Customer', 'Order', 'Product', 'Account', 'Transaction', 'Device', 'Location', 'Employee', 'Supplier', 'Invoice', 'Event', 'Ticket'];
export function suggestMapping(rows, name = '', existing = []) {
  const cols = columns(rows), lname = name.toLowerCase();
  const types = [...new Set([...existing, ...KNOWN])];
  const byName = types.find(t => lname.includes(t.toLowerCase()));
  const byKey = types.find(t => cols.some(c => c.toLowerCase() === `${t.toLowerCase()}_id` && unique(rows, c) >= 0.99));
  const first = cols[0] && unique(rows, cols[0]) >= 0.99 && /^([a-z]+)[_ ]?id$/i.exec(cols[0].trim());
  const byFirst = first && first[1].length > 1 && (types.find(t => t.toLowerCase() === first[1].toLowerCase()) || first[1][0].toUpperCase() + first[1].slice(1).toLowerCase());
  const stem = lname.replace(/\.\w+$/, '').replace(/[^a-z]+/g, ' ').trim().split(' ').pop() || '';
  const byFile = stem.length > 2 && types.find(t => stem === t.toLowerCase() || stem === t.toLowerCase() + 's');
  const entity = byFile || byFirst || byName || byKey || (lname.includes('loyal') || cols.includes('email') ? 'Customer' : types[0]);
  const e = entity.toLowerCase();
  const pref = ['id', `${e}_id`, `${e}id`, 'email', 'sku', 'code', 'uuid', 'key'];
  const uniq = cols.filter(c => unique(rows, c) >= 0.99);
  const key = pref.map(p => uniq.find(c => c.toLowerCase() === p)).find(Boolean) || uniq.find(c => /id$|_id$|^id/i.test(c)) || uniq[0] || cols[0];
  const fields = Object.fromEntries(cols.map(c => [c.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field', c]));
  return { entity, key, fields, keyIsUnique: unique(rows, key) >= 0.99 };
}
