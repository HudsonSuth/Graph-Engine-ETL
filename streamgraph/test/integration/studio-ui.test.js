// Browser test of the studio's Explore tab ("Graph explorer") and Live processing page: every area loads and works with
// plain buttons, selection is linked between graph and table, and a "Test as" preview hides what the analyst may not see.
// Needs Chrome/Chromium (CHROME_PATH or the usual install paths); skipped otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.STREAMGRAPH_PROCESSING = 'off';
const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const skip = exe ? false : 'no Chrome/Chromium found (set CHROME_PATH)';
const { startCombined } = await import('../../explore/combined.js');
const { loadConfig } = await import('../../explore/server/app.js');
let app, dir, base, browser, page; const errors = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
test.before(async () => {
  if (skip) return;
  dir = mkdtempSync(join(tmpdir(), 'sg-ui-'));
  app = await startCombined({ port: 0, dataDir: dir, log: null, config: loadConfig(join(dir, 'none.json')) });
  base = `http://127.0.0.1:${app.port}`; const g = app.sg.app.graph;
  g.upsertNode('Customer:c1', 'Customer', 'c1', { name: 'Ada Lovelace', email: 'ada@example.com', city: 'Boston' });
  g.upsertNode('Customer:c2', 'Customer', 'c2', { name: 'Bob Stone', email: 'bob@example.com', city: 'Austin' });
  g.upsertNode('Product:p1', 'Product', 'p1', { name: 'Trail Shoe', price: 90 });
  g.upsertEdge('BOUGHT', 'Customer:c1', 'Product:p1', {}); g.upsertEdge('BOUGHT', 'Customer:c2', 'Product:p1', {});
  await fetch(base + '/api/studio/home');
  for (const [e, f, s] of [['Customer', 'name', 'low'], ['Customer', 'city', 'low'], ['Customer', 'email', 'high'], ['Product', 'name', 'low'], ['Product', 'price', 'low']]) await fetch(base + '/api/studio/access/field', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entity: e, field: f, sensitivity: s }) });
  const { chromium } = await import('playwright-core');
  browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`); });
});
test.after(async () => { await browser?.close(); await app?.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });
const frame = async () => { await page.waitForFunction(() => { const w = document.querySelector('#gx')?.contentWindow; return w?.__explore?.graph?.order >= 3 && w.__studioExtras; }, null, { timeout: 60000 }); return page.frame({ url: /\/explore\/studio/ }); };

test('U-S1 Explore has a "Graph explorer" tab with the grouped toolbar, menus and bottom panel', { skip, timeout: 120000 }, async () => {
  await page.goto(base + '/#explore-graph'); const F = await frame();
  for (const sel of ['#left [data-tool=lasso]', '#expand', '#path', '#layout-kind', '#menu-analyze', '#menu-view', '#menu-export', '#x-add', '#x-3d', '#x-drawer']) assert.ok(await F.$(sel), `${sel} present`);
  assert.equal(await page.locator('.subtabs a.on').textContent(), 'Graph explorer');
});
test('U-S2 table and graph selection are linked both ways; chart bars select', { skip, timeout: 60000 }, async () => {
  const F = await frame(); await F.click('#x-drawer button[data-d=table]');
  await F.click('#x-drawer tbody tr:has-text("Ada Lovelace")');
  assert.deepEqual(await F.evaluate(() => [...window.__explore.S.selected]), ['sg:node:Customer:c1']);
  await F.evaluate(() => window.__explore.select('sg:node:Product:p1')); await wait(600);
  assert.equal(await F.locator('#x-drawer tr.sel').count(), 1); assert.match(await F.locator('#x-drawer tr.sel').textContent(), /Trail Shoe/);
  await F.click('#x-drawer button[data-d=chart]'); await F.click('#x-drawer g[data-k="Customer"] rect');
  assert.equal(await F.evaluate(() => window.__explore.S.selected.size), 2);
});
test('U-S3 edit fields from the canvas writes to the store; query builder shows and runs Cypher', { skip, timeout: 60000 }, async () => {
  const F = await frame(); await F.evaluate(() => window.__explore.select('sg:node:Customer:c2')); await wait(300);
  await F.click('#x-editprops'); const city = F.locator('#x-dialog .frow:has(input[value=city]) .fv'); await city.fill('Denver'); await F.click('#x-d-ok'); await wait(800);
  assert.equal(app.sg.app.graph.getNode('Customer:c2').props.city, 'Denver');
  await F.click('#x-drawer button[data-d=query]'); await wait(300); await F.selectOption('.x-q-type[data-s=a]', 'Customer'); await wait(300);
  await F.click('.x-q-add[data-s=a]'); await wait(300); await F.selectOption('.x-q-f[data-s=a]', 'city'); await F.fill('.x-q-v[data-s=a]', 'Denver'); await wait(300);
  assert.match(await F.inputValue('#x-q-cy'), /MATCH \(a:Customer\) WHERE a\.city = 'Denver'/);
  await F.click('#x-q-run'); await wait(500); assert.match(await F.textContent('#x-q-msg'), /^1 result/);
});
test('U-S4 Live processing page shows status and start buttons; Access rules has an "edit" action', { skip, timeout: 60000 }, async () => {
  await page.goto(base + '/#processing'); await page.waitForSelector('text=Stream processing (Apache Flink)');
  assert.ok(await page.$('text=Entity matching')); assert.ok(await page.$('text=Possible matches to review'));
  await page.goto(base + '/#access'); await page.waitForSelector('#testas'); assert.ok(await page.$('label.inl:has-text("edit") input[data-ra=write]'));
});
test('U-S5 "Test as" analyst in the graph explorer: hidden field not shown, editing turned off', { skip, timeout: 120000 }, async () => {
  await page.goto(base + '/#access'); await page.evaluate(() => sessionStorage.setItem('sg-as', 'analyst'));
  await page.goto(base + '/#explore-graph'); const F = await frame(); await wait(500);
  const html = await F.evaluate(() => JSON.stringify([...window.__explore.store.items.values()]));
  assert.ok(!html.includes('ada@example.com') && !html.includes('bob@example.com'), 'hidden email never reaches the analyst browser');
  assert.equal(await F.$eval('#x-editprops', b => b.disabled), true);
  await page.evaluate(() => sessionStorage.removeItem('sg-as'));
  assert.deepEqual(errors, [], 'no page errors');
});
