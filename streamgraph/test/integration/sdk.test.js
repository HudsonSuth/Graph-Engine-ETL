// JS SDK and Python client against a live server: same access rules as the studio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
process.env.STREAMGRAPH_PROCESSING = 'off';
const { startCombined } = await import('../../explore/combined.js');
const { loadConfig } = await import('../../explore/server/app.js');
const { createClient } = await import('../../sdk/js/streamgraph.js');
let app, dir, base;
test.before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sg-sdk-'));
  app = await startCombined({ port: 0, dataDir: dir, log: null, config: loadConfig(join(dir, 'none.json')) }); base = `http://127.0.0.1:${app.port}`; const g = app.sg.app.graph;
  g.upsertNode('Customer:c1', 'Customer', 'c1', { name: 'Ada', email: 'ada@example.com', city: 'Boston' }); g.upsertNode('Customer:c2', 'Customer', 'c2', { name: 'Bob', email: 'bob@example.com', city: 'Austin' });
  await fetch(base + '/api/studio/home');
  for (const [f, s] of [['name', 'low'], ['city', 'low'], ['email', 'high']]) await fetch(base + '/api/studio/access/field', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entity: 'Customer', field: f, sensitivity: s }) });
});
test.after(async () => { await app.close(); rmSync(dir, { recursive: true, force: true }); });
test('SDK-1 JS client: query, Cypher, history, comments, SVG; analyst preview hides fields and cannot edit', async () => {
  const sg = createClient({ baseUrl: base });
  const r = await sg.query({ a: { type: 'Customer', where: [{ field: 'city', op: '=', value: 'Austin' }] } });
  assert.equal(r.count, 1); assert.equal(await sg.toCypher({ a: { type: 'Customer' } }), 'MATCH (a:Customer) RETURN a LIMIT 100');
  assert.equal((await sg.cypher(r.cypher)).count, 1);
  assert.ok((await sg.history.timeline()).events >= 2);
  assert.equal((await sg.comments.add('sg:node:Customer:c1', 'hi')).text, 'hi');
  assert.match(await sg.exportSvg({ ids: ['sg:node:Customer:c1'] }), /^<svg/);
  const an = createClient({ baseUrl: base, as: 'analyst' });
  assert.ok((await an.query({ a: { type: 'Customer' } })).rows.every(x => !/@example/.test(x.a.properties.email ?? '')));
  await assert.rejects(an.edit([{ op: 'addNode', type: 'Customer', key: 'x', props: {} }]), e => e.status === 403);
});
test('SDK-2 Python client (python3 -m unittest)', { skip: spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['--version']).status === 0 ? false : 'no Python' }, async () => { // async spawn: the server runs in this process and must keep answering
  const p = spawn(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'unittest', 'discover', '-v', 'sdk/python/tests'], { env: { ...process.env, SG_BASE: base } });
  let err = ''; p.stderr.on('data', d => { err += d; }); const code = await new Promise(r => p.on('close', r));
  assert.equal(code, 0, err); assert.match(err, /Ran 3 tests/); assert.doesNotMatch(err, /skipped/);
});
