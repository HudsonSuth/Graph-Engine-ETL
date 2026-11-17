// Kafka event-driven mode (SPEC §17) against a REAL broker. Skipped (not mocked) when no broker is reachable.
//   KAFKA_BROKERS=localhost:9092 npm run test:kafka        KAFKA_IMPL=wrong -> the deliberately wrong implementation (must fail)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ResourceUpdatedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { buildMcpServer } from '../server/mcp-server.js';
import { kafkaConfig, makeKafka } from '../kafka/config.js';
import { validateEvent, validateCommand, SCHEMAS } from '../kafka/contracts.js';
import { brokerUp, space, instance, until, sleep, caughtUp, readAll, fingerprint, admin, ends } from './kafka-helpers.js';

const UP = await brokerUp();
const opts = { skip: UP ? false : 'no Kafka broker reachable at KAFKA_BROKERS (default localhost:9092) - start one (README) to run this suite', timeout: 120000 };
if (!UP) console.log('# kafka suite SKIPPED: no broker reachable (this suite never uses a mock)');

const json = r => JSON.parse(r.content[0].text);
async function mcp(ex, o) {
  const server = buildMcpServer(ex, o), client = new Client({ name: 't', version: '1' }), [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b);
  return { client, server, call: async (name, args = {}) => json(await client.callTool({ name, arguments: args })), close: async () => { await client.close(); await server.close(); } };
}
/** capture the applied order of events (id, version, Kafka partition) */
function tap(ex) {
  const seen = []; const orig = ex.ingest.onApplied;
  ex.ingest.onApplied = (st, e) => { orig(st, e); if (e.payload?.id) seen.push({ id: e.payload.id, op: e.op, v: e.payload.properties?.v, partition: st.partition }); };
  return seen;
}

test('K0 config + contracts (no broker needed): SASL secrets only from env, SASL forces TLS, every op has a v1 schema', () => {
  const c = kafkaConfig({ brokers: 'a:9092, b:9092', sasl: { mechanism: 'plain', usernameEnv: 'T_KAFKA_KEY', passwordEnv: 'T_KAFKA_SECRET' } });
  assert.deepEqual(c.brokers, ['a:9092', 'b:9092']);
  delete process.env.T_KAFKA_KEY; delete process.env.T_KAFKA_SECRET;
  assert.throws(() => makeKafka(c), /T_KAFKA_KEY and T_KAFKA_SECRET/);
  process.env.T_KAFKA_KEY = 'k'; process.env.T_KAFKA_SECRET = 's';
  const k = makeKafka(c); assert.ok(k);
  assert.ok(!JSON.stringify(c).includes('"s"'), 'the secret is not copied into config');
  assert.deepEqual(Object.keys(SCHEMAS.events).sort(), ['heartbeat', 'link.remove', 'link.upsert', 'node.remove', 'node.upsert', 'snapshot.marker']);
  const ev = { schemaVersion: 1, eventId: 'e1', op: 'node.upsert', sourceId: 'ext', seq: 1, eventTime: new Date().toISOString(), payload: { id: 'n', type: 'T', properties: {} } };
  assert.equal(validateEvent(ev).ok, true);
  assert.equal(validateEvent({ ...ev, extra: 1 }).ok, false);
  assert.equal(validateEvent({ ...ev, payload: { id: 'n', type: 'T', properties: { 'sys:acl': 1 } } }).ok, false, 'reserved sys: keys refused');
  assert.equal(validateEvent({ ...ev, partial: true, payload: { id: 'n', properties: { a: 1 } } }).ok, true, 'partial upserts may omit type');
  assert.equal(validateCommand({ schemaVersion: 1, commandId: 'c-12345678', kind: 'upsert_node', issuedAt: new Date().toISOString(), issuer: { id: 'x' }, args: {} }).ok, true);
  assert.equal(validateCommand({ schemaVersion: 1, commandId: 'c-12345678', kind: 'drop', issuedAt: new Date().toISOString(), issuer: { id: 'x' }, args: {} }).ok, false);
});

