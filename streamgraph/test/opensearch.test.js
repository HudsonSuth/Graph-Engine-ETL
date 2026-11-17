// OpenSearch search index: sink indexing / incremental sync / deletes / sweep, access-filtered search (types, fields,
// highlights, key pseudonyms), geo and time filters, fuzzy matching, and fail-closed fallback when the index is offline.
// Needs a local OpenSearch (npm run opensearch:setup && npm run opensearch:start) at $OPENSEARCH_URL or 127.0.0.1:9200;
// the tests that need it are skipped (and say so) when it is not running. The offline tests always run.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { GraphStore } from '../src/graph.js';
import { PolicyStore } from '../src/abac/policy.js';
import { AbacEngine } from '../src/abac/engine.js';
import { SyncOut } from '../src/syncout/index.js';
import { createSearch, parseSearch, haversine } from '../src/search/service.js';
import { OpenSearchClient, indexName } from '../src/search/opensearch.js';

const URL_ = process.env.OPENSEARCH_URL || 'http://127.0.0.1:9200';
const up = await fetch(`${URL_}/_cluster/health`, { signal: AbortSignal.timeout(2000) }).then(r => r.ok).catch(() => false);
const needOS = { skip: up ? false : `OpenSearch is not running at ${URL_} (npm run opensearch:start)` };
const prefix = `sgtest-${process.pid}-${Date.now().toString(36)}-`;
const os = new OpenSearchClient({ url: URL_ });
after(async () => { if (up) await os.req('DELETE', `/${prefix}*`).catch(() => {}); });

function world() {
  const graph = new GraphStore(), policy = new PolicyStore();
  graph.upsertNode('Vessel:111', 'Vessel', '111', { mmsi: '111', name: 'ANNA MAERSK', flag: 'DK', secret_note: 'zephyrcargo manifest', lat: 36.95, lon: -76.33, ts: '2018-01-01T10:00:00Z' });
  graph.upsertNode('Vessel:222', 'Vessel', '222', { mmsi: '222', name: 'EVER GIVEN', flag: 'PA', secret_note: 'routine', lat: 39.27, lon: -76.58, ts: '2018-01-01T20:00:00Z' });
  graph.upsertNode('Vessel:333', 'Vessel', '333', { mmsi: '333', name: 'MAERSK OHIO', flag: 'US', secret_note: 'routine', lat: 36.90, lon: -76.30, ts: '2018-01-02T05:00:00Z' });
  graph.upsertNode('Person:p1', 'Person', 'p1', { name: 'Anna Maersk-Holm', email: 'anna@x.io' }); // PII type: denied below clearance 2
  graph.upsertNode('Report:r1', 'Report', 'r1', { title: 'Port call report', text: ('Harbor operations were normal. ').repeat(40) + 'The pilot boarded near Thimble Shoal. ' + ('Weather was calm. ').repeat(30) });
  policy.register(graph.schema());
  for (const f of ['mmsi', 'name', 'flag', 'lat', 'lon', 'ts']) policy.setField('Vessel', f, 'low');
  policy.setField('Vessel', 'secret_note', 'high');
  policy.setField('Person', 'name', 'low'); policy.setField('Person', 'email', 'high');
  policy.setField('Report', 'title', 'low'); policy.setField('Report', 'text', 'low');
  policy.setEntity('Person', { tags: ['pii'], classification: 2 });
  const engine = new AbacEngine(policy); engine.keyFields = { Vessel: ['mmsi'], Person: ['email'] };
  return { graph, policy, engine };
}
async function setup(name, { url = URL_, asUser = 'owner' } = {}) {
  const w = world(), sinks = [{ id: name, name, kind: 'opensearch', settings: { url, index: `${prefix}${name}-` }, asUser }];
  const syncout = new SyncOut({ graph: w.graph, engine: w.engine, intervalMs: 999999 });
  await syncout.configure(sinks);
  const search = createSearch({ graph: w.graph, engine: w.engine, syncout, sinks: () => sinks, secret: () => '' });
  return { ...w, syncout, sinks, search, idx: indexName(sinks[0].settings) };
}
const ids = r => r.results.map(x => x.id).sort();
const S = (svc, who, q) => svc.search.search(svc.engine.subject(who), typeof q === 'string' ? { q } : q);

