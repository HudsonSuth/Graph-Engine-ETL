// Composable node symbols (SPEC §20): style compilation, modifiers, zoom fields, icon sets + licences, atlas key economy.
// SYMBOLS_IMPL=wrong swaps in the deliberately wrong resolver; S1, S2 and S5 must then fail (wrong-impl.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileStyle } from '../shared/style.js';
import { fieldLabel, fieldLevel, iconPath, FRAMES } from '../shared/symbols.js';
import { createExplore, loadConfig } from '../server/app.js';
import { fLarge } from './fixtures.js';

const N = (type, properties = {}, id = 'n1') => ({ id, kind: 'node', type, properties });
const CFG = {
  version: 1,
  symbols: { iconSet: 'majesticons:line', status: { colors: { ok: '#00AA00', bad: '#CC0000' } }, fields: { uid: { property: 'code', maxRatio: 0.3 }, quantity: { property: 'qty', format: '{} GB', maxRatio: 0.1 } } },
  rules: [
    { id: 'gpu', when: { kind: 'node', type: 'GPU' }, apply: { frame: 'square', glyph: 'lucide/gpu', status: { property: 'health' } } },
    { id: 'mac', when: { kind: 'node', type: 'Mac' }, apply: { frame: 'diamond', glyph: 'laptop' } },
    { id: 'unk', when: { kind: 'node', type: 'Unknown' }, apply: { frame: 'quatrefoil' } },
    { id: 'est', when: { kind: 'node', property: 'estimate', op: 'eq', value: true }, apply: { frameDash: 'dashed' } },
    { id: 'alert', when: { kind: 'node', property: 'alerts', op: '>', value: 0 }, apply: { corners: { ne: { kind: 'alert' }, sw: { kind: 'count', property: 'alerts' } } } },
    { id: 'lock', when: { kind: 'node', property: 'private', op: 'eq', value: true }, apply: { corners: { nw: { kind: 'lock' } } } },
  ],
};

test('S1 frame = category, fill = status, glyph from the chosen set, dashed frame for estimates', () => {
  const s = compileStyle(CFG); assert.deepEqual(s.warnings, []);
  const g = s.nodeStyle(N('GPU', { health: 'ok' })).symbol;
  assert.equal(g.kind, 'composed'); assert.equal(g.frame, 'square'); assert.equal(g.fill, '#00AA00'); assert.equal(g.glyph, 'lucide/gpu'); assert.equal(g.dash, false);
  assert.equal(s.nodeStyle(N('GPU', { health: 'bad' })).symbol.fill, '#CC0000', 'status drives the fill');
  const m = s.nodeStyle(N('Mac', { estimate: true })).symbol;
  assert.equal(m.frame, 'diamond'); assert.equal(m.glyph, 'majesticons:line/laptop', 'bare glyph names use the style iconSet'); assert.equal(m.dash, true);
  assert.equal(s.nodeStyle(N('Unknown')).symbol.frame, 'quatrefoil');
  assert.notEqual(s.nodeStyle(N('Mac', { estimate: true })).symbol.key, s.nodeStyle(N('Mac')).symbol.key, 'dashed and solid frames are different atlas images');
});

test('S2 corner badges: alert + count + lock compose per corner, and every distinct badge is its own atlas key', () => {
  const s = compileStyle(CFG);
  const a = s.nodeStyle(N('GPU', { alerts: 3, private: true })).symbol;
  assert.deepEqual(a.corners.map(c => [c.corner, c.kind, c.text]), [['ne', 'alert', null], ['nw', 'lock', null], ['sw', 'count', '3']]);
  assert.equal(s.nodeStyle(N('GPU', { alerts: 250 })).symbol.corners.find(c => c.kind === 'count').text, '99+');
  const k = n => s.nodeStyle(N('GPU', { alerts: n })).symbol.key;
  assert.notEqual(k(3), k(4)); assert.notEqual(k(3), s.nodeStyle(N('GPU')).symbol.key);
});

test('S3 the default style has no symbols (renderer unchanged); bad channels warn, never throw', () => {
  assert.equal(compileStyle({ version: 1 }).symbols, null);
  assert.equal(compileStyle({ version: 1 }).nodeStyle(N('GPU')).symbol, undefined);
  const s = compileStyle({ version: 1, symbols: {}, rules: [{ id: 'x', when: { kind: 'node' }, apply: { frame: 'blob', corners: { up: { kind: 'alert' }, ne: { kind: 'boom' } }, frameDash: 'wiggly' } }] });
  assert.ok(s.warnings.some(w => /unknown frame/.test(w)) && s.warnings.some(w => /unknown corner up/.test(w)) && s.warnings.some(w => /kind must be/.test(w)) && s.warnings.some(w => /frameDash/.test(w)));
  assert.equal(s.nodeStyle(N('A')).symbol.frame, 'circle');
  const custom = compileStyle({ version: 1, symbols: { frame: 'x' }, rules: [{ id: 'p', when: { kind: 'node' }, apply: { frame: { path: 'M50 0 L100 100 L0 100 Z' } } }] });
  assert.equal(typeof custom.nodeStyle(N('A')).symbol.frame.path, 'string'); assert.ok(FRAMES.includes('quatrefoil'));
});