test('K1 per-key ordering: one partition per key (links by fromId), versions applied strictly in order', opts, async t => {
  const sp = space('k1'), A = await instance(sp, 'a'); t.after(() => A.close());
  const seen = tap(A), p = A.producer('ext');
  const K = 24, V = 40;
  for (let v = 1; v <= V; v++) for (let k = 0; k < K; k++) {
    p.push('node.upsert', { id: `k${k}`, type: 'T', properties: { v } });
    if (v % 10 === 0) p.push('link.upsert', { id: `l${k}`, type: 'R', fromId: `k${k}`, toId: `k${(k + 1) % K}`, properties: { v } });
  }
  await p.flush(); await caughtUp(A, sp);
  const byId = new Map(); for (const s of seen) { if (!byId.has(s.id)) byId.set(s.id, []); byId.get(s.id).push(s); }
  for (let k = 0; k < K; k++) {
    const evs = byId.get(`k${k}`).filter(e => e.v !== undefined), parts = new Set(evs.map(e => e.partition));
    assert.equal(parts.size, 1, `node k${k} spread over ${[...parts]}`);
    assert.deepEqual(evs.map(e => e.v), Array.from({ length: V }, (_, i) => i + 1), `k${k} applied out of order`);
    const lp = new Set(byId.get(`l${k}`).map(e => e.partition));
    assert.deepEqual([...lp], [...parts], `link l${k} not co-partitioned with its fromId`);
    assert.equal(A.service.live(`k${k}`).properties.v, V);
  }
  // the topic itself: every message for a key sits in one partition
  const msgs = await readAll(sp, sp.kafka.topics.changes), keyParts = new Map();
  for (const m of msgs) { const id = JSON.parse(m.value).payload.id; if (!keyParts.has(id)) keyParts.set(id, new Set()); keyParts.get(id).add(m.p); }
  for (const [k, s] of keyParts) assert.equal(s.size, 1, `item ${k} in partitions ${[...s]}`);
});

test('K2 idempotent redelivery: resent batch, redelivered offsets and duplicate publications are no-ops', opts, async t => {
  const sp = space('k2'); let A = await instance(sp, 'a'); t.after(() => A.close());
  const evs = Array.from({ length: 50 }, (_, i) => ({ eventId: `x:${i + 1}`, op: 'node.upsert', seq: i + 1, eventTime: new Date().toISOString(), payload: { id: `n${i % 10}`, type: 'T', properties: { v: i } } }));
  const batch = { batchId: 'b1', sourceId: 'ext', partition: 0, events: evs };
  const ack1 = await A.publish(batch), ack2 = await A.publish(batch); // producer retry of the same batch
  assert.equal(ack1.accepted, 50); assert.equal(ack2.accepted, 0); assert.equal(ack2.duplicates, 50);
  await caughtUp(A, sp);
  const all = await readAll(sp, sp.kafka.topics.changes);
  assert.equal(all.length, 50, 'resent batch must not be published twice');
  // duplicate publication of the same event (same eventId, new offset): applied once
  const dup = JSON.parse(all[0].value);
  await A.kafka.publisher.sendRaw(sp.kafka.topics.changes, [{ key: dup.payload.id, value: JSON.stringify(dup) }]);
  await caughtUp(A, sp);
  assert.equal(A.kafka.consumer.metrics.applied, 50);
  const before = fingerprint(A), feedLen = A.feed.entries.length;
  // broker redelivery: crash after the checkpoint but before the offset commit -> group offsets and checkpoint offsets rewound
  await A.close();
  const f = join(sp.dir, `${sp.kafka.groups.viewPrefix}-a.checkpoint.json`), cp = JSON.parse(readFileSync(f, 'utf8'));
  cp.offsets = Object.fromEntries(Object.keys(cp.offsets).map(k => [k, 0])); writeFileSync(f, JSON.stringify(cp));
  A = await instance(sp, 'a'); await caughtUp(A, sp);
  assert.ok(A.kafka.consumer.metrics.messages >= 51, `everything was redelivered (${A.kafka.consumer.metrics.messages})`);
  assert.equal(A.kafka.consumer.metrics.applied, 0, 'redelivered events must not be applied again');
  assert.deepEqual(fingerprint(A), before);
  assert.equal(A.feed.entries.length, feedLen, 'no change-feed entries for redelivered events');
});

