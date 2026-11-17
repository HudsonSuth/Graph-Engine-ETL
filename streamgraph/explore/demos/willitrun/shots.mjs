// Headless screenshots of /explore with the Will It Run? dataset.
//   node explore/demos/willitrun/shots.mjs
// Writes proof/willitrun-overview.png and proof/willitrun-rtx-5060.png
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startWillitrunDemo } from './run.js';
import { SOURCE_ID as SID } from './map.js';

const proof = fileURLToPath(new URL('../../../proof/', import.meta.url));
mkdirSync(proof, { recursive: true });
const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : { channel: 'chrome' }), args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

const dir = mkdtempSync(join(tmpdir(), 'wir-shots-'));
const app = await startWillitrunDemo({ port: 0, dataDir: dir, log: console.log });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(app.urls.explore);
await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
const waitLayout = () => page.waitForFunction(() => __explore.S.metrics.layoutRuns >= 1 && !/%/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 180000, polling: 500 });
await waitLayout();
await page.waitForTimeout(1500);
await page.screenshot({ path: join(proof, 'willitrun-overview.png') });

const hwId = `${SID}:node:hw:rtx-5060`;
const found = await page.evaluate(id => {
  if (typeof __explore.toggleType === 'function') {
    // Quantization hubs add visual noise to a GPU neighbourhood view
    try { __explore.toggleType('Quantization'); } catch {}
  }
  if (!__explore.graph.hasNode(id)) return { ok: false, ids: __explore.graph.filterNodes((n, a) => /5060/.test(n) || /5060/.test(a.label || '')).slice(0, 8) };
  __explore.select(id);
  const d = __explore.renderer.getNodeDisplayData(id);
  // Frame the selected GPU plus its neighbours (display-space, not raw graph x/y).
  const ids = [id];
  __explore.graph.forEachNeighbor(id, n => ids.push(n));
  const pts = ids.map(n => __explore.renderer.getNodeDisplayData(n)).filter(Boolean);
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 0.08;
  const w = Math.max(maxX - minX, 0.05) + pad, h = Math.max(maxY - minY, 0.05) + pad;
  __explore.renderer.getCamera().setState({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, ratio: Math.max(w, h, 0.2) });
  return { ok: true, label: __explore.graph.getNodeAttribute(id, 'label'), degree: __explore.graph.degree(id), display: d, framed: pts.length };
}, hwId);
if (!found.ok) {
  console.error('RTX 5060 node not found', found);
  process.exitCode = 1;
} else {
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(proof, 'willitrun-rtx-5060.png') });
  console.log(`selected ${found.label} degree=${found.degree}; screenshots in proof/willitrun-*.png; page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
}

await page.close();
await app.close();
rmSync(dir, { recursive: true, force: true });
await browser.close();
process.exit(process.exitCode || 0);
