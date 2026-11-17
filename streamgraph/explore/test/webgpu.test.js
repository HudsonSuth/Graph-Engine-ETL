// Optional WebGPU renderer: selection / fallback logic, persisted choice, camera parity with sigma, CPU picking index,
// colour parsing, benchmark result schema + stop rule, and the server endpoint that stores results.
// RENDERER_SELECT_IMPL=wrong swaps in explore/shared/renderer-select-wrong.js (Auto always picks WebGPU): W1-W3 MUST fail.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { matrixFromCamera, multiplyVec2 } from 'sigma/utils';
import { Camera, normalization, viewTransform, framedToViewport, viewportToFramed, graphToFramed } from '../client/webgpu/camera.js';
import { GridIndex } from '../client/webgpu/spatial.js';
import { parseColor, unpack, withAlpha } from '../client/webgpu/color.js';
import { BENCH_SCHEMA, BENCH_SIZES, validateBenchResult, classifyRun, stopsLadder, frameStats, quantile, summarize, benchFileName, MIN_FPS } from '../shared/bench-schema.js';

const SEL = await import(process.env.RENDERER_SELECT_IMPL === 'wrong' ? '../shared/renderer-select-wrong.js' : '../shared/renderer-select.js');
const fakeNav = adapter => ({ gpu: { requestAdapter: async () => adapter } });
const ADAPTER = { info: { vendor: 'intel', architecture: 'gen-12lp' }, limits: {} };

test('W1 Auto picks WebGPU only with navigator.gpu AND an adapter; explicit WebGL always wins', () => {
  assert.equal(SEL.chooseRenderer({ pref: 'auto', hasApi: true, adapter: ADAPTER }).renderer, 'webgpu');
  assert.equal(SEL.chooseRenderer({ pref: 'auto', hasApi: false, adapter: null }).renderer, 'webgl', 'no navigator.gpu');
  assert.equal(SEL.chooseRenderer({ pref: 'auto', hasApi: true, adapter: null }).renderer, 'webgl', 'API present, adapter null');
  assert.equal(SEL.chooseRenderer({ pref: 'auto', hasApi: true, adapter: null, error: 'boom' }).renderer, 'webgl', 'adapter request threw');
  const auto = SEL.chooseRenderer({ pref: 'auto', hasApi: false });
  assert.equal(auto.fallback, false); assert.equal(auto.note, null, 'Auto falls back quietly');
  assert.equal(SEL.chooseRenderer({ pref: 'webgl', hasApi: true, adapter: ADAPTER }).renderer, 'webgl');
  assert.equal(SEL.chooseRenderer({ pref: 'nonsense', hasApi: true, adapter: ADAPTER }).pref, 'auto');
});

test('W2 an explicit WebGPU choice without an adapter falls back to WebGL with a visible note', () => {
  const r = SEL.chooseRenderer({ pref: 'webgpu', hasApi: true, adapter: null });
  assert.equal(r.renderer, 'webgl'); assert.equal(r.fallback, true); assert.match(r.note, /WebGPU unavailable.*using WebGL/);
  const r2 = SEL.chooseRenderer({ pref: 'webgpu', hasApi: false });
  assert.equal(r2.renderer, 'webgl'); assert.match(r2.note, /navigator\.gpu is missing/);
  const f = SEL.fallbackAfterFailure('webgpu', new Error('device lost'));
  assert.deepEqual([f.renderer, f.fallback], ['webgl', true]); assert.match(f.note, /device lost/);
});