test('K3 restart replays from the committed position: only new events are applied', opts, async t => {
  const sp = space('k3'); let A = await instance(sp, 'a');
  const P = await instance(sp, 'p', { kafka: { consume: false } }); t.after(async () => { await A.close(); await P.close(); });
  const p = A.producer('ext');
  for (let i = 0; i < 300; i++) p.push('node.upsert', { id: `n${i % 60}`, type: 'T', properties: { v: i } });
  await p.flush(); await caughtUp(A, sp);
  assert.equal(A.kafka.consumer.metrics.applied, 300);
  await A.close(); // checkpoint + commit
  const q = P.producer('ext');
  for (let i = 300; i < 350; i++) q.push('node.upsert', { id: `n${i % 60}`, type: 'T', properties: { v: i } });
  await q.flush();
  A = await instance(sp, 'a'); const seen = tap(A); await caughtUp(A, sp);
  assert.equal(seen.length, 50, `applied after restart: ${seen.length} (expected only the 50 new events)`);
  assert.equal(A.kafka.consumer.metrics.applied, 50);
  assert.ok(A.kafka.consumer.metrics.restoredFrom, 'restored from checkpoint');
  for (let k = 0; k < 60; k++) { const want = k < 50 ? 300 + k : 240 + k; assert.equal(A.service.live(`n${k}`).properties.v, want); }
  // committed group offsets match the checkpoint position
  await A.kafka.consumer.checkpoint({ force: true });
  const ad = admin(sp); await ad.connect();
  let committed; try { committed = (await ad.fetchOffsets({ groupId: A.kafka.consumer.groupId, topics: [sp.kafka.topics.changes] }))[0].partitions; } finally { await ad.disconnect(); }
  for (const c of committed) assert.equal(Number(c.offset), A.kafka.consumer.next[c.partition]);
});

test('K4 two instances (own group each) converge, incl. replace-source snapshot expansion', opts, async t => {
  const sp = space('k4'), A = await instance(sp, 'a'), B = await instance(sp, 'b'); t.after(async () => { await A.close(); await B.close(); });
  const pa = A.producer('ext'), pb = B.producer('ext2');
  for (let i = 0; i < 200; i++) { pa.push('node.upsert', { id: `a${i % 40}`, type: 'T', properties: { v: i } }); pb.push('node.upsert', { id: `b${i % 30}`, type: 'U', properties: { v: i } }); }
  for (let i = 0; i < 39; i++) pa.push('link.upsert', { id: `al${i}`, type: 'R', fromId: `a${i}`, toId: `a${i + 1}`, properties: {} });
  await pa.flush(); await pb.flush();
  // replace-source snapshot from ext keeps a0..a19 (+links among them) -> a20..a39 and their links are removed
  pa.push('snapshot.marker', { phase: 'begin', snapshotId: 's1', mode: 'replace-source' });
  for (let i = 0; i < 20; i++) pa.push('node.upsert', { id: `a${i}`, type: 'T', properties: { v: 1000 + i } });
  for (let i = 0; i < 19; i++) pa.push('link.upsert', { id: `al${i}`, type: 'R', fromId: `a${i}`, toId: `a${i + 1}`, properties: {} });
  pa.push('snapshot.marker', { phase: 'end', snapshotId: 's1' });
  await pa.flush();
  await caughtUp(A, sp); await caughtUp(B, sp);
  assert.notEqual(A.kafka.consumer.groupId, B.kafka.consumer.groupId);
  assert.deepEqual([...A.kafka.consumer.assigned].sort(), [0, 1, 2]); assert.deepEqual([...B.kafka.consumer.assigned].sort(), [0, 1, 2]);
  assert.deepEqual(fingerprint(A), fingerprint(B));
  assert.equal(A.service.counts().nodes, 20 + 30); assert.ok(!A.service.live('a25')); assert.ok(!A.service.live('al30'));
  assert.equal(B.service.live('a5').properties.v, 1005);
  assert.ok(A.kafka.publisher.metrics.expandedRemoves >= 40);
});

