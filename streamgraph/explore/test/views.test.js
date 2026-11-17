// Saved views (SPEC §19): server store, HTTP API, persistence, export/import, MCP tools and access filtering.
// VIEWS_IMPL=wrong swaps in the deliberately wrong store; V1, V2, V3, V6 and V7 must then fail (wrong-impl.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createExplore, loadConfig } from '../server/app.js';
import { buildMcpServer } from '../server/mcp-server.js';
import { resultJson } from '../server/connectors/mcp.js';
import { SavedViewStore } from '../server/views-impl.js';
import { normalizeViewState } from '../shared/saved-views.js';
import { fSmall } from './fixtures.js';

const FULL = {
  version: 1,
  layout: { kind: 'radial', spacing: 7, orientation: 'left', incremental: false, animate: false, roots: ['s1'] },
  positions: { s0: [1.5, -2], s1: [3, 4] },
  filters: { hiddenTypes: ['Device'], hiddenLinkTypes: ['KNOWS'], where: [{ type: 'Person', property: 'risk', op: 'gte', value: 20 }], neighborhood: { ids: ['s1'], depth: 2 }, hideIsolated: true },
  style: { url: '/explore/style-config.v1.json' }, theme: 'light',
  camera: { x: 0.4, y: 0.6, ratio: 0.5, angle: 0 }, fit: 'selection',
  selection: ['s1', 's2'], pinned: ['s0'],
  time: { live: false, cut: 640 }, processor: { size: false, alerts: true },
  presenter: { title: 'T', caption: 'C' },
};
const cfgWith = (over = {}) => { const b = loadConfig(join(tmpdir(), 'no-such-explore-config.json')); return { ...b, ...over, access: { ...b.access, ...(over.access || {}) }, mcp: { ...b.mcp, ...(over.mcp || {}) } }; };
const studio = { engine: { subject: id => (id === 'owner' ? { id } : null), decide: async ({ entity }) => ({ allow: entity !== 'Secret' }), maskProps: (s, t, props) => ({ props }) } };
async function seeded(dir, over) {
  const ex = await createExplore({ config: cfgWith({ viewsDir: dir, streams: ['external', 'hr'], access: { sources: { hr: { read: ['role:hr'] } } }, ...over }), studio, log: null });
  const p = ex.producer('external'), { nodes, links } = fSmall();
  for (const n of nodes) p.push('node.upsert', { ...n, sources: undefined }); for (const l of links) p.push('link.upsert', { ...l, sources: undefined });
  await p.flush();
  const hr = ex.producer('hr'); hr.push('node.upsert', { id: 'hr:salary', type: 'Salary', label: 'salary', properties: {} }); await hr.flush();
  const sg = ex.producer('streamgraph'); sg.push('node.upsert', { id: 'sg:node:Secret:x', type: 'Secret', label: 'Vault', properties: {} }); await sg.flush();
  return ex;
}
/** call ex.handle like the HTTP server would */
async function http(ex, method, path, body) {
  const { Readable } = await import('node:stream');
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]); req.method = method; req.headers = {};
  return new Promise(resolve => { const res = { headersSent: false, code: 0, writeHead(c) { this.code = c; this.headersSent = true; }, end(b) { resolve({ status: this.code, body: b ? JSON.parse(b) : null }); }, write() {} }; ex.handle(req, res, new URL(path, 'http://x')); });
}
const tmp = () => mkdtempSync(join(tmpdir(), 'sgx-views-'));

test('V1 save -> load round-trips every part of a view (layout, positions, filters, style, camera, selection, time, overlay)', async t => {
  const dir = tmp(), ex = await seeded(dir); t.after(async () => { await ex.close(); rmSync(dir, { recursive: true, force: true }); });
  const c = await http(ex, 'POST', '/api/explore/views', { name: 'Full view', description: 'd', state: FULL });
  assert.equal(c.status, 201); assert.equal(c.body.view.id, 'full-view');
  const g = await http(ex, 'GET', '/api/explore/views/full-view');
  assert.equal(g.status, 200);
  assert.deepEqual(g.body.state, normalizeViewState(FULL));
  for (const k of ['layout', 'positions', 'filters', 'style', 'theme', 'camera', 'selection', 'pinned', 'time', 'processor', 'presenter']) assert.deepEqual(g.body.state[k], FULL[k], k);
});

