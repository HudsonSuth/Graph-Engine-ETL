// L3.4 — RAG retrieval helper: top-k node summaries from a GraphStore.
export function makeGraphRetrieve(graph, k = 8) {
  return async (q) => {
    if (!graph || typeof graph.search !== 'function') return [];
    try {
      const rows = graph.search(String(q || ''), k);
      return (rows || []).map(r => (typeof r === 'string' ? r : (r?.label || r?.id || JSON.stringify(r))));
    } catch {
      return [];
    }
  };
}
