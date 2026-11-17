// Visual query builder backend (Phase 4): a small structured query, the Cypher it stands for, a parser for that same Cypher
// subset, and an executor over the in-app graph. Filtering on a field the user cannot see is refused (same rule as the studio's
// "Ask a question"); denied types are removed by the ABAC boundary.
export const OPS = { '=': (a, b) => String(a) === String(b), '<>': (a, b) => String(a) !== String(b), '>': (a, b) => Number(a) > Number(b), '<': (a, b) => Number(a) < Number(b),
  '>=': (a, b) => Number(a) >= Number(b), '<=': (a, b) => Number(a) <= Number(b), CONTAINS: (a, b) => String(a ?? '').toLowerCase().includes(String(b).toLowerCase()),
  'STARTS WITH': (a, b) => String(a ?? '').toLowerCase().startsWith(String(b).toLowerCase()), 'IS NOT NULL': a => a != null && a !== '' };
const BROKEN = () => process.env.QUERY_IMPL === 'broken'; // DELIBERATELY WRONG: ignores the WHERE clause and relationship direction
const lit = v => (typeof v === 'number' || (typeof v === 'string' && v !== '' && !isNaN(v) && /^-?\d+(\.\d+)?$/.test(v)) ? String(Number(v)) : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`);
const ident = s => (/^[A-Za-z_]\w*$/.test(s) ? s : `\`${String(s).replace(/`/g, '``')}\``);

