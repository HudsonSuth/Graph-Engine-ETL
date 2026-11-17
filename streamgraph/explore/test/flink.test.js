// Flink stream processor (SPEC §18) against a REAL Kafka broker and REAL Apache Flink (local MiniCluster JVM).
//   npm run test:flink                 FLINK_IMPL=wrong npm run test:flink -> deliberately wrong pipeline (must fail)
// Skipped (never mocked) when no broker is reachable or Flink is not installed (npm run flink:setup && npm run flink:build).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createExplore, loadConfig } from '../server/app.js';
import { buildMcpServer } from '../server/mcp-server.js';
import { validateEvent } from '../kafka/contracts.js';
import { validateDerived, DERIVED } from '../flink/contracts.js';
import { processorConfig, latestCheckpoint, PROCESSOR_DEFAULTS } from '../flink/config.js';
import { brokerUp, flinkReady, fspace, startProcessor, collector, producer, events, send, advance, until, sleep, DAY, T0, IMPL, BROKERS, TEST_PROC } from './flink-helpers.js';

const UP = await brokerUp(), READY = flinkReady();
const skip = !UP ? 'no Kafka broker reachable (KAFKA_BROKERS, default localhost:9092)' : !READY ? 'Flink not installed: npm run flink:setup && npm run flink:build' : false;
const opts = { skip, timeout: 180000 };
if (skip) console.log(`# flink suite SKIPPED: ${skip} (this suite never uses a mock)`);
console.log(`# flink suite impl=${IMPL}`);

test('F0 config: processor off by default, derived contracts compile, latest checkpoint selection', () => {
  const base = loadConfig('/nonexistent/explore.config.json');
  assert.equal(base.processor.enabled, false, 'processor is opt-in');
  assert.equal(PROCESSOR_DEFAULTS.delivery, 'exactly-once');
  const c = processorConfig({ topics: { metrics: 'm' } }, { topics: { changes: 'c', dlq: 'd' } });
  assert.equal(c.topics.metrics, 'm'); assert.equal(c.topics.alerts, 'graph.alerts'); assert.equal(c.kafkaTopics.changes, 'c');
  assert.deepEqual(Object.keys(DERIVED).filter(k => k !== 'version' && k !== '_comment').sort(), ['alert', 'enriched', 'nodeMetrics', 'nodeWindow']);
  assert.equal(validateDerived({ kind: 'nope' }).ok, false);
  const dir = join(fspace('cfg').dir, 'ck');
  for (const [job, chk, age] of [['j1', 'chk-3', 30], ['j2', 'chk-7', 10], ['j2', 'chk-8', 0]]) { const d = join(dir, job, chk); mkdirSync(d, { recursive: true }); if (chk !== 'chk-8') { writeFileSync(join(d, '_metadata'), 'x'); const t = new Date(Date.now() - age * 1000); utimesSync(join(d, '_metadata'), t, t); } }
  assert.equal(latestCheckpoint(dir), join(dir, 'j2', 'chk-7'), 'newest COMPLETED checkpoint (chk-8 has no _metadata)');
});

// One processor shared by F1-F6, each test on its own day of event time (the watermark only moves forward).
let A, P, OUT, prod, ev;
const ensureA = async () => { if (A) return; A = fspace('a'); P = await startProcessor(A); OUT = await collector(A); prod = await producer(A); ev = events(A); };
after(async () => { await OUT?.close(); await prod?.disconnect(); await P?.stop(); });
const metricOf = id => OUT.latest().get(id);

