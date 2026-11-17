// WebGPU renderer in Chrome: toolbar choice (Auto / WebGPU / WebGL), status readout, fallback notes, persistence, drawing,
// hover/click picking into the existing selection + details panel, and runtime device loss -> WebGL.
// On a GPU-less box Chrome's SwiftShader WebGPU destroys the device when a canvas is PRESENTED, so the drawing tests use
// the renderer's debug readback output (?gpuReadback=1: render to a texture, copy to a 2D canvas). Same shaders and
// picking; only the last copy differs. Screenshots go to screenshots/21-*.png. Skips without Chrome.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../server/app.js';

const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const built = existsSync(new URL('../public/bench.js', import.meta.url));
const skip = !exe ? 'no Chrome found (set CHROME_PATH)' : !built ? 'UI not built (npm run build:explore)' : false;
const SHOTS = fileURLToPath(new URL('../../screenshots/', import.meta.url));
let app, browser, dir;
before(async () => {
  if (skip) return;
  const { chromium } = await import('playwright-core');
  const { startCombined } = await import('../combined.js');
  dir = mkdtempSync(join(tmpdir(), 'sgx-webgpu-'));
  app = await startCombined({ port: 0, flowPath: fileURLToPath(new URL('../../demo/flow.json', import.meta.url)), demo: true, runAtBoot: true, dataDir: dir, log: null, config: loadConfig(join(dir, 'none.json')) });
  await new Promise(r => setTimeout(r, 3000));
  browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
});
after(async () => { await browser?.close(); await app?.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });
async function open(q = '', { init } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } }), page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  if (init) await page.addInitScript(init);
  await page.goto(`http://127.0.0.1:${app.port}/explore${q}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  await page.waitForFunction(() => __explore.S.metrics.layoutRuns >= 1, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  return { page, ctx, errors };
}
const info = page => page.evaluate(() => ({ ...__explore.rendererInfo, status: document.querySelector('#renderer-status').textContent, warn: document.querySelector('#renderer-status').classList.contains('warn'), body: document.body.dataset.renderer, sel: document.querySelector('#renderer-kind').value }));
const NO_GPU = () => { Object.defineProperty(Navigator.prototype, 'gpu', { get: () => undefined, configurable: true }); };
const NO_ADAPTER = () => { if (navigator.gpu) navigator.gpu.requestAdapter = async () => null; };

test('U1 Auto without WebGPU uses WebGL quietly; the readout shows renderer + fps + frame time', { skip }, async () => {
  const { page, ctx } = await open('', { init: NO_GPU });
  const i = await info(page);
  assert.equal(i.active, 'webgl'); assert.equal(i.pref, 'auto'); assert.equal(i.body, 'webgl'); assert.equal(i.warn, false); assert.equal(i.note, null);
  assert.match(i.status, /^WebGL · \d+ fps · [\d.]+ ms$/);
  await ctx.close();
});

test('U2 an explicit WebGPU choice with no adapter falls back to WebGL with a visible note', { skip }, async () => {
  const { page, ctx } = await open('?renderer=webgpu', { init: NO_ADAPTER });
  const i = await info(page);
  assert.equal(i.active, 'webgl'); assert.equal(i.pref, 'webgpu'); assert.equal(i.warn, true);
  assert.match(i.status, /WebGL \(fallback\)/); assert.match(i.note, /WebGPU unavailable/);
  assert.match(await page.locator('#renderer-status').getAttribute('title'), /WebGPU unavailable/);
  await ctx.close();
});

test('U3 WebGPU draws the same graph; hover + click select through the existing selection and details panel', { skip }, async () => {
  const { page, ctx, errors } = await open('?renderer=webgpu&gpuReadback=1');
  const i = await info(page);
  assert.equal(i.active, 'webgpu', JSON.stringify(i)); assert.match(i.status, /^WebGPU · \d+ fps/);
  const st = await page.evaluate(() => { const r = __explore.renderer, g = __explore.graph; return { kind: r.kind, drawnNodes: r.orderCount, order: g.filterNodes(n => !r.getNodeState(n).isHidden).length, drawnEdges: r.edgeCount }; });
  assert.equal(st.kind, 'webgpu'); assert.equal(st.drawnNodes, st.order, 'every visible node is drawn'); assert.ok(st.drawnEdges > 0);
  // pixels: the node of highest degree has its fill colour at its centre (readback canvas = what the GPU drew)
  const probe = await page.evaluate(async () => {
    const X = __explore, r = X.renderer, g = X.graph; const id = g.nodes().sort((a, b) => g.degree(b) - g.degree(a))[0];
    await r.core.done(); await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); await r.core.done();
    const d = r.getNodeDisplayData(id), v = r.framedGraphToViewport(d), dpr = devicePixelRatio || 1;
    const px = r.canvas.getContext('2d').getImageData(Math.round(v.x * dpr), Math.round(v.y * dpr), 1, 1).data;
    const bg = r.canvas.getContext('2d').getImageData(2, 2, 1, 1).data;
    const rect = document.querySelector('#canvas').getBoundingClientRect();
    return { id, color: g.getNodeAttribute(id, 'color'), px: [...px], bg: [...bg], x: v.x + rect.left, y: v.y + rect.top };
  });
  const hex = probe.color.match(/^#([0-9a-f]{6})$/i);
  if (hex) { const want = [0, 2, 4].map(k => parseInt(hex[1].slice(k, k + 2), 16)); assert.ok(want.every((c, k) => Math.abs(c - probe.px[k]) <= 6), `node centre ${probe.px} vs fill ${want}`); }
  assert.notDeepEqual(probe.px.slice(0, 3), probe.bg.slice(0, 3), 'node pixels differ from the background');
  await page.mouse.move(probe.x, probe.y); await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => __explore.S.hovered), probe.id, 'hover picks the node');
  await page.mouse.click(probe.x, probe.y); await page.waitForTimeout(400);
  const sel = await page.evaluate(() => ({ sel: [...__explore.S.selected], details: document.querySelector('#details h3')?.textContent, hl: [...__explore.S.hlSets.nodes].length }));
  assert.deepEqual(sel.sel, [probe.id]); assert.ok(sel.details, 'details panel filled'); assert.ok(sel.hl > 1, 'neighbourhood highlighted');
  await page.screenshot({ path: join(SHOTS, '21-webgpu-renderer-selection.png') });
  // click on empty canvas clears the selection; wheel zooms
  const before = await page.evaluate(() => __explore.renderer.getCamera().ratio);
  await page.mouse.move(probe.x + 3, probe.y + 3); await page.mouse.wheel(0, -400); await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => __explore.renderer.getCamera().ratio) < before, 'wheel zooms in');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('U4 the toolbar switches renderers live and the choice persists in localStorage', { skip }, async () => {
  const { page, ctx } = await open('?gpuReadback=1');
  await page.evaluate(() => localStorage.removeItem('explore.renderer'));
  await page.selectOption('#renderer-kind', 'webgl'); await page.waitForFunction(() => document.body.dataset.renderer === 'webgl');
  assert.equal(await page.evaluate(() => localStorage.getItem('explore.renderer')), 'webgl');
  assert.equal(await page.evaluate(() => __explore.renderer.kind), undefined, 'sigma renderer');
  await page.selectOption('#renderer-kind', 'webgpu'); await page.waitForFunction(() => document.body.dataset.renderer === 'webgpu', null, { timeout: 15000 });
  const sel = await page.evaluate(() => { const g = __explore.graph; const id = g.nodes()[0]; __explore.select(id); return { id, sel: [...__explore.S.selected], state: __explore.renderer.getNodeState(id).isSelected }; });
  assert.equal(sel.state, true, 'selection state carried into the new renderer');
  await page.reload(); await page.waitForSelector('body[data-ready="1"]');
  assert.equal((await info(page)).pref, 'webgpu', 'choice survives a reload');
  await page.screenshot({ path: join(SHOTS, '22-renderer-toggle-webgpu.png'), clip: { x: 0, y: 0, width: 1500, height: 60 } });
  await page.evaluate(() => localStorage.removeItem('explore.renderer'));
  await ctx.close();
});

test('U5 losing the WebGPU device at runtime falls back to WebGL, keeps the camera and says so', { skip }, async () => {
  const { page, ctx } = await open('?renderer=webgpu&gpuReadback=1');
  assert.equal((await info(page)).active, 'webgpu');
  await page.evaluate(() => __explore.renderer.getCamera().setState({ x: 0.4, y: 0.6, ratio: 0.5 }));
  await page.evaluate(() => __explore.renderer.core.device.destroy());
  await page.waitForFunction(() => document.body.dataset.renderer === 'webgl', null, { timeout: 15000 });
  const i = await info(page);
  assert.equal(i.active, 'webgl'); assert.match(i.note, /WebGPU failed|device lost/i); assert.equal(i.warn, true);
  const cam = await page.evaluate(() => __explore.renderer.getCamera().getState());
  assert.ok(Math.abs(cam.ratio - 0.5) < 1e-6 && Math.abs(cam.x - 0.4) < 1e-6, 'camera kept');
  await ctx.close();
});