export function normalize(q = {}) {
  const side = s => s && { type: s.type || null, where: (s.where || []).filter(w => w && w.field && OPS[w.op]).map(w => ({ field: String(w.field), op: w.op, value: w.value })) };
  const rel = q.rel && (q.rel.type || q.b) ? { type: q.rel.type || null, dir: ['out', 'in', 'both'].includes(q.rel.dir) ? q.rel.dir : 'out' } : null;
  return { a: side(q.a) || { type: null, where: [] }, rel, b: rel ? side(q.b) || { type: null, where: [] } : null, limit: Math.max(1, Math.min(5000, Number(q.limit) || 100)) };
}
export function toCypher(q0) {
  const q = normalize(q0), node = (v, s) => `(${v}${s.type ? ':' + ident(s.type) : ''})`;
  const relTxt = q.rel ? `${q.rel.dir === 'in' ? '<-' : '-'}[r${q.rel.type ? ':' + ident(q.rel.type) : ''}]${q.rel.dir === 'out' ? '->' : '-'}` : '';
  const conds = [...q.a.where.map(w => ['a', w]), ...(q.b ? q.b.where.map(w => ['b', w]) : [])].map(([v, w]) => w.op === 'IS NOT NULL' ? `${v}.${ident(w.field)} IS NOT NULL` : `${v}.${ident(w.field)} ${w.op} ${lit(w.value)}`);
  return `MATCH ${node('a', q.a)}${q.rel ? relTxt + node('b', q.b) : ''}${conds.length ? ' WHERE ' + conds.join(' AND ') : ''} RETURN ${q.rel ? 'a, r, b' : 'a'} LIMIT ${q.limit}`;
}
/** parse the Cypher subset toCypher writes (MATCH one node or one hop, WHERE with AND, RETURN, LIMIT) */
export function parseCypher(text) {
  const t = String(text).trim().replace(/;$/, '');
  const id = '(?:[A-Za-z_]\\w*|`(?:[^`]|``)+`)', un = s => (s?.startsWith('`') ? s.slice(1, -1).replace(/``/g, '`') : s);
  const m = new RegExp(`^MATCH\\s*\\((\\w+)(?::(${id}))?\\)\\s*(?:(<-|-)\\[(\\w+)?(?::(${id}))?\\](->|-)\\s*\\((\\w+)(?::(${id}))?\\))?\\s*(?:WHERE\\s+([\\s\\S]+?))?\\s*RETURN\\s+[\\w\\s,]+?(?:\\s+LIMIT\\s+(\\d+))?$`, 'i').exec(t);
  if (!m) throw Object.assign(new Error('Only MATCH (a:Type)-[r:TYPE]->(b:Type) WHERE … RETURN … LIMIT n is supported here.'), { status: 400 });
  const [, va, ta, l, , tr, r, vb, tb, where, limit] = m;
  if (l === '<-' && r === '->') throw Object.assign(new Error('A relationship has one direction: use <-[…]- or -[…]->.'), { status: 400 });
  const q = { a: { type: un(ta) || null, where: [] }, rel: l ? { type: un(tr) || null, dir: l === '<-' ? 'in' : r === '->' ? 'out' : 'both' } : null, b: l ? { type: un(tb) || null, where: [] } : null, limit: limit ? Number(limit) : 100 };
  if (where) for (const part of where.split(/\s+AND\s+/i)) {
    const w = new RegExp(`^(\\w+)\\.(${id})\\s*(=|<>|>=|<=|>|<|CONTAINS|STARTS WITH|IS NOT NULL)\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|(-?\\d+(?:\\.\\d+)?))?$`, 'i').exec(part.trim());
    if (!w) throw Object.assign(new Error(`Can't read the condition "${part.trim()}".`), { status: 400 });
    const side = w[1] === va ? q.a : w[1] === vb ? q.b : null; if (!side) throw Object.assign(new Error(`Unknown name ${w[1]} in WHERE.`), { status: 400 });
    side.where.push({ field: un(w[2]), op: w[3].toUpperCase(), value: w[4] != null ? w[4].replace(/\\(.)/g, '$1') : w[5] != null ? Number(w[5]) : null });
  }
  return normalize(q);
}
/** run against the explore service. canSee(type, field) gates WHERE fields; view(it) applies the source policy */
export function runQuery(service, q0, { canSee = () => true, view = it => it } = {}) {
  const q = normalize(q0);
  for (const [s, w] of [...q.a.where.map(w => [q.a, w]), ...(q.b ? q.b.where.map(w => [q.b, w]) : [])]) if (s.type && !canSee(s.type, w.field)) throw Object.assign(new Error(`You can't filter on "${w.field}" because it is hidden for you.`), { status: 403 });
  const val = (it, f) => (f === 'label' ? it.label : f === 'type' ? it.type : it.properties?.[f]);
  const okSide = (it, s) => it && !it.deleted && it.kind === 'node' && (!s.type || it.type === s.type) && (BROKEN() || s.where.every(w => (!it.type || canSee(it.type, w.field)) && OPS[w.op](val(it, w.field), w.value)));
  const rows = []; let truncated = false;
  if (!q.rel) { for (const it of service.items.values()) { if (!okSide(it, q.a)) continue; const v = view(it); if (!v) continue; if (rows.length >= q.limit) { truncated = true; break; } rows.push({ a: v }); } }
  else {
    for (const l of service.items.values()) {
      if (l.kind !== 'link' || l.deleted || (q.rel.type && l.type !== q.rel.type)) continue;
      const f = service.live(l.fromId), t = service.live(l.toId), pairs = [];
      if (q.rel.dir === 'out' || q.rel.dir === 'both' || BROKEN()) pairs.push([f, t]);
      if (q.rel.dir === 'in' || q.rel.dir === 'both') pairs.push([t, f]);
      for (const [x, y] of pairs) {
        if (!okSide(x, q.a) || !okSide(y, q.b)) continue;
        const a = view(x), r = view(l), b = view(y); if (!a || !r || !b) continue;
        if (rows.length >= q.limit) { truncated = true; break; } rows.push({ a, r, b });
      }
      if (truncated) break;
    }
  }
  return { cypher: toCypher(q), query: q, columns: q.rel ? ['a', 'r', 'b'] : ['a'], rows, count: rows.length, truncated };
}
