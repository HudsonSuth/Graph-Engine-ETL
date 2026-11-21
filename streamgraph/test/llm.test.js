// Phase L0 + L1: dependencies/license gate and the bring-your-own-model harness. Offline: a deterministic fake model
// (in-process and behind the Model Bridge over MCP: inproc, stdio, HTTP), mock OpenAI-compatible and Ollama HTTP
// servers, and a test MCP host for sampling. Real providers run only when their env vars are set (skipped otherwise).
// The wrong build (SG_LLM_IMPL=wrong) must fail this suite: see wrong-llm.test.js.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CreateMessageRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FakeChatModel, GOOD_KEY, BAD_KEY } from './fixtures/fake-chat-model.js';
import { mockOpenAI, mockOllama, mockInference, INFERENCE_CATALOG } from './fixtures/mock-llm-http.mjs';
import { runConformance, parity } from './llm/conformance.mjs';
import { createHarness, defaultModels, validateModels, effectiveLimits, OPENAI_COMPATIBLE_PRESETS, HOSTED_PRESETS, createProviderModel, McpChatModel, RunGuard, localityOf } from '../src/llm/index.js';
import { checkNodeModelConfig, assertModelsPatchAllowed } from '../src/llm/config.js';
import { runToolAgent, agentsEnabled, AGENT_ACTIONS } from '../src/agents/index.js';
import { PolicyStore } from '../src/abac/policy.js';
import { AbacEngine } from '../src/abac/engine.js';
import { validateFlow } from '../src/flow.js';
import { startServer } from '../src/app.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const tmp = p => mkdtempSync(join(tmpdir(), `sgllm-${p}-`));
const INF_KEY = 'inf-test-GOODkey-0123456789', GW_KEY = 'gw-provider-secret-424242';
const ENV = { INFERENCE_API_KEY: INF_KEY, GW_KEY, FAKE_KEY: GOOD_KEY, FAKE_BAD: BAD_KEY, MOCK_KEY: GOOD_KEY, MOCK_BAD: BAD_KEY, BRIDGE_TOKEN: 'bridge-token-0123456789' };
const ECHO = { name: 'echo', description: 'Echo text.', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } };
const N = { type: 'object', properties: { n: { type: 'integer' } }, required: ['n'], additionalProperties: false };

// fetch spy: every URL any LangChain class or our code fetches in this process
const realFetch = globalThis.fetch, fetched = [];
globalThis.fetch = (input, init) => { fetched.push(String(input?.url || input)); return realFetch(input, init); };
const isLoop = u => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/)/.test(u);

/** A harness over a temp dir with the given extra models (admin save). Collects logs and events for leak checks. */
function harness(models = {}, extra = {}) {
  const dataDir = tmp('h'), logs = [], events = [];
  const h = createHarness({ dataDir, env: { ...ENV, ...(extra.env || {}) }, log: l => logs.push(l), emit: (t, d) => events.push({ t, d }), ...extra });
  const cfg = h.models(); Object.assign(cfg.models, models); if (extra.budgets) cfg.budgets = extra.budgets; h.saveModels(cfg, { isAdmin: true });
  return { h, dataDir, logs, events };
}
const fake = (transport, opts = {}, keyRef = 'env:FAKE_KEY') => ({ provider: 'fake', model: 'fake-1', keyRef, transport, options: { fake: opts } });
const closers = []; after(async () => { for (const c of closers.reverse()) await c(); });

// ------------------------------------------------------------------ L0
test('A0.1 license audit passes and includes the LangChain gate', () => {
  const r = spawnSync(process.execPath, [join(ROOT, 'tools/license-audit.mjs'), '--no-write'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout.slice(-2000));
  assert.match(r.stdout, /Not clearly permissive \(must be empty\): none/);
  for (const p of ['langchain', '@langchain/core', '@langchain/langgraph', '@langchain/langgraph-checkpoint', '@langchain/mcp-adapters', '@langchain/textsplitters']) assert.match(r.stdout, new RegExp(`  ${p.replace('/', '\\/')}: [\\d.]+ MIT`), p);
  assert.match(r.stdout, /Native addons \(binding\.gyp\): none/);
  assert.ok(!existsSync(join(ROOT, 'node_modules/@langchain/langgraph-api')), 'LangGraph Agent Server (ELv2) must not be installed');
});

test('A0.3 fresh install: models.json holds only the seeded local Ollama defaults (D2) and nothing is fetched', () => {
  const before = fetched.length, dataDir = tmp('fresh');
  const h = createHarness({ dataDir });
  const cfg = JSON.parse(readFileSync(join(dataDir, 'models.json'), 'utf8'));
  assert.deepEqual(cfg, defaultModels());
  assert.deepEqual(Object.keys(cfg.models).sort(), ['local-llama', 'nomic-embed']);
  for (const m of Object.values(cfg.models)) { assert.equal(m.provider, 'ollama'); assert.equal(m.baseURL, 'http://127.0.0.1:11434'); assert.equal(m.locality, 'local'); assert.ok(!('keyRef' in m)); }
  assert.deepEqual(cfg.defaults, { chat: 'local-llama', embed: 'nomic-embed' });
  assert.deepEqual(cfg.limits, { maxSteps: 50, maxToolCalls: 100, maxWallSeconds: 900 });
  assert.equal(agentsEnabled(cfg), false);
  assert.equal(fetched.slice(before).filter(u => !isLoop(u)).length, 0, 'no non-loopback call');
  assert.equal(fetched.length, before, 'no call at all on a fresh install');
  assert.deepEqual(validateModels(cfg), []);
  void h;
});

test('A0.4 ETL flows keep the DAG rule: a cycle is still rejected', () => {
  const flow = { steps: [{ id: 'a', type: 'file', config: { path: 'x.csv' } }, { id: 'b', type: 'map', config: { expr: '$' } }, { id: 'c', type: 'map', config: { expr: '$' } }, { id: 's', type: 'graph', config: { mapping: { nodes: [] } } }], links: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'b' }, { from: 'c', to: 's' }] };
  assert.ok(validateFlow(flow).includes('Flow has a cycle'));
});

test('L0 ABAC knows the agent actions; admins have them, analysts do not by default', async () => {
  const store = new PolicyStore(), engine = new AbacEngine(store);
  assert.deepEqual(AGENT_ACTIONS, ['agent.run', 'agent.approve', 'llm.invoke', 'models.admin']);
  for (const a of AGENT_ACTIONS) {
    assert.equal((await engine.decide({ subjectId: 'owner', action: a, entity: 'Project' })).allow, true, a);
    assert.equal((await engine.decide({ subjectId: 'analyst', action: a, entity: 'Project' })).allow, false, a);
  }
  assert.equal((await engine.decide({ subjectId: 'owner', action: 'agent.nope', entity: 'Project' })).allow, false);
});

