// Phase 2 "scale and readability" in Chrome (SPEC §24): semantic zoom (bubbles <-> nodes with real zoom and clicks), focus-scope
// overview without the graph, edge bundling, live layout switching with animation + seeds + saved views, the loaded/total
// badge, progress bar and cost dialog, and map point clustering with coordinated selection. Ids Q1..Q8.
// Screenshots go to proof/phase2-*.png. SCALE_UI_IMPL=wrong (UW1 wrong layouts, UW2 clusters never expand, UW3 map clusters
// ignore the selection) must make tests fail. Skips when no Chrome/Chromium is installed (set CHROME_PATH).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../server/app.js';
import { rng, mercator } from '../shared/layouts.js';

const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const built = existsSync(new URL('../public/bundle.worker.js', import.meta.url));
const skip = !exe ? 'no Chrome found (set CHROME_PATH)' : !built ? 'UI not built (npm run build:explore)' : false;
const PROOF = fileURLToPath(new URL('../../proof/', import.meta.url)); mkdirSync(PROOF, { recursive: true });
const SHOTS = process.env.PHASE2_SHOTS !== '0' && process.env.SCALE_UI_IMPL !== 'wrong';
let app, big, browser, dir; const errors = [];
// planted partition: 6 groups x 40 nodes, dated, geo-tagged per group
const G = 6, PER = 40, CITIES = [[-74, 40.7], [-0.1, 51.5], [139.7, 35.7], [151.2, -33.9], [-46.6, -23.5], [28, -26.2]];
async function seed(ex) {
  const r = rng(11), p = ex.producer('external'), nodes = [];
  for (let g = 0; g < G; g++) for (let i = 0; i < PER; i++) { const id = `p${g}_${i}`; nodes.push({ id, g }); p.push('node.upsert', { id, type: i % 3 ? 'Person' : 'Account', label: id, properties: { planted: g, when: new Date(Date.UTC(2024, 0, 1) + Math.floor(r() * 365) * 864e5).toISOString(), lat: CITIES[g][1] + (r() - 0.5) * 2, lon: CITIES[g][0] + (r() - 0.5) * 2 } }); }
  let k = 0; for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) if (r() < (nodes[a].g === nodes[b].g ? 0.25 : 0.004)) p.push('link.upsert', { id: `pl${k++}`, type: r() < 0.5 ? 'KNOWS' : 'PAYS', fromId: nodes[a].id, toId: nodes[b].id, properties: {} });
  await p.flush();
}
before(async () => {
  if (skip) return;
  const { chromium } = await import('playwright-core');
  const { startCombined } = await import('../combined.js');
  dir = mkdtempSync(join(tmpdir(), 'sgx-scaleui-'));
  app = await startCombined({ port: 0, dataDir: join(dir, 'a'), log: null, config: loadConfig(join(dir, 'none.json')) });
  await seed(app.ex);
  big = await startCombined({ port: 0, dataDir: join(dir, 'b'), log: null, config: loadConfig(join(dir, 'none.json')), synthetic: 12000 });
  browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
});
after(async () => { await browser?.close(); await app?.close(); await big?.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });
async function open(path = '/explore', server = app) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => errors.push(`${path}: ${e.message}`));
  await page.goto(`http://127.0.0.1:${server.port}${path}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 90000 });
  await page.waitForSelector('body[data-views-ready="1"]', { timeout: 90000 });
  return page;
}
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const visible = page => ev(page, () => { const r = __explore.renderer; return __explore.graph.filterNodes(n => !r.getNodeState(n).isHidden).sort(); });
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: join(PROOF, `phase2-${name}.png`) }); };
async function settle(page, quietMs = 500, maxMs = 20000) {
  const t0 = Date.now(); let last = null, since = Date.now();
  while (Date.now() - t0 < maxMs) { const cur = await ev(page, () => JSON.stringify(__explore.graph.nodes().slice(0, 400).map(id => { const a = __explore.graph.getNodeAttributes(id); return [Math.round(a.x * 10), Math.round(a.y * 10)]; }))); if (cur !== last) { last = cur; since = Date.now(); } else if (Date.now() - since >= quietMs) return; await page.waitForTimeout(100); }
}
const setRatio = (page, ratio) => ev(page, r => __explore.renderer.getCamera().setState({ ratio: r }), ratio);
const bubbles = page => ev(page, () => { const c = document.querySelector('#canvas').getBoundingClientRect(); return __explore.S.scale.drawn.filter(d => d.kind === 'bubble').map(d => ({ id: d.id, x: c.left + d.x, y: c.top + d.y, r: d.r })); });
const post = async (server, path, body) => (await fetch(`http://127.0.0.1:${server.port}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();

test('Q1 semantic zoom: zoomed out every community is one bubble (server counts), zoomed in the nodes return with hulls + labels', { skip }, async () => {
  const page = await open('/explore?clusters=on');
  await settle(page);
  await setRatio(page, 1.2); await page.waitForTimeout(400);
  const ov = await post(app, '/api/explore/clusters', { by: 'louvain', seed: 1234, maxClusters: 300 });
  assert.equal(await ev(page, () => document.body.dataset.clusters), 'overview');
  assert.deepEqual(await visible(page), [], 'every node is inside a bubble');
  assert.deepEqual(await ev(page, () => __explore.S.scale.ov.clusters.map(c => [c.id, c.count])), ov.clusters.map(c => [c.id, c.count]));
  assert.equal((await bubbles(page)).length, ov.clusters.length);
  assert.equal(ov.clusters.filter(c => c.count >= 30).length, G, 'the 6 planted groups');
  await shot(page, 'semantic-overview');
  await setRatio(page, 0.3); await page.waitForTimeout(500);
  assert.equal(await ev(page, () => document.body.dataset.clusters), 'detail');
  assert.equal((await visible(page)).length, G * PER, 'zoomed in: all nodes back');
  assert.ok(await ev(page, () => __explore.S.scale.drawn.filter(d => d.kind === 'hull').length) >= 1, 'hull labels drawn');
  await setRatio(page, 0.55); await page.waitForTimeout(300); await shot(page, 'semantic-detail');
  await page.close();
});

test('Q2 click a bubble: exactly its members appear (others stay aggregated); click its hull label: it collapses again', { skip }, async () => {
  const page = await open('/explore?clusters=on');
  await settle(page); await setRatio(page, 1.2); await page.waitForTimeout(400);
  const b = (await bubbles(page)).sort((x, y) => y.r - x.r)[0];
  await page.mouse.click(b.x, b.y); await page.waitForTimeout(900);
  const members = await ev(page, id => [...__explore.S.scale.membership].filter(([, c]) => c === id).map(([n]) => n).sort(), b.id);
  assert.ok(members.length >= 30);
  assert.deepEqual(await visible(page), members, 'only the clicked cluster opened');
  assert.equal(await ev(page, () => document.body.dataset.lastToggle), `expand:${b.id}`);
  await settle(page); await page.waitForTimeout(300);
  await shot(page, 'semantic-expand');
  const label = await ev(page, id => { const c = document.querySelector('#canvas').getBoundingClientRect(), d = __explore.S.scale.drawn.find(x => x.kind === 'hull' && x.id === id); return d && [c.left + (d.label[0] + d.label[2]) / 2, c.top + (d.label[1] + d.label[3]) / 2]; }, b.id);
  assert.ok(label, 'hull label for the opened cluster');
  await page.mouse.click(label[0], label[1]); await page.waitForTimeout(500);
  assert.deepEqual(await visible(page), []);
  assert.equal(await ev(page, () => document.body.dataset.lastToggle), `collapse:${b.id}`);
  await page.close();
});

test('Q3 focus scope on 12,000 nodes: the overview draws with 0 nodes loaded; clicking a bubble loads exactly that cluster', { skip }, async () => {
  const page = await open('/explore?scope=focus', big);
  await page.waitForFunction(() => Number(document.body.dataset.overview) > 0, null, { timeout: 60000 });
  assert.equal(await ev(page, () => __explore.graph.order), 0, 'nothing loaded for the overview');
  await page.waitForFunction(() => document.querySelector('#perf-badge').dataset.totalNodes, null, { timeout: 20000 });
  const badge = await ev(page, () => ({ ...document.querySelector('#perf-badge').dataset, text: document.querySelector('#perf-badge').textContent }));
  assert.equal(badge.totalNodes, '12000'); assert.equal(badge.loadedNodes, '0'); assert.match(badge.text, /0 \/ 12,000/);
  const bs = await bubbles(page), ov = await ev(page, () => __explore.S.scale.ov);
  assert.equal(bs.length, ov.clusters.length);
  await shot(page, 'focus-overview-12k');
  // the topmost bubble under the pointer gets the click; pick one whose centre no later (smaller) bubble covers
  const pick = bs.map((b, i) => ({ ...b, i })).filter(b => b.r > 8 && !bs.slice(b.i + 1).some(o => Math.hypot(o.x - b.x, o.y - b.y) < o.r + 3)).find(b => { const c = ov.clusters.find(x => x.id === b.id); return c.count > 50 && c.count <= 2000; });
  assert.ok(pick, 'a clickable bubble');
  const target = ov.clusters.find(c => c.id === pick.id);
  await page.mouse.click(pick.x, pick.y);
  await page.waitForFunction(n => __explore.graph.order >= n, target.count, { timeout: 30000 });
  const srv = await post(big, '/api/explore/clusters/members', { by: 'louvain', seed: 1234, maxClusters: 300, cluster: target.id, max: 5000 });
  assert.deepEqual((await ev(page, () => __explore.graph.nodes())).sort(), srv.ids.sort(), 'loaded = the cluster members');
  await page.waitForTimeout(300);
  assert.equal(await ev(page, () => document.querySelector('#perf-badge').dataset.loadedNodes), String(target.count));
  await page.waitForTimeout(800); await shot(page, 'focus-expand-12k');
  await page.close();
});

test('Q4 edge bundling: links become curves from a worker (endpoints on the nodes), sigma hides the straight ones; meta-edges bundle at overview', { skip }, async () => {
  const page = await open('/explore?clusters=off');
  await settle(page);
  await shot(page, 'bundle-before');
  await page.check('#bundle-on');
  await page.waitForFunction(() => Number(document.body.dataset.bundle) > 0, null, { timeout: 30000 });
  const r = await ev(page, () => { const X = __explore, b = X.S.scale.bundle, rr = X.renderer; let bad = 0, curved = 0;
    for (const [id, a] of b.paths) { const [s, t] = X.graph.extremities(id), p = X.graph.getNodeAttributes(s), q = X.graph.getNodeAttributes(t), n = a.length / 2;
      if (Math.hypot(a[0] - p.x, a[1] - p.y) > 1e-6 || Math.hypot(a[2 * n - 2] - q.x, a[2 * n - 1] - q.y) > 1e-6) bad++;
      const mx = a[2 * (n >> 1)], my = a[2 * (n >> 1) + 1], L = Math.hypot(q.x - p.x, q.y - p.y), off = Math.abs((q.x - p.x) * (my - p.y) - (q.y - p.y) * (mx - p.x)) / (L || 1); if (off > L * 0.02) curved++; }
    return { n: b.paths.size, total: X.graph.size, bad, curved, shown: X.graph.filterEdges(e => !rr.getEdgeState(e).isHidden).length, stats: b.stats };
  });
  assert.equal(r.n, r.total, 'every visible link bundled'); assert.equal(r.bad, 0, 'endpoints fixed'); assert.ok(r.curved > r.n * 0.3, `curved ${r.curved}/${r.n}`); assert.equal(r.shown, 0, 'straight links hidden while bundled');
  await shot(page, 'bundle-after');
  await page.selectOption('#cl-mode', 'on'); await setRatio(page, 1.2);
  await page.waitForFunction(() => __explore.S.scale.bundle.meta && __explore.S.scale.bundle.paths && __explore.S.scale.bundle.paths.size > 0 && !__explore.S.scale.bundle.running, null, { timeout: 30000 });
  await page.waitForTimeout(300); await shot(page, 'bundle-meta');
  await page.uncheck('#bundle-on'); await page.selectOption('#cl-mode', 'off'); await page.waitForTimeout(400);
  assert.equal(await ev(page, () => __explore.graph.filterEdges(e => !__explore.renderer.getEdgeState(e).isHidden).length), r.total, 'off again: straight links back');
  await page.close();
});

test('Q5 live layout switching: timeline / geo / community animate in; seeds reproduce; a saved view restores layout + seed', { skip }, async () => {
  const page = await open('/explore?clusters=off');
  await settle(page);
  const calm = () => page.waitForFunction(() => !__explore.S.metrics.degraded, null, { timeout: 15000 }); // §8.4 watchdog skips animation after a slow frame
  await page.fill('#layout-time', 'when'); await page.dispatchEvent('#layout-time', 'change');
  const pos = () => ev(page, () => Object.fromEntries(__explore.graph.nodes().map(id => [id, [__explore.graph.getNodeAttribute(id, 'x'), __explore.graph.getNodeAttribute(id, 'y')]])));
  await page.waitForTimeout(300); await calm();
  const before = await pos();
  await page.selectOption('#layout-kind', 'timeline');
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('layout: timeline'), null, { timeout: 10000 });
  await page.waitForTimeout(120);
  const mid = await pos();
  await settle(page);
  const tl = await ev(page, () => __explore.graph.nodes().map(id => { const a = __explore.graph.getNodeAttributes(id); return { id, x: a.x, y: a.y, t: Date.parse(a.item.properties.when) }; }));
  const moved = tl.filter(e => { const [x0, y0] = before[e.id], [x1, y1] = mid[e.id]; return Math.hypot(x1 - x0, y1 - y0) > 1e-6 && Math.hypot(e.x - x1, e.y - y1) > 1e-6; });
  assert.ok(moved.length > tl.length * 0.5, `animated: ${moved.length} nodes caught mid-way`);
  const sorted = [...tl].sort((a, b) => a.t - b.t);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].x >= sorted[i - 1].x - 1e-6, `timeline x follows "when" (${sorted[i - 1].id} -> ${sorted[i].id})`);
  await shot(page, 'layout-timeline');
  await page.selectOption('#layout-kind', 'geo'); await settle(page);
  const geo = await ev(page, () => __explore.graph.nodes().map(id => { const a = __explore.graph.getNodeAttributes(id); return { x: a.x, y: a.y, lat: a.item.properties.lat, lon: a.item.properties.lon }; }));
  const k = geo[0].x / mercator(geo[0].lon, geo[0].lat).x;
  for (const n of geo) { const m = mercator(n.lon, n.lat); assert.ok(Math.abs(n.x - m.x * k) < 1e-3 && Math.abs(n.y - m.y * k) < 1e-3, 'geo pinning = Web Mercator'); }
  await shot(page, 'layout-geo');
  await page.selectOption('#layout-kind', 'community'); await settle(page); await shot(page, 'layout-community');
  await page.selectOption('#layout-kind', 'force'); await settle(page, 700, 30000);
  const run = async s => { await page.fill('#layout-seed', String(s)); await page.dispatchEvent('#layout-seed', 'change'); await page.waitForTimeout(200); await settle(page, 700, 30000); return ev(page, () => __explore.graph.nodes().sort().map(id => [Math.round(__explore.graph.getNodeAttribute(id, 'x') * 100), Math.round(__explore.graph.getNodeAttribute(id, 'y') * 100)])); };
  const A = await run(7), B = await run(8), A2 = await run(7);
  assert.notDeepEqual(A, B); assert.deepEqual(A2, A, 'same seed, same drawing');
  await page.selectOption('#layout-kind', 'timeline'); await settle(page);
  const v = await ev(page, () => __explore.saveView('Q5 timeline'));
  await page.selectOption('#layout-kind', 'circular'); await page.fill('#layout-seed', '3'); await page.dispatchEvent('#layout-seed', 'change'); await settle(page);
  await ev(page, id => __explore.loadView(id, { animate: false }), v.id); await settle(page);
  assert.deepEqual(await ev(page, () => [__explore.S.layout.kind, __explore.S.layout.seed, __explore.S.layout.timeProperty, document.querySelector('#layout-kind').value, document.querySelector('#layout-seed').value]), ['timeline', 7, 'when', 'timeline', '7']);
  await page.close();
});

