// Serve demo/vercel-full/public and click every studio and explore screen.
// Fails on console errors or failed responses. Screenshots go to /opt/cursor/artifacts/streamgraph-demo.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(HERE, 'public');
const ROOT = join(HERE, '../..');
const SHOTS = process.env.SG_DEMO_SHOTS || '/opt/cursor/artifacts/streamgraph-demo';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.geojson': 'application/geo+json', '.png': 'image/png', '.txt': 'text/plain', '.map': 'application/json', '.ico': 'image/x-icon' };
const ALIASES = {
  '/': 'index.html',
  '/advanced': 'advanced.html',
  '/explore': 'explore/index.html',
  '/explore/': 'explore/index.html',
  '/explore/studio': 'explore/studio.html',
  '/explore/bench': 'explore/bench.html',
  '/explore/bench/': 'explore/bench.html',
};

function serve() {
  return new Promise(resolve => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://127.0.0.1');
        let rel = ALIASES[url.pathname] || decodeURIComponent(url.pathname).replace(/^\/+/, '');
        const file = normalize(join(PUBLIC, rel));
        if (!file.startsWith(PUBLIC) || !existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer' });
        res.end(await readFile(file));
      } catch (e) { res.writeHead(500); res.end(e.message); }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const INVENTORY = [
  ['home', 'Studio home with maritime sources'],
  ['wizard-types', 'Add a data source: every source type'],
  ['wizard-csv', 'CSV wizard preview (engine output)'],
  ['wizard-documents', 'Documents wizard: files and tables'],
  ['link', 'Connect your sources'],
  ['clean', 'Clean up'],
  ['explore-ask', 'Explore search and ask'],
  ['search', 'Header search (MiniSearch)'],
  ['explore-graph', 'Graph explorer'],
  ['explore-map', 'Map, time slider, WebGPU control'],
  ['explore-standalone', 'Standalone /explore'],
  ['bench', 'WebGPU vs WebGL benchmark page'],
  ['processing', 'Live processing'],
  ['sinks', 'OpenSearch sink test, save, sync now'],
  ['access', 'Access rules and view-as matrix'],
  ['view-as', 'Explore while previewing as analyst'],
  ['settings', 'Settings and reset dialog'],
  ['advanced', 'Advanced flow editor and schema'],
  ['retail', 'Retail demo shop'],
  ['mcp', 'SDK / MCP panel and tools/list'],
];

const results = [];
function pass(id) { results.push([id, 'pass']); console.log('PASS', id); }
function fail(id, why) { results.push([id, 'fail', why]); console.error('FAIL', id, why); }

const server = await serve();
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
mkdirSync(SHOTS, { recursive: true });
const exe = [process.env.CHROME, '/usr/bin/google-chrome-stable', '/usr/local/bin/google-chrome'].find(p => p && existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const failed = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(String(err)));
page.on('requestfailed', req => { const u = req.url(); if (u.includes('favicon')) return; failed.push('failed ' + u + ' ' + (req.failure()?.errorText || '')); });
page.on('response', res => { if (res.status() >= 400 && !res.url().includes('favicon')) failed.push(res.status() + ' ' + res.url()); });
page.on('dialog', d => d.accept());

async function shot(name) {
  await page.screenshot({ path: join(SHOTS, name + '.png'), fullPage: false });
}
async function go(hash) {
  await page.goto(base + '/' + hash, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#view, #flow, #canvas, h1', { timeout: 20000 });
}

try {
  await go('#home');
  await page.waitForSelector('table', { timeout: 20000 });
  await shot('01-home');
  pass('home');

  await page.click('#sg-tour-next');
  await page.waitForSelector('#sg-tour');

  await go('#add');
  await page.waitForSelector('.type');
  const types = await page.$$eval('.type', els => els.map(e => e.dataset.k));
  if (types.length < 6) throw new Error('source types ' + types.join(','));
  await shot('02-wizard-types');
  pass('wizard-types');

  await page.click('.type[data-k=csv]');
  await page.setInputFiles('#file', join(ROOT, 'demo', 'maritime', 'vessels.csv'));
  await page.waitForSelector('#next:not([disabled])', { timeout: 15000 });
  await page.click('#next');
  await page.waitForSelector('table');
  await shot('03-wizard-csv');
  pass('wizard-csv');

  await page.click('#back');
  await page.click('#back');
  await page.waitForSelector('.type[data-k=documents]');
  await page.click('.type[data-k=documents]');
  await page.setInputFiles('#files', ['invoice.pdf', 'suppliers.docx', 'customers.xlsx', 'products.xls', 'orders.csv'].map(f => join(ROOT, 'test', 'fixtures', 'documents', f)));
  await page.waitForSelector('.msg.ok', { timeout: 15000 });
  await page.click('#next');
  await page.waitForSelector('.suggest');
  await shot('04-wizard-documents');
  pass('wizard-documents');

  await go('#link');
  await page.waitForSelector('h1');
  await page.waitForFunction(() => document.querySelector('#view')?.textContent?.includes('Position') || document.querySelector('#view')?.textContent?.includes('Same things') || document.querySelector('#view')?.textContent?.includes('belongs'));
  await shot('05-link');
  pass('link');

  await go('#clean');
  await page.waitForSelector('#src');
  await shot('06-clean');
  pass('clean');

  await go('#explore');
  await page.waitForSelector('[data-idea]');
  await page.click('[data-idea="0"]');
  await page.waitForSelector('#ans table, #ans .muted', { timeout: 15000 });
  await shot('07-explore-ask');
  pass('explore-ask');

  await page.fill('#gs-q', 'MERCURIUS');
  await page.waitForSelector('.gs-hit, .gs-msg', { timeout: 10000 });
  const searchText = await page.locator('#gs-results').innerText();
  if (!/MiniSearch/i.test(searchText)) throw new Error('search label missing: ' + searchText.slice(0, 200));
  await shot('08-search');
  pass('search');

  await go('#explore-graph');
  const frame = page.frameLocator('#gx');
  await frame.locator('body').waitFor({ state: 'attached' });
  await frame.locator('body[data-ready="1"]').waitFor({ timeout: 90000 });
  await page.waitForTimeout(800);
  await shot('09-explore-graph');
  pass('explore-graph');

  await frame.locator('#renderer-kind').selectOption('webgpu');
  await frame.locator('#renderer-status').waitFor();
  await page.waitForFunction(() => {
    const t = document.querySelector('#gx')?.contentDocument?.querySelector('#renderer-status')?.textContent || '';
    return /WebGL|fallback/i.test(t);
  });
  await frame.locator('#view-mode button[data-m=map]').click();
  await frame.locator('#map:not([hidden])').waitFor({ timeout: 20000 });
  await frame.locator('#menu-view summary').click();
  await frame.locator('#map-basemap').selectOption('offline');
  await frame.locator('#time').evaluate(el => { el.value = '400'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(500);
  await shot('10-explore-map');
  pass('explore-map');

  await page.goto(base + '/explore', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 90000 });
  await shot('11-explore-standalone');
  pass('explore-standalone');

  await page.goto(base + '/explore/bench', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#run');
  await shot('12-bench');
  pass('bench');

  await go('#processing');
  await page.waitForSelector('h1');
  await page.waitForFunction(() => /Stream processing|Entity matching/.test(document.body.innerText));
  await shot('13-processing');
  pass('processing');

  await go('#syncout');
  await page.waitForSelector('.type[data-kind=opensearch]');
  await page.click('.type[data-kind=opensearch]');
  await page.waitForSelector('#stest');
  await page.click('#stest');
  await page.waitForSelector('#smsg .msg');
  await page.click('#ssave');
  await page.waitForSelector('#now');
  await page.click('#now');
  await page.waitForSelector('.dot.green, .dot.amber');
  if (!/Demo mode/.test(await page.locator('#sg-demo-banner').innerText())) throw new Error('demo banner missing after sync');
  await shot('14-sinks');
  pass('sinks');

  await go('#access');
  await page.waitForSelector('#asu');
  await page.selectOption('#asu', 'analyst');
  await page.waitForSelector('table');
  await shot('15-access');
  pass('access');

  await page.click('#prev');
  await page.waitForURL(/#explore/);
  await page.waitForSelector('#asbar');
  await page.fill('#gs-q', 'MERCURIUS');
  await page.waitForSelector('.gs-hit, .gs-msg', { timeout: 10000 });
  const asText = await page.locator('#gs-results').innerText();
  if (/callsign/i.test(asText) && !/\[hidden\]/.test(asText)) throw new Error('analyst search showed a call sign');
  await shot('16-view-as');
  pass('view-as');
  await page.click('#asoff');

  await go('#settings');
  await page.click('#reset');
  await page.waitForSelector('#rc');
  await page.fill('#rc', 'RESET');
  await shot('17-settings');
  await page.click('#rno');
  pass('settings');

  await page.goto(base + '/advanced', { waitUntil: 'commit', timeout: 120000 });
  await page.waitForSelector('#flow .step, #flow g', { timeout: 120000 });
  await page.waitForFunction(() => (document.querySelector('#counts')?.textContent || '').includes('nodes'), null, { timeout: 120000 });
  await shot('18-advanced');
  pass('advanced');

  await go('#home');
  await page.click('#demo');
  await page.waitForFunction(() => /Customer|Demo shop|Loyalty/.test(document.body.innerText), null, { timeout: 20000 });
  await shot('19-retail');
  pass('retail');

  await go('#explore-graph');
  await page.waitForSelector('details summary');
  await page.locator('details summary', { hasText: 'Use this viewer' }).click();
  const mcp = await page.evaluate(async () => {
    const r = await fetch('/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
    return r.json();
  });
  if (!mcp.result?.tools?.some(t => t.name === 'search_nodes')) throw new Error('mcp tools missing ' + JSON.stringify(mcp).slice(0, 200));
  await shot('20-mcp');
  pass('mcp');
} catch (e) {
  await shot('99-failure').catch(() => {});
  console.error(e);
  fail('run', e.message);
}

await browser.close();
await new Promise(r => server.close(r));

const bad = [...errors, ...failed];
if (bad.length) {
  console.error('console or network failures:\n' + bad.slice(0, 40).join('\n'));
  fail('clean-console', bad.length + ' problems');
}
const missing = INVENTORY.filter(([id]) => !results.some(([r, s]) => r === id && s === 'pass')).map(([id]) => id);
if (missing.length) fail('inventory', 'missing ' + missing.join(','));

const summary = { base, shots: SHOTS, screens: INVENTORY.map(([id, label]) => ({ id, label, result: results.find(r => r[0] === id)?.[1] || 'fail' })), problems: bad.slice(0, 40) };
mkdirSync(SHOTS, { recursive: true });
const { writeFileSync } = await import('node:fs');
writeFileSync(join(SHOTS, 'inventory.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (results.some(r => r[1] === 'fail') || bad.length || missing.length) process.exit(1);
