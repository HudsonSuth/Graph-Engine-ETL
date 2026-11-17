// Helpers for the entity-resolution suites (SPEC §21.9).
import { existsSync } from 'node:fs';
import { createExplore, loadConfig } from '../server/app.js';
import { erConfig } from '../er/config.js';
import { engineAvailable } from '../er/sidecar.js';
import { generate } from '../demos/er/generate.mjs';

// the Flink suite's runtime also carries a JDK; reuse it for the Duke sidecar when nothing else is configured
if (!process.env.STREAMGRAPH_FLINK_RUNTIME && existsSync('/workspace/flink-runtime/jdk')) process.env.STREAMGRAPH_FLINK_RUNTIME = '/workspace/flink-runtime';

export const IMPL = process.env.ER_IMPL || 'correct';
export const ENGINE = process.env.ER_ENGINE || 'splink';
/** null when the engine can run here, else the skip reason (never mocked) */
export function skipReason(engine = ENGINE) {
  if (IMPL === 'wrong') return null;
  return engineAvailable(engine, erConfig({ engine })) ? null : `ER engine "${engine}" not available (run npm run er:setup${engine === 'duke' ? ' and install Java 17+' : ''})`;
}
export const SOURCES = ['crm', 'billing', 'support'];
const base = loadConfig('/nonexistent/explore.config.json');
export function erInstance({ engine = ENGINE, er = {}, access, mcp, streams = SOURCES, ...rest } = {}) {
  return createExplore({ log: null, config: { ...base, ...rest, streams, access: { ...base.access, ...(access || {}) }, mcp: { ...base.mcp, ...(mcp || {}) }, er: { enabled: true, engine, ...er } } });
}
export const P = (src, rid, props, type = 'Person') => ({ id: `${src}:${rid}`, type, label: props.name, properties: { ...props, dataSource: src, recordId: rid } });
export async function put(ex, recs, op = 'node.upsert') {
  const by = new Map(); for (const r of recs) { const s = r.id.split(':')[0]; if (!by.has(s)) by.set(s, []); by.get(s).push(r); }
  for (const [s, rs] of by) { const p = ex.producer(s); for (const r of rs) p.push(op, op === 'node.remove' ? { id: r.id } : r); await p.flush(); }
  await settle(ex);
}
export async function settle(ex) { await ex.ingest.chain; await new Promise(r => setTimeout(r, 5)); await ex.er.idle(); await ex.ingest.chain; await new Promise(r => setTimeout(r, 5)); await ex.er.idle(); }
export async function loadFixture(ex, f, { batches = 1 } = {}) {
  const n = Math.ceil(f.records.length / batches);
  for (let i = 0; i < f.records.length; i += n) await put(ex, f.records.slice(i, i + n).map(r => ({ id: r.id, type: r.type, label: r.label, properties: r.properties })));
}
/** the published partition: record id -> entity id, read from RESOLVES_TO links in the graph (what users see) */
export function partition(ex) {
  const m = new Map();
  for (const it of ex.service.items.values()) if (it.kind === 'link' && !it.deleted && it.type === 'RESOLVES_TO') m.set(it.fromId, it.toId);
  return m;
}
export const testSet = (seed = 11) => generate({ people: 600, orgs: 60, seed });
export const linkOf = (ex, rec) => ex.service.live(`er:rt:${rec}`);
