// Phase 2 "scale and readability", server + pure code (SPEC §24): cluster overview (server-side aggregation), meta-edges,
// members, cost estimates, edge bundling, the new layouts (timeline, geo, community) and seeded determinism, MCP tools,
// saved views keeping the layout. Ids P1..P12. Oracles are naive and share no code with the implementation.
// SCALE_IMPL=wrong (SW1 SW2 BW1 BW2 CW1 CW2 LW1-LW4) must make these fail.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { loadConfig } from '../server/app.js';
import { buildMcpServer } from '../server/mcp-server.js';
import { resultJson } from '../server/connectors/mcp.js';
import { aggregate, convexHull } from '../shared/clusters.js';
import { bundleEdges, compatibility } from '../shared/bundling.js';
import { computeLayout, rng, LAYOUT_KINDS, mercator } from '../shared/layouts.js';

let app, base, dir;
// planted partition: 6 groups x 40 nodes, dense inside (p=0.25), sparse between (p=0.004); plus a hidden hr-source node
const G = 6, PER = 40, planted = { nodes: [], links: [] };
{ const r = rng(11); for (let g = 0; g < G; g++) for (let i = 0; i < PER; i++) planted.nodes.push({ id: `p${g}_${i}`, g, type: i % 3 ? 'Person' : 'Account', band: `b${i % 4}` });
  let k = 0; for (let a = 0; a < planted.nodes.length; a++) for (let b = a + 1; b < planted.nodes.length; b++) { const A = planted.nodes[a], B = planted.nodes[b]; if (r() < (A.g === B.g ? 0.25 : 0.004)) planted.links.push({ id: `pl${k++}`, s: A.id, t: B.id, type: r() < 0.5 ? 'KNOWS' : 'PAYS' }); } }
before(async () => {
  const { startCombined } = await import('../combined.js');
  dir = mkdtempSync(join(tmpdir(), 'sgx-scale-'));
  const cfg = loadConfig(join(dir, 'none.json'));
  app = await startCombined({ port: 0, dataDir: dir, log: null, config: { ...cfg, streams: ['external', 'hr'], access: { ...cfg.access, sources: { hr: { read: ['role:hr'] } } } } });
  base = `http://127.0.0.1:${app.port}`;
  const p = app.ex.producer('external');
  for (const n of planted.nodes) p.push('node.upsert', { id: n.id, type: n.type, label: n.id, properties: { band: n.band, planted: n.g } });
  for (const l of planted.links) p.push('link.upsert', { id: l.id, type: l.type, fromId: l.s, toId: l.t, properties: {} });
  await p.flush();
  const h = app.ex.producer('hr'); h.push('node.upsert', { id: 'hr:secret', type: 'Person', label: 'secret', properties: { band: 'b0' } }); h.push('link.upsert', { id: 'hr:l1', type: 'KNOWS', fromId: 'hr:secret', toId: 'p0_1', properties: {} }); await h.flush();
});
after(async () => { await app?.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });
const pj = async (path, body) => { const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, ...(await r.json()) }; };
async function mcp(ex, cfg = { actAs: null }) { const server = buildMcpServer(ex, cfg), [a, b] = InMemoryTransport.createLinkedPair(); const client = new Client({ name: 't', version: '1' }); await Promise.all([server.connect(a), client.connect(b)]); return { client, close: async () => { await client.close(); await server.close(); } }; }
const call = async (c, name, args) => { const r = await c.callTool({ name, arguments: args }); return r.isError ? { error: r.content?.[0]?.text } : resultJson(r); };
/** naive oracle: cluster sizes and undirected meta-edge counts from a membership map */
function oracle(nodes, links, groupOf) {
  const size = {}, meta = {}, internal = {};
  for (const n of nodes) size[groupOf(n)] = (size[groupOf(n)] || 0) + 1;
  for (const l of links) { const a = groupOf(l.s), b = groupOf(l.t); if (a == null || b == null) continue; if (a === b) { internal[a] = (internal[a] || 0) + 1; continue; } const k = [String(a), String(b)].sort().join('|'); meta[k] = (meta[k] || 0) + 1; }
  return { size, meta, internal };
}

