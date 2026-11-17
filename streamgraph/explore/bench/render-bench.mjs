// Headless browser benchmark + screenshots (SPEC §8.3, tests 24/19 style). Uses Chrome via playwright-core.
// Chrome path: CHROME_PATH env, else the system Chrome channel. In a VM without a GPU, WebGL runs on SwiftShader
// (CPU) — the fps numbers are then a floor, not the GPU figure the SPEC budgets assume.
// Usage: node explore/bench/render-bench.mjs [nodes=10000]      -> proof/render-bench.txt, proof/explore.png, proof/explore-10k.png
import { chromium } from 'playwright-core';
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startCombined } from '../combined.js';
import { loadConfig } from '../server/app.js';

const N = Number(process.argv[2] || 10000);
const proof = fileURLToPath(new URL('../../proof/', import.meta.url)); mkdirSync(proof, { recursive: true });
const lines = []; const out = s => { lines.push(s); console.log(s); };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : { channel: 'chrome' }), args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const cfg = loadConfig(join(tmpdir(), 'none.json'));

async function open(port, w = 1500, h = 900) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/explore`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  return { page, errors, readyMs: Date.now() - t0 };
}
const waitLayout = page => page.waitForFunction(() => __explore.S.metrics.layoutRuns >= 1 && !/%/.test(document.querySelector('#status').textContent), null, { timeout: 180000, polling: 500 });

// ---- 1. demo screenshot (StreamGraph demo flow, live) with a hovered/selected node
{
  const dir = mkdtempSync(join(tmpdir(), 'sgx-demo-'));
  const app = await startCombined({ port: 0, flowPath: fileURLToPath(new URL('../../demo/flow.json', import.meta.url)), demo: true, runAtBoot: true, dataDir: dir, log: null, config: cfg });
  await new Promise(r => setTimeout(r, 6000)); // let the demo simulator produce some orders
  const { page, errors } = await open(app.port);
  await waitLayout(page); await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = __explore.graph; const c = g.filterNodes((n, a) => a.type === 'Customer').sort((a, b) => g.degree(b) - g.degree(a))[0]; if (c) __explore.select(c); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(proof, 'explore.png') });
  await page.evaluate(() => __explore.setTheme('light')); await page.waitForTimeout(500);
  await page.screenshot({ path: join(proof, 'explore-light.png') });
  out(`# demo screenshots: proof/explore.png (dark, selection + neighbour highlight), proof/explore-light.png; page errors: ${errors.length}`);
  await page.close(); await app.close(); rmSync(dir, { recursive: true, force: true });
}

// ---- 2. 10k nodes / 20k links render benchmark
{
  const dir = mkdtempSync(join(tmpdir(), 'sgx-10k-'));
  const app = await startCombined({ port: 0, dataDir: dir, log: null, config: cfg, synthetic: N });
  const { page, errors, readyMs } = await open(app.port);
  const info = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const ext = gl?.getExtension('WEBGL_debug_renderer_info'); return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown', n: __explore.graph.order, m: __explore.graph.size }; });
  out(`\n# Render benchmark ${new Date().toString()}\n# browser ${browser.version()}  WebGL renderer: ${info.renderer}\n# graph in view: ${info.n} nodes / ${info.m} links`);
  await page.waitForFunction(() => __explore.S.metrics.firstFrameAt, null, { timeout: 120000 });
  const m = await page.evaluate(() => ({ ...__explore.S.metrics.phases, fetch: __explore.S.metrics.fetchMs, ready: __explore.S.metrics.readyAt, first: __explore.S.metrics.firstFrameAt }));
  out(`time to first useful render (page clock from navigation start): ${Math.round(m.first)} ms  [snapshot request+parse ${Math.round(m.fetch)} ms (9.9 MB JSON), store ${Math.round(m.store)} ms, renderer ${Math.round(m.renderer - m.store)} ms, styling ${Math.round(m.style - m.renderer)} ms, visibility ${Math.round(m.visibility - m.style)} ms, app ready at ${Math.round(m.ready)} ms, first frame drawn at ${Math.round(m.first)} ms]`);
  out(`(harness wall clock to the ready flag, inflated by Playwright polling behind slow software-GL frames: ${readyMs} ms)`);
  const t0 = Date.now(); await waitLayout(page); out(`full force layout in the worker finished ${Date.now() - t0} ms after the first frame; worker-reported layout time ${Math.round(await page.evaluate(() => __explore.S.metrics.lastLayoutMs))} ms (runs off the main thread)`);
  // scripted camera path: pan + zoom for 8 s, record every frame interval
  const frames = await page.evaluate(async () => {
    const cam = __explore.renderer.getCamera(), dts = []; let last = performance.now(), stop = false;
    const tick = t => { dts.push(t - last); last = t; if (!stop) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    const t0 = performance.now();
    await new Promise(res => { const step = () => { const k = (performance.now() - t0) / 8000; if (k >= 1) return res(); cam.setState({ x: 0.5 + 0.3 * Math.sin(k * 6.28), y: 0.5 + 0.3 * Math.cos(k * 6.28), ratio: 0.4 + 0.8 * Math.abs(Math.sin(k * 3.14)) }); requestAnimationFrame(step); }; step(); });
    stop = true; return dts.slice(2);
  });
  const fps = frames.map(d => 1000 / d);
  out(`pan/zoom (8 s scripted camera path, ${frames.length} frames): mean ${(frames.length / 8).toFixed(1)} fps, median ${pct(fps, 50).toFixed(1)} fps, p95-frame ${(1000 / pct(frames, 95)).toFixed(1)} fps, min ${(1000 / Math.max(...frames)).toFixed(1)} fps, longest frame ${Math.max(...frames).toFixed(0)} ms`);
  // live delta latency: ack on the server -> node visible in the browser graph (includes SSE + coalescing + frame)
  const lat = [];
  for (let i = 0; i < 10; i++) {
    const p = app.ex.producer('synthetic'), id = `probe:${i}`;
    for (let k = 0; k < 199; k++) p.push('node.upsert', { id: `syn:node:${(i * 199 + k) % N}`, type: 'Person', properties: { probe: i, k } });
    p.push('node.upsert', { id, type: 'Device', label: id, properties: {} });
    await p.flush(); const tAck = Date.now();
    await page.waitForFunction(x => __explore.graph.hasNode(x), id, { timeout: 10000, polling: 'raf' });
    lat.push(Date.now() - tAck);
  }
  out(`200-event delta, server ack -> visible in the browser graph (incl. local SSE): p50 ${pct(lat, 50)} ms, p95 ${pct(lat, 95)} ms, max ${Math.max(...lat)} ms`);
  await page.evaluate(() => __explore.renderer.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 }));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(proof, 'explore-10k.png') });
  out(`page errors: ${errors.length ? errors.join(' | ') : 'none'}; screenshot proof/explore-10k.png`);
  await page.close(); await app.close(); rmSync(dir, { recursive: true, force: true });
}
await browser.close();
writeFileSync(join(proof, 'render-bench.txt'), lines.join('\n') + '\n');
process.exit(0);
