// Client working view (SPEC §7.2 UI apply rules, §8.2 incremental delta application).
// Holds canonical items and mirrors drawable ones into a graphology graph without rebuilding it.
export class ViewStore {
  constructor(graph, { onNodeAdded = () => {}, onNodeRemoved = () => {}, onItemChanged = () => {} } = {}) {
    this.graph = graph; this.items = new Map(); this.pendingLinks = new Map(); // nodeId -> Set(linkId) waiting for an end
    this.deltaSeq = 0; this.hooks = { onNodeAdded, onNodeRemoved, onItemChanged };
    this.metrics = { fullRebuilds: 0, incrementalApplies: 0, lastApplyMs: 0, applied: 0, gaps: 0 };
  }
  /** Full rebuild from a snapshot (only on open / resync). */
  loadSnapshot(snap, positions = new Map()) {
    this.graph.clear(); this.items.clear(); this.pendingLinks.clear();
    this.metrics.fullRebuilds++;
    for (const it of snap.items) if (it.kind === 'node') this.#upsertNode(it, positions.get(it.id));
    for (const it of snap.items) if (it.kind === 'link') this.#upsertLink(it);
    this.deltaSeq = snap.deltaCursor || 0;
  }
  /** Apply one delta in place. Returns { ok } or { resync: true } on a deltaSeq gap. */
  applyDelta(d) {
    if (d.deltaSeq <= this.deltaSeq) return { ok: true, duplicate: true };
    if (d.deltaSeq !== this.deltaSeq + 1) { this.metrics.gaps++; return { resync: true }; }
    const t0 = (globalThis.performance?.now?.() ?? Date.now());
    for (const it of d.upserts || []) if (it.kind === 'node') this.#upsertNode(it);
    for (const it of d.upserts || []) if (it.kind === 'link') this.#upsertLink(it);
    for (const id of d.removes || []) this.#remove(id);
    this.deltaSeq = d.deltaSeq;
    this.metrics.incrementalApplies++; this.metrics.applied += (d.upserts?.length || 0) + (d.removes?.length || 0);
    this.metrics.lastApplyMs = (globalThis.performance?.now?.() ?? Date.now()) - t0;
    return { ok: true };
  }
  /** Add items returned by a command (search/expand/path) without a delta. */
  addItems(items) { for (const it of items) if (it.kind === 'node') this.#upsertNode(it); for (const it of items) if (it.kind === 'link') this.#upsertLink(it); }

  #upsertNode(it, pos) {
    const g = this.graph, had = g.hasNode(it.id);
    this.items.set(it.id, it);
    if (had) { g.mergeNodeAttributes(it.id, { item: it, type: it.type }); this.hooks.onItemChanged(it, false); } // positions are preserved
    else {
      const p = pos || (typeof it.x === 'number' && typeof it.y === 'number' ? { x: it.x, y: it.y } : null);
      g.addNode(it.id, { item: it, type: it.type, x: p?.x ?? NaN, y: p?.y ?? NaN, placed: !!p });
      this.hooks.onNodeAdded(it);
      const waiting = this.pendingLinks.get(it.id);
      if (waiting) { this.pendingLinks.delete(it.id); for (const lid of waiting) { const l = this.items.get(lid); if (l) this.#upsertLink(l); } }
    }
  }
  #upsertLink(it) {
    const g = this.graph; this.items.set(it.id, it);
    if (g.hasEdge(it.id)) {
      const [s, t] = g.extremities(it.id);
      if (s === it.fromId && t === it.toId) { g.mergeEdgeAttributes(it.id, { item: it, type: it.type }); this.hooks.onItemChanged(it, false); return; }
      g.dropEdge(it.id);
    }
    if (g.hasNode(it.fromId) && g.hasNode(it.toId)) { g.addDirectedEdgeWithKey(it.id, it.fromId, it.toId, { item: it, type: it.type }); this.hooks.onItemChanged(it, true); }
    else for (const end of [it.fromId, it.toId]) if (!g.hasNode(end)) { if (!this.pendingLinks.has(end)) this.pendingLinks.set(end, new Set()); this.pendingLinks.get(end).add(it.id); }
  }
  #remove(id) {
    const g = this.graph, it = this.items.get(id); this.items.delete(id);
    if (g.hasNode(id)) {
      // links whose end is gone stay known (they may come back) but are no longer drawn
      for (const e of g.edges(id)) { const l = this.items.get(e); g.dropEdge(e); if (l) { const other = l.fromId === id ? l.toId : l.fromId; for (const end of [id, other]) { if (!this.pendingLinks.has(end)) this.pendingLinks.set(end, new Set()); } this.pendingLinks.get(id).add(e); } }
      g.dropNode(id); this.hooks.onNodeRemoved(id);
    } else if (g.hasEdge(id)) g.dropEdge(id);
    if (it?.kind === 'link') for (const end of [it.fromId, it.toId]) this.pendingLinks.get(end)?.delete(id);
  }
}
/** True 1-hop neighbourhood (nodes + connecting links) used for selection highlight (§10.2). */
export function neighborhood(graph, id) {
  const nodes = new Set([id]), links = new Set();
  if (!graph.hasNode(id)) return { nodes, links };
  graph.forEachEdge(id, (e, a, s, t) => { links.add(e); nodes.add(s === id ? t : s); });
  return { nodes, links };
}
