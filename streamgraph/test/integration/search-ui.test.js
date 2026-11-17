// Search UI: explorer toolbar search (🔎, Ctrl+K) and the studio header search box -> results grouped by type with highlights
// -> clicking a result focuses that node in the graph explorer (and the map when it has coordinates). Also: analyst preview
// never sees a hidden field's match, and an unreachable index shows the "search index offline" flag with filtered results.
// Uses OpenSearch at $OPENSEARCH_URL / 127.0.0.1:9200 when it is running; otherwise the same UI runs on the built-in search.
// Skips when no Chrome/Chromium/Edge is installed (set CHROME_PATH). Screenshots go to test-output/screenshots/ (gitignored).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { testOutput } from '../test-output.js';

const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const built = existsSync(new URL('../../explore/public/explore.js', import.meta.url));
const skip = !exe ? 'no Chrome found (set CHROME_PATH)' : !built ? 'UI not built (npm run build:explore)' : false;
const SHOTS = testOutput('screenshots');
const OS = process.env.OPENSEARCH_URL || 'http://127.0.0.1:9200';
let app, browser, dir, base, osUp = false; const errors = [], idx = `sguitest-${process.pid}-`;

before(async () => {
  if (skip) return;
  const { chromium } = await import('playwright-core');
  const { startCombined } = await import('../../explore/combined.js');
  const { loadConfig } = await import('../../explore/server/app.js');
  dir = mkdtempSync(join(tmpdir(), 'sg-searchui-'));
  app = await startCombined({ port: 0, dataDir: dir, log: null, config: loadConfig(join(dir, 'none.json')) });
  base = `http://127.0.0.1:${app.port}`;
  const g = app.sg.app.graph, studio = app.sg.studio;
  const V = [['220199000', 'ANNA MAERSK', 'OXBA2', 36.8317, -75.5701], ['220598000', 'GERDA MAERSK', 'OUJS2', 36.8764, -76.3496], ['564837000', 'MAERSK VALLVIK', '9V8839', 39.2560, -76.5504], ['338145944', 'CAPE HENRY PILOT', 'WDE1234', 36.93, -76.01]];
  for (const [mmsi, name, callsign, lat, lon] of V) g.upsertNode(`Vessel:${mmsi}`, 'Vessel', mmsi, { mmsi, name, callsign, lat, lon, ts: '2018-01-01T12:00:00Z' });
  g.upsertNode('Vessel:WL-0160', 'Vessel', 'WL-0160', { mmsi: 'WL-0160', name: 'ANAN MAERSK', vessel_type_name: 'Cargo' });
  g.upsertNode('Port:1', 'Port', '1', { port_id: '1', name: 'Norfolk', lat: 36.8508, lon: -76.2859 });
  for (let i = 0; i < 6; i++) { g.upsertNode(`Position:p${i}`, 'Position', `p${i}`, { ping_id: `p${i}`, name: `p${i} 0${i}:00Z`, lat: 36.85 + i * 0.01, lon: -76.29, ts: `2018-01-01T0${i}:00:00Z` }); g.upsertEdge('REPORTED_BY', `Position:p${i}`, 'Vessel:220598000', {}); g.upsertEdge('NEAR_PORT', `Position:p${i}`, 'Port:1', {}); }
  await fetch(`${base}/api/studio/home`);
  for (const t of g.schema().nodeTypes) for (const f of t.props) studio.policy.setField(t.label, f, f === 'callsign' ? 'high' : 'low');
  osUp = await fetch(`${OS}/_cluster/health`, { signal: AbortSignal.timeout(2000) }).then(r => r.ok).catch(() => false);
  if (osUp) {
    const r = await fetch(`${base}/api/studio/sinks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'opensearch', name: 'Search index', settings: { url: OS, index: idx }, asUser: 'owner' }) });
    assert.equal(r.status, 200);
    for (let i = 0; i < 30; i++) { await fetch(`${base}/api/studio/sinks/sync-now`, { method: 'POST', body: '{}' }); const s = await (await fetch(`${base}/api/studio/search/status`)).json(); if (s.index === 'healthy' && s.docs >= g.counts().nodes) break; await new Promise(r => setTimeout(r, 500)); }
  }
  browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
});
after(async () => { await browser?.close(); await app?.close(); if (osUp) await fetch(`${OS}/${idx}*`, { method: 'DELETE' }).catch(() => {}); if (dir) rmSync(dir, { recursive: true, force: true }); });

async function page(path, as) {
  const p = await browser.newPage({ viewport: { width: 1400, height: 860 }, timezoneId: 'UTC' });
  p.on('pageerror', e => errors.push(`${path}: ${e.message}`));
  if (as) await p.addInitScript(a => sessionStorage.setItem('sg-as', a), as);
  await p.goto(base + path); return p;
}

test('S1 explorer toolbar: typo search finds ANNA MAERSK, results grouped with highlights, click focuses node and map', { skip }, async () => {
  const p = await page('/explore');
  await p.waitForSelector('body[data-views-ready="1"]', { timeout: 60000 }); await p.waitForSelector('body[data-index-search="1"]');
  if (osUp) await p.waitForFunction(() => document.querySelector('#ix-dot')?.classList.contains('healthy'), null, { timeout: 20000 });
  await p.keyboard.press('Control+k'); await p.fill('#ix-q', 'ANAN MAERSK'); await p.press('#ix-q', 'Enter');
  await p.waitForSelector('.ix-hit');
  const groups = await p.$$eval('.ix-gh', e => e.map(x => x.textContent.trim()));
  assert.ok(groups.some(g => g.startsWith('Vessel')), groups.join());
  const hits = await p.$$eval('.ix-hit', e => e.map(x => ({ id: x.dataset.id, text: x.textContent, mark: x.innerHTML.includes('<mark>') })));
  const anna = hits.find(h => h.id === 'sg:node:Vessel:220199000'); assert.ok(anna, 'ANNA MAERSK is found from the typo "ANAN MAERSK"'); assert.ok(anna.mark, 'match highlighted');
  assert.match(await p.textContent('.ix-foot'), osUp ? /OpenSearch/ : /built-in/);
  await p.screenshot({ path: join(SHOTS, 'search-explorer-results.png') });
  await p.click('.ix-hit[data-id="sg:node:Vessel:220199000"]');
  await p.waitForFunction(() => document.body.dataset.focused === 'sg:node:Vessel:220199000');
  assert.deepEqual(await p.evaluate(() => [...__explore.S.selected]), ['sg:node:Vessel:220199000']);
  await p.waitForFunction(() => document.body.dataset.focusedGeo, null, { timeout: 15000 });
  assert.equal(await p.evaluate(() => document.body.dataset.mode), 'split', 'map opened beside the graph');
  const c = await p.evaluate(() => __explore.mapView.map.getCenter()); await p.waitForTimeout(700);
  const c2 = await p.evaluate(() => __explore.mapView.map.getCenter());
  assert.ok(Math.abs(c2.lat - 36.8317) < 0.05 && Math.abs(c2.lng + 75.5701) < 0.05, `map centred on the vessel (${c.lat},${c.lng} -> ${c2.lat},${c2.lng})`);
  await p.screenshot({ path: join(SHOTS, 'search-explorer-focused-map.png') });
  await p.close();
});

test('S2 studio header search: grouped results, filters, click opens the graph explorer focused on that node', { skip }, async () => {
  const p = await page('/#home');
  await p.waitForSelector('#gs-q');
  await p.fill('#gs-q', 'maersk'); await p.press('#gs-q', 'Enter');
  await p.waitForSelector('.gs-hit');
  assert.ok((await p.$$eval('.gs-gh', e => e.map(x => x.textContent))).some(t => t.startsWith('Vessel')));
  await p.click('#gs-fbtn'); await p.waitForSelector('#gs-filters:not([hidden])');
  await p.waitForFunction(() => document.querySelectorAll('#gs-type option').length > 1);
  assert.match(await p.textContent('#gs-status'), osUp ? /Index healthy/ : /Built-in search/);
  await p.screenshot({ path: join(SHOTS, 'search-studio-header.png') });
  // time filter: positions between 02:00 and 03:30 only
  await p.fill('#gs-q', ''); await p.selectOption('#gs-type', 'Position'); await p.fill('#gs-from', '2018-01-01T02:00'); await p.fill('#gs-to', '2018-01-01T03:30'); await p.dispatchEvent('#gs-to', 'change');
  await p.waitForFunction(() => [...document.querySelectorAll('.gs-hit')].length === 2, null, { timeout: 10000 }).catch(() => {});
  const times = await p.$$eval('.gs-hit', e => e.map(x => x.dataset.id).sort()); // page clock is UTC: 02:00-03:30 holds p2 and p3
  assert.deepEqual(times, ['sg:node:Position:p2', 'sg:node:Position:p3']);
  await p.selectOption('#gs-type', ''); await p.fill('#gs-from', ''); await p.fill('#gs-to', ''); await p.click('#gs-fbtn');
  await p.fill('#gs-q', 'gerda'); await p.press('#gs-q', 'Enter');
  await p.waitForSelector('.gs-hit[data-id="sg:node:Vessel:220598000"]');
  await p.click('.gs-hit[data-id="sg:node:Vessel:220598000"]');
  await p.waitForFunction(() => location.hash === '#explore-graph');
  const f = await p.waitForSelector('#gx'); const fr = await f.contentFrame();
  await fr.waitForFunction(() => document.body.dataset.focused === 'sg:node:Vessel:220598000', null, { timeout: 60000 });
  assert.deepEqual(await fr.evaluate(() => [...__explore.S.selected]), ['sg:node:Vessel:220598000']);
  await fr.waitForFunction(() => document.body.dataset.focusedGeo, null, { timeout: 15000 }); await p.waitForTimeout(800);
  await p.screenshot({ path: join(SHOTS, 'search-studio-focus-in-explorer.png') });
  // already on the explorer: a second pick is sent to the open explorer (no reload)
  await p.fill('#gs-q', 'vallvik'); await p.press('#gs-q', 'Enter'); await p.waitForSelector('.gs-hit[data-id="sg:node:Vessel:564837000"]');
  await p.click('.gs-hit[data-id="sg:node:Vessel:564837000"]');
  await fr.waitForFunction(() => document.body.dataset.focused === 'sg:node:Vessel:564837000', null, { timeout: 20000 });
  await p.close();
});

test('S3 analyst preview: a hidden field (callsign) never matches or shows; owner does find it', { skip }, async () => {
  const own = await (await fetch(`${base}/api/studio/search?q=OXBA2`)).json();
  assert.deepEqual(own.results.map(r => r.id), ['Vessel:220199000']);
  const p = await page('/#home', 'analyst');
  await p.waitForSelector('#gs-q'); await p.fill('#gs-q', 'OXBA2'); await p.press('#gs-q', 'Enter');
  await p.waitForSelector('.gs-foot'); assert.equal(await p.$$eval('.gs-hit', e => e.length), 0);
  assert.match(await p.textContent('.gs-foot'), /0 results.*as analyst/);
  await p.fill('#gs-q', 'anna maersk'); await p.press('#gs-q', 'Enter'); await p.waitForSelector('.gs-hit');
  assert.ok(!(await p.innerHTML('#gs-results')).includes('OXBA2'));
  await p.close();
});

test('S4 index offline: the box shows the offline flag and still returns filtered built-in results', { skip }, async () => {
  const sinks = (await (await fetch(`${base}/api/studio/sinks`)).json()).sinks;
  const os = sinks.find(s => s.kind === 'opensearch');
  const body = { kind: 'opensearch', name: 'Search index', settings: { url: 'http://127.0.0.1:9', index: idx }, asUser: 'owner', ...(os ? { id: os.id } : {}) };
  await fetch(`${base}/api/studio/sinks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const p = await page('/explore/studio', 'analyst');
  await p.waitForSelector('body[data-views-ready="1"]', { timeout: 60000 });
  await p.click('#ix-open'); await p.fill('#ix-q', 'OXBA2'); await p.press('#ix-q', 'Enter');
  await p.waitForSelector('#ix-offline'); assert.equal(await p.$$eval('.ix-hit', e => e.length), 0, 'hidden field not matched by the fallback either');
  await p.fill('#ix-q', 'maersk'); await p.press('#ix-q', 'Enter'); await p.waitForSelector('.ix-hit');
  assert.ok(await p.isVisible('#ix-offline')); assert.match(await p.textContent('.ix-foot'), /built-in/);
  assert.ok(await p.evaluate(() => document.querySelector('#ix-dot').classList.contains('offline')));
  await p.screenshot({ path: join(SHOTS, 'search-index-offline.png') });
  await p.close();
  if (os) await fetch(`${base}/api/studio/sinks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, settings: { url: OS, index: idx } }) });
});

test('S5 no page errors on the search pages', { skip }, () => { assert.deepEqual(errors, []); });
