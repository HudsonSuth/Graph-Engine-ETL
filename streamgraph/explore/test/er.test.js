// Entity resolution (SPEC §21): accuracy vs ground truth, incremental merge/split with stable ids, explanation
// correctness, possible matches, MCP tools with access rules, derived-writer isolation, sidecar crash recovery.
//   npm run test:er                 (Splink, the default engine)     ER_ENGINE=duke npm run test:er   (Duke)
//   ER_IMPL=wrong npm run test:er   the deliberately wrong implementation (must FAIL a meaningful share)
// The accuracy test uses seed 11; thresholds/model were tuned and trained on seed 7 only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildMcpServer } from '../server/mcp-server.js';
import { evaluate } from '../er/metrics.js';
import { ENGINE, IMPL, skipReason, erInstance, P, put, settle, loadFixture, partition, testSet, linkOf } from './er-helpers.js';

const SKIP = skipReason();
const opts = { skip: SKIP || false, timeout: 180000 };
if (SKIP) console.log(`# er suite SKIPPED: ${SKIP}`);
const log2odds = s => Math.log2(s / (1 - s));
const json = r => ({ ...JSON.parse(r.content[0].text), isError: !!r.isError });
async function mcp(ex, o) {
  const server = buildMcpServer(ex, o), client = new Client({ name: 't', version: '1' }), [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b);
  return { client, call: async (name, args = {}) => { const r = await client.callTool({ name, arguments: args }); try { return json(r); } catch { return { isError: !!r.isError, error: r.content?.[0]?.text }; } }, close: async () => { await client.close(); await server.close(); } };
}

// ---- shared instance loaded with the held-out synthetic set (seed 11) -------------------------------------
let ex, f, metrics;
before(async () => { if (SKIP) return; f = testSet(11); ex = await erInstance(); await loadFixture(ex, f); });
after(async () => { await ex?.close(); });

test(`E1 accuracy vs ground truth on held-out seed 11 (${ENGINE}/${IMPL}): pairwise and B-cubed P/R/F1 per record type`, opts, async () => {
  const pred = partition(ex);
  assert.equal(pred.size, f.records.length, 'every record resolves to exactly one entity');
  const out = {};
  for (const t of ['Person', 'Organization']) {
    const ids = f.records.filter(r => r.type === t).map(r => r.id);
    out[t] = evaluate(new Map(ids.map(i => [i, pred.get(i)])), new Map(ids.map(i => [i, f.truth[i]])));
  }
  metrics = { engine: ENGINE, impl: IMPL, seed: 11, records: f.records.length, trueEntities: f.meta.entities, stats: ex.er.stats(), ...out };
  mkdirSync(new URL('../../proof/', import.meta.url), { recursive: true });
  writeFileSync(new URL(`../../proof/er-metrics-${ENGINE}${IMPL === 'wrong' ? '-wrong' : ''}.json`, import.meta.url), JSON.stringify(metrics, null, 1));
  const p = out.Person.pairwise, o = out.Organization.pairwise;
  console.log(`# Person pairwise P=${p.precision.toFixed(3)} R=${p.recall.toFixed(3)} F1=${p.f1.toFixed(3)} B3-F1=${out.Person.bcubed.f1.toFixed(3)} | Org P=${o.precision.toFixed(3)} R=${o.recall.toFixed(3)} F1=${o.f1.toFixed(3)}`);
  assert.ok(p.precision >= 0.9, `Person precision ${p.precision}`); assert.ok(p.recall >= 0.85, `Person recall ${p.recall}`); assert.ok(p.f1 >= 0.9, `Person F1 ${p.f1}`);
  assert.ok(out.Person.bcubed.f1 >= 0.93, `Person B3 F1 ${out.Person.bcubed.f1}`);
  assert.ok(o.f1 >= 0.85, `Organization F1 ${o.f1}`);
});

test('E2 incremental = batch: the same set streamed in 12 batches gives the same partition (ids well formed, one cluster per id)', opts, async () => {
  const ex2 = await erInstance();
  try {
    await loadFixture(ex2, f, { batches: 12 });
    const a = partition(ex), b = partition(ex2);
    const e = evaluate(b, a);
    assert.equal(e.pairwise.f1, 1, `partitions differ: ${JSON.stringify(e.pairwise)}`);
    // ids are minted from the first records seen, so streamed and bulk runs may name the same cluster differently;
    // every id is a well-formed er:entity id and no id names two clusters
    const owner = new Map(); for (const [r, id] of b) { assert.match(id, /^er:entity:[0-9a-f]{12}$/); const k = owner.get(id); if (k) assert.equal(a.get(r), k); else owner.set(id, a.get(r)); }
  } finally { await ex2.close(); }
});

