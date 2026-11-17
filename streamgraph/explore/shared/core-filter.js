// Shared filter predicates for the Phase 1 core loop (SPEC §23): the same semantics on the server (neighbourhood
// queries, algorithm scopes) and in the browser (view filters). A `where` condition is { property, op, value, type? };
// a condition with a `type` only applies to items of that type (others pass), like the saved-view filters (SPEC §19).
export const WHERE_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'exists', 'in'];
export function whereOk(w, it) {
  if (!w || !w.property) return true;
  if (w.type && w.type !== it.type) return true;
  const x = it.properties?.[w.property], v = w.value;
  switch (w.op || 'eq') {
    case 'eq': return String(x) === String(v);
    case 'neq': return String(x) !== String(v);
    case 'gt': return x != null && Number(x) > Number(v);
    case 'gte': return x != null && Number(x) >= Number(v);
    case 'lt': return x != null && Number(x) < Number(v);
    case 'lte': return x != null && Number(x) <= Number(v);
    case 'contains': return typeof x === 'string' && x.toLowerCase().includes(String(v).toLowerCase());
    case 'exists': return x != null && x !== '';
    case 'in': return Array.isArray(v) && v.map(String).includes(String(x));
  }
  return true;
}
export const allWhere = (list, it) => !list?.length || list.every(w => whereOk(w, it));
/** Normalise a filter object: { types?, linkTypes?, where?, linkWhere?, hiddenTypes?, hiddenLinkTypes? } -> predicates. */
export function compileFilter(f = {}) {
  const types = f.types?.length ? new Set(f.types) : null, hiddenTypes = f.hiddenTypes?.length ? new Set(f.hiddenTypes) : null;
  const linkTypes = f.linkTypes?.length ? new Set(f.linkTypes) : null, hiddenLinkTypes = f.hiddenLinkTypes?.length ? new Set(f.hiddenLinkTypes) : null;
  const where = Array.isArray(f.where) ? f.where : [], linkWhere = Array.isArray(f.linkWhere) ? f.linkWhere : [];
  return {
    node: it => (!types || types.has(it.type)) && (!hiddenTypes || !hiddenTypes.has(it.type)) && allWhere(where, it),
    link: it => (!linkTypes || linkTypes.has(it.type)) && (!hiddenLinkTypes || !hiddenLinkTypes.has(it.type)) && allWhere(linkWhere, it),
    empty: !types && !hiddenTypes && !linkTypes && !hiddenLinkTypes && !where.length && !linkWhere.length,
  };
}
