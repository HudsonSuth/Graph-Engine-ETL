// L6–L9. Offline: fake model, no network. Covers local traces, the LangSmith opt-in and export
// gate, schedules, the flow editor's agent kinds, and the eval scorer.
import { test, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { startServer, ROOT } from '../src/app.js';
import { GOOD_KEY } from './fixtures/fake-chat-model.js';
import { FakeChatModel } from './fixtures/fake-chat-model.js';
import { runEvalSuite } from '../src/agents/eval.js';

process.env.FAKE_KEY = GOOD_KEY;
const realFetch = globalThis.fetch;
const fetched = [];
globalThis.fetch = (input, init) => {
  const url = String(input?.url || input);
  fetched.push({ url, init });
  if (/smith\.langchain\.com/.test(url)) return Promise.resolve(new Response('{}', { status: 200 }));
  return realFetch(input, init);
};
const closers = [];
after(async () => {
  globalThis.fetch = realFetch;
  for (const c of closers.splice(0)) await c();
});

const flowOf = (extra = {}) => ({ name: 'demo', kind: 'agent', nodes: [{ id: 'writer', type: 'model' }], edges: [], limits: { maxSteps: 6, maxToolCalls: 4, maxWallSeconds: 20 }, ...extra });
const KEY = 'sk-test-LANGSMITHKEY0123456789abcd';

async function boot({ enabled = true, langsmith = false, local = true } = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'sgl69-'));
  const S = await startServer({ port: 0, dataDir, log: () => {}, syncIntervalMs: 100000 });
  const abs = resolve(dataDir), tmp = resolve(tmpdir()), root = resolve(ROOT);
  assert.ok(abs === tmp || abs.startsWith(tmp + sep));
  assert.ok(!(abs === root || abs.startsWith(root + sep)));
  closers.push(() => S.close());
  const cfg = S.studio.llm.models();
  cfg.agents = { enabled, tracing: { local, langsmith } };
  cfg.models.fake = { provider: 'fake', model: 'fake-1', keyRef: 'env:FAKE_KEY', transport: 'direct', locality: 'local', options: { fake: { toolCalling: true } } };
  cfg.defaults.chat = 'fake';
  S.studio.llm.saveModels(cfg, { isAdmin: true });
  return S;
}

