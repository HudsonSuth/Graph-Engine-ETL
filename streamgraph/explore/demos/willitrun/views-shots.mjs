// Screenshots + perf proof for saved views, presenter mode and symbols (SPEC §19, §20).
//   node explore/demos/willitrun/views-shots.mjs   (needs Chrome/Edge: CHROME_PATH)
// Writes proof/views-*.png, proof/presenter-*.png, proof/icons-*.png and proof/icons-10k-perf.txt
import { chromium } from 'playwright-core';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startWillitrunDemo, APP_ROOT } from './run.js';
import { startCombined } from '../../combined.js';
import { loadConfig } from '../../server/app.js';

const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const PROOF = join(APP_ROOT, 'proof');
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const dir = mkdtempSync(join(tmpdir(), 'sgx-shots-'));
const app = await startWillitrunDemo({ port: 0, dataDir: dir, log: null });
const base = `http://127.0.0.1:${app.port}`;
const settle = async page => { await page.waitForFunction(() => __explore.graph.filterNodes((n, a) => a.symbol).length === __explore.graph.order || !__explore.S.style.symbols, null, { timeout: 60000 }); await page.waitForTimeout(1200); };
async function shot(path, file, act) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 960 } });
  await page.goto(base + path); await page.waitForSelector('body[data-views-ready="1"]', { timeout: 60000 });
  if (act) await act(page); await settle(page);
  await page.screenshot({ path: join(PROOF, file) }); console.log('wrote', file); return page;
}
for (const [id, f] of [['wir-overview', 'views-overview.png'], ['wir-rtx-5060', 'views-rtx-5060.png'], ['wir-macs', 'views-macs.png'], ['wir-moe', 'views-moe.png']]) await (await shot(`/explore?view=${id}`, f)).close();
// views panel with a freshly saved view + its link
await (await shot('/explore?view=wir-rtx-5060', 'views-panel-saved.png', async p => { await p.evaluate(async () => { await __explore.saveView('My RTX 5060 view'); document.querySelector('#view-list').value = 'my-rtx-5060-view'; }); })).close();
const pres = await shot('/explore?present=1&deck=willitrun-tour', 'presenter-1-overview.png');
for (const [i, f] of [[2, 'presenter-2-rtx-5060.png'], [3, 'presenter-3-macs.png'], [4, 'presenter-4-moe.png']]) { await pres.keyboard.press('ArrowRight'); await pres.waitForFunction(n => document.body.dataset.slide === String(n - 1), i); await settle(pres); await pres.screenshot({ path: join(PROOF, f) }); console.log('wrote', f); }
await pres.close();
// icons: close-up of symbols with fields, and a light-theme legend
await (await shot('/explore?view=wir-rtx-5060', 'icons-rtx-5060-closeup.png', async p => { await settle(p); await p.evaluate(async () => { const d = __explore.renderer.getNodeDisplayData('willitrun:node:hw:rtx-5060'); __explore.renderer.getCamera().setState({ x: d.x, y: d.y, ratio: 0.09, angle: 0 }); }); })).close();
await (await shot('/explore?view=wir-macs', 'icons-macs-closeup.png', async p => { await settle(p); await p.evaluate(async () => { const ids = __explore.graph.filterNodes((n, a) => a.type === 'Mac' && !__explore.renderer.getNodeState(n).isHidden); const d = __explore.renderer.getNodeDisplayData(ids[0]); __explore.renderer.getCamera().setState({ x: d.x, y: d.y, ratio: 0.16, angle: 0 }); }); })).close();
// symbol sheet: every frame / modifier / icon set side by side, drawn by the real composer
await (await shot('/explore', 'icons-sheet.png', async p => {
  await p.evaluate(async () => {
    const sets = [['lucide', 'gpu'], ['majesticons:line', 'laptop'], ['majesticons:solid', 'cpu']];
    const frames = ['circle', 'square', 'diamond', 'quatrefoil', 'hexagon', 'octagon', 'triangle', 'rectangle', 'shield'];
    const cfg = { version: 1, symbols: { size: 96, status: { colors: { ok: '#2E9E6B', warning: '#D9A21B', critical: '#D9483B' } } }, legend: { title: 'Symbol sheet' }, rules: [] };
    const g = __explore.graph; const nodes = g.nodes();
    let k = 0; for (let r = 0; r < 4; r++) for (let c = 0; c < frames.length; c++) {
      const id = nodes[k++]; if (!id) break; const it = g.getNodeAttribute(id, 'item');
      it.type = `T${r}${c}`; it.label = `${frames[c]} · ${sets[(r + c) % 3][0]}${r === 3 ? ' · dashed' : ''}`; it.properties = { f: frames[c], st: ['ok', 'warning', 'critical', 'ok'][r], est: r === 3, alerts: r === 2 ? c + 1 : 0, lock: r === 1 };
      g.mergeNodeAttributes(id, { x: c * 10, y: -r * 10, placed: true }); __explore.S.pinned.add(id);
      cfg.rules.push({ id: `n${r}${c}`, when: { kind: 'node', type: it.type }, apply: { size: 24, frame: frames[c], status: it.properties.st, glyph: `${sets[(r + c) % 3][0]}/${sets[(r + c) % 3][1]}`, ...(r === 3 ? { frameDash: 'dashed' } : {}), ...(r === 2 ? { corners: { ne: { kind: 'alert' }, se: { kind: 'count', value: c + 1 } } } : {}), ...(r === 1 ? { corners: { nw: { kind: 'lock' } } } : {}) } });
    }
    const keep = new Set(nodes.slice(0, k)); __explore.S.hiddenTypes = new Set([...new Set(g.mapNodes((n, a) => a.type))].filter(t => !t.startsWith('T')));
    __explore.applyStyleConfig(cfg, false); g.forEachEdge(e => g.dropEdge(e)); g.forEachNode(n => { if (!keep.has(n)) g.dropNode(n); }); __explore.S.hiddenTypes = new Set(); __explore.applyStyleConfig(cfg, false);
    __explore.renderer.refresh(); await new Promise(r => setTimeout(r, 1500)); __explore.renderer.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 });
  });
})).close();
await app.close();