test('F1 degree: create / re-upsert / endpoint change / remove (remove carries no toId; enrichment resolves it)', opts, async () => {
  await ensureA(); const t = T0 + DAY;
  await send(prod, A, [
    ev('link.upsert', { id: 'l1', type: 'K', fromId: 'a', toId: 'b' }, t), ev('link.upsert', { id: 'l2', type: 'K', fromId: 'a', toId: 'c' }, t + 1),
    ev('link.upsert', { id: 'l3', type: 'K', fromId: 'a', toId: 'd' }, t + 2), ev('link.upsert', { id: 'l1', type: 'K', fromId: 'a', toId: 'b', properties: { w: 2 } }, t + 3),
    { ...ev('link.upsert', { id: 'l3', type: 'K', fromId: 'b', toId: 'd' }, t + 4), key: 'a' }, ev('link.remove', { id: 'l2', fromId: 'a' }, t + 5),
    ev('link.remove', { id: 'l2', fromId: 'a' }, t + 6), ev('node.upsert', { id: 'a', type: 'P' }, t + 7),
  ]);
  // l3's endpoint change is keyed by the STICKY first fromId, as the publisher does (per-item order needs one partition)
  const want = { a: [1, 0, 1], b: [2, 1, 1], c: [0, 0, 0], d: [1, 1, 0] };
  await until(() => Object.entries(want).every(([id, [d, i, o]]) => { const m = metricOf(id); return m && m.degree === d && m.inDegree === i && m.outDegree === o; }), 60000, 100)
    .catch(() => assert.fail(`degrees ${JSON.stringify(Object.fromEntries(Object.keys(want).map(id => [id, metricOf(id) && [metricOf(id).degree, metricOf(id).inDegree, metricOf(id).outDegree]])))} != ${JSON.stringify(want)}`));
  await sleep(1500); // and they stay there (no late double counting)
  for (const [id, [d]] of Object.entries(want)) assert.equal(metricOf(id).degree, d, `${id} degree after settling`);
  const enr = OUT.enriched.filter(r => r.value.sourceId === 'src' && r.value.itemId === 'l2' || r.value.itemId === 'l3');
  const rm = enr.find(r => r.value.op === 'link.remove' && r.value.effect === 'removed');
  assert.ok(rm, 'remove of l2 enriched'); assert.equal(rm.value.toId, 'c', 'enrichment resolved the removed link\'s toId from state');
  assert.ok(enr.some(r => r.value.op === 'link.remove' && r.value.effect === 'noop'), 'second remove is a no-op');
  assert.ok(enr.some(r => r.value.itemId === 'l3' && r.value.effect === 'endpoints-changed'));
});

test('F2 dedupe by eventId: a re-sent batch (same eventIds) is counted once', opts, async () => {
  await ensureA(); const t = T0 + 2 * DAY;
  const batch = [ev('node.upsert', { id: 'x', type: 'P' }, t, 'dup-1'), ev('link.upsert', { id: 'lx', type: 'K', fromId: 'x', toId: 'y' }, t + 1, 'dup-2'), ev('link.upsert', { id: 'lx2', type: 'K', fromId: 'x', toId: 'z' }, t + 2, 'dup-3')];
  await send(prod, A, batch); await send(prod, A, batch); await send(prod, A, [batch[1]]);
  await until(() => metricOf('x')?.changes >= 3, 60000, 100);
  await sleep(2000);
  assert.equal(metricOf('x').changes, 3, 'x saw 3 distinct events'); assert.equal(metricOf('x').degree, 2); assert.equal(metricOf('y').degree, 1);
  const ids = OUT.enriched.map(r => r.value.eventId).filter(id => id.startsWith('dup-'));
  assert.deepEqual(ids.sort(), ['dup-1', 'dup-2', 'dup-3'], 'one enriched record per eventId');
});