// ------------------------------------------------------------------ L1 conformance (A1.1, A1.10, C12, C13)
async function conform(h, name, badName) {
  return runConformance({ label: name, meter: h.meter, probe: () => h.probe(name, { force: true }), getModel: ctx => h.getChatModel(name, { flowId: 'conf', nodeId: name, ...ctx }), getBadKeyModel: badName ? () => h.getChatModel(badName, { flowId: 'conf', nodeId: badName }) : undefined, badKey: BAD_KEY, getEmbeddings: () => h.getEmbeddings('fake-embed', { flowId: 'conf', nodeId: 'embed' }) });
}
const fails = r => Object.entries(r.results).filter(([, v]) => !v.pass).map(([k, v]) => `${k} ${JSON.stringify(v)}`).join('\n');
let strong;
test('A1.1 + A1.10 conformance C1–C13 passes for the fake model over MCP (inproc) and direct, and C12 parity holds', async () => {
  const { h, logs, events, dataDir } = harness({ 'fake-mcp': fake('inproc'), 'fake-direct': fake('direct'), 'bad-mcp': fake('inproc', {}, 'env:FAKE_BAD'), 'bad-direct': fake('direct', {}, 'env:FAKE_BAD'), 'fake-embed': { provider: 'fake', kind: 'embed', model: 'e', dims: 8, keyRef: 'env:FAKE_KEY' } });
  closers.push(() => h.close());
  const mcp = await conform(h, 'fake-mcp', 'bad-mcp'), direct = await conform(h, 'fake-direct', 'bad-direct');
  assert.ok(mcp.pass, fails(mcp)); assert.ok(direct.pass, fails(direct));
  const p = parity(mcp, direct); assert.ok(p.pass, p.diffs.join('; '));
  assert.equal(mcp.results.C3.mode, 'native'); assert.equal(mcp.flags.structuredOutput, 'native');
  for (const l of ['maxSteps', 'maxToolCalls', 'maxWallSeconds']) assert.equal(mcp.results.C13.runs[l].status, `stopped:${l}`);
  strong = { logs, events, dataDir, out: JSON.stringify([mcp, direct]) };
});

test('A1.1 conformance also passes over a stdio Model Bridge child process (keys live in the child)', async () => {
  const { h } = harness({ 'fake-stdio': { ...fake('stdio'), command: [process.execPath, join(ROOT, 'test/fixtures/fake-model-bridge.mjs'), '--data', '__DATA__'] }, 'fake-embed': { provider: 'fake', kind: 'embed', model: 'e', dims: 8, keyRef: 'env:FAKE_KEY' } });
  closers.push(() => h.close());
  const cfg = h.models(); cfg.models['fake-stdio'].command[3] = h.dataDir; h.saveModels(cfg, { isAdmin: true });
  const r = await conform(h, 'fake-stdio');
  assert.ok(r.pass, fails(r));
});

test('A1.3 weak model (no tool calling, no structured output): prompt-based tools and JSON fallback, on both transports', async () => {
  const weak = { toolCalling: false, structuredOutput: 'none', vision: false, usage: false, streaming: false };
  const { h } = harness({ 'weak-mcp': fake('inproc', weak), 'weak-direct': fake('direct', weak), 'fake-embed': { provider: 'fake', kind: 'embed', model: 'e', dims: 8, keyRef: 'env:FAKE_KEY' } });
  closers.push(() => h.close());
  for (const name of ['weak-mcp', 'weak-direct']) {
    const flags = await h.probe(name, { force: true });
    assert.equal(flags.toolCalling, false, `${name} probe toolCalling`); assert.equal(flags.structuredOutput, 'prompt', `${name} probe structuredOutput`);
    assert.equal(flags.vision, false); assert.equal(flags.usageReported, false);
    const guard = new RunGuard({ maxSteps: 6, maxToolCalls: 3, maxWallSeconds: 30 });
    let called = null;
    const r = await runToolAgent({ model: await h.getChatModel(name, { flowId: 'weak', nodeId: 'agent', guard }), guard, input: 'Use echo to say hi.', tools: [{ ...ECHO, invoke: async a => { called = a; return 'ok'; } }] });
    assert.equal(r.status, 'completed', name); assert.ok(called, `${name} tool ran through prompt-based tools`);
    assert.equal(r.messages.find(m => m.tool_calls?.length).response_metadata.toolMode, 'prompt');
    const s = await (await h.getChatModel(name, { flowId: 'weak', nodeId: 'json' })).withStructuredOutput(N).invoke('n = 2');
    assert.deepEqual(s, { n: 2 }, `${name} JSON prompt fallback validates`);
  }
  const mcp = await conform(h, 'weak-mcp'), direct = await conform(h, 'weak-direct');
  assert.ok(mcp.pass, fails(mcp)); assert.ok(direct.pass, fails(direct));
  assert.ok(parity(mcp, direct).pass);
  assert.ok(mcp.results.C11.pass, 'probe flags match what the weak model really does');
});

// ------------------------------------------------------------------ keys (A1.4, A1.6)
test('A1.4 literal keys in config are rejected; node configs cannot set keyRef/baseURL', () => {
  const base = defaultModels();
  const bad1 = { ...base, models: { ...base.models, x: { provider: 'openai', model: 'm', keyRef: GOOD_KEY } } };
  const bad2 = { ...base, models: { ...base.models, x: { provider: 'openai', model: 'm', options: { apiKey: 'anything' } } } };
  const bad3 = { ...base, models: { ...base.models, x: { provider: 'openai_compatible', baseURL: 'http://127.0.0.1:1/v1', model: 'm', options: { headers: { 'x-extra': GOOD_KEY } } } } };
  for (const b of [bad1, bad2, bad3]) assert.ok(validateModels(b).some(e => /literal keys/.test(e)), JSON.stringify(validateModels(b)));
  const { h } = harness();
  assert.throws(() => h.saveModels(bad1, { isAdmin: true }), e => e.status === 400 && !e.message.includes(GOOD_KEY));
  assert.throws(() => checkNodeModelConfig({ name: 'x', keyRef: 'env:A' }), e => e.status === 403);
  assert.throws(() => checkNodeModelConfig({ name: 'x', baseURL: 'http://evil' }), e => e.status === 403);
  checkNodeModelConfig({ name: 'x', options: { temperature: 0.1 } });
});

