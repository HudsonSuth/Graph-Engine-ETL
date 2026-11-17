// Geo demo: USGS earthquakes (public domain) + Natural Earth places/countries (public domain) on the map viewer.
//   npm run demo:geo                       October 2026 (2,461 events), in-process
//   npm run demo:geo -- --all              all 10,000 events in the fixture (Jul 6 - Oct 31, 2026: the latest 10,000 M2.5+ before Nov 1)
//   npm run demo:geo -- --stream           events arrive over ~40 s (watch the time slider / grid fill in)
//   npm run demo:geo:flink                 Kafka + Flink with per-cell windowed counts (graph.geo-metrics) as heat
//   npm run demo:geo -- --offline          bundled Natural Earth basemap only (no tile requests)
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { startCombined } from '../../combined.js';
import { loadConfig } from '../../server/app.js';
import { GEO_DIR, buildGeoGraph, ingestGeo, loadGeoFixture } from './graph.js';

export const APP_ROOT = join(GEO_DIR, '../../..');
export function publishStyle() { copyFileSync(join(GEO_DIR, 'style.json'), join(APP_ROOT, 'explore/public/geo-style.json')); }

export async function startGeoDemo({ port = Number(process.env.PORT || 8080), dataDir, log = console.log, all = false, stream = false, flink = false, offline = false, config: over = {}, since = all ? null : '2026-10-01' } = {}) {
  publishStyle();
  const base = loadConfig(join(GEO_DIR, 'explore.config.json'));
  const config = { ...base, ...over, savedViews: { seedFile: join(GEO_DIR, 'views.json') }, geo: { ...base.geo, ...(offline ? { basemap: 'offline' } : {}), ...(over.geo || {}) } };
  if (flink) Object.assign(config, { mode: 'kafka', processor: { enabled: true, delivery: 'at-least-once', geo: { enabled: true, resolution: 3, windowMs: 86400e3, windows: 31 }, ...(over.processor || {}) } });
  const dir = dataDir || join(APP_ROOT, 'data/geo-demo'); mkdirSync(dir, { recursive: true });
  const app = await startCombined({ port, dataDir: dir, graphFile: ':memory:', demo: false, runAtBoot: false, log, config });
  const g = buildGeoGraph(loadGeoFixture(), { since });
  const loading = ingestGeo(app.ex, g, stream ? { batch: Math.ceil(g.nodes.length / 40), pauseMs: 1000 } : {});
  if (!stream) await loading;
  const b = `http://127.0.0.1:${app.port}`;
  const urls = { map: `${b}/explore?style=/explore/geo-style.json&mode=map`, split: `${b}/explore?view=geo-split`, tour: `${b}/explore?present=1&deck=geo-tour`, mcp: `${b}/mcp` };
  log?.(`[geo-demo] ${g.nodes.length} nodes, ${g.links.length} links (USGS ComCat + Natural Earth, public domain)\nMap: ${urls.map}\nSplit view: ${urls.split}\nPresenter tour: ${urls.tour}\nMCP: ${urls.mcp} (tools nodes_in_bbox, grid_counts)`);
  return { ...app, graph: g, urls, loading };
}

if (process.argv[1]?.endsWith('run.js')) await startGeoDemo({ all: process.argv.includes('--all'), stream: process.argv.includes('--stream'), flink: process.argv.includes('--flink'), offline: process.argv.includes('--offline') });
