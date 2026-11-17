// StreamGraph JS SDK (MIT, no dependencies; browsers and Node 18+).
// Every call goes through the same access rules as the studio: you only get back what the user may see.
//   import { createClient, embedViewer } from './streamgraph.js';
//   const sg = createClient({ baseUrl: 'http://127.0.0.1:8080' });
//   const r = await sg.query({ a: { type: 'Customer', where: [{ field: 'city', op: '=', value: 'Austin' }] } });
//   embedViewer(document.querySelector('#graph'), { baseUrl: 'http://127.0.0.1:8080', search: 'Ada' });
export class StreamGraphError extends Error { constructor(message, status) { super(message); this.status = status; } }

export function createClient({ baseUrl = '', as = null, fetch: f = globalThis.fetch } = {}) {
  const base = String(baseUrl).replace(/\/$/, '');
  async function req(method, path, body, { raw = false } = {}) {
    const r = await f(base + path, { method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(as ? { 'x-sg-as': as } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!r.ok) { let m = r.statusText; try { m = (await r.json()).error || m; } catch {} throw new StreamGraphError(m, r.status); }
    return raw ? r.text() : r.json();
  }
  const q = o => new URLSearchParams(o).toString();
  return {
    /** who the server thinks you are: { actor, subject, admin, canEdit } */
    me: () => req('GET', '/api/explore/x/me'),
    /** types and the fields you may see per type */
    meta: () => req('GET', '/api/explore/x/meta'),
    /** structured query { a:{type,where:[{field,op,value}]}, rel:{type,dir}, b:{...}, limit } -> { cypher, columns, rows, count } */
    query: query => req('POST', '/api/explore/x/query', { query }),
    /** run the Cypher subset the builder writes: MATCH (a:T)-[r:R]->(b:U) WHERE a.f = 'v' RETURN a, r, b LIMIT n */
    cypher: cypher => req('POST', '/api/explore/x/query', { cypher }),
    /** the Cypher a structured query stands for */
    toCypher: query => req('POST', '/api/explore/x/cypher', { query }).then(r => r.cypher),
    /** plain-English question (an admin must turn plain-English questions on; built-in rules, no network) */
    ask: question => req('POST', '/api/explore/x/nl/ask', { question }),
    caption: ids => req('POST', '/api/explore/x/nl/caption', { ids }),
    /** short text summary of the given node ids */
    summary: ids => req('POST', '/api/explore/x/summary', { ids }).then(r => r.text),
    history: {
      timeline: () => req('GET', '/api/explore/x/history/timeline'),
      at: t => req('GET', `/api/explore/x/history/at?${q({ t: +new Date(t) })}`),
      compare: (from, to) => req('GET', `/api/explore/x/history/compare?${q({ from: +new Date(from), to: +new Date(to) })}`),
    },
    /** ops: [{op:'addNode',type,key,props}|{op:'setProps',id,props}|{op:'deleteNode',id}|{op:'addEdge',type,from,to}|{op:'deleteEdge',id}] */
    edit: ops => req('POST', '/api/explore/x/edit', { ops }),
    comments: { list: target => req('GET', `/api/explore/x/comments?${q(target ? { target } : {})}`).then(r => r.comments), add: (target, text) => req('POST', '/api/explore/x/comments', { target, text }).then(r => r.comment), remove: id => req('DELETE', `/api/explore/x/comments?${q({ id })}`) },
    notebooks: { list: () => req('GET', '/api/explore/x/notebooks').then(r => r.notebooks), create: title => req('POST', '/api/explore/x/notebooks', { title }).then(r => r.notebook), get: id => req('GET', `/api/explore/x/notebook?${q({ id })}`), addEntry: (nb, { kind = 'note', text = '', ids = [] } = {}) => req('POST', '/api/explore/x/notebook/entry', { nb, kind, text, ids }).then(r => r.entry) },
    /** deterministic SVG of the given nodes (positions optional: {id:{x,y}}) */
    exportSvg: ({ ids, positions = {}, theme = 'light', title } = {}) => req('POST', '/api/explore/x/export/svg', { ids, positions, theme, title }, { raw: true }),
    rdf: (format = 'turtle') => req('GET', `/api/explore/x/rdf?${q({ format })}`, undefined, { raw: true }),
    importRdf: (text, format = 'turtle') => req('POST', '/api/explore/x/rdf/import', { text, format }),
    processing: { status: () => req('GET', '/api/explore/x/processing'), set: patch => req('POST', '/api/explore/x/processing', patch), metrics: () => req('GET', '/api/explore/x/processing/metrics') },
    matches: { review: () => req('GET', '/api/explore/x/er/review'), decide: (a, b, decision) => req('POST', '/api/explore/x/er/decide', { a, b, decision }) },
    request: req,
  };
}

/** Embed the graph explorer (an iframe of /explore/studio). Options: search (text to search on load), drawer ('table'|'chart'|'history'|'query'|'notebook'), height. */
export function embedViewer(el, { baseUrl = '', search, drawer, height = '600px', title = 'StreamGraph graph explorer' } = {}) {
  const u = new URL(String(baseUrl).replace(/\/$/, '') + '/explore/studio', globalThis.location?.href || 'http://127.0.0.1/');
  if (search) u.searchParams.set('q', search); if (drawer) u.searchParams.set('drawer', drawer);
  const f = globalThis.document.createElement('iframe'); f.src = u.toString(); f.title = title; f.style.cssText = `width:100%;height:${height};border:1px solid #dde2e8;border-radius:10px`;
  el.replaceChildren(f);
  return { iframe: f, get explorer() { try { return f.contentWindow.__explore; } catch { return null; } }, destroy: () => f.remove() };
}