test('E3 explanations are correct: prior + sum(feature weights) = log2(score/(1-score)) for stored edges, why features agree with RESOLVES_TO, decision matches thresholds', opts, async () => {
  const c = ex.er.config, links = [...ex.service.items.values()].filter(it => it.kind === 'link' && !it.deleted && it.type === 'RESOLVES_TO' && it.properties.matchedWith);
  assert.ok(links.length > 500);
  let checked = 0;
  for (const l of links.slice(0, 300)) {
    const w = await ex.erQueries.whyMatched(l.fromId, undefined, { principal: ex.config.principal });
    assert.ok(!w.error, w.error);
    assert.equal(w.b, l.properties.matchedWith);
    assert.equal(ex.er.engine.entityOf(w.a), ex.er.engine.entityOf(w.b), 'the explaining record is in the same entity');
    const tc = c.types[w.type];
    assert.equal(w.decision, 'match'); assert.ok(w.score >= tc.threshold - 1e-9, `score ${w.score} >= threshold`);
    // score = 1 / (1 + 2^-matchWeight) and matchWeight = prior + sum(weights) (the MCP score is rounded to 4 places)
    const sum = w.prior + w.features.reduce((s, x) => s + x.weight, 0);
    assert.ok(Math.abs(sum - w.matchWeight) < 0.01, `prior ${w.prior} + sum ${sum - w.prior} vs match weight ${w.matchWeight} (${w.a} ~ ${w.b})`);
    assert.ok(Math.abs(1 / (1 + 2 ** -w.matchWeight) - w.score) < 1e-3, `score ${w.score} vs weight ${w.matchWeight}`);
    if (w.score < 0.98) assert.ok(Math.abs(log2odds(w.score) - w.matchWeight) < 0.05, `log2 odds of ${w.score} vs ${w.matchWeight}`);
    checked++;
    // every feature present in both records is explained, and evidence points the right way
    const ra = ex.service.live(w.a).properties, rb = ex.service.live(w.b).properties;
    for (const x of w.features) { assert.ok((ra[x.property] ?? ra.name) != null && (rb[x.property] ?? rb.name) != null && x.a != null && x.b != null, `${x.property} is in both records (or derived from name)`); assert.ok(Number.isFinite(x.weight)); }
    assert.ok(w.features.some(x => x.weight > 0), 'a match has positive evidence');
    // stored link carries the same explanation
    const stored = l.properties.why;
    assert.deepEqual(stored.map(x => x.property).sort(), w.features.map(x => x.property).sort());
  }
  assert.ok(checked > 100, `checked ${checked}`);
  // a known non-match: two different people, nothing shared -> negative total evidence and decision no-match
  const pa = f.records.find(r => r.type === 'Person'), pb = f.records.find(r => r.type === 'Person' && f.truth[r.id] !== f.truth[pa.id] && r.properties.name.split(' ').pop().toLowerCase() !== pa.properties.name.split(' ').pop().toLowerCase());
  const n = await ex.erQueries.whyMatched(pa.id, pb.id, { principal: ex.config.principal });
  assert.equal(n.decision, 'no-match', JSON.stringify(n).slice(0, 300)); assert.equal(n.sameEntity, false);
  assert.ok(n.features.reduce((s, x) => s + x.weight, 0) < 0, 'total evidence against');
});

// ---- small hand-made cases on a fresh instance -------------------------------------------------------------
const A = P('crm', 'A', { name: 'Quentin Abernathy', email: 'q.abernathy@example.com', dob: '1971-04-12' });
const B = P('billing', 'B', { name: 'Quentin Abernathy', phone: '212-555-0177', address: '12 Kestrel Lane, Westmere 10001' });
const B2 = P('billing', 'B2', { name: 'Quentin Abernathy', phone: '212-555-0177', address: '12 Kestrel Ln, Westmere 10001' });
const C = P('support', 'C', { name: 'Quentin Abernathy', email: 'q.abernathy@example.com', phone: '(212) 555-0177', dob: '1971-04-12' });

test('E4 incremental merge: a bridging record merges two entities; the larger keeps its id, the other is retired with a redirect', opts, async () => {
  const x = await erInstance();
  try {
    await put(x, [A, B, B2]);
    const ea = x.er.engine.entityOf(A.id), eb = x.er.engine.entityOf(B.id);
    assert.ok(ea && eb); assert.notEqual(ea, eb, 'A (email+dob) and B (phone+address) share only a name: kept apart');
    assert.equal(x.er.engine.entityOf(B2.id), eb, 'B and B2 resolve together');
    assert.equal(x.service.live(eb).properties.recordCount, 2);
    const vEb = x.service.live(eb).version;
    await put(x, [C]);
    const e = x.er.engine.entityOf(C.id);
    assert.equal(e, eb, 'the merged entity keeps the id of the larger side');
    for (const r of [A, B, B2, C]) assert.equal(linkOf(x, r.id).toId, eb, `${r.id} RESOLVES_TO the survivor`);
    assert.equal(x.service.live(eb).properties.recordCount, 4);
    assert.ok(x.service.live(eb).version > vEb);
    assert.equal(x.service.live(ea), undefined, 'the absorbed entity node is removed from the graph');
    const r = await x.erQueries.resolveEntity(ea, { principal: x.config.principal });
    assert.equal(r.entity?.id, eb, 'resolve_entity on the retired id follows the redirect'); assert.equal(r.redirectedFrom, ea);
    assert.ok(x.er.engine.history.some(h => h.kind === 'merge' && h.entityId === eb && h.absorbed?.includes(ea)), 'merge recorded in history');
    // re-sending identical records changes nothing (no new versions)
    const v = x.service.live(eb).version; await put(x, [A, B, C]);
    assert.equal(x.service.live(eb).version, v, 'idempotent');
  } finally { await x.close(); }
});