test('S4 custom icon folders need a licence in the style file; bundled sets are Lucide (ISC) + Majesticons (MIT)', () => {
  const no = compileStyle({ version: 1, symbols: { iconSet: 'custom:mine', iconSets: { mine: { folder: 'mine' } } }, rules: [{ id: 'g', when: { kind: 'node' }, apply: { glyph: 'custom:mine/star' } }] });
  assert.ok(no.warnings.some(w => /license/.test(w))); assert.equal(no.nodeStyle(N('A')).symbol.glyph, null, 'unlicensed custom icons are not used');
  const yes = compileStyle({ version: 1, symbols: { iconSets: { mine: { license: 'CC0-1.0', attribution: 'Me' } } }, rules: [{ id: 'g', when: { kind: 'node' }, apply: { glyph: 'custom:mine/star' } }] });
  assert.deepEqual(yes.warnings, []); assert.equal(yes.nodeStyle(N('A')).symbol.glyph, 'custom:mine/star'); assert.equal(yes.symbols.sets['custom:mine'].license, 'CC0-1.0');
  assert.equal(yes.symbols.sets.lucide.license, 'ISC'); assert.equal(yes.symbols.sets['majesticons:line'].license, 'MIT');
  assert.equal(iconPath('lucide', '../etc/passwd'), null); assert.equal(iconPath('custom:../x', 'a'), null);
});

test('S5 text fields (label, unique id, quantity) appear by zoom level', () => {
  const s = compileStyle(CFG), sym = s.symbols, it = N('GPU', { code: 'G-7', qty: 16 });
  assert.equal(fieldLevel(sym, 1), 0); assert.equal(fieldLevel(sym, 0.2), 1); assert.equal(fieldLevel(sym, 0.05), 2);
  assert.equal(fieldLabel(it, 'RTX', sym, 0), 'RTX'); assert.equal(fieldLabel(it, 'RTX', sym, 1), 'RTX  [G-7]'); assert.equal(fieldLabel(it, 'RTX', sym, 2), 'RTX  [G-7]  16 GB');
  // the same node with a different status / modifier must never share the cached image of another
  const keys = new Set(['ok', 'bad'].flatMap(h => [true, false].map(e => s.nodeStyle(N('GPU', { health: h, estimate: e })).symbol.key)));
  assert.equal(keys.size, 4);
});

test('S6 atlas economy: 10,000 nodes resolve to a handful of distinct symbol images, fast', () => {
  const s = compileStyle({ version: 1, symbols: {}, rules: [{ id: 'a', when: { kind: 'node', type: ['Person', 'Account'] }, apply: { frame: 'circle', glyph: 'lucide/user' } }, { id: 'b', when: { kind: 'node', property: 'score', op: '>', value: 90 }, apply: { corners: { ne: { kind: 'alert' } } } }, { id: 'c', when: { kind: 'node', property: 'score', op: '<', value: 10 }, apply: { frameDash: 'dashed' } }] });
  const { nodes } = fLarge(10000, 1); const t0 = performance.now(); const keys = new Set(); for (const n of nodes) keys.add(s.nodeStyle(n).symbol.key); const ms = performance.now() - t0;
  assert.ok(keys.size <= 24, `distinct symbols ${keys.size}`); assert.ok(ms < 1500, `resolve 10k in ${ms.toFixed(0)} ms`);
});

test('S7 icon routes: bundled sets served from the packages, custom folder served, traversal refused, set index lists counts', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'sgx-icons-')); mkdirSync(join(dir, 'icons', 'mine'), { recursive: true }); writeFileSync(join(dir, 'icons', 'mine', 'star.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const ex = await createExplore({ config: { ...loadConfig(join(dir, 'none.json')), viewsDir: dir }, log: null }); t.after(async () => { await ex.close(); rmSync(dir, { recursive: true, force: true }); });
  const get = path => new Promise(resolve => { const res = { headersSent: false, h: {}, writeHead(c, h) { this.code = c; this.h = h || {}; }, end(b) { resolve({ status: this.code, type: this.h['content-type'], body: String(b ?? '') }); } }; ex.handle({ method: 'GET', headers: {}, on() {} }, res, new URL(path, 'http://x')); });
  for (const p of ['/explore/icons/lucide/gpu.svg', '/explore/icons/majesticons-line/cpu.svg', '/explore/icons/majesticons-solid/cpu.svg', '/explore/icons/custom/mine/star.svg']) { const r = await get(p); assert.equal(r.status, 200, p); assert.equal(r.type, 'image/svg+xml'); assert.match(r.body, /<svg/); }
  for (const p of ['/explore/icons/lucide/..%2Fpackage.svg', '/explore/icons/lucide/nope-not-an-icon.svg', '/explore/icons/custom/mine/../../x.svg', '/explore/icons/other/a.svg']) assert.equal((await get(p)).status, 404, p);
  const idx = JSON.parse((await get('/api/explore/icons')).body);
  const c = Object.fromEntries(idx.sets.map(s => [s.id, s.count])); assert.ok(c.lucide > 1500 && c['majesticons:line'] >= 370 && c['majesticons:solid'] >= 370, JSON.stringify(c));
  assert.deepEqual(JSON.parse((await get('/api/explore/icons?set=custom:mine')).body).icons, ['star']);
});
