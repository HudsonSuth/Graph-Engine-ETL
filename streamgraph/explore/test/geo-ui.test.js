// Browser tests for the map viewer (SPEC §22) on the real USGS + Natural Earth demo data, offline basemap (no network).
// Skips when no Chrome/Chromium is installed (set CHROME_PATH).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mercator } from '../shared/geo-core.js';

const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const built = existsSync(new URL('../public/map.js', import.meta.url));
const skip = !exe ? 'no Chrome found (set CHROME_PATH)' : !built ? 'UI not built (npm run build:explore)' : false;
let app, browser, dir; const errors = [];
before(async () => {
  if (skip) return;
  const { chromium } = await import('playwright-core');
  const { startGeoDemo } = await import('../demos/geo/run.js');
  dir = mkdtempSync(join(tmpdir(), 'sgx-geo-'));
  app = await startGeoDemo({ port: 0, dataDir: dir, log: null, offline: true });
  browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
});
after(async () => { await browser?.close(); await app?.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });
async function open(path, ready = 'body[data-views-ready="1"]') {
  const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${app.port}${path}`);
  await page.waitForSelector(ready, { timeout: 90000 });
  await page.waitForFunction(() => __explore.mapView && __explore.mapView.map.loaded(), null, { timeout: 60000 }).catch(() => {});
  return page;
}
const idle = page => page.evaluate(() => new Promise(r => { __explore.mapSync(); const m = __explore.mapView.map; m.triggerRepaint(); m.once('idle', r); setTimeout(r, 4000); }));
const STYLE = '/explore?style=/explore/geo-style.json';

test('U1 map placement: each point sits where Web Mercator puts it, and renders there', { skip }, async () => {
  const page = await open(`${STYLE}&mode=map`);
  await page.evaluate(() => __explore.mapView.setCamera({ center: [140, 35], zoom: 3 })); await idle(page);
  const r = await page.evaluate(() => {
    const v = __explore.mapView, c = v.map.getCanvas(), pts = v.nodes.filter(n => Math.abs(n.lon - 140) < 25 && Math.abs(n.lat - 35) < 15).slice(0, 25);
    return { w: c.clientWidth, h: c.clientHeight, cam: v.getCamera(), pts: pts.map(p => ({ id: p.id, lon: p.lon, lat: p.lat, px: v.project(p.lon, p.lat), hit: v.map.queryRenderedFeatures(v.project(p.lon, p.lat), { layers: ['sg-nodes', 'sg-nodes-sym'] }).map(f => f.properties.id) })) };
  });
  assert.ok(r.pts.length >= 10, `points near Japan: ${r.pts.length}`);
  const [cx, cy] = mercator(...r.cam.center), world = 512 * 2 ** r.cam.zoom;
  for (const p of r.pts) {
    const [x, y] = mercator(p.lon, p.lat), ex = r.w / 2 + (x - cx) * world, ey = r.h / 2 + (y - cy) * world;
    assert.ok(Math.abs(ex - p.px[0]) < 1 && Math.abs(ey - p.px[1]) < 1, `${p.id}: map ${p.px} vs mercator ${ex.toFixed(1)},${ey.toFixed(1)}`);
    assert.ok(p.hit.length > 0, `${p.id} is drawn at its pixel`);
  }
  assert.equal(await page.evaluate(() => __explore.mapView.stats().basemap), 'offline');
  await page.close();
});

test('U2 H3 grid in the browser = server grid_counts; clicking a cell selects its nodes', { skip }, async () => {
  const page = await open(`${STYLE}&mode=map&grid=h3&res=2`);
  await idle(page);
  const ui = await page.evaluate(() => __explore.mapView.gridResult.cells.map(c => [c.cell, c.count]));
  const srv = await (await fetch(`http://127.0.0.1:${app.port}/api/explore/geo/grid?kind=h3&res=2&limit=20000`)).json();
  assert.deepEqual(new Map(ui), new Map(srv.cells.map(c => [c.cell, c.count])), 'same cells and counts');
  const top = srv.cells[0];
  await page.evaluate(c => __explore.mapView.setCamera({ center: [c.center.lon, c.center.lat], zoom: 4 }), top); await idle(page);
  const box = await page.locator('#map canvas').boundingBox();
  const px = await page.evaluate(c => __explore.mapView.project(c.center.lon, c.center.lat), top);
  await page.evaluate(() => __explore.mapView.setPoints(false)); // click the cell, not a point on top of it
  await page.mouse.click(box.x + px[0], box.y + px[1]);
  await page.waitForFunction(n => __explore.S.selected.size === n, top.count, { timeout: 5000 });
  const sel = await page.evaluate(() => [...__explore.S.selected].sort());
  assert.equal(sel.length, top.count); assert.match(await page.textContent('#map-cell'), new RegExp(top.cell));
  await page.close();
});