test('A1.4 + A1.10 a key never appears in logs, events (SSE/Kafka), state, checkpoints, probe or conformance files (MCP and direct)', async () => {
  assert.ok(strong, 'conformance run first');
  const { h, logs, events, dataDir } = harness({ 'k-mcp': fake('inproc'), 'k-direct': fake('direct'), 'kb-mcp': fake('inproc', {}, 'env:FAKE_BAD'), 'kb-direct': fake('direct', {}, 'env:FAKE_BAD') });
  closers.push(() => h.close());
  const outputs = [];
  for (const t of ['mcp', 'direct']) {
    const guard = new RunGuard({ maxSteps: 4, maxToolCalls: 2, maxWallSeconds: 30 });
    const m = await h.getChatModel(`k-${t}`, { flowId: 'leak', nodeId: t, guard });
    const r = await runToolAgent({ model: m, guard, input: 'Use echo.', tools: [{ ...ECHO, invoke: async () => 'ok' }] });
    outputs.push(JSON.stringify(r.messages), JSON.stringify(await r.graph.getState({ configurable: { thread_id: r.threadId } })), JSON.stringify(m), JSON.stringify(Object.entries(m)));
    for (const [k, v] of Object.entries(r.graph.checkpointer?.storage || {})) outputs.push(k, Buffer.from(JSON.stringify(v)).toString());
    try { await (await h.getChatModel(`kb-${t}`, { flowId: 'leak', nodeId: `bad-${t}` })).invoke('hi'); } catch (e) { outputs.push(e.message, JSON.stringify(e), String(e.stack)); }
    await h.probe(`kb-${t}`, { force: true });
  }
  const files = [];
  const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(readFileSync(p, 'utf8')); } };
  walk(dataDir); walk(strong.dataDir);
  const all = [...logs, ...strong.logs, JSON.stringify(events), JSON.stringify(strong.events), strong.out, ...outputs, ...files].join('\n');
  assert.ok(logs.length > 0 && events.length > 0, 'something was logged and emitted');
  assert.equal(all.split(GOOD_KEY).length - 1, 0, 'good key hits');
  assert.equal(all.split(BAD_KEY).length - 1, 0, 'bad key hits');
});

test('A1.6 a bad key returns auth_error without the key (OpenAI-compatible mock over MCP and direct, and the fake)', async () => {
  const oa = await mockOpenAI({ key: GOOD_KEY }); closers.push(oa.close);
  const { h, logs } = harness({ 'oa-mcp': { provider: 'openai_compatible', model: 'mock-model', baseURL: oa.url, keyRef: 'env:MOCK_BAD', transport: 'inproc', options: { maxRetries: 0 } }, 'oa-direct': { provider: 'openai_compatible', model: 'mock-model', baseURL: oa.url, keyRef: 'env:MOCK_BAD', transport: 'direct', options: { maxRetries: 0 } }, 'fk-mcp': fake('inproc', {}, 'env:FAKE_BAD') });
  closers.push(() => h.close());
  for (const n of ['oa-mcp', 'oa-direct', 'fk-mcp']) {
    await assert.rejects((async () => (await h.getChatModel(n, { flowId: 'auth', nodeId: n })).invoke('hi'))(), e => {
      assert.equal(e.code, 'auth_error', `${n}: ${e.message}`);
      assert.ok(!`${e.message}${JSON.stringify(e)}`.includes(BAD_KEY), `${n} leaked the key: ${e.message}`);
      return true;
    });
  }
  assert.ok(oa.hits.length >= 2, 'the mock was really called');
  assert.ok(!logs.join('\n').includes(BAD_KEY));
});

test('A1.4 the Model Bridge itself never returns or logs a key (raw MCP client, errors and probe)', async () => {
  const { createModelBridge } = await import('../src/llm/bridge.js');
  const logs = [], cfg = { models: { bad: fake('inproc', {}, 'env:FAKE_BAD'), good: fake('inproc') } };
  const server = createModelBridge({ models: () => cfg, env: ENV, log: l => logs.push(l) });
  const [a, b] = InMemoryTransport.createLinkedPair(); await server.connect(a);
  const client = new Client({ name: 't', version: '1' }); await client.connect(b); closers.push(() => client.close());
  const raw = [];
  for (const [name, args] of [['chat_invoke', { model: 'bad', messages: [{ type: 'human', data: { content: 'hi' } }] }], ['chat_stream', { model: 'bad', messages: [{ type: 'human', data: { content: 'hi' } }] }], ['embed', { model: 'bad', texts: ['a'] }], ['model_probe', { model: 'bad' }], ['model_list', {}]]) {
    const r = await client.callTool({ name, arguments: args }); raw.push(JSON.stringify(r));
    if (name !== 'model_list' && name !== 'model_probe') assert.equal(r.isError, true, name);
  }
  assert.match(raw[0], /auth_error/);
  const probe = JSON.parse(raw[3]); assert.equal(probe.structuredContent.flags.reachable, false); assert.equal(probe.structuredContent.flags.error, 'auth_error');
  const all = raw.join('\n') + logs.join('\n');
  assert.equal(all.split(BAD_KEY).length - 1, 0, 'bridge output leaked the bad key');
  assert.equal(all.split(GOOD_KEY).length - 1, 0, 'bridge output leaked the good key');
});

test('A1.6 a missing env key is auth_error naming the variable, never a value', async () => {
  const { h } = harness({ nokey: { ...fake('inproc'), keyRef: 'env:NOT_SET_ANYWHERE' } }); closers.push(() => h.close());
  await assert.rejects((async () => (await h.getChatModel('nokey')).invoke('hi'))(), e => e.code === 'auth_error' && /NOT_SET_ANYWHERE/.test(e.message));
});

