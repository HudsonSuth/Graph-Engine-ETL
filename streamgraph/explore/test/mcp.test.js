// MCP: the app's server (inbound) driven by the official SDK client in-process, the MCP client source (outbound)
// against a mock MCP server, and Streamable HTTP on the combined app. Ids: M1..M14.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createExplore, loadConfig } from '../server/app.js';
import { buildMcpServer } from '../server/mcp-server.js';
import { McpSource, mapMcpResult, resultJson } from '../server/connectors/mcp.js';
import { buildMockServer, DIRECTORY } from './fixtures/mock-mcp-server.mjs';
import { MAPPING } from './fixtures/mcp-mappings.js';
import { fSmall } from './fixtures.js';

const WRITE_TOOLS = ['upsert_node', 'upsert_link', 'remove_item', 'push_stream_batch', 'save_view', 'delete_view', 'set_layout'];
const cfgWith = (over = {}) => { const b = loadConfig(join(tmpdir(), 'no-such-explore-config.json')); return { ...b, ...over, access: { ...b.access, ...(over.access || {}) }, mcp: { ...b.mcp, ...(over.mcp || {}) } }; };
// Fake StreamGraph ABAC engine: user "owner" may read everything except type Secret; "ssn" is masked.
const studio = { engine: {
  subject: id => (id === 'owner' ? { id } : null),
  decide: async ({ entity }) => ({ allow: entity !== 'Secret' }),
  maskProps: (s, type, props) => ({ props: Object.fromEntries(Object.entries(props).filter(([k]) => k !== 'ssn')) }),
} };
async function seeded(over) {
  const ex = await createExplore({ config: cfgWith({ streams: ['external', 'hr'], access: { sources: { hr: { read: ['role:hr'] } } }, ...over }), studio, log: null });
  const p = ex.producer('external'), { nodes, links } = fSmall();
  for (const n of nodes) p.push('node.upsert', { ...n, sources: undefined });
  for (const l of links) p.push('link.upsert', { ...l, sources: undefined });
  await p.flush();
  const sg = ex.producer('streamgraph');
  sg.push('node.upsert', { id: 'sg:node:Customer:c1', type: 'Customer', label: 'Ada', properties: { name: 'Ada', ssn: '123-45-6789' } });
  sg.push('node.upsert', { id: 'sg:node:Secret:x', type: 'Secret', label: 'Vault', properties: {} });
  sg.push('link.upsert', { id: 'sg:link:c1-x', type: 'OWNS', fromId: 'sg:node:Customer:c1', toId: 'sg:node:Secret:x', properties: {} });
  sg.push('link.upsert', { id: 'sg:link:c1-s0', type: 'IS', fromId: 'sg:node:Customer:c1', toId: 's0', properties: {} });
  await sg.flush();
  const hr = ex.producer('hr'); hr.push('node.upsert', { id: 'hr:salary', type: 'Salary', label: 'Node salary', properties: { amount: 1 } }); await hr.flush();
  return ex;
}
async function connect(ex, opts) {
  const server = buildMcpServer(ex, opts), [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1' });
  await Promise.all([server.connect(a), client.connect(b)]);
  return { client, server, close: async () => { await client.close(); await server.close(); } };
}
const call = async (c, name, args = {}) => { const r = await c.callTool({ name, arguments: args }); return r.isError ? { error: r.content?.[0]?.text, raw: r } : resultJson(r); };

// ------------------------------------------------------------------ inbound: the app's MCP server
test('M1 listTools exposes the read tools and resources; write tools are absent by default', async t => {
  const ex = await seeded(), m = await connect(ex); t.after(async () => { await m.close(); await ex.close(); });
  const names = (await m.client.listTools()).tools.map(t => t.name).sort();
  assert.deepEqual(names, ['changes_since', 'cluster_overview', 'estimate_cost', 'filter_subgraph', 'find_paths', 'get_algorithm_result', 'get_node', 'get_view', 'graph_stats', 'grid_counts', 'list_algorithms', 'list_views', 'neighborhood', 'nodes_in_bbox', 'recent_deltas', 'run_algorithm', 'run_view', 'search_nodes', 'shortest_path']); // cluster_overview + estimate_cost: SPEC §24.6; grid_counts + nodes_in_bbox: SPEC §22.6; find_paths, neighborhood, *_algorithm(s): SPEC §23.6
  for (const w of WRITE_TOOLS) assert.ok(!names.includes(w));
  const res = (await m.client.listResources()).resources.map(r => r.uri).sort();
  assert.deepEqual(res, ['explore://changes', 'explore://schema', 'explore://style-config', 'explore://views']);
  const style = JSON.parse((await m.client.readResource({ uri: 'explore://style-config' })).contents[0].text);
  assert.equal(style.version, 1);
  const schema = JSON.parse((await m.client.readResource({ uri: 'explore://schema' })).contents[0].text);
  assert.ok(schema.nodeTypes.some(t => t.type === 'Person'));
});

test('M2 search_nodes finds by label and type and never returns items the MCP principal cannot read', async t => {
  const ex = await seeded(), m = await connect(ex); t.after(async () => { await m.close(); await ex.close(); });
  const r = await call(m.client, 'search_nodes', { text: 'node 1', limit: 100 });
  const ids = r.items.map(i => i.id);
  assert.ok(ids.includes('s1') && ids.includes('s10'));
  assert.ok(!ids.includes('hr:salary'), 'hr source requires role:hr');
  const typed = await call(m.client, 'search_nodes', { text: '', types: ['Company'], limit: 100 });
  assert.ok(typed.items.length > 0 && typed.items.every(i => i.type === 'Company'));
});

test('M3 get_node expands neighbours by depth and applies StreamGraph access rules (type deny + masking)', async t => {
  const ex = await seeded(), m = await connect(ex); t.after(async () => { await m.close(); await ex.close(); });
  const d1 = await call(m.client, 'get_node', { id: 's0', depth: 1 });
  const n1 = new Set(d1.items.filter(i => i.kind === 'node').map(i => i.id));
  assert.ok(n1.has('s1') && n1.has('s19') && n1.has('sg:node:Customer:c1'));
  assert.ok(!n1.has('s2'));
  const d2 = await call(m.client, 'get_node', { id: 's0', depth: 2 });
  assert.ok(d2.items.some(i => i.id === 's2'));
  const c1 = await call(m.client, 'get_node', { id: 'sg:node:Customer:c1', depth: 1 });
  assert.equal(c1.node.id, 'sg:node:Customer:c1');
  const me = c1.items.find(i => i.id === 'sg:node:Customer:c1');
  assert.equal(me.properties.ssn, undefined, 'ssn masked by StreamGraph rules');
  assert.ok(!c1.items.some(i => i.id === 'sg:node:Secret:x' || i.id === 'sg:link:c1-x'), 'Secret type denied, and its link with it');
  const denied = await call(m.client, 'get_node', { id: 'sg:node:Secret:x' });
  assert.match(denied.error, /not found or not visible/);
});

test('M4 results are capped at mcp.maxResults and flagged truncated', async t => {
  const ex = await seeded({ mcp: { maxResults: 5 } }), m = await connect(ex); t.after(async () => { await m.close(); await ex.close(); });
  const r = await call(m.client, 'search_nodes', { text: 'node', limit: 1000 });
  assert.equal(r.items.length, 5); assert.equal(r.truncated, true);
  const f = await call(m.client, 'filter_subgraph', { types: ['Person', 'Account'], limit: 1000 });
  assert.ok(f.nodes.length <= 5 && f.truncated);
});

test('M5 shortest_path, filter_subgraph, run_view and recent_deltas', async t => {
  const ex = await seeded(), m = await connect(ex); t.after(async () => { await m.close(); await ex.close(); });
  const p = await call(m.client, 'shortest_path', { fromId: 's0', toId: 's3' });
  assert.equal(p.found, true); assert.deepEqual(p.nodeIds, ['s0', 's1', 's2', 's3']);
  const f = await call(m.client, 'filter_subgraph', { property: 'risk', op: 'gte', value: 90 });
  assert.deepEqual(f.nodes.map(n => n.id).sort(), ['s18', 's19']);
  const v = await call(m.client, 'run_view', { filter: { types: ['Person'] }, layout: 'circular' });
  assert.equal(v.layout, 'circular'); assert.ok(v.nodes.length === 5 && v.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
  const missing = await call(m.client, 'run_view', { name: 'nope' });
  assert.match(missing.error, /No saved view/);
  const d = await call(m.client, 'recent_deltas', { limit: 2000 });
  assert.ok(d.events.length > 40 && d.events.every(e => e.sourceId !== 'hr'), 'deltas filtered by read permission');
  assert.ok(!d.events.some(e => e.id === 'sg:node:Secret:x'));
});

test('M6 a write tool call is rejected while writes are disabled, and nothing changes', async t => {
  const ex = await seeded(), m = await connect(ex), before = ex.service.items.size; t.after(async () => { await m.close(); await ex.close(); });
  let rejected = false;
  try { const r = await m.client.callTool({ name: 'upsert_node', arguments: { id: 'evil', type: 'X' } }); rejected = r.isError === true; } catch { rejected = true; }
  assert.ok(rejected, 'upsert_node must be rejected');
  assert.equal(ex.service.items.size, before); assert.equal(ex.service.get('evil'), undefined);
});

test('M7 with mcp.allowWrites=true writes flow through the stream contract and cannot remove other sources\' items', async t => {
  const ex = await seeded({ mcp: { allowWrites: true } }), m = await connect(ex); t.after(async () => { await m.close(); await ex.close(); });
  const names = (await m.client.listTools()).tools.map(t => t.name);
  for (const w of WRITE_TOOLS) assert.ok(names.includes(w));
  assert.deepEqual(await call(m.client, 'upsert_node', { id: 'm:1', type: 'Note', label: 'hello', properties: { a: 1 } }), { ok: true, id: 'm:1' });
  await call(m.client, 'upsert_link', { id: 'm:l1', type: 'ABOUT', fromId: 'm:1', toId: 's0' });
  assert.equal(ex.service.live('m:1').sources[0].sourceId, 'mcp');
  assert.equal(ex.ingest.cursor('mcp').lastAppliedSeq, 2);
  const s = await call(m.client, 'search_nodes', { text: 'hello' });
  assert.deepEqual(s.items.map(i => i.id), ['m:1']);
  const refused = await call(m.client, 'remove_item', { id: 's0', kind: 'node' });
  assert.match(refused.error, /forbidden/); assert.ok(ex.service.live('s0'));
  await call(m.client, 'remove_item', { id: 'm:1', kind: 'node' });
  assert.ok(!ex.service.live('m:1'), 'tombstoned');
  const bad = await call(m.client, 'push_stream_batch', { batch: { batchId: 'b', sourceId: 'not-a-stream', events: [] } });
  assert.match(bad.error, /not a configured stream/);
});

// ------------------------------------------------------------------ outbound: the MCP client source
test('M8 mapMcpResult: tool JSON -> canonical nodes/links with provenance (pure mapping)', () => {
  const { items, warnings } = mapMcpResult(DIRECTORY, MAPPING, 'dir', '2026-11-13T00:00:00Z');
  const nodes = items.filter(i => i.kind === 'node'), links = items.filter(i => i.kind === 'link');
  assert.equal(new Set(nodes.map(n => n.id)).size, 6, '4 people + 2 teams, all distinct');
  const ana = nodes.find(n => n.id === 'dir:node:p1');
  assert.deepEqual([ana.type, ana.label, ana.properties], ['Person', 'Ana Ruiz', { team: 'core', email: 'ana@example.com' }]);
  assert.deepEqual(ana.sources, [{ sourceId: 'dir', nativeId: 'p1', fetchedAt: '2026-11-13T00:00:00Z' }]);
  const m1 = links.find(l => l.type === 'MANAGES' && l.properties.since === 2023);
  assert.deepEqual([m1.fromId, m1.toId], ['dir:node:p1', 'dir:node:p2']);
  assert.equal(links.filter(l => l.type === 'MEMBER_OF').length, 4);
  assert.deepEqual(warnings, []);
  const w = mapMcpResult({ relations: [{ src: 'a' }] }, { links: [{ from: '/relations/*', source: 'src', target: 'dst', type: 'R' }] }, 'dir');
  assert.equal(w.warnings[0].code, 'null_endpoint');
});

test('M9 McpSource (in-memory mock server) lists tools, calls the tool and the result merges via the stream path', async t => {
  const ex = await createExplore({ config: cfgWith({ access: { sources: { dir: { read: ['role:analyst'] } } } }), log: null });
  const [a, b] = InMemoryTransport.createLinkedPair(); const mock = buildMockServer(); await mock.connect(a);
  const src = new McpSource({ sourceId: 'dir', tool: 'list_directory', transport: b, mapping: MAPPING, send: batch => ex.receive(batch) });
  t.after(async () => { await src.close(); await mock.close(); await ex.close(); });
  await src.start();
  assert.ok(src.tools.some(t => t.name === 'list_directory'));
  assert.equal(ex.ingest.status().find(s => s.sourceId === 'dir').status, 'live');
  const people = [...ex.service.items.values()].filter(i => i.type === 'Person' && !i.deleted);
  assert.equal(people.length, 4, 'four distinct people (two share a name)');
  const p3 = ex.service.live('dir:node:p3');
  assert.equal(p3.properties.email, 'sam.l@example.com');
  const sid = ex.service.openSession({ principal: { id: 'u', roles: ['analyst'] }, follow: false }).sessionId;
  const out = await ex.service.expand(sid, { ids: ['dir:node:p1'], types: ['Person'] });
  const manages = out.items.filter(i => i.kind === 'link' && i.type === 'MANAGES');
  assert.deepEqual(manages.map(l => `${l.fromId}->${l.toId}`).sort(), ['dir:node:p1->dir:node:p2', 'dir:node:p1->dir:node:p3'], 'Ana manages p2 and p3 (direction preserved)');
  // second pull is an idempotent no-op through dedupe/merge
  const noop0 = ex.service.metrics.noop; await src.pull(); assert.ok(ex.service.metrics.noop - noop0 >= 10);
  assert.equal([...ex.service.items.values()].filter(i => i.type === 'Person' && !i.deleted).length, 4);
});

test('M10 McpSource over stdio against the mock server process, with removeMissing snapshot semantics', async t => {
  const ex = await createExplore({ config: cfgWith({ access: { sources: { dir: { read: ['role:analyst'] } } } }), log: null });
  const script = fileURLToPath(new URL('./fixtures/mock-mcp-server.mjs', import.meta.url));
  const src = new McpSource({ sourceId: 'dir', command: process.execPath, args: [script], tool: 'list_directory', mapping: { ...MAPPING, removeMissing: true }, send: batch => ex.receive(batch) });
  let bad; t.after(async () => { await bad?.close(); await src.close(); await ex.close(); });
  await src.start();
  assert.equal([...ex.service.items.values()].filter(i => i.type === 'Person' && !i.deleted).length, 4);
  src.arguments = { team: 'ops' }; await src.pull();
  const alive = [...ex.service.items.values()].filter(i => i.type === 'Person' && !i.deleted).map(i => i.id).sort();
  assert.deepEqual(alive, ['dir:node:p3', 'dir:node:p4'], 'snapshot replace-source removed the people no longer returned');
  bad = new McpSource({ sourceId: 'dir2', command: process.execPath, args: [script], tool: 'missing_tool', mapping: MAPPING, send: b => ex.receive(b) });
  const env = await bad.pull();
  assert.equal(env.error.code, 'source_unavailable'); assert.match(env.error.message, /no tool "missing_tool"/);
});

// ------------------------------------------------------------------ HTTP: combined app (StreamGraph + explore + /mcp)
let app, dir;
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sgx-'));
  const { startCombined } = await import('../combined.js');
  app = await startCombined({ port: 0, dataDir: dir, log: null, config: cfgWith({ mcp: { actAs: null } }) });
});
after(async () => { await app?.close(); rmSync(dir, { recursive: true, force: true }); });

