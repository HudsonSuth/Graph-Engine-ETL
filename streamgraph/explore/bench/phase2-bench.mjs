// Phase 2 scale & readability performance (SPEC §24.7): server overview (semantic zoom) latency, layout time per kind,
// FDEB bundling time, and browser frame rate for overview vs detail and the 100k focus overview, on 10k and 100k node
// synthetic graphs. Each measured time is printed next to the cost estimate the UI would show (§24.5).
// Browser numbers come from Chrome with SwiftShader (software WebGL, no GPU here), so they are a floor.
// Writes proof/phase2-perf.txt (+ .json). Usage: node explore/bench/phase2-bench.mjs [sizes=10000,100000] [--no-browser]
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir, cpus } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startCombined } from '../combined.js';
import { loadConfig } from '../server/app.js';
import { computeLayout, rng } from '../shared/layouts.js';
import { bundleEdges } from '../shared/bundling.js';
import { estimateLayout, estimateBundling } from '../shared/cost.js';

const sizes = (process.argv.slice(2).find(a => /^\d/.test(a)) || '10000,100000').split(',').map(Number);
const browserOn = !process.argv.includes('--no-browser');
const proof = fileURLToPath(new URL('../../proof/', import.meta.url)); mkdirSync(proof, { recursive: true });
const lines = [], J = { sizes: {} }; const out = s => { lines.push(s); console.log(s); };
const f = v => (v == null ? '-' : v >= 100 ? Math.round(v).toString() : v.toFixed(1));
const et = () => new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET';
const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const post = async (base, path, body) => { const t0 = performance.now(); const j = await (await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json(); return { ms: performance.now() - t0, j }; };

out(`# Phase 2 scale & readability performance — ${et()}`);
out(`# machine: ${cpus().length} x ${cpus()[0]?.model}, Node ${process.version}; no GPU (browser WebGL = SwiftShader software rendering)`);

// synthetic graph for the Node-side layout/bundling numbers: 250-node communities, ~2 links per node, dated + geo-tagged
function graph(N) {
  const r = rng(N), nodes = [], links = [];
  for (let i = 0; i < N; i++) { const c = Math.floor(i / 250); nodes.push({ id: 'n' + i, type: ['Person', 'Account', 'Device'][i % 3], properties: { when: new Date(Date.UTC(2020, 0, 1) + Math.floor(r() * 1800) * 864e5).toISOString(), lat: ((c * 37) % 140) - 70 + r() * 3, lon: ((c * 71) % 340) - 170 + r() * 3, team: 't' + (c % 40) } });
    for (let k = 0; k < 2 && i; k++) { const j = r() < 0.9 ? Math.max(0, c * 250 + Math.floor(r() * Math.min(250, i - c * 250 || 1))) : Math.floor(r() * i); if (j !== i) links.push({ source: 'n' + j, target: 'n' + i }); } }
  return { nodes, links };
}

const fps = (page, secs = 6) => page.evaluate(async secs => {
  const cam = __explore.renderer.getCamera(), dts = [], r0 = cam.ratio; let last = performance.now(), stop = false;
  const tick = t => { dts.push(t - last); last = t; if (!stop) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  const t0 = performance.now();
  await new Promise(res => { const step = () => { const k = (performance.now() - t0) / (secs * 1000); if (k >= 1) return res(); cam.setState({ x: 0.5 + 0.1 * Math.sin(k * 6.28), y: 0.5 + 0.1 * Math.cos(k * 6.28), ratio: r0 * (1 + 0.15 * Math.sin(k * 6.28)) }); requestAnimationFrame(step); }; step(); });
  stop = true; const fr = dts.slice(1); return { frames: fr.length, mean: fr.length / secs, worstMs: fr.length ? Math.max(...fr) : null };
}, secs);

let browser = null;
if (browserOn && exe) { const { chromium } = await import('playwright-core'); browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] }); }

