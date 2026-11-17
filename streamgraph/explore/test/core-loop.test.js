// Phase 1 core loop, step A (SPEC §23.2-§23.4, §23.6): streamed k-hop neighbourhoods, paths, node summaries,
// live growth of the visible subgraph (in-process mode) and the MCP tools. Ids N1..N12.
// Oracles in core-fixtures.js are independent naive implementations. CORE_IMPL=wrong must make these fail.
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
import { CORE_NODES, CORE_LINKS, seedCore, oracleNeighborhood, oraclePaths, readNdjson, sse } from './core-fixtures.js';
import { fLarge, rng } from './core-rng.js';

let app, base, dir;
const studio = { engine: { subject: id => (id === 'owner' ? { id } : null), decide: async ({ entity }) => ({ allow: entity !== 'Secret' }), maskProps: (s, t, props) => ({ props }) } };
before(async () => {
  const { startCombined } = await import('../combined.js');
  dir = mkdtempSync(join(tmpdir(), 'sgx-core-'));
  const cfg = loadConfig(join(dir, 'none.json'));
  app = await startCombined({ port: 0, dataDir: dir, log: null, config: { ...cfg, streams: ['external', 'hr'], access: { ...cfg.access, sources: { hr: { read: ['role:hr'] } } } } });
  base = `http://127.0.0.1:${app.port}`;
  await seedCore(app.ex);
});
after(async () => { await app?.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });
const post = async (path, body) => { const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return r; };
const pj = async (path, body) => (await post(path, body)).json();
async function session(opts = { follow: false, grow: true }) { return (await pj('/api/explore/session', opts)).sessionId; }
async function nb(sid, body) { const r = await post(`/api/explore/session/${sid}/neighborhood`, body); assert.equal(r.headers.get('content-type'), 'application/x-ndjson'); return readNdjson(r); }
const collect = lines => { const hopOf = {}, links = new Set(); for (const l of lines) if (l.type === 'chunk') { for (const n of l.nodes) hopOf[n.id] = l.hop; for (const x of l.links) { assert.ok(!links.has(x.id), `link ${x.id} sent twice`); links.add(x.id); } } return { hopOf, links }; };

test('N1 NDJSON stream: start line, chunks in hop order (nodes before links), end stats; equals the naive BFS for hops 0-4', async () => {
  const sid = await session();
  for (const hops of [0, 1, 2, 3, 4]) {
    const lines = await nb(sid, { seeds: ['c0'], hops, chunkSize: 2 });
    assert.equal(lines[0].type, 'start'); assert.equal(lines.at(-1).type, 'end');
    const chunks = lines.filter(l => l.type === 'chunk');
    for (let i = 1; i < chunks.length; i++) assert.ok(chunks[i].hop >= chunks[i - 1].hop, 'hop order');
    assert.ok(chunks.every(c => c.nodes.length + c.links.length <= 2), 'chunkSize respected');
    const got = collect(lines), want = oracleNeighborhood(CORE_NODES, CORE_LINKS, { seeds: ['c0'], hops });
    assert.deepEqual(got.hopOf, want.hopOf, `hops=${hops}`);
    assert.deepEqual([...got.links].sort(), [...want.links].sort(), `induced links hops=${hops}`);
    // every link arrives after both of its ends
    const seen = new Set(); for (const c of chunks) { c.nodes.forEach(n => seen.add(n.id)); for (const l of c.links) assert.ok(seen.has(l.fromId) && seen.has(l.toId), `${l.id} before its ends`); }
    assert.equal(lines.at(-1).stats.nodes, Object.keys(want.hopOf).length);
  }
});