test('V2 list, rename (same id), update state, delete (also removed from presentations)', async t => {
  const dir = tmp(), ex = await seeded(dir); t.after(async () => { await ex.close(); rmSync(dir, { recursive: true, force: true }); });
  await http(ex, 'POST', '/api/explore/views', { name: 'A', state: FULL }); await http(ex, 'POST', '/api/explore/views', { name: 'A', state: {} });
  let l = (await http(ex, 'GET', '/api/explore/views')).body.views; assert.deepEqual(l.map(v => v.id).sort(), ['a', 'a-2'], 'same name gets a unique id');
  const r = await http(ex, 'PUT', '/api/explore/views/a', { name: 'Renamed' });
  assert.equal(r.body.view.id, 'a'); assert.equal(r.body.view.name, 'Renamed');
  l = (await http(ex, 'GET', '/api/explore/views')).body.views; assert.equal(l.length, 2, 'rename must not create a second view');
  assert.deepEqual((await http(ex, 'GET', '/api/explore/views/a')).body.state.filters.hiddenTypes, ['Device'], 'rename keeps the state');
  await http(ex, 'PUT', '/api/explore/views/a', { state: { ...FULL, filters: { hiddenTypes: ['Person'] } } });
  assert.deepEqual((await http(ex, 'GET', '/api/explore/views/a')).body.state.filters.hiddenTypes, ['Person']);
  await http(ex, 'PUT', '/api/explore/presentations/deck', { name: 'Deck', viewIds: ['a', 'a-2'] });
  assert.equal((await http(ex, 'DELETE', '/api/explore/views/a')).status, 200);
  assert.equal((await http(ex, 'GET', '/api/explore/views/a')).status, 404);
  assert.deepEqual((await http(ex, 'GET', '/api/explore/presentations/deck')).body.viewIds, ['a-2']);
  assert.equal((await http(ex, 'PUT', '/api/explore/presentations/bad', { viewIds: ['nope'] })).status, 400);
});

test('V3 views persist server-side next to the app data (survive a restart); deleted seeds stay deleted', async t => {
  const dir = tmp(); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const seed = { format: 'streamgraph-explore-views', version: 1, views: [{ id: 'seed-1', name: 'Seed', state: FULL }, { id: 'seed-2', name: 'Seed 2', state: {} }], presentations: [{ id: 'tour', name: 'Tour', viewIds: ['seed-1', 'seed-2'] }] };
  const a = new SavedViewStore({ dir }); a.importBundle(seed, { seed: true, origin: 'seed' }); a.create({ name: 'Mine', state: FULL }); a.delete('seed-2');
  const file = JSON.parse(readFileSync(join(dir, 'explore-views.json'), 'utf8')); assert.equal(file.format, 'streamgraph-explore-views');
  const b = new SavedViewStore({ dir }); b.importBundle(seed, { seed: true, origin: 'seed' });
  assert.deepEqual(b.list().map(v => v.id).sort(), ['mine', 'seed-1']);
  assert.deepEqual(b.get('mine').state, normalizeViewState(FULL));
  assert.deepEqual(b.getPresentation('tour').viewIds, ['seed-1']);
});

test('V4 export -> import into a fresh store reproduces views and presentations; bad bundles are refused', async t => {
  const d1 = tmp(), d2 = tmp(); t.after(() => { rmSync(d1, { recursive: true, force: true }); rmSync(d2, { recursive: true, force: true }); });
  const a = new SavedViewStore({ dir: d1 }); a.create({ name: 'One', state: FULL }); a.create({ name: 'Two', state: { layout: { kind: 'grid' } } }); a.putPresentation({ id: 'p', name: 'P', viewIds: ['two', 'one'] });
  const bundle = JSON.parse(JSON.stringify(a.exportBundle()));
  const b = new SavedViewStore({ dir: d2 }); const r = b.importBundle(bundle);
  assert.deepEqual(r.added.sort(), ['one', 'two']);
  for (const id of ['one', 'two']) assert.deepEqual(b.get(id).state, a.get(id).state);
  assert.deepEqual(b.getPresentation('p').viewIds, ['two', 'one']);
  assert.throws(() => b.importBundle({ views: [] }), /bundle/);
  const again = b.importBundle(bundle); assert.deepEqual(again.updated.sort(), ['one', 'two'], 'merge overwrites by id');
});

