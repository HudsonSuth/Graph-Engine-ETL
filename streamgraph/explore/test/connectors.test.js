// SPEC §13.2 tests 3-6 and §4.6: connector mapping with fake drivers (no real databases).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Neo4jConnector, toJson } from '../server/connectors/neo4j.js';
import { PostgresConnector } from '../server/connectors/postgres.js';
import { HttpConnector } from '../server/connectors/http.js';
import { GraphService } from '../server/impl.js';

// ---- fake neo4j driver: records the cypher and returns canned records shaped like neo4j-driver objects
const nNode = (elementId, labels, properties) => ({ elementId, identity: { low: 1, high: 0 }, labels, properties });
const nRel = (elementId, type, s, e, properties = {}) => ({ elementId, type, startNodeElementId: s, endNodeElementId: e, properties });
function fakeNeo(records, { fail = null } = {}) {
  const calls = [];
  return { calls, verifyConnectivity: async () => { if (fail) throw new Error(fail); }, session: () => ({ run: async (cypher, params) => { calls.push({ cypher, params }); if (fail) throw new Error(fail); return { records: records.map(r => ({ toObject: () => r })) }; }, close: async () => {} }) };
}

test('T3 Cypher connector maps a 2-node 1-link result to one link with correct ends', async () => {
  const a = nNode('4:x:1', ['Person'], { name: 'Ann' }), b = nNode('4:x:2', ['Account'], { iban: 'X' });
  const drv = fakeNeo([{ n: a, r: nRel('5:x:9', 'OWNS', '4:x:1', '4:x:2', { since: 2020 }), m: b }]);
  const c = new Neo4jConnector({ sourceId: 'neo', driver: drv });
  const env = await c.expand({ ids: ['neo:node:4:x:1'] });
  assert.equal(env.error, null);
  const links = env.items.filter(i => i.kind === 'link'), nodes = env.items.filter(i => i.kind === 'node');
  assert.equal(links.length, 1); assert.equal(nodes.length, 2);
  assert.deepEqual([links[0].fromId, links[0].toId, links[0].type], ['neo:node:4:x:1', 'neo:node:4:x:2', 'OWNS']);
  assert.equal(nodes.find(n => n.type === 'Person').label, 'Ann');
  assert.deepEqual(drv.calls[0].params.ids, ['4:x:1']);
  assert.match(drv.calls[0].cypher, /-\[r\*1\.\.1\]-/, 'default expand is one hop, both directions');
});

