// Graph text search for an agent retrieve node. The strings are the text the model reads.
function snippet(r) {
  if (typeof r === 'string') return r;
  if (!r || typeof r !== 'object') return String(r ?? '');
  const props = Object.entries(r.props || {}).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${v}`).join('; ');
  const head = [r.label, r.key].filter(Boolean).join(' ');
  return props ? `${head} — ${props}` : (head || r.id || JSON.stringify(r));
}

export function makeGraphRetrieve(graph, k = 8) {
  return async (q) => {
    if (!graph || typeof graph.search !== 'function') return [];
    try {
      const rows = graph.search(String(q || ''), k);
      return (rows || []).map(snippet);
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
