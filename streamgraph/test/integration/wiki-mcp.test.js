// W6 acceptance: the wiki as agent memory over MCP (SDK client, in-process) and HTTP, inside the combined app.
// Files are the source of truth; agents can never write or verify as human:; ABAC stays fail-closed (analyst subject);
// history / RDF / query features are reachable over MCP and filtered the same way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, cpSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
process.env.STREAMGRAPH_PROCESSING = 'off';
const { startCombined } = await import('../../explore/combined.js');
const { loadConfig } = await import('../../explore/server/app.js');
const { buildMcpServer } = await import('../../explore/server/mcp-server.js');
const { splitNote } = await import('../../src/wiki/parse.js');

const FX = fileURLToPath(new URL('../fixtures/wiki/', import.meta.url));
let app, dir, base, okf, cul, owner, analyst;
const wait = ms => new Promise(r => setTimeout(r, ms));
const call = async (m, p, b, as) => { const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', ...(as ? { 'x-sg-as': as } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, body: j }; };
async function mcp(opts) { const server = buildMcpServer(app.ex, opts), [a, b] = InMemoryTransport.createLinkedPair(), client = new Client({ name: 'wiki-test', version: '1' }); await Promise.all([server.connect(a), client.connect(b)]); return { client, close: async () => { await client.close(); await server.close(); } }; }
const tool = async (c, name, args = {}) => { const r = await c.client.callTool({ name, arguments: args }); return r.isError ? { error: r.content?.[0]?.text } : (r.structuredContent ?? JSON.parse(r.content[0].text)); };
const until = async (f, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await wait(50); } return false; };

test.before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sg-wiki-int-'));
  okf = join(dir, 'vaults', 'retail'); cul = join(dir, 'vaults', 'culinary');
  cpSync(join(FX, 'okf-retail'), okf, { recursive: true }); cpSync(join(FX, 'culinary'), cul, { recursive: true });
  const cfg = loadConfig(join(dir, 'none.json'));
  app = await startCombined({ port: 0, dataDir: join(dir, 'data'), log: null, config: { ...cfg, mcp: { ...cfg.mcp, wikiWrites: true } }, wikiDirs: [okf, cul] });
  base = `http://127.0.0.1:${app.port}`;
  await call('GET', '/api/studio/home'); // registers every type and field with the access rules
  for (const [e, f] of [['BigQueryTable', 'name'], ['BigQueryTable', 'description'], ['BigQueryTable', 'trust_tier'], ['BigQueryTable', 'status']]) await call('POST', '/api/studio/access/field', { entity: e, field: f, sensitivity: 'low' });
  await call('POST', '/api/studio/access/rule', { rule: { name: 'Analysts cannot see metrics', effect: 'deny', subjects: { roles: ['analyst'] }, actions: ['*'], resources: { entities: ['Metric'] } } });
  owner = await mcp(); analyst = await mcp({ actAs: 'analyst' });
  await wait(300);
});
test.after(async () => { await owner?.close(); await analyst?.close(); await app.close(); rmSync(dir, { recursive: true, force: true }); });

test('XW1 the combined app exposes wiki, history, RDF, query and schema tools over MCP', async () => {
  const names = (await owner.client.listTools()).tools.map(t => t.name);
  for (const n of ['wiki_vaults', 'wiki_outline', 'wiki_search', 'wiki_get', 'wiki_backlinks', 'wiki_stale', 'wiki_export', 'wiki_write_note', 'wiki_append_log', 'wiki_verify', 'history_timeline', 'history_at', 'history_compare', 'export_rdf', 'query_cypher', 'schema_to_context']) assert.ok(names.includes(n), n);
  const v = await tool(owner, 'wiki_vaults');
  assert.deepEqual(v.vaults.map(x => [x.slug, x.dialect]).sort(), [['culinary', 'vault-ld'], ['retail', 'okf']]);
  assert.equal(v.writeBack, false);
});

test('XW2 search, get and backlinks with trust tier, staleness and provenance', async () => {
  const s = await tool(owner, 'wiki_search', { q: 'customer' });
  assert.ok(s.results.some(r => r.path === 'tables/customers.md'));
  const g = await tool(owner, 'wiki_get', { id: 'retail:tables/customers' });
  assert.equal(g.note.trust_tier, 'human-reviewed'); assert.match(g.note.body, /Joined to \[orders\]/);
  assert.ok(g.backlinks.some(b => b.from.path === 'tables/orders.md'));
  assert.equal(g.generated.by, 'grokbot/reverse-engineering-analyst');
  const o = await tool(owner, 'wiki_get', { vault: 'retail', path: 'tables/orders.md' });
  assert.equal(o.note.is_stale, true); assert.equal(o.note.trust_tier, 'machine-confirmed');
  const st = await tool(owner, 'wiki_stale', { vault: 'retail' });
  assert.ok(st.notes.some(n => n.path === 'tables/orders.md' && n.reasons.some(r => /stale since/.test(r))));
});

