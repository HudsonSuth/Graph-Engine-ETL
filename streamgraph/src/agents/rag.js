// L3.4/L5 — RAG retrieval helpers.
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

export function makeOpenSearchRetrieve(searchFetch, k = 8) {
  return async (q) => {
    if (typeof searchFetch !== 'function') return [];
    try {
      const res = await searchFetch(String(q || ''), k);
      return Array.isArray(res) ? res.map(r => (typeof r === 'string' ? r : (r?.title || r?.id || JSON.stringify(r)))) : [];
    } catch {
      return [];
    }
  };
}

export function combineRetrieve(...retrievers) {
  return async (q) => {
    const out = [];
    for (const r of retrievers) {
      try { out.push(...(await r(q))); } catch {}
    }
    return out;
  };
}
