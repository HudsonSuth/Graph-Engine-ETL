// Flink geo metrics (SPEC §22.7) against a REAL Kafka broker and REAL Apache Flink: H3 cell per positioned node.upsert,
// event-time tumbling counts per cell -> <id>.geo (graph.geo-metrics), the viewer's MetricsStore read model, and the
// grid_counts MCP tool's stream heat with its access gate. FLINK_IMPL=wrong must fail (swapped lat/lon, no dedupe,
// processing-time windows). Skipped (never mocked) without a broker or Flink.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { brokerUp, flinkReady, fspace, startProcessor, producer, events, send, until, sleep, DAY, T0, IMPL } from './flink-helpers.js';
import { validateDerived } from '../flink/contracts.js';
import { MetricsStore } from '../flink/metrics-store.js';
import { processorConfig } from '../flink/config.js';
import { aggregate } from '../shared/geo.js';
import { createExplore, loadConfig } from '../server/app.js';
import { buildMcpServer } from '../server/mcp-server.js';
import { resultJson } from '../server/connectors/mcp.js';

const UP = await brokerUp(), READY = flinkReady();
const skip = !UP ? 'no Kafka broker reachable' : !READY ? 'Flink not installed: npm run flink:setup && npm run flink:build' : false;
const opts = { skip, timeout: 240000 };
console.log(`# flink geo suite impl=${IMPL}${skip ? ` SKIPPED: ${skip}` : ''}`);

// [lat, lon, H3 r5 cell] reference values from the H3 C library (Python h3), as in geo.test.js
const REF = [[38.8895, -77.0353, '852aa847fffffff'], [51.5007, -0.1246, '85194ad3fffffff'], [-33.8568, 151.2153, '85be0e37fffffff'], [35.6586, 139.7454, '852f5aaffffffff'], [64.1466, -21.9426, '85075dd7fffffff']];
const WIN = 10000, R = 5;
let SP, P, prod, ev, store;
after(async () => { await store?.close(); await prod?.disconnect(); await P?.stop(); });

test('FG0 geo output is opt-in: off by default, topic + job config only when enabled', () => {
  const off = processorConfig({}, {}), on = processorConfig({ geo: { enabled: true, resolution: 7 } }, {});
  assert.equal(off.geo.enabled, false); assert.equal(off.topics.geo, 'graph.geo-metrics');
  assert.equal(on.geo.resolution, 7); assert.equal(on.geo.windowMs, 60000);
  assert.equal(validateDerived({ schemaVersion: 1, kind: 'geo.window', grid: 'h3', cell: 'xyz', resolution: 5, windowStart: 'x', windowEnd: 'y', count: 1, processor: 'p' }).ok, false);
});

test('FG1 per-cell windowed counts: H3 cell per positioned upsert, deduped, event-time windows, matches h3-js', opts, async () => {
  SP = fspace('geo', { geo: { enabled: true, resolution: R, windowMs: WIN, windows: 10 } });
  SP.c.topics.geo = `${SP.id}.geo`;
  P = await startProcessor(SP); prod = await producer(SP); ev = events(SP);
  store = await new MetricsStore({ kafka: SP.kafka, c: SP.c, instanceId: 'fg' }).start();
  const t = T0 + 30 * DAY, msgs = [], expect = new Map(); // `${cell}|${windowStart}` -> count
  const hit = (cell, ts) => { const k = `${cell}|${ts - (ts % WIN)}`; expect.set(k, (expect.get(k) || 0) + 1); };
  REF.forEach(([lat, lon, cell], i) => { for (let k = 0; k <= i; k++) { const ts = t + i * 100 + k; msgs.push(ev('node.upsert', { id: `q${i}-${k}`, type: 'Quake', properties: { lat, lon } }, ts)); hit(cell, ts); } });
  // second window: string coordinates and a GeoJSON Point
  msgs.push(ev('node.upsert', { id: 'w2a', type: 'Quake', properties: { latitude: '38.8895', longitude: '-77.0353' } }, t + WIN + 5)); hit(REF[0][2], t + WIN + 5);
  msgs.push(ev('node.upsert', { id: 'w2b', type: 'Quake', properties: { geometry: { type: 'Point', coordinates: [139.7454, 35.6586] } } }, t + WIN + 6)); hit(REF[3][2], t + WIN + 6);
  // not counted: a redelivered event (same eventId), no position, out-of-range latitude, link events
  const dup = ev('node.upsert', { id: 'dup', type: 'Quake', properties: { lat: 51.5007, lon: -0.1246 } }, t + 7, 'fixed-dup-id'); hit(REF[1][2], t + 7);
  msgs.push(dup, { ...dup });
  msgs.push(ev('node.upsert', { id: 'nopos', type: 'Quake', properties: {} }, t + 8), ev('node.upsert', { id: 'bad', type: 'Quake', properties: { lat: 95, lon: 0 } }, t + 9), ev('link.upsert', { id: 'l', type: 'K', fromId: 'q0-0', toId: 'q1-0' }, t + 10));
  await send(prod, SP, msgs);
  await sleep(1500);
  await send(prod, SP, [ev('heartbeat', {}, t + 5 * WIN)]); // closes both windows
  const want = [...expect.values()].reduce((a, b) => a + b, 0);
  await until(() => store.counts.geo >= expect.size && store.geoCounts().events >= want, 90000).catch(() => {});
  const got = new Map(); for (const [w, m] of store.geo) for (const [cell, n] of m) got.set(`${cell}|${w}`, n);
  assert.deepEqual([...got.entries()].sort(), [...expect.entries()].sort(), 'cell|window -> count');
  // cross-language check: the Java (H3 JNI) cells are the h3-js cells the map draws
  const js = aggregate(msgs.map(m => JSON.parse(m.value)).filter(e => e.op === 'node.upsert').map(e => ({ id: e.eventId, ...e.payload.properties })).filter(p => p.lat <= 90), { kind: 'h3', resolution: R });
  for (const c of js.cells) assert.ok([...got.keys()].some(k => k.startsWith(c.cell + '|')), c.cell);
  const gc = store.geoCounts();
  assert.equal(gc.resolution, R); assert.equal(gc.windows, 2); assert.equal(gc.counts[REF[0][2]], 2); assert.equal(gc.counts[REF[4][2]], 5); assert.equal(gc.events, want);
});

test('FG2 grid_counts includeStream: heat for readers of every source, withheld otherwise', opts, async () => {
  assert.ok(store, 'needs FG1');
  const mk = async access => { const b = loadConfig(join(tmpdir(), 'no-such-explore-config.json')); const ex = await createExplore({ config: { ...b, streams: ['external', 'hr'], access: { ...b.access, sources: access } }, log: null }); ex.processor = { store, config: SP.c, stats: () => ({}), close: async () => {} }; return ex; };
  const call = async ex => { const s = buildMcpServer(ex), [a, b] = InMemoryTransport.createLinkedPair(); await s.connect(a); const c = new Client({ name: 't', version: '1' }); await c.connect(b); const r = resultJson(await c.callTool({ name: 'grid_counts', arguments: { kind: 'h3', includeStream: true } })); await c.close(); return r; };
  const open = await mk({}), shut = await mk({ hr: { read: ['role:hr'] } });
  const a = await call(open); assert.equal(a.stream.available, true); assert.equal(a.stream.counts[REF[4][2]], 5);
  const b = await call(shut); assert.equal(b.stream.available, false); assert.match(b.stream.reason, /withheld/); assert.equal(b.stream.counts, undefined);
  await open.close(); await shut.close();
});
