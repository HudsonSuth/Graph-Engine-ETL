// Screenshots for the map viewer (SPEC §22): proof/map-*.png
//   node explore/demos/geo/shots.mjs [--no-flink]   (needs Chrome/Edge: CHROME_PATH; the heat shot needs Kafka + Flink)
import { chromium } from 'playwright-core';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startGeoDemo, APP_ROOT } from './run.js';

const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const PROOF = join(APP_ROOT, 'proof');
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const errors = [];
async function shoot(base, path, file, act) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 960 } });
  page.on('pageerror', e => errors.push(`${file}: ${e.message}`));
  await page.goto(base + path); await page.waitForSelector('body[data-views-ready="1"]', { timeout: 90000 });
  await page.waitForFunction(() => !__explore.mapView || __explore.mapView.map.loaded(), null, { timeout: 60000 }).catch(() => {});
  if (act) await act(page);
  await page.waitForFunction(() => !__explore.mapView || __explore.mapView.images.size >= 3, null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => new Promise(r => { if (!__explore.mapView) return r(); __explore.mapSync(); const m = __explore.mapView.map; m.once('idle', r); m.triggerRepaint(); setTimeout(r, 8000); }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(PROOF, file) }); console.log('wrote', file, JSON.stringify(await page.evaluate(() => __explore.mapView?.stats())));
  return page;
}
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7); // e.g. --only=heat
for (const offline of only ? [] : [false, true]) {
  const dir = mkdtempSync(join(tmpdir(), 'sgx-geoshots-'));
  const app = await startGeoDemo({ port: 0, dataDir: dir, log: null, offline });
  const base = `http://127.0.0.1:${app.port}`, sfx = offline ? '-offline' : '';
  await (await shoot(base, '/explore?view=geo-world', `map-world${sfx}.png`)).close();
  await (await shoot(base, '/explore?view=geo-h3', `map-h3${sfx}.png`)).close();
  if (!offline) {
    await (await shoot(base, '/explore?view=geo-japan-mgrs', 'map-mgrs-japan.png')).close();
    await (await shoot(base, '/explore?view=geo-split', 'map-split.png', async p => { await p.evaluate(() => { const id = __explore.mapView.nodes.filter(n => n.id.startsWith('usgs:')).sort((a, b) => __explore.graph.getNodeAttribute(b.id, 'item').properties.mag - __explore.graph.getNodeAttribute(a.id, 'item').properties.mag)[0].id; __explore.select(id); }); })).close();
    // cell click: select the busiest H3 cell's events
    await (await shoot(base, '/explore?view=geo-h3', 'map-h3-cell-selected.png', async p => { await p.evaluate(() => { const v = __explore.mapView; v.selectCell(v.gridResult.cells[0].cell, false); v.setPoints(true); }); })).close();
    const pres = await shoot(base, '/explore?present=1&deck=geo-tour', 'map-presenter-1-world.png');
    for (const [i, f] of [[1, 'map-presenter-2-h3.png'], [2, 'map-presenter-3-japan-mgrs.png'], [3, 'map-presenter-4-split.png']]) {
      await pres.keyboard.press('ArrowRight'); await pres.waitForFunction(n => document.body.dataset.slide === String(n), i, { timeout: 30000 });
      await pres.evaluate(() => new Promise(r => { const m = __explore.mapView.map; m.once('idle', r); m.triggerRepaint(); setTimeout(r, 8000); })); await pres.waitForTimeout(1200);
      await pres.screenshot({ path: join(PROOF, f) }); console.log('wrote', f);
    }
    await pres.close();
  }
  await app.close(); rmSync(dir, { recursive: true, force: true });
}
if (!process.argv.includes('--no-flink')) { // Flink heat: per-H3-cell daily counts from graph.geo-metrics
  const dir = mkdtempSync(join(tmpdir(), 'sgx-geoheat-'));
  try {
    const app = await startGeoDemo({ port: 0, dataDir: dir, log: null, flink: true, config: { processor: { processorId: `geo-shots-${Date.now().toString(36)}`, delivery: 'at-least-once', geo: { enabled: true, resolution: 3, windowMs: 86400e3, windows: 31 } } } });
    const base = `http://127.0.0.1:${app.port}`;
    for (let i = 0; i < 90; i++) { const r = await (await fetch(`${base}/api/explore/geo/grid?kind=h3&res=3&stream=1&limit=1`)).json(); if (r.stream?.available && r.stream.events > 2000) break; await new Promise(r => setTimeout(r, 2000)); }
    await (await shoot(base, '/explore?style=/explore/geo-style.json&mode=map&grid=h3&res=3', 'map-flink-heat.png', async p => {
      await p.waitForTimeout(3000);
      await p.evaluate(async () => { for (const [sel, on] of [['#map-heat', true], ['#map-points', false], ['#map-links', false]]) { const el = document.querySelector(sel); if (el.checked !== on) el.click(); } __explore.mapView.setCamera({ center: [160, 20], zoom: 2.2 }); });
      await p.waitForFunction(() => /Flink:/.test(document.querySelector('#map-heat-status').textContent), null, { timeout: 30000 });
      console.log('heat:', await p.textContent('#map-heat-status'));
    })).close();
    await app.close();
  } catch (e) { console.log('flink heat shot skipped:', e.message); }
  rmSync(dir, { recursive: true, force: true });
}
console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
