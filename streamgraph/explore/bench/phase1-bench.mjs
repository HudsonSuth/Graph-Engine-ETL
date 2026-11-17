// Phase 1 core loop performance (SPEC §23.9): neighbourhood stream latency (first chunk + total) for hops 1-3, path
// search, algorithm run times on the whole graph, and browser frame rate, on 10k and 100k node synthetic graphs
// (2 links per node, 250-node communities). Browser numbers come from Chrome with SwiftShader (software WebGL, no GPU
// on this machine), so they are a floor. Writes proof/phase1-perf.txt (+ proof/phase1-perf.json).
// Usage: node explore/bench/phase1-bench.mjs [sizes=10000,100000] [--no-browser]
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir, cpus } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startCombined } from '../combined.js';
import { loadConfig } from '../server/app.js';

const sizes = (process.argv.slice(2).find(a => /^\d/.test(a)) || '10000,100000').split(',').map(Number);
const browserOn = !process.argv.includes('--no-browser');
const proof = fileURLToPath(new URL('../../proof/', import.meta.url)); mkdirSync(proof, { recursive: true });
const lines = [], json = {}; const out = s => { lines.push(s); console.log(s); };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
const med = a => pct(a, 50), f = v => (v == null ? '-' : v >= 100 ? Math.round(v).toString() : v.toFixed(1));
const et = () => new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET';
let r = 7; const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);

out(`# Phase 1 core loop performance — ${et()}`);
out(`# machine: ${cpus().length} x ${cpus()[0]?.model}, Node ${process.version}; no GPU (browser WebGL = SwiftShader software rendering)`);

