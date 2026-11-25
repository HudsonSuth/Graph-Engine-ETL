// Retrieval for an agent retrieve node (L3 text search, L4 vector search, L5 both).
// Strings are what the model reads. Objects `{ text, entity }` also name the graph type so the
// locality gate can refuse a remote model that lacks `export` on that type.
import { brokenL45 } from '../llm/l45-wrong.js';

const MASK = '[hidden]';

function snippet(r) {
  if (typeof r === 'string') return r;
  if (!r || typeof r !== 'object') return String(r ?? '');
  const props = Object.entries(r.props || {})
    .filter(([k, v]) => !k.startsWith('_') && !Array.isArray(v) && v !== MASK && v != null && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${v}`).join('; ');
  const head = [r.label, r.key].filter(Boolean).join(' ');
  return props ? `${head} — ${props}` : (head || r.id || JSON.stringify(r));
}

export function hitOf(d) {
  if (typeof d === 'string') return { text: d, entity: null };
  if (d && typeof d === 'object') {
    const text = d.text != null ? String(d.text) : (d.title != null ? String(d.title) : snippet(d));
    return { text, entity: d.entity || d.label || null };
  }
  return { text: String(d ?? ''), entity: null };
}

export function makeGraphRetrieve(graph, k = 8, opts = {}) {
  return async (q) => {
    if (!graph || typeof graph.search !== 'function') return [];
    let rows = [];
    try { rows = graph.search(String(q || ''), k) || []; }
    catch { return []; }
    const out = [];
    for (const r of rows) {
      if (opts.engine && opts.subject && r?.label) {
        try {
          const ok = (await opts.engine.decide({ subject: opts.subject, action: 'read', entity: r.label, env: { via: 'llm' } })).allow;
          if (!ok) continue;
          const view = typeof opts.engine.viewNode === 'function' ? opts.engine.viewNode(opts.subject, r) : r;
          out.push({ text: snippet(view), entity: r.label });
        } catch { /* an unreadable type is left out of the prompt */ }
      } else out.push(snippet(r));
    }
    return out;
  };
}

export function makeOpenSearchRetrieve(searchFetch, k = 8) {
  return async (q) => {
    if (typeof searchFetch !== 'function') return [];
    try {
      const res = await searchFetch(String(q || ''), k);
      return Array.isArray(res) ? res.map(r => (typeof r === 'string' ? r : (r?.text || r?.title || r?.id || JSON.stringify(r)))) : [];
    } catch {
      return [];
    }
  };
}

/** Vector search. `search(vector, k)` talks to the k-NN index; `embed(text)` builds the query vector. */
export function makeVectorRetrieve({ search, embed, k = 8 } = {}) {
  return async (q) => {
    if (typeof search !== 'function' || typeof embed !== 'function') return null;
    const vec = await embed(String(q || ''));
    const hits = await search(vec, k);
    return Array.isArray(hits) ? hits.map(hitOf) : [];
  };
}

function dedupe(hits) {
  const seen = new Set(), out = [];
  for (const h of hits) {
    const text = typeof h === 'string' ? h : h?.text;
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(h);
  }
  return out;
}

/**
 * L5 combined retrieval: vector hits plus the graph's text hits.
 * When the vector index is missing or errors (OpenSearch at :9200 is off, or the query cannot be embedded),
 * the graph text search is the whole answer. That is the L4 fallback.
 */
export function makeAgentRetrieve({ graph, k = 8, engine, subject, search, embed } = {}) {
  const graphRetrieve = makeGraphRetrieve(graph, k, { engine, subject });
  const vectorRetrieve = makeVectorRetrieve({ search, embed, k });
  return async (q) => {
    if (brokenL45()) {
      // DELIBERATELY WRONG: no graph fallback, and a working vector index is not combined with the graph.
      if (typeof search !== 'function') throw new Error('vector index offline');
      const only = await vectorRetrieve(q);
      return only || [];
    }
    let vectorHits = null;
    if (typeof search === 'function' && typeof embed === 'function') {
      try { vectorHits = await vectorRetrieve(q); }
      catch { vectorHits = null; }
    }
    const graphHits = await graphRetrieve(q);
    if (vectorHits == null) return graphHits;
    return dedupe([...vectorHits, ...graphHits]);
  };
}

export function combineRetrieve(...retrievers) {
  return async (q) => {
    const out = [];
    for (const r of retrievers) {
      try { out.push(...(await r(q) || [])); } catch { /* one retriever failing leaves the others */ }
    }
    return dedupe(out);
  };
}
