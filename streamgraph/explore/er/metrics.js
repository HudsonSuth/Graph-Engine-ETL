// Ground-truth evaluation for entity resolution: pairwise precision / recall / F1 and B-cubed (SPEC §21.8).
/** pred, truth: Map|object record id -> cluster id (only ids present in both are scored) */
export function evaluate(pred, truth) {
  const P = pred instanceof Map ? pred : new Map(Object.entries(pred)), T = truth instanceof Map ? truth : new Map(Object.entries(truth));
  const ids = [...P.keys()].filter(id => T.has(id));
  const group = (m) => { const g = new Map(); for (const id of ids) { const k = m.get(id); let s = g.get(k); if (!s) g.set(k, s = []); s.push(id); } return g; };
  const gp = group(P), gt = group(T);
  const pairs = g => { let n = 0; for (const s of g.values()) n += s.length * (s.length - 1) / 2; return n; };
  // true-positive pairs: pairs together in both = sum over (pred cluster x truth cluster) cells of C(n,2)
  const cell = new Map(); for (const id of ids) { const k = `${P.get(id)}\u0000${T.get(id)}`; cell.set(k, (cell.get(k) || 0) + 1); }
  let tp = 0; for (const n of cell.values()) tp += n * (n - 1) / 2;
  const predPairs = pairs(gp), truePairs = pairs(gt);
  const precision = predPairs ? tp / predPairs : 1, recall = truePairs ? tp / truePairs : 1;
  let bp = 0, br = 0;
  for (const id of ids) { const c = cell.get(`${P.get(id)}\u0000${T.get(id)}`); bp += c / gp.get(P.get(id)).length; br += c / gt.get(T.get(id)).length; }
  bp /= ids.length || 1; br /= ids.length || 1;
  const f = (p, r) => (p + r ? 2 * p * r / (p + r) : 0);
  return { records: ids.length, predictedEntities: gp.size, trueEntities: gt.size, pairwise: { precision, recall, f1: f(precision, recall), tp, predPairs, truePairs }, bcubed: { precision: bp, recall: br, f1: f(bp, br) } };
}
