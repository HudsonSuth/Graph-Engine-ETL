// Screenshots of every studio area added by the integration (node test/integration/studio-shots.mjs [baseUrl]).
// Needs a running server: npm run demo:combined (or npm start). Writes screenshots/*.png and fails on any page error.
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const BASE = process.argv[2] || 'http://127.0.0.1:8080', OUT = new URL('../../screenshots/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const only = process.env.SHOTS ? new Set(process.env.SHOTS.split(',')) : null;
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400 && !/favicon|tile|\/api\/explore\/er\/stats/i.test(r.url())) errors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`); });
page.on('console', m => { if (/Failed to load resource/.test(m.text())) return; if (m.type() === 'error' && !/favicon|tiles|openfreemap|net::ERR/i.test(m.text())) errors.push('console: ' + m.text()); });
const shot = async (name, el) => { if (only && !only.has(name)) return; await page.waitForTimeout(400); await (el || page).screenshot({ path: OUT + name + '.png' }); console.log('shot', name); };
const frameReady = async () => { const f = page.frameLocator('#gx'); await page.waitForFunction(() => { const fr = document.querySelector('#gx')?.contentWindow; return fr?.__explore?.graph?.order > 0 && fr.__studioExtras; }, null, { timeout: 60000 }); return f; };
const fx = () => page.frame({ url: /\/explore\/studio/ });

await page.goto(BASE + '/#processing'); await page.waitForSelector('text=Stream processing'); await shot('11-live-processing');
await page.goto(BASE + '/#access'); await page.waitForSelector('text=Test as'); await shot('12-access-rules-edit-action');
await page.goto(BASE + '/#explore'); await page.waitForSelector('.subtabs'); await shot('01-explore-search-and-ask');
await page.goto(BASE + '/#explore-graph'); await frameReady(); await page.waitForTimeout(2500); await shot('02-graph-explorer');
const F = fx();
// table linked to the graph
await F.evaluate(() => window.__studioExtras.openTab('table')); await page.waitForTimeout(500);
await F.click('#x-drawer tbody tr:nth-child(2)'); await shot('03-table-linked-selection');
await F.evaluate(() => window.__studioExtras.openTab('chart')); await page.waitForTimeout(300); await F.click('#x-drawer g[data-k] rect'); await shot('04-chart-linked-selection');
// edit: change a field through the dialog
await F.evaluate(() => { const X = window.__explore; const id = X.graph.filterNodes((n, a) => a.type === 'Customer')[0]; X.select(id); });
await page.waitForTimeout(400); await F.click('#x-editprops'); await page.waitForTimeout(300); await shot('05-edit-fields-dialog');
await F.locator('#x-dialog .fv').first().fill('Edited in the explorer'); await F.click('#x-d-ok'); await page.waitForTimeout(1200);
// comments
await F.locator('#x-c-text').fill('Checked this customer against the CRM export.'); await F.click('#x-c-post'); await page.waitForTimeout(600); await shot('06-comments');
// history compare
await F.evaluate(() => window.__studioExtras.openTab('history')); await page.waitForTimeout(800); await F.click('#x-h-go'); await page.waitForTimeout(800); await shot('07-history-compare');
// query builder
await F.evaluate(() => window.__studioExtras.openTab('query')); await page.waitForTimeout(600);
await F.selectOption('.x-q-type[data-s="a"]', 'Customer'); await page.waitForTimeout(400); await F.click('#x-q-rel'); await page.waitForTimeout(400);
await F.selectOption('.x-q-type[data-s="b"]', 'Order').catch(() => {}); await F.selectOption('#x-q-dir', 'both'); await page.waitForTimeout(400); await F.click('#x-q-run'); await page.waitForTimeout(800); await shot('08-query-builder-cypher');
// notebook
await F.evaluate(() => window.__studioExtras.openTab('notebook')); await page.waitForTimeout(400); await F.locator('#x-nb-title').fill('Duplicate customer review'); await F.click('#x-nb-new'); await page.waitForTimeout(600);
await F.locator('#x-nb-text').fill('Two Ada records share an email; see selection.'); await F.click('#x-nb-snap'); await page.waitForTimeout(800); await shot('09-case-notebook');
// menus
await F.evaluate(() => window.__studioExtras.openTab('notebook')); await F.click('#x-drawer-close');
await F.click('#menu-analyze summary'); await page.waitForTimeout(300); await F.selectOption('#x-nl-provider', 'rules'); await page.waitForTimeout(800); await shot('13-analyze-menu');
await F.click('#menu-analyze summary');
await F.locator('#search').fill('how many customers'); await F.click('#x-ask'); await page.waitForTimeout(800); await shot('14-plain-english-answer');
await F.click('#menu-view summary'); await page.waitForTimeout(300); await shot('15-view-menu'); await F.click('#menu-view summary');
await F.click('#menu-export summary'); await page.waitForTimeout(300); await shot('16-export-menu'); await F.click('#menu-export summary');
await F.evaluate(() => window.__studioExtras.describe()); await page.waitForTimeout(800); await shot('17-describe-summary');
await F.evaluate(() => window.__studioExtras.setContrast(true)); await page.waitForTimeout(800); await shot('18-high-contrast'); await F.evaluate(() => window.__studioExtras.setContrast(false)); await F.evaluate(() => window.__explore.setTheme('light'));
await F.click('#x-3d'); await page.waitForTimeout(4000); await shot('19-3d-mode'); await F.click('#x-3d'); await page.waitForTimeout(500);
// preview as analyst: hidden fields and denied types disappear in the explorer too
await page.goto(BASE + '/#access'); await page.waitForSelector('#prev'); await page.evaluate(() => sessionStorage.setItem('sg-as', 'analyst'));
await page.goto(BASE + '/#explore-graph'); await frameReady(); await page.waitForTimeout(2500); await shot('20-graph-explorer-as-analyst');
await page.evaluate(() => sessionStorage.removeItem('sg-as'));
await browser.close();
if (errors.length) { console.error('PAGE ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('ok, no page errors');