test('P1 aggregate(): cluster counts and meta-edge counts equal a naive oracle on a random graph (both link directions)', () => {
  const r = rng(5), nodes = [], links = []; for (let i = 0; i < 500; i++) nodes.push({ id: 'n' + i, type: 'T', group: Math.floor(r() * 12) });
  for (let j = 0; j < 1500; j++) links.push({ s: 'n' + Math.floor(r() * 500), t: 'n' + Math.floor(r() * 500), type: 'X' });
  const agg = aggregate({ nodes, links }), byId = new Map(nodes.map(n => [n.id, n.group])), want = oracle(nodes.map(n => ({ ...n })), links.map(l => ({ s: byId.has(l.s) ? l.s : null, t: l.t })), n => (typeof n === 'string' ? byId.get(n) : n.group));
  for (const c of agg.clusters) assert.equal(c.count, want.size[c.key], `size of ${c.key}`);
  assert.equal(agg.clusters.reduce((s, c) => s + c.count, 0), 500, 'every node in exactly one cluster');
  const got = Object.fromEntries(agg.metaEdges.map(m => [[m.source.slice(2), m.target.slice(2)].sort().join('|'), m.count]));
  assert.deepEqual(got, want.meta);
  for (const c of agg.clusters) assert.equal(c.internal, want.internal[c.key] || 0);
  // maxClusters folds the smallest groups into "other" and keeps the totals
  const few = aggregate({ nodes, links }, { maxClusters: 4 });
  assert.equal(few.clusters.length, 5); assert.ok(few.clusters.some(c => c.key === '__other'));
  assert.equal(few.clusters.reduce((s, c) => s + c.count, 0), 500);
  assert.equal(few.metaEdges.reduce((s, m) => s + m.count, 0) + few.clusters.reduce((s, c) => s + c.internal, 0), links.length);
});

test('P2 GET-free server overview: Louvain on a planted partition finds the 6 groups; meta-edges match the oracle on the returned membership; no overlap; seeded', async () => {
  const o = await pj('/api/explore/clusters', { by: 'louvain', membership: true, seed: 3 });
  assert.equal(o.status, 200, o.error);
  assert.equal(o.totals.nodes, G * PER, 'hr-source node is never counted (permissions)');
  assert.ok(!JSON.stringify(o).includes('hr:secret'));
  const big = o.clusters.filter(c => c.count >= 30); assert.equal(big.length, G, `clusters ${o.clusters.map(c => c.count)}`);
  // each found cluster is (almost) one planted group
  for (const c of big) { const groups = {}; for (const [id, cid] of Object.entries(o.membership)) if (cid === c.id) { const g = id.split('_')[0]; groups[g] = (groups[g] || 0) + 1; } assert.ok(Math.max(...Object.values(groups)) >= c.count * 0.9, JSON.stringify(groups)); }
  const want = oracle(planted.nodes, planted.links, x => o.membership[typeof x === 'string' ? x : x.id]);
  assert.deepEqual(Object.fromEntries(o.metaEdges.map(m => [[m.source, m.target].sort().join('|'), m.count])), want.meta);
  for (const c of o.clusters) assert.equal(c.count, want.size[c.id]);
  for (let i = 0; i < o.clusters.length; i++) for (let j = i + 1; j < o.clusters.length; j++) { const a = o.clusters[i], b = o.clusters[j]; assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= (a.r + b.r) * 0.98, `${a.id} overlaps ${b.id}`); }
  assert.ok(o.clusters.every(c => c.label.startsWith('Community') && c.top.length && c.mainType));
  const again = await pj('/api/explore/clusters', { by: 'louvain', seed: 3 });
  assert.equal(again.cached, true); assert.deepEqual(again.clusters.map(c => [c.id, c.x, c.y]), o.clusters.map(c => [c.id, c.x, c.y]));
});

test('P3 grouping by type and by property; maxClusters folds into "other"; filter scope', async () => {
  const t = await pj('/api/explore/clusters', { by: 'type' });
  assert.deepEqual(Object.fromEntries(t.clusters.map(c => [c.key, c.count])), { Person: planted.nodes.filter(n => n.type === 'Person').length, Account: planted.nodes.filter(n => n.type === 'Account').length });
  const want = oracle(planted.nodes, planted.links, x => (typeof x === 'string' ? planted.nodes.find(n => n.id === x) : x).type);
  assert.deepEqual(Object.fromEntries(t.metaEdges.map(m => [[m.source.slice(2), m.target.slice(2)].sort().join('|'), m.count])), want.meta);
  const b = await pj('/api/explore/clusters', { by: 'property:band', maxClusters: 2 });
  assert.equal(b.clusters.length, 3); assert.equal(b.clusters.reduce((s, c) => s + c.count, 0), G * PER);
  assert.ok(b.clusters.find(c => c.key === '__other').count === G * PER / 2);
  const f = await pj('/api/explore/clusters', { by: 'type', scope: { kind: 'filter', types: ['Account'] } });
  assert.deepEqual(f.clusters.map(c => c.key), ['Account']); assert.equal(f.metaEdges.length, 0);
  assert.equal((await pj('/api/explore/clusters', { by: 'nope' })).status, 400);
});