test('E5 incremental split (un-merge): changing or removing the bridging record splits the entity; ids stay stable', opts, async () => {
  const x = await erInstance();
  try {
    await put(x, [A, B, B2, C]);
    const e = x.er.engine.entityOf(A.id);
    assert.equal(x.er.engine.entityOf(B.id), e);
    // C changes: no longer shares phone with B -> {A, C} and {B, B2} again
    await put(x, [P('support', 'C', { name: 'Quentin Abernathy', email: 'q.abernathy@example.com', phone: '617-555-0190', dob: '1971-04-12' })]);
    const e1 = x.er.engine.entityOf(A.id), e2 = x.er.engine.entityOf(B.id);
    assert.notEqual(e1, e2, 'split happened');
    assert.equal(x.er.engine.entityOf(C.id), e1);
    assert.ok([e1, e2].includes(e), 'one side keeps the original id');
    assert.equal(x.service.live(e).properties.recordCount, 2);
    assert.ok(x.er.engine.history.some(h => h.kind === 'split'), 'split recorded');
    const fresh = e1 === e ? e2 : e1;
    assert.ok(x.service.live(fresh), 'new entity published'); assert.equal(linkOf(x, B.id).toId, e2);
    // put C back -> merge again under the same surviving id; then remove C -> split again
    await put(x, [C]);
    assert.equal(x.er.engine.entityOf(B.id), x.er.engine.entityOf(A.id));
    const merged = x.er.engine.entityOf(A.id);
    assert.equal(merged, e, 'the original id survives the re-merge (older entity wins the tie)');
    await put(x, [C], 'node.remove');
    assert.equal(linkOf(x, C.id), undefined, 'the removed record no longer resolves');
    assert.notEqual(x.er.engine.entityOf(A.id), x.er.engine.entityOf(B.id), 'removal of the bridge splits');
    assert.ok([x.er.engine.entityOf(A.id), x.er.engine.entityOf(B.id)].includes(e));
    // removing every record of an entity removes the entity
    const eA = x.er.engine.entityOf(A.id); await put(x, [A], 'node.remove');
    assert.equal(x.service.live(eA)?.properties?.records?.includes(A.id) ?? false, false);
    if (eA !== x.er.engine.entityOf(B.id)) assert.equal(x.service.live(eA), undefined, 'empty entity removed');
  } finally { await x.close(); }
});

const H1 = P('crm', 'H1', { name: 'Marisol Quintero', phone: '303-555-0111', address: '77 Heron Road, Lakemont 22001', dob: '1980-02-02' });
const H2 = P('billing', 'H2', { name: 'Ignacio Quintero', phone: '303-555-0111', address: '77 Heron Rd, Lakemont 22001', dob: '1974-07-30' });

test('E6 possible matches: a household pair (same phone + address, different person) is linked POSSIBLY_SAME with a score, not merged', opts, async () => {
  const x = await erInstance();
  try {
    await put(x, [H1, H2]);
    const e1 = x.er.engine.entityOf(H1.id), e2 = x.er.engine.entityOf(H2.id);
    assert.notEqual(e1, e2, 'not merged');
    const ps = [...x.service.items.values()].filter(it => it.kind === 'link' && !it.deleted && it.type === 'POSSIBLY_SAME');
    assert.equal(ps.length, 1, 'one POSSIBLY_SAME link');
    const tc = x.er.config.types.Person, s = ps[0].properties.score;
    assert.ok(s >= tc.maybeThreshold && s < tc.threshold, `score ${s} in [maybe, match)`);
    assert.deepEqual([ps[0].fromId, ps[0].toId].sort(), [e1, e2].sort());
    assert.ok(ps[0].properties.why.length >= 2);
    const l = await x.erQueries.listPossibleMatches({ principal: x.config.principal });
    assert.equal(l.count, 1); assert.ok(l.matches[0].score >= tc.maybeThreshold);
    const w = await x.erQueries.whyMatched(H1.id, H2.id, { principal: x.config.principal });
    assert.equal(w.decision, 'possible');
    // the household moves apart -> the possible link goes away
    await put(x, [P('billing', 'H2', { name: 'Ignacio Quintero', phone: '919-555-0122', address: '4 Otter Court, Greywater 30303', dob: '1974-07-30' })]);
    assert.equal([...x.service.items.values()].filter(it => it.kind === 'link' && !it.deleted && it.type === 'POSSIBLY_SAME').length, 0);
  } finally { await x.close(); }
});