test('K5 empty instance bootstraps from the compacted state topic after graph.changes was truncated', opts, async t => {
  const sp = space('k5'), A = await instance(sp, 'a'); t.after(() => A.close());
  const p = A.producer('ext');
  for (let i = 0; i < 400; i++) p.push('node.upsert', { id: `n${i % 80}`, type: 'T', properties: { v: i } });
  for (let i = 0; i < 10; i++) p.push('node.remove', { id: `n${i}` });
  p.push('node.upsert', { id: 'n70', type: 'T', properties: { tag: 'partial' } }, { partial: true });
  p.push('node.upsert', { id: 'n75', type: 'T', properties: { extra: 'x' } }); // full upsert with new keys: field-merge keeps v
  await p.flush(); await caughtUp(A, sp);
  const ad = admin(sp); await ad.connect();
  try {
    const hw = await ends(sp);
    await ad.fetchTopicMetadata({ topics: [sp.kafka.topics.changes] });
    await ad.deleteTopicRecords({ topic: sp.kafka.topics.changes, partitions: Object.entries(hw).map(([partition, offset]) => ({ partition: Number(partition), offset: String(offset) })) });
  } finally { await ad.disconnect(); }
  const C = await instance(sp, 'c'); t.after(() => C.close());
  assert.ok(C.kafka.consumer.metrics.bootstrapRecords >= 80);
  const live = fp => fp.filter(x => x.split('|')[1] === 'false');
  assert.deepEqual(live(fingerprint(C)), live(fingerprint(A)));
  assert.equal(C.service.live('n70').properties.tag, 'partial'); assert.equal(C.service.live('n70').properties.v, 390);
  assert.ok(!C.service.live('n3'));
  assert.deepEqual(C.service.live('n75').properties, A.service.live('n75').properties);
  // and it keeps following
  A.producer('ext').push('node.upsert', { id: 'late', type: 'T', properties: {} }); await A.producer('ext').flush();
  await until(() => C.service.live('late'));
});

test('K6 data contracts: invalid events go to the DLQ with a reason (produce side and consume side)', opts, async t => {
  const sp = space('k6'), A = await instance(sp, 'a'); t.after(() => A.close());
  const now = new Date().toISOString();
  const ack = await A.publish({ batchId: 'bad', sourceId: 'ext', partition: 0, events: [
    { eventId: 'ok1', op: 'node.upsert', seq: 1, eventTime: now, payload: { id: 'good', type: 'T', properties: {} } },
    { eventId: 'bad1', op: 'node.upsert', seq: 2, eventTime: now, payload: { id: 'nope' } },
    { eventId: 'bad2', op: 'node.explode', seq: 3, eventTime: now, payload: { id: 'x' } },
    { eventId: 'bad3', op: 'node.upsert', seq: 4, eventTime: 'yesterday', payload: { id: 'y', type: 'T', properties: {} } }] });
  assert.equal(ack.accepted, 1); assert.equal(ack.rejected, 3); assert.equal(ack.status, 'partial');
  // junk written straight to the topic by a non-conforming producer
  const raw = [{ key: 'j1', value: 'not json' }, { key: 'j2', value: JSON.stringify({ schemaVersion: 99, op: 'node.upsert' }) },
    { key: 'j3', value: JSON.stringify({ schemaVersion: 1, eventId: 'e', op: 'link.upsert', sourceId: 'ext', seq: 1, eventTime: now, payload: { id: 'l', type: 'R', fromId: 'a' } }) }];
  await A.kafka.publisher.sendRaw(sp.kafka.topics.changes, raw);
  A.producer('ext').push('node.upsert', { id: 'after', type: 'T', properties: {} }); await A.producer('ext').flush();
  await until(() => A.service.live('after'));
  assert.ok(A.service.live('good')); assert.ok(!A.service.live('nope'));
  const dlq = (await readAll(sp, sp.kafka.topics.dlq)).map(m => JSON.parse(m.value));
  const prod = dlq.filter(d => d.stage === 'produce'), cons = dlq.filter(d => d.stage === 'consume');
  assert.equal(prod.length, 3); assert.equal(cons.length, 3);
  assert.match(prod.find(d => d.eventId === 'bad1').reason, /required property 'type'/);
  assert.match(prod.find(d => d.eventId === 'bad2').reason, /unknown op/);
  assert.match(prod.find(d => d.eventId === 'bad3').reason, /eventTime/);
  assert.match(cons.find(d => d.key === 'j1').reason, /invalid JSON/);
  assert.match(cons.find(d => d.key === 'j2').reason, /schemaVersion 99/);
  assert.match(cons.find(d => d.key === 'j3').reason, /toId/);
  assert.equal(A.kafka.consumer.metrics.dlq, 3);
});

