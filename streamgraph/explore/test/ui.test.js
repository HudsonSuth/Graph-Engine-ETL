// Browser smoke test of the Explore UI against the combined server (SPEC §11 interactions, §7 live deltas).
// Skips when no Chrome/Chromium is installed (set CHROME_PATH to point at one).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../server/app.js';
import { fSmall } from './fixtures.js';

const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const built = existsSync(new URL('../public/explore.js', import.meta.url));
const skip = !exe ? 'no Chrome found (set CHROME_PATH)' : !built ? 'UI not built (npm run build:explore)' : false;
let app, browser, page, dir; const errors = [];

before(async () => {
  if (skip) return;
  const { chromium } = await import('playwright-core');
  const { startCombined } = await import('../combined.js');
  dir = mkdtempSync(join(tmpdir(), 'sgx-ui-'));
  app = await startCombined({ port: 0, dataDir: dir, log: null, config: loadConfig(join(dir, 'none.json')) });
  const p = app.ex.producer('external'), { nodes, links } = fSmall();
  for (const n of nodes) p.push('node.upsert', { ...n, sources: undefined, label: n.properties.name });
  for (const l of links) p.push('link.upsert', { ...l, sources: undefined });
  await p.flush();
  browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${app.port}/explore`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
});
after(async () => { await browser?.close(); await app?.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });
const ev = (fn, arg) => page.evaluate(fn, arg);

test('U1 the view loads the snapshot into the WebGL graph with a legend per type', { skip }, async () => {
  assert.deepEqual(await ev(() => [__explore.graph.order, __explore.graph.size]), [20, 25]);
  const legend = await ev(() => [...document.querySelectorAll('#legend .legend-item')].map(e => e.dataset.type).sort());
  assert.deepEqual(legend, ['Account', 'Company', 'Device', 'Person']);
  assert.ok(await ev(() => !!document.querySelector('#canvas canvas')));
});
test('U2 select highlights the node and its neighbours only', { skip }, async () => {
  const st = await ev(() => { __explore.select('s1'); const r = __explore.renderer; return __explore.graph.nodes().filter(n => r.getNodeState(n).isHighlighted).sort(); });
  assert.deepEqual(st, ['s0', 's1', 's2']);
  assert.match(await ev(() => document.querySelector('#details').textContent), /Node 1/);
  await ev(() => __explore.clearSelection());
});
test('U3 search in view and filter by type (view only, undoable)', { skip }, async () => {
  assert.deepEqual(await ev(() => __explore.searchView('node 1').sort().slice(0, 3)), ['s1', 's10', 's11']);
  const hidden = await ev(() => { __explore.toggleType('Person'); const r = __explore.renderer; return __explore.graph.nodes().filter(n => r.getNodeState(n).isHidden).length; });
  assert.equal(hidden, 5);
  assert.equal(await ev(() => __explore.graph.order), 20, 'filtering never deletes data');
  await ev(() => __explore.toggleType('Person'));
  assert.equal(await ev(() => { const r = __explore.renderer; return __explore.graph.nodes().filter(n => r.getNodeState(n).isHidden).length; }), 0);
});
test('U4 theme toggle switches palette and background but keeps the same type order', { skip }, async () => {
  const dark = await ev(() => [getComputedStyle(document.documentElement).getPropertyValue('--background').trim(), __explore.graph.getNodeAttribute('s0', 'color')]);
  await ev(() => __explore.setTheme('light'));
  const light = await ev(() => [getComputedStyle(document.documentElement).getPropertyValue('--background').trim(), __explore.graph.getNodeAttribute('s0', 'color'), document.documentElement.dataset.theme]);
  assert.notEqual(dark[0], light[0]); assert.notEqual(dark[1], light[1]); assert.equal(light[2], 'light');
  await ev(() => __explore.setTheme('dark'));
});
test('U5 live deltas: an upsert appears and a remove disappears without a full rebuild', { skip }, async () => {
  const rebuilds = await ev(() => __explore.store.metrics.fullRebuilds);
  const p = app.ex.producer('external');
  p.push('node.upsert', { id: 'live1', type: 'Person', label: 'Live One', properties: {} });
  p.push('link.upsert', { id: 'livel', type: 'KNOWS', fromId: 'live1', toId: 's0', properties: {} });
  await p.flush();
  await page.waitForFunction(() => __explore.graph.hasNode('live1') && __explore.graph.size === 26, null, { timeout: 10000 });
  p.push('node.remove', { id: 'live1' }); await p.flush();
  await page.waitForFunction(() => !__explore.graph.hasNode('live1') && __explore.graph.size === 25, null, { timeout: 10000 });
  assert.equal(await ev(() => __explore.store.metrics.fullRebuilds), rebuilds);
});
test('U6 path tool and layouts run in the worker; no page errors', { skip }, async () => {
  for (const kind of ['hierarchy', 'radial', 'circular', 'grid', 'force']) {
    const before = await ev(() => __explore.S.metrics.layoutRuns);
    await ev(k => { __explore.S.layout.kind = k; __explore.runLayout({ full: true }); }, kind);
    await page.waitForFunction(b => __explore.S.metrics.layoutRuns > b, before, { timeout: 20000 });
  }
  assert.deepEqual(errors, []);
});
test('U7 time slider hides items outside the window and shows them again when widened (SPEC 37)', { skip }, async () => {
  const p = app.ex.producer('external');
  p.push('node.upsert', { id: 'old1', type: 'Person', label: 'Old', properties: {} }, { eventTime: '2020-01-01T00:00:00Z' });
  p.push('node.upsert', { id: 'new1', type: 'Person', label: 'New', properties: {} });
  await p.flush();
  await page.waitForFunction(() => __explore.graph.hasNode('old1') && __explore.graph.hasNode('new1'), null, { timeout: 10000 });
  const hiddenAt = v => ev(x => { const el = document.querySelector('#time'); el.value = String(x); el.dispatchEvent(new Event('input')); const r = __explore.renderer; return ['old1', 'new1'].filter(n => r.getNodeState(n).isHidden); }, v);
  assert.deepEqual(await hiddenAt(500), ['new1'], 'a window ending mid-way hides the newest item');
  assert.deepEqual(await hiddenAt(1000), [], 'widening to live shows it again');
});