test('E7 MCP tools: resolve_entity, why_matched, list_possible_matches over the MCP protocol, with access rules (support restricted)', opts, async () => {
  const x = await erInstance({ access: { sources: { support: { read: ['role:support'] } } } });
  const m = await mcp(x, {}), mSup = await mcp(x, { principal: { id: 'sup', roles: ['analyst', 'support'] } });
  try {
    await put(x, [A, B, B2, H1, H2]);
    const names = (await m.client.listTools()).tools.map(t => t.name);
    for (const n of ['resolve_entity', 'why_matched', 'list_possible_matches']) assert.ok(names.includes(n), n);
    const r = await m.call('resolve_entity', { id: B.id });
    assert.ok(!r.isError, r.error); assert.equal(r.entity.recordCount, 2);
    assert.deepEqual(r.records.map(z => z.id).sort(), [B.id, B2.id].sort());
    assert.ok(r.records.every(z => z.dataSource && z.recordId));
    const w = await m.call('why_matched', { a: B2.id });
    assert.ok(!w.isError); assert.equal(w.decision, 'match'); assert.ok(w.features.find(z => z.property === 'phone').weight > 0);
    const lp = await m.call('list_possible_matches', {});
    const hh = [x.er.engine.entityOf(H1.id), x.er.engine.entityOf(H2.id)].sort();
    assert.ok(lp.matches.some(z => [z.entityA, z.entityB].sort().join() === hh.join()), 'the household pair is listed');
    // C arrives from the restricted support source and bridges A and B: the merged entity now carries a support record
    await put(x, [C]);
    const e = x.er.engine.entityOf(C.id);
    const hidden = await m.call('resolve_entity', { id: A.id });
    assert.ok(hidden.isError, 'an entity derived from a record you may not read is not visible (fail closed)');
    const sup = await mSup.call('resolve_entity', { id: A.id });
    assert.ok(!sup.isError); assert.equal(sup.entity.id, e); assert.equal(sup.entity.recordCount, 4);
    const wc = await m.call('why_matched', { a: A.id, b: C.id });
    assert.ok(wc.isError, 'why_matched refuses a record the caller cannot read');
    assert.ok(!(await mSup.call('why_matched', { a: A.id, b: C.id })).isError);
    const lp2 = await m.call('list_possible_matches', { minScore: 0 });
    assert.ok(lp2.matches.every(z => z.entityA !== e && z.entityB !== e));
    // the HTTP read model hides it too
    assert.equal(x.service.view(x.service.live(e), x.config.principal), null);
    assert.ok(x.service.view(x.service.live(e), { id: 'sup', roles: ['analyst', 'support'] }));
  } finally { await m.close(); await mSup.close(); await x.close(); }
});

test('E8 derived writer isolation: the ER source may only write er: ids; record sources cannot write er: entities', opts, async () => {
  const x = await erInstance();
  try {
    await put(x, [A]);
    const before = x.service.live(A.id).version;
    const p = x.producer('er'); p.push('node.upsert', { id: A.id, type: 'Person', properties: { name: 'Hijacked' } });
    await p.flush().catch(() => {}); await settle(x);
    assert.equal(x.service.live(A.id).properties.name, A.properties.name, 'er cannot overwrite a record');
    assert.equal(x.service.live(A.id).version, before);
    const e = x.er.engine.entityOf(A.id), q = x.producer('crm');
    q.push('node.remove', { id: e }); await q.flush().catch(() => {}); await settle(x);
    assert.ok(x.service.live(e), 'a record source cannot delete an entity');
  } finally { await x.close(); }
});

test('E9 sidecar crash: the engine restarts, re-indexes, and keeps resolving with the same entity ids', { ...opts, skip: SKIP || (IMPL === 'wrong' ? false : false) }, async () => {
  const x = await erInstance();
  try {
    await put(x, [A, B, B2]);
    const eb = x.er.engine.entityOf(B.id);
    if (typeof x.er.matcher.crash !== 'function') assert.fail('matcher has no crash() hook');
    await x.er.matcher.crash();
    await put(x, [C]);
    assert.equal(x.er.engine.entityOf(A.id), eb, 'after restart the bridge still merges into the surviving id');
    assert.ok((x.er.stats().sidecarRestarts || 0) >= 1);
  } finally { await x.close(); }
});
