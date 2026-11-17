// SPEC §13.2 tests 28-30 and §9.7: layout stability, pinning, hierarchy bands, all kinds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout } from '../server/impl.js';
import { movement, LAYOUT_KINDS, hierarchyLevels, layoutOptions } from '../shared/layouts.js';
import { rng } from '../shared/layouts.js';

function tree(n, seed = 3) { const r = rng(seed), nodes = [], links = []; for (let i = 0; i < n; i++) { nodes.push({ id: 'n' + i, type: 'T' + (i % 4), properties: {} }); if (i) links.push({ source: 'n' + Math.floor(r() * i), target: 'n' + i }); } return { nodes, links }; }

test('T28 incremental add of 20 neighbours to a 1,000-node laid-out graph: >=90% of existing nodes move < 10% of the diagonal', () => {
  const { nodes, links } = tree(1000);
  const before = computeLayout({ nodes, links, options: { kind: 'force', incremental: false } });
  const n2 = [...nodes], l2 = [...links];
  for (let i = 0; i < 20; i++) { n2.push({ id: 'new' + i, type: 'New', properties: {} }); l2.push({ source: 'n' + (i * 37), target: 'new' + i }); }
  const after = computeLayout({ nodes: n2, links: l2, options: { kind: 'force', incremental: true }, prev: before });
  const m = movement(before, after, nodes.map(n => n.id));
  assert.ok(m.fractionWithin(0.1) >= 0.9, `only ${(m.fractionWithin(0.1) * 100).toFixed(1)}% stayed within 10% of the diagonal`);
  for (let i = 0; i < 20; i++) { const p = after.get('new' + i), a = after.get('n' + (i * 37)); assert.ok(Math.hypot(p.x - a.x, p.y - a.y) < m.diag * 0.25, 'new node placed near its neighbour'); }
});

test('T29 pinned coordinates are unchanged after a force layout pass (and every other kind)', () => {
  const { nodes, links } = tree(200);
  const prev = computeLayout({ nodes, links, options: { kind: 'grid' } });
  const pinned = ['n0', 'n5', 'n77'];
  for (const kind of LAYOUT_KINDS) for (const incremental of [true, false]) {
    const after = computeLayout({ nodes, links, options: { kind, incremental }, prev, pinned });
    for (const id of pinned) assert.deepEqual(after.get(id), prev.get(id), `${kind}/${incremental} moved pinned ${id}`);
  }
});

test('T30 hierarchy on a directed tree gives distinct level bands (within-level variance << between-level)', () => {
  const { nodes, links } = tree(300);
  const pos = computeLayout({ nodes, links, options: { kind: 'hierarchy', orientation: 'down' } });
  const { level } = hierarchyLevels(nodes, links, layoutOptions({ kind: 'hierarchy' }), new Set(), new Map());
  const byL = new Map(); for (const n of nodes) { const l = level.get(n.id); if (!byL.has(l)) byL.set(l, []); byL.get(l).push(pos.get(n.id).y); }
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length, vr = a => mean(a.map(x => (x - mean(a)) ** 2));
  const within = mean([...byL.values()].map(vr)), between = vr([...byL.values()].map(mean));
  assert.ok(byL.size > 3); assert.ok(within < between * 0.01, `within ${within} between ${between}`);
  const ys = [...byL.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v[0]);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] < ys[i - 1], 'orientation down: deeper levels lower');
});

test('levelProperty and declared roots drive hierarchy and radial levels', () => {
  const nodes = [{ id: 'a', properties: { lvl: 2 } }, { id: 'b', properties: { lvl: 0 } }, { id: 'c', properties: { lvl: 1 } }];
  const pos = computeLayout({ nodes, links: [], options: { kind: 'hierarchy', levelProperty: 'lvl' } });
  assert.ok(pos.get('b').y > pos.get('c').y && pos.get('c').y > pos.get('a').y);
  const { nodes: tn, links: tl } = tree(50);
  const r = computeLayout({ nodes: tn, links: tl, options: { kind: 'radial', roots: ['n0'] } });
  assert.deepEqual(r.get('n0'), { x: 0, y: 0 });
});

test('every layout kind returns finite positions for every node; unknown options are ignored', () => {
  const { nodes, links } = tree(120);
  nodes.push({ id: 'iso1' }, { id: 'iso2' });
  for (const kind of LAYOUT_KINDS) {
    const p = computeLayout({ nodes, links, options: { kind, futureOption: 1 } });
    assert.equal(p.size, nodes.length, kind);
    for (const v of p.values()) assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y), kind);
  }
});

test('incremental=false re-initialises (full relayout); incremental placement of a disconnected newcomer avoids the existing mass', () => {
  const { nodes, links } = tree(300);
  const before = computeLayout({ nodes, links, options: { kind: 'force', incremental: false } });
  const after = computeLayout({ nodes: [...nodes, { id: 'loner' }], links, options: { kind: 'force', incremental: true }, prev: before });
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const n of nodes) { const p = before.get(n.id); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const L = after.get('loner'); const inside = L.x > x0 && L.x < x1 && L.y > y0 && L.y < y1;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  assert.ok(!inside || Math.hypot(L.x - cx, L.y - cy) > Math.hypot(x1 - x0, y1 - y0) / 2 * 0.9, 'free-region placement');
});
