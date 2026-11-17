// "Live processing" start/stop from the studio: a local Kafka broker + the Flink job (built from source) start and stop with one
// button, metrics reach the page, the analyst only sees metrics for things they may see and cannot start/stop.
// Needs Java 17+, Kafka (npm run kafka:setup) and Flink (npm run flink:setup && npm run flink:build); skipped otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
delete process.env.STREAMGRAPH_PROCESSING;
process.env.STREAMGRAPH_KAFKA_PORT ||= '19092';
const { startCombined } = await import('../../explore/combined.js');
const { loadConfig } = await import('../../explore/server/app.js');
const { availability } = await import('../../explore/server/processing.js');
const a = availability(), skip = a.java.ok && a.kafka.installed && a.flink.installed && a.flink.jobBuilt ? false : 'Java, Kafka or Flink not installed';
let app, dir, base;
const wait = ms => new Promise(r => setTimeout(r, ms));
const call = async (m, p, b, as) => { const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', ...(as ? { 'x-sg-as': as } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) }); return { code: r.status, body: await r.json() }; };
test.before(async () => {
  if (skip) return;
  dir = mkdtempSync(join(tmpdir(), 'sg-proc-'));
  app = await startCombined({ port: 0, dataDir: dir, graphFile: join(dir, 'graph.db'), log: null, config: loadConfig(join(dir, 'none.json')) });
  base = `http://127.0.0.1:${app.port}`; const g = app.sg.app.graph;
  g.upsertNode('Customer:c1', 'Customer', 'c1', { name: 'Ada' }); g.upsertNode('Secret:s1', 'Secret', 's1', { name: 'X' }); g.upsertNode('Product:p1', 'Product', 'p1', { name: 'Shoe' });
  g.upsertEdge('BOUGHT', 'Customer:c1', 'Product:p1', {}); g.upsertEdge('KNOWS', 'Customer:c1', 'Secret:s1', {});
  await call('GET', '/api/studio/home');
  await call('POST', '/api/studio/access/rule', { rule: { name: 'no secrets', effect: 'deny', subjects: { roles: ['analyst'] }, actions: ['*'], resources: { entities: ['Secret'] } } });
});
test.after(async () => { await app?.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });

test('P-1 start stream processing: Kafka broker + Flink job run, metrics flow, analyst sees only allowed things and cannot stop it; stop shuts both down', { skip, timeout: 240000 }, async () => {
  assert.equal((await call('POST', '/api/explore/x/processing', { stream: { enabled: true } }, 'analyst')).code, 403);
  const on = await call('POST', '/api/explore/x/processing', { stream: { enabled: true } });
  assert.equal(on.code, 200, JSON.stringify(on.body)); assert.equal(on.body.mode, 'kafka'); assert.equal(on.body.broker.status, 'running'); assert.equal(on.body.processor.job.status, 'running');
  app.sg.app.graph.upsertNode('Product:p2', 'Product', 'p2', { name: 'Sock' }); app.sg.app.graph.upsertEdge('BOUGHT', 'Customer:c1', 'Product:p2', {});
  let m = null; const t = Date.now() + 90000;
  while (Date.now() < t) { m = (await call('GET', '/api/explore/x/processing/metrics')).body; if (m.enabled && m.top?.some(r => r.label === 'Ada' && r.degree >= 3)) break; await wait(1000); }
  assert.ok(m.top.some(r => r.label === 'Ada' && r.degree >= 3), 'Flink computed degrees');
  const am = (await call('GET', '/api/explore/x/processing/metrics', undefined, 'analyst')).body;
  assert.ok(am.top.length >= 1 && !am.top.some(r => r.type === 'Secret'), 'analyst gets no metrics for denied types');
  const off = await call('POST', '/api/explore/x/processing', { stream: { enabled: false } });
  assert.equal(off.code, 200); assert.equal(off.body.mode, 'inprocess'); assert.equal(off.body.broker.status, 'stopped');
  assert.equal((await call('GET', '/api/explore/x/processing/metrics')).body.enabled, false);
});
