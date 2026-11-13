import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { compileWorkspace, compileQuestion, cleanupToSteps, keyExpr, keepIfExpr } from '../src/studio/compile.js';
import { suggestMatches, suggestRelationships, suggestMapping, normalize } from '../src/studio/match.js';
import { applyTransform } from '../src/transforms.js';
import { evaluate } from '../src/expr.js';
import { Pipeline, validateFlow } from '../src/flow.js';
import { GraphStore } from '../src/graph.js';
import { startServer } from '../src/app.js';

const dir = mkdtempSync(join(tmpdir(), 'sgui-'));
const runSteps = async (cleanup, data) => { let ev = { op: 'c', topic: 't', data }; for (const s of cleanupToSteps(cleanup)) ev = ev && await applyTransform(s, ev); return ev?.data ?? null; };

test('clean-up presets compile to expressions that do what the label says', async () => {
  assert.deepEqual(await runSteps([{ do: 'trim', field: 'n' }, { do: 'lowercase', field: 'n' }], { n: '  Too Small ' }), { n: 'too small' });
  assert.equal((await runSteps([{ do: 'parseDate', field: 'd', format: 'MM/DD/YYYY' }], { d: '11/03/2026' })).d, '2026-11-03');
  assert.equal((await runSteps([{ do: 'parseDate', field: 'd', format: 'DD/MM/YYYY' }], { d: '11/03/2026' })).d, '2026-03-11');
  assert.equal((await runSteps([{ do: 'parseDate', field: 'd', format: 'MM/DD/YYYY' }], { d: 'soon' })).d, 'soon', 'unreadable dates are left alone, not dropped');
  assert.equal((await runSteps([{ do: 'combine', fields: ['first name', 'last'], into: 'full', separator: ' ' }], { 'first name': 'Ada', last: 'Park' })).full, 'Ada Park');
  assert.equal((await runSteps([{ do: 'number', field: 'p' }], { p: '12.5' })).p, 12.5);
  assert.equal(await runSteps([{ do: 'keepIf', field: 'total', op: 'more than', value: '10' }], { total: '5' }), null);
  assert.ok(await runSteps([{ do: 'keepIf', field: 'r', op: 'contains', value: 'SMALL' }], { r: 'too small' }));
  assert.ok(await runSteps([{ do: 'trim', field: 'missing' }], { x: 1 }), 'missing fields do not break the row');
  assert.throws(() => keepIfExpr({ field: 'x', op: 'more than', value: 'abc' }), /needs a number/);
  assert.throws(() => cleanupToSteps([{ do: 'combine', fields: ['a', 'b'] }]), /Pick a name/);
});

test('matching rules give the same answer in the browser-facing scorer and in the compiled graph keys', async () => {
  for (const rule of ['exact', 'ignoreCase', 'normalizedId']) for (const v of [' C1', 'c-001', 'Ada Park', 'P1']) assert.equal(await evaluate(keyExpr('k', rule), { k: v }), normalize(v, rule), `${rule} ${v}`);
});

const CSV_ROWS = [{ id: 'C1', name: 'Ada', tier: 'x' }, { id: 'C2', name: 'Ben', tier: 'x' }, { id: 'C3', name: 'Cy', tier: 'x' }, { id: 'C4', name: 'Dee', tier: 'x' }];
const API_ROWS = [{ cust_id: ' c1', tier: 'gold' }, { cust_id: 'C2 ', tier: 'gold' }, { cust_id: 'c3', tier: 'silver' }, { cust_id: 'c9', tier: 'gold' }];

test('match suggestions: finds same customers despite case and spaces, scores overlap', () => {
  const [m] = suggestMatches([{ id: 'csv', name: 'the CSV', entity: 'Customer', rows: CSV_ROWS }, { id: 'api', name: 'the Loyalty API', entity: 'Customer', rows: API_ROWS }]);
  assert.equal(m.a.field, 'id'); assert.equal(m.b.field, 'cust_id'); assert.equal(m.rule, 'ignoreCase');
  assert.equal(m.overlap, 75); assert.equal(m.matched, 3);
  assert.match(m.sentence, /Customers in the CSV and the Loyalty API look like the same customers, matched on id \/ cust_id, 75% overlap/);
  assert.deepEqual(m.examples[0], ['C1', ' c1']);
});