test('F3 validation: same v1 contract as the Node side; bad records -> graph.dlq with reason (parity with ajv)', opts, async () => {
  await ensureA(); const t = T0 + 3 * DAY, iso = new Date(t).toISOString();
  const good = (over = {}) => ({ schemaVersion: 1, eventId: `v-${Math.random().toString(36).slice(2)}`, op: 'node.upsert', sourceId: 'src', seq: 1, eventTime: iso, payload: { id: 'v', type: 'P' }, ...over });
  const cases = [
    good(), good({ payload: { id: 'v2', type: 'P', properties: { ok: 1 } } }), good({ partial: true, payload: { id: 'v3' } }),
    good({ schemaVersion: 2 }), good({ op: 'node.explode' }), good({ payload: { id: 'v4' } }), good({ payload: { id: 'v5', type: 'P', properties: { 'sys:x': 1 } } }),
    good({ eventTime: 'yesterday' }), good({ sourceId: 'bad source!' }), good({ seq: 0 }), good({ op: 'link.upsert', payload: { id: 'L', fromId: 'v' } }), good({ extra: true }),
  ];
  const expectValid = cases.map(e => validateEvent(e).ok);
  assert.deepEqual(expectValid, [true, true, true, false, false, false, false, false, false, false, false, false], 'fixture sanity (ajv)');
  await send(prod, A, [...cases.map(e => ({ key: e.payload.id, value: JSON.stringify(e) })), { key: 'junk', value: '{not json' }, { key: 'arr', value: '[1,2]' }]);
  await until(() => cases.every((e, i) => (expectValid[i] ? OUT.enriched : OUT.dlq).some(r => r.value?.eventId === e.eventId)) && OUT.dlq.filter(r => typeof r.value?.value === 'string' || Array.isArray(r.value?.value) || /not a JSON object/.test(r.value?.reason)).length >= 2, 60000, 100)
    .catch(() => assert.fail(`parity mismatch: dlq=${JSON.stringify(OUT.dlq.map(r => r.value.eventId))}`));
  for (const [i, e] of cases.entries()) {
    const inDlq = OUT.dlq.some(r => r.value?.eventId === e.eventId), inEnr = OUT.enriched.some(r => r.value.eventId === e.eventId);
    assert.equal(inDlq, !expectValid[i], `case ${i} DLQ verdict == ajv verdict`); assert.equal(inEnr, expectValid[i], `case ${i} enriched iff valid`);
  }
  const d = OUT.dlq.find(r => r.value?.eventId === cases[5].eventId);
  assert.equal(d.value.stage, 'process'); assert.match(d.value.reason, /type/); assert.equal(d.headers['x-dlq-stage'], 'process'); assert.ok(d.headers['x-dlq-reason']);
});

test('F4 event-time windows: tumbling 10 s and sliding 20 s/10 s counts per node', opts, async () => {
  await ensureA(); const t = T0 + 4 * DAY; // aligned to a 10 s boundary
  await send(prod, A, [ev('link.upsert', { id: 'w1', type: 'K', fromId: 'w', toId: 'w-a' }, t + 1000), ev('link.upsert', { id: 'w2', type: 'K', fromId: 'w', toId: 'w-b' }, t + 2000),
    ev('link.upsert', { id: 'w3', type: 'K', fromId: 'w', toId: 'w-c' }, t + 11000), ev('link.remove', { id: 'w1', fromId: 'w' }, t + 25000)]);
  await sleep(1500); await advance(prod, A, ev, t + 3600e3);
  const tum = () => Object.fromEntries(OUT.windows.filter(r => r.value.nodeId === 'w' && r.value.window === 'tumbling').map(r => [r.value.windowStart, [r.value.changes, r.value.degreeGained, r.value.degreeLost]]));
  const sl = () => Object.fromEntries(OUT.windows.filter(r => r.value.nodeId === 'w' && r.value.window === 'sliding').map(r => [r.value.windowStart, r.value.changes]));
  const s = ms => new Date(t + ms).toISOString().replace('.000Z', 'Z');
  const wantT = { [s(0)]: [2, 2, 0], [s(10000)]: [1, 1, 0], [s(20000)]: [1, 0, 1] }, wantS = { [s(-10000)]: 2, [s(0)]: 3, [s(10000)]: 2, [s(20000)]: 1 };
  await until(() => Object.keys(tum()).length >= 3 && Object.keys(sl()).length >= 4, 60000, 100).catch(() => {});
  assert.deepEqual(tum(), wantT, 'tumbling windows'); assert.deepEqual(sl(), wantS, 'sliding windows');
  const keys = OUT.windows.filter(r => r.value.nodeId === 'w').map(r => r.key);
  assert.equal(new Set(keys).size, keys.length, 'one record per (node, window, start)');
});

