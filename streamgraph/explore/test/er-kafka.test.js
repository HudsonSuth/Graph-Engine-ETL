// Entity resolution in Kafka mode (SPEC §21.5) against a REAL broker: the ER worker consumes graph.changes and
// publishes entities/links transactionally; viewers see them; a restarted worker bootstraps from graph.state and
// keeps entity ids. Skipped (never mocked) when no broker or ER engine is available.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExplore, loadConfig } from '../server/app.js';
import { brokerUp, space, until, sleep } from './kafka-helpers.js';
import { ENGINE, skipReason, SOURCES, P } from './er-helpers.js';
import { chunkTopicMessages } from '../er/kafka-worker.js';

const UP = await brokerUp(), SK = !UP ? 'no Kafka broker reachable at KAFKA_BROKERS (default localhost:9092)' : skipReason();
const opts = { skip: SK || false, timeout: 180000 };
if (SK) console.log(`# er-kafka suite SKIPPED: ${SK}`);
const base = loadConfig('/nonexistent/explore.config.json');
const inst = (sp, id, er = {}) => createExplore({ log: null, config: { ...base, mode: 'kafka', streams: SOURCES, er: { enabled: true, engine: ENGINE, ...er }, kafka: { ...sp.kafka, instanceId: id, checkpointDir: sp.dir } } });
async function send(ex, recs, op = 'node.upsert') {
  for (const s of SOURCES) { const rs = recs.filter(r => r.id.startsWith(`${s}:`)); if (!rs.length) continue; const p = ex.producer(s); for (const r of rs) p.push(op, op === 'node.remove' ? { id: r.id } : r); await p.flush(); }
}
const rt = (ex, rec) => ex.service.live(`er:rt:${rec}`)?.toId;
const entities = ex => [...ex.service.items.values()].filter(it => it.kind === 'node' && !it.deleted && it.type === 'Entity');

test('EK0 large derived batches are split under the broker message-size limit (no broker needed)', () => {
  const msg = i => ({ key: Buffer.from(`k${i}`), value: Buffer.alloc(3000, 'x') });
  const tm = [{ topic: 'c', messages: Array.from({ length: 500 }, (_, i) => msg(i)) }, { topic: 's', messages: Array.from({ length: 300 }, (_, i) => msg(i)) }];
  const parts = chunkTopicMessages(tm, 400 * 1024);
  assert.ok(parts.length >= 6);
  for (const p of parts) assert.ok(p.reduce((n, t) => n + t.messages.reduce((m, x) => m + x.value.length, 0), 0) <= 400 * 1024);
  assert.equal(parts.flatMap(p => p.flatMap(t => t.messages)).length, 800, 'nothing lost, order kept per topic');
  assert.deepEqual(parts.flatMap(p => p.filter(t => t.topic === 'c').flatMap(t => t.messages.map(m => m.key.toString()))), tm[0].messages.map(m => m.key.toString()));
});

const A = P('crm', 'A', { name: 'Quentin Abernathy', email: 'q.abernathy@example.com', dob: '1971-04-12' });
const B = P('billing', 'B', { name: 'Quentin Abernathy', phone: '212-555-0177', address: '12 Kestrel Lane, Westmere 10001' });
const B2 = P('billing', 'B2', { name: 'Quentin Abernathy', phone: '212-555-0177', address: '12 Kestrel Ln, Westmere 10001' });
const C = P('support', 'C', { name: 'Quentin Abernathy', email: 'q.abernathy@example.com', phone: '(212) 555-0177', dob: '1971-04-12' });
const D = P('crm', 'D', { name: 'Quentin Abernathy', email: 'q.abernathy@example.com', dob: '1971-04-12' });

test('EK1 Kafka mode: worker resolves, viewer sees entities, merge + split flow through graph.changes, restart keeps ids', opts, async () => {
  const sp = space('er');
  let w = await inst(sp, 'w1'); // runs the ER worker (singleton: fixed transactional id)
  const v = await inst(sp, 'v1', { kafka: { runWorker: false } }); // viewer only
  try {
    await send(w, [A, B, B2]);
    await until(() => rt(v, A.id) && rt(v, B.id) && rt(v, B2.id), 60000);
    const ea = rt(v, A.id), eb = rt(v, B.id);
    assert.notEqual(ea, eb); assert.equal(rt(v, B2.id), eb);
    assert.equal(v.service.live(eb).properties.recordCount, 2);
    // incremental merge
    await send(w, [C]);
    await until(() => rt(v, C.id) === eb && rt(v, A.id) === eb && !v.service.live(ea), 60000);
    assert.equal(v.service.live(eb).properties.recordCount, 4);
    // the viewer answers the MCP read tools from the graph (it has no engine state of its own)
    const r = await v.erQueries.resolveEntity(A.id, { principal: v.config.principal });
    assert.equal(r.entity.id, eb); assert.equal(r.records.length, 4);
    const why = await v.erQueries.whyMatched(C.id, undefined, { principal: v.config.principal });
    assert.ok(!why.error, why.error); assert.ok(why.features?.length || why.why?.length);
    // incremental split (C changes its phone)
    await send(w, [P('support', 'C', { name: 'Quentin Abernathy', email: 'q.abernathy@example.com', phone: '617-555-0190', dob: '1971-04-12' })]);
    await until(() => rt(v, A.id) && rt(v, B.id) && rt(v, A.id) !== rt(v, B.id), 60000);
    assert.ok([rt(v, A.id), rt(v, B.id)].includes(eb), 'one side keeps the id');
    const before = new Map([A, B, B2, C].map(x => [x.id, rt(v, x.id)])), nEnt = entities(v).length;
    // crash the worker, start a new one: bootstrap from graph.state, same ids, no duplicate entities
    await w.close({ crash: true }).catch(() => {});
    w = await inst(sp, 'w2');
    await send(w, [D]);
    await until(() => rt(v, D.id), 60000); await sleep(500);
    assert.equal(rt(v, D.id), before.get(A.id), 'the new record joins the existing entity id after restart');
    for (const [rec, e] of before) assert.equal(rt(v, rec), e, `${rec} keeps its entity after restart`);
    assert.equal(entities(v).length, nEnt, 'no duplicate entities after restart');
    assert.ok(w.er.worker.stats().bootstrapRecords >= 4);
  } finally { await v.close().catch(() => {}); await w.close().catch(() => {}); }
});
