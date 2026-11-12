import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { startServer } from '../src/app.js';

const dir = mkdtempSync(join(tmpdir(), 'sgreset-')), data = join(dir, 'data');
const wait = ms => new Promise(r => setTimeout(r, ms));
let slowHits = 0;
// A slow API: answers 300 ms after the request, so a poll is in flight when reset happens.
const slow = http.createServer((q, r) => { slowHits++; setTimeout(() => r.end(JSON.stringify([{ id: `A${slowHits}`, n: 'late' }])), 300); }).listen(0, '127.0.0.1');
const S = await startServer({ port: 0, dataDir: data, log: null });
after(async () => { await S.close(); slow.close(); });
const base = `http://127.0.0.1:${S.app.port}`;
const post = async (p, b) => { const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return { status: r.status, body: await r.json() }; };

async function addSources() {
  const file = await (await fetch(`${base}/api/studio/upload?name=people.csv`, { method: 'POST', body: 'id,name\nP1,Ada\nP2,Ben\n' })).json();
  await post('/api/studio/sources', { name: 'People file', kind: 'csv', settings: { path: file.path }, entity: 'Person', key: 'id', fields: { name: 'name' }, syncEverySec: 1 });
  await post('/api/studio/sources', { name: 'Slow API', kind: 'api', settings: { url: `http://127.0.0.1:${slow.address().port}/` }, secret: 'top-secret-key', entity: 'Person', key: 'id', fields: { n: 'n' }, syncEverySec: 1 });
}

test('server listens on 127.0.0.1 by default (no login yet)', () => {
  assert.equal(S.server.address().address, '127.0.0.1');
});

test('GET and unconfirmed POST are rejected', async () => {
  const g = await fetch(`${base}/api/studio/reset`);
  assert.equal(g.status, 405); assert.equal(g.headers.get('allow'), 'POST');
  const p = await post('/api/studio/reset', {});
  assert.equal(p.status, 400); assert.match(p.body.error, /confirm with RESET/);
});

test('backup has config and graph but no secrets', async () => {
  await addSources(); await wait(700);
  const r = await fetch(`${base}/api/studio/backup`), text = await r.text(), b = JSON.parse(text);
  assert.match(r.headers.get('content-disposition'), /attachment; filename="streamgraph-backup-/);
  assert.equal(b.workspace.sources.length, 2); assert.ok(b.graph.nodes.length >= 2); assert.ok(b.flow.steps.length >= 3);
  assert.ok(!text.includes('top-secret-key'));
});

test('reset empties graph, sources, secrets, uploads and the checklist', async () => {
  assert.ok(S.app.graph.counts().nodes > 0, 'precondition: data is syncing');
  const r = await post('/api/studio/reset', { confirm: 'RESET' });
  assert.equal(r.status, 200);
  assert.deepEqual(S.app.graph.counts(), { nodes: 0, edges: 0 });
  assert.deepEqual(S.studio.workspace.sources, []); assert.deepEqual(S.studio.secrets(), {});
  assert.equal(JSON.parse(readFileSync(join(data, 'workspace.json'), 'utf8')).sources.length, 0);
  assert.equal(readFileSync(join(data, 'secrets.json'), 'utf8'), '{}');
  assert.deepEqual(readdirSync(join(data, 'uploads')), []);
  assert.equal(S.app.flow.steps.length, 0); assert.equal(S.app.pipe, null);
  assert.ok(r.body.checklist.every(c => !c.done)); assert.equal(r.body.sources.length, 0); assert.equal(r.body.recent.length, 0);
});

test('in-flight records after reset do not repopulate the graph', async () => {
  await addSources(); await wait(1200);
  const hitsBefore = slowHits;
  assert.ok(S.app.graph.counts().nodes > 0);
  // Wait until a slow poll is in flight, then reset.
  await wait(950);
  await post('/api/studio/reset', { confirm: 'RESET' });
  await wait(2500); // longer than one poll interval plus the slow response
  assert.deepEqual(S.app.graph.counts(), { nodes: 0, edges: 0 }, 'nothing came back');
  assert.ok(slowHits - hitsBefore <= 2, 'the API is no longer being polled');
  const home = await (await fetch(`${base}/api/studio/home`)).json();
  assert.equal(home.running, false); assert.equal(home.counts.nodes, 0);
});

test('the app works again right after reset without a restart', async () => {
  writeFileSync(join(dir, 'p.json'), JSON.stringify([{ id: 'Z1', name: 'Zed' }]));
  await post('/api/studio/sources', { name: 'Fresh', kind: 'json', settings: { path: join(dir, 'p.json') }, entity: 'Person', key: 'id', fields: { name: 'name' } });
  await wait(300);
  assert.deepEqual(S.app.graph.nodes('Person').map(n => n.key), ['Z1']);
  await post('/api/studio/reset', { confirm: 'RESET' });
});

test('a record emitted by a source after its pipeline stopped is dropped', async () => {
  const { Pipeline } = await import('../src/flow.js'), { GraphStore } = await import('../src/graph.js');
  const g = new GraphStore();
  const p = new Pipeline({ steps: [{ id: 's', type: 'file', config: { path: 'x.csv', topic: 't' } }, { id: 'k', type: 'graph', config: { mapping: { t: { nodes: [{ label: 'X', key: 'id' }] } } } }], links: [{ from: 's', to: 'k' }] }, { graph: g });
  const emit = p.emitter('s');
  await emit({ op: 'c', topic: 't', data: { id: '1' } });
  const late = emit({ op: 'c', topic: 't', data: { id: '2' } }); // queued, not yet applied
  await p.stop(); await late; await emit({ op: 'c', topic: 't', data: { id: '3' } });
  assert.deepEqual(g.nodes('X').map(n => n.key), ['1']);
});
