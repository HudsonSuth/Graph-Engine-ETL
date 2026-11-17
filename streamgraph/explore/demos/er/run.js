// Entity-resolution demo: synthetic people + organisations (known ground truth, no real people) from three sources
// (crm, billing, support) streamed into the combined app; the ER stage resolves them as they arrive.
//   npm run demo:er                       (Splink engine; ER_ENGINE=duke for Duke)
//   node explore/demos/er/run.js --stream (records arrive over ~20 s so you can watch entities merge)
// Open the printed /explore URL. Toggle Both / Records / Entities in the "Entity resolution" panel.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startCombined } from '../../combined.js';
import { loadConfig } from '../../server/app.js';
import { generate } from './generate.mjs';

export const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = join(DEMO_DIR, '../../..');
export const FIXTURE = join(DEMO_DIR, 'fixture.json');
export const SOURCES = ['crm', 'billing', 'support'];

export function loadFixture() { if (!existsSync(FIXTURE)) writeFileSync(FIXTURE, JSON.stringify(generate())); return JSON.parse(readFileSync(FIXTURE, 'utf8')); }
export function publishStyle() { mkdirSync(join(APP_ROOT, 'explore/public'), { recursive: true }); copyFileSync(join(DEMO_DIR, 'style.json'), join(APP_ROOT, 'explore/public/er-style.json')); }

/** push records (and WORKS_AT links) through the §6 contract, one producer per data source */
export async function ingestRecords(ex, fixture, { batch = 0, pauseMs = 0, records = fixture.records, links = fixture.links } = {}) {
  const ps = Object.fromEntries(SOURCES.map(s => [s, ex.producer(s)]));
  const push = r => ps[r.dataSource].push('node.upsert', { id: r.id, type: r.type, label: r.label, properties: r.properties });
  if (!batch) { for (const r of records) push(r); }
  else for (let i = 0; i < records.length; i += batch) { for (const r of records.slice(i, i + batch)) push(r); await Promise.all(Object.values(ps).map(p => p.flush())); if (pauseMs) await new Promise(r => setTimeout(r, pauseMs)); }
  const ids = new Set(records.map(r => r.id));
  for (const l of links) if (ids.has(l.fromId) && ids.has(l.toId)) ps[l.source].push('link.upsert', { id: l.id, type: l.type, fromId: l.fromId, toId: l.toId, properties: l.properties });
  await Promise.all(Object.values(ps).map(p => p.flush()));
}

export async function startErDemo({ port = Number(process.env.PORT || 8080), dataDir, log = console.log, stream = false, config: over = {}, fixture = loadFixture() } = {}) {
  publishStyle();
  const base = loadConfig(join(DEMO_DIR, 'explore.config.json'));
  const config = { ...base, ...over, er: { ...base.er, ...(over.er || {}), ...(process.env.ER_ENGINE ? { engine: process.env.ER_ENGINE } : {}) } };
  const dir = dataDir || join(APP_ROOT, 'data/er-demo'); mkdirSync(dir, { recursive: true });
  const app = await startCombined({ port, dataDir: dir, graphFile: ':memory:', demo: false, runAtBoot: false, log, config });
  const t0 = performance.now();
  const loading = ingestRecords(app.ex, fixture, stream ? { batch: 150, pauseMs: 1000 } : {}).then(() => app.ex.er.idle()).then(() => log?.(`[er-demo] ${fixture.records.length} records resolved in ${Math.round(performance.now() - t0)} ms: ${JSON.stringify((({ records, entities, multiRecordEntities, possibleLinks }) => ({ records, entities, multiRecordEntities, possibleLinks }))(app.ex.er.stats()))}`));
  if (!stream) await loading;
  const b = `http://127.0.0.1:${app.port}`;
  const urls = { explore: `${b}/explore?style=/explore/er-style.json`, entities: `${b}/explore?style=/explore/er-style.json&er=entities`, stats: `${b}/api/explore/er/stats`, mcp: `${b}/mcp` };
  log?.(`Explore UI (records + entities): ${urls.explore}\nResolved entities only: ${urls.entities}\nER stats: ${urls.stats}\nMCP: ${urls.mcp} (tools resolve_entity, why_matched, list_possible_matches)\nData: synthetic (explore/demos/er/generate.mjs), not real people.`);
  return { ...app, fixture, urls, loading };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('run.js')) await startErDemo({ stream: process.argv.includes('--stream') });
