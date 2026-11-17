// Deterministic vault -> GraphStore sync. Markdown files are the source of truth: every sync makes the graph's wiki slice for
// this vault equal to mapVault(loadVault(dir)): new/changed nodes and edges are (re)written with replace semantics, and nodes
// and edges tagged with this vault that are no longer produced are deleted. Unchanged items are not touched (no history noise).
import { broken } from './broken.js';

const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(key => [key, x[key]])) : x));

export function currentSlice(graph, slug) {
  const nodes = graph.db.prepare("SELECT id,label,key,props FROM nodes WHERE json_extract(props,'$.wiki_vault')=?").all(slug).map(r => ({ id: r.id, label: r.label, key: r.key, props: JSON.parse(r.props) }));
  const edges = graph.db.prepare("SELECT id,type,src,dst,props FROM edges WHERE json_extract(props,'$.wiki_vault')=?").all(slug).map(r => ({ id: r.id, type: r.type, from: r.src, to: r.dst, props: JSON.parse(r.props) }));
  return { nodes, edges };
}

/** Apply the desired slice. Returns counts. */
export function applySlice(graph, desired) {
  const cur = currentSlice(graph, desired.slug);
  const curN = new Map(cur.nodes.map(n => [n.id, n])), curE = new Map(cur.edges.map(e => [e.id, e]));
  const wantN = new Map(desired.nodes.map(n => [n.id, n])), wantE = new Map(desired.edges.map(e => [e.id, e]));
  const r = { nodesAdded: 0, nodesUpdated: 0, nodesRemoved: 0, edgesAdded: 0, edgesUpdated: 0, edgesRemoved: 0 };
  // shared nodes: an id that exists but belongs to another source (no wiki_vault) is never overwritten
  for (const n of desired.nodes) {
    const c = curN.get(n.id);
    if (!c && graph.hasNode(n.id)) { const other = graph.getNode(n.id); if (other.props?.wiki_vault !== desired.slug) { r.conflicts = (r.conflicts || 0) + 1; continue; } }
    if (!c) { graph.replaceNode(n.id, n.label, n.key, n.props); r.nodesAdded++; }
    else if (canon(c.props) !== canon(n.props) || c.label !== n.label) { graph.replaceNode(n.id, n.label, n.key, n.props); r.nodesUpdated++; }
  }
  if (!broken()) for (const e of cur.edges) if (!wantE.has(e.id)) { graph.deleteEdge(e.id); r.edgesRemoved++; }
  for (const e of desired.edges) {
    if (!graph.hasNode(e.from) || !graph.hasNode(e.to)) continue;
    const c = curE.get(e.id);
    if (!c) { graph.replaceEdge(e.type, e.from, e.to, e.props); r.edgesAdded++; }
    else if (canon(c.props) !== canon(e.props)) { graph.replaceEdge(e.type, e.from, e.to, e.props); r.edgesUpdated++; }
  }
  if (!broken()) for (const n of cur.nodes) if (!wantN.has(n.id)) { graph.deleteNode(n.id); r.nodesRemoved++; }
  return r;
}

/** Sorted, canonical dump of one vault's slice (determinism tests). */
export function dumpSlice(graph, slug) {
  const { nodes, edges } = currentSlice(graph, slug);
  const by = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return canon({ nodes: nodes.sort(by), edges: edges.sort(by) });
}
export { canon };