test('match suggestions: normalized IDs, strictest rule wins ties, unrelated types and non-unique fields ignored', () => {
  const [m] = suggestMatches([{ id: 'a', name: 'A', entity: 'Account', rows: [{ acct: 'AC-001' }, { acct: 'AC-002' }] }, { id: 'b', name: 'B', entity: 'Account', rows: [{ ref: 'ac001' }, { ref: 'ac002' }] }]);
  assert.equal(m.rule, 'normalizedId'); assert.equal(m.overlap, 100);
  const [e] = suggestMatches([{ id: 'a', name: 'A', entity: 'Product', rows: [{ sku: 'P1' }, { sku: 'P2' }] }, { id: 'b', name: 'B', entity: 'Product', rows: [{ sku: 'P1' }, { sku: 'P2' }] }]);
  assert.equal(e.rule, 'exact');
  assert.deepEqual(suggestMatches([{ id: 'a', name: 'A', entity: 'Customer', rows: CSV_ROWS }, { id: 'b', name: 'B', entity: 'Product', rows: CSV_ROWS }]), []);
  const only = suggestMatches([{ id: 'a', name: 'A', entity: 'C', rows: [{ t: 'x', id: '1' }, { t: 'x', id: '2' }] }, { id: 'b', name: 'B', entity: 'C', rows: [{ t: 'x', k: '7' }, { t: 'x', k: '8' }] }]);
  assert.deepEqual(only, [], 'a field shared by many rows (tier) is not an identity');
});

test('relationship suggestions use the target type\'s matching rule', () => {
  const orders = { id: 'o', name: 'Orders', entity: 'Order', key: 'order_id', rows: [{ order_id: 'O1', customer_id: 'C2 ' }, { order_id: 'O2', customer_id: 'c1' }] };
  const cust = { id: 'c', name: 'Customers', entity: 'Customer', key: 'id', rows: CSV_ROWS };
  const [r] = suggestRelationships([orders, cust], { Customer: 'ignoreCase' });
  assert.deepEqual([r.source, r.field, r.toEntity, r.coverage], ['o', 'customer_id', 'Customer', 100]);
  assert.match(r.sentence, /Each Order belongs to a Customer via customer_id/);
  assert.equal(suggestRelationships([orders, cust], { Customer: 'exact' }).length, 0, 'exact rule: "C2 " and "c1" do not match');
});

test('wizard mapping suggestion guesses type and identifying field', () => {
  const s = suggestMapping([{ return_id: 'R1', order_id: 'O1', reason: 'x' }, { return_id: 'R2', order_id: 'O1', reason: 'y' }], 'returns.csv');
  assert.deepEqual([s.entity, s.key, s.keyIsUnique], ['Return', 'return_id', true]);
  assert.equal(suggestMapping(CSV_ROWS, 'customers.csv').key, 'id');
  assert.deepEqual(suggestMapping([{ 'Full Name': 'a', Email: 'e' }], 'crm').fields, { full_name: 'Full Name', email: 'Email' });
});

test('workspace compiles to a valid flow whose mapping links two sources into one entity', async () => {
  writeFileSync(join(dir, 'c.json'), JSON.stringify(CSV_ROWS)); writeFileSync(join(dir, 'l.json'), JSON.stringify(API_ROWS));
  writeFileSync(join(dir, 'o.json'), JSON.stringify([{ order_id: 'O1', customer_id: 'C2 ', total: '5' }, { order_id: 'O2', customer_id: 'c1', total: '50' }]));
  const ws = { entities: { Customer: { rule: 'ignoreCase' } }, relationships: [{ source: 'ord', field: 'customer_id', toEntity: 'Customer' }], sources: [
    { id: 'csv', kind: 'json', settings: { path: join(dir, 'c.json') }, entity: 'Customer', key: 'id', fields: { name: 'name' }, keepInSync: false },
    { id: 'api', kind: 'json', settings: { path: join(dir, 'l.json') }, entity: 'Customer', key: 'cust_id', fields: { tier: 'tier' }, keepInSync: false },
    { id: 'ord', kind: 'json', settings: { path: join(dir, 'o.json') }, entity: 'Order', key: 'order_id', fields: { total: 'total' }, keepInSync: false, cleanup: [{ do: 'number', field: 'total' }, { do: 'keepIf', field: 'total', op: 'more than', value: '10' }] }] };
  const flow = compileWorkspace(ws);
  assert.deepEqual(validateFlow(flow), []);
  assert.equal(flow.steps.find(s => s.id === 'saved_to_graph').config.mapping.api.nodes[0].key, keyExpr('cust_id', 'ignoreCase'));
  const g = new GraphStore(); await new Pipeline(flow, { graph: g }).runOnce();
  assert.equal(g.nodes('Customer').length, 5, 'C1-C4 combined with c1-c3, plus c9');
  assert.deepEqual(g.getNode('Customer:c1').props, { name: 'Ada', _src_csv: true, tier: 'gold', _src_api: true });
  assert.deepEqual(g.nodes('Order').map(n => n.key), ['O2'], 'clean-up filter dropped the small order');
  assert.deepEqual(g.query('(c:Customer)-[:HAS_ORDER]->(o:Order)').map(r => r.c.props.name), ['Ada']);
});