test('P4 cluster members: only that cluster, highest degree first, capped; unknown cluster 404', async () => {
  const o = await pj('/api/explore/clusters', { by: 'louvain', membership: true, seed: 3 });
  const c = o.clusters[0], m = await pj('/api/explore/clusters/members', { by: 'louvain', seed: 3, cluster: c.id, max: 10 });
  assert.equal(m.count, c.count); assert.equal(m.ids.length, 10); assert.equal(m.truncated, true);
  for (const id of m.ids) assert.equal(o.membership[id], c.id);
  const deg = id => planted.links.filter(l => l.s === id || l.t === id).length + (id === 'p0_1' ? 1 : 0);
  for (let i = 1; i < m.ids.length; i++) assert.ok(deg(m.ids[i - 1]) >= deg(m.ids[i]), 'degree order');
  assert.equal((await pj('/api/explore/clusters/members', { by: 'louvain', seed: 3, cluster: 'c:999' })).status, 404);
});

test('P5 cost estimates: neighbourhood size within 2.5x of the real k-hop size (hops 1-3); algorithm pricing follows exact vs sampled betweenness', async () => {
  const sid = (await pj('/api/explore/session', { follow: false, grow: true })).sessionId;
  for (const seeds of [['p0_0'], ['p2_5', 'p4_7']]) for (const hops of [1, 2, 3]) {
    const est = await pj('/api/explore/cost', { op: 'neighborhood', seeds, hops });
    const real = await pj(`/api/explore/session/${sid}/neighborhood?stream=0`, { seeds, hops, maxNodes: 20000 });
    const ratio = est.estNodes / real.nodes.length;
    assert.ok(ratio > 0.4 && ratio < 2.5, `${seeds} hops ${hops}: est ${est.estNodes} vs real ${real.nodes.length}`);
  }
  const small = await pj('/api/explore/cost', { op: 'algo', algo: 'betweenness' });
  assert.equal(small.approximate, false, 'exact betweenness below exactMax'); assert.equal(small.ops, G * PER * (small.nodes + small.links));
  const sampled = await pj('/api/explore/cost', { op: 'algo', algo: 'betweenness', params: { exactMax: 100, samples: 50 } });
  assert.equal(sampled.approximate, true); assert.ok(sampled.ops < small.ops);
  const pr = await pj('/api/explore/cost', { op: 'algo', algo: 'pagerank' }); assert.equal(pr.level, 'low');
  for (const op of ['overview', 'layout', 'bundle']) assert.ok((await pj('/api/explore/cost', { op })).estMs >= 0);
  assert.equal((await pj('/api/explore/cost', { op: 'nope' })).status, 400);
});

test('P6 edge bundling: endpoints fixed, compatible parallel edges pull together, perpendicular / distant edges stay straight', () => {
  const edges = []; for (let i = 0; i < 8; i++) edges.push({ id: 'a' + i, x1: 0, y1: i * 3, x2: 100, y2: i * 3 });
  edges.push({ id: 'perp', x1: 50, y1: -60, x2: 50, y2: -20 }, { id: 'far', x1: 0, y1: 400, x2: 100, y2: 400 }, { id: 'rev', x1: 100, y1: 12, x2: 0, y2: 12 });
  const r = bundleEdges(edges), mid = id => { const a = r.paths.get(id), k = (a.length / 2) >> 1; return [a[2 * k], a[2 * k + 1]]; };
  for (const e of edges) { const a = r.paths.get(e.id), n = a.length / 2; assert.deepEqual([a[0], a[1], a[2 * n - 2], a[2 * n - 1]], [e.x1, e.y1, e.x2, e.y2], `${e.id} endpoints`); }
  const spreadBefore = 21, spreadAfter = Math.max(...[0, 1, 2, 3, 4, 5, 6, 7].map(i => mid('a' + i)[1])) - Math.min(...[0, 1, 2, 3, 4, 5, 6, 7].map(i => mid('a' + i)[1]));
  assert.ok(spreadAfter < spreadBefore * 0.3, `bundle spread ${spreadAfter}`);
  assert.ok(Math.abs(mid('rev')[1] - mid('a3')[1]) < 3, 'opposite-direction parallel edge joins the bundle');
  for (const id of ['perp', 'far']) { const a = r.paths.get(id), e = edges.find(x => x.id === id); for (let i = 0; i < a.length / 2; i++) { const cross = (e.x2 - e.x1) * (a[2 * i + 1] - e.y1) - (e.y2 - e.y1) * (a[2 * i] - e.x1); assert.ok(Math.abs(cross) / Math.hypot(e.x2 - e.x1, e.y2 - e.y1) < 1e-6, `${id} stayed straight`); } }
  assert.equal(compatibility(edges[8], edges[0]), 0);
  // the grid pruning finds exactly the brute-force compatible pairs
  const rr = rng(9), rnd = []; for (let i = 0; i < 300; i++) { const x = rr() * 500, y = rr() * 500, a = rr() * Math.PI, l = 20 + rr() * 80; rnd.push({ id: 'r' + i, x1: x, y1: y, x2: x + Math.cos(a) * l, y2: y + Math.sin(a) * l }); }
  let brute = 0; for (let i = 0; i < rnd.length; i++) for (let j = i + 1; j < rnd.length; j++) if (compatibility(rnd[i], rnd[j]) >= 0.6) brute++;
  const rb = bundleEdges(rnd); assert.equal(rb.stats.pairs, brute);
  assert.deepEqual([...bundleEdges(rnd).paths.get('r7')], [...rb.paths.get('r7')], 'deterministic');
});