test('W3 resolveRenderer probes the browser (adapter, no adapter, no API, throwing adapter request)', async () => {
  assert.equal((await SEL.resolveRenderer('auto', fakeNav(ADAPTER))).renderer, 'webgpu');
  assert.equal((await SEL.resolveRenderer('auto', fakeNav(null))).renderer, 'webgl');
  assert.equal((await SEL.resolveRenderer('auto', {})).renderer, 'webgl');
  const thrown = await SEL.resolveRenderer('webgpu', { gpu: { requestAdapter: async () => { throw new Error('GPU process crashed'); } } });
  assert.equal(thrown.renderer, 'webgl'); assert.match(thrown.note, /GPU process crashed/);
  const slow = await SEL.resolveRenderer('auto', { gpu: { requestAdapter: () => new Promise(() => {}) } }, { timeoutMs: 30 });
  assert.equal(slow.renderer, 'webgl', 'a hanging requestAdapter times out to WebGL');
  let asked = false; await SEL.resolveRenderer('webgl', { gpu: { requestAdapter: async () => { asked = true; return ADAPTER; } } });
  assert.equal(asked, false, 'WebGL choice never touches WebGPU');
});

test('W4 the choice persists in localStorage; ?renderer= overrides one load', () => {
  const store = new Map(), ls = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  assert.equal(SEL.loadPref(ls), 'auto');
  SEL.savePref('webgpu', ls); assert.equal(store.get(SEL.STORAGE_KEY), 'webgpu'); assert.equal(SEL.loadPref(ls), 'webgpu');
  assert.equal(SEL.loadPref(ls, 'webgl'), 'webgl'); assert.equal(store.get(SEL.STORAGE_KEY), 'webgpu', 'URL override is not saved');
  SEL.savePref('garbage', ls); assert.equal(SEL.loadPref(ls), 'auto');
  assert.equal(SEL.loadPref({ getItem() { throw new Error('denied'); } }), 'auto');
});

test('W5 camera transform matches sigma 4 matrixFromCamera (pan, zoom, rotation, aspect ratios)', () => {
  for (const [w, h] of [[1200, 800], [800, 1200], [500, 500]]) for (const ext of [{ x: [-100, 300], y: [-50, 50] }, { x: [0, 10], y: [0, 40] }]) for (const cam of [{ x: 0.5, y: 0.5, ratio: 1, angle: 0 }, { x: 0.3, y: 0.7, ratio: 0.25, angle: 0 }, { x: 0.6, y: 0.4, ratio: 2, angle: 0.7 }]) {
    const n = normalization(ext), t = viewTransform(cam, w, h, n, 30);
    const m = matrixFromCamera(cam, { width: w, height: h }, { width: n.graphW, height: n.graphH }, 30);
    for (const gp of [{ x: ext.x[0], y: ext.y[0] }, { x: ext.x[1], y: ext.y[1] }, { x: 17, y: -3 }]) {
      const f = graphToFramed(n, gp.x, gp.y), clip = multiplyVec2(m, f), sig = { x: (1 + clip.x) * w / 2, y: (1 - clip.y) * h / 2 };
      const ours = framedToViewport(t, f.x, f.y);
      assert.ok(Math.abs(ours.x - sig.x) < 1e-3 && Math.abs(ours.y - sig.y) < 1e-3, `viewport mismatch (sigma uses Float32 matrices) ${JSON.stringify({ w, h, cam, gp, ours, sig })}`);
      const back = viewportToFramed(t, ours.x, ours.y); assert.ok(Math.abs(back.x - f.x) < 1e-9 && Math.abs(back.y - f.y) < 1e-9, 'inverse');
    }
  }
  const c = new Camera(); let ev = 0; c.on('updated', () => ev++); c.setState({ x: 0.2, ratio: 0.5 }); c.setState({ x: 0.2 });
  assert.deepEqual(c.getState(), { x: 0.2, y: 0.5, ratio: 0.5, angle: 0 }); assert.equal(ev, 1, 'no event without a change');
});