test('XW3 an agent writes a note: file first, then the graph; read back, found by search, seen in changes_since', async () => {
  const before = await tool(owner, 'changes_since', { from: 'now' });
  const w = await tool(owner, 'wiki_write_note', { vault: 'retail', path: 'people/ada.md', frontmatter: { type: 'Person', title: 'Ada Lovelace' }, body: 'Ada owns the [customers](../tables/customers.md) table.\n' });
  assert.ok(!w.error, w.error); assert.equal(w.created, true); assert.equal(w.id, 'sg:node:Person:retail:people/ada');
  const fm = splitNote(readFileSync(join(okf, 'people/ada.md'), 'utf8')).frontmatter;
  assert.equal(fm.generated.by, 'grokbot/reverse-engineering-analyst'); assert.equal(fm.status, 'draft');
  const g = await tool(owner, 'wiki_get', { id: w.id }); assert.match(g.note.body, /Ada owns/); assert.equal(g.note.trust_tier, 'unverified');
  assert.ok((await tool(owner, 'wiki_search', { q: 'lovelace' })).results.some(r => r.id === w.id));
  assert.ok(await until(async () => (await tool(owner, 'changes_since', { cursor: before.cursor, limit: 500 })).events?.some(e => e.id === w.id)), 'the new node reaches the change feed');
  const upd = await tool(owner, 'wiki_write_note', { vault: 'retail', path: 'people/ada.md', frontmatter: { type: 'Person', title: 'Ada' }, body: 'x' });
  assert.match(upd.error, /already exists; pass expectedSha/);
  const ok = await tool(owner, 'wiki_write_note', { vault: 'retail', path: 'people/ada.md', frontmatter: { type: 'Person', title: 'Ada L.' }, body: 'updated', expectedSha: g.note.sha256 });
  assert.equal(ok.created, false);
  assert.equal(app.sg.app.graph.getNode('Person:retail:people/ada').props.name, 'Ada L.');
  const log = await tool(owner, 'wiki_append_log', { vault: 'retail', text: 'Learned who owns customers', refs: ['ada'] });
  assert.ok(!log.error, log.error); assert.match(readFileSync(join(okf, 'log.md'), 'utf8'), /Learned who owns customers \[\[ada\]\] \(by grokbot\/reverse-engineering-analyst\)/);
});

test('XW4 an agent can never write or verify as a human: actor', async () => {
  const a = await tool(owner, 'wiki_write_note', { vault: 'retail', path: 'x/forged.md', frontmatter: { type: 'Concept', verified: [{ by: 'human:whsutherland', at: '2026-11-16T00:00:00Z' }] } });
  assert.match(a.error, /cannot write human: actors/);
  const b = await tool(owner, 'wiki_write_note', { vault: 'retail', path: 'x/forged.md', frontmatter: { type: 'Concept', reviewer: 'human:whsutherland' } });
  assert.match(b.error, /cannot write human: actors/);
  assert.equal(existsSync(join(okf, 'x/forged.md')), false);
  const v = await tool(owner, 'wiki_verify', { id: 'retail:tables/orders', note: 'row counts match' });
  assert.equal(v.trust_tier, 'machine-confirmed'); assert.equal(v.verified.by, 'grokbot/reverse-engineering-analyst');
  const n = await tool(owner, 'wiki_get', { id: 'retail:people/ada' });
  const v2 = await tool(owner, 'wiki_verify', { id: n.note.id });
  assert.notEqual(v2.trust_tier, 'human-reviewed');
});

