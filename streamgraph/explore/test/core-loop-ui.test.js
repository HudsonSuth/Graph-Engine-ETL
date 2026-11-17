// Phase 1 core loop, browser side (SPEC §23.2-§23.7): streamed expand, expand/collapse by relationship type from the
// context menu, paths + isolate, algorithm -> size / colour / edge width + legend, auto-recompute on a filter change,
// lasso + box selection with real mouse drags, bulk operations, context menus, keyboard shortcuts, focus scope.
// Ids C1..C10. Screenshots go to proof/phase1-*.png. CORE_UI_IMPL=wrong (lasso ignores y) must make C5 fail.
// Skips when no Chrome/Chromium is installed (set CHROME_PATH).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../server/app.js';
import { CORE_NODES, CORE_LINKS, seedCore, oraclePaths } from './core-fixtures.js';

const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const built = existsSync(new URL('../public/explore.js', import.meta.url));
const skip = !exe ? 'no Chrome found (set CHROME_PATH)' : !built ? 'UI not built (npm run build:explore)' : false;
const PROOF = fileURLToPath(new URL('../../proof/', import.meta.url)); mkdirSync(PROOF, { recursive: true });
const SHOTS = process.env.PHASE1_SHOTS !== '0' && process.env.CORE_UI_IMPL !== 'wrong';
let app, browser, dir; const errors = [];

before(async () => {
  if (skip) return;
  const { chromium } = await import('playwright-core');
  const { startCombined } = await import('../combined.js');
  dir = mkdtempSync(join(tmpdir(), 'sgx-coreui-'));
  const cfg = loadConfig(join(dir, 'none.json'));
  app = await startCombined({ port: 0, dataDir: dir, log: null, config: cfg });
  await seedCore(app.ex);
  browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
});
after(async () => { await browser?.close(); await app?.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });

async function open(path = '/explore') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => errors.push(`${path}: ${e.message}`));
  await page.goto(`http://127.0.0.1:${app.port}${path}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  await page.waitForSelector('body[data-views-ready="1"]', { timeout: 60000 });
  return page;
}
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const visible = page => ev(page, () => { const r = __explore.renderer; return __explore.graph.filterNodes(n => !r.getNodeState(n).isHidden).sort(); });
const nodes = page => ev(page, () => __explore.graph.nodes().sort());
/** wait until node viewport positions stop moving (layout worker + animation done) */
async function settle(page, quietMs = 400, maxMs = 15000) {
  const t0 = Date.now(); let last = null, stableSince = Date.now();
  while (Date.now() - t0 < maxMs) {
    const cur = JSON.stringify(await positions(page));
    if (cur !== last) { last = cur; stableSince = Date.now(); } else if (Date.now() - stableSince >= quietMs) return;
    await page.waitForTimeout(100);
  }
}
/** viewport (page) coordinates of every visible node */
const positions = page => ev(page, () => {
  const r = __explore.renderer, c = document.querySelector('#canvas').getBoundingClientRect(), out = {};
  __explore.graph.forEachNode(id => { if (r.getNodeState(id).isHidden) return; const d = r.getNodeDisplayData(id); if (!d) return; const p = r.framedGraphToViewport({ x: d.x, y: d.y }); out[id] = [Math.round(c.left + p.x), Math.round(c.top + p.y)]; });
  return out;
});
// independent even-odd point in polygon (does not use the app's implementation)
function pip(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }
async function drag(page, pts) { await page.mouse.move(...pts[0]); await page.mouse.down(); for (const p of pts.slice(1)) await page.mouse.move(p[0], p[1], { steps: 4 }); await page.mouse.up(); }
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: join(PROOF, `phase1-${name}.png`) }); };
async function menuKeys(page) { await page.waitForSelector('#ctx-menu:not([hidden])'); return ev(page, () => [...document.querySelectorAll('#ctx-menu .mi')].map(e => ({ key: e.dataset.key, text: e.textContent, dis: e.classList.contains('dis') }))); }
async function clickMenu(page, key) { await page.click(`#ctx-menu .mi[data-key="${key}"]`); }

test('C1 focus scope: ?scope=focus&seeds= streams only the seed neighbourhood; the badge shows loaded / total', { skip }, async () => {
  const page = await open('/explore?scope=focus&seeds=c0&hops=1');
  assert.equal(await ev(page, () => document.body.dataset.scope), 'focus');
  assert.deepEqual(await nodes(page), ['a1', 'a2', 'a3', 'acc1', 'c0']);
  const badge = await ev(page, () => { const b = document.querySelector('#scope-badge'); return { hidden: b.hidden, text: b.textContent }; });
  assert.equal(badge.hidden, false); assert.match(badge.text, /5 of 12 nodes/);
  await page.close();
});

test('C2 streamed expand draws chunks progressively (graph grows while the stream is open), then equals the 2-hop set', { skip }, async () => {
  const page = await open('/explore?scope=focus&seeds=c0&hops=0');
  assert.deepEqual(await nodes(page), ['c0']);
  const samples = await ev(page, async () => {
    const X = __explore, seen = []; let streamingSeen = false;
    const p = X.core.expandStream(['c0'], { hops: 2, chunkSize: 1, slowMs: 60 });
    const iv = setInterval(() => { seen.push(X.graph.order); if (document.body.dataset.streaming === '1') streamingSeen = true; }, 20);
    const st = await p; clearInterval(iv); seen.push(X.graph.order);
    return { seen, streamingSeen, st, after: document.body.dataset.streaming || null };
  });
  const distinct = [...new Set(samples.seen)];
  assert.ok(samples.streamingSeen, 'body[data-streaming] while the stream is open');
  assert.ok(distinct.length >= 4, `graph grew in steps while streaming: ${distinct.join(' -> ')}`);
  assert.equal(samples.after, null);
  assert.ok(samples.st.chunks >= 8 && samples.st.firstChunkMs < samples.st.ms, 'many chunks, first long before the end');
  assert.deepEqual(await nodes(page), ['a1', 'a2', 'a3', 'acc1', 'acc2', 'b1', 'b2', 'c0'], 'c0 + 2 hops');
  await settle(page); await shot(page, 'stream-focus');
  await page.close();
});

test('C3 right-click a node: per-relationship expand / collapse items with counts; Expand OWNS adds only acc1; Collapse OWNS hides it', { skip }, async () => {
  const page = await open('/explore?scope=focus&seeds=c0&hops=0');
  await settle(page);
  const pos = (await positions(page)).c0;
  await page.mouse.click(pos[0], pos[1], { button: 'right' });
  await page.waitForSelector('#ctx-menu .mi[data-key="expand:OWNS"]', { timeout: 10000 });
  const items = await menuKeys(page);
  const by = Object.fromEntries(items.map(i => [i.key, i.text]));
  assert.ok(by['expand:KNOWS'] && by['expand:OWNS'] && by['collapse:KNOWS'] && by['collapse:OWNS'], JSON.stringify(Object.keys(by)));
  assert.match(by['expand:KNOWS'], /3/); assert.match(by['expand:OWNS'], /1/);
  await shot(page, 'context-menu');
  await clickMenu(page, 'expand:OWNS');
  await page.waitForFunction(() => __explore.graph.hasNode('acc1') && !document.body.dataset.streaming);
  assert.deepEqual(await nodes(page), ['acc1', 'c0'], 'only the OWNS neighbour');
  // expand KNOWS via the menu too, then collapse OWNS: acc1 hidden, a1..a3 stay
  await settle(page);
  let p2 = (await positions(page)).c0; await page.mouse.click(p2[0], p2[1], { button: 'right' });
  await page.waitForSelector('#ctx-menu .mi[data-key="expand:KNOWS"]'); await clickMenu(page, 'expand:KNOWS');
  await page.waitForFunction(() => __explore.graph.order === 5 && !document.body.dataset.streaming);
  await settle(page);
  p2 = (await positions(page)).c0; await page.mouse.click(p2[0], p2[1], { button: 'right' });
  await page.waitForSelector('#ctx-menu .mi[data-key="collapse:OWNS"]'); await clickMenu(page, 'collapse:OWNS');
  assert.deepEqual(await visible(page), ['a1', 'a2', 'a3', 'c0']);
  // plain "Collapse neighbours" hides the rest; Expand neighbours brings them back
  await ev(page, () => { __explore.core.collapseBy(['c0']); });
  assert.deepEqual(await visible(page), ['c0']);
  await ev(page, () => __explore.core.expandStream(['c0'], { hops: 1 }));
  assert.deepEqual(await visible(page), ['a1', 'a2', 'a3', 'acc1', 'c0']);
  await page.close();
});

test('C4 find paths: all simple paths up to the hop limit equal the brute-force oracle; isolate shows only path nodes', { skip }, async () => {
  const page = await open('/explore');
  await settle(page);
  const r = await ev(page, () => __explore.core.findPaths('c0', 'b1', { maxHops: 4, mode: 'all' }));
  const want = oraclePaths(CORE_LINKS, 'c0', 'b1', 4);
  assert.deepEqual(r.paths.map(p => p.nodeIds.join('>')).sort(), want.map(p => p.join('>')).sort());
  assert.deepEqual(r.shortest.nodeIds, ['c0', 'a1', 'b1']);
  const listed = await ev(page, () => document.querySelectorAll('#paths-list .path-item').length);
  assert.equal(listed, want.length + 1, 'one row per path + "All"');
  await page.check('#paths-isolate');
  const union = [...new Set(want.flat())].sort();
  assert.deepEqual(await visible(page), union);
  await page.click('#paths-list .path-item[data-i="0"]');
  assert.deepEqual(await visible(page), ['a1', 'b1', 'c0'], 'isolating the first (shortest) path');
  const hl = await ev(page, () => [...__explore.S.pathIds.linkIds].sort());
  assert.deepEqual(hl, ['k1', 'k4']);
  await settle(page); await shot(page, 'paths-isolate');
  await page.uncheck('#paths-isolate');
  assert.equal((await visible(page)).length, 12);
  await page.close();
});

test('C5 lasso and box selection with real mouse drags select exactly the nodes inside the drawn shape; Shift adds, Alt removes', { skip }, async () => {
  const page = await open('/explore');
  await settle(page);
  const P = await positions(page), ids = Object.keys(P);
  // only use nodes not covered by panels (bulk bar, legend, menus): a drag must start on the canvas
  const free = await ev(page, pts => Object.fromEntries(Object.entries(pts).map(([id, [x, y]]) => [id, !!document.elementFromPoint(x, y)?.closest('#canvas')])), P);
  // pick a node whose vertical neighbours exist: a thin lasso around it must not catch nodes above / below it
  let best = null;
  for (const id of ids) {
    const [x, y] = P[id];
    const lasso = [[x - 14, y], [x - 4, y - 14], [x + 4, y - 14], [x + 14, y], [x + 4, y + 14], [x - 4, y + 14]];
    const inside = ids.filter(o => pip(...P[o], lasso));
    const sameColumn = ids.filter(o => !inside.includes(o) && P[o][0] >= x - 14 && P[o][0] <= x + 14);
    if (!free[id] || !lasso.every(([px, py]) => px > 0)) continue;
    if (inside.length && (!best || sameColumn.length > best.sameColumn.length)) best = { id, lasso, inside, sameColumn };
  }
  // if the layout put no node in the same column, use a wide flat band instead (still discriminates on y)
  if (!best.sameColumn.length) {
    const ys = ids.map(i => P[i][1]).sort((a, b) => a - b), mid = ys[Math.floor(ys.length / 2)];
    const xs = ids.map(i => P[i][0]); const band = [[Math.min(...xs) - 20, ys[0] - 10], [Math.max(...xs) + 20, ys[0] - 10], [Math.max(...xs) + 20, mid - 1], [Math.min(...xs) - 20, mid - 1]];
    best = { id: null, lasso: band, inside: ids.filter(o => pip(...P[o], band)), sameColumn: ids.filter(o => !pip(...P[o], band)) };
  }
  assert.ok(best.inside.length >= 1 && best.sameColumn.length >= 1, 'the shape is discriminating');
  await page.keyboard.press('l');
  assert.equal(await ev(page, () => document.body.dataset.tool), 'lasso');
  await drag(page, [...best.lasso, best.lasso[0]]);
  const sel = await ev(page, () => [...__explore.S.selected].sort());
  assert.deepEqual(sel, [...best.inside].sort(), 'lasso selected exactly the nodes inside');
  assert.equal(await ev(page, () => document.body.dataset.tool), '', 'tool closes after one gesture');
  // box with Shift adds; computed independently
  await ev(page, () => __explore.core.updateBulkbar());
  const free2 = await ev(page, pts => Object.fromEntries(Object.entries(pts).map(([id, [x, y]]) => [id, [[-10, -10], [10, 10], [0, 0]].every(([dx, dy]) => !!document.elementFromPoint(x + dx, y + dy)?.closest('#canvas'))])), P);
  const others = ids.filter(o => !best.inside.includes(o) && free2[o]);
  const t = P[others[0]], box = [[t[0] - 10, t[1] - 10], [t[0] + 10, t[1] + 10]];
  const inBox = ids.filter(o => P[o][0] >= box[0][0] && P[o][0] <= box[1][0] && P[o][1] >= box[0][1] && P[o][1] <= box[1][1]);
  await page.click('[data-tool="box"]');
  await page.keyboard.down('Shift'); await drag(page, box); await page.keyboard.up('Shift');
  const sel2 = await ev(page, () => [...__explore.S.selected].sort());
  assert.deepEqual(sel2, [...new Set([...best.inside, ...inBox])].sort(), 'Shift+box adds');
  assert.match(await page.textContent('#bulk-count'), new RegExp(`${sel2.length} selected`));
  // Alt+box removes
  await page.keyboard.press('b'); await page.keyboard.down('Alt'); await drag(page, box); await page.keyboard.up('Alt');
  assert.deepEqual(await ev(page, () => [...__explore.S.selected].sort()), [...best.inside].filter(i => !inBox.includes(i)).sort(), 'Alt+box removes');
  // a full-canvas box selects everything visible
  const xs = ids.map(i => P[i][0]), ys = ids.map(i => P[i][1]);
  await page.keyboard.press('b'); await drag(page, [[Math.min(...xs) - 25, Math.min(...ys) - 25], [Math.max(...xs) + 25, Math.max(...ys) + 25]]);
  assert.equal((await ev(page, () => [...__explore.S.selected])).length, 12);
  await page.close();
});

test('C6 algorithms map to size, colour (legend) and edge width; filter-scoped encodings re-run when the filter changes', { skip }, async () => {
  const page = await open('/explore');
  await settle(page);
  await page.selectOption('#algo', 'degree'); await page.selectOption('#algo-scope', 'all');
  await page.click('#algo-map-size');
  await page.waitForFunction(() => document.body.dataset.enc?.includes('size:degree'));
  const sizes = await ev(page, () => Object.fromEntries(__explore.graph.mapNodes((id, a) => [id, a.size])));
  // degree from the edge list: c0 = 4, z1 = 1; larger degree -> larger node
  const deg = {}; for (const [, s, t] of CORE_LINKS) { deg[s] = (deg[s] || 0) + 1; deg[t] = (deg[t] || 0) + 1; }
  for (const a of Object.keys(deg)) for (const b of Object.keys(deg)) if (deg[a] > deg[b]) assert.ok(sizes[a] > sizes[b], `size(${a})=${sizes[a]} > size(${b})=${sizes[b]}`);
  await page.selectOption('#algo', 'leiden'); await page.click('#algo-map-color');
  await page.waitForFunction(() => document.body.dataset.enc?.includes('color:leiden'));
  const leg = await ev(page, () => ({ rows: document.querySelectorAll('#enc-legend .enc-row[data-cat]').length, count: __explore.S.core.result.count, hidden: document.querySelector('#enc-legend').hidden, colors: new Set(__explore.graph.mapNodes((id, a) => a.color)).size }));
  assert.equal(leg.hidden, false); assert.equal(leg.rows, leg.count, 'one legend row per community'); assert.equal(leg.colors, leg.count);
  // clicking a legend row selects that community
  await page.click('#enc-legend .enc-row[data-cat="0"]');
  const comm0 = await ev(page, () => [...__explore.S.enc.color.values].filter(([, v]) => v === 0).map(([id]) => id).sort());
  assert.deepEqual(await ev(page, () => [...__explore.S.selected].sort()), comm0);
  await page.selectOption('#algo', 'pagerank'); await page.click('#algo-map-edge');
  await page.waitForFunction(() => document.body.dataset.enc?.includes('edge:pagerank'));
  const w = await ev(page, () => Object.fromEntries(__explore.graph.mapEdges((e, a) => [a.item.id, a.size])));
  assert.ok(new Set(Object.values(w)).size > 3, 'edge widths vary with PageRank');
  await ev(page, () => __explore.clearSelection());
  await settle(page); await shot(page, 'algo-encodings');
  // filter scope + auto recompute: hide Accounts -> leiden re-runs on 9 nodes
  await page.selectOption('#algo', 'louvain'); await page.selectOption('#algo-scope', 'filter'); await page.click('#algo-map-color');
  await page.waitForFunction(() => document.body.dataset.enc?.includes('color:louvain'));
  const runs0 = await ev(page, () => __explore.S.core.runs);
  await ev(page, () => __explore.toggleType('Account'));
  await page.waitForFunction(r => __explore.S.core.runs > r && !document.body.dataset.algoBusy, runs0, { timeout: 10000 });
  const rr = await ev(page, () => ({ nodes: __explore.S.core.result.scope.nodes, ids: Object.keys(__explore.S.core.result.values).sort() }));
  assert.equal(rr.nodes, 9); assert.ok(!rr.ids.some(id => id.startsWith('acc')), 'accounts are out of scope after the filter change');
  await ev(page, () => __explore.toggleType('Account'));
  await page.waitForFunction(r => __explore.S.core.runs > r + 1 && !document.body.dataset.algoBusy, runs0, { timeout: 10000 });
  assert.equal(await ev(page, () => __explore.S.core.result.scope.nodes), 12);
  await page.click('#algo-clear');
  assert.equal(await ev(page, () => document.body.dataset.enc || null), null);
  await page.close();
});

test('C7 bulk bar: hide / show, pin, isolate (set as filter), analyze selection, save as view, selection-driven query', { skip }, async () => {
  const page = await open('/explore');
  await settle(page);
  await ev(page, () => __explore.core.applySelection(['a1', 'a2', 'b1']));
  assert.equal(await page.isVisible('#bulkbar'), true); assert.match(await page.textContent('#bulk-count'), /3 selected/);
  await page.click('#bulk-hide');
  assert.deepEqual((await visible(page)).filter(i => ['a1', 'a2', 'b1'].includes(i)), []);
  await page.keyboard.press('Shift+H');
  assert.equal((await visible(page)).length, 12);
  await ev(page, () => __explore.core.applySelection(['a1', 'a2', 'b1']));
  await page.click('#bulk-pin');
  assert.deepEqual(await ev(page, () => [...__explore.S.pinned].sort()), ['a1', 'a2', 'b1']);
  await page.click('#bulk-isolate');
  assert.deepEqual(await visible(page), ['a1', 'a2', 'b1']);
  await page.keyboard.press('x');
  assert.equal((await visible(page)).length, 12);
  await page.selectOption('#algo', 'degree');
  await page.click('#bulk-analyze');
  await page.waitForFunction(() => __explore.S.core.result?.scopeKind === 'selection' && !document.body.dataset.algoBusy);
  const an = await ev(page, () => ({ n: __explore.S.core.result.scope.nodes, v: __explore.S.core.result.values }));
  assert.equal(an.n, 3); assert.deepEqual(an.v, { a1: 1, a2: 1, b1: 2 }, 'degree inside the selection-induced subgraph');
  page.once('dialog', d => d.accept('Selection test'));
  await page.click('#bulk-view');
  await page.waitForFunction(() => __explore.views.list.some(v => v.name === 'Selection test'));
  const view = await (await fetch(`http://127.0.0.1:${app.port}/api/explore/views/selection-test`)).json();
  const vs = view.view?.state || view.state;
  assert.deepEqual([...vs.selection].sort(), ['a1', 'a2', 'b1']); assert.deepEqual(vs.filters.neighborhood, { ids: vs.filters.neighborhood.ids, depth: 0 });
  assert.deepEqual([...vs.filters.neighborhood.ids].sort(), ['a1', 'a2', 'b1']);
  await page.close();
  // the selection drives a new query: in focus mode, query 1 hop over KNOWS from {a2}
  const p2 = await open('/explore?scope=focus&seeds=a2&hops=0');
  await ev(p2, () => __explore.core.applySelection(['a2']));
  await p2.fill('#q-hops', '1'); await p2.selectOption('#q-dir', 'both');
  await ev(p2, () => { const s = document.querySelector('#q-types'); s.innerHTML = '<option selected>KNOWS</option><option>OWNS</option>'; s.dataset.types = 'KNOWS\u0001OWNS'; });
  await p2.click('#bulk-query');
  await p2.waitForFunction(() => __explore.graph.order > 1 && !document.body.dataset.streaming);
  assert.deepEqual(await nodes(p2), ['a2', 'b1', 'b2', 'c0']);
  // the saved view opens as exactly those three nodes
  const p3 = await open('/explore?view=selection-test');
  await p3.waitForFunction(() => __explore.S.currentView?.id === 'selection-test');
  assert.deepEqual(await visible(p3), ['a1', 'a2', 'b1']);
  await p2.close(); await p3.close();
});

test('C8 right-click a link and the canvas: link menu (hide type, expand ends by type) and canvas menu (lasso, box, help)', { skip }, async () => {
  const page = await open('/explore');
  await settle(page);
  // a TRANSFER link: right-click its midpoint
  const mid = await ev(page, () => {
    const r = __explore.renderer, c = document.querySelector('#canvas').getBoundingClientRect(), g = __explore.graph;
    const e = g.findEdge((e, a) => a.item.id === 't2'); const [s, t] = g.extremities(e);
    const v = id => { const d = r.getNodeDisplayData(id); return r.framedGraphToViewport({ x: d.x, y: d.y }); };
    const a = v(s), b = v(t); return [c.left + (a.x + b.x) / 2, c.top + (a.y + b.y) / 2];
  });
  await page.mouse.click(mid[0], mid[1], { button: 'right' });
  const items = await menuKeys(page);
  assert.ok(items.some(i => i.key === 'hidetype' && /TRANSFER/.test(i.text)), JSON.stringify(items));
  assert.ok(items.some(i => i.key === 'expandtype'));
  await clickMenu(page, 'hidetype');
  assert.ok(await ev(page, () => __explore.S.hiddenEdgeTypes.has('TRANSFER')));
  // canvas menu at an empty corner
  const c = await ev(page, () => { const r = document.querySelector('#canvas').getBoundingClientRect(); return [r.left + 8, r.bottom - 8]; });
  await page.mouse.click(c[0], c[1], { button: 'right' });
  const st = await menuKeys(page);
  for (const k of ['fit', 'selectall', 'lasso', 'box', 'unhide', 'clearfilter', 'help']) assert.ok(st.some(i => i.key === k), k);
  await page.keyboard.press('Escape');
  assert.equal(await page.isVisible('#ctx-menu'), false, 'Esc closes the menu');
  await page.mouse.click(c[0], c[1], { button: 'right' }); await clickMenu(page, 'selectall');
  assert.equal(await ev(page, () => __explore.S.selected.size), 12);
  await page.close();
});

test('C9 keyboard: E expands (streamed), H hides, Shift+H shows, P pins, N adds neighbours, L/B tools, Esc; ? lists every shortcut', { skip }, async () => {
  const page = await open('/explore?scope=focus&seeds=b2&hops=0');
  await ev(page, () => __explore.core.applySelection(['b2']));
  await page.locator('body').focus();
  await page.keyboard.press('e');
  await page.waitForFunction(() => __explore.graph.order === 2 && !document.body.dataset.streaming);
  assert.deepEqual(await nodes(page), ['a2', 'b2']);
  await page.keyboard.press('Shift+E');
  await page.waitForFunction(() => __explore.graph.order > 2 && !document.body.dataset.streaming);
  assert.deepEqual(await nodes(page), ['a2', 'b1', 'b2', 'c0'], 'b2 + 2 hops');
  await page.keyboard.press('n');
  assert.deepEqual(await ev(page, () => [...__explore.S.selected].sort()), ['a2', 'b2']);
  await page.keyboard.press('p');
  assert.deepEqual(await ev(page, () => [...__explore.S.pinned].sort()), ['a2', 'b2']);
  await page.keyboard.press('h');
  assert.deepEqual(await visible(page), ['b1', 'c0']);
  await page.keyboard.press('Shift+H');
  assert.equal((await visible(page)).length, 4);
  await page.keyboard.press('l'); assert.equal(await ev(page, () => document.body.dataset.tool), 'lasso');
  await page.keyboard.press('b'); assert.equal(await ev(page, () => document.body.dataset.tool), 'box');
  await page.keyboard.press('Escape'); assert.equal(await ev(page, () => document.body.dataset.tool), '');
  await page.keyboard.press('?');
  assert.equal(await ev(page, () => document.querySelector('#help-dialog').open), true);
  const rows = await ev(page, () => [...document.querySelectorAll('#help-list kbd')].map(k => k.textContent));
  const want = await ev(page, () => __explore.core.SHORTCUTS.map(s => s[0]));
  assert.deepEqual(rows, want); assert.ok(rows.length >= 18);
  await shot(page, 'shortcuts');
  await page.close();
});

test('C10 no page errors in any Phase 1 page', { skip }, () => { assert.deepEqual(errors, []); });