test('W6 CPU picking grid returns every node near a point (brute-force cross-check, 20k random nodes)', () => {
  let s = 1; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const n = 20000, xs = new Float32Array(n), ys = new Float32Array(n), ids = new Uint32Array(n);
  for (let i = 0; i < n; i++) { xs[i] = r() * 1000 - 500; ys[i] = r() * 300; ids[i] = i; }
  const g = new GridIndex().build(xs, ys, ids, n - 100); // the last 100 are "hidden"
  for (let q = 0; q < 50; q++) {
    const x = r() * 1000 - 500, y = r() * 300, rad = r() * 25, got = new Set();
    g.query(x, y, rad, i => { if (Math.hypot(xs[i] - x, ys[i] - y) <= rad) got.add(i); });
    const want = new Set(); for (let i = 0; i < n - 100; i++) if (Math.hypot(xs[i] - x, ys[i] - y) <= rad) want.add(i);
    assert.deepEqual([...got].sort(), [...want].sort());
  }
  const empty = new GridIndex().build(xs, ys, ids, 0); let k = 0; empty.query(0, 0, 1e9, () => k++); assert.equal(k, 0);
});

test('W7 colours parse to packed RGBA8 like the CSS the style config uses', () => {
  assert.deepEqual(unpack(parseColor('#ff8000')), [255, 128, 0, 1]);
  assert.deepEqual(unpack(parseColor('#0f0')), [0, 255, 0, 1]);
  assert.deepEqual(unpack(parseColor('rgba(10, 20, 30, 0.5)')).map(v => Math.round(v * 100) / 100), [10, 20, 30, 0.5]);
  assert.deepEqual(unpack(parseColor('#11223380')).slice(0, 3), [17, 34, 51]);
  assert.equal(parseColor('rgba(0,0,0,0)'), 0); assert.equal(parseColor('transparent'), 0);
  assert.equal(unpack(withAlpha(parseColor('#ffffff'), 0.5))[3], 128 / 255);
});

const run = (o = {}) => ({ renderer: 'webgpu', nodes: 10000, edges: 20000, status: 'ok', genMs: 40, initMs: 120, uploadMs: 3, frames: 300, frameMs: { median: 16.7, p95: 18, mean: 16.9, min: 16, max: 30 }, fps: 59.9, cpuMs: { median: 0.4, p95: 0.9 }, oom: false, deviceLost: false, error: null, ...o });
const doc = (runs, o = {}) => ({ schema: BENCH_SCHEMA, createdAt: new Date().toISOString(), userAgent: 'test', url: 'http://x/explore/bench', environment: { webgpu: { available: true, adapter: null }, webgl: null, devicePixelRatio: 1, viewport: { width: 1280, height: 640 } }, settings: { sizes: BENCH_SIZES, renderers: ['webgl', 'webgpu'], edgeFactor: 2, durationMs: 5000, minFps: MIN_FPS }, runs, summary: summarize(runs), ...o });

test('W8 benchmark schema: a valid result passes; broken ones are rejected with reasons', () => {
  assert.deepEqual(BENCH_SIZES, [10000, 50000, 100000, 250000, 500000, 1000000]);
  const good = doc([run(), run({ nodes: 50000, edges: 100000, status: 'slow', fps: 6, frameMs: { median: 160, p95: 300 } }), run({ nodes: 100000, edges: 200000, status: 'skipped', initMs: null, frameMs: { median: null, p95: null }, fps: null, error: 'not run' })]);
  assert.deepEqual(validateBenchResult(good), []);
  assert.ok(validateBenchResult({ ...good, schema: 'x' }).length);
  assert.ok(validateBenchResult(doc([run({ oom: 'no' })])).some(e => /oom/.test(e)));
  assert.ok(validateBenchResult(doc([run({ status: 'great' })])).some(e => /status/.test(e)));
  assert.ok(validateBenchResult(doc([run({ frameMs: { median: null, p95: null } })])).some(e => /ok run needs numeric/.test(e)));
  assert.ok(validateBenchResult(doc([run({ fps: 4 })])).some(e => /below minFps/.test(e)));
  assert.ok(validateBenchResult(doc([run({ status: 'error', error: 'lost' }), run({ nodes: 50000 })])).some(e => /continued/.test(e)), 'the ladder must stop after an error');
  assert.deepEqual(validateBenchResult(null), ['result must be an object']);
});