test('question builder compiles dropdown choices to pattern queries', () => {
  assert.deepEqual(compileQuestion({ entity: 'Customer', filters: [{ field: 'tier', op: 'is', value: 'gold' }], related: { entity: 'Order', edge: 'HAS_ORDER', dir: 'out', filters: [{ field: 'total', op: 'more than', value: 100 }] } }),
    { pattern: '(a:Customer {tier:"gold"})-[:HAS_ORDER]->(b:Order)', where: [{ alias: 'b', field: 'total', op: '>', value: 100 }] });
  assert.equal(compileQuestion({ entity: 'Order', related: { entity: 'Customer', edge: 'HAS_ORDER', dir: 'in' } }).pattern, '(a:Order)<-[:HAS_ORDER]-(b:Customer)');
  assert.deepEqual(compileQuestion({ entity: 'Customer', filters: [{ field: 'name', op: 'contains', value: 'ad' }, { field: 'email', op: 'has a value' }] }).where.map(w => w.op), ['contains', 'exists']);
  assert.throws(() => compileQuestion({}), /Pick what you want to see/);
  assert.throws(() => compileQuestion({ entity: 'C) MATCH (x' }), /Bad type/);
  assert.throws(() => compileQuestion({ entity: 'C', filters: [{ field: 'a"}', op: 'is', value: 1 }] }), /simple name/);
});