test('F5 degree.spike alerts: >= 5 new links in one window alert; spread-out links and repeated upserts do not', opts, async () => {
  await ensureA(); const t = T0 + 5 * DAY, m = [];
  for (let i = 0; i < 6; i++) m.push(ev('link.upsert', { id: `s${i}`, type: 'K', fromId: 'spiky', toId: `s-${i}` }, t + 1000 + i));
  for (let i = 0; i < 6; i++) m.push(ev('link.upsert', { id: `q${i}`, type: 'K', fromId: 'calm', toId: `q-${i}` }, t + Math.floor(i / 2) * 10000 + 500 + i));
  for (let i = 0; i < 4; i++) m.push(ev('link.upsert', { id: `r${i}`, type: 'K', fromId: 'busy', toId: `r-${i}` }, t + 2000 + i));
  for (let i = 0; i < 3; i++) m.push(ev('link.upsert', { id: 'r0', type: 'K', fromId: 'busy', toId: 'r-0', properties: { v: i } }, t + 3000 + i));
  await send(prod, A, m); await sleep(1500); await advance(prod, A, ev, t + 3600e3);
  const spikes = () => OUT.alerts.filter(r => r.value.windowStart.startsWith(new Date(t).toISOString().slice(0, 10)));
  await until(() => spikes().length >= 1 && OUT.windows.some(r => r.value.nodeId === 'calm' && r.value.windowStart === new Date(t + 20000).toISOString().replace('.000Z', 'Z')), 60000, 100).catch(() => {});
  await sleep(1500);
  const al = spikes();
  assert.deepEqual(al.map(r => r.value.nodeId), ['spiky'], 'exactly one alert, for spiky');
  assert.equal(al[0].value.degreeGained, 6); assert.equal(al[0].value.severity, 'warn'); assert.equal(al[0].key, al[0].value.alertId);
  assert.equal(al[0].value.alertId, `degree.spike:spiky:${t}`, 'deterministic alert id (idempotent upsert key)');
  assert.equal(metricOf('busy').degree, 4, 're-upserting an existing link does not add degree');
});

test('F6 output contracts: every output record validates against graph-derived.v1 and carries schema headers', opts, async () => {
  await ensureA();
  const outs = OUT.all.filter(r => r.topic !== A.c.kafkaTopics.dlq);
  assert.ok(outs.length > 50);
  const bad = outs.map(r => validateDerived(r.value)).filter(v => !v.ok);
  assert.deepEqual(bad, [], 'all outputs valid');
  for (const r of outs) { assert.equal(r.headers['schema.version'], '1'); assert.equal(r.headers['schema.id'], `${r.value.kind}/v1`); }
  for (const r of OUT.metrics) assert.equal(r.key, r.value.nodeId, 'graph.metrics keyed by node id (compaction keeps the latest)');
});

// ---------------------------------------------------------------- crash + restart (own namespace and JVM)
function workload(sp, ev, from, to, t) { // deterministic: nodes n0..n49, links with re-upserts and removes
  const m = [];
  for (let i = from; i < to; i++) {
    const a = `n${i % 50}`, b = `n${(i * 7 + 3) % 50}`;
    if (i % 10 === 9) m.push(ev('link.remove', { id: `L${i - 5}`, fromId: `n${(i - 5) % 50}` }, t + i));
    else if (i % 10 === 8) m.push(ev('link.upsert', { id: `L${i - 1}`, type: 'K', fromId: `n${(i - 1) % 50}`, toId: `n${((i - 1) * 7 + 3) % 50}`, properties: { again: true } }, t + i));
    else m.push(ev('link.upsert', { id: `L${i}`, type: 'K', fromId: a, toId: b }, t + i));
  }
  return m;
}
function expectedDegrees(msgs) {
  const links = new Map(), deg = new Map(), add = (id, d) => deg.set(id, (deg.get(id) || 0) + d);
  for (const m of msgs) { const e = JSON.parse(m.value); const p = e.payload;
    if (e.op === 'link.upsert') { const s = links.get(p.id); if (!s) { add(p.fromId, 1); add(p.toId, 1); links.set(p.id, p); } }
    if (e.op === 'link.remove') { const s = links.get(p.id); if (s) { add(s.fromId, -1); add(s.toId, -1); links.delete(p.id); } } }
  return deg;
}

