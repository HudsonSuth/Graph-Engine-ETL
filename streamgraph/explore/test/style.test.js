// SPEC §13.2 tests 32, 34, 35, 39 and §10.6: versioned style config.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileStyle, PALETTES } from '../shared/style.js';
import { fSmall } from './fixtures.js';

const cfg = { version: 1, theme: 'dark', rules: [
  { id: 'people-are-blue', when: { kind: 'node', type: 'Person' }, apply: { color: '#0000aa', shape: 'square' } },
  { id: 'size-by-degree', when: { kind: 'node' }, apply: { size: { property: 'degree', scale: 'linear', domain: [1, 5], range: [4, 20] } } },
  { id: 'risky', when: { kind: 'node', property: 'risk', op: '>=', value: 80 }, apply: { color: '#ff0000' } },
  { id: 'transfer', when: { kind: 'link', type: 'TRANSFER' }, apply: { width: 3, dash: 'dashed' } },
] };

test('T32 rules apply colour and size on F-small without code changes (later rules override earlier)', () => {
  const s = compileStyle(cfg); const { nodes, links } = fSmall();
  assert.deepEqual(s.warnings, []);
  for (const n of nodes) {
    const st = s.nodeStyle(n);
    const expectColor = n.properties.risk >= 80 ? '#ff0000' : n.type === 'Person' ? '#0000aa' : null;
    if (expectColor) assert.equal(st.color, expectColor, n.id);
    const d = n.properties.degree, exp = 4 + Math.max(0, Math.min(1, (d - 1) / 4)) * 16;
    assert.ok(Math.abs(st.size - exp) < 1e-9, `${n.id} size ${st.size} vs ${exp}`);
  }
  assert.equal(s.linkStyle(links[0]).width, 3); assert.equal(s.linkStyle(links[0]).dash, 'dashed'); assert.equal(s.linkStyle(links[5]).width, 1);
});

test('T39 invalid style config fails soft: defaults apply and warnings are recorded', () => {
  const bad = { version: 7, theme: 'neon', nodeDefaults: { shape: 'blob' }, rules: [
    { id: 'c', when: { type: 'X' }, apply: { color: 'notacolor', glow: 5 } },
    { id: 'op', when: { property: 'a', op: 'regex', value: '.*' }, apply: { color: '#fff' } },
    { id: 'shape', when: { type: 'X' }, apply: { shape: 'star' } }, 'garbage'] };
  let s; assert.doesNotThrow(() => { s = compileStyle(bad); });
  assert.ok(s.warnings.length >= 6, s.warnings.join('\n'));
  const st = s.nodeStyle({ kind: 'node', type: 'X', properties: { a: 1 } });
  assert.equal(st.shape, 'circle'); assert.match(st.color, /^#/);
  assert.doesNotThrow(() => compileStyle('{not json'));
  assert.doesNotThrow(() => compileStyle(null));
});

test('T35 legend lists each visible type and omits filtered-out types', () => {
  const s = compileStyle(cfg); const { nodes } = fSmall();
  const counts = new Map(); for (const n of nodes) counts.set(n.type, (counts.get(n.type) || 0) + 1);
  assert.deepEqual(s.legend(counts).map(e => e.type).sort(), ['Account', 'Company', 'Device', 'Person']);
  counts.set('Device', 0);
  assert.deepEqual(s.legend(counts).map(e => e.type).sort(), ['Account', 'Company', 'Person']);
  assert.equal(s.legend(counts).find(e => e.type === 'Person').color, '#0000aa');
});

test('T34 theme switch keeps type colours distinct and in the same hue order (no positions involved)', () => {
  const types = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const dark = compileStyle({ version: 1 }, { theme: 'dark' }), light = compileStyle({ version: 1 }, { theme: 'light' });
  const dc = types.map(t => dark.nodeStyle({ kind: 'node', type: t, properties: {} }).color), lc = types.map(t => light.nodeStyle({ kind: 'node', type: t, properties: {} }).color);
  assert.equal(new Set(dc).size, types.length); assert.equal(new Set(lc).size, types.length);
  assert.deepEqual(dc.map(c => PALETTES.dark.indexOf(c)), lc.map(c => PALETTES.light.indexOf(c)));
  assert.notEqual(dark.colors.background, light.colors.background);
});

test('§10.3 label text meets WCAG AA contrast on both default backgrounds', () => {
  const lum = hex => { const c = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  for (const th of ['dark', 'light']) { const s = compileStyle({ version: 1 }, { theme: th }); assert.ok(ratio(s.colors.text, s.colors.background) >= 4.5, th); }
});

test('the shipped style-config.v1.json compiles without warnings', () => {
  const s = compileStyle(JSON.parse(readFileSync(new URL('../public/style-config.v1.json', import.meta.url))));
  assert.deepEqual(s.warnings, []);
});