test('M11 Streamable HTTP /mcp on the combined server: list tools, search, and the UI + StreamGraph routes still answer', async t => {
  const base = `http://127.0.0.1:${app.sg.server.address().port}`;
  const p = app.ex.producer('external'); p.push('node.upsert', { id: 'h1', type: 'Thing', label: 'http hello', properties: {} }); await p.flush();
  const client = new Client({ name: 'http-test', version: '1' }); t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(base + '/mcp')));
  assert.ok((await client.listTools()).tools.some(t => t.name === 'search_nodes'));
  const r = resultJson(await client.callTool({ name: 'search_nodes', arguments: { text: 'http hello' } }));
  assert.deepEqual(r.items.map(i => i.id), ['h1']);
  assert.equal((await fetch(base + '/explore')).status, 200);
  assert.equal((await fetch(base + '/mcp')).status, 405);
  const port = app.sg.server.address().port; // DNS-rebinding guard: a foreign Host header is refused
  const status = await new Promise((res, rej) => { const q = request({ host: '127.0.0.1', port, path: '/mcp', method: 'POST', headers: { host: 'evil.example', 'content-type': 'application/json', accept: 'application/json, text/event-stream' } }, r => { r.resume(); res(r.statusCode); }); q.on('error', rej); q.end('{}'); });
  assert.equal(status, 403);
  assert.equal((await fetch(base + '/api/state')).status, 200, 'StreamGraph API untouched');
});