test('U3 time slider filters the map points', { skip }, async () => {
  const page = await open(`${STYLE}&mode=map`);
  await idle(page);
  const all = await page.evaluate(() => __explore.mapView.nodes.length);
  await page.evaluate(() => { const t = document.querySelector('#time'); t.value = 500; t.dispatchEvent(new Event('input')); }); await idle(page);
  const r = await page.evaluate(() => { const cut = __explore.S.timeCut, g = __explore.graph; return { cut, n: __explore.mapView.nodes.length, late: __explore.mapView.nodes.filter(p => Date.parse(g.getNodeAttribute(p.id, 'item').eventTime) > cut).length }; });
  assert.ok(r.n > 0 && r.n < all, `${r.n} of ${all} points before the cut`); assert.equal(r.late, 0, 'no point after the time cut');
  await page.close();
});

test('U4 split view: graph and map side by side, selection synced both ways', { skip }, async () => {
  const page = await open(`${STYLE}&mode=split`);
  await idle(page);
  const lay = await page.evaluate(() => ({ g: document.querySelector('#canvas').getBoundingClientRect().width, m: document.querySelector('#map').getBoundingClientRect().width, mode: document.body.dataset.mode }));
  assert.equal(lay.mode, 'split'); assert.ok(Math.abs(lay.g - lay.m) < 4, JSON.stringify(lay));
  // map -> graph
  const id = await page.evaluate(() => __explore.mapView.nodes.find(n => n.id.startsWith('usgs:')).id);
  await page.evaluate(i => { const v = __explore.mapView, n = v.nodes.find(x => x.id === i); v.setCamera({ center: [n.lon, n.lat], zoom: 9 }); }, id); await idle(page);
  const box = await page.locator('#map canvas').boundingBox(), px = await page.evaluate(i => { const n = __explore.mapView.nodes.find(x => x.id === i); return __explore.mapView.project(n.lon, n.lat); }, id);
  await page.mouse.click(box.x + px[0], box.y + px[1]);
  await page.waitForFunction(i => __explore.S.selected.has(i), id, { timeout: 5000 });
  assert.equal(await page.evaluate(i => __explore.renderer.getNodeState(i).isSelected, id), true, 'graph renderer shows the map selection');
  // graph -> map
  const other = await page.evaluate(() => __explore.mapView.nodes.find(n => n.id.startsWith('ne:place:')).id);
  await page.evaluate(i => __explore.select(i), other); await idle(page);
  const st = await page.evaluate(i => { const v = __explore.mapView; return v.map.getFeatureState({ source: 'sg-nodes', id: v.idx.get(i) }); }, other);
  assert.equal(st.sel, true, 'map shows the graph selection');
  await page.waitForFunction(i => { const v = __explore.mapView, n = v.nodes.find(x => x.id === i); return v.map.getBounds().contains([n.lon, n.lat]) && !v.map.isMoving(); }, other, { timeout: 5000 }); // off-screen selection is panned into view
  await page.close();
});

