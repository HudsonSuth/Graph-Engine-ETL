// OpenSearch k-NN index for vectors produced by the ETL `embed` step (phase L4).
// The sync-out OpenSearch sink writes each node's embedding into a sibling index (`<text-index>-knn`).
// When the cluster accepts `knn_vector` (the k-NN plugin; Lucene HNSW, no extra native addon in this process),
// queries use the k-NN API. The Linux min distribution ships without that plugin: the same vectors are stored
// as floats and ranked here. Either way the caller gets the nearest nodes. A cluster that is down throws,
// and agent retrieval falls back to the graph's text search.
import { brokenL45 } from '../llm/l45-wrong.js';

export const isVector = v => Array.isArray(v) && v.length >= 2 && v.every(n => typeof n === 'number' && Number.isFinite(n));

/** The embedding on a graph node: a numeric array named `embedding` or listed in `llm_fields`. */
export function vectorOf(props) {
  if (!props || typeof props !== 'object') return null;
  const named = ['embedding', ...String(props.llm_fields || '').split(',').map(s => s.trim()).filter(Boolean)];
  const seen = new Set();
  for (const k of named) {
    if (seen.has(k)) continue;
    seen.add(k);
    if (isVector(props[k])) return { field: k, vector: props[k] };
  }
  return null;
}

/** Copy embed-step vectors onto a graph node even when the mapping's prop list does not name them. */
export function vectorProps(data) {
  const fields = data?._llm?.fields;
  if (!Array.isArray(fields)) return {};
  const out = {};
  for (const f of fields) if (isVector(data[f])) out[f] = data[f];
  return out;
}