test('parseSearch: radius units, bbox, time range, size cap', () => {
  const o = parseSearch(new URLSearchParams('q=x&lat=36.9&lon=-76.3&radius=10nm&from=2018-01-01&to=2018-01-02&size=999&types=Vessel,Port'));
  assert.equal(o.geo.radius, 18520); assert.deepEqual(o.types, ['Vessel', 'Port']); assert.equal(o.size, 200); assert.equal(o.time.from, '2018-01-01T00:00:00.000Z');
  assert.deepEqual(parseSearch({ bbox: '-77,36,-76,37' }).geo.bbox, [-77, 36, -76, 37]);
  assert.throws(() => parseSearch({ lat: 'x', lon: 1 }), /lat and lon/);
  assert.ok(Math.abs(haversine({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) - 111195) < 50);
});

test('sink: test endpoint checks cluster health and an index write', needOS, async () => {
  const s = await setup('t1');
  const t = await s.syncout.test({ kind: 'opensearch', settings: s.sinks[0].settings });
  assert.ok(['green', 'yellow'].includes(t.status)); assert.equal(t.index, s.idx);
  assert.equal((await os.req('GET', `/${s.idx}/_count`)).count, 0, 'the test document is removed again');
  await assert.rejects(s.syncout.test({ kind: 'opensearch', settings: { url: 'http://127.0.0.1:9' } }));
});

test('sink: snapshot, incremental update, delete, chunks, access attributes on every doc', needOS, async () => {
  const s = await setup('t2');
  await s.syncout.cycle(); assert.equal(s.syncout.status()[0].health, 'green', s.syncout.status()[0].lastError);
  const all = (await os.req('POST', `/${s.idx}/_search`, { size: 100, query: { match_all: {} } })).hits.hits.map(h => h._source);
  const v = all.find(d => d.node_id === 'Vessel:111');
  assert.equal(v.name, 'ANNA MAERSK'); assert.deepEqual(v.geo, { lat: 36.95, lon: -76.33 }); assert.equal(v.time, '2018-01-01T10:00:00.000Z');
  assert.equal(v.acl.label, 'Vessel'); assert.equal(v.need.secret_note, 3); assert.equal(v.need.name, 0);
  const pdoc = all.find(d => d.node_id === 'Person:p1'); assert.deepEqual(pdoc.acl.tags, ['pii']); assert.equal(pdoc.acl.classification, 2);
  const chunks = all.filter(d => d.kind === 'chunk'); assert.ok(chunks.length >= 2, 'long document text is chunked'); assert.ok(chunks.every(c => c.parent === 'Report:r1' && c.field === 'text'));
  // incremental
  s.graph.upsertNode('Vessel:222', 'Vessel', '222', { name: 'EVER GLORY' }); s.graph.deleteNode('Vessel:333'); s.graph.deleteNode('Report:r1');
  await s.syncout.cycle();
  const after = (await os.req('POST', `/${s.idx}/_search`, { size: 100, query: { match_all: {} } })).hits.hits.map(h => h._source);
  assert.equal(after.find(d => d.node_id === 'Vessel:222').name, 'EVER GLORY');
  assert.ok(!after.some(d => d.node_id === 'Vessel:333'), 'deleted node removed'); assert.ok(!after.some(d => d.node_id === 'Report:r1'), 'deleted document and its chunks removed');
  // full reindex after a wipe sweeps everything old
  s.graph.clear(); s.graph.upsertNode('Vessel:9', 'Vessel', '9', { name: 'NEW ONE' }); await s.syncout.cycle();
  assert.deepEqual((await os.req('POST', `/${s.idx}/_search`, { size: 100, query: { match_all: {} } })).hits.hits.map(h => h._source.node_id), ['Vessel:9']);
});

test('sink as a low-clearance user never indexes hidden fields', needOS, async () => {
  const s = await setup('t3', { asUser: 'sync-service' });
  await s.syncout.cycle();
  const all = (await os.req('POST', `/${s.idx}/_search`, { size: 100, query: { match_all: {} } })).hits.hits.map(h => h._source);
  assert.ok(all.length > 0); assert.ok(!JSON.stringify(all).includes('zephyrcargo'), 'high field not in the index'); assert.ok(!all.some(d => d.label === 'Person'), 'denied type not in the index');
});

test('search: fuzzy match, highlights, grouped by type', needOS, async () => {
  const s = await setup('t4'); await s.syncout.cycle();
  const r = await S(s, 'owner', 'ANAN MAERSK');
  assert.equal(r.engine, 'opensearch'); assert.equal(r.index, 'healthy');
  assert.equal(r.results[0].id, 'Vessel:111', 'typo still finds ANNA MAERSK first');
  assert.ok(r.results[0].highlights.some(h => h.field === 'name' && /<mark>/.test(h.fragments[0])));
  assert.ok(r.groups.some(g => g.type === 'Vessel'));
  const d = await S(s, 'owner', 'thimble shoal'); assert.equal(d.results[0].id, 'Report:r1'); assert.equal(d.results[0].matchedIn, 'text');
});

test('search access filter: denied types, hidden fields and their highlights never come back', needOS, async () => {
  const s = await setup('t5'); await s.syncout.cycle(); // indexed as owner: the index holds everything
  const own = await S(s, 'owner', 'zephyrcargo');
  assert.deepEqual(ids(own), ['Vessel:111'], 'owner (clearance 3) can search the high field');
  assert.ok(own.results[0].highlights.some(h => h.field === 'secret_note'));
  const an = await S(s, 'analyst', 'zephyrcargo');
  assert.deepEqual(an.results, [], 'analyst must not find a node through a hidden field (no oracle)');
  const an2 = await S(s, 'analyst', 'maersk');
  assert.ok(!an2.results.some(x => x.type === 'Person'), 'PII type is denied for clearance 1');
  assert.ok(an2.results.length >= 2);
  for (const x of an2.results) { assert.equal(x.props.secret_note, '[hidden]'); assert.ok(!x.highlights.some(h => h.field === 'secret_note' || /zephyr/.test(h.fragments.join(' ')))); }
  assert.ok(!JSON.stringify(an2).includes('zephyrcargo'));
  const ownP = await S(s, 'owner', 'maersk'); assert.ok(ownP.results.some(x => x.type === 'Person'));
  // key pseudonyms: Person key field (email) hidden from analyst -> but Person is denied anyway; Vessel keys are visible
  assert.ok(an2.results.every(x => !String(x.id).startsWith('Vessel:anon-')));
  // policy change takes effect immediately, even before the index is rebuilt
  s.policy.setField('Vessel', 'name', 'high');
  const an3 = await S(s, 'analyst', 'ANNA MAERSK'); assert.ok(!an3.results.some(x => x.id.startsWith('Vessel:') && x.highlights.some(h => h.field === 'name')));
  assert.ok(an3.results.every(x => x.props.name === '[hidden]' || x.type !== 'Vessel'));
  // a user with no rule gets nothing, and OpenSearch is not even asked
  s.policy.putUser({ id: 'nobody', name: 'Nobody', role: 'guest', clearance: 3 });
  assert.deepEqual((await S(s, 'nobody', 'maersk')).results, []);
});

test('search: geo (point + radius, bbox) and time filters', needOS, async () => {
  const s = await setup('t6'); await s.syncout.cycle();
  const near = await S(s, 'owner', { lat: 36.9466, lon: -76.3297, radius: '20km' }); // Norfolk
  assert.deepEqual(ids(near), ['Vessel:111', 'Vessel:333']);
  assert.ok(near.results.every(x => x.geo));
  const box = await S(s, 'owner', { bbox: [-77, 39, -76, 40] }); assert.deepEqual(ids(box), ['Vessel:222']);
  const t = await S(s, 'owner', { q: 'maersk', from: '2018-01-02T00:00:00Z', to: '2018-01-03T00:00:00Z' }); assert.deepEqual(ids(t), ['Vessel:333']);
  // geo filter must not work on coordinates the caller cannot see
  s.policy.setField('Vessel', 'lat', 'high');
  assert.deepEqual((await S(s, 'analyst', { lat: 36.9466, lon: -76.3297, radius: '20km' })).results, []);
});

test('fail closed: index offline -> built-in search, still filtered, flagged offline', async () => {
  const s = await setup('t7', { url: 'http://127.0.0.1:9' });
  const r = await S(s, 'analyst', 'maersk');
  assert.equal(r.index, 'offline'); assert.equal(r.engine, 'built-in'); assert.match(r.error, /offline/);
  assert.ok(r.results.length >= 2); assert.ok(!r.results.some(x => x.type === 'Person'));
  assert.ok(!JSON.stringify(r).includes('zephyrcargo'));
  assert.deepEqual((await S(s, 'analyst', 'zephyrcargo')).results, [], 'built-in search does not match hidden fields either');
  assert.ok(ids(await S(s, 'owner', 'ANAN MAERSK')).includes('Vessel:111'), 'built-in fallback is typo tolerant too');
  assert.deepEqual(ids(await S(s, 'owner', { lat: 36.9466, lon: -76.3297, radius: '20km' })), ['Vessel:111', 'Vessel:333']);
  assert.equal((await s.search.status()).index, 'offline');
});
