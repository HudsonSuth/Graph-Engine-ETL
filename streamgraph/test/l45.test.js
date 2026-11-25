// L4 and L5, offline: a fake OpenSearch, a stub or metered model, no network.
// The wrong build (STREAMGRAPH_L45=broken) must fail the cases named in test/wrong-l45.test.js.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AIMessage } from '@langchain/core/messages';
import { GraphStore } from '../src/graph.js';
import { PolicyStore } from '../src/abac/policy.js';
import { AbacEngine } from '../src/abac/engine.js';
import { SyncOut } from '../src/syncout/index.js';
import { indexName } from '../src/search/opensearch.js';
import { cosine } from '../src/search/knn.js';
import { makeMapper } from '../src/mapper.js';
import { validateFlow } from '../src/flow.js';
import { makeAgentRetrieve } from '../src/agents/rag.js';
import { runAgentFlow, resumeAgentFlow } from '../src/agents/compiler.js';
import { FileSaver } from '../src/agents/checkpoint.js';
import { reviewItem } from '../src/agents/review.js';
import { MeteredModel } from '../src/llm/metered.js';
import { startServer } from '../src/app.js';
import { GOOD_KEY } from './fixtures/fake-chat-model.js';

process.env.FAKE_KEY = GOOD_KEY;

function mockFetch({ plugin = true } = {}) {
  const indexes = new Map();
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(String(url));
    const method = init.method || 'GET';
    const parts = u.pathname.split('/').filter(Boolean);
    const name = parts[0];
    const ndjson = init.headers?.['content-type'] === 'application/x-ndjson';
    let payload = null;
    if (init.body) payload = ndjson ? init.body : JSON.parse(init.body);
    const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, async text() { return body == null ? '' : JSON.stringify(body); } });
    if (method === 'HEAD') return reply(indexes.has(name) ? 200 : 404, null);
    if (method === 'PUT' && parts.length === 1) {
      if (!plugin && payload?.settings?.index?.knn) return reply(400, { error: { type: 'illegal_argument_exception', reason: 'unknown setting [index.knn] because the k-NN plugin is not installed' } });
      indexes.set(name, { docs: new Map(), mapping: payload });
      return reply(200, { acknowledged: true });
    }
    if (method === 'POST' && name === '_bulk') {
      const lines = String(payload).trim().split('\n').map(l => JSON.parse(l));
      const items = [];
      for (let i = 0; i < lines.length; i += 2) {
        const action = lines[i];
        const op = Object.keys(action)[0];
        const meta = action[op];
        const idx = indexes.get(meta._index);
        if (!idx) { items.push({ [op]: { _id: meta._id, status: 404, error: { type: 'index_not_found' } } }); continue; }
        if (op === 'delete') idx.docs.delete(meta._id);
        else idx.docs.set(meta._id, lines[i + 1]);
        items.push({ [op]: { _id: meta._id, status: 200 } });
      }
      return reply(200, { errors: items.some(i => Object.values(i)[0].error), items });
    }
    if (method === 'POST' && parts[1] === '_delete_by_query') return reply(200, { deleted: 0 });
    if (method === 'POST' && parts[1] === '_search') {
      const idx = indexes.get(name);
      if (!idx) return reply(404, { error: { type: 'index_not_found_exception', reason: 'no such index' } });
      const docs = [...idx.docs.entries()].map(([id, _source]) => ({ _id: id, _source }));
      if (payload?.query?.knn) {
        if (!idx.mapping?.settings?.index?.knn) return reply(400, { error: { type: 'parsing_exception', reason: 'unknown query [knn]' } });
        const vec = payload.query.knn.embedding.vector;
        const k = payload.query.knn.embedding.k || docs.length;
        const hits = docs.map(h => ({ ...h, _score: cosine(vec, h._source.embedding || []) })).sort((a, b) => b._score - a._score).slice(0, k);
        return reply(200, { hits: { hits } });
      }
      return reply(200, { hits: { hits: docs.map(h => ({ ...h, _score: 1 })) } });
    }
    if (method === 'DELETE' && parts[1] === '_doc') {
      const idx = indexes.get(name);
      if (!idx) return reply(404, null);
      idx.docs.delete(decodeURIComponent(parts[2] || ''));
      return reply(200, { result: 'deleted' });
    }
    return reply(200, {});
  };
  return { fetchImpl, indexes };
}