const tl = () => { const r = rng(4), nodes = [], links = []; for (let i = 0; i < 120; i++) { nodes.push({ id: 'n' + i, type: ['A', 'B', 'C'][i % 3], properties: { when: new Date(Date.UTC(2024, 0, 1) + Math.floor(r() * 365) * 864e5).toISOString(), lat: -60 + r() * 120, lon: -170 + r() * 340, team: 't' + (i % 5) } }); if (i) links.push({ source: 'n' + Math.floor(r() * i), target: 'n' + i }); } return { nodes, links }; };
test('P7 timeline layout: x follows the date property exactly (linear), one y band per type, undated nodes left of the axis', () => {
  const { nodes, links } = tl(); nodes.push({ id: 'undated', type: 'A', properties: {} });
  const pos = computeLayout({ nodes, links, options: { kind: 'timeline', timeProperty: 'when', incremental: false } });
  const dated = nodes.filter(n => n.properties.when), t = n => Date.parse(n.properties.when);
  const t0 = Math.min(...dated.map(t)), t1 = Math.max(...dated.map(t)), x0 = Math.min(...dated.map(n => pos.get(n.id).x)), x1 = Math.max(...dated.map(n => pos.get(n.id).x));
  for (const n of dated) assert.ok(Math.abs((pos.get(n.id).x - x0) / (x1 - x0) - (t(n) - t0) / (t1 - t0)) < 1e-9, `${n.id} x is linear in time`);
  const band = ty => { const ys = dated.filter(n => n.type === ty).map(n => pos.get(n.id).y); return [Math.min(...ys), Math.max(...ys)]; };
  const [a, b, c] = ['A', 'B', 'C'].map(band); assert.ok(a[1] < b[0] || b[1] < a[0]); assert.ok(b[1] < c[0] || c[1] < b[0]);
  assert.ok(pos.get('undated').x < x0);
});

test('P8 geographic layout: positions are the Web Mercator projection of lon/lat (one scale), unplaced nodes go next to placed neighbours', () => {
  const { nodes, links } = tl(); nodes.push({ id: 'nogeo', type: 'A', properties: {} }); links.push({ source: 'nogeo', target: 'n3' });
  const pos = computeLayout({ nodes, links, options: { kind: 'geo', incremental: false } });
  const geo = nodes.filter(n => n.properties.lat != null), k = pos.get(geo[0].id).x / mercator(geo[0].properties.lon, geo[0].properties.lat).x;
  for (const n of geo) { const m = mercator(n.properties.lon, n.properties.lat), p = pos.get(n.id); assert.ok(Math.abs(p.x - m.x * k) < 1e-6 && Math.abs(p.y - m.y * k) < 1e-6, `${n.id}`); }
  assert.ok(Math.abs(mercator(0, 0).y) < 1e-12 && mercator(10, 60).y > mercator(10, 30).y, 'north is up');
  const d = Math.hypot(pos.get('nogeo').x - pos.get('n3').x, pos.get('nogeo').y - pos.get('n3').y); assert.ok(d < Math.abs(k) * 0.2, 'next to its neighbour');
});