// ------------------------------------------------------------------ registry (A1.7)
test('A1.7 every registry entry constructs the right LangChain class with the right options (no network)', async () => {
  const cases = [
    ['openai', { model: 'gpt-x' }, 'ChatOpenAI', m => m.model === 'gpt-x' && m.apiKey === 'test-key'],
    ['anthropic', { model: 'claude-x' }, 'ChatAnthropic', m => m.model === 'claude-x'],
    ['google-genai', { model: 'gemini-x' }, 'ChatGoogleGenerativeAI', m => m.model === 'gemini-x'],
    ['google', { model: 'gemini-y' }, 'ChatGoogleGenerativeAI', m => m.model === 'gemini-y'],
    ['xai', { model: 'grok-x' }, 'ChatXAI', m => m.model === 'grok-x'],
    ['azure_openai', { model: 'dep', options: { azureOpenAIApiInstanceName: 'inst', azureOpenAIApiVersion: '2024-10-21' } }, 'AzureChatOpenAI', m => m.azureOpenAIApiDeploymentName === 'dep' && m.azureOpenAIApiInstanceName === 'inst'],
    ['bedrock', { model: 'nova-x', options: { region: 'us-east-1' } }, 'ChatBedrockConverse', m => m.model === 'nova-x' && m.region === 'us-east-1', JSON.stringify({ accessKeyId: 'AK', secretAccessKey: 'SK' })],
    ['mistralai', { model: 'mistral-x' }, 'ChatMistralAI', m => m.model === 'mistral-x'],
    ['groq', { model: 'llama-x' }, 'ChatGroq', m => m.model === 'llama-x'],
    ['ollama', { model: 'llama3.1:8b', baseURL: 'http://127.0.0.1:11434' }, 'ChatOllama', m => m.model === 'llama3.1:8b' && m.baseUrl === 'http://127.0.0.1:11434', null],
  ];
  for (const [provider, e, cls, ok, key = 'test-key'] of cases) {
    const m = await createProviderModel({ provider, ...e }, { apiKey: key ?? undefined });
    assert.equal(m.constructor.name, cls, provider); assert.ok(ok(m), `${provider} options`);
  }
  for (const [preset, url] of Object.entries(OPENAI_COMPATIBLE_PRESETS)) {
    const m = await createProviderModel({ provider: 'openai_compatible', model: 'local', preset }, {});
    assert.equal(m.constructor.name, 'ChatOpenAI'); assert.equal(m.clientConfig.baseURL, url, preset);
  }
  assert.equal(Object.keys(OPENAI_COMPATIBLE_PRESETS).length, 5);
  const emb = await createProviderModel({ provider: 'ollama', kind: 'embed', model: 'nomic-embed-text', baseURL: 'http://127.0.0.1:11434' }, {});
  assert.equal(emb.constructor.name, 'OllamaEmbeddings');
  assert.equal(localityOf({ provider: 'openai_compatible', preset: 'openrouter', baseURL: 'https://openrouter.ai/api/v1' }), 'remote');
  assert.equal(localityOf({ provider: 'openai_compatible', baseURL: 'http://10.0.0.5:8000/v1' }), 'remote', 'LAN is remote unless an admin marks it local (NQ1, fail closed)');
  assert.equal(localityOf({ provider: 'openai_compatible', baseURL: 'http://10.0.0.5:8000/v1', locality: 'local' }), 'local');
  assert.equal(localityOf({ provider: 'anthropic', locality: 'local' }), 'remote', 'cloud providers are always remote');
});

test('A1.7 OpenAI-compatible and Ollama talk HTTP correctly (mock servers), over MCP and direct, incl. embeddings', async () => {
  const oa = await mockOpenAI({ key: GOOD_KEY }), ol = await mockOllama(); closers.push(oa.close, ol.close);
  const { h } = harness({
    'oa-mcp': { provider: 'openai_compatible', model: 'mock-model', baseURL: oa.url, keyRef: 'env:MOCK_KEY', transport: 'inproc' },
    'oa-direct': { provider: 'openai_compatible', model: 'mock-model', baseURL: oa.url, keyRef: 'env:MOCK_KEY', transport: 'direct' },
    'ol-mcp': { provider: 'ollama', model: 'llama3.1:8b', baseURL: ol.url, transport: 'inproc' },
    'ol-direct': { provider: 'ollama', model: 'llama3.1:8b', baseURL: ol.url, transport: 'direct' },
    'oa-embed': { provider: 'openai_compatible', kind: 'embed', model: 'mock-embed', baseURL: oa.url, keyRef: 'env:MOCK_KEY', transport: 'direct' },
    'ol-embed': { provider: 'ollama', kind: 'embed', model: 'nomic-embed-text', baseURL: ol.url, transport: 'inproc' },
  }); closers.push(() => h.close());
  for (const n of ['oa-mcp', 'oa-direct']) { const r = await (await h.getChatModel(n)).invoke('hi'); assert.equal(r.content, 'mock: hi', n); assert.equal(r.usage_metadata.total_tokens, 8, n); }
  for (const n of ['oa-mcp', 'oa-direct']) { const r = await (await h.getChatModel(n)).bindTools([ECHO]).invoke('use echo'); assert.equal(r.tool_calls[0].name, 'echo', n); }
  for (const n of ['ol-mcp', 'ol-direct']) { const r = await (await h.getChatModel(n)).invoke('hi'); assert.equal(r.content, 'ollama: hi', n); }
  assert.deepEqual((await (await h.getEmbeddings('oa-embed')).embedDocuments(['a']))[0], [0.1, 0.2, 0.3, 0.4]);
  assert.deepEqual((await (await h.getEmbeddings('ol-embed')).embedDocuments(['a']))[0], [0.5, 0.25, 0.125]);
  assert.ok(oa.hits.includes('POST /v1/chat/completions') && ol.hits.includes('POST /api/chat'));
});

// ------------------------------------------------------------------ transports: HTTP bridge, vendor MCP, sampling (A1.8)
test('HTTP Model Bridge with a bearer token (remote bridge, provider "mcp"); a wrong token is refused', async () => {
  const bridgeDir = tmp('bridge');
  const hb = createHarness({ dataDir: bridgeDir, env: ENV }); const c = hb.models(); c.models.claude = fake('inproc'); hb.saveModels(c, { isAdmin: true });
  const { startModelBridge } = await import('../explore/server/model-bridge.js');
  process.env.SG_TEST_BRIDGE_TOKEN = ENV.BRIDGE_TOKEN; process.env.FAKE_KEY = GOOD_KEY;
  const srv = await startModelBridge(['--data', bridgeDir, '--http', '0', '--token-env', 'SG_TEST_BRIDGE_TOKEN'], { stdio: false });
  closers.push(() => new Promise(r => srv.close(r)), () => { delete process.env.FAKE_KEY; });
  const url = `http://127.0.0.1:${srv.address().port}/mcp`;
  const { h } = harness({ 'remote-bridge': { provider: 'mcp', url, keyRef: 'env:BRIDGE_TOKEN', remoteModel: 'claude' }, 'bad-bridge': { provider: 'mcp', url, keyRef: 'env:FAKE_BAD', remoteModel: 'claude' } }); closers.push(() => h.close());
  const m = await h.getChatModel('remote-bridge');
  assert.equal(m.transport, 'http'); assert.equal(m.locality, 'local', 'loopback bridge');
  assert.equal((await m.invoke('hello')).content, 'echo: hello');
  assert.equal((await m.bindTools([ECHO]).invoke('hi')).tool_calls[0].name, 'echo');
  await assert.rejects((async () => (await h.getChatModel('bad-bridge')).invoke('x'))(), e => !String(e.message).includes(BAD_KEY));
});

