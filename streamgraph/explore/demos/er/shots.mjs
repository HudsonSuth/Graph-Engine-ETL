// Headless screenshots of /explore with the synthetic entity-resolution demo (a small slice so it is readable).
//   npm run shots:er        -> proof/er-records.png, proof/er-entities.png, proof/er-why.png
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startErDemo } from './run.js';
import { generate } from './generate.mjs';

const proof = fileURLToPath(new URL('../../../proof/', import.meta.url)); mkdirSync(proof, { recursive: true });
const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : { channel: 'chrome' }), args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const dir = mkdtempSync(join(tmpdir(), 'er-shots-'));
const app = await startErDemo({ port: 0, dataDir: dir, log: console.log, fixture: generate({ people: 70, orgs: 8, seed: 7 }) });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
const settle = async () => { await page.waitForFunction(() => __explore.S.metrics.layoutRuns >= 1 && !/%/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 180000, polling: 500 }); await page.waitForTimeout(1500); };
await page.goto(app.urls.explore + '&er=records');
await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 }); await settle();
await page.screenshot({ path: join(proof, 'er-records.png') });

await page.evaluate(() => __explore.setErView('entities')); await page.waitForTimeout(400);
await page.evaluate(() => __explore.runLayout?.()); await settle();
await page.evaluate(() => __explore.renderer.getCamera().setState({ x: 0.5, y: 0.5, ratio: 0.62 })); await page.waitForTimeout(600);
await page.screenshot({ path: join(proof, 'er-entities.png') });

// why-panel: a smaller slice (14 people) in the combined records + entities view, so each entity sits among its records
await page.close(); await app.close();
const app2 = await startErDemo({ port: 0, dataDir: dir, log: null, fixture: generate({ people: 14, orgs: 2, seed: 7 }) });
const page2 = await browser.newPage({ viewport: { width: 1500, height: 900 } }); page2.on('pageerror', e => errors.push(e.message));
await page2.goto(app2.urls.explore); await page2.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
await page2.waitForFunction(() => __explore.S.metrics.layoutRuns >= 1, null, { timeout: 60000 }); await page2.waitForTimeout(2500);
const pick = await page2.evaluate(() => { const g = __explore.graph; let best = null; g.forEachNode((id, a) => { const it = a.item; if (it?.type !== 'Entity') return; const ps = g.edges(id).filter(e => g.getEdgeAttribute(e, 'item')?.type === 'POSSIBLY_SAME').length; const s = (it.properties.recordCount || 1) + (ps ? 10 : 0); if (!best || s > best.s) best = { id, s }; }); return best?.id; });
await page2.evaluate(id => __explore.select(id), pick);
await page2.waitForSelector('#er-panel', { timeout: 15000 });
// open the record-level explanation for one member record, the whole slice stays in view
const rec = await page2.evaluate(id => [...__explore.graph.inNeighbors(id)].find(n => __explore.graph.getNodeAttribute(n, 'item')?.type === 'Person'), pick);
if (rec) { await page2.evaluate(r => __explore.select(r), rec); await page2.waitForFunction(() => /Why this record/.test(document.querySelector('#er-panel')?.textContent || ''), null, { timeout: 15000 }).catch(() => {}); }
await page2.waitForTimeout(600);
await page2.waitForTimeout(800);
await page2.screenshot({ path: join(proof, 'er-why.png') });
console.log(`entity ${pick}, record ${rec}; page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
await page2.close(); await app2.close(); rmSync(dir, { recursive: true, force: true }); await browser.close();
process.exit(errors.length ? 1 : 0);