test('Q6 performance transparency: badge = loaded / server totals, progress bar during a streamed expand, cost shown and asked before a heavy run', { skip }, async () => {
  const page = await open('/explore?scope=focus&clusters=off', big);
  const c = await post(big, '/api/explore/cost', { op: 'overview' });
  await page.waitForFunction(() => document.querySelector('#perf-badge').dataset.totalNodes, null, { timeout: 20000 });
  assert.deepEqual(await ev(page, () => { const d = document.querySelector('#perf-badge').dataset; return [Number(d.totalNodes), Number(d.totalLinks), Number(d.loadedNodes)]; }), [c.nodes, c.links, 0]);
  const seen = await ev(page, async () => { const X = __explore, out = []; const p = X.core.expandStream(['syn:node:5'], { hops: 2, slowMs: 250, chunkSize: 3, quiet: true });
    for (let i = 0; i < 12; i++) { await new Promise(r => setTimeout(r, 120)); const el = document.querySelector('#load-progress'); out.push({ hidden: el.hidden, text: el.textContent }); } await p; await new Promise(r => setTimeout(r, 100)); out.push({ hidden: document.querySelector('#load-progress').hidden, end: true, order: X.graph.order }); return out; });
  assert.ok(seen.some(s => !s.hidden && /Loading neighbourhood: \d+/.test(s.text)), JSON.stringify(seen.slice(0, 4)));
  assert.equal(seen.at(-1).hidden, true); await page.waitForTimeout(200);
  assert.equal(await ev(page, () => document.querySelector('#perf-badge').dataset.loadedNodes), String(seen.at(-1).order));
  await shot(page, 'badge-focus');
  await page.selectOption('#algo', 'betweenness'); await page.waitForTimeout(300);
  const set = await ev(page, () => { const i = [...document.querySelectorAll('#algo-params input')].find(x => /exactMax/.test(x.name || x.id || x.dataset.p || x.title || '')); if (!i) return [...document.querySelectorAll('#algo-params input')].map(x => x.outerHTML); i.value = '50000'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); return 'ok'; });
  assert.equal(set, 'ok', JSON.stringify(set));
  await page.selectOption('#algo-scope', 'all').catch(() => {});
  await page.waitForTimeout(400);
  const runsBefore = await ev(page, () => __explore.S.core.runs);
  await page.click('#algo-run');
  await page.waitForSelector('#cost-dialog[open]', { timeout: 10000 });
  assert.match(await page.textContent('#cost-text'), /betweenness on 12,000 nodes .* takes about \d/);
  await shot(page, 'cost-dialog');
  await page.click('#cost-cancel'); await page.waitForTimeout(300);
  assert.equal(await ev(page, () => __explore.S.core.runs), runsBefore, 'cancel: nothing ran');
  await page.selectOption('#algo', 'pagerank'); await page.waitForTimeout(300);
  assert.match(await page.textContent('#algo-cost'), /≈ .* on 12,000 nodes/);
  await page.click('#algo-run'); await page.waitForFunction(n => __explore.S.core.runs > n, runsBefore, { timeout: 20000 });
  assert.equal(await page.$('#cost-dialog[open]'), null, 'cheap run: no dialog');
  await page.close();
});