async function indexVectors({ plugin = true } = {}) {
  const mock = mockFetch({ plugin });
  const graph = new GraphStore(), policy = new PolicyStore(), engine = new AbacEngine(policy);
  const near = [1, 0, 0, 0, 0, 0, 0, 0], far = [0, 1, 0, 0, 0, 0, 0, 0];
  graph.upsertNode('Note:a', 'Note', 'a', { text: 'alpha ships', embedding: near, llm_fields: 'embedding', trust_tier: 'unverified', generated_by: 'grokbot/f/embed' });
  graph.upsertNode('Note:b', 'Note', 'b', { text: 'beta boats', embedding: far, llm_fields: 'embedding', trust_tier: 'unverified', generated_by: 'grokbot/f/embed' });
  policy.register(graph.schema());
  policy.setField('Note', 'text', 'low');
  policy.setField('Note', 'embedding', 'low');
  const sinks = [{ id: 'os', name: 'os', kind: 'opensearch', settings: { url: 'http://127.0.0.1:9200', index: `sgknn-${plugin ? 'k' : 'e'}-` }, asUser: 'owner' }];
  const syncout = new SyncOut({ graph, engine, intervalMs: 999999, factories: { opensearch: { fetchImpl: mock.fetchImpl } } });
  await syncout.configure(sinks);
  await syncout.cycle();
  return { mock, sinks, syncout, near, index: `${indexName(sinks[0].settings)}-knn` };
}

test('k-NN sink stores the embed vector and a query returns that node', async () => {
  const s = await indexVectors();
  assert.equal(s.syncout.status()[0].health, 'green', s.syncout.status()[0].lastError);
  const idx = s.mock.indexes.get(s.index);
  assert.ok(idx, 'k-NN index was created');
  assert.equal(idx.mapping.settings.index.knn, true);
  assert.deepEqual(idx.docs.get('Note:a').embedding, s.near);
  const hits = await s.syncout.adapter(s.sinks[0]).knnSearch(s.near, 2);
  assert.equal(hits[0].node_id, 'Note:a');
  assert.match(hits[0].text, /alpha ships/);
});

test('without the k-NN plugin the same vectors are still stored and ranked', async () => {
  const s = await indexVectors({ plugin: false });
  assert.equal(s.syncout.status()[0].health, 'green', s.syncout.status()[0].lastError);
  const idx = s.mock.indexes.get(s.index);
  assert.ok(idx, 'vector index was created');
  assert.equal(idx.mapping.settings?.index?.knn, undefined);
  assert.deepEqual(idx.docs.get('Note:a').embedding, s.near);
  const hits = await s.syncout.adapter(s.sinks[0]).knnSearch(s.near, 2);
  assert.equal(hits[0].node_id, 'Note:a');
});

test('the graph mapper keeps an embed vector that the mapping does not name', async () => {
  const g = new GraphStore();
  const mapper = makeMapper({ t: { nodes: [{ label: 'Note', key: 'id', props: { title: 'title' } }], edges: [{ type: 'ABOUT', from: { label: 'Note', key: 'id' }, to: { label: 'Topic', key: 'topic' } }] } });
  const vec = [0.2, 0.4, 0.6, 0.8];
  await mapper.apply({ topic: 't', op: 'c', data: { id: '1', title: 'A note', topic: 'ships', note_vec: vec, _llm: { fields: ['note_vec'], model: 'nomic', generated: { by: 'grokbot/f/embed', at: '2026-01-01T00:00:00Z' } } } }, g);
  const n = g.getNode('Note:1');
  assert.deepEqual(n.props.note_vec, vec);
  assert.equal(n.props.trust_tier, 'unverified');
  assert.equal(n.props.generated_by, 'grokbot/f/embed');
  const e = g.edges()[0];
  assert.equal(e.props.trust_tier, 'unverified');
  assert.equal(e.props.generated_by, 'grokbot/f/embed');
});