for (const N of sizes) {
  const S = J.sizes[N] = { overview: {}, layout: {}, bundle: {}, browser: {} };
  const dir = mkdtempSync(join(tmpdir(), `sgx-p2-${N}-`));
  const t0 = performance.now();
  const app = await startCombined({ port: 0, dataDir: dir, log: null, config: loadConfig(join(dir, 'none.json')), synthetic: N });
  const base = `http://127.0.0.1:${app.port}`;
  out(`\n## ${N.toLocaleString()} nodes / ${(2 * N).toLocaleString()} links (load ${Math.round(performance.now() - t0)} ms)`);
  // ---- overview (semantic zoom aggregation), cold then cached
  for (const by of ['louvain', 'leiden', 'components', 'type']) {
    const est = (await post(base, '/api/explore/cost', { op: 'overview', by })).j;
    const cold = await post(base, '/api/explore/clusters', { by, maxClusters: 300 }); const warm = await post(base, '/api/explore/clusters', { by, maxClusters: 300 });
    const memb = await post(base, '/api/explore/clusters', { by, maxClusters: 300, membership: true });
    S.overview[by] = { coldMs: cold.ms, warmMs: warm.ms, membershipMs: memb.ms, clusters: cold.j.clusters.length, metaEdges: cold.j.metaEdges.length, estMs: est.estMs };
    out(`overview by ${by}: ${cold.j.clusters.length} clusters / ${cold.j.metaEdges.length} meta-edges; cold ${f(cold.ms)} ms, cached ${f(warm.ms)} ms, +membership ${f(memb.ms)} ms (estimate ${f(est.estMs)} ms)`);
  }
  const big = (await post(base, '/api/explore/clusters', { by: 'louvain', maxClusters: 300 })).j.clusters[0];
  const mem = await post(base, '/api/explore/clusters/members', { by: 'louvain', maxClusters: 300, cluster: big.id, max: 2000 });
  out(`members of the largest cluster (${big.count}): ${f(mem.ms)} ms`);
  await app.close(); rmSync(dir, { recursive: true, force: true });
  // ---- layouts (Node, same code as the browser worker)
  const g = graph(N); let posCommunity = null;
  for (const kind of ['force', 'community', 'hierarchy', 'radial', 'circular', 'timeline', 'geo']) {
    const est = estimateLayout(kind, g.nodes.length, g.links.length);
    if (kind === 'force' && est.estMs > 240000) { out(`layout ${kind}: skipped (estimate ${f(est.estMs)} ms)`); continue; }
    const t = performance.now(); const pos = computeLayout({ nodes: g.nodes, links: g.links, options: { kind, timeProperty: 'when', groupBy: 'louvain', incremental: false } }); const ms = performance.now() - t;
    if (kind === 'community') posCommunity = pos;
    S.layout[kind] = { ms, estMs: est.estMs }; out(`layout ${kind}: ${f(ms)} ms (estimate ${f(est.estMs)} ms, ${est.level})`);
  }
  // ---- bundling on the community layout's coordinates
  if (N === sizes[0]) for (const E of [1000, 5000]) {
    const edges = g.links.slice(0, E).map((l, i) => { const a = posCommunity.get(l.source), b = posCommunity.get(l.target); return { id: 'e' + i, x1: a.x, y1: a.y, x2: b.x, y2: b.y }; });
    const est = estimateBundling(E); const r = bundleEdges(edges);
    S.bundle[E] = { ms: r.stats.ms, pairs: r.stats.pairs, estMs: est.estMs }; out(`bundling ${E} edges: ${f(r.stats.ms)} ms, ${r.stats.pairs} compatible pairs (estimate ${f(est.estMs)} ms)`);
  }
  // ---- browser
  if (browser) {
    const d2 = mkdtempSync(join(tmpdir(), `sgx-p2b-${N}-`));
    const app2 = await startCombined({ port: 0, dataDir: d2, log: null, config: loadConfig(join(d2, 'none.json')), synthetic: N });
    const modes = N <= 20000 ? [['full, overview (bubbles)', '/explore?scope=full&clusters=on', 1.2], ['full, detail (nodes)', '/explore?scope=full&clusters=off', 1]] : [['focus overview (0 nodes loaded)', '/explore?scope=focus', 1]];
    for (const [mode, path, ratio] of modes) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; page.on('pageerror', e => errs.push(e.message));
      const tr = performance.now(); await page.goto(base.replace(/:\d+$/, ':' + app2.port) + path);
      await page.waitForSelector('body[data-ready="1"]', { timeout: 300000 });
      if (/focus/.test(path)) await page.waitForFunction(() => Number(document.body.dataset.overview) > 0, null, { timeout: 120000 });
      if (/clusters=on/.test(path)) await page.waitForFunction(() => document.body.dataset.clusters, null, { timeout: 120000 }).catch(() => {});
      const ready = performance.now() - tr; await page.waitForTimeout(4000);
      await page.evaluate(r => __explore.renderer.getCamera().setState({ ratio: r }), ratio); await page.waitForTimeout(500);
      const fr = await fps(page, 6), info = await page.evaluate(() => ({ loaded: __explore.graph.order, bubbles: __explore.S.scale.drawn.filter(d => d.kind === 'bubble').length, mode: document.body.dataset.clusters || '-' }));
      S.browser[mode] = { readyMs: ready, ...info, fps: fr, errors: errs.length };
      out(`browser ${mode}: ${info.loaded.toLocaleString()} nodes loaded, ${info.bubbles} bubbles, ready ${f(ready)} ms; pan/zoom 6 s = ${fr.mean.toFixed(1)} fps, worst frame ${f(fr.worstMs)} ms (SwiftShader)${errs.length ? `, ${errs.length} page errors` : ''}`);
      await page.close();
    }
    await app2.close(); rmSync(d2, { recursive: true, force: true });
  }
}
await browser?.close();
writeFileSync(join(proof, 'phase2-perf.txt'), lines.join('\n') + '\n'); writeFileSync(join(proof, 'phase2-perf.json'), JSON.stringify(J, null, 1));
process.exit(0);
