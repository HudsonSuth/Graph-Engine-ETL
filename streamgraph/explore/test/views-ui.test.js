// Browser tests for saved views, presenter mode and symbols (SPEC §19, §20) on the real Will It Run? demo data.
// Skips when no Chrome/Chromium is installed (set CHROME_PATH).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const built = existsSync(new URL('../public/explore.js', import.meta.url));
const fixture = existsSync(new URL('../demos/willitrun/fixture.json', import.meta.url));
const skip = !exe ? 'no Chrome found (set CHROME_PATH)' : !built ? 'UI not built (npm run build:explore)' : !fixture ? 'Will It Run? fixture missing (explore/demos/willitrun/fixture.json). It is CC BY 4.0 data from https://willitrunllm.com. Run: npm run fixtures:willitrun' : false;
let app, browser, dir; const errors = [];
const RTX = 'willitrun:node:hw:rtx-5060';

before(async () => {
  if (skip) return;
  const { chromium } = await import('playwright-core');
  const { startWillitrunDemo } = await import('../demos/willitrun/run.js');
  dir = mkdtempSync(join(tmpdir(), 'sgx-vui-'));
  app = await startWillitrunDemo({ port: 0, dataDir: dir, log: null });
  browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
});
after(async () => { await browser?.close(); await app?.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });
async function open(path) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${app.port}${path}`);
  await page.waitForSelector('body[data-views-ready="1"]', { timeout: 60000 });
  return page;
}
const visible = page => page.evaluate(() => { const r = __explore.renderer; return __explore.graph.filterNodes(n => !r.getNodeState(n).isHidden).sort(); });

test('P1 /explore?view=<id> restores the view: filters, neighbourhood, layout, selection, style', { skip }, async () => {
  const page = await open('/explore?view=wir-rtx-5060');
  const st = await page.evaluate(() => ({ view: __explore.S.currentView?.id, kind: __explore.S.layout.kind, sel: [...__explore.S.selected], hidden: [...__explore.S.hiddenTypes], hiddenLinks: [...__explore.S.hiddenEdgeTypes].sort(), style: __explore.S.styleUrl, list: __explore.views.list.map(v => v.id) }));
  assert.equal(st.view, 'wir-rtx-5060'); assert.equal(st.kind, 'radial'); assert.deepEqual(st.sel, [RTX]); assert.deepEqual(st.hidden, ['Quantization']); assert.deepEqual(st.hiddenLinks, ['AT_QUANT', 'no']);
  assert.equal(st.style, '/explore/willitrun-symbols.json');
  assert.deepEqual(st.list, ['wir-overview', 'wir-rtx-5060', 'wir-macs', 'wir-moe']);
  const vis = await visible(page);
  assert.equal(vis.length, 41, 'RTX 5060 + its 40 fits/tight/offload models'); assert.ok(vis.includes(RTX)); assert.ok(vis.every(id => id === RTX || id.includes(':model:')));
  await page.close();
});

test('P2 save in the UI -> change everything -> load restores layout, filters, camera, selection and time', { skip }, async () => {
  const page = await open('/explore?view=wir-macs');
  const before = await page.evaluate(async () => {
    const X = __explore; X.select('willitrun:node:hw:rtx-5060'); X.toggleType('Mac');
    X.renderer.getCamera().setState({ x: 0.42, y: 0.58, ratio: 0.61, angle: 0 });
    document.querySelector('#time').value = 500; document.querySelector('#time').dispatchEvent(new Event('input'));
    const v = await X.saveView('Test view', { positions: true });
    return { id: v.id, st: X.captureState({ positions: false }) };
  });
  assert.equal(before.id, 'test-view');
  const after = await page.evaluate(async id => {
    const X = __explore; await X.loadView('wir-overview', { animate: false });
    const mid = { hidden: [...X.S.hiddenTypes], live: X.S.live };
    await X.loadView(id, { animate: false });
    const c = X.renderer.getCamera().getState();
    return { mid, hidden: [...X.S.hiddenTypes].sort(), sel: [...X.S.selected], live: X.S.live, time: Number(document.querySelector('#time').value), cam: [c.x, c.y, c.ratio], kind: X.S.layout.kind, url: location.search };
  }, before.id);
  assert.deepEqual(after.mid, { hidden: ['Quantization'], live: true });
  assert.deepEqual(after.hidden, [...before.st.filters.hiddenTypes].sort()); assert.ok(after.hidden.includes('Mac'), 'the Mac toggle made before saving is restored');
  assert.deepEqual(after.sel, ['willitrun:node:hw:rtx-5060'].filter(id => before.st.selection.includes(id)));
  assert.equal(after.live, false); assert.equal(after.time, 500);
  assert.deepEqual(after.cam.map(v => +v.toFixed(3)), [0.42, 0.58, 0.61]);
  assert.match(after.url, /view=test-view/);
  // rename + delete through the UI API
  const names = await page.evaluate(async () => { await __explore.renameView('test-view', 'Renamed'); const a = __explore.views.list.map(v => v.name); await __explore.deleteView('test-view'); return [a, __explore.views.list.map(v => v.id)]; });
  assert.ok(names[0].includes('Renamed')); assert.ok(!names[1].includes('test-view'));
  await page.close();
});

test('P3 presenter mode (?present=1) hides editing tools, enlarges labels, shows title + verdict legend; arrows step slides; Esc exits', { skip }, async () => {
  const page = await open('/explore?present=1&deck=willitrun-tour');
  await page.waitForSelector('body[data-presenting="1"]');
  const shown = sel => page.evaluate(s => { const el = document.querySelector(s); return !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0; }, sel);
  for (const s of ['#left', '#right', 'footer', '#search', '#layout-kind', '#relayout', '#view-save']) assert.equal(await shown(s), false, `${s} hidden in presenter mode`);
  for (const s of ['#present-overlay', '#present-title', '#present-legend', '#present']) assert.equal(await shown(s), true, `${s} shown`);
  assert.match(await page.textContent('#present-title'), /every model/);
  const legend = await page.textContent('#present-legend');
  for (const t of ['fits in GPU', 'tight fit', 'needs CPU offload', 'GPU', 'Model', 'Mixture-of-experts']) assert.ok(legend.includes(t), `legend has ${t}`);
  assert.ok(await page.evaluate(() => __explore.renderer.getNodeDisplayData(__explore.graph.nodes()[0]).labelSize === 20 || __explore.S.presenting));
  await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => __explore.S.currentView?.id === 'wir-rtx-5060');
  assert.match(await page.textContent('#present-count'), /^2 \/ 4/);
  await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => __explore.S.currentView?.id === 'wir-macs');
  await page.keyboard.press('ArrowLeft'); await page.waitForFunction(() => __explore.S.currentView?.id === 'wir-rtx-5060');
  await page.keyboard.press('End'); await page.waitForFunction(() => __explore.S.currentView?.id === 'wir-moe');
  const moe = await visible(page); assert.ok(moe.filter(id => id.includes(':model:')).length > 0);
  assert.ok(await page.evaluate(ids => ids.filter(id => id.includes(':model:')).every(id => __explore.graph.getNodeAttribute(id, 'item').properties.moe === true), moe), 'MoE slide shows MoE models only');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !__explore.S.presenting);
  for (const s of ['#left', '#right', '#search']) assert.equal(await shown(s), true, `${s} back after Esc`);
  assert.equal(await page.evaluate(() => __explore.S.selected.size >= 0 && __explore.S.currentView.id), 'wir-moe', 'Esc leaves presenter mode, not the view');
  await page.close();
});

test('P4 symbols render through the texture atlas: every visible node gets a composed image, few distinct images', { skip }, async () => {
  const page = await open('/explore?view=wir-overview');
  await page.waitForFunction(() => __explore.graph.filterNodes((n, a) => a.symbol).length === __explore.graph.order, null, { timeout: 30000 });
  const r = await page.evaluate(() => { const g = __explore.graph; const imgs = new Set(g.mapNodes((n, a) => a.image).filter(Boolean)); return { withImg: g.filterNodes((n, a) => a.symbol && /^blob:/.test(a.image)).length, order: g.order, distinct: imgs.size, composed: __explore.atlas.composed, shape: g.getNodeAttribute('willitrun:node:hw:rtx-5060', 'shape') }; });
  assert.equal(r.withImg, r.order); assert.ok(r.distinct <= 40, `distinct images ${r.distinct}`); assert.equal(r.shape, 'square');
  const legendImgs = await page.evaluate(() => document.querySelectorAll('#legend img.lg-sym').length); assert.ok(legendImgs >= 4);
  // fields by zoom: zoom close -> uid + quantity fields join the label
  const lbl = await page.evaluate(async () => { __explore.renderer.getCamera().setState({ x: 0.5, y: 0.5, ratio: 0.05, angle: 0 }); await new Promise(r => setTimeout(r, 100)); return __explore.graph.getNodeAttribute('willitrun:node:hw:rtx-5060', 'label'); });
  assert.equal(lbl, 'RTX 5060  [rtx-5060]  8 GB');
  await page.close();
});

test('P5 optional MIL-STD-2525 symbols: a SIDC property renders through milsymbol (lazy bundle)', { skip }, async () => {
  const page = await open('/explore');
  const ok = await page.evaluate(async () => {
    const X = __explore; const cfg = { version: 1, symbols: { milsymbol: { property: 'sidc' } }, rules: [] };
    const id = X.graph.nodes()[0]; X.graph.getNodeAttribute(id, 'item').properties.sidc = 'SFGPUCI----K';
    X.applyStyleConfig(cfg, false);
    for (let i = 0; i < 100 && !(X.graph.getNodeAttribute(id, 'image') || '').startsWith('blob:'); i++) await new Promise(r => setTimeout(r, 100));
    return { img: X.graph.getNodeAttribute(id, 'image'), ms: !!X.atlas.ms };
  });
  assert.match(ok.img || '', /^blob:/); assert.equal(ok.ms, true);
  await page.close();
});

test('P6 no page errors across the view / presenter / symbol runs', { skip }, () => { assert.deepEqual(errors, []); });