test('vector search falls back to the graph when OpenSearch is down', async () => {
  const graph = { search: () => [{ label: 'Note', key: 'a', props: { text: 'from-graph' } }] };
  const retrieve = makeAgentRetrieve({
    graph,
    search: async () => { throw Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:9200'), { status: undefined }); },
    embed: async () => [1, 0, 0, 0],
  });
  const hits = await retrieve('ships');
  const text = hits.map(h => (typeof h === 'string' ? h : h.text)).join('\n');
  assert.match(text, /from-graph/);
});

test('combined retrieval returns graph and vector hits together', async () => {
  const graph = { search: () => [{ label: 'Note', key: 'g', props: { text: 'from-graph' } }] };
  const retrieve = makeAgentRetrieve({
    graph,
    search: async () => [{ text: 'from-vector', entity: 'Note', label: 'Note' }],
    embed: async () => [1, 0, 0, 0],
  });
  const hits = await retrieve('q');
  const text = hits.map(h => (typeof h === 'string' ? h : h.text)).join('\n');
  assert.match(text, /from-vector/);
  assert.match(text, /from-graph/);
});

test('a remote model does not receive a retrieved type it cannot export', async () => {
  let calls = 0;
  const factory = async () => ({ invoke: async () => { calls++; return new AIMessage('sent'); } });
  const engine = { decide: async ({ action }) => ({ allow: action !== 'export' }) };
  const model = new MeteredModel(
    { name: 'remote-x', model: 'x', provider: 'openai', transport: 'direct', locality: 'remote', flowId: 'f', nodeId: 'writer' },
    { factory, engine, subject: { id: 'owner', role: 'admin', clearance: 3 }, redact: s => s, contextTypes: [] },
  );
  const flow = { name: 't', nodes: [{ id: 'lookup', type: 'retrieve' }, { id: 'writer', type: 'model' }], edges: [{ from: 'lookup', to: 'writer' }] };
  await assert.rejects(() => runAgentFlow({
    flow,
    ctx: { model, retrieve: async () => [{ text: 'secret cargo manifest', entity: 'Customer' }] },
    input: 'summarise the cargo',
    threadId: 'gate-1',
  }), /export rights on Customer/);
  assert.equal(calls, 0, 'the remote model was called with text it must not receive');
});

test('validateFlow rejects an agent model node that sets a key', () => {
  const bad = { kind: 'agent', nodes: [{ id: 'writer', type: 'model', config: { model: { name: 'x', keyRef: 'env:SECRET' } } }], edges: [] };
  const errs = validateFlow(bad);
  assert.ok(errs.some(e => /cannot set keyRef/.test(e)), errs.join('\n'));
  assert.ok(!errs.some(e => /no source/.test(e)), 'an agent flow is not judged as an ETL flow');
  const ok = validateFlow({ kind: 'agent', nodes: [{ id: 'writer', type: 'model' }, { id: 'tools', type: 'tools' }], edges: [{ from: 'writer', to: 'tools' }, { from: 'tools', to: 'writer' }] });
  assert.deepEqual(ok, []);
  const etl = validateFlow({ name: 'e', steps: [], links: [] });
  assert.ok(etl.some(e => /no source/.test(e)));
});

test('only a recognised human can promote an unverified node', () => {
  const g = new GraphStore();
  g.upsertNode('Note:1', 'Note', '1', { text: 'draft finding', trust_tier: 'unverified', status: 'draft', generated_by: 'grokbot/f/n' });
  g.upsertEdge('ABOUT', 'Note:1', 'Topic:ships', { trust_tier: 'unverified', status: 'draft', generated_by: 'grokbot/f/n' });
  assert.throws(() => reviewItem(g, { id: 'Note:1', decision: 'approve', actor: 'grokbot/f/n', allowHuman: false }), /recognised human/);
  assert.equal(g.getNode('Note:1').props.trust_tier, 'unverified');
  assert.throws(() => reviewItem(g, { id: 'Note:1', decision: 'approve', actor: 'human:whsutherland', allowHuman: false }), /recognised human/);
  const ok = reviewItem(g, { id: 'Note:1', decision: 'approve', actor: 'human:whsutherland', allowHuman: true, note: 'checked the source' });
  assert.equal(ok.trust_tier, 'human-reviewed');
  assert.equal(g.getNode('Note:1').props.status, 'stable');
  assert.equal(g.getNode('Note:1').props.verified_by, 'human:whsutherland');
  const edgeId = g.edges()[0].id;
  const edge = reviewItem(g, { id: edgeId, kind: 'edge', decision: 'approve', actor: 'human:whsutherland', allowHuman: true });
  assert.equal(edge.trust_tier, 'human-reviewed');
  assert.equal(g.getEdge(edgeId).props.trust_tier, 'human-reviewed');
});

test('an approval survives a new process loading the same checkpoint file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sgcp-'));
  const file = join(dir, 'agent-checkpoints.json');
  const flow = { name: 't', approve: true, nodes: [{ id: 'model', type: 'model' }], edges: [] };
  const model = { bindTools() { return this; }, invoke: async () => ({ content: 'proposal', tool_calls: [] }) };
  const paused = await runAgentFlow({ flow, ctx: { model, checkpointer: new FileSaver(file) }, input: 'please file this', threadId: 'hitl-file' });
  assert.equal(paused.status, 'interrupted');
  assert.equal(paused.interrupts[0].question, 'Approve the proposed action?');
  const resumed = await resumeAgentFlow({ flow, ctx: { model, checkpointer: new FileSaver(file) }, threadId: 'hitl-file', decision: 'yes' });
  assert.equal(resumed.status, 'completed');
  assert.match(JSON.stringify(resumed.messages), /proposal/);
});