test('K7 MCP change subscription: resource notifications, cursor polling, long-poll, cursor survives restart', opts, async t => {
  const sp = space('k7'); let A = await instance(sp, 'a'); let m = await mcp(A);
  t.after(async () => { await m.close(); await A.close(); });
  const notes = []; m.client.setNotificationHandler(ResourceUpdatedNotificationSchema, n => notes.push(n.params.uri));
  await m.client.subscribeResource({ uri: 'explore://changes' });
  const c0 = (await m.call('changes_since', { from: 'now' })).cursor;
  const p = A.producer('ext');
  for (let i = 0; i < 5; i++) p.push('node.upsert', { id: `m${i}`, type: 'Person', properties: { i } });
  await p.flush();
  await until(() => notes.includes('explore://changes'));
  await caughtUp(A, sp);
  const r1 = await m.call('changes_since', { cursor: c0 });
  assert.deepEqual(r1.events.map(e => e.id).sort(), ['m0', 'm1', 'm2', 'm3', 'm4']); assert.equal(r1.reset, false);
  assert.ok(r1.events.every(e => e.partition.startsWith('kafka:') && e.seq >= 1));
  const r2 = await m.call('changes_since', { cursor: r1.cursor }); assert.equal(r2.events.length, 0);
  // long-poll: returns as soon as something is applied
  const pending = m.call('changes_since', { cursor: r1.cursor, waitMs: 15000 });
  await sleep(300); p.push('node.upsert', { id: 'm5', type: 'Person', properties: {} }); await p.flush();
  const t0 = Date.now(), r3 = await pending;
  assert.deepEqual(r3.events.map(e => e.id), ['m5']); assert.ok(Date.now() - t0 < 10000);
  // filter by type
  p.push('node.upsert', { id: 'acct', type: 'Account', properties: {} }); await p.flush(); await caughtUp(A, sp);
  assert.deepEqual((await m.call('changes_since', { cursor: r3.cursor, types: ['Account'] })).events.map(e => e.id), ['acct']);
  // restart: the old cursor still means the same Kafka position
  await m.close(); await A.close();
  A = await instance(sp, 'a'); m = await mcp(A);
  const r4 = await m.call('changes_since', { cursor: r3.cursor });
  assert.equal(r4.reset, false); assert.deepEqual(r4.events.map(e => e.id), ['acct']);
  const bad = await m.client.callTool({ name: 'changes_since', arguments: { cursor: '%%%' } }); assert.equal(bad.isError, true);
});