test('M12 explore/mcp-stdio.js: a desktop-style client spawns the app over stdio (stdout carries only MCP)', async t => {
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const d = mkdtempSync(join(tmpdir(), 'sgx-stdio-'));
  const client = new Client({ name: 'stdio-test', version: '1' });
  t.after(async () => { await client.close(); rmSync(d, { recursive: true, force: true }); });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../mcp-stdio.js', import.meta.url)), '--port', '0', '--data', d, '--synthetic', '200'], stderr: 'ignore', env: { ...process.env, EXPLORE_CONFIG: join(d, 'none.json') } }));
  const names = (await client.listTools()).tools.map(x => x.name);
  assert.ok(names.includes('get_node') && !names.includes('upsert_node'));
  const st = resultJson(await client.callTool({ name: 'graph_stats', arguments: {} }));
  assert.equal(st.totals.nodes, 200);
});

test('M13 HTTP bearer token (mcp.httpTokenEnv) is enforced on /mcp', async t => {
  const { createServer } = await import('node:http');
  const { mcpHttpHandler } = await import('../server/mcp-server.js');
  const ex = await seeded();
  const h = mcpHttpHandler(ex, { allowedHosts: null, token: 's3cret' });
  const srv = createServer((req, res) => h(req, res)); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  t.after(async () => { srv.close(); await ex.close(); });
  const url = new URL(`http://127.0.0.1:${srv.address().port}/mcp`);
  const denied = new Client({ name: 'no-token', version: '1' });
  await assert.rejects(denied.connect(new StreamableHTTPClientTransport(url)));
  const ok = new Client({ name: 'token', version: '1' }); t.after(() => ok.close());
  await ok.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: 'Bearer s3cret' } } }));
  assert.equal(resultJson(await ok.callTool({ name: 'search_nodes', arguments: { text: 'node 3' } })).items[0].id, 's3');
});