const closers = [];
after(async () => { for (const c of closers.splice(0)) await c(); });

async function boot(dataDir) {
  const S = await startServer({ port: 0, dataDir, log: () => {}, syncIntervalMs: 100000 });
  closers.push(() => S.close());
  const cfg = S.studio.llm.models();
  cfg.agents = { enabled: true };
  cfg.models.fake = { provider: 'fake', model: 'fake-1', keyRef: 'env:FAKE_KEY', transport: 'direct', locality: 'local', options: { fake: { toolCalling: true } } };
  cfg.defaults.chat = 'fake';
  S.studio.llm.saveModels(cfg, { isAdmin: true });
  return S;
}

async function call(S, method, path, body, headers = {}) {
  const res = await fetch(`http://127.0.0.1:${S.app.port}${path}`, {
    method, headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { status: res.status, json };
}

test('review routes are gated by agent.approve and a recognised human', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sgrev-'));
  const S = await boot(dir);
  S.app.graph.upsertNode('Note:9', 'Note', '9', { text: 'generated finding', trust_tier: 'unverified', status: 'draft', generated_by: 'grokbot/f/n' });
  const denied = await call(S, 'POST', '/api/agents/reviews', { id: 'Note:9', decision: 'approve' }, { 'x-sg-as': 'analyst' });
  assert.equal(denied.status, 403);
  assert.match(denied.json.error, /agent\.approve/);
  assert.equal(S.app.graph.getNode('Note:9').props.trust_tier, 'unverified');
  const listed = await call(S, 'GET', '/api/agents/reviews');
  assert.equal(listed.status, 200);
  assert.ok(listed.json.pending.some(r => r.id === 'Note:9'));
  const ok = await call(S, 'POST', '/api/agents/reviews', { id: 'Note:9', decision: 'approve', note: 'checked' });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.trust_tier, 'human-reviewed');
  assert.equal(S.app.graph.getNode('Note:9').props.verified_by, 'human:whsutherland');
  const forged = await call(S, 'POST', '/api/agents/reviews', { id: 'Note:9', decision: 'approve', actor: 'grokbot/f/n' });
  assert.notEqual(S.app.graph.getNode('Note:9').props.verified_by, 'grokbot/f/n');
  assert.equal(forged.status, 409, JSON.stringify(forged.json));
});

test('a paused agent thread is still pending after the process restarts', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sgboot-'));
  const flow = { name: 'demo', approve: true, nodes: [{ id: 'model', type: 'model' }], edges: [] };
  const first = await boot(dir);
  const paused = await call(first, 'POST', '/api/agents/run', { flow, input: 'file the note', threadId: 'thr-restart' });
  assert.equal(paused.status, 200, JSON.stringify(paused.json));
  assert.equal(paused.json.status, 'interrupted');
  await first.close();
  closers.pop();
  const second = await boot(dir);
  const pending = await call(second, 'GET', '/api/agents/pending');
  assert.ok(pending.json.pending.some(p => p.threadId === 'thr-restart'), JSON.stringify(pending.json));
  const resumed = await call(second, 'POST', '/api/agents/thr-restart/resume', { decision: 'yes' });
  assert.equal(resumed.status, 200, JSON.stringify(resumed.json));
  assert.equal(resumed.json.status, 'completed');
});