test('N2 filters: link types, direction, node types and property conditions match the oracle', async () => {
  const sid = await session();
  const cases = [
    [{ linkTypes: ['KNOWS'], hops: 3 }, { linkTypes: ['KNOWS'], hops: 3 }],
    [{ direction: 'out', hops: 3 }, { direction: 'out', hops: 3 }],
    [{ direction: 'in', hops: 2, seeds: ['b1'] }, { direction: 'in', hops: 2, seeds: ['b1'] }],
    [{ nodeTypes: ['Account'], hops: 3 }, { nodeTypes: ['Account'], hops: 3 }],
    [{ where: [{ property: 'risk', op: 'gte', value: 50 }], hops: 3 }, { where: n => n.props.risk >= 50, hops: 3 }],
  ];
  for (const [q, o] of cases) {
    const got = collect(await nb(sid, { seeds: ['c0'], ...q })), want = oracleNeighborhood(CORE_NODES, CORE_LINKS, { seeds: ['c0'], ...o });
    assert.deepEqual(got.hopOf, want.hopOf, JSON.stringify(q));
    if (q.linkTypes) assert.deepEqual([...got.links].sort(), [...want.links].sort(), 'only links of the requested types');
  }
});

test('N3 maxNodes caps the result (seeds kept), flags truncated; exclude skips nodes the client already has', async () => {
  const sid = await session();
  const lines = await nb(sid, { seeds: ['c0'], hops: 3, maxNodes: 4 });
  const got = collect(lines), end = lines.at(-1).stats;
  assert.equal(Object.keys(got.hopOf).length, 4); assert.equal(got.hopOf.c0, 0); assert.equal(end.truncated, true);
  const full = await nb(sid, { seeds: ['c0'], hops: 3, maxNodes: 100 }); assert.equal(full.at(-1).stats.truncated, false);
  const ex = collect(await nb(sid, { seeds: ['c0'], hops: 1, exclude: ['c0', 'a1'] }));
  assert.deepEqual(Object.keys(ex.hopOf).sort(), ['a2', 'a3', 'acc1']);
  assert.ok(ex.links.has('k1'), 'links to excluded (already held) nodes are still sent');
});

test('N4 random 3,000-node graph: streamed neighbourhoods equal the naive BFS for 30 random seed/hop/filter combinations', async () => {
  const { svc, nodes, links } = await fLarge(app.ex);
  const { core } = await import('../server/core-loop-impl.js');
  const r = rng(7);
  for (let i = 0; i < 30; i++) {
    const seeds = [`r${Math.floor(r() * 3000)}`, ...(r() < 0.3 ? [`r${Math.floor(r() * 3000)}`] : [])], hops = 1 + Math.floor(r() * 3), linkTypes = r() < 0.4 ? ['A'] : null;
    const got = await core.neighborhood(svc, { seeds, hops, linkTypes, maxNodes: 20000 }, async x => x, app.ex.config.principal);
    const want = oracleNeighborhood(nodes, links, { seeds, hops, linkTypes });
    assert.deepEqual(got.hopOf, want.hopOf, JSON.stringify({ seeds, hops, linkTypes }));
    assert.equal(got.links.length, want.links.size);
  }
});

test('N5 access: nodes from a source the principal cannot read are neither returned nor traversed', async () => {
  const hr = app.ex.producer('hr');
  hr.push('node.upsert', { id: 'hr:bridge', type: 'Person', properties: {} });
  hr.push('link.upsert', { id: 'hr:l1', type: 'KNOWS', fromId: 'z2', toId: 'hr:bridge' });
  hr.push('node.upsert', { id: 'hr:beyond', type: 'Person', properties: {} });
  hr.push('link.upsert', { id: 'hr:l2', type: 'KNOWS', fromId: 'hr:bridge', toId: 'hr:beyond' });
  await hr.flush();
  const ext = app.ex.producer('external'); ext.push('link.upsert', { id: 'x:l3', type: 'KNOWS', fromId: 'hr:beyond', toId: 'z1' }); await ext.flush();
  const sid = await session();
  const got = collect(await nb(sid, { seeds: ['z2'], hops: 3 }));
  assert.deepEqual(Object.keys(got.hopOf).sort(), ['z1', 'z2']);
  assert.ok(!JSON.stringify(got).includes('hr:'));
  const p = await pj(`/api/explore/session/${sid}/paths`, { fromId: 'z2', toId: 'hr:beyond', maxHops: 4 });
  assert.equal(p.found, false);
});