test('P9 group-in-a-box: each group sits in its own box (no two group boxes overlap), box area grows with group size; louvain groups', () => {
  const { nodes, links } = tl(); const big = nodes.map((n, i) => ({ ...n, group: i < 60 ? 'g0' : 'g' + (1 + (i % 4)) }));
  const pos = computeLayout({ nodes: big, links, options: { kind: 'community', incremental: false } });
  const boxes = {}; for (const n of big) { const p = pos.get(n.id), b = boxes[n.group] ||= [Infinity, Infinity, -Infinity, -Infinity, 0]; b[0] = Math.min(b[0], p.x); b[1] = Math.min(b[1], p.y); b[2] = Math.max(b[2], p.x); b[3] = Math.max(b[3], p.y); b[4]++; }
  const ks = Object.keys(boxes); assert.equal(ks.length, 5);
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = boxes[ks[i]], b = boxes[ks[j]]; assert.ok(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1], `${ks[i]} and ${ks[j]} overlap`); }
  const area = b => (b[2] - b[0]) * (b[3] - b[1]); assert.ok(area(boxes.g0) > area(boxes.g1), 'bigger group, bigger box');
  const lv = computeLayout({ nodes, links, options: { kind: 'community', groupBy: 'louvain', incremental: false } }); assert.equal(lv.size, nodes.length);
});

test('P10 seeded layouts are reproducible: same seed = identical positions, another seed = a different drawing (force, community, structural)', () => {
  const { nodes, links } = tl();
  for (const kind of ['force', 'community', 'structural']) {
    const a = computeLayout({ nodes, links, options: { kind, seed: 7, incremental: false, groupBy: 'team' } }), b = computeLayout({ nodes, links, options: { kind, seed: 7, incremental: false, groupBy: 'team' } }), c = computeLayout({ nodes, links, options: { kind, seed: 8, incremental: false, groupBy: 'team' } });
    assert.deepEqual([...a], [...b], `${kind} same seed`); assert.notDeepEqual([...a], [...c], `${kind} other seed`);
  }
  assert.ok(['timeline', 'geo', 'community'].every(k => LAYOUT_KINDS.includes(k)));
  assert.equal(convexHull([[0, 0], [2, 0], [1, 1], [2, 2], [0, 2], [1, 3]]).length, 5);
});

test('P11 MCP: cluster_overview (summary + members), estimate_cost; set_layout only with writes and it is kept by the saved view', async () => {
  const m = await mcp(app.ex);
  try {
    const names = (await m.client.listTools()).tools.map(t => t.name);
    assert.ok(names.includes('cluster_overview') && names.includes('estimate_cost') && !names.includes('set_layout'));
    const o = await call(m.client, 'cluster_overview', { by: 'type' });
    assert.deepEqual(o.totals.nodes, G * PER); assert.ok(!JSON.stringify(o).includes('hr:'));
    assert.equal(o.metaEdges[0].count, (await pj('/api/explore/clusters', { by: 'type' })).metaEdges[0].count);
    const mem = await call(m.client, 'cluster_overview', { by: 'type', cluster: 'c:Account', top: 5 });
    assert.equal(mem.ids.length, 5); assert.ok(mem.ids.every(id => planted.nodes.find(n => n.id === id).type === 'Account'));
    const c = await call(m.client, 'estimate_cost', { op: 'neighborhood', seeds: ['p0_0'], hops: 2 }); assert.ok(c.estNodes > 1);
  } finally { await m.close(); }
  const v = await pj('/api/explore/views', { name: 'P11', state: { layout: { kind: 'force' } } });
  const id = v.view?.id || v.id; assert.ok(id, JSON.stringify(v));
  const w = await mcp(app.ex, { actAs: null, allowWrites: true });
  try {
    const r = await call(w.client, 'set_layout', { id, kind: 'timeline', seed: 42, timeProperty: 'when' });
    assert.equal(r.ok, true, r.error); assert.deepEqual([r.layout.kind, r.layout.seed, r.layout.timeProperty], ['timeline', 42, 'when']);
  } finally { await w.close(); }
  const back = await (await fetch(`${base}/api/explore/views/${id}`)).json();
  assert.deepEqual([back.state?.layout?.kind ?? back.view?.state.layout.kind, (back.state ?? back.view.state).layout.seed], ['timeline', 42]);
});

test('P12 saved views keep the new layout options (seed, timeProperty, groupBy) through the HTTP API', async () => {
  const v = await pj('/api/explore/views', { name: 'P12', state: { layout: { kind: 'community', seed: 9, groupBy: 'louvain', timeProperty: 'when', bogus: 1 } } });
  const id = v.view?.id || v.id, back = await (await fetch(`${base}/api/explore/views/${id}`)).json(), L = (back.state ?? back.view.state).layout;
  assert.deepEqual(L, { kind: 'community', seed: 9, groupBy: 'louvain', timeProperty: 'when' });
});