test('Cypher connector flattens paths without duplicate ids, stringifies unsafe integers, stubs missing ends', async () => {
  const a = nNode('a', ['P'], { big: { low: -1, high: 0x7fffffff, toString: () => '9223372036854775807' }, small: { low: 5, high: 0 } }), b = nNode('b', ['P'], {}), c2 = nNode('c', ['P'], {});
  const path = { start: a, end: c2, segments: [{ start: a, relationship: nRel('r1', 'R', 'a', 'b'), end: b }, { start: b, relationship: nRel('r2', 'R', 'b', 'c'), end: c2 }] };
  const conn = new Neo4jConnector({ sourceId: 'neo', driver: fakeNeo([{ p: path }, { p: path }, { r: nRel('r3', 'R', 'c', 'zz') }]) });
  const env = await conn.search({});
  const ids = env.items.map(i => i.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate ids');
  assert.equal(env.items.find(i => i.id === 'neo:node:a').properties.big, '9223372036854775807');
  assert.equal(env.items.find(i => i.id === 'neo:node:a').properties.small, 5);
  assert.equal(env.items.find(i => i.id === 'neo:node:zz').properties.stub, true);
  assert.equal(toJson(2 ** 60), String(2 ** 60));
});

test('Cypher connector reports source_unavailable without leaking credentials, and limits/truncation', async () => {
  const c = new Neo4jConnector({ sourceId: 'neo', driver: fakeNeo([], { fail: 'connect ECONNREFUSED bolt://neo4j:hunter2@db:7687 password=hunter2' }), secrets: ['hunter2'] });
  const env = await c.search({ text: 'x' });
  assert.equal(env.error.code, 'source_unavailable');
  assert.ok(!JSON.stringify(env).includes('hunter2'));
  assert.equal((await c.health()).status, 'unavailable');
  const many = Array.from({ length: 6 }, (_, i) => ({ n: nNode('k' + i, ['T'], {}) }));
  const c2 = new Neo4jConnector({ sourceId: 'neo', driver: fakeNeo(many) });
  const e2 = await c2.search({ limit: 5 });
  assert.equal(e2.items.length, 5); assert.equal(e2.page.truncated, true); assert.equal(e2.page.nextCursor, '5');
});

// ---- fake pg pool: tiny in-memory evaluator for the parameterised SQL this connector generates
function fakePg(tables) {
  const calls = [];
  return { calls, query: async (q) => {
    const text = typeof q === 'string' ? q : q.text, values = q.values || [];
    calls.push({ text, values });
    const m = /FROM "(\w+)"/.exec(text); const rows = tables[m[1]] || [];
    let out = rows;
    const where = /WHERE (.*?)( ORDER BY| LIMIT|$)/.exec(text)?.[1];
    if (where && !where.includes('ILIKE')) {
      const groups = where.split(' OR ').map(g => [...g.matchAll(/CAST\("(\w+)" AS TEXT\) = \$(\d+)/g)].map(x => [x[1], values[+x[2] - 1]]));
      out = rows.filter(r => groups.some(conds => conds.every(([c, v]) => r[c] != null && String(r[c]) === v)));
    } else if (where) { const pat = values[2].slice(1, -1).toLowerCase(); out = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(pat))); }
    const lim = /LIMIT \$(\d+)/.exec(text); if (lim) out = out.slice(0, values[+lim[1] - 1]);
    return { rows: out };
  } };
}
const pgMappings = {
  nodes: [{ table: 'customers', idColumns: ['id'], type: 'Customer', labelColumn: 'name', propertyColumns: ['email'] },
          { table: 'products', idColumns: ['region', 'sku'], type: 'Product', labelColumn: 'title', propertyColumns: ['price'] }],
  links: [{ table: 'purchases', idColumns: ['pid'], type: 'BOUGHT', from: { node: 'customers', columns: ['cust_id'] }, to: { node: 'products', columns: ['region', 'sku'] }, propertyColumns: ['qty'] }],
};
const pgData = () => ({
  customers: [{ id: 1, name: 'Ann', email: 'ann@x.io' }, { id: 2, name: 'Bob', email: 'bob@x.io' }],
  products: [{ region: 'EU', sku: 'P1', title: 'Widget', price: 9.5 }, { region: 'US', sku: 'P2', title: 'Gadget', price: 20 }],
  purchases: [{ pid: 10, cust_id: 1, region: 'EU', sku: 'P1', qty: 2 }, { pid: 11, cust_id: 1, region: null, sku: 'P2', qty: 1 }, { pid: 12, cust_id: 2, region: 'US', sku: 'P2', qty: 5 }],
});

test('T4 SQL connector expand follows a link mapping, returns endpoint nodes, skips a NULL endpoint with a warning', async () => {
  const pool = fakePg(pgData());
  const c = new PostgresConnector({ sourceId: 'pg', pool, mappings: pgMappings });
  const env = await c.expand({ ids: ['pg:node:customers:1'] });
  assert.equal(env.error, null);
  const link = env.items.find(i => i.kind === 'link');
  assert.equal(env.items.filter(i => i.kind === 'link').length, 1);
  assert.deepEqual([link.id, link.fromId, link.toId, link.properties.qty], ['pg:link:purchases:10', 'pg:node:customers:1', 'pg:node:products:EU|P1', 2]);
  assert.ok(env.items.find(i => i.id === 'pg:node:products:EU|P1' && i.label === 'Widget'), 'composite key joined with |');
  assert.ok(env.warnings.some(w => w.code === 'null_endpoint'));
  assert.ok(pool.calls.every(q => !q.text.includes("'")), 'values are never inlined into SQL');
});

test('SQL connector rejects identifiers outside the allowlist and quotes/parameterises everything', () => {
  assert.throws(() => new PostgresConnector({ pool: fakePg({}), mappings: { nodes: [{ table: 'users; DROP TABLE x', idColumns: ['id'], type: 'U' }] } }), /invalid table/);
  assert.throws(() => new PostgresConnector({ pool: fakePg({}), allowedTables: ['customers'], mappings: { nodes: [{ table: 'secrets', idColumns: ['id'], type: 'S' }] } }), /allowlist/);
  assert.throws(() => new PostgresConnector({ pool: fakePg({}), mappings: { nodes: [{ table: 't', idColumns: ['id"--'], type: 'S' }] } }), /invalid column/);
});

