import { cmp } from './errors.js';
import { BROKEN } from './impl.js';

export const NS = {
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  sh: 'http://www.w3.org/ns/shacl#',
  schema: 'https://schema.org/',
};
export const DEFAULT_VOCAB = 'https://streamgraph.local/vocab/';

/** Percent-encode everything except RFC 3986 unreserved characters (C-02). */
export const pctEncode = s => Array.from(new TextEncoder().encode(String(s)))
  .map(b => (/[A-Za-z0-9\-._~]/.test(String.fromCharCode(b)) ? String.fromCharCode(b) : '%' + b.toString(16).toUpperCase().padStart(2, '0')))
  .join('');

/** "graph command (orchestrator -> worker)" -> "GraphCommandOrchestratorWorker" */
export const pascal = s => {
  const out = String(s).split(/[^A-Za-z0-9]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('');
  return /^[0-9]/.test(out) ? `T${out}` : out;
};

export const isAbsIri = s => typeof s === 'string' && /^[A-Za-z][A-Za-z0-9+.-]*:[^\s<>"{}|\\^`]*$/.test(s);
export const isCurie = s => typeof s === 'string' && /^[A-Za-z_][A-Za-z0-9_.-]*:[^/\s][^\s]*$/.test(s) && !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(s);

// D-01: keywords first in a fixed order, then the rest by code unit.
const KW_ORDER = ['@context', '@version', '@base', '@vocab', '@id', '@type', '@container', '@json'];
const keyRank = k => { const i = KW_ORDER.indexOf(k); return i >= 0 ? i : k.startsWith('@') ? KW_ORDER.length : KW_ORDER.length + 1; };
export const keyCmp = (a, b) => keyRank(a) - keyRank(b) || cmp(a, b);
export function sortDeep(v) {
  if (BROKEN()) return v; // DELIBERATELY WRONG: insertion order
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort(keyCmp).map(k => [k, sortDeep(v[k])]));
  return v;
}
export const stringify = v => JSON.stringify(sortDeep(v), null, 2) + '\n';
export const canonJson = v => JSON.stringify(sortDeep(v));

/** JSON pointer helpers */
export const ptrJoin = (p, ...segs) => p + segs.map(s => '/' + String(s).replace(/~/g, '~0').replace(/\//g, '~1')).join('');
export function ptrGet(doc, ptr) {
  if (ptr === '' || ptr === '#') return { ok: true, value: doc };
  const p = ptr.startsWith('#') ? ptr.slice(1) : ptr;
  if (!p.startsWith('/')) return { ok: false };
  let cur = doc;
  for (const raw of p.slice(1).split('/')) {
    const seg = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    if (cur === null || typeof cur !== 'object' || !(seg in cur)) return { ok: false };
    cur = cur[seg];
  }
  return { ok: true, value: cur };
}
