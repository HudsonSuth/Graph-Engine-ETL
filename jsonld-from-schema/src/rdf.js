// A-07: offline expansion + RDF Dataset Canonicalization -> stable N-Quads.
import jsonld from 'jsonld';
import { JsonLdSchemaError } from './errors.js';

export const offlineLoader = async url => { throw new JsonLdSchemaError('E_REMOTE_CONTEXT', '', `refusing to load remote document ${url} (offline)`); };
const unwrap = e => { let x = e; for (let i = 0; i < 6 && x; i++) { if (x instanceof JsonLdSchemaError) return x; x = x.cause || x.details?.cause; } return null; };

export async function toNQuads(doc) {
  try { return await jsonld.canonize(doc, { algorithm: 'RDFC-1.0', format: 'application/n-quads', documentLoader: offlineLoader, safe: false }); }
  catch (e) { const r = unwrap(e); if (r) throw r; if (/load|remote|url/i.test(String(e.message)) && /context/i.test(String(e.message))) throw new JsonLdSchemaError('E_REMOTE_CONTEXT', '', e.message); throw e; }
}
export async function expand(doc) {
  try { return await jsonld.expand(doc, { documentLoader: offlineLoader, safe: false }); }
  catch (e) { const r = unwrap(e); if (r) throw r; throw e; }
}