async function ndjson(url, body) {
  const t0 = performance.now(); const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  let first = null, buf = '', end = null, nodes = 0; const dec = new TextDecoder();
  for await (const c of res.body) { buf += dec.decode(c, { stream: true }); let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (!l.trim()) continue; const m = JSON.parse(l); if (m.type === 'chunk') { if (first == null) first = performance.now() - t0; nodes += m.nodes.length; } if (m.type === 'end') end = m.stats; } }
  return { first, total: performance.now() - t0, nodes, end };
}
const post = async (base, path, body) => (await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();

for (const N of sizes) {
  const dir = mkdtempSync(join(tmpdir(), `sgx-p1-${N}-`));
  const cfg = loadConfig(join(dir, 'none.json'));
  const t0 = performance.now();
  const app = await startCombined({ port: 0, dataDir: dir, log: null, config: cfg, synthetic: N });
  const base = `http://127.0.0.1:${app.port}`;
  out(`\n## ${N.toLocaleString()} nodes / ${(2 * N).toLocaleString()} links (load ${Math.round(performance.now() - t0)} ms)`);
  const J = json[N] = { neighborhood: {}, paths: null, algorithms: {}, browser: {} };
  const sid = (await post(base, '/api/explore/session', { follow: false, grow: true })).sessionId;
  const seed = () => `syn:node:${Math.floor(rnd() * N)}`;
  // warm-up
  await ndjson(`${base}/api/explore/session/${sid}/neighborhood`, { seeds: [seed()], hops: 1 });
  out('neighbourhood stream (NDJSON over HTTP, 12 random seeds each, cap 20,000 nodes, chunk 500):');
  out('  hops | nodes (median) | first chunk median / p95 ms | total median / p95 ms');
  for (const hops of [1, 2, 3, 6]) {
    const rs = []; for (let i = 0; i < (hops === 6 ? 4 : 12); i++) rs.push(await ndjson(`${base}/api/explore/session/${sid}/neighborhood`, { seeds: [seed()], hops, maxNodes: 20000, chunkSize: 500, stream: true }));
    const row = { n: rs.length, nodes: med(rs.map(x => x.nodes)), firstMed: med(rs.map(x => x.first)), firstP95: pct(rs.map(x => x.first), 95), totalMed: med(rs.map(x => x.total)), totalP95: pct(rs.map(x => x.total), 95), truncated: rs.filter(x => x.end?.truncated).length };
    J.neighborhood[hops] = row;
    out(`  ${hops}${hops === 6 ? '*' : ' '}   | ${String(row.nodes).padStart(14)} | ${f(row.firstMed).padStart(8)} / ${f(row.firstP95).padEnd(17)} | ${f(row.totalMed)} / ${f(row.totalP95)}${row.truncated ? `  (${row.truncated}/${row.n} hit the cap)` : ''}`);
  }
  { // paths
    const ts = [], found = []; for (let i = 0; i < 8; i++) { const a = seed(); const nb = await post(base, `/api/explore/session/${sid}/neighborhood`, { seeds: [a], hops: 3, stream: false, maxNodes: 2000 }); const far = nb.nodes.filter(n => nb.hopOf[n.id] === 3); const b = far.length ? far[Math.floor(rnd() * far.length)].id : seed();
      const t = performance.now(); const p = await post(base, `/api/explore/session/${sid}/paths`, { fromId: a, toId: b, maxHops: 4, mode: 'all', maxPaths: 100 }); ts.push(performance.now() - t); found.push(p.paths?.length || 0); }
    out('  (* hops 6 = a big pull: 4 seeds, stopped by the 20,000-node cap or the component size)');
    J.paths = { median: med(ts), p95: pct(ts, 95), pathsMedian: med(found) };
    out(`find paths (shortest + all simple paths up to 4 hops, cap 100, 8 pairs 3 hops apart): median ${f(J.paths.median)} ms, p95 ${f(J.paths.p95)} ms, median ${J.paths.pathsMedian} paths`);
  }
  out('algorithms on the whole graph (server time, values not returned; second run shows the cache):');
  const algos = [['degree', {}], ['pagerank', {}], ['betweenness', { samples: 256 }], ['louvain', { seed: 1 }], ['leiden', { seed: 1 }], ['components', {}], ['shortest_path', { source: 'syn:node:0' }], ['jaccard', { node: 'syn:node:1', k: 20 }]];
  for (const [algo, params] of algos) {
    const t = performance.now(); const res = await post(base, '/api/explore/algo/run', { algo, params, scope: { kind: 'all' }, values: false }); const wall = performance.now() - t;
    const t2 = performance.now(); await post(base, '/api/explore/algo/run', { algo, params, scope: { kind: 'all' }, values: false }); const cached = performance.now() - t2;
    J.algorithms[algo] = { serverMs: res.stats?.ms, wallMs: wall, cachedMs: cached, approximate: !!res.approximate, extra: res.modularity != null ? `modularity ${res.modularity.toFixed(3)}, ${res.count} communities` : res.count != null ? `${res.count} groups` : '' };
    out(`  ${algo.padEnd(14)} ${f(res.stats?.ms).padStart(7)} ms algorithm + ${f(res.stats?.buildMs).padStart(5)} ms scoped input, ${f(wall).padStart(7)} ms request${res.approximate ? ` (sampled, ${res.samples} pivots)` : ''}; cached ${f(cached)} ms ${J.algorithms[algo].extra ? '· ' + J.algorithms[algo].extra : ''}${res.error ? ' ERROR ' + res.error : ''}`);
  }
  if (browserOn && exe) {
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
    const fps = async (page, secs = 6) => page.evaluate(async secs => {
      const cam = __explore.renderer.getCamera(), dts = []; let last = performance.now(), stop = false;
      const tick = t => { dts.push(t - last); last = t; if (!stop) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
      const t0 = performance.now();
      await new Promise(res => { const step = () => { const k = (performance.now() - t0) / (secs * 1000); if (k >= 1) return res(); cam.setState({ x: 0.5 + 0.25 * Math.sin(k * 6.28), y: 0.5 + 0.25 * Math.cos(k * 6.28), ratio: 0.5 + 0.6 * Math.abs(Math.sin(k * 3.14)) }); requestAnimationFrame(step); }; step(); });
      stop = true; const fr = dts.slice(1); return { frames: fr.length, mean: fr.length / secs, median: fr.length ? 1000 / fr.slice().sort((a, b) => a - b)[Math.floor(fr.length / 2)] : 0, worstMs: fr.length ? Math.max(...fr) : null };
    }, secs);
    const modes = N <= 50000 ? [['full', '/explore?scope=full']] : [['focus (2-hop seed stream)', '/explore?scope=focus&seeds=syn:node:5000,syn:node:60000&hops=2&max=5000'], ['full', '/explore?scope=full']];
    for (const [mode, path] of modes) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; page.on('pageerror', e => errs.push(e.message));
      const t = performance.now();
      try {
        await page.goto(base + path); await page.waitForSelector('body[data-ready="1"]', { timeout: 600000 });
        const ready = performance.now() - t; const info = await page.evaluate(() => ({ n: __explore.graph.order, m: __explore.graph.size }));
        if (mode === 'full') { const tl = performance.now(); await page.waitForFunction(() => __explore.S.metrics.layoutRuns >= 1 && !/%/.test(document.querySelector('#status').textContent), null, { timeout: 240000, polling: 1000 }).then(() => out(`  (initial layout done ${f(performance.now() - tl)} ms after ready)`), () => out('  (initial layout still running after 240 s; fps measured while it runs)')); } else await page.waitForTimeout(3000);
        const fr = await fps(page, 8);
        // in-browser expand (streamed) of one more seed
        const ex = await page.evaluate(async id => { const st = await __explore.core.expandStream([id], { hops: 2, maxNodes: 2000, quiet: true }); return st && { first: st.firstChunkMs, ms: st.ms, nodes: st.nodes, newNodes: st.newNodes }; }, 'syn:node:777');
        // in-browser algorithm run mapped to colour
        const al = await page.evaluate(async () => { const t = performance.now(); const r = await __explore.core.runAlgo('louvain', { params: { seed: 1 }, scopeKind: 'visible', channels: ['color'] }); return { ms: performance.now() - t, server: r?.stats.ms, nodes: r?.scope.nodes }; });
        J.browser[mode] = { readyMs: ready, nodes: info.n, links: info.m, fps: fr, expand: ex, louvainVisible: al, errors: errs.length };
        out(`browser, ${mode}: ${info.n.toLocaleString()} nodes / ${info.m.toLocaleString()} links in view, ready in ${f(ready)} ms; pan/zoom over 8 s: ${fr.frames} frames = ${fr.mean.toFixed(1)} fps mean, ${fr.median.toFixed(1)} median, worst frame ${f(fr.worstMs)} ms (SwiftShader)`);
        out(`  streamed 2-hop expand in the page: first chunk ${f(ex?.first)} ms, done ${f(ex?.ms)} ms, ${ex?.newNodes} new nodes; Louvain on visible + colour map: ${f(al.ms)} ms (server ${f(al.server)} ms on ${al.nodes} nodes); page errors ${errs.length}`);
        if (N === 10000 || mode.startsWith('focus')) { await page.evaluate(() => __explore.renderer.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 })); await page.waitForTimeout(1500); }
        if (N === 10000 || mode.startsWith('focus')) await page.screenshot({ path: join(proof, `phase1-${N >= 100000 ? '100k-focus' : '10k'}.png`) });
      } catch (e) { J.browser[mode] = { error: e.message }; out(`browser, ${mode}: FAILED after ${f(performance.now() - t)} ms: ${e.message.split('\n')[0]}`); }
      await page.close();
    }
    await browser.close();
  }
  await app.close(); rmSync(dir, { recursive: true, force: true });
}
writeFileSync(join(proof, 'phase1-perf.txt'), lines.join('\n') + '\n');
writeFileSync(join(proof, 'phase1-perf.json'), JSON.stringify(json, null, 2));
process.exit(0);