test('M14 in-process change feed: changes_since cursor, filters, long-poll and explore://changes notifications', async t => {
  const ex = await seeded(), m = await connect(ex); t.after(async () => { await m.close(); await ex.close(); });
  const { ResourceUpdatedNotificationSchema } = await import('@modelcontextprotocol/sdk/types.js');
  const notes = []; m.client.setNotificationHandler(ResourceUpdatedNotificationSchema, n => notes.push(n.params.uri));
  await m.client.subscribeResource({ uri: 'explore://changes' });
  const call = async (name, args) => JSON.parse((await m.client.callTool({ name, arguments: args })).content[0].text);
  const c0 = (await call('changes_since', { from: 'now' })).cursor;
  const p = ex.producer('external');
  p.push('node.upsert', { id: 'cf1', type: 'Person', properties: {} }); p.push('node.upsert', { id: 'cf2', type: 'Account', properties: {} }); await p.flush();
  const r1 = await call('changes_since', { cursor: c0 });
  assert.deepEqual(r1.events.map(e => e.id), ['cf1', 'cf2']); assert.equal(r1.mode, 'inprocess');
  assert.deepEqual((await call('changes_since', { cursor: c0, types: ['Account'] })).events.map(e => e.id), ['cf2']);
  const wait = call('changes_since', { cursor: r1.cursor, waitMs: 5000 });
  setTimeout(() => { p.push('node.upsert', { id: 'cf3', type: 'Person', properties: {} }); p.flush(); }, 100);
  assert.deepEqual((await wait).events.map(e => e.id), ['cf3']);
  for (let i = 0; i < 50 && !notes.length; i++) await new Promise(r => setTimeout(r, 20));
  assert.ok(notes.includes('explore://changes'));
  // duplicates are not reported as changes
  const before = ex.feed.n; await ex.receive({ batchId: 'dup', sourceId: 'external', partition: 0, events: [{ eventId: 'external-' + process.pid + ':1', op: 'node.upsert', seq: 1, payload: { id: 'cf1', type: 'Person' } }] });
  assert.equal(ex.feed.n, before);
});