test('K8 command topic round trip: MCP write -> graph.commands -> worker -> graph.changes -> read model; results; refusals; DLQ', opts, async t => {
  const sp = space('k8'), A = await instance(sp, 'a', { mcp: { allowWrites: true } }); const m = await mcp(A, { allowWrites: true });
  t.after(async () => { await m.close(); await A.close(); });
  const names = (await m.client.listTools()).tools.map(x => x.name);
  assert.ok(names.includes('command_status')); assert.ok(!names.includes('push_stream_batch'));
  const r = await m.call('upsert_node', { id: 'agent:1', type: 'Note', label: 'hello', properties: { a: 1 } });
  assert.equal(r.status, 'applied'); assert.deepEqual(r.result.eventIds, [`cmd:${r.commandId}:0`]);
  await until(() => A.service.live('agent:1'));
  assert.equal(A.service.live('agent:1').sources[0].sourceId, 'mcp');
  const l = await m.call('upsert_link', { id: 'agent:l', type: 'REL', fromId: 'agent:1', toId: 'agent:2', properties: {} });
  assert.equal(l.status, 'applied'); await until(() => A.service.live('agent:l'));
  // the event went through graph.changes (not a direct write)
  const ch = (await readAll(sp, sp.kafka.topics.changes)).map(x => JSON.parse(x.value));
  assert.ok(ch.some(e => e.eventId === `cmd:${r.commandId}:0` && e.sourceId === 'mcp'));
  // refusal: items of other sources cannot be removed by agents
  A.producer('ext').push('node.upsert', { id: 'ext:1', type: 'T', properties: {} }); await A.producer('ext').flush(); await until(() => A.service.live('ext:1'));
  const res = await m.client.callTool({ name: 'remove_item', arguments: { id: 'ext:1' } });
  assert.equal(res.isError, true); assert.match(json(res).result.reason, /forbidden/);
  assert.ok(A.service.live('ext:1'));
  const rm = await m.call('remove_item', { id: 'agent:l' }); assert.equal(rm.status, 'applied');
  await until(() => !A.service.live('agent:l'));
  // async: commandId first, status later
  const q = await m.call('upsert_node', { id: 'agent:3', type: 'Note', properties: {}, waitMs: 0 });
  assert.equal(q.status, 'queued');
  assert.equal((await m.call('command_status', { commandId: q.commandId, waitMs: 10000 })).status, 'applied');
  // a malformed command on the topic goes to the DLQ (stage command) and gets a rejected result
  await A.kafka.publisher.sendRaw(sp.kafka.topics.commands, [{ key: 'x', value: JSON.stringify({ schemaVersion: 1, commandId: 'c-badbadbad', kind: 'drop_database', issuedAt: new Date().toISOString(), issuer: { id: 'x' }, args: {} }) }]);
  const rej = await A.kafka.commands.status('c-badbadbad', 15000); assert.equal(rej?.status, 'rejected'); assert.match(rej.reason, /kind/);
  assert.ok((await readAll(sp, sp.kafka.topics.dlq)).some(d => JSON.parse(d.value).stage === 'command'));
});

test('K9 command workers share a group: rebalance on worker loss, every command applied exactly once', opts, async t => {
  const sp = space('k9');
  const W1 = await instance(sp, 'w1', { mcp: { allowWrites: true } }), W2 = await instance(sp, 'w2', { mcp: { allowWrites: true } });
  t.after(async () => { await W2.close(); });
  await until(() => W1.kafka.worker.assigned.length + W2.kafka.worker.assigned.length === 3 && W1.kafka.worker.assigned.length > 0 && W2.kafka.worker.assigned.length > 0, 30000);
  const ids = [];
  for (let i = 0; i < 30; i++) ids.push(await W2.kafka.commands.emit('upsert_node', { id: `w:${i}`, type: 'Job', properties: { i } }, { id: 'test' }));
  await until(() => W1.kafka.worker.metrics.applied + W2.kafka.worker.metrics.applied >= 30, 30000);
  assert.ok(W1.kafka.worker.metrics.applied > 0 && W2.kafka.worker.metrics.applied > 0, 'work was split');
  await W1.close(); // worker loss -> rebalance
  await until(() => W2.kafka.worker.assigned.length === 3, 45000);
  for (let i = 30; i < 60; i++) ids.push(await W2.kafka.commands.emit('upsert_node', { id: `w:${i}`, type: 'Job', properties: { i } }, { id: 'test' }));
  await until(() => [...Array(60).keys()].every(i => W2.service.live(`w:${i}`)), 45000);
  const results = (await readAll(sp, sp.kafka.topics.results)).map(x => JSON.parse(x.value));
  const per = new Map(); for (const r of results) per.set(r.commandId, (per.get(r.commandId) || 0) + 1);
  assert.equal(per.size, 60); for (const id of ids) assert.equal(per.get(id), 1, `command ${id} result count`);
  const changes = (await readAll(sp, sp.kafka.topics.changes)).map(x => JSON.parse(x.value)).filter(e => e.eventId.startsWith('cmd:'));
  assert.equal(changes.length, 60, 'each command produced its event exactly once');
});