test('F7 crash (kill -9) mid-stream + restart from checkpoint: no double counting, no duplicate outputs (read_committed)', opts, async t8 => {
  const B = fspace('restart'), evB = events(B), t = T0 + 7 * DAY;
  let p = await startProcessor(B); const out = await collector(B), pr = await producer(B);
  const all = workload(B, evB, 0, 6000, t);
  try {
    for (let i = 0; i < 2000; i += 200) await send(pr, B, all.slice(i, i + 200));
    await until(() => out.enriched.length >= 1500, 60000, 50);
    let sent = 2000;
    const sending = (async () => { for (let i = 2000; i < 4000; i += 50) { await send(pr, B, all.slice(i, i + 50)); sent = i + 50; await sleep(40); } /* ~2.5 s of steady input */ })();
    await sleep(1200); const sentAtKill = sent; /* kill while input is still flowing */ await p.stop({ kill: true }); const visibleAtKill = new Set(out.enriched.map(r => r.value.eventId)).size; await sending;
    t8.diagnostic(`at kill: ${sentAtKill} sent, ${visibleAtKill} visible to read_committed readers (exactly-once: the gap was in flight / un-committed)`);
    p = await startProcessor(B);
    assert.ok(p.info.restoredFrom, 'restarted from a retained checkpoint'); 
    for (let i = 4000; i < 6000; i += 200) await send(pr, B, all.slice(i, i + 200));
    await sleep(1000); await advance(pr, B, evB, t + 3600e3);
    const exp = expectedDegrees(all);
    await until(() => [...exp].every(([id, d]) => out.latest().get(id)?.degree === d) && out.enriched.length >= 6000, 90000, 200).catch(() => {});
    await sleep(2000);
    const ids = out.enriched.map(r => r.value.eventId), uniq = new Set(ids);
    assert.equal(uniq.size, 6000, 'every input event enriched'); assert.equal(ids.length, uniq.size, `no duplicate enriched records (${ids.length - uniq.size} dupes)`);
    const wrong = [...exp].filter(([id, d]) => out.latest().get(id)?.degree !== d);
    assert.deepEqual(wrong.slice(0, 5).map(([id, d]) => [id, d, out.latest().get(id)?.degree]), [], 'final degrees exact');
    const wk = out.windows.map(r => r.key); assert.equal(new Set(wk).size, wk.length, 'one window record per key');
    const changesById = new Map(); for (const e of all.map(m => JSON.parse(m.value))) for (const id of [e.payload.fromId].filter(Boolean)) changesById.set(id, 1);
    const totalChanges = [...out.latest().values()].reduce((s, m) => s + m.changes, 0);
    const expChanges = all.reduce((s, m) => { const e = JSON.parse(m.value); return s + (e.op === 'link.remove' ? 2 : e.payload.fromId === e.payload.toId ? 1 : 2); }, 0);
    assert.ok(totalChanges <= expChanges && totalChanges >= expChanges - 600, `change counters not double counted (${totalChanges} vs <= ${expChanges})`);
  } finally { await out.close(); await pr.disconnect(); await p.stop(); }
});