test('U5 saved view stores and restores map mode, camera, grid and basemap', { skip }, async () => {
  const page = await open(`${STYLE}&mode=map`);
  await page.evaluate(async () => { __explore.setGrid('mgrs', 1); __explore.mapView.setCamera({ center: [-122.4, 37.8], zoom: 6.5, bearing: 0, pitch: 0 }); await new Promise(r => setTimeout(r, 300)); await __explore.saveView('Bay Area MGRS'); });
  const saved = await (await fetch(`http://127.0.0.1:${app.port}/api/explore/views/bay-area-mgrs`)).json();
  assert.equal(saved.state.map.mode, 'map'); assert.deepEqual(saved.state.map.grid, { kind: 'mgrs', resolution: 1 }); assert.equal(saved.state.map.camera.zoom, 6.5);
  await page.close();
  const p2 = await open('/explore?view=bay-area-mgrs');
  await p2.waitForFunction(() => document.body.dataset.view === 'bay-area-mgrs', null, { timeout: 30000 }); await idle(p2);
  const st = await p2.evaluate(() => ({ mode: __explore.S.map.mode, cam: __explore.mapView.getCamera(), grid: __explore.mapView.grid, cells: __explore.mapView.gridResult?.cells.length, ui: document.querySelector('#map-grid').value }));
  assert.equal(st.mode, 'map'); assert.deepEqual(st.grid, { kind: 'mgrs', resolution: 1 }); assert.equal(st.ui, 'mgrs'); assert.ok(st.cells > 0);
  assert.ok(Math.abs(st.cam.center[0] + 122.4) < 1e-3 && Math.abs(st.cam.center[1] - 37.8) < 1e-3 && Math.abs(st.cam.zoom - 6.5) < 1e-3, JSON.stringify(st.cam));
  await p2.evaluate(() => __explore.loadView('geo-world')); // a graph-mode view (no map block) switches back to the graph
  await p2.evaluate(() => __explore.applyViewState({ version: 1 }, { animate: false }));
  assert.equal(await p2.evaluate(() => __explore.S.map.mode), 'graph');
  await p2.close();
});

test('U6 MIL-STD-2525 / custom symbols render on the map (same composed images as the graph)', { skip }, async () => {
  const page = await open(`${STYLE}&mode=map`);
  await page.waitForFunction(() => __explore.mapView.images.size >= 4, null, { timeout: 60000 }); await idle(page);
  const r = await page.evaluate(() => { const v = __explore.mapView, withSym = v.nodes.filter(n => n.sym); return { withSym: withSym.length, total: v.nodes.length, images: v.images.size, has: withSym.slice(0, 50).every(n => !v.images.has(n.sym) || v.map.hasImage(n.sym)), drawn: v.map.queryRenderedFeatures({ layers: ['sg-nodes-sym'] }).length }; });
  assert.equal(r.withSym, r.total, 'every node uses a symbol in this style'); assert.ok(r.images >= 4, `${r.images} symbol images`); assert.ok(r.has); assert.ok(r.drawn > 100, `${r.drawn} symbols drawn`);
  await page.close();
});

test('U7 presenter mode steps through map slides (mode, grid, camera per slide)', { skip }, async () => {
  const page = await open('/explore?present=1&deck=geo-tour');
  await page.waitForFunction(() => document.body.dataset.slide === '0', null, { timeout: 30000 });
  assert.equal(await page.evaluate(() => __explore.S.map.mode), 'map');
  await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => document.body.dataset.slide === '1', null, { timeout: 30000 });
  assert.deepEqual(await page.evaluate(() => __explore.mapView.grid), { kind: 'h3', resolution: 2 });
  await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => document.body.dataset.slide === '2', null, { timeout: 30000 }); await idle(page);
  const s = await page.evaluate(() => ({ grid: __explore.mapView.grid, cam: __explore.mapView.getCamera(), title: document.querySelector('#present-title').textContent }));
  assert.deepEqual(s.grid, { kind: 'mgrs', resolution: 0 }); assert.ok(Math.abs(s.cam.center[0] - 139.5) < 0.01); assert.match(s.title, /Japan/);
  await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => document.body.dataset.slide === '3', null, { timeout: 30000 });
  assert.equal(await page.evaluate(() => __explore.S.map.mode), 'split');
  assert.deepEqual(errors, [], 'no page errors');
  await page.close();
});