test('V5 view state is normalised, never throws: junk fields dropped, unsafe style URL and bad camera refused with warnings', () => {
  const w = []; const s = normalizeViewState({ layout: { kind: 'force', evil: 1 }, style: { url: 'https://evil.example/x.json' }, camera: { x: 'a' }, filters: { where: [{ property: 'p', op: 'drop table' }], hiddenTypes: [1, 'A', 'A'] }, positions: { a: [1, 2], b: ['x', 1] }, extra: 1 }, w);
  assert.deepEqual(s.layout, { kind: 'force' }); assert.equal(s.style, null); assert.equal(s.camera, null); assert.deepEqual(s.filters.where, []); assert.deepEqual(s.filters.hiddenTypes, ['A']); assert.deepEqual(s.positions, { a: [1, 2] }); assert.equal(s.extra, undefined);
  assert.ok(w.some(x => /style.url/.test(x)) && w.some(x => /unknown op/.test(x)));
  assert.doesNotThrow(() => normalizeViewState(null)); assert.doesNotThrow(() => normalizeViewState('x'));
});

test('V6 MCP list_views / get_view respect access rules (hidden-source and ABAC-denied ids removed); save_view only with writes enabled', async t => {
  const dir = tmp(), ex = await seeded(dir); t.after(async () => { await ex.close(); rmSync(dir, { recursive: true, force: true }); });
  ex.views.create({ name: 'Mixed', state: { ...FULL, selection: ['s1', 'hr:salary', 'sg:node:Secret:x'], pinned: ['hr:salary'], positions: { s1: [1, 1], 'hr:salary': [2, 2] }, layout: { kind: 'radial', roots: ['sg:node:Secret:x', 's2'] } } });
  const server = buildMcpServer(ex, { actAs: 'owner' }), [a, b] = InMemoryTransport.createLinkedPair(), client = new Client({ name: 't', version: '1' });
  await Promise.all([server.connect(a), client.connect(b)]); t.after(async () => { await client.close(); await server.close(); });
  const names = (await client.listTools()).tools.map(x => x.name);
  assert.ok(names.includes('list_views') && names.includes('get_view')); assert.ok(!names.includes('save_view') && !names.includes('delete_view'));
  const l = resultJson(await client.callTool({ name: 'list_views', arguments: {} })); assert.deepEqual(l.views.map(v => v.id), ['mixed']);
  const g = resultJson(await client.callTool({ name: 'get_view', arguments: { id: 'mixed' } }));
  assert.equal(g.url, '/explore?view=mixed');
  assert.deepEqual(g.view.state.selection, ['s1'], 'hr (no role) and Secret (ABAC deny) are dropped');
  assert.deepEqual(g.view.state.pinned, []); assert.deepEqual(Object.keys(g.view.state.positions), ['s1']); assert.deepEqual(g.view.state.layout.roots, ['s2']);
  assert.ok(!JSON.stringify(g).includes('hr:salary') && !JSON.stringify(g).includes('Secret:x'), 'hidden ids never leak');
  const miss = await client.callTool({ name: 'get_view', arguments: { id: 'nope' } }); assert.ok(miss.isError);
  // writes on
  const w = buildMcpServer(ex, { allowWrites: true }), [c2, d2] = InMemoryTransport.createLinkedPair(), cl2 = new Client({ name: 't2', version: '1' });
  await Promise.all([w.connect(c2), cl2.connect(d2)]); t.after(async () => { await cl2.close(); await w.close(); });
  const s = resultJson(await cl2.callTool({ name: 'save_view', arguments: { name: 'From agent', state: { layout: { kind: 'grid' }, filters: { hiddenTypes: ['Person'] } } } }));
  assert.equal(s.id, 'from-agent'); assert.deepEqual(ex.views.get('from-agent').state.filters.hiddenTypes, ['Person']);
  resultJson(await cl2.callTool({ name: 'delete_view', arguments: { id: 'from-agent' } })); assert.equal(ex.views.get('from-agent'), null);
});

test('V7 the UI view API applies the same filtering for the UI principal (no role for source hr)', async t => {
  const dir = tmp(), ex = await seeded(dir); t.after(async () => { await ex.close(); rmSync(dir, { recursive: true, force: true }); });
  ex.views.create({ name: 'UI', state: { selection: ['s3', 'hr:salary'] } });
  assert.deepEqual((await http(ex, 'GET', '/api/explore/views/ui')).body.state.selection, ['s3']);
  assert.equal((await http(ex, 'POST', '/api/explore/views', { name: '', state: {} })).status, 400);
  assert.equal((await http(ex, 'POST', '/api/explore/views', { id: '../x', name: 'x', state: {} })).status, 400);
});