// ---------------------------------------------------------------- viewer + MCP integration (createExplore, kafka mode)
test('F8 viewer API + MCP tools expose the derived metrics (permission-filtered); off by default', opts, async () => {
  const C = fspace('ui'), base = loadConfig('/nonexistent/explore.config.json');
  const mk = processor => createExplore({ log: null, config: { ...base, mode: 'kafka', streams: ['ext'], dataDir: C.dir, mcp: { ...base.mcp, actAs: null },
    kafka: { ...C.kc, instanceId: `ui-${processor ? 1 : 0}`, checkpointDir: C.dir }, processor } });
  const off = await mk(undefined);
  try {
    assert.equal(off.processor, null, 'disabled by default');
    const s = buildMcpServer(off), cl = new Client({ name: 't', version: '1' }), [x, y] = InMemoryTransport.createLinkedPair(); await s.connect(x); await cl.connect(y);
    const names = (await cl.listTools()).tools.map(t => t.name); assert.ok(!names.includes('node_metrics') && !names.includes('stream_alerts')); await cl.close();
  } finally { await off.close(); }
  await assert.rejects(createExplore({ log: null, config: { ...base, processor: { enabled: true } } }), /needs mode "kafka"/);
  const ex = await mk({ ...C.c, kafkaTopics: undefined, enabled: true });
  try {
    const t = Date.now(), p = ex.producer('ext');
    p.push('node.upsert', { id: 'hub', type: 'Person', label: 'Hub' });
    for (let i = 0; i < 7; i++) { p.push('node.upsert', { id: `leaf${i}`, type: 'Person' }); p.push('link.upsert', { id: `h${i}`, type: 'KNOWS', fromId: 'hub', toId: `leaf${i}` }); }
    await p.flush();
    await until(() => ex.processor.store.nodes.get('hub')?.degree === 7 && ex.service.live('hub'), 60000, 100);
    const srv = buildMcpServer(ex), cl = new Client({ name: 't', version: '1' }), [a, b] = InMemoryTransport.createLinkedPair(); await srv.connect(a); await cl.connect(b);
    const call = async (name, args) => JSON.parse((await cl.callTool({ name, arguments: args })).content[0].text);
    const top = await call('node_metrics', { top: 3 });
    assert.equal(top.metrics[0].nodeId, 'hub'); assert.equal(top.metrics[0].degree, 7); assert.equal(top.processor.job.status, 'running');
    const some = await call('node_metrics', { ids: ['leaf3', 'ghost'] });
    assert.deepEqual(some.metrics.map(m => [m.nodeId, m.degree]), [['leaf3', 1]]); assert.equal(some.notVisibleOrUnknown, 1);
    // alert: 7 links inside one 10 s window (processing-time producer, event time = now); wait for the window to close
    await sleep(TEST_PROC.windowMs + 1500); p.push('heartbeat', {}); await p.flush();
    const al = await until(async () => { const r = await call('stream_alerts', {}); return r.alerts.length ? r : null; }, 60000, 300);
    assert.equal(al.alerts[0].nodeId, 'hub'); assert.equal(al.alerts[0].kind, 'degree.spike');
    // HTTP API used by the viewer
    const res = { code: 0, body: '', writeHead(c) { this.code = c; }, end(b) { this.body = b; } };
    const req = Object.assign(new (await import('node:events')).EventEmitter(), { method: 'POST' });
    const pr = ex.handle(req, res, new URL('http://x/api/explore/processor/metrics')); req.emit('data', Buffer.from(JSON.stringify({ ids: ['hub', 'leaf0', 'nope'] }))); req.emit('end'); await pr;
    const body = JSON.parse(res.body);
    assert.equal(res.code, 200); assert.deepEqual(Object.keys(body.metrics).sort(), ['hub', 'leaf0']); assert.equal(body.metrics.hub.alert.severity, 'warn');
    assert.ok(body.alerts.every(a => a.nodeId === 'hub'));
    await cl.close();
  } finally { await ex.close(); }
});

test('F9 kafkajs read_committed fix: interleaved aborted transactions (unsorted abortedTransactions) are all filtered', async () => {
  const { filterAbortedMessages } = await import('../kafka/kafkajs-fix.js');
  const { createRequire } = await import('node:module');
  const stockSrc = (await import('node:fs')).readFileSync(createRequire(import.meta.url).resolve('kafkajs/src/consumer/filterAbortedMessages.js'), 'utf8');
  const m = (offset, producerId, key = Buffer.from('k')) => ({ offset: String(offset), key, batchContext: { producerId, inTransaction: true } });
  const ABORT = Buffer.from([0, 0, 0, 0]);
  // two producers' aborted transactions interleaved (as written by a 2-way parallel Flink sink before a crash)
  const messages = [m(1220, '2049'), m(1221, '2049'), m(1250, '2048'), m(1251, '2048'), m(1284, '2048', ABORT), m(1285, '2049', ABORT), m(1286, '2048'), m(1342, '2049')];
  const abortedTransactions = [{ producerId: '2048', firstOffset: '1250' }, { producerId: '2049', firstOffset: '1220' }]; // unsorted, as returned by the broker
  const kept = filterAbortedMessages({ messages, abortedTransactions }).filter(x => !x.key.equals(ABORT)).map(x => Number(x.offset));
  assert.deepEqual(kept, [1286, 1342], 'only records after the abort markers survive');
  assert.match(stockSrc, /if \(\s*remainingAbortedTransactions\.length/, 'stock kafkajs still has the single-activation logic this fix replaces (re-check on upgrade)');
  const { KAFKAJS_FIX_APPLIED } = await import('../kafka/kafkajs-fix.js'); assert.equal(KAFKAJS_FIX_APPLIED, true);
});