test('Q7 map clustering: clusters sum to the points, split on click-zoom, hold the graph selection (ring), Shift-click selects their nodes', { skip }, async () => {
  const page = await open('/explore?mode=map&basemap=offline&mapcluster=1&clusters=off');
  await page.waitForFunction(() => __explore.mapView && __explore.mapView.map.loaded(), null, { timeout: 60000 });
  const idle = () => ev(page, () => new Promise(r => { __explore.mapSync(); const m = __explore.mapView.map; m.triggerRepaint(); m.once('idle', r); setTimeout(r, 4000); }));
  await ev(page, () => __explore.mapView.setCamera({ center: [20, 10], zoom: 0.6 })); await idle();
  const cl = await ev(page, () => __explore.mapView.renderedClusters());
  const singles = await ev(page, () => new Set(__explore.mapView.map.queryRenderedFeatures({ layers: ['sg-cl-point'] }).map(f => f.properties.id)).size);
  assert.ok(cl.length >= G - 1, `clusters ${cl.length}`);
  assert.equal(cl.reduce((s, c) => s + c.count, 0) + singles, G * PER, 'every point in one cluster or drawn alone');
  await ev(page, () => __explore.select('p2_3')); await idle(); await page.waitForTimeout(300); await idle();
  const withSel = await ev(page, () => __explore.mapView.renderedClusters().filter(c => c.sel > 0));
  assert.equal(withSel.length, 1, 'one cluster holds the selected node'); assert.ok(Math.abs(withSel[0].lon - 139.7) < 5, 'it is the Tokyo cluster');
  await shot(page, 'map-clusters');
  const box = await page.locator('#map canvas').boundingBox();
  const syd = (await ev(page, () => __explore.mapView.renderedClusters())).find(c => Math.abs(c.lon - 151.2) < 5);
  const px = await ev(page, ([lon, lat]) => __explore.mapView.project(lon, lat), [syd.lon, syd.lat]);
  await page.keyboard.down('Shift'); await page.mouse.click(box.x + px[0], box.y + px[1]); await page.keyboard.up('Shift'); await page.waitForTimeout(600);
  const sel = await ev(page, () => [...__explore.S.selected].sort());
  assert.equal(sel.length, syd.count); assert.ok(sel.every(id => id.startsWith('p3_')), 'Sydney nodes');
  const z0 = await ev(page, () => __explore.mapView.map.getZoom());
  const tok = (await ev(page, () => __explore.mapView.renderedClusters())).find(c => Math.abs(c.lon - 139.7) < 5), tp = await ev(page, ([lon, lat]) => __explore.mapView.project(lon, lat), [tok.lon, tok.lat]);
  await page.mouse.click(box.x + tp[0], box.y + tp[1]); await page.waitForTimeout(900); await idle();
  assert.ok(await ev(page, () => __explore.mapView.map.getZoom()) > z0 + 1, 'zoomed in');
  await page.close();
});

test('Q8 no page errors in any Phase 2 page', { skip }, () => { assert.deepEqual(errors, []); });
