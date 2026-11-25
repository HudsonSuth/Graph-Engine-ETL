// L3 agent HTTP routes. Offline: a fake model registered in the harness, no network.
// Proves run, approval interrupt, pending, resume, cancel, status, the agents.enabled gate,
// and that agent.run and agent.approve are different checks.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { startServer, ROOT } from '../src/app.js';
import { GOOD_KEY } from './fixtures/fake-chat-model.js';

process.env.FAKE_KEY = GOOD_KEY;
const realFetch = globalThis.fetch;
const fetched = [];
globalThis.fetch = (input, init) => { fetched.push(String(input?.url || input)); return realFetch(input, init); };
const isLoop = u => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/)/.test(u);
const closers = [];
after(async () => {
  globalThis.fetch = realFetch;
  for (const c of closers.splice(0)) await c();
  const outside = fetched.filter(u => !isLoop(u));
  assert.deepEqual(outside, [], `agent routes called the network: ${outside.join(', ')}`);
});

const flowOf = (extra = {}) => ({ name: 'demo', nodes: [{ id: 'model', type: 'model' }], edges: [], limits: { maxSteps: 6, maxToolCalls: 4, maxWallSeconds: 20 }, ...extra });

async function boot({ enabled = true, slow = false } = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'sgagent-'));
  const S = await startServer({ port: 0, dataDir, log: () => {}, syncIntervalMs: 100000 });
  const abs = resolve(dataDir), tmp = resolve(tmpdir()), root = resolve(ROOT);
  assert.ok(abs === tmp || abs.startsWith(tmp + sep), `${abs} is not a temp directory`);
  assert.ok(!(abs === root || abs.startsWith(root + sep)));
  assert.equal(resolve(S.app.agentCheckpointFile), join(abs, 'agent-checkpoints.json'));
  assert.equal(resolve(S.app.agentRunsFile), join(abs, 'agent-runs.json'));
  for (const name of ['agent-checkpoints.json', 'agent-runs.json']) assert.equal(existsSync(join(root, 'data', name)), false);
  closers.push(() => S.close());
  const cfg = S.studio.llm.models();
  cfg.agents = { enabled };
  const fake = { provider: 'fake', model: 'fake-1', keyRef: 'env:FAKE_KEY', transport: 'direct', locality: 'local', options: { fake: { toolCalling: true } } };
  cfg.models.fake = fake;
  if (slow) cfg.models['fake-slow'] = { ...fake, options: { fake: { toolCalling: true, delayMs: 4000 } } };
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
  return { status: res.status, json };
}

const waitFor = async (fn, ms = 2000) => {
  const start = Date.now();
  while (Date.now() - start < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, 20)); }
  return false;
};

function messageText(messages) {
  const out = [];
  const walk = (m) => {
    if (!m) return;
    if (typeof m === 'string') { out.push(m); return; }
    if (typeof m.content === 'string') out.push(m.content);
    if (typeof m.kwargs?.content === 'string') out.push(m.kwargs.content);
    if (Array.isArray(m)) m.forEach(walk);
  };
  walk(messages);
  return out;
}

test('agents stay off until agents.enabled is set', async () => {
  const S = await boot({ enabled: false });
  const res = await call(S, 'POST', '/api/agents/run', { flow: flowOf(), input: 'hi' });
  assert.equal(res.status, 403);
  assert.match(res.json.error, /turned off/i);
  assert.equal((await call(S, 'GET', '/api/agents/pending')).status, 403);
  assert.equal((await call(S, 'POST', '/api/agents/nope/resume', { decision: 'yes' })).status, 403);
  assert.equal((await call(S, 'POST', '/api/agents/nope/cancel', {})).status, 403);
  assert.equal((await call(S, 'GET', '/api/agents/nope')).status, 403);
});

test('owner runs an agent flow on the offline fake model', async () => {
  const S = await boot();
  const res = await call(S, 'POST', '/api/agents/run', { flow: flowOf(), input: 'hello agent', threadId: 'run-1' });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.equal(res.json.status, 'completed');
  assert.equal(res.json.threadId, 'run-1');
  assert.match(messageText(res.json.messages).join('\n'), /echo: hello agent/);
  const status = await call(S, 'GET', '/api/agents/run-1');
  assert.equal(status.status, 200);
  assert.equal(status.json.known, true);
  assert.equal(status.json.status, 'completed');
  assert.equal(status.json.pending, false);
  const threads = await call(S, 'GET', '/api/agents/threads');
  assert.ok(threads.json.threads.some(t => t.threadId === 'run-1' && t.status === 'completed'));
  assert.equal((await call(S, 'GET', '/api/agents/missing')).status, 404);
  const bad = await call(S, 'POST', '/api/agents/run', {});
  assert.equal(bad.status, 400);
});

