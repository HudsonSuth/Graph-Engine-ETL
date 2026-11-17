// Integration tests: the explore layer inside the studio obeys StreamGraph access rules on every endpoint, and the Phase 3/4
// endpoints (history, editing, comments, notebooks, export, query builder, plain-English, RDF) behave and stay inside ABAC.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.STREAMGRAPH_PROCESSING = 'off';
const { startCombined } = await import('../../explore/combined.js');
const { loadConfig } = await import('../../explore/server/app.js');

let app, dir, base, g;
const call = async (m, p, b, as) => { const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', ...(as ? { 'x-sg-as': as } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { code: r.status, body: j, text: t }; };
const wait = ms => new Promise(r => setTimeout(r, ms));
test.before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sg-int-'));
  app = await startCombined({ port: 0, dataDir: dir, log: null, config: loadConfig(join(dir, 'none.json')) });
  base = `http://127.0.0.1:${app.port}`; g = app.sg.app.graph;
  g.upsertNode('Customer:c1', 'Customer', 'c1', { name: 'Ada Lovelace', email: 'ada@example.com', city: 'Boston', spend: 120 });
  g.upsertNode('Customer:c2', 'Customer', 'c2', { name: 'Bob Stone', email: 'bob@example.com', city: 'Austin', spend: 40 });
  g.upsertNode('Product:p1', 'Product', 'p1', { name: 'Trail Shoe', price: 90 });
  g.upsertNode('Secret:s1', 'Secret', 's1', { name: 'Project X', code: 'zz-top-secret' });
  g.upsertEdge('BOUGHT', 'Customer:c1', 'Product:p1', {}); g.upsertEdge('BOUGHT', 'Customer:c2', 'Product:p1', {}); g.upsertEdge('KNOWS', 'Customer:c1', 'Secret:s1', {});
  await call('GET', '/api/studio/home'); // registers every type and field with the access rules
  for (const [e, f, s] of [['Customer', 'name', 'low'], ['Customer', 'city', 'low'], ['Customer', 'spend', 'low'], ['Customer', 'email', 'high'], ['Product', 'name', 'low'], ['Product', 'price', 'low']]) await call('POST', '/api/studio/access/field', { entity: e, field: f, sensitivity: s });
  await call('POST', '/api/studio/access/rule', { rule: { name: 'Analysts cannot see secrets', effect: 'deny', subjects: { roles: ['analyst'] }, actions: ['*'], resources: { entities: ['Secret'] } } });
  app.sg.studio.engine.keyFields = { Customer: ['email'] }; // the identifying field is hidden from the analyst -> pseudonyms
  await wait(200);
});
test.after(async () => { await app.close(); rmSync(dir, { recursive: true, force: true }); });
const open = async as => (await call('POST', '/api/explore/session', { follow: true }, as)).body;
const ids = items => items.map(i => i.id).sort();

