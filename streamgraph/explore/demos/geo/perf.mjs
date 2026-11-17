// Map viewer perf check (SPEC §22.9): 10,000 real USGS earthquakes (+ places/countries) in map mode, offline basemap.
//   node explore/demos/geo/perf.mjs   (needs Chrome/Edge: CHROME_PATH)  -> proof/map-10k-perf.txt, proof/map-10k.png
import { chromium } from 'playwright-core';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startGeoDemo, APP_ROOT } from './run.js';

const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const dir = mkdtempSync(join(tmpdir(), 'sgx-geoperf-'));
const t0 = performance.now();
const app = await startGeoDemo({ port: 0, dataDir: dir, log: null, all: true, offline: true });
const ingestMs = performance.now() - t0, base = `http://127.0.0.1:${app.port}`;
const time = async (f, n = 5) => { const ms = []; for (let i = 0; i < n; i++) { const a = performance.now(); await f(); ms.push(performance.now() - a); } ms.sort((a, b) => a - b); return { median: +ms[Math.floor(n / 2)].toFixed(1), max: +ms.at(-1).toFixed(1) }; };
const srv = {
  gridH3r3: await time(() => fetch(`${base}/api/explore/geo/grid?kind=h3&res=3`).then(r => r.json())),
  gridMgrs1: await time(() => fetch(`${base}/api/explore/geo/grid?kind=mgrs&res=1`).then(r => r.json())),
  bboxJapan: await time(() => fetch(`${base}/api/explore/geo/bbox?bbox=128,30,146,46&limit=5000`).then(r => r.json())),
};
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 960 } });
const tNav = performance.now();
await page.goto(`${base}/explore?style=/explore/geo-style.json&mode=map`);
await page.waitForSelector('body[data-map-ready="1"]', { timeout: 120000 });
await page.waitForFunction(() => __explore.mapView.nodes.length > 9000, null, { timeout: 60000 });
const mapReadyMs = performance.now() - tNav;
const r = await page.evaluate(async () => {
  const v = __explore.mapView, out = { points: v.nodes.length, links: v.links.length };
  const t = f => { const a = performance.now(); f(); return +(performance.now() - a).toFixed(1); };
  out.setDataMs = t(() => v.flush());
  out.h3r3Ms = t(() => v.setGrid({ kind: 'h3', resolution: 3 })); out.h3Cells = v.gridResult.cells.length;
  out.h3r6Ms = t(() => v.setGrid({ kind: 'h3', resolution: 6 })); out.h3r6Cells = v.gridResult.cells.length;
  out.mgrs1Ms = t(() => v.setGrid({ kind: 'mgrs', resolution: 1 })); out.mgrsCells = v.gridResult.cells.length;
  v.setGrid({ kind: 'h3', resolution: 3 });
  const id = v.nodes.find(n => n.id.startsWith('ne:place:')).id;
  out.selectMs = t(() => __explore.select(id)); __explore.clearSelection();
  // frames while the camera animates (render cost of 10k points + links + grid)
  await new Promise(res => setTimeout(res, 500));
  const frames = []; let last = performance.now(), run = true; const tick = now => { frames.push(now - last); last = now; if (run) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  v.map.easeTo({ center: [140, 30], zoom: 3.2, duration: 3000 }); await new Promise(res => setTimeout(res, 3200));
  v.map.easeTo({ center: [-120, 20], zoom: 1.6, duration: 3000 }); await new Promise(res => setTimeout(res, 3200)); run = false;
  frames.sort((a, b) => a - b); out.fpsMedian = Math.round(1000 / frames[Math.floor(frames.length / 2)]); out.frameP95Ms = +frames[Math.floor(frames.length * 0.95)].toFixed(1); out.frames = frames.length;
  out.renderer = (() => { const gl = v.map.getCanvas().getContext('webgl2') || v.map.getCanvas().getContext('webgl'); const d = gl?.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; })();
  return out;
});
await page.screenshot({ path: join(APP_ROOT, 'proof/map-10k.png') });
const txt = `Map viewer perf, 10k geo points (${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })} ET)
data: ${app.graph.nodes.length} nodes (${app.graph.nodes.filter(n => n.type === 'Earthquake').length} USGS earthquakes Jul 6 - Oct 31 2026 + Natural Earth places/countries), ${app.graph.links.length} links; offline Natural Earth basemap
ingest through the §6 contract (in-process): ${ingestMs.toFixed(0)} ms
server (HTTP, same code as the MCP tools; median / max of 5): grid_counts H3 r3 ${srv.gridH3r3.median} / ${srv.gridH3r3.max} ms · MGRS 10 km ${srv.gridMgrs1.median} / ${srv.gridMgrs1.max} ms · nodes_in_bbox Japan ${srv.bboxJapan.median} / ${srv.bboxJapan.max} ms
browser: page -> map ready with ${r.points} points: ${mapReadyMs.toFixed(0)} ms
  rebuild map sources (points + ${r.links} arcs + grid): ${r.setDataMs} ms
  H3 r3 aggregation + polygons: ${r.h3r3Ms} ms (${r.h3Cells} cells) · H3 r6: ${r.h3r6Ms} ms (${r.h3r6Cells} cells) · MGRS 10 km: ${r.mgrs1Ms} ms (${r.mgrsCells} cells)
  select a node (graph + map highlight): ${r.selectMs} ms
  camera animation: median ${r.fpsMedian} fps, p95 frame ${r.frameP95Ms} ms over ${r.frames} frames
  WebGL renderer: ${r.renderer}${/SwiftShader|llvmpipe|software/i.test(r.renderer) ? '  <- SOFTWARE rendering on this box: fps is not a GPU number' : ''}
`;
writeFileSync(join(APP_ROOT, 'proof/map-10k-perf.txt'), txt); console.log(txt);
await browser.close(); await app.close(); rmSync(dir, { recursive: true, force: true });