test('retrieval on the agent route is in the model answer', async () => {
  const S = await boot();
  S.app.graph.upsertNode('Note:alpha', 'Note', 'alpha', { text: 'token-retrieved-7f3a' });
  const flow = flowOf({ retrieve: true });
  const res = await call(S, 'POST', '/api/agents/run', { flow, input: 'alpha', threadId: 'rag-http' });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.equal(res.json.status, 'completed');
  const answer = messageText(res.json.messages).find(t => t.startsWith('echo:'));
  assert.match(answer || '', /token-retrieved-7f3a/);
});

test('agent.run and agent.approve are enforced separately', async () => {
  const S = await boot();
  S.studio.policy.putRule({ id: 'agent-run', name: 'Analysts can run agents', effect: 'allow', subjects: { roles: ['analyst'] }, actions: ['agent.run'], resources: { entities: ['*'] }, enabled: true });
  const asAnalyst = { 'x-sg-as': 'analyst' };
  const run = await call(S, 'POST', '/api/agents/run', { flow: flowOf(), input: 'hi', threadId: 'an-1' }, asAnalyst);
  assert.equal(run.status, 200, JSON.stringify(run.json));
  assert.equal(run.json.status, 'completed');
  const resume = await call(S, 'POST', '/api/agents/an-1/resume', { flow: flowOf(), decision: 'yes' }, asAnalyst);
  assert.equal(resume.status, 403);
  assert.match(resume.json.error, /agent\.approve/);
  const pending = await call(S, 'GET', '/api/agents/pending', undefined, asAnalyst);
  assert.equal(pending.status, 403);
  assert.match(pending.json.error, /agent\.approve/);
});

test('approve pauses, pending lists the thread, and resume finishes it', async () => {
  const S = await boot();
  const flow = flowOf({ approve: true });
  const run = await call(S, 'POST', '/api/agents/run', { flow, input: 'ship it', threadId: 'hitl' });
  assert.equal(run.status, 200, JSON.stringify(run.json));
  assert.equal(run.json.status, 'interrupted');
  assert.equal(run.json.interrupts[0].question, 'Approve the proposed action?');
  const pending = await call(S, 'GET', '/api/agents/pending');
  assert.ok(pending.json.pending.some(p => p.threadId === 'hitl' && p.question));
  const status = await call(S, 'GET', '/api/agents/hitl');
  assert.equal(status.json.status, 'interrupted');
  assert.equal(status.json.pending, true);
  const resume = await call(S, 'POST', '/api/agents/hitl/resume', { flow, decision: 'yes' });
  assert.equal(resume.status, 200, JSON.stringify(resume.json));
  assert.equal(resume.json.status, 'completed');
  assert.match(messageText(resume.json.messages).join('\n'), /ship it/);
  const after = await call(S, 'GET', '/api/agents/pending');
  assert.equal(after.json.pending.find(p => p.threadId === 'hitl'), undefined);
  const deniedRun = await call(S, 'POST', '/api/agents/run', { flow, input: 'nope', threadId: 'hitl-no' });
  assert.equal(deniedRun.json.status, 'interrupted');
  const denied = await call(S, 'POST', '/api/agents/hitl-no/resume', { decision: 'no' });
  assert.equal(denied.json.status, 'stopped:approval_denied');
});

test('cancel aborts a running agent', async () => {
  const S = await boot({ slow: true });
  const flow = flowOf({ models: { default: 'fake-slow' } });
  const threadId = 'slow-1';
  const runP = call(S, 'POST', '/api/agents/run', { flow, input: 'wait', threadId });
  const saw = await waitFor(async () => (await call(S, 'GET', `/api/agents/${threadId}`)).json.status === 'running');
  assert.equal(saw, true);
  const cancel = await call(S, 'POST', `/api/agents/${threadId}/cancel`, {});
  assert.equal(cancel.status, 200);
  assert.equal(cancel.json.cancelled, true);
  const run = await runP;
  assert.equal(run.status, 200, JSON.stringify(run.json));
  assert.equal(run.json.status, 'stopped:cancelled');
  const again = await call(S, 'POST', `/api/agents/${threadId}/resume`, { flow, decision: 'yes' });
  assert.equal(again.status, 409);
});

test('resume checks the agent token', async () => {
  const S = await boot();
  const prev = process.env.AGENT_TOKEN;
  process.env.AGENT_TOKEN = 'agent-token-test';
  try {
    const denied = await call(S, 'POST', '/api/agents/missing/resume', { decision: 'yes' });
    assert.equal(denied.status, 403);
    assert.match(denied.json.error, /agent\.approve/);
    const runDenied = await call(S, 'POST', '/api/agents/run', { flow: flowOf(), input: 'hi' });
    assert.equal(runDenied.status, 403);
    const ok = await call(S, 'POST', '/api/agents/missing/resume', { decision: 'yes' }, { 'x-agent-token': 'agent-token-test' });
    assert.equal(ok.status, 404);
    const pending = await call(S, 'GET', '/api/agents/pending', undefined, { 'x-agent-token': 'agent-token-test' });
    assert.equal(pending.status, 200);
  } finally {
    if (prev === undefined) delete process.env.AGENT_TOKEN; else process.env.AGENT_TOKEN = prev;
  }
});