async function call(S, method, path, body, headers = {}) {
  const res = await realFetch(`http://127.0.0.1:${S.app.port}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { status: res.status, json, text };
}

function smithCalls() {
  return fetched.filter(f => /smith\.langchain\.com/.test(f.url));
}

describe('L6–L9 agent studio, traces, schedules and evals', { concurrency: 1 }, () => {
  test('local traces leave the prompt out of the file', async () => {
    delete process.env.LANGSMITH_API_KEY;
    process.env.LANGSMITH_TRACING = 'true';
    const before = smithCalls().length;
    const S = await boot({ langsmith: false });
    const phrase = 'prompt-should-stay-local-only';
    const res = await call(S, 'POST', '/api/agents/run', { flow: flowOf(), input: phrase, threadId: 'trace-1' });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(process.env.LANGSMITH_TRACING, 'false');
    assert.equal(smithCalls().length, before, 'LANGSMITH_TRACING alone must not send');
    const traces = await call(S, 'GET', '/api/agents/traces');
    assert.equal(traces.status, 200);
    assert.equal(traces.json.traces.length, 1);
    const blob = JSON.stringify(traces.json) + readFileSync(S.app.agentTraceFile, 'utf8');
    assert.equal(blob.includes(phrase), false);
    assert.equal(blob.includes(KEY), false);
    assert.equal(traces.json.traces[0].hosted, 'off');
    assert.ok(traces.json.traces[0].nodes.some(n => n.node === 'writer' && n.status === 'ok'));
  });

  test('hosted tracing stays off unless langsmith is enabled', async () => {
    process.env.LANGSMITH_API_KEY = KEY;
    process.env.LANGSMITH_TRACING = 'true';
    const before = smithCalls().length;
    const S = await boot({ langsmith: false });
    const res = await call(S, 'POST', '/api/agents/run', { flow: flowOf(), input: 'hello', threadId: 'trace-off' });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(smithCalls().length, before);
    const file = readFileSync(S.app.agentTraceFile, 'utf8');
    assert.equal(file.includes(KEY), false);
    assert.equal(file.includes('hello'), false);
  });

  test('hosted tracing respects the export gate', async () => {
    process.env.LANGSMITH_API_KEY = KEY;
    const before = smithCalls().length;
    const S = await boot({ langsmith: true });
    const user = await call(S, 'POST', '/api/studio/access/user', { id: 'runner', name: 'Runner', role: 'runner', clearance: 1 });
    assert.equal(user.status, 200, JSON.stringify(user.json));
    const rule = await call(S, 'POST', '/api/studio/access/rule', { rule: { name: 'runner may run agents', effect: 'allow', subjects: { roles: ['runner'] }, actions: ['agent.run'], resources: { entities: ['*'] } } });
    assert.equal(rule.status, 200, JSON.stringify(rule.json));
    const res = await call(S, 'POST', '/api/agents/run', { flow: flowOf(), input: 'hidden-prompt', threadId: 'trace-deny' }, { 'x-sg-as': 'runner' });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(smithCalls().length, before, 'export denied must not call LangSmith');
    const traces = await call(S, 'GET', '/api/agents/traces');
    const row = traces.json.traces.find(t => t.threadId === 'trace-deny');
    assert.equal(row.hosted, 'skipped');
    assert.equal(row.hostedReason, 'export_denied');
    assert.equal(JSON.stringify(traces.json).includes('hidden-prompt'), false);
  });

  test('a hosted trace sends metadata only', async () => {
    process.env.LANGSMITH_API_KEY = KEY;
    const before = smithCalls().length;
    const S = await boot({ langsmith: true });
    const phrase = 'owner-prompt-not-exported';
    const res = await call(S, 'POST', '/api/agents/run', { flow: flowOf(), input: phrase, threadId: 'trace-send' });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    const sent = smithCalls().slice(before);
    assert.equal(sent.length, 1);
    assert.match(sent[0].url, /^https:\/\/api\.smith\.langchain\.com\/runs$/);
    assert.equal(sent[0].init.headers['x-api-key'], KEY);
    const body = JSON.parse(sent[0].init.body);
    assert.deepEqual(body.inputs, {});
    assert.equal(JSON.stringify(body).includes(phrase), false);
    assert.equal(JSON.stringify(body).includes(KEY), false);
    const file = readFileSync(S.app.agentTraceFile, 'utf8');
    assert.equal(file.includes(KEY), false);
    assert.equal(file.includes(phrase), false);
    const traces = await call(S, 'GET', '/api/agents/traces');
    assert.equal(traces.json.traces.at(-1).hosted, 'sent');
  });

  test('schedules list, run, pause and stay behind agent.run', async () => {
    delete process.env.LANGSMITH_API_KEY;
    const S = await boot();
    const off = await boot({ enabled: false });
    assert.equal((await call(off, 'GET', '/api/agents/schedules')).status, 403);
    assert.equal((await call(off, 'POST', '/api/agents/schedules', { name: 'nope', everySeconds: 30, flow: flowOf() })).status, 403);
    const made = await call(S, 'POST', '/api/agents/schedules', { name: 'hourly', everySeconds: 30, input: 'scheduled-phrase', flow: flowOf() });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    assert.equal(made.json.schedule.name, 'hourly');
    const id = made.json.schedule.id;
    const listed = await call(S, 'GET', '/api/agents/schedules');
    assert.equal(listed.json.schedules.length, 1);
    const now = await call(S, 'POST', `/api/agents/schedules/${id}/run`, {});
    assert.equal(now.status, 200, JSON.stringify(now.json));
    assert.equal(now.json.status, 'completed');
    assert.match(JSON.stringify(now.json.messages), /echo: scheduled-phrase/);
    const traced = readFileSync(S.app.agentTraceFile, 'utf8');
    assert.equal(traced.includes('scheduled-phrase'), false);
    const paused = await call(S, 'POST', `/api/agents/schedules/${id}`, { enabled: false });
    assert.equal(paused.json.schedule.enabled, false);
    const fired = await S.app.agentScheduler.tick(Date.now() + 10 * 60 * 1000);
    assert.deepEqual(fired, []);
    await call(S, 'POST', `/api/agents/schedules/${id}`, { enabled: true });
    const again = await S.app.agentScheduler.tick(Date.now() + 20 * 60 * 1000);
    assert.deepEqual(again, [id]);
    const gone = await call(S, 'DELETE', `/api/agents/schedules/${id}`);
    assert.equal(gone.status, 200);
    assert.equal((await call(S, 'GET', '/api/agents/schedules')).json.schedules.length, 0);
    assert.equal(existsSync(join(ROOT, 'data', 'agent-schedules.json')), false);
    assert.equal(existsSync(join(ROOT, 'data', 'agent-traces.json')), false);
  });

  test('the flow editor is told the agent node kinds', async () => {
    const S = await boot();
    const put = await call(S, 'PUT', '/api/flow', flowOf());
    assert.equal(put.status, 200, JSON.stringify(put.json));
    assert.deepEqual(put.json.errors, []);
    const got = await call(S, 'GET', '/api/flow');
    assert.deepEqual(Object.keys(got.json.agentKinds).sort(), ['approve', 'branch', 'model', 'retrieve', 'sink', 'tools']);
    assert.equal(got.json.kinds.model, 'agent');
    assert.equal(got.json.etlKinds.file, 'source');
    const page = await call(S, 'GET', '/advanced');
    assert.match(page.text, /id="agentmode"/);
    const js = await call(S, 'GET', '/app.js');
    assert.match(js.text, /id="modelpick"/);
    const home = await call(S, 'GET', '/');
    assert.match(home.text, /href="#agents"/);
  });

  test('eval scorer fails a case that misses the expected text', async () => {
    const model = new FakeChatModel({ toolCalling: true, apiKey: GOOD_KEY });
    const summary = await runEvalSuite([
      { id: 'hit', flow: flowOf(), input: 'ping', expect: { status: 'completed', includes: 'echo: ping' } },
      { id: 'miss', flow: flowOf(), input: 'ping', expect: { status: 'completed', includes: 'this text is not in the answer' } },
    ], { model });
    assert.equal(summary.results.find(r => r.id === 'hit').pass, true);
    assert.equal(summary.results.find(r => r.id === 'miss').pass, false);
    assert.equal(summary.fail, 1);
  });
});