export function cosine(a, b) {
  if (!isVector(a) || !isVector(b) || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

const textOf = node => {
  const bits = [];
  for (const [k, v] of Object.entries(node.props || {})) {
    if (k.startsWith('_') || Array.isArray(v) || v == null || typeof v === 'object') continue;
    if (v === '[hidden]') continue;
    bits.push(`${k}: ${v}`);
  }
  return [node.label, node.key, ...bits].filter(Boolean).join(' — ');
};

export function knnMapping(dim) {
  return {
    settings: { index: { knn: true, number_of_shards: 1, number_of_replicas: 0 } },
    mappings: {
      properties: {
        kind: { type: 'keyword' }, node_id: { type: 'keyword' }, label: { type: 'keyword' },
        key: { type: 'keyword' }, text: { type: 'text' }, run: { type: 'long' },
        embedding: { type: 'knn_vector', dimension: dim, method: { name: 'hnsw', space_type: 'cosinesimil', engine: 'lucene' } },
        acl: { properties: { label: { type: 'keyword' }, tags: { type: 'keyword' }, classification: { type: 'integer' } } },
      },
    },
  };
}

export function exactMapping() {
  return {
    settings: { number_of_shards: 1, number_of_replicas: 0 },
    mappings: {
      properties: {
        kind: { type: 'keyword' }, node_id: { type: 'keyword' }, label: { type: 'keyword' },
        key: { type: 'keyword' }, text: { type: 'text' }, run: { type: 'long' },
        embedding: { type: 'float', index: false },
        acl: { properties: { label: { type: 'keyword' }, tags: { type: 'keyword' }, classification: { type: 'integer' } } },
      },
    },
  };
}

function hitOf(h, score) {
  const s = h?._source || {};
  return { node_id: s.node_id || null, label: s.label || null, key: s.key || null, text: s.text || '', entity: s.label || null, score: score ?? h?._score ?? 0 };
}

/** Nearest nodes for one vector. Throws when the index is missing or the cluster does not answer. */
export async function knnQuery(client, index, vector, k = 8) {
  const size = Math.max(1, Math.min(Number(k) || 8, 50));
  if (!isVector(vector)) return [];
  try {
    const r = await client.req('POST', `/${index}/_search`, { size, query: { knn: { embedding: { vector, k: size } } } });
    return (r.hits?.hits || []).map(h => hitOf(h));
  } catch (e) {
    if (!e.status || e.status === 404) throw e;
    const r = await client.req('POST', `/${index}/_search`, { size: 1000, query: { match_all: {} } });
    return (r.hits?.hits || [])
      .map(h => hitOf(h, cosine(vector, h._source?.embedding || [])))
      .filter(h => h.node_id)
      .sort((a, b) => b.score - a.score)
      .slice(0, size);
  }
}

export class VectorIndex {
  constructor(client, index) { this.client = client; this.index = index; this.mode = null; this.dim = null; this.ready = false; }
  async ensure(dim) {
    if (this.ready) {
      if (this.dim != null && dim !== this.dim) throw new Error(`embedding dimension is ${dim}; the k-NN index ${this.index} was created for ${this.dim}`);
      return;
    }
    const exists = await this.client.req('HEAD', `/${this.index}`, null, { ok404: true });
    if (!exists) {
      try {
        await this.client.req('PUT', `/${this.index}`, knnMapping(dim));
        this.mode = 'knn';
      } catch (knnErr) {
        if (/resource_already_exists/.test(knnErr.message)) this.mode = 'knn';
        else {
          try { await this.client.req('PUT', `/${this.index}`, exactMapping()); this.mode = 'exact'; }
          catch { throw knnErr; }
        }
      }
    } else this.mode = this.mode || 'knn';
    this.dim = dim;
    this.ready = true;
  }
  async #drop(nodes) {
    if (!nodes.length) return;
    if (!(await this.client.req('HEAD', `/${this.index}`, null, { ok404: true }))) return;
    for (const n of nodes) {
      const id = `${n.label}:${n.key}`;
      await this.client.req('DELETE', `/${this.index}/_doc/${encodeURIComponent(id)}?refresh=true`, null, { ok404: true });
    }
  }
  async apply(b, { engine, sinkUser, run } = {}) {
    if (brokenL45()) return; // DELIBERATELY WRONG: the vector is never written, so a query cannot find the node
    const upserts = [], drops = [...(b.delNodes || [])];
    for (const n of b.nodes || []) {
      const v = vectorOf(n.props);
      if (v) upserts.push({ n, v });
      else drops.push(n);
    }
    if (!upserts.length) { await this.#drop(drops); return; }
    const dim = upserts[0].v.vector.length;
    if (upserts.some(u => u.v.vector.length !== dim)) throw new Error('this batch mixes embedding dimensions');
    await this.ensure(dim);
    await this.#drop(drops);
    const entOf = label => engine?.snap?.entities?.[label] || {};
    const lines = [];
    for (const { n, v } of upserts) {
      const id = `${n.label}:${n.key}`;
      const ent = entOf(n.label);
      const doc = {
        kind: 'vector', node_id: id, label: n.label, key: String(n.key), text: textOf(n), embedding: v.vector, run: run ?? null,
        acl: { label: n.label, tags: ent.tags || [], classification: Number.isInteger(ent.classification) ? ent.classification : null, sink_user: sinkUser || null },
      };
      lines.push({ index: { _index: this.index, _id: id } }, doc);
    }
    if (!lines.length) return;
    const r = await this.client.req('POST', '/_bulk?refresh=true', lines.map(l => JSON.stringify(l)).join('\n') + '\n', { ndjson: true });
    const bad = r.errors && r.items?.find(i => { const x = Object.values(i)[0]; return x.error; });
    if (bad) { const x = Object.values(bad)[0]; throw new Error(`OpenSearch rejected vector ${x._id}: ${x.error.reason || x.error.type}`); }
  }
  async sweep(run) {
    if (brokenL45()) return;
    if (!(await this.client.req('HEAD', `/${this.index}`, null, { ok404: true }))) return;
    await this.client.req('POST', `/${this.index}/_delete_by_query?refresh=true&conflicts=proceed`, { query: { range: { run: { lt: run } } } });
  }
  async search(vector, k) { return knnQuery(this.client, this.index, vector, k); }
}
