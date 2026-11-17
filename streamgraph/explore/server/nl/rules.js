// Plain-English questions and captions (Phase 4). Provider "rules" runs on this computer with no model and no key: it maps a
// handful of sentence shapes onto the visual query builder, paths and degree. It is OFF by default (studio: Explore > Graph
// explorer > Analyze > Plain-English questions). A real language model would plug in as another provider with the same two
// functions (interpret, caption); see explore/server/nl/PROVIDERS.md. No paid API is ever called by this code.
const words = s => String(s || '').replace(/[?!.]+$/, '').trim();
const OPS = [[/^(?:is|=|equals|is equal to)$/, '='], [/^(?:is not|isn't|<>|not)$/, '<>'], [/^(?:contains|has|includes|mentions)$/, 'CONTAINS'],
  [/^(?:over|above|more than|greater than|>)$/, '>'], [/^(?:under|below|less than|fewer than|<)$/, '<'], [/^(?:starts with|begins with)$/, 'STARTS WITH']];

export function matchType(word, types) {
  const w = words(word).toLowerCase().replace(/[^a-z0-9_ ]/g, '');
  const cands = [w, w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, '')];
  return types.find(t => cands.includes(t.toLowerCase())) || null;
}
/** question -> { kind: 'query'|'count'|'path'|'top'|'neighbours', query?, from?, to?, type?, n?, name?, explanation } or null */
export function interpret(question, { types = [], fields = {} } = {}) {
  const q = words(question); let m;
  if ((m = /^how many (\w+)(?: are there)?(?: (?:with|where) (\w+) (is|is not|contains|over|under|more than|less than|starts with) (.+))?$/i.exec(q))) {
    const type = matchType(m[1], types); if (!type) return null;
    const where = m[2] ? [{ field: fieldName(m[2], fields[type]), op: op(m[3]), value: val(m[4]) }] : [];
    return { kind: 'count', type, query: { a: { type, where }, limit: 5000 }, explanation: `Count ${type}s${where.length ? ` where ${where[0].field} ${where[0].op} ${where[0].value}` : ''}` };
  }
  if ((m = /^(?:show|list|find|which|what)(?: me)?(?: all)?(?: the)? (\w+)(?: (?:with|where|whose) (\w+) (is not|is|contains|over|under|more than|less than|starts with|equals) (.+))?$/i.exec(q))) {
    const type = matchType(m[1], types); if (!type) return null;
    const where = m[2] ? [{ field: fieldName(m[2], fields[type]), op: op(m[3]), value: val(m[4]) }] : [];
    return { kind: 'query', type, query: { a: { type, where }, limit: 200 }, explanation: `Show ${type}s${where.length ? ` where ${where[0].field} ${where[0].op} ${where[0].value}` : ''}` };
  }
  if ((m = /^(?:show |find )?(?:the )?(?:path|connection|link)s? (?:from|between) (.+?) (?:to|and) (.+)$/i.exec(q))) return { kind: 'path', from: m[1], to: m[2], explanation: `Shortest connection between "${m[1]}" and "${m[2]}"` };
  if ((m = /^(?:who|what) (?:is )?(?:connected|linked|related) to (.+)$/i.exec(q)) || (m = /^(?:neighbou?rs|connections) of (.+)$/i.exec(q))) return { kind: 'neighbours', name: m[1], explanation: `Everything directly connected to "${m[1]}"` };
  if ((m = /^(?:which|what|show)? ?(?:are )?(?:the )?(?:top (\d+) |)(?:most connected|busiest|biggest hubs?)(?: (\w+))?$/i.exec(q)) || (m = /^top (\d+) (\w+)(?: by connections)?$/i.exec(q))) {
    const type = m[2] ? matchType(m[2], types) : null;
    return { kind: 'top', n: Number(m[1] || 10), type, explanation: `The ${Number(m[1] || 10)} most connected ${type ? type + 's' : 'things'}` };
  }
  return null;
}
function op(w) { for (const [re, o] of OPS) if (re.test(w)) return o; return '='; }
function val(v) { const s = String(v).trim().replace(/^["']|["']$/g, ''); return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s; }
function fieldName(w, known = []) { const f = known.find(k => k.toLowerCase() === w.toLowerCase() || k.toLowerCase().replace(/_/g, '') === w.toLowerCase()); return f || w; }

/** text summary of a set of visible items (accessibility and captions). items are already access-filtered */
export function summarize(items, { max = 5 } = {}) {
  const nodes = items.filter(i => i.kind === 'node'), links = items.filter(i => i.kind === 'link');
  if (!nodes.length) return 'Nothing is shown.';
  const byType = {}; for (const n of nodes) byType[n.type] = (byType[n.type] || 0) + 1;
  const deg = new Map(); for (const l of links) for (const e of [l.fromId, l.toId]) deg.set(e, (deg.get(e) || 0) + 1);
  const top = nodes.map(n => [n, deg.get(n.id) || 0]).sort((a, b) => b[1] - a[1] || String(a[0].label).localeCompare(String(b[0].label))).slice(0, max).filter(x => x[1] > 0);
  const lt = {}; for (const l of links) lt[l.type] = (lt[l.type] || 0) + 1;
  const list = o => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, v]) => `${v} ${k}${v === 1 ? '' : 's'}`).join(', ');
  const isolated = nodes.filter(n => !deg.get(n.id)).length;
  return [`Showing ${nodes.length} thing${nodes.length === 1 ? '' : 's'} (${list(byType)}) and ${links.length} connection${links.length === 1 ? '' : 's'}${links.length ? ` (${list(lt)})` : ''}.`,
    top.length ? `Most connected: ${top.map(([n, d]) => `${n.label} (${n.type}, ${d})`).join('; ')}.` : '',
    isolated ? `${isolated} ${isolated === 1 ? 'is' : 'are'} not connected to anything shown.` : ''].filter(Boolean).join(' ');
}
export function caption(items) { const s = summarize(items, { max: 3 }); return s.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.'); }
export const rulesProvider = { id: 'rules', name: 'Built-in rules (on this computer, no AI model)', interpret, caption };