// ---------- wizard and studio HTTP API
const TOKEN = 'tok-s3cret-123';
const crm = http.createServer((q, r) => { if (q.headers.authorization !== `Bearer ${TOKEN}`) { r.statusCode = 401; return r.end('{}'); } r.end(JSON.stringify({ data: API_ROWS })); }).listen(0);
const S = await startServer({ port: 0, dataDir: join(dir, 'data'), log: null });
after(async () => { await S.close(); crm.close(); });
const base = `http://127.0.0.1:${S.app.port}`;
const post = async (p, b) => (await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json();

test('wizard API: upload, test, preview, suggest, save; friendly errors', async () => {
  const up = await (await fetch(`${base}/api/studio/upload?name=customers.csv`, { method: 'POST', body: 'id,name,tier\nC1,Ada,x\nC2,Ben,x\nC3,Cy,x\nC4,Dee,x\n' })).json();
  const t = await post('/api/studio/test', { kind: 'csv', settings: { path: up.path }, name: 'customers.csv' });
  assert.equal(t.ok, true); assert.equal(t.preview.length, 4); assert.deepEqual(t.columns, ['id', 'name', 'tier']);
  assert.deepEqual([t.suggestion.entity, t.suggestion.key], ['Customer', 'id']);
  assert.match((await post('/api/studio/test', { kind: 'csv', settings: { path: join(dir, 'nope.csv') } })).message, /couldn't find the file/);
  assert.match((await post('/api/studio/test', { kind: 'api', settings: { url: 'http://127.0.0.1:9' } })).message, /Nothing answered|couldn't reach/);
  assert.match((await post('/api/studio/test', { kind: 'api', settings: { url: 'example.com' } })).message, /should start with http/);
  const bad = await (await fetch(`${base}/api/studio/upload?name=x.exe`, { method: 'POST', body: 'x' })).json();
  assert.match(bad.error, /Upload a .csv or .json/);
  const s1 = await post('/api/studio/sources', { name: 'Customers spreadsheet', kind: 'csv', settings: { path: up.path }, entity: 'Customer', key: 'id', fields: { name: 'name' } });
  assert.equal(s1.id, 'customers_spreadsheet');
  assert.match((await post('/api/studio/sources', { kind: 'csv', name: '', entity: 'X', key: 'id' })).error, /Give this source a name/);
});

test('wizard API: secrets are tested and stored server-side only', async () => {
  const url = `http://127.0.0.1:${crm.address().port}/`;
  assert.match((await post('/api/studio/test', { kind: 'api', settings: { url }, secret: 'wrong' })).message, /said no/);
  const t = await post('/api/studio/test', { kind: 'api', settings: { url }, secret: TOKEN });
  assert.equal(t.ok, true); assert.equal(t.itemsPath, 'data'); assert.equal(t.preview.length, 4);
  const s = await post('/api/studio/sources', { name: 'Loyalty API', kind: 'api', settings: { url, itemsPath: 'data', token: TOKEN }, secret: TOKEN, entity: 'Customer', key: 'cust_id', fields: { tier: 'tier' } });
  const pub = JSON.stringify(await (await fetch(`${base}/api/studio/workspace`)).json()), flow = JSON.stringify(await (await fetch(`${base}/api/flow`)).json());
  assert.ok(!pub.includes(TOKEN) && !flow.includes(TOKEN), 'secret never leaves the server');
  assert.ok(pub.includes('••••'));
  assert.ok(!readFileSync(join(dir, 'data', 'workspace.json'), 'utf8').includes(TOKEN));
  if (process.platform !== 'win32') assert.equal(statSync(join(dir, 'data', 'secrets.json')).mode & 0o777, 0o600); // POSIX only: Windows has no chmod
  assert.equal(s.workspace.sources.length, 2);
  await new Promise(r => setTimeout(r, 400));
  const h = await (await fetch(`${base}/api/studio/home`)).json();
  assert.deepEqual(h.sources.map(x => x.health), ['green', 'green'], 'the API source authenticates with the stored secret');
  assert.equal(h.checklist.find(c => c.id === 'add2').done, true);
});

test('database wizard: lists tables, previews rows, spots the "last changed" column', async () => {
  const db = new DatabaseSync(join(dir, 'inv.db')); db.exec("CREATE TABLE stock(sku TEXT, qty INT, updated_at TEXT); INSERT INTO stock VALUES ('P1', 3, '2026-01-01')"); db.close();
  const t1 = await post('/api/studio/test', { kind: 'database', settings: { driver: 'sqlite', file: join(dir, 'inv.db') } });
  assert.deepEqual(t1.tables, ['stock']);
  const t2 = await post('/api/studio/test', { kind: 'database', settings: { driver: 'sqlite', file: join(dir, 'inv.db'), table: 'stock' } });
  assert.equal(t2.timeColumn, 'updated_at'); assert.equal(t2.preview[0].sku, 'P1');
  assert.match((await post('/api/studio/test', { kind: 'database', settings: { driver: 'sqlite', file: join(dir, 'inv.db'), table: 'nope' } })).message, /couldn't find the table "nope"/);
  assert.match((await post('/api/studio/test', { kind: 'database', settings: { driver: 'postgres', host: '127.0.0.1', port: 9, database: 'x' }, secret: 'pw' })).message, /Nothing answered/);
});

test('linking API: suggestions, linked preview, confirm, then ask, search and clean-up preview', async () => {
  const sug = await (await fetch(`${base}/api/studio/suggestions`)).json();
  assert.equal(sug.matches.length, 1); assert.equal(sug.matches[0].rule, 'ignoreCase'); assert.equal(sug.matches[0].overlap, 75);
  const sample = await post('/api/studio/linked-sample', { matches: sug.matches });
  assert.equal(sample.entities.Customer.inSeveral, 3); assert.deepEqual(sample.entities.Customer.examples[0].sources, ['Customers spreadsheet', 'Loyalty API']);
  await post('/api/studio/links', { matches: sug.matches });
  await new Promise(r => setTimeout(r, 400));
  assert.equal(S.app.graph.nodes('Customer').length, 5);
  const ans = await post('/api/studio/ask', { question: { entity: 'Customer', filters: [{ field: 'tier', op: 'is', value: 'gold' }] } });
  assert.deepEqual(ans.table.map(r => r.Customer).sort(), ['Ada', 'Ben', 'c9']);
  assert.equal((await (await fetch(`${base}/api/studio/search?q=ben`)).json()).results[0].props.name, 'Ben');
  const cp = await post('/api/studio/cleanup-preview', { sourceId: 'loyalty_api', cleanup: [{ do: 'trim', field: 'cust_id' }, { do: 'keepIf', field: 'tier', op: 'is', value: 'gold' }] });
  assert.deepEqual(cp.after.map(r => r && r.cust_id), ['c1', 'C2', null, 'c9']);
  const meta = await (await fetch(`${base}/api/studio/explore`)).json();
  assert.ok(meta.entities[0].fields.tier.values.includes('gold'));
  const h = await (await fetch(`${base}/api/studio/home`)).json();
  assert.equal(h.checklist.find(c => c.id === 'link').done, true); assert.equal(h.checklist.find(c => c.id === 'ask').done, true);
});
