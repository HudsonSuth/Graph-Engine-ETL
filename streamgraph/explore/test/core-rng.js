// Random-graph helper for the core-loop tests: a 3,000-node graph with two link types, loaded into the running app.
import { rng as layoutRng } from '../shared/layouts.js';
export const rng = layoutRng;
export async function fLarge(ex, n = 3000, m = 6000, seed = 3) {
  const r = rng(seed), nodes = [], links = [], p = ex.producer('external');
  for (let i = 0; i < n; i++) { nodes.push([`r${i}`, 'R', {}]); p.push('node.upsert', { id: `r${i}`, type: 'R', properties: {} }); }
  for (let j = 0; j < m; j++) { const a = Math.floor(r() * n), b = Math.floor(r() * n); if (a === b) continue; const t = r() < 0.5 ? 'A' : 'B'; links.push([`re${j}`, `r${a}`, `r${b}`, t]); p.push('link.upsert', { id: `re${j}`, type: t, fromId: `r${a}`, toId: `r${b}` }); }
  await p.flush();
  return { svc: ex.service, nodes, links };
}