// ---- 10k perf check: synthetic 10,000 nodes / 20,000 links, plain style vs symbol style, same page
const app2 = await startCombined({ port: 0, dataDir: dir, log: null, synthetic: 10000, config: loadConfig(join(dir, 'none.json')) });
const page = await browser.newPage({ viewport: { width: 1600, height: 960 } });
await page.goto(`http://127.0.0.1:${app2.port}/explore`); await page.waitForSelector('body[data-views-ready="1"]', { timeout: 120000 });
await page.waitForFunction(() => __explore.S.metrics.layoutRuns >= 1, null, { timeout: 120000 }); await page.waitForTimeout(1500); // initial force layout finished
const fps = () => page.evaluate(() => new Promise(r => { const t0 = performance.now(); let n = 0; const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }; requestAnimationFrame(f); }));
const sym = await page.evaluate(async () => {
  window.__plainStyle = __explore.S.styleConfig;
  const types = ['Person', 'Account', 'Device', 'Company', 'Address', 'Phone', 'Email', 'Transaction'], frames = ['circle', 'square', 'diamond', 'quatrefoil', 'hexagon', 'octagon', 'triangle', 'shield'], icons = ['user', 'wallet', 'smartphone', 'building-2', 'map-pin', 'phone', 'mail', 'arrow-left-right'];
  const cfg = { version: 1, symbols: {}, rules: types.map((t, i) => ({ id: t, when: { kind: 'node', type: t }, apply: { frame: frames[i], glyph: `lucide/${icons[i]}` } })).concat([{ id: 'hot', when: { kind: 'node', property: 'score', op: '>', value: 90 }, apply: { corners: { ne: { kind: 'alert' } } } }, { id: 'low', when: { kind: 'node', property: 'score', op: '<', value: 10 }, apply: { frameDash: 'dashed' } }]) };
  const t0 = performance.now(); __explore.applyStyleConfig(cfg, false);
  const tStyle = performance.now() - t0;
  while (__explore.graph.filterNodes((n, a) => a.symbol).length < __explore.graph.order) await new Promise(r => setTimeout(r, 50));
  return { nodes: __explore.graph.order, links: __explore.graph.size, styleApplyMs: Math.round(tStyle), allImagesMs: Math.round(performance.now() - t0), composed: __explore.atlas.composed, distinct: new Set(__explore.graph.mapNodes((n, a) => a.image)).size };
});
await page.waitForTimeout(1500);
const withSym = await fps();
await page.screenshot({ path: join(PROOF, 'icons-10k.png') }); console.log('wrote icons-10k.png');
await page.evaluate(() => __explore.applyStyleConfig(window.__plainStyle, false)); await page.waitForTimeout(1500);
const plain = await fps();
const txt = `# Symbols 10k perf check (SPEC §20.8) — ${new Date().toString()}
# Box: Linux, headless Chrome with SwiftShader (software WebGL). Frame rates here are NOT GPU numbers.
nodes ${sym.nodes}, links ${sym.links}
symbol images composed (atlas entries): ${sym.composed}, distinct per-node images: ${sym.distinct}
style apply (resolve 10k symbols + restyle): ${sym.styleApplyMs} ms
style apply -> every node drawn with its symbol: ${sym.allImagesMs} ms
fps symbol style (3 s idle sample, initial layout finished): ${withSym}
fps plain style (3 s idle sample, same page, style switched back): ${plain}
`;
writeFileSync(join(PROOF, 'icons-10k-perf.txt'), txt); console.log(txt);
await browser.close(); await app2.close(); rmSync(dir, { recursive: true, force: true }); process.exit(0);