test('N6 paths: shortest + all simple paths up to the hop limit equal the brute-force oracle; caps, mode and link-type filter', async () => {
  const sid = await session();
  for (const [from, to, maxHops] of [['c0', 'd1', 3], ['c0', 'd1', 4], ['c0', 'd1', 6], ['a3', 'b2', 5], ['acc3', 'b1', 6]]) {
    const r = await pj(`/api/explore/session/${sid}/paths`, { fromId: from, toId: to, maxHops, maxPaths: 500 });
    const want = oraclePaths(CORE_LINKS, from, to, maxHops);
    assert.equal(r.found, want.length > 0);
    if (!want.length) continue;
    assert.deepEqual(r.paths.map(p => p.nodeIds), want, `${from}->${to} <=${maxHops}`);
    assert.deepEqual(r.shortest.nodeIds, want[0]);
    for (const p of r.paths) { assert.equal(p.linkIds.length, p.nodeIds.length - 1); assert.equal(p.hops, p.linkIds.length); }
  }
  const sh = await pj(`/api/explore/session/${sid}/paths`, { fromId: 'c0', toId: 'd1', maxHops: 6, mode: 'shortest' });
  assert.deepEqual(sh.paths.map(p => p.nodeIds), oraclePaths(CORE_LINKS, 'c0', 'd1', 3));
  const capped = await pj(`/api/explore/session/${sid}/paths`, { fromId: 'c0', toId: 'd1', maxHops: 6, maxPaths: 2 });
  assert.equal(capped.paths.length, 2); assert.equal(capped.truncated, true);
  const typed = await pj(`/api/explore/session/${sid}/paths`, { fromId: 'c0', toId: 'acc3', maxHops: 6, linkTypes: ['KNOWS', 'USES'] });
  assert.equal(typed.found, false, 'acc3 is reachable only over OWNS/TRANSFER');
  const dir = await pj(`/api/explore/session/${sid}/paths`, { fromId: 'd1', toId: 'c0', maxHops: 6, directed: true });
  assert.equal(dir.found, false, 'every link points away from c0');
  assert.ok(sh.items.some(i => i.kind === 'link') && sh.items.every(i => i.kind === 'link' || sh.paths.some(p => p.nodeIds.includes(i.id))));
});

test('N7 node summary: per link type in/out counts (drives "expand by relationship type")', async () => {
  const sid = await session();
  const r = await (await fetch(`${base}/api/explore/session/${sid}/summary?id=a1`)).json();
  assert.deepEqual(r.linkTypes, [{ type: 'KNOWS', total: 3, out: 1, in: 2 }]);
  const c = await (await fetch(`${base}/api/explore/session/${sid}/summary?id=c0`)).json();
  assert.deepEqual(c.linkTypes.map(t => [t.type, t.total, t.out, t.in]), [['KNOWS', 3, 3, 0], ['OWNS', 1, 1, 0]]);
  assert.equal((await fetch(`${base}/api/explore/session/${sid}/summary?id=nope`)).status, 404);
});

test('N8 live growth (in-process): a new link touching the visible subgraph streams in with its new end; others do not', async () => {
  const sid = await (await pj('/api/explore/session', { follow: false, grow: true, growLinkTypes: ['KNOWS', 'NEW'] })).sessionId;
  const deltas = []; const stop = sse(`${base}/api/explore/session/${sid}/events`, (ev, d) => { if (ev === 'delta') deltas.push(d); });
  await new Promise(r => setTimeout(r, 150));
  await nb(sid, { seeds: ['c0'], hops: 1 });
  const p = app.ex.producer('external');
  p.push('node.upsert', { id: 'live:n1', type: 'Person', properties: {} });
  p.push('link.upsert', { id: 'live:l1', type: 'NEW', fromId: 'a1', toId: 'live:n1' });   // touches a1 (visible) -> grows
  p.push('node.upsert', { id: 'live:far', type: 'Person', properties: {} });
  p.push('link.upsert', { id: 'live:l2', type: 'NEW', fromId: 'z1', toId: 'live:far' });   // not visible -> ignored
  p.push('link.upsert', { id: 'live:l3', type: 'SKIP', fromId: 'a2', toId: 'z1' });       // type not followed -> ignored
  await p.flush();
  const deadline = Date.now() + 5000; const ids = () => new Set(deltas.flatMap(d => d.upserts.map(u => u.id)));
  while (Date.now() < deadline && !(ids().has('live:l1') && ids().has('live:n1'))) await new Promise(r => setTimeout(r, 30));
  await new Promise(r => setTimeout(r, 200));
  stop();
  const got = ids();
  assert.ok(got.has('live:l1') && got.has('live:n1'), 'the new link and its new end node arrive');
  for (const x of ['live:far', 'live:l2', 'live:l3', 'z1']) assert.ok(!got.has(x), `${x} must not arrive`);
  // neighbourhood results were adopted as already sent: no echo of the 5 streamed nodes as deltas
  assert.ok(!got.has('a2') && !got.has('acc1'));
});

