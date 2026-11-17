// Entity-match review from the studio ("Live processing" page): Duke finds possible matches, "Same thing" combines the two
// records, "Not the same" keeps them apart, decisions survive a restart, and an analyst cannot decide. Needs Java 17+ and
// Duke built from source (npm run er:setup -- --no-splink && npm run er:build); skipped otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
delete process.env.STREAMGRAPH_PROCESSING;
const { startCombined } = await import('../../explore/combined.js');
const { loadConfig } = await import('../../explore/server/app.js');
const { availability } = await import('../../explore/server/processing.js');
const a = availability(), skip = a.java.ok && a.duke.installed && a.duke.sidecarBuilt ? false : 'Duke or Java 17+ not installed';
let app, dir, base;
const wait = ms => new Promise(r => setTimeout(r, ms));
const call = async (m, p, b, as) => { const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', ...(as ? { 'x-sg-as': as } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) }); return { code: r.status, body: await r.json() }; };
const start = async () => { app = await startCombined({ port: 0, dataDir: dir, graphFile: join(dir, 'graph.db'), log: null, config: loadConfig(join(dir, 'none.json')) }); base = `http://127.0.0.1:${app.port}`; };
const until = async (f, ms = 20000) => { const t = Date.now() + ms; while (Date.now() < t) { const v = await f(); if (v) return v; await wait(300); } return null; };
test.before(async () => {
  if (skip) return;
  dir = mkdtempSync(join(tmpdir(), 'sg-er-'));
  writeFileSync(join(dir, 'explore-settings.json'), JSON.stringify({ stream: { enabled: false }, er: { enabled: true, engine: 'duke', types: { Customer: 'person' } } }));
  await start(); const g = app.sg.app.graph;
  g.upsertNode('Customer:c1', 'Customer', 'c1', { name: 'Ada Park', email: 'ada@example.com' });
  g.upsertNode('Customer:c2', 'Customer', 'c2', { name: 'Ada Parke', email: 'ada.park@example.org' });
  g.upsertNode('Customer:c3', 'Customer', 'c3', { name: 'Ben Ortiz', email: 'ben@example.com' });
  g.upsertNode('Customer:c4', 'Customer', 'c4', { name: 'Ben Ortis', email: 'b.ortiz@example.net' });
  g.upsertNode('Customer:c5', 'Customer', 'c5', { name: 'Zoe Quinn', email: 'zoe@example.com' });
  await call('GET', '/api/studio/home');
});
test.after(async () => { await app?.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });

const entityOf = rec => app.ex.er.engine.entityOf(`sg:node:${rec}`);
test('ER1 possible matches appear for review; "Same thing" combines the records, "Not the same" removes the suggestion; analysts cannot decide', { skip, timeout: 90000 }, async () => {
  const r = await until(async () => { const x = await call('GET', '/api/explore/x/er/review'); return x.body.matches?.length >= 2 ? x.body : null; });
  assert.ok(r, 'two possible matches listed'); assert.equal(r.engine, 'duke-1.2');
  const ada = r.matches.find(m => /Ada/.test(m.labelA)), ben = r.matches.find(m => /Ben/.test(m.labelA));
  assert.notEqual(entityOf('Customer:c1'), entityOf('Customer:c2'), 'below the threshold: not combined yet');
  const denied = await call('POST', '/api/explore/x/er/decide', { a: ada.entityA, b: ada.entityB, decision: 'same' }, 'analyst'); assert.equal(denied.code, 403);
  const ok = await call('POST', '/api/explore/x/er/decide', { a: ada.entityA, b: ada.entityB, decision: 'same', score: ada.score }); assert.equal(ok.code, 200); assert.equal(ok.body.applied, true);
  assert.equal(entityOf('Customer:c1'), entityOf('Customer:c2'), 'combined after "Same thing"');
  assert.ok(app.sg.app.graph.edges().some(e => e.type === 'SAME_AS'), 'decision saved in the store (goes out through sync-out)');
  await call('POST', '/api/explore/x/er/decide', { a: ben.entityA, b: ben.entityB, decision: 'different' });
  const after = await until(async () => { const x = await call('GET', '/api/explore/x/er/review'); return x.body.matches.length === 0 ? x.body : null; }, 8000);
  assert.ok(after, 'nothing left to review'); assert.equal(after.decisions.length, 2);
  assert.notEqual(entityOf('Customer:c3'), entityOf('Customer:c4'));
  assert.ok(!app.ex.er.engine.possibleMatches().some(m => [m.recordA, m.recordB].includes('sg:node:Customer:c4')), '"Not the same" hides the possible-match link');
});
test('ER2 decisions survive a restart (replayed into the engine)', { skip, timeout: 90000 }, async () => {
  await app.close(); await start();
  const merged = await until(async () => app.ex?.er?.engine && entityOf('Customer:c1') && entityOf('Customer:c1') === entityOf('Customer:c2'), 20000);
  assert.ok(merged, 'Ada records combined again after restart');
  assert.ok(!app.ex.er.engine.possibleMatches().some(m => [m.recordA, m.recordB].includes('sg:node:Customer:c4')));
});