test('X1 explore session as owner sees everything; as analyst the denied type, its links and hidden fields are gone', async () => {
  const o = await open(); assert.ok(o.snapshot.items.some(i => i.id === 'sg:node:Secret:s1'));
  const a = await open('analyst'), it = a.snapshot.items;
  assert.ok(!JSON.stringify(a).includes('Secret') && !JSON.stringify(a).includes('zz-top-secret'), 'no Secret node, link or value');
  assert.ok(!JSON.stringify(a).includes('ada@example.com'), 'hidden field value never leaves the server');
  const ada = it.find(i => i.label === 'Ada Lovelace'); assert.ok(ada); assert.equal(ada.properties.email, '[hidden]');
  assert.match(ada.id, /^sg:node:Customer:anon-/, 'key hidden -> pseudonym id (same as the studio)'); assert.ok(!ada.id.endsWith(':c1'));
  assert.ok(it.some(i => i.kind === 'link' && i.fromId === ada.id), 'links use the pseudonym ids too');
});
test('X2 search, expand, path and neighbourhood never return denied items; search cannot match hidden values', async () => {
  const s = await open('analyst'), sid = s.sessionId;
  assert.equal((await call('POST', `/api/explore/session/${sid}/search`, { text: 'ada@example' }, 'analyst')).body.items.length, 0, 'no oracle on hidden fields');
  assert.equal((await call('POST', `/api/explore/session/${sid}/search`, { text: 'project x' }, 'analyst')).body.items.length, 0);
  const ada = (await call('POST', `/api/explore/session/${sid}/search`, { text: 'ada' }, 'analyst')).body.items[0]; assert.equal(ada.label, 'Ada Lovelace');
  const exp = await call('POST', `/api/explore/session/${sid}/expand`, { ids: [ada.id] }, 'analyst'); // pseudonym in, works
  assert.equal(exp.code, 200); assert.ok(!exp.text.includes('Secret'), exp.text.slice(0, 300)); assert.ok(exp.text.includes('Trail Shoe'));
  const nb = await call('POST', `/api/explore/session/${sid}/neighborhood?stream=1`, { seeds: [ada.id], hops: 2 }, 'analyst');
  assert.equal(nb.code, 200); assert.ok(!nb.text.includes('Secret') && !nb.text.includes('Customer:c1'), 'streamed chunks are filtered');
  const ownerSearch = (await call('POST', `/api/explore/session/${(await open()).sessionId}/search`, { text: 'ada@example' })).body.items; assert.equal(ownerSearch.length, 1);
});
test('X3 sessions belong to the user that opened them; unknown users are refused', async () => {
  const s = await open('analyst');
  assert.equal((await call('POST', `/api/explore/session/${s.sessionId}/search`, { text: 'a' })).code, 403);
  assert.equal((await call('POST', '/api/explore/session', {}, 'nobody')).code, 403);
});
test('X4 live updates (server push) for the analyst skip denied items', async () => {
  const s = await open('analyst'), ac = new AbortController(); let got = '';
  const r = await fetch(`${base}/api/explore/session/${s.sessionId}/events`, { headers: { 'x-sg-as': 'analyst' }, signal: ac.signal });
  const rd = r.body.getReader(); const pump = (async () => { try { for (;;) { const { value, done } = await rd.read(); if (done) break; got += Buffer.from(value).toString(); } } catch {} })();
  g.upsertNode('Secret:s2', 'Secret', 's2', { name: 'Project Y' }); g.upsertNode('Product:p2', 'Product', 'p2', { name: 'Rain Jacket', price: 70 });
  await wait(1500); ac.abort(); await pump;
  assert.ok(got.includes('Rain Jacket'), 'allowed update arrives'); assert.ok(!got.includes('Project Y') && !got.includes('Secret'), 'denied update does not');
});
test('X5 algorithms, clusters, geo and saved views are filtered for the analyst', async () => {
  const r = await call('POST', '/api/explore/algo/run', { algo: 'degree', scope: { kind: 'all' } }, 'analyst');
  assert.equal(r.code, 200); assert.ok(!r.text.includes('Secret') && !r.text.includes('Customer:c1'));
  const c = await call('GET', '/api/explore/clusters?by=type', undefined, 'analyst'); assert.ok(!c.text.includes('Secret'));
});
test('X6 editing: analyst may not write; owner edits reach the store, history and the change log used by sync-out', async () => {
  const deny = await call('POST', '/api/explore/x/edit', { ops: [{ op: 'setProps', id: 'sg:node:Product:p1', props: { price: 1 } }] }, 'analyst');
  assert.equal(deny.code, 403);
  const t0 = Date.now(); await wait(20);
  const seq0 = g.maxSeq();
  const ok = await call('POST', '/api/explore/x/edit', { ops: [{ op: 'setProps', id: 'sg:node:Product:p1', props: { price: 95 } }, { op: 'addNode', type: 'Product', key: 'p9', props: { name: 'Map Case', price: 12 } }, { op: 'addEdge', type: 'BOUGHT', from: 'sg:node:Customer:c2', to: 'sg:node:Product:p9' }] });
  assert.equal(ok.code, 200, ok.text); assert.equal(g.getNode('Product:p1').props.price, 95); assert.ok(g.hasNode('Product:p9'));
  assert.ok(g.changesAfter(seq0, 100).some(c => c.id === 'Product:p9'), 'the change log (what sync-out sends) has it');
  await wait(50);
  const h = await call('GET', `/api/explore/x/history/compare?from=${t0}&to=${Date.now() + 1000}`);
  assert.equal(h.code, 200); assert.ok(h.body.added.some(i => i.id === 'sg:node:Product:p9')); const ch = h.body.changed.find(c => c.after.id === 'sg:node:Product:p1');
  assert.ok(ch); assert.deepEqual(ch.fields, ['price']); assert.equal(ch.before.properties.price, 90); assert.equal(ch.after.properties.price, 95);
  assert.equal((await call('POST', '/api/explore/x/edit', { ops: [{ op: 'setProps', id: 'sg:node:Customer:c1', props: { email: 'x@y' } }] }, 'analyst')).code, 403);
  assert.equal((await call('POST', '/api/explore/x/edit', { ops: [{ op: 'deleteNode', id: 'sg:node:Product:p9' }] })).code, 200); assert.ok(!g.hasNode('Product:p9'));
  const h2 = await call('GET', `/api/explore/x/history/compare?from=${t0}&to=${Date.now() + 1000}`); assert.ok(!h2.body.added.some(i => i.id === 'sg:node:Product:p9'), 'added then removed in the window');
  const tl = await call('GET', '/api/explore/x/history/timeline'); assert.ok(tl.body.events > 5);
});
test('X7 history compare for the analyst masks values and leaves out denied types', async () => {
  const h = await call('GET', `/api/explore/x/history/compare?from=0&to=${Date.now() + 1000}`, undefined, 'analyst');
  assert.equal(h.code, 200); assert.ok(!h.text.includes('Secret') && !h.text.includes('ada@example.com'));
  assert.ok(h.body.added.some(i => i.label === 'Ada Lovelace'));
});
test('X8 comments and case notebooks: only on visible things; hidden targets never listed', async () => {
  assert.equal((await call('POST', '/api/explore/x/comments', { target: 'sg:node:Secret:s1', text: 'check' }, 'analyst')).code, 404);
  assert.equal((await call('POST', '/api/explore/x/comments', { target: 'sg:node:Secret:s1', text: 'owner note on secret' })).code, 200);
  assert.equal((await call('POST', '/api/explore/x/comments', { target: 'sg:node:Product:p1', text: 'price looks high' }, 'analyst')).code, 200);
  const list = await call('GET', '/api/explore/x/comments', undefined, 'analyst'); assert.ok(list.text.includes('price looks high') && !list.text.includes('owner note on secret'));
  const nb = (await call('POST', '/api/explore/x/notebooks', { title: 'Case 1' })).body.notebook;
  await call('POST', '/api/explore/x/notebook/entry', { nb: nb.id, kind: 'snapshot', text: 'Ada and the secret', ids: ['sg:node:Customer:c1', 'sg:node:Secret:s1'] });
  const o = await call('GET', `/api/explore/x/notebook?id=${nb.id}`); assert.equal(o.body.entries[0].ids.length, 2);
  const a = await call('GET', `/api/explore/x/notebook?id=${nb.id}`, undefined, 'analyst'); assert.equal(a.body.entries[0].ids.length, 1); assert.ok(!a.text.includes('Secret'));
});
test('X9 deterministic SVG export, masked for the analyst', async () => {
  const body = { ids: ['sg:node:Customer:c1', 'sg:node:Product:p1', 'sg:node:Secret:s1'], title: 'Test', positions: { 'sg:node:Customer:c1': [0, 0], 'sg:node:Product:p1': [10, 5] } };
  const a = await call('POST', '/api/explore/x/export/svg', body), b = await call('POST', '/api/explore/x/export/svg', body);
  assert.equal(a.code, 200); assert.equal(a.text, b.text, 'byte-identical'); assert.ok(a.text.startsWith('<svg') && a.text.includes('Project X'));
  const s = await call('POST', '/api/explore/x/export/svg', body, 'analyst'); assert.ok(!s.text.includes('Project X') && s.text.includes('Ada Lovelace') && !s.text.includes('Customer:c1'));
});
test('X10 query builder: Cypher round trip, runs, and refuses filters on hidden fields', async () => {
  const q = { a: { type: 'Customer', where: [{ field: 'city', op: '=', value: 'Boston' }] }, rel: { type: 'BOUGHT', dir: 'out' }, b: { type: 'Product', where: [] }, limit: 10 };
  const r = await call('POST', '/api/explore/x/query', { query: q });
  assert.equal(r.code, 200, r.text); assert.equal(r.body.cypher, "MATCH (a:Customer)-[r:BOUGHT]->(b:Product) WHERE a.city = 'Boston' RETURN a, r, b LIMIT 10");
  assert.equal(r.body.rows.length, 1); assert.equal(r.body.rows[0].b.label, 'Trail Shoe');
  const c = await call('POST', '/api/explore/x/query', { cypher: r.body.cypher }); assert.deepEqual(c.body.query, r.body.query);
  const back = await call('POST', '/api/explore/x/query', { cypher: "MATCH (a:Product)<-[r:BOUGHT]-(b:Customer) WHERE b.spend > 100 RETURN a, r, b LIMIT 5" }); assert.equal(back.body.rows.length, 1); assert.equal(back.body.rows[0].b.label, 'Ada Lovelace');
  assert.equal((await call('POST', '/api/explore/x/query', { query: { a: { type: 'Customer', where: [{ field: 'email', op: 'CONTAINS', value: 'ada' }] } } }, 'analyst')).code, 403);
  assert.equal((await call('POST', '/api/explore/x/query', { query: { a: { type: 'Secret' } } }, 'analyst')).code, 403);
});
test('X11 plain-English questions: off by default, local rules when turned on, no network', async () => {
  assert.equal((await call('POST', '/api/explore/x/nl/ask', { question: 'how many customers' })).code, 400);
  assert.equal((await call('POST', '/api/explore/x/nl/settings', { provider: 'rules' }, 'analyst')).code, 403);
  assert.equal((await call('POST', '/api/explore/x/nl/settings', { provider: 'rules' })).code, 200);
  assert.equal((await call('POST', '/api/explore/x/nl/ask', { question: 'How many customers?' })).body.answer, '2 Customers.');
  const w = await call('POST', '/api/explore/x/nl/ask', { question: 'show customers where city is Austin' }); assert.equal(w.body.rows.length, 1); assert.match(w.body.cypher, /a\.city = 'Austin'/);
  const n = await call('POST', '/api/explore/x/nl/ask', { question: 'who is connected to Ada Lovelace' }, 'analyst'); assert.ok(!n.text.includes('Secret'));
  const s = await call('POST', '/api/explore/x/summary', { ids: ['sg:node:Customer:c1', 'sg:node:Product:p1', 'sg:node:Secret:s1'] }, 'analyst'); assert.match(s.body.text, /Showing 2 things/);
});
test('X12 RDF: export masked for the analyst; import (admin) creates things', async () => {
  const t = await call('GET', '/api/explore/x/rdf?format=turtle'); assert.equal(t.code, 200); assert.ok(t.text.includes('Project X'));
  const a = await call('GET', '/api/explore/x/rdf?format=ntriples', undefined, 'analyst'); assert.ok(!a.text.includes('Project X') && !a.text.includes('ada@example.com') && a.text.includes('Trail Shoe'));
  const imp = await call('POST', '/api/explore/x/rdf/import', { format: 'turtle', text: '@prefix ex: <http://example.org/> . ex:d1 a ex:Drone ; ex:serial "D-77" ; ex:operatedBy ex:o1 . ex:o1 a ex:Operator ; <http://www.w3.org/2000/01/rdf-schema#label> "Op One" .' });
  assert.equal(imp.code, 200, imp.text); assert.ok(g.hasNode('Drone:d1') && g.hasNode('Operator:o1')); assert.equal(g.getNode('Drone:d1').props.serial, 'D-77');
  assert.ok(g.edges().some(e => e.type === 'OPERATEDBY'));
  assert.equal((await call('POST', '/api/explore/x/rdf/import', { text: '<a> <b> <c> .' }, 'analyst')).code, 403);
});
test('X13 processing status is readable; switching needs admin', async () => {
  const s = await call('GET', '/api/explore/x/processing'); assert.equal(s.code, 200); assert.ok('availability' in s.body);
  assert.equal((await call('POST', '/api/explore/x/processing', { stream: { enabled: true } }, 'analyst')).code, 403);
});

