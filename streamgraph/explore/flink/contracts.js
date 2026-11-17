// Contracts for the processor's output topics (JSON Schema draft-07, v1). Used by the viewer's metrics store and the tests.
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
export const DERIVED = JSON.parse(readFileSync(new URL('./schemas/graph-derived.v1.json', import.meta.url), 'utf8'));
const ajv = new Ajv({ strict: false }); addFormats(ajv);
export const GEO = JSON.parse(readFileSync(new URL('./schemas/graph-geo.v1.json', import.meta.url), 'utf8')); // optional geo output (SPEC §22.7)
const V = { 'geo.window': null, 'graph.enriched': ajv.compile(DERIVED.enriched), 'node.metrics': ajv.compile(DERIVED.nodeMetrics), 'node.window': ajv.compile(DERIVED.nodeWindow), 'degree.spike': ajv.compile(DERIVED.alert) };
V['geo.window'] = ajv.compile(GEO.geoWindow);
/** -> { ok } | { ok:false, reason } for any processor output record */
export function validateDerived(r) {
  const v = V[r?.kind];
  if (!v) return { ok: false, reason: `unknown kind ${JSON.stringify(r?.kind)}` };
  return v(r) ? { ok: true } : { ok: false, reason: `${r.kind}: ${(v.errors || []).map(e => `${e.instancePath || '/'} ${e.message}`).join('; ')}` };
}