test('XW5 analyst subject: cannot write, hidden fields stay hidden, denied types are invisible, no search oracle', async () => {
  const w = await tool(analyst, 'wiki_write_note', { vault: 'retail', path: 'people/eve.md', frontmatter: { type: 'Person' }, body: 'x' });
  assert.match(w.error, /do not allow editing|Only admins/);
  assert.equal(existsSync(join(okf, 'people/eve.md')), false);
  const g = await tool(analyst, 'wiki_get', { id: 'retail:tables/customers' });
  assert.equal(g.note.title, 'Customers'); assert.equal(g.note.body, '[hidden]');
  assert.equal(g.note.frontmatter.description, 'One row per customer account.');
  assert.ok(!JSON.stringify(g).includes('Joined to'), 'hidden body never leaves the server');
  assert.match((await tool(analyst, 'wiki_get', { id: 'retail:metrics/net-revenue' })).error, /Not found|No wiki note/);
  assert.ok(!(await tool(analyst, 'wiki_outline', { vault: 'retail' })).notes.some(n => n.type === 'Metric'));
  assert.equal((await tool(analyst, 'wiki_search', { q: 'joined to' })).results.length, 0, 'body text is not searchable when the body is hidden');
  const x = await tool(analyst, 'wiki_export', { vault: 'retail', format: 'nquads' });
  assert.ok(!JSON.stringify(x).includes('net-revenue'), 'denied type not exported');
  const rdf = await tool(analyst, 'export_rdf', { format: 'ntriples' });
  assert.ok(!JSON.stringify(rdf).includes('Metric'));
});

test('XW6 only a recognised human verifies from the UI; "Test as" previews cannot', async () => {
  const r = await call('POST', '/api/explore/x/wiki/verify', { id: 'retail:people/ada', note: 'checked by hand' });
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.trust_tier, 'human-reviewed'); assert.equal(r.body.verified.by, 'human:whsutherland');
  const p = await call('POST', '/api/explore/x/wiki/verify', { id: 'retail:people/ada' }, 'analyst');
  assert.equal(p.status, 403);
});

test('XW7 wiki items are read-only in the graph explorer (write-back is off)', async () => {
  const r = await call('POST', '/api/explore/x/edit', { ops: [{ op: 'setProps', id: 'sg:node:BigQueryTable:retail:tables/customers', props: { title: 'hacked' } }] });
  assert.equal(r.status, 409); assert.match(r.body.error, /Markdown wiki/);
  assert.match(readFileSync(join(okf, 'tables/customers.md'), 'utf8'), /title: Customers/);
});

test('XW8 history, query and RDF export over MCP use the same access rules', async () => {
  const t1 = Date.now();
  await tool(owner, 'wiki_write_note', { vault: 'retail', path: 'people/bob.md', frontmatter: { type: 'Person', title: 'Bob' }, body: 'b' });
  assert.ok(await until(async () => { const c = await tool(owner, 'history_compare', { from: t1 - 1, to: Date.now() + 1000 }); return c.added?.some(i => i.id === 'sg:node:Person:retail:people/bob'); }), 'history sees the new note');
  const q = await tool(owner, 'query_cypher', { cypher: 'MATCH (a:BigQueryTable) RETURN a LIMIT 10' });
  assert.ok(!q.error, q.error); assert.ok(q.count >= 2);
  const qa = await tool(analyst, 'query_cypher', { cypher: 'MATCH (a:Metric) RETURN a LIMIT 10' });
  assert.match(qa.error, /do not allow asking about Metrics/);
  const ttl = await tool(owner, 'export_rdf', { format: 'turtle' });
  assert.ok(!ttl.error, ttl.error);
  const tl = await tool(owner, 'history_timeline'); assert.ok(tl.events > 0);
});

test('XW9 editing a note file on disk updates the graph (watcher, files are the source of truth)', async () => {
  const f = join(okf, 'tables/orders.md');
  writeFileSync(f, readFileSync(f, 'utf8').replace('title: Orders', 'title: Orders (edited on disk)'));
  assert.ok(await until(() => app.sg.app.graph.getNode('BigQueryTable:retail:tables/orders')?.props.name === 'Orders (edited on disk)', 4000), 'watcher re-imports within 4 s');
});

test('XW10 wiki_export uses the vault IRIs; schema_to_context converts MCP tool schemas (W2b)', async () => {
  const r = await owner.client.callTool({ name: 'wiki_export', arguments: { vault: 'culinary', format: 'turtle' } });
  assert.match(r.content[0].text, /cul:Recipe a owl:Class/);
  const c = await tool(owner, 'schema_to_context', { name: 'tool:wiki_search' });
  assert.ok(!c.error, c.error); assert.ok(c.context['@context'].q, 'the q argument gets a term');
  const ge = await tool(owner, 'schema_to_context', { name: 'graph-events', output: 'shacl' });
  assert.match(ge.turtle, /sh:NodeShape/);
});
