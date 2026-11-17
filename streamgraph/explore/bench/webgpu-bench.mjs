// CLI for the WebGPU vs WebGL renderer benchmark (/explore/bench). Drives Chrome / Edge with Playwright, waits for the
// page to finish the size ladder (10k .. 1M nodes, edges ~= 2x, stop below 10 fps or on error), then saves the JSON:
// the page POSTs it to the app (perf/webgpu-bench-<timestamp>.json on the server) and a copy is written locally.
//
//   node explore/bench/webgpu-bench.mjs [--url http://127.0.0.1:8091] [--channel msedge|chrome] [--chrome path]
//        [--headed | --headless] [--sizes 10000,50000,...] [--renderers webgl,webgpu] [--duration 5000] [--readback]
//
// Without --url it starts its own app on a free port (no demo data; the benchmark makes its graphs in the browser).
// Real GPU numbers need a HEADED browser on a machine with a GPU (default on Windows / macOS). Headless Chrome on a
// GPU-less Linux box only has SwiftShader (CPU) WebGPU, which destroys the device when a canvas is presented, so there
// the page renders through the debug readback path (--readback, default on Linux headless) and the numbers are not
// GPU numbers.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2), flag = n => argv.includes(n), opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
if (flag('--help') || flag('-h')) { console.log(readHelp()); process.exit(0); }
const headed = flag('--headed') || (!flag('--headless') && platform() !== 'linux');
const readback = flag('--readback') || (!headed && platform() === 'linux');
const sizes = opt('--sizes'), renderers = opt('--renderers'), duration = opt('--duration', '5000');
const PERF = fileURLToPath(new URL('../../perf/', import.meta.url)); mkdirSync(PERF, { recursive: true });

let app = null, dir = null, base = opt('--url');
if (!base) {
  const { startCombined } = await import('../combined.js'); const { loadConfig } = await import('../server/app.js');
  dir = mkdtempSync(join(tmpdir(), 'sg-webgpu-bench-'));
  app = await startCombined({ port: 0, dataDir: dir, log: null, config: loadConfig(join(dir, 'none.json')) });
  base = `http://127.0.0.1:${app.port}`;
}
base = base.replace(/\/+$/, '');
const exe = opt('--chrome') || process.env.CHROME_PATH;
const channel = opt('--channel');
const launch = { headless: !headed, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', ...(platform() === 'linux' ? ['--no-sandbox', '--enable-unsafe-swiftshader'] : [])] };
const tries = [exe && { executablePath: exe }, channel && { channel }, { channel: 'chrome' }, { channel: 'msedge' }, ...['/usr/bin/google-chrome', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(existsSync).map(p => ({ executablePath: p }))].filter(Boolean);
let browser = null, lastErr = null;
for (const t of tries) { try { browser = await chromium.launch({ ...launch, ...t }); break; } catch (e) { lastErr = e; } }
if (!browser) { console.error('No Chrome / Edge found (use --chrome <path> or --channel msedge):', lastErr?.message); await cleanup(); process.exit(2); }

const q = new URLSearchParams({ auto: '1', post: '1', duration });
if (sizes) q.set('sizes', sizes); if (renderers) q.set('renderers', renderers); if (readback) q.set('gpuReadback', '1');
const url = `${base}/explore/bench?${q}`;
console.log(`Browser ${browser.version()} (${headed ? 'headed' : 'headless'}${readback ? ', WebGPU readback debug path' : ''}) → ${url}`);
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('pageerror', e => console.error('page error:', e.message));
let code = 0, partial = null;
try {
  await page.goto(url);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  let lastLine = '';
  const timer = setInterval(async () => { const s = await page.locator('#status').textContent().catch(() => ''); if (s && s !== lastLine) { lastLine = s; console.log('  ' + s); }
    const snap = await page.evaluate(() => window.__bench.result && JSON.parse(JSON.stringify(window.__bench.result))).catch(() => null); if (snap) partial = snap; }, 2000);
  await page.waitForFunction(() => window.__bench?.done, null, { timeout: Number(opt('--timeout-min', '90')) * 60000, polling: 1000 });
  clearInterval(timer);
  const { result, posted, error } = await page.evaluate(() => ({ result: window.__bench.result, posted: window.__bench.posted, error: window.__bench.error }));
  if (error) throw new Error(error);
  const ad = result.environment.webgpu.adapter;
  if (!result.environment.webgpu.available) console.log(`! No WebGPU adapter in this browser (${result.environment.webgpu.error || 'navigator.gpu ' + (result.environment.webgpu.hasApi ? 'present' : 'missing')}); only WebGL ran.`);
  else if (ad?.isFallbackAdapter || /swiftshader/i.test(ad?.architecture || '')) console.log('! WebGPU adapter is a SOFTWARE fallback (SwiftShader): these are CPU numbers, not GPU numbers.');
  console.log(`\nWebGPU adapter: ${ad ? [ad.vendor, ad.architecture, ad.description].filter(Boolean).join(' · ') : 'none'}   WebGL: ${result.environment.webgl?.renderer || '?'}`);
  console.log('renderer   nodes      edges      status   init ms  frame median  p95     fps    error');
  for (const r of result.runs) console.log(`${r.renderer.padEnd(10)} ${String(r.nodes).padEnd(10)} ${String(r.edges).padEnd(10)} ${r.status.padEnd(8)} ${String(r.initMs ?? '').padEnd(8)} ${String(r.frameMs.median ?? '').padEnd(13)} ${String(r.frameMs.p95 ?? '').padEnd(7)} ${String(r.fps ?? '').padEnd(6)} ${r.error || ''}`);
  const local = join(PERF, `webgpu-bench-${result.createdAt.replace(/[:.]/g, '-')}${posted && !app ? '-local' : ''}.json`);
  if (!posted || !app) writeFileSync(local, JSON.stringify(result, null, 2));
  console.log(`\n${posted ? `Server saved ${posted}` : 'Server did not save it'}${!posted || !app ? `; local copy ${local}` : ''}`);
} catch (e) {
  console.error('Benchmark failed:', e.message); code = 1;
  if (partial) { // the tab crashed or hung (e.g. out of memory at the biggest size): keep what finished
    partial.incomplete = { reason: e.message, lastStatus: 'see runs' };
    const f = join(PERF, `webgpu-bench-${partial.createdAt.replace(/[:.]/g, '-')}-partial.json`); writeFileSync(f, JSON.stringify(partial, null, 2));
    console.error(`Partial result (${partial.runs.length} runs) saved to ${f}`);
  }
}
await browser.close(); await cleanup(); process.exit(code);
async function cleanup() { await app?.close?.(); if (dir) rmSync(dir, { recursive: true, force: true }); }
function readHelp() { return 'Usage: node explore/bench/webgpu-bench.mjs [--url <app base, e.g. http://127.0.0.1:8091>] [--channel msedge|chrome] [--chrome <exe>]\n  [--headed|--headless] [--sizes 10000,50000,...] [--renderers webgl,webgpu] [--duration 5000] [--readback] [--timeout-min 90]'; }