test('SQL connector search with text filter and truncation', async () => {
  const c = new PostgresConnector({ sourceId: 'pg', pool: fakePg(pgData()), mappings: pgMappings });
  const env = await c.search({ text: 'ann', types: ['Customer'] });
  assert.deepEqual(env.items.map(i => i.id), ['pg:node:customers:1']);
  const e2 = await c.search({ limit: 1, types: ['Customer'] });
  assert.equal(e2.items.length, 1); assert.equal(e2.page.truncated, true);
});

test('T5 HTTP connector 503 does not delete existing items; 429 is throttled; partial JSON is rejected', async () => {
  const svc = new GraphService({ coalesceMs: 0 });
  let mode = 'ok';
  const f = async () => mode === '503' ? { status: 503, ok: false, text: async () => '' } : mode === '429' ? { status: 429, ok: false, text: async () => '' } : mode === 'partial' ? { status: 200, ok: true, text: async () => '{"nodes":[{"id":1' } : { status: 200, ok: true, text: async () => JSON.stringify({ nodes: [{ id: 1, type: 'T', name: 'one' }, { id: 2, type: 'T' }], links: [{ id: 'x', from: 1, to: 2, type: 'R' }] }) };
  svc.registerConnector(new HttpConnector({ sourceId: 'api', baseUrl: 'http://api.local/', search: 'search?q={text}', expand: 'expand?ids={ids}', fetch: f }));
  await svc.fetchFromConnector('api', 'search', { text: 'x' });
  assert.equal(svc.counts().nodes, 2);
  mode = '503'; const e = await svc.fetchFromConnector('api', 'search', { text: 'x' });
  assert.equal(e.error.code, 'source_unavailable'); assert.equal(svc.counts().nodes, 2); assert.equal(svc.counts().links, 1);
  mode = '429'; assert.equal((await svc.fetchFromConnector('api', 'search', {})).error.code, 'source_throttled');
  mode = 'partial'; assert.equal((await svc.fetchFromConnector('api', 'search', {})).error.code, 'invalid_response');
  assert.equal(svc.counts().nodes, 2);
});

test('T6 credential strings never appear in connector result envelopes (scan)', async () => {
  const secret = 'S3cr3t-P@ss', token = 'tok_ABC123XYZ';
  const envs = [];
  envs.push(await new Neo4jConnector({ driver: fakeNeo([], { fail: `auth failed for neo4j:${secret}@host password=${secret}` }), secrets: [secret] }).search({}));
  const badPool = { query: async () => { throw new Error(`password authentication failed: postgres://app:${secret}@db/x`); } };
  envs.push(await new PostgresConnector({ pool: badPool, mappings: pgMappings, secrets: [secret] }).search({}));
  envs.push(await new HttpConnector({ baseUrl: 'http://h/', search: 's', headers: { authorization: `Bearer ${token}` }, fetch: async () => { throw new Error(`fetch failed Authorization: Bearer ${token}`); } }).search({}));
  const blob = JSON.stringify(envs);
  for (const e of envs) assert.ok(e.error, 'each call failed');
  assert.ok(!blob.includes(secret) && !blob.includes(token), blob);
});

test('§4.6 two connectors merge into one graph with correct provenance arrays; failing connector does not wipe', async () => {
  const svc = new GraphService({ coalesceMs: 0, resolution: [{ type: 'Customer', keys: ['email'] }] });
  const neo = new Neo4jConnector({ sourceId: 'neo', driver: fakeNeo([{ n: nNode('n1', ['Customer'], { name: 'Ann', email: 'ann@x.io' }) }]) });
  const pg = new PostgresConnector({ sourceId: 'pg', pool: fakePg(pgData()), mappings: pgMappings });
  svc.registerConnector(neo); svc.registerConnector(pg);
  await svc.fetchFromConnector('neo', 'search', {});
  await svc.fetchFromConnector('pg', 'search', { types: ['Customer'] });
  const ann = svc.get('pg:node:customers:1');
  assert.equal(ann.id, 'neo:node:n1');
  assert.deepEqual(ann.sources.map(s => s.sourceId).sort(), ['neo', 'pg']);
  neo.driver = fakeNeo([], { fail: 'down' });
  const r = await svc.fetchFromConnector('neo', 'search', {});
  assert.ok(r.error); assert.ok(svc.live('neo:node:n1'));
});