test('vendor model MCP server mapped with an adapter config (invokeTool/argsMap/resultPath); tools fall back to prompt mode', async () => {
  const vendor = new McpServer({ name: 'vendor-llm', version: '1' });
  vendor.registerTool('generate', { inputSchema: { prompt: z.string(), model: z.string() } }, async ({ prompt, model }) => {
    const sys = /TOOLS \(prompt-based/.test(prompt) ? (/Tool result for/.test(prompt) ? JSON.stringify({ final: 'done' }) : JSON.stringify({ action: 'echo', args: { text: 'hi' } })) : `${model} says: ${prompt.split('\n').at(-1)}`;
    return { content: [{ type: 'text', text: JSON.stringify({ output: { text: sys } }) }] };
  });
  const [a, b] = InMemoryTransport.createLinkedPair(); await vendor.connect(a);
  const client = new Client({ name: 't', version: '1' }); await client.connect(b); closers.push(() => client.close());
  const m = new McpChatModel({ client, model: 'vendor-x', adapter: { invokeTool: 'generate', argsMap: { prompt: '$prompt', model: '$model' }, resultPath: '/output/text' } });
  assert.equal((await m.invoke('hello')).content, 'vendor-x says: human: hello');
  assert.throws(() => m.bindTools([ECHO]), /does not support native tool calling/);
  const { invokeWithTools } = await import('../src/llm/fallbacks.js');
  const r = await invokeWithTools(m, [new (await import('@langchain/core/messages')).HumanMessage('use echo')], [ECHO]);
  assert.equal(r.tool_calls[0].name, 'echo'); assert.equal(r.response_metadata.toolMode, 'prompt');
});

async function samplingHost(withSampling) {
  const server = new McpServer({ name: 'streamgraph', version: '1' });
  const client = new Client({ name: 'host', version: '1' }, { capabilities: withSampling ? { sampling: {} } : {} });
  if (withSampling) client.setRequestHandler(CreateMessageRequestSchema, async req => ({ model: 'host-model', role: 'assistant', content: { type: 'text', text: `host says: ${req.params.messages.at(-1).content.text}` }, stopReason: 'endTurn' }));
  const [a, b] = InMemoryTransport.createLinkedPair(); await server.connect(a); await client.connect(b);
  closers.push(() => client.close());
  return server.server;
}
test('A1.8 MCP sampling: a host with createMessage is probed as supported and answers; a host without it is "unsupported" cleanly', async () => {
  const good = await samplingHost(true), none = await samplingHost(false);
  const { h } = harness({ 'host-model': { provider: 'mcp_sampling', hints: { intelligencePriority: 0.8 } } }, { samplingServer: good }); closers.push(() => h.close());
  const flags = await h.probe('host-model', { force: true });
  assert.equal(flags.sampling, 'supported'); assert.equal(flags.reachable, true);
  const m = await h.getChatModel('host-model', { flowId: 'f', nodeId: 'n' });
  assert.equal(m.locality, 'remote', 'sampling is always remote (D5)');
  assert.equal((await m.invoke('hello')).content, 'host says: hello');
  assert.equal(h.meter.records.at(-1).billedByHost, true);
  h.setSamplingServer(none);
  const f2 = await h.probe('host-model', { force: true });
  assert.equal(f2.sampling, 'unsupported'); assert.equal(f2.reachable, false);
  await assert.rejects((async () => (await h.getChatModel('host-model')).invoke('x'))(), e => e.code === 'unsupported');
});

// ------------------------------------------------------------------ budgets (A1.9), locality (A1.11), limits (A1.12), default (A1.13)
test('A1.9 a budget overrun emits budget.exceeded and the run completes', async () => {
  const { h, events, dataDir } = harness({ paid: fake('inproc') }, { budgets: { perFlowUSD: 0.000001 } }); closers.push(() => h.close());
  const prices = h.prices(); prices.prices['fake/*'] = { inputPer1M: 100, outputPer1M: 100, currency: 'USD', source: 'test', asOf: '2026-11-21' }; h.savePrices(prices);
  const guard = new RunGuard({ maxSteps: 6, maxToolCalls: 3, maxWallSeconds: 30 });
  const r = await runToolAgent({ model: await h.getChatModel('paid', { flowId: 'budget', nodeId: 'a', guard }), guard, input: 'Use echo.', tools: [{ ...ECHO, invoke: async () => 'ok' }] });
  assert.equal(r.status, 'completed');
  const ex = events.filter(e => e.t === 'budget.exceeded');
  assert.equal(ex.length, 1, 'warned once'); assert.equal(ex[0].d.scope, 'flow');
  assert.ok(h.meter.totals('budget').flowUSD > 0.000001);
  assert.ok(existsSync(join(dataDir, 'model-prices.json')));
});

test('A1.11 locality gate (D5): remote needs export, local needs only read; nothing is sent on refusal (MCP and direct)', async () => {
  const oa = await mockOpenAI({ key: GOOD_KEY }); closers.push(oa.close);
  const store = new PolicyStore(), engine = new AbacEngine(store);
  store.putUser({ id: 'reader', name: 'Reader', role: 'reader', clearance: 1 });
  store.putRule({ id: 'readers-read', name: 'Readers read', effect: 'allow', subjects: { roles: ['reader'] }, actions: ['read', 'query'], resources: { entities: ['*'] }, enabled: true });
  store.setEntity('Customer', { tags: [], classification: 0 });
  const remote = t => ({ provider: 'openai_compatible', model: 'mock-model', baseURL: oa.url, keyRef: 'env:MOCK_KEY', transport: t, locality: 'remote', options: { maxRetries: 0 } });
  const { h } = harness({ 'r-mcp': remote('inproc'), 'r-direct': remote('direct'), 'l-mcp': { ...remote('inproc'), locality: 'local' }, 'l-direct': { ...remote('direct'), locality: 'local' } }, { engine }); closers.push(() => h.close());
  for (const t of ['mcp', 'direct']) {
    const hits = oa.hits.length, f0 = fetched.length;
    await assert.rejects((async () => (await h.getChatModel(`r-${t}`, { subject: 'reader', contextTypes: ['Customer'] })).invoke('summarise these customers'))(),
      e => e.code === 'export_denied' && /remote; you need export rights on Customer/.test(e.message));
    assert.equal(oa.hits.length, hits, `${t}: nothing sent on refusal`); assert.equal(fetched.length, f0, `${t}: no fetch on refusal`);
    assert.equal((await (await h.getChatModel(`l-${t}`, { subject: 'reader', contextTypes: ['Customer'] })).invoke('summarise')).content, 'mock: summarise', `${t}: local with read only`);
    assert.equal((await (await h.getChatModel(`r-${t}`, { subject: 'analyst', contextTypes: ['Customer'] })).invoke('summarise')).content, 'mock: summarise', `${t}: analyst has export`);
    await assert.rejects((async () => (await h.getChatModel(`r-${t}`, { subject: 'reader' })).withContextTypes(['Customer']).invoke('x'))(), e => e.code === 'export_denied');
    await assert.rejects((async () => (await h.getChatModel(`l-${t}`, { subject: 'reader', contextTypes: ['Secret'] })).invoke('x'))(), e => e.code === 'export_denied' && /read rights on Secret/.test(e.message), 'unknown type: fail closed');
  }
});

test('A1.12 hard stops (D3): flows may lower the limits; non-admins cannot raise them; stops keep the checkpoint', async () => {
  assert.deepEqual(effectiveLimits({ maxSteps: 50, maxToolCalls: 100, maxWallSeconds: 900 }, { maxSteps: 5 }), { maxSteps: 5, maxToolCalls: 100, maxWallSeconds: 900 });
  assert.throws(() => effectiveLimits({ maxSteps: 50, maxToolCalls: 100, maxWallSeconds: 900 }, { maxSteps: 500 }), e => e.status === 403);
  assert.equal(effectiveLimits({ maxSteps: 50, maxToolCalls: 100, maxWallSeconds: 900 }, { maxSteps: 500 }, { isAdmin: true }).maxSteps, 500);
  const { h } = harness({ loop: fake('direct') }); closers.push(() => h.close());
  assert.throws(() => h.runGuard({ maxToolCalls: 1000 }), e => e.status === 403);
  const cfg = h.models(); cfg.limits.maxSteps = 99;
  assert.throws(() => h.saveModels(cfg, { isAdmin: false }), e => e.status === 403, 'non-admin cannot raise workspace limits');
  const guard = h.runGuard({ maxSteps: 2 });
  const r = await runToolAgent({ model: await h.getChatModel('loop', { guard, flowId: 'l', nodeId: 'a' }), guard, input: '[loop] go', tools: [{ ...ECHO, invoke: async () => 'again' }] });
  assert.equal(r.status, 'stopped:maxSteps'); assert.ok(r.checkpoint, 'checkpoint kept'); assert.ok(r.messages.length >= 3);
});

test('A1.13 default model (D2): no model set -> local-llama on Ollama; Ollama absent -> "default model unreachable" and nothing else is tried', async () => {
  const ol = await mockOllama(), oa = await mockOpenAI({ key: GOOD_KEY }); closers.push(ol.close, oa.close);
  const up = harness({ other: { provider: 'openai_compatible', model: 'mock-model', baseURL: oa.url, keyRef: 'env:MOCK_KEY', allowDirectFallback: true } }, { ollamaURL: ol.url }); closers.push(() => up.h.close());
  const m = await up.h.getChatModel(undefined, { flowId: 'f', nodeId: 'llm1', node: { type: 'llm' } });
  assert.equal(m.modelName, 'local-llama'); assert.equal(m.locality, 'local');
  assert.equal((await m.invoke('hi')).content, 'ollama: hi');
  // Ollama absent: a closed loopback port
  const dead = (await import('node:net')).createServer(); await new Promise(r => dead.listen(0, '127.0.0.1', r)); const port = dead.address().port; await new Promise(r => dead.close(r));
  const down = harness({ other: { provider: 'openai_compatible', model: 'mock-model', baseURL: oa.url, keyRef: 'env:MOCK_KEY' } }, { ollamaURL: `http://127.0.0.1:${port}` }); closers.push(() => down.h.close());
  const hits = oa.hits.length, f0 = fetched.length;
  await assert.rejects((async () => (await down.h.getChatModel(undefined, { flowId: 'f', nodeId: 'llm1', node: {} })).invoke('hi'))(), e => /default model unreachable/.test(e.message) && e.code === 'unreachable');
  assert.equal(oa.hits.length, hits, 'no other provider was tried');
  assert.ok(fetched.slice(f0).every(u => u.startsWith(`http://127.0.0.1:${port}`)), `only the Ollama address was contacted: ${fetched.slice(f0)}`);
});

test('model precedence: node config.model > flow models.default > workspace defaults.chat; embeddings need an embed model', async () => {
  const { h } = harness({ a: fake('direct'), b: fake('direct'), e: { provider: 'fake', kind: 'embed', model: 'e', keyRef: 'env:FAKE_KEY' } }); closers.push(() => h.close());
  assert.equal((await h.getChatModel(undefined, { node: { model: 'a' }, flow: { models: { default: 'b' } } })).modelName, 'a');
  assert.equal((await h.getChatModel(undefined, { node: {}, flow: { models: { default: 'b' } } })).modelName, 'b');
  assert.equal((await h.getChatModel(undefined, { node: {} })).modelName, 'local-llama');
  assert.equal((await h.getChatModel(undefined, { node: { model: { name: 'a', options: { temperature: 0.3 } } } })).modelName, 'a');
  await assert.rejects(() => h.getChatModel(undefined, { node: { model: { name: 'a', keyRef: 'env:X' } } }), e => e.status === 403);
  await assert.rejects(() => h.getEmbeddings('a'), /is a chat model/);
  await assert.rejects(() => h.getChatModel('e'), /embedding model/);
});

// ------------------------------------------------------------------ actors (starter PR #2 rules)
test('actors: agents are stamped grokbot/<flow>/<node> and can never act as human:', async () => {
  const { h } = harness({ a: fake('direct') }); closers.push(() => h.close());
  const m = await h.getChatModel('a', { flowId: 'flow1', nodeId: 'node1' });
  assert.equal(m.actor, 'grokbot/flow1/node1');
  await m.invoke('hi'); assert.equal(h.meter.records.at(-1).actor, 'grokbot/flow1/node1');
  for (const actor of ['human:whsutherland', ' Human:someone']) await assert.rejects(() => h.getChatModel('a', { actor }), e => e.status === 403 && /human:/.test(e.message));
});

// ------------------------------------------------------------------ studio API (A1.5)
test('A1.5 Models API: admins can edit; a non-admin cannot change baseURL or keyRef (403); literal keys are refused', async () => {
  const dir = tmp('api');
  const S = await startServer({ port: 0, dataDir: join(dir, 'data'), log: null }); closers.push(() => S.close());
  const base = `http://127.0.0.1:${S.app.port}`;
  const get = async () => (await fetch(`${base}/api/studio/models`)).json();
  const post = (b, p = '/api/studio/models') => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  const cur = (await get()).registry;
  assert.deepEqual(Object.keys(cur.models).sort(), ['local-llama', 'nomic-embed']);
  const next = structuredClone(cur); next.models['vllm-box'] = { provider: 'openai_compatible', model: 'q', baseURL: 'http://10.0.0.5:8000/v1', keyRef: 'env:VLLM_KEY' };
  assert.equal((await post(next)).status, 200);
  const lit = structuredClone(next); lit.models['vllm-box'].keyRef = GOOD_KEY;
  const r400 = await post(lit); assert.equal(r400.status, 400); assert.ok(!(await r400.text()).includes(GOOD_KEY));
  S.studio.policy.setSettings({ activeUser: 'analyst' });
  const evil = structuredClone(next); evil.models['vllm-box'].baseURL = 'https://attacker.example/v1';
  assert.equal((await post(evil)).status, 403);
  const evil2 = structuredClone(next); evil2.models['vllm-box'].keyRef = 'env:OTHER';
  assert.equal((await post(evil2)).status, 403);
  assert.equal((await fetch(`${base}/api/studio/models`)).status, 403, 'the registry is admin-only');
  S.studio.policy.setSettings({ activeUser: 'owner' });
  assert.equal((await get()).registry.models['vllm-box'].baseURL, 'http://10.0.0.5:8000/v1');
  assert.throws(() => assertModelsPatchAllowed(cur, evil, false), e => e.status === 403);
});

// ------------------------------------------------------------------ hosted aggregators: openai-compatible-hosted
test('hosted presets: Inference.net (+ US region, Anthropic format) and unverified OpenRouter/Together/Fireworks/DeepInfra/Groq; always remote', async () => {
  assert.deepEqual(Object.keys(HOSTED_PRESETS).sort(), ['deepinfra', 'fireworks', 'groq', 'inference', 'openrouter', 'together']);
  assert.equal(HOSTED_PRESETS.inference.verified, true);
  for (const p of ['openrouter', 'together', 'fireworks', 'deepinfra', 'groq']) assert.equal(HOSTED_PRESETS[p].verified, false, `${p} is a preset only`);
  for (const [preset, p] of Object.entries(HOSTED_PRESETS)) {
    const m = await createProviderModel({ provider: 'openai-compatible-hosted', preset, model: 'x' }, { apiKey: 'k' });
    assert.equal(m.constructor.name, 'ChatOpenAI'); assert.equal(m.clientConfig.baseURL, p.baseURL, preset);
  }
  assert.equal(HOSTED_PRESETS.inference.baseURL, 'https://api.inference.net/v1');
  const us = await createProviderModel({ provider: 'openai-compatible-hosted', preset: 'inference', region: 'us', model: 'x' }, { apiKey: 'k' });
  assert.equal(us.clientConfig.baseURL, 'https://us.api.inference.net/v1');
  const an = await createProviderModel({ provider: 'openai-compatible-hosted', preset: 'inference', format: 'anthropic', model: 'claude-haiku-4-5' }, { apiKey: 'k' });
  assert.equal(an.constructor.name, 'ChatAnthropic'); assert.equal(an.apiUrl, 'https://api.inference.net');
  const base = defaultModels();
  const v = m => validateModels({ ...base, models: { ...base.models, h: m } });
  assert.deepEqual(v({ provider: 'openai-compatible-hosted', preset: 'inference', region: 'us', model: 'x', keyRef: 'env:INFERENCE_API_KEY' }), []);
  assert.ok(v({ provider: 'openai-compatible-hosted', preset: 'inference', region: 'eu', model: 'x' }).some(e => /no region "eu"/.test(e)));
  assert.ok(v({ provider: 'openai-compatible-hosted', preset: 'nope', model: 'x' }).some(e => /known preset/.test(e)));
  assert.ok(v({ provider: 'openai-compatible-hosted', preset: 'together', format: 'anthropic', model: 'x' }).some(e => /Anthropic Messages/.test(e)));
  assert.ok(v({ provider: 'openai-compatible-hosted', preset: 'inference', model: 'x', locality: 'local' }).some(e => /always remote/.test(e)));
  assert.ok(v({ provider: 'openai-compatible-hosted', preset: 'inference', model: 'x', headerRefs: { 'x-inference-provider-key': GW_KEY } }).some(e => /headerRefs/.test(e)));
  assert.ok(v({ provider: 'openai-compatible-hosted', preset: 'inference', model: 'x', headers: { authorization: 'Bearer abc' } }).some(e => /literal keys/.test(e)));
  assert.equal(localityOf({ provider: 'openai-compatible-hosted', baseURL: 'http://127.0.0.1:9/v1' }), 'remote', 'any hosted API is remote, even through a local tunnel');
});

async function inferenceHarness(extra = {}) {
  const inf = await mockInference({ key: INF_KEY }); closers.push(inf.close);
  const H = harness({}, extra); closers.push(() => H.h.close());
  return { inf, ...H };
}
test('hosted catalog importer: Inference.net /v1/models -> registry (limits, vision, approval) + price table (USD/token -> per 1M); admin only; no key sent', async () => {
  const { inf, h, dataDir } = await inferenceHarness();
  await assert.rejects(() => h.importCatalog('inference', { baseURL: inf.url }), e => e.status === 403);
  const r = await h.importCatalog('inference', { baseURL: inf.url, isAdmin: true });
  assert.equal(r.imported.length, INFERENCE_CATALOG.length); assert.equal(r.prices, INFERENCE_CATALOG.length);
  assert.deepEqual(r.needsApproval, ['inference/claude-private-preview']);
  const cat = inf.headers[inf.hits.indexOf('GET /v1/models')];
  assert.equal(cat.authorization, undefined, 'Inference.net lists models without a key, so none is sent');
  const reg = h.models().models;
  const llama = reg['inference/meta-llama/llama-3.1-8b-instruct'];
  assert.equal(llama.provider, 'openai-compatible-hosted'); assert.equal(llama.preset, 'inference'); assert.equal(llama.keyRef, 'env:INFERENCE_API_KEY');
  assert.equal(llama.capabilities.maxInputTokens, 131072); assert.equal(llama.capabilities.maxOutputTokens, 16384);
  assert.equal(llama.capabilities.toolCalling, null, 'the catalog does not report tools: left to the probe');
  assert.equal(reg['inference/qwen-vl-max'].capabilities.vision, true); assert.deepEqual(reg['inference/qwen-vl-max'].capabilities.reasoningEfforts, ['none', 'low', 'high']);
  assert.equal(reg['inference/llama-3.2-1b-instruct'].capabilities.vision, false);
  assert.equal(reg['inference/claude-private-preview'].capabilities.requiresApprovedAccess, true);
  const prices = JSON.parse(readFileSync(join(dataDir, 'model-prices.json'), 'utf8')).prices;
  const p = prices['openai-compatible-hosted:inference/meta-llama/llama-3.1-8b-instruct'];
  assert.equal(p.inputPer1M, 0.025); assert.equal(p.outputPer1M, 0.06); assert.equal(p.source, `${inf.url}/models`);
  assert.equal(prices['openai-compatible-hosted:inference/inference-net/schematron-v2-small'].cachedInputPer1M, 0.05);
  assert.equal(localityOf(llama), 'remote');
  const m = await h.getChatModel('inference/meta-llama/llama-3.1-8b-instruct', { flowId: 'inf', nodeId: 'a' });
  assert.equal((await m.invoke('hi')).content, 'inference: hi');
  const rec = h.meter.records.at(-1); assert.ok(Math.abs(rec.cost - (10 * 0.025 + 4 * 0.06) / 1e6) < 1e-12, 'cost uses the imported price');
});

test('hosted: the probe decides tool support (catalog has none); a no-tools model still runs a tool agent via prompt-based tools', async () => {
  const { inf, h } = await inferenceHarness();
  await h.importCatalog('inference', { baseURL: inf.url, isAdmin: true });
  assert.equal((await h.probe('inference/meta-llama/llama-3.1-8b-instruct', { force: true })).toolCalling, true);
  for (const n of ['inference/llama-3.2-1b-instruct', 'inference/inference-net/schematron-v2-small']) assert.equal((await h.probe(n, { force: true })).toolCalling, false, n);
  const guard = new RunGuard({ maxSteps: 6, maxToolCalls: 3, maxWallSeconds: 30 });
  let ran = false;
  const r = await runToolAgent({ model: await h.getChatModel('inference/llama-3.2-1b-instruct', { flowId: 'inf', nodeId: 'agent', guard }), guard, input: 'use echo', tools: [{ ...ECHO, invoke: async () => { ran = true; return 'ok'; } }] });
  assert.equal(r.status, 'completed'); assert.ok(ran);
  assert.equal(r.messages.find(x => x.tool_calls?.length).response_metadata.toolMode, 'prompt');
});

test('hosted: a privileged model gives a clear access_required error (403 model_access_required), over MCP and direct, without the key', async () => {
  const { inf, h, logs } = await inferenceHarness();
  await h.importCatalog('inference', { baseURL: inf.url, isAdmin: true, only: ['claude-private-preview'] });
  const c = h.models(); c.models['priv-direct'] = { ...c.models['inference/claude-private-preview'], transport: 'direct' }; h.saveModels(c, { isAdmin: true });
  for (const n of ['inference/claude-private-preview', 'priv-direct']) {
    await assert.rejects((async () => (await h.getChatModel(n)).invoke('hi'))(), e => {
      assert.equal(e.code, 'access_required', `${n}: ${e.code} ${e.message}`);
      assert.match(e.message, /needs approved access/); assert.match(e.message, /claude-private-preview/);
      assert.ok(!e.message.includes(INF_KEY)); return true;
    });
  }
  assert.ok(!logs.join('\n').includes(INF_KEY));
});

test('hosted: remote, so the locality gate needs export (D5); gateway headers (x-inference-provider*) come from headerRefs and never leak', async () => {
  const store = new PolicyStore(), engine = new AbacEngine(store);
  store.putUser({ id: 'reader', name: 'Reader', role: 'reader', clearance: 1 });
  store.putRule({ id: 'readers-read', name: 'Readers read', effect: 'allow', subjects: { roles: ['reader'] }, actions: ['read'], resources: { entities: ['*'] }, enabled: true });
  store.setEntity('Customer', { tags: [], classification: 0 });
  const { inf, h, logs, events } = await inferenceHarness({ engine });
  const c = h.models();
  c.models.gw = { provider: 'openai-compatible-hosted', preset: 'inference', baseURL: inf.url, model: 'meta-llama/llama-3.1-8b-instruct', keyRef: 'env:INFERENCE_API_KEY', headers: { 'x-inference-provider': 'openai' }, headerRefs: { 'x-inference-provider-key': 'env:GW_KEY' } };
  c.models['gw-direct'] = { ...c.models.gw, transport: 'direct' };
  h.saveModels(c, { isAdmin: true });
  for (const n of ['gw', 'gw-direct']) {
    const before = inf.hits.length;
    await assert.rejects((async () => (await h.getChatModel(n, { subject: 'reader', contextTypes: ['Customer'] })).invoke('x'))(), e => e.code === 'export_denied');
    assert.equal(inf.hits.length, before, 'nothing sent');
    assert.equal((await (await h.getChatModel(n, { subject: 'analyst', contextTypes: ['Customer'] })).invoke('hi')).content, 'inference: hi');
    const hd = inf.headers.at(-1);
    assert.equal(hd['x-inference-provider'], 'openai'); assert.equal(hd['x-inference-provider-key'], GW_KEY); assert.equal(hd.authorization, `Bearer ${INF_KEY}`);
  }
  const all = logs.join('\n') + JSON.stringify(events) + readFileSync(join(h.dataDir, 'models.json'), 'utf8');
  assert.ok(!all.includes(GW_KEY) && !all.includes(INF_KEY));
});

test('live Inference.net smoke (set INFERENCE_API_KEY; optional SG_TEST_INFERENCE_MODEL)', { skip: !process.env.INFERENCE_API_KEY && 'INFERENCE_API_KEY not set' }, async () => {
  const H = harness({}, { env: process.env }); closers.push(() => H.h.close());
  const r = await H.h.importCatalog('inference', { isAdmin: true });
  assert.ok(r.imported.length > 0);
  const name = `inference/${process.env.SG_TEST_INFERENCE_MODEL || 'meta-llama/llama-3.1-8b-instruct'}`;
  if (H.h.models().models[name]) assert.ok((await (await H.h.getChatModel(name, { subject: undefined })).invoke('Reply with OK.')).content);
});

// ------------------------------------------------------------------ live providers (skipped offline)
const OLLAMA_LIVE = process.env.SG_TEST_OLLAMA === '1';
test('A1.2 conformance against a real local Ollama (set SG_TEST_OLLAMA=1 with Ollama running)', { skip: !OLLAMA_LIVE && 'SG_TEST_OLLAMA not set' }, async () => {
  const { h } = harness({ 'ol-mcp': { provider: 'ollama', model: process.env.SG_TEST_OLLAMA_MODEL || 'llama3.1:8b', transport: 'inproc' }, 'ol-direct': { provider: 'ollama', model: process.env.SG_TEST_OLLAMA_MODEL || 'llama3.1:8b', transport: 'direct' }, 'fake-embed': { provider: 'ollama', kind: 'embed', model: 'nomic-embed-text' } }); closers.push(() => h.close());
  const a = await conform(h, 'ol-mcp'), b = await conform(h, 'ol-direct');
  for (const id of ['C1', 'C2', 'C5', 'C6', 'C10']) { assert.ok(a.results[id].pass, `mcp ${id}`); assert.ok(b.results[id].pass, `direct ${id}`); }
});
for (const [provider, envKey, model] of [['openai', 'OPENAI_API_KEY', 'SG_TEST_OPENAI_MODEL'], ['anthropic', 'ANTHROPIC_API_KEY', 'SG_TEST_ANTHROPIC_MODEL'], ['xai', 'XAI_API_KEY', 'SG_TEST_XAI_MODEL']]) {
  const on = process.env[envKey] && process.env[model];
  test(`live ${provider} smoke over MCP and direct (set ${envKey} and ${model})`, { skip: !on && `${envKey}/${model} not set` }, async () => {
    const { h } = harness({ 'p-mcp': { provider, model: process.env[model], keyRef: `env:${envKey}`, transport: 'inproc' }, 'p-direct': { provider, model: process.env[model], keyRef: `env:${envKey}`, transport: 'direct' } }, { env: process.env }); closers.push(() => h.close());
    for (const n of ['p-mcp', 'p-direct']) assert.ok((await (await h.getChatModel(n)).invoke('Reply with OK.')).content);
  });
}