test('N9 streaming is progressive: chunks arrive over time (not buffered into one response)', async () => {
  const sid = await session();
  const lines = await nb(sid, { seeds: ['c0'], hops: 3, chunkSize: 1, slowMs: 60 });
  const chunks = lines.filter(l => l.type === 'chunk');
  assert.ok(chunks.length >= 10);
  assert.ok(chunks.at(-1).at - chunks[0].at >= 60 * (chunks.length - 2), `chunks spread over ${Math.round(chunks.at(-1).at - chunks[0].at)} ms`);
});

test('N10 JSON (non-streaming) form and an unknown seed', async () => {
  const sid = await session();
  const T = ['KNOWS', 'OWNS', 'TRANSFER', 'USES']; // N8 added NEW / SKIP links
  const r = await pj(`/api/explore/session/${sid}/neighborhood`, { seeds: ['c0'], hops: 2, stream: false, linkTypes: T });
  assert.deepEqual(r.hopOf, oracleNeighborhood(CORE_NODES, CORE_LINKS, { seeds: ['c0'], hops: 2, linkTypes: T }).hopOf);
  const none = await pj(`/api/explore/session/${sid}/neighborhood`, { seeds: ['nope'], hops: 2, stream: false });
  assert.equal(none.nodes.length, 0);
});

async function mcp(ex) { const server = buildMcpServer(ex, { actAs: null }), [a, b] = InMemoryTransport.createLinkedPair(); const client = new Client({ name: 't', version: '1' }); await Promise.all([server.connect(a), client.connect(b)]); return { client, close: async () => { await client.close(); await server.close(); } }; }
const call = async (c, name, args) => { const r = await c.callTool({ name, arguments: args }); return r.isError ? { error: r.content?.[0]?.text } : resultJson(r); };

test('N11 MCP neighborhood: per-hop nodes with hop numbers, filters, cap; never leaks the hr source', async () => {
  const m = await mcp(app.ex);
  try {
    const r = await call(m.client, 'neighborhood', { seeds: ['c0'], hops: 2, linkTypes: ['KNOWS'] });
    const want = oracleNeighborhood(CORE_NODES, CORE_LINKS, { seeds: ['c0'], hops: 2, linkTypes: ['KNOWS'] });
    assert.deepEqual(Object.fromEntries(r.nodes.map(n => [n.id, n.hop])), want.hopOf);
    assert.deepEqual(r.links.map(l => l.id).sort(), [...want.links].sort());
    const capped = await call(m.client, 'neighborhood', { seeds: ['c0'], hops: 3, maxNodes: 3 });
    assert.equal(capped.nodes.length, 3); assert.equal(capped.truncated, true);
    const hr = await call(m.client, 'neighborhood', { seeds: ['z2'], hops: 4 });
    assert.ok(!JSON.stringify(hr).includes('hr:'));
    assert.match((await call(m.client, 'neighborhood', { seeds: ['nope'] })).error, /not|visible/i);
  } finally { await m.close(); }
});

test('N12 MCP find_paths matches the oracle (all + shortest)', async () => {
  const m = await mcp(app.ex);
  try {
    const r = await call(m.client, 'find_paths', { fromId: 'c0', toId: 'd1', maxHops: 5 });
    assert.deepEqual(r.paths.map(p => p.nodeIds), oraclePaths(CORE_LINKS, 'c0', 'd1', 5));
    const s = await call(m.client, 'find_paths', { fromId: 'c0', toId: 'd1', maxHops: 5, mode: 'shortest' });
    assert.deepEqual(s.paths.map(p => p.nodeIds), oraclePaths(CORE_LINKS, 'c0', 'd1', 3));
  } finally { await m.close(); }
});