test('W9 stop rule and statistics: < 10 fps or OOM / device lost stops the size ladder', () => {
  assert.equal(classifyRun({ frameMs: { median: 16.7 } }), 'ok');
  assert.equal(classifyRun({ frameMs: { median: 120 } }), 'slow');
  assert.equal(classifyRun({ frameMs: { median: 16.7 }, oom: true }), 'error');
  assert.equal(classifyRun({ frameMs: { median: 16.7 }, deviceLost: 'destroyed' }), 'error');
  assert.equal(classifyRun({ error: 'x' }), 'error');
  assert.equal(classifyRun({ frameMs: { median: null } }), 'error');
  assert.ok(stopsLadder('slow') && stopsLadder('error') && !stopsLadder('ok'));
  assert.equal(quantile([1, 2, 3, 4, 5], 0.5), 3); assert.equal(quantile([10, 20], 0.95), 19.5);
  assert.deepEqual(frameStats([16, 17, 18, 50]), { median: 17.5, p95: 45.2, mean: 25.25, min: 16, max: 50 });
  const s = summarize([run(), run({ nodes: 50000 }), run({ nodes: 100000, status: 'slow', fps: 5 }), run({ renderer: 'webgl', status: 'error', oom: true, error: 'x' })]);
  assert.equal(s.webgpu.maxOkNodes, 50000); assert.equal(s.webgpu.firstFailure.nodes, 100000); assert.equal(s.webgl.maxOkNodes, 0);
  assert.match(benchFileName(new Date('2026-11-15T14:30:00.123Z')), /^webgpu-bench-2026-11-15T14-30-00-123Z\.json$/);
});

test('W10 POST /api/explore/bench/webgpu stores perf/webgpu-bench-<timestamp>.json and rejects junk', async t => {
  const out = mkdtempSync(join(tmpdir(), 'sg-bench-')), dataDir = mkdtempSync(join(tmpdir(), 'sg-bench-data-'));
  process.env.EXPLORE_BENCH_DIR = out;
  const { startCombined } = await import('../combined.js'); const { loadConfig } = await import('../server/app.js');
  const app = await startCombined({ port: 0, flowPath: new URL('../../demo/flow.json', import.meta.url).pathname, dataDir, log: null, config: loadConfig(join(tmpdir(), 'none.json')) });
  t.after(async () => { await app.close?.(); delete process.env.EXPLORE_BENCH_DIR; rmSync(out, { recursive: true, force: true }); rmSync(dataDir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${app.port}`;
  const page = await fetch(`${base}/explore/bench`); assert.equal(page.status, 200); assert.match(await page.text(), /Renderer benchmark/);
  const bad = await fetch(`${base}/api/explore/bench/webgpu`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ schema: 'nope' }) });
  assert.equal(bad.status, 400); assert.ok((await bad.json()).problems.length);
  const body = doc([run()]);
  const ok = await fetch(`${base}/api/explore/bench/webgpu`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await ok.json(); assert.equal(ok.status, 200, JSON.stringify(j)); assert.match(j.file, /^perf\/webgpu-bench-.*\.json$/);
  const files = readdirSync(out); assert.equal(files.length, 1); assert.deepEqual(JSON.parse(readFileSync(join(out, files[0]), 'utf8')).runs[0].nodes, 10000);
  assert.equal(readdirSync(out).length, 1, 'no extra files');
});

test('W11 the deliberately wrong selector (Auto always WebGPU) fails W1-W3', { skip: process.env.RENDERER_SELECT_IMPL === 'wrong' }, async () => {
  const { spawnSync } = await import('node:child_process');
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT')), RENDERER_SELECT_IMPL: 'wrong' };
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', '--test-name-pattern=^W[123] ', new URL(import.meta.url).pathname], { env, encoding: 'utf8' });
  assert.notEqual(r.status, 0, 'the wrong implementation must fail the suite');
  assert.match(r.stdout, /✖ W1 /); assert.match(r.stdout, /✖ W2 /); assert.match(r.stdout, /✖ W3 /);
});