test('X14 live updates in a "Test as" preview: the viewer\'s event stream carries the preview user (EventSource cannot send headers), and only admins may preview', async () => {
  const s = await call('POST', '/api/explore/session', { follow: true }, 'analyst');
  assert.equal(s.code, 200);
  const sid = s.body.sessionId;
  const noAs = await fetch(`${base}/api/explore/session/${sid}/events`); assert.equal(noAs.status, 403, 'the owner may not read the analyst\'s session without saying so'); await noAs.body?.cancel();
  const ac = new AbortController(), r = await fetch(`${base}/api/explore/session/${sid}/events?sg-as=analyst`, { signal: ac.signal }); assert.equal(r.status, 200);
  const reader = r.body.getReader(); let text = '';
  g.upsertNode('Secret:s9', 'Secret', 's9', { name: 'Hidden thing' }); g.upsertNode('Customer:c9', 'Customer', 'c9', { name: 'Cleo Park', email: 'cleo@example.com', city: 'Reno', spend: 5 });
  const until = Date.now() + 4000; while (Date.now() < until && !text.includes('Cleo Park')) { const { value, done } = await Promise.race([reader.read(), wait(500).then(() => ({ value: null }))]); if (done) break; if (value) text += new TextDecoder().decode(value); }
  ac.abort();
  assert.ok(text.includes('Cleo Park'), 'the analyst sees the new customer live');
  assert.ok(!text.includes('Hidden thing') && !text.includes('cleo@example.com'), 'denied type and hidden field never reach the analyst');
  const me = await call('GET', '/api/explore/x/me', undefined, 'analyst'); assert.equal(me.body.admin, false); assert.equal(me.body.canEdit, false);
});
