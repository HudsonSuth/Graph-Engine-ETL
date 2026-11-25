// Phase L2: LLM transforms in ETL flows (llm_map, llm_extract, llm_classify, llm_summarize, llm_translate, embed) and
// the email/meeting summarizer demo. Offline: the deterministic fake model, in-process (direct) and behind the Model
// Bridge over MCP (inproc). A "capture" provider records every prompt that reaches a model, so the masking and
// nothing-sent-on-refusal checks look at what a model would really see.
// The wrong build (SG_LLM_ETL_IMPL=wrong) must fail this suite: see wrong-llm-etl.test.js.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FakeChatModel, GOOD_KEY } from './fixtures/fake-chat-model.js';
import { createHarness } from '../src/llm/index.js';
import { registerProvider } from '../src/llm/registry.js';
import { Pipeline, validateFlow, loadFlow, KINDS } from '../src/flow.js';
import { GraphStore } from '../src/graph.js';
import { PolicyStore } from '../src/abac/policy.js';
import { AbacEngine } from '../src/abac/engine.js';
import { readDocument, listDocuments } from '../src/documents/index.js';
import { tierOf } from '../src/wiki/trust.js';
import { runSummarizer } from '../demo/summarizer/run.mjs';
import { setup as seedDemo } from '../demo/simulate.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const tmp = p => mkdtempSync(join(tmpdir(), `sgetl-${p}-`));
const TRANSPORTS = ['inproc', 'direct'];
const harnesses = []; after(async () => { for (const h of harnesses) await h.close(); });

// capture provider: a FakeChatModel that records the text of every prompt it receives; "BOOM" in a prompt throws.
const captured = [];
class CaptureModel extends FakeChatModel {
  async _generate(messages, options) {
    const text = messages.map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join('\n');
    captured.push(text);
    if (text.includes('BOOM')) throw new Error('500 the model crashed on this record');
    return super._generate(messages, options);
  }
}
registerProvider('capture', { needsKey: true, chat: (entry, { apiKey }) => new CaptureModel({ ...(entry.options?.fake || {}), apiKey }) });

const ENV = { FAKE_KEY: GOOD_KEY };
const fake = (transport, extra = {}) => ({ provider: 'fake', model: 'fake-1', keyRef: 'env:FAKE_KEY', transport, ...extra });
const capture = (transport, extra = {}) => ({ provider: 'capture', model: 'cap-1', keyRef: 'env:FAKE_KEY', transport, ...extra });

/** Harness + ABAC + Pipeline context. models: extra registry entries; as: subject id. */
function setup(models, { as = 'owner', fields = {}, entities = {}, rules = [] } = {}) {
  const policy = new PolicyStore(), engine = new AbacEngine(policy);
  const h = createHarness({ dataDir: tmp('h'), env: ENV, engine }); harnesses.push(h);
  const cfg = h.models(); Object.assign(cfg.models, models); h.saveModels(cfg, { isAdmin: true });
  for (const [label, patch] of Object.entries(entities)) policy.setEntity(label, patch);
  for (const [k, s] of Object.entries(fields)) { const [label, f] = k.split('.'); policy.setField(label, f, s); }
  for (const r of rules) policy.putRule(r);
  const ensure = (label, f) => policy.register({ nodeTypes: [{ label, props: f }], edgeTypes: [] });
  return { h, policy, engine, llm: { harness: h, engine, subject: engine.subject(as), ensure } };
}
function ndjson(rows) { const d = tmp('src'); writeFileSync(join(d, 'in.ndjson'), rows.map(r => JSON.stringify(r)).join('\n') + '\n'); return d; }
/** source (ndjson) -> steps... -> graph sink with mapping */
function flowOf(dir, steps, mapping, extra = {}) {
  const all = [{ id: 'src', type: 'file', config: { path: 'in.ndjson', topic: 'people' } }, ...steps, { id: 'sink', type: 'graph', config: { mapping } }];
  return { name: 'etl-test', baseDir: dir, ...extra, steps: all, links: all.slice(1).map((s, i) => ({ from: all[i].id, to: s.id })) };
}
async function run(flow, llm) { const g = new GraphStore(), p = new Pipeline(flow, { graph: g, ctx: { llm } }); const errs = []; p.on('error-event', e => errs.push(e)); await p.runOnce(); return { g, p, errs, stats: p.stepSchemas() }; }
const PEOPLE = { people: { nodes: [{ label: 'Customer', key: 'id', props: '*' }] } };

// ------------------------------------------------------------------ catalog + validation
test('L2 kinds are in the palette and LLM steps are validated (schema, labels, model overrides, JSONata)', () => {
  for (const k of ['llm_map', 'llm_extract', 'llm_classify', 'llm_summarize', 'llm_translate', 'embed']) assert.equal(KINDS[k], 'transform', k);
  const v = steps => validateFlow({ steps: [{ id: 's', type: 'file', config: { path: 'x', topic: 't' } }, ...steps, { id: 'g', type: 'graph', config: { mapping: {} } }], links: [{ from: 's', to: steps[0].id }, { from: steps[0].id, to: 'g' }] });
  assert.deepEqual(v([{ id: 'm', type: 'llm_map', config: { prompt: 'Say hi to {{name}}', output: 'greeting' } }]), []);
  assert.ok(v([{ id: 'm', type: 'llm_map', config: { prompt: 'x' } }]).some(e => /missing config.output/.test(e)));
  assert.ok(v([{ id: 'e', type: 'llm_extract', config: { field: 'x', schema: { type: 'string' } } }]).some(e => /type "object"/.test(e)));
  assert.ok(v([{ id: 'e', type: 'llm_extract', config: { field: 'x', schema: { type: 'object', properties: { a: { type: 'nope' } } } } }]).some(e => /not a valid JSON Schema/.test(e)));
  assert.ok(v([{ id: 'e', type: 'llm_extract', config: { field: 'x', schema: { type: 'object', properties: { a: { type: 'string' } } }, split: [{ field: 'a', topic: 't2' }] } }]).some(e => /must be an array property/.test(e)));
  assert.ok(v([{ id: 'c', type: 'llm_classify', config: { field: 'x', labels: [] } }]).some(e => /labels/.test(e)));
  assert.ok(v([{ id: 'c', type: 'llm_classify', config: { field: 'x', labels: ['a'], model: { name: 'm', keyRef: 'env:X' } } }]).some(e => /cannot set keyRef/.test(e)), 'a node can never set keyRef/baseURL');
  assert.ok(v([{ id: 'c', type: 'llm_classify', config: { field: 'x', labels: ['a'], model: { name: 'm', baseURL: 'http://evil' } } }]).some(e => /cannot set baseURL/.test(e)));
  assert.ok(v([{ id: 'c', type: 'llm_classify', config: { field: 'x', labels: ['a'], when: 'total >' } }]).some(e => /bad config.when/.test(e)), 'when is checked with the JSONata parser');
  assert.ok(v([{ id: 't', type: 'llm_summarize', config: {} }]).some(e => /name the input/.test(e)));
  // ETL flows stay acyclic, LLM steps included (A0.4 still holds)
  const cyc = { steps: [{ id: 's', type: 'file', config: { path: 'x', topic: 't' } }, { id: 'a', type: 'llm_map', config: { prompt: 'p', output: 'o' } }, { id: 'b', type: 'llm_map', config: { prompt: 'p', output: 'o' } }, { id: 'g', type: 'graph', config: { mapping: {} } }],
    links: [{ from: 's', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'a' }, { from: 'b', to: 'g' }] };
  assert.ok(validateFlow(cyc).includes('Flow has a cycle'));
});

// ------------------------------------------------------------------ A2.1
for (const t of TRANSPORTS) test(`A2.1 demo/flow.json plus an llm_classify step: the fake model fills the expected fields (${t})`, async () => {
  // demo/orders.ndjson and demo/shop.db are generated (gitignored), so seed a private copy of the demo folder.
  const demo = tmp('demo-flow');
  for (const f of ['flow.json', 'customers.csv', 'products.json', 'orders.seed.ndjson']) copyFileSync(join(ROOT, 'demo', f), join(demo, f));
  seedDemo(demo).stop();
  const flow = loadFlow(join(demo, 'flow.json'));
  flow.steps = flow.steps.filter(s => s.id !== 'loyalty_api'); flow.links = flow.links.filter(l => l.from !== 'loyalty_api');
  flow.steps.splice(flow.steps.findIndex(s => s.id === 'graph_sink'), 0, { id: 'classify_products', type: 'llm_classify', config: { topics: ['products'], field: 'name', labels: ['hardware', 'apparel', 'other'], output: 'segment' } });
  flow.links = flow.links.map(l => (l.from === 'products_json' ? { from: 'products_json', to: 'classify_products' } : l)).concat({ from: 'classify_products', to: 'graph_sink' });
  const sink = flow.steps.find(s => s.id === 'graph_sink');
  sink.config.mapping.products.nodes[0].props = { ...sink.config.mapping.products.nodes[0].props, segment: 'segment', confidence: 'confidence' };
  assert.deepEqual(validateFlow(flow), []);
  const { llm } = setup({ 'fake-x': fake(t) }); flow.models = { default: 'fake-x' };
  const { g, stats, errs } = await run(flow, llm);
  assert.deepEqual(errs.filter(e => e.where === 'classify_products'), []);
  const products = g.nodes('Product').filter(n => n.props.name);
  assert.ok(products.length >= 3, 'products loaded');
  for (const p of products) { assert.equal(p.props.segment, 'hardware', 'fake picks the first label'); assert.equal(p.props.confidence, 1, 'confidence is clamped to 0..1'); }
  assert.ok(g.nodes('Customer').length > 0 && g.nodes('Order').length > 0, 'the rest of the demo flow still runs');
  assert.ok(g.nodes('Customer').every(n => n.props.trust_tier === undefined), 'records that never met a model carry no LLM provenance');
  assert.equal(stats.classify_products.llm.calls, products.length);
  assert.ok(stats.classify_products.llm.totalTokens > 0);
  assert.equal(stats.classify_products.llm.transport, t);
});

test('llm_map, llm_extract (with split fan-out), llm_translate and embed produce their fields (fake model)', async () => {
  const dir = ndjson([{ id: 'c1', name: 'Ada', note: 'Ada wants a refund' }]);
  const { llm } = setup({ 'fake-x': fake('inproc'), 'fake-emb': { provider: 'fake', kind: 'embed', model: 'e', dims: 8, keyRef: 'env:FAKE_KEY', transport: 'direct' } });
  const flow = flowOf(dir, [
    { id: 'greet', type: 'llm_map', config: { prompt: 'Greet {{name}}', output: 'greeting' } },
    { id: 'ext', type: 'llm_extract', config: { field: 'note', parentKey: 'id', schema: { type: 'object', properties: { intent: { type: 'string', enum: ['refund', 'other'] }, items: { type: 'array', items: { type: 'object', properties: { what: { type: 'string' } } } } }, required: ['intent', 'items'] }, split: [{ field: 'items', topic: 'items' }] } },
    { id: 'fr', type: 'llm_translate', config: { fields: ['note'], to: 'French' } },
    { id: 'vec', type: 'embed', config: { field: 'note', model: 'fake-emb', output: 'note_vec' } },
  ], { ...PEOPLE, items: { nodes: [{ label: 'Item', key: "parent_key & '#' & $string(item_index)", props: { what: 'what' } }] } }, { models: { default: 'fake-x' } });
  assert.deepEqual(validateFlow(flow), []);
  const { g, errs } = await run(flow, llm);
  assert.deepEqual(errs, []);
  const c = g.getNode('Customer:c1').props;
  assert.match(c.greeting, /^echo: /); assert.equal(c.intent, 'refund'); assert.match(c.note_french, /^echo: /);
  assert.equal(c.note_vec.length, 8);
  assert.deepEqual(c.llm_fields.split(', ').sort(), ['greeting', 'intent', 'items', 'note_french', 'note_vec'].sort());
  const items = g.nodes('Item'); assert.equal(items.length, 1, 'split fans out one record per array item');
  assert.equal(items[0].key, 'c1#0'); assert.equal(items[0].props.trust_tier, 'unverified');
});

// ------------------------------------------------------------------ A2.2
for (const t of TRANSPORTS) test(`A2.2 provenance: generated.by = grokbot/<flow>/<node>, the tier is unverified, _llm carries model, run, tokens and cost (${t})`, async () => {
  const dir = ndjson([{ id: 'c1', name: 'Ada', note: 'hello' }, { id: 'c2', name: 'Ben', note: 'bye' }]);
  const { llm } = setup({ 'fake-x': fake(t) });
  const flow = flowOf(dir, [{ id: 'tone', type: 'llm_classify', config: { field: 'note', labels: ['friendly', 'angry'], output: 'tone' } }], PEOPLE, { models: { default: 'fake-x' } });
  const { g, p, errs } = await run(flow, llm);
  assert.deepEqual(errs, []);
  for (const id of ['c1', 'c2']) {
    const n = g.getNode(`Customer:${id}`).props;
    assert.equal(n.generated_by, 'grokbot/etl-test/tone');
    assert.equal(n.trust_tier, 'unverified'); assert.equal(n.trust_tier, tierOf([]));
    assert.equal(n.status, 'draft'); assert.equal(n.llm_model, 'fake-x'); assert.equal(n.llm_run, p.runId);
    assert.ok(!/^human:/i.test(n.generated_by), 'an agent is never stamped human:');
    assert.ok(n._llm, 'the record-level _llm is kept on the node (props "*")');
    assert.equal(n._llm.generated.by, 'grokbot/etl-test/tone'); assert.ok(n._llm.generated.at);
    assert.ok(n._llm.tokens.total > 0); assert.equal(n._llm.trust, 'unverified');
    assert.ok('costUsd' in n._llm);
    assert.deepEqual(n._llm.fields, ['tone', 'confidence']);
  }
  const st = p.stepSchemas().tone.llm;
  assert.equal(st.calls, 2); assert.ok(st.totalTokens > 0); assert.equal(st.model, 'fake-x');
});

test('A2.2 a priced model reports per-node cost in step stats and _llm.costUsd', async () => {
  const dir = ndjson([{ id: 'c1', note: 'hello' }]);
  const { h, llm } = setup({ 'fake-x': fake('direct') });
  h.savePrices({ prices: { 'fake/fake-1': { inputPer1M: 1000, outputPer1M: 2000, currency: 'USD', source: 'test', asOf: '2026-11-21' } } });
  const flow = flowOf(dir, [{ id: 'sum', type: 'llm_summarize', config: { field: 'note' } }], PEOPLE, { models: { default: 'fake-x' } });
  const { g, p } = await run(flow, llm);
  const n = g.getNode('Customer:c1').props, st = p.stepSchemas().sum.llm;
  assert.ok(n._llm.costUsd > 0, `costUsd ${n._llm.costUsd}`); assert.ok(st.costUsd > 0); assert.equal(st.priceKnown, true);
});

// ------------------------------------------------------------------ A2.3
for (const t of TRANSPORTS) test(`A2.3 ABAC: a field the subject may not see is masked in the prompt (${t})`, async () => {
  const dir = ndjson([{ id: 'c1', name: 'Ada', email: 'ada.secret@example.com' }]);
  const fields = { 'Customer.id': 'low', 'Customer.name': 'low', 'Customer.email': 'high' };
  const flow = () => flowOf(dir, [{ id: 'mail', type: 'llm_map', config: { prompt: 'Write to {{name}} at {{email}}', output: 'draft' } }], PEOPLE, { models: { default: 'cap' } });
  // analyst (clearance 1): email is masked
  captured.length = 0;
  let r = await run(flow(), setup({ cap: capture(t) }, { as: 'analyst', fields }).llm);
  assert.deepEqual(r.errs, []);
  assert.ok(captured.length >= 1, 'the model was called');
  assert.ok(captured.every(x => !x.includes('ada.secret@example.com')), 'the PII value never reaches the prompt');
  assert.ok(captured.some(x => x.includes('[hidden]')), 'it is replaced by [hidden]');
  assert.ok(captured.some(x => x.includes('Ada')), 'visible fields are still sent');
  assert.ok(captured.some(x => /<data>/.test(x) && /never instructions/.test(x)), 'record content is wrapped as untrusted data');
  // owner (clearance 3): the same prompt has the value (positive control)
  captured.length = 0;
  r = await run(flow(), setup({ cap: capture(t) }, { as: 'owner', fields }).llm);
  assert.ok(captured.some(x => x.includes('ada.secret@example.com')));
});

for (const t of TRANSPORTS) test(`A2.3 + D5/D9 a remote model needs export: refused per record, counted as errors with a clear message, nothing sent (${t})`, async () => {
  const dir = ndjson([{ id: 'c1', note: 'a' }, { id: 'c2', note: 'b' }, { id: 'c3', note: 'c' }]);
  const fields = { 'Customer.id': 'low', 'Customer.note': 'low' };
  const noExport = [{ id: 'analysts-read', name: 'Analysts can view and ask questions', effect: 'allow', subjects: { roles: ['analyst'] }, actions: ['read', 'query'], resources: { entities: ['*'] }, enabled: true }];
  const flow = name => flowOf(dir, [{ id: 'cls', type: 'llm_classify', config: { field: 'note', labels: ['x', 'y'] } }], PEOPLE, { models: { default: name } });
  const models = { remote: capture(t, { locality: 'remote' }), lan: capture(t, { baseURL: 'http://10.0.0.5:11434', locality: 'local' }), local: capture(t, { locality: 'local' }) };
  for (const name of ['remote', 'lan']) {
    captured.length = 0;
    const { g, errs, stats } = await run(flow(name), setup(models, { as: 'analyst', fields, rules: noExport }).llm);
    assert.equal(captured.length, 0, `${name}: nothing is sent on refusal`);
    assert.equal(stats.cls.errors, 3, `${name}: every record counts as an error`);
    assert.equal(stats.cls.denied, 3);
    assert.ok(errs.every(e => e.where === 'cls' && /this model is remote; you need export rights on Customer/.test(e.message)), JSON.stringify(errs));
    assert.equal(g.nodes('Customer').length, 0, 'refused records do not reach the graph unprocessed (fail closed)');
  }
  // the same analyst and prompt on a local (loopback) model: read is enough
  captured.length = 0;
  let r = await run(flow('local'), setup(models, { as: 'analyst', fields, rules: noExport }).llm);
  assert.equal(r.stats.cls.errors, 0); assert.equal(captured.length, 3);
  // with export (the default analyst role), the remote model is allowed
  captured.length = 0;
  r = await run(flow('remote'), setup(models, { as: 'analyst', fields }).llm);
  assert.equal(r.stats.cls.errors, 0); assert.equal(r.g.nodes('Customer').length, 3);
  assert.equal(r.g.getNode('Customer:c1').props._llm.locality, 'remote');
});

test('A2.3 fail closed: no entity type, no access rules, or an unreadable type means nothing is sent', async () => {
  const dir = ndjson([{ id: 'c1', note: 'a' }]);
  const step = [{ id: 'm', type: 'llm_map', config: { prompt: '{{note}}', output: 'o' } }];
  captured.length = 0;
  // the topic is not mapped by the graph sink and config.entity is not set
  let r = await run(flowOf(dir, step, { other: PEOPLE.people }, { models: { default: 'cap' } }), setup({ cap: capture('direct') }).llm);
  assert.match(r.errs[0].message, /cannot tell which entity type/);
  // no ABAC engine
  const { h } = setup({ cap: capture('direct') });
  r = await run(flowOf(dir, step, PEOPLE, { models: { default: 'cap' } }), { harness: h });
  assert.match(r.errs[0].message, /no access rules/);
  // a PII-tagged type above the subject's clearance: even read is denied
  r = await run(flowOf(dir, step, PEOPLE, { models: { default: 'cap' } }), setup({ cap: capture('direct') }, { as: 'analyst', entities: { Customer: { tags: ['pii'], classification: 2 } } }).llm);
  assert.match(r.errs[0].message, /you need read rights on Customer/);
  // the whole document body hidden from the subject
  r = await run(flowOf(dir, [{ id: 's', type: 'llm_summarize', config: { field: 'note' } }], PEOPLE, { models: { default: 'cap' } }), setup({ cap: capture('direct') }, { as: 'analyst' }).llm);
  assert.match(r.errs[0].message, /you may not see Customer.note/);
  assert.equal(captured.length, 0, 'nothing reached a model in any of these cases');
});

// ------------------------------------------------------------------ A2.4 + hard stops (D3)
test('A2.4 a per-record failure counts toward st.errors and does not stop the pipeline', async () => {
  const dir = ndjson([{ id: 'c1', note: 'fine' }, { id: 'c2', note: 'BOOM' }, { id: 'c3', note: 'also fine' }]);
  const { llm } = setup({ cap: capture('direct') });
  const { g, stats, errs } = await run(flowOf(dir, [{ id: 'sum', type: 'llm_summarize', config: { field: 'note' } }], PEOPLE, { models: { default: 'cap' } }), llm);
  assert.equal(stats.sum.errors, 1); assert.equal(stats.sum.out, 2);
  assert.match(errs[0].message, /llm_summarize: .*crashed/); assert.match(stats.sum.lastError, /crashed/);
  assert.deepEqual(g.nodes('Customer').map(n => n.key).sort(), ['c1', 'c3']);
});

test('D3 hard stops per record: maxWallSeconds and maxSteps stop that record only; size caps refuse before sending', async () => {
  const dir = ndjson([{ id: 'c1', note: 'quick' }, { id: 'c2', note: '[slow] wait' }, { id: 'c3', note: 'x'.repeat(5000) }, { id: 'c4', note: 'quick too' }]);
  const { llm } = setup({ 'fake-x': fake('direct') });
  const t0 = Date.now();
  let r = await run(flowOf(dir, [{ id: 'sum', type: 'llm_summarize', config: { field: 'note', chunkChars: 1000, maxChunks: 3 } }], PEOPLE, { models: { default: 'fake-x' }, limits: { maxWallSeconds: 0.5 } }), llm);
  assert.ok(Date.now() - t0 < 6000, 'the slow call was cut off');
  const msgs = r.errs.map(e => e.message).join('\n');
  assert.match(msgs, /maxWallSeconds/); assert.match(msgs, /too long: \d+ parts .* allows 3/);
  assert.deepEqual(r.g.nodes('Customer').map(n => n.key).sort(), ['c1', 'c4']);
  // maxSteps: a map-reduce that needs more model calls than the flow allows
  r = await run(flowOf(ndjson([{ id: 'c1', note: 'y'.repeat(2500) }]), [{ id: 'sum', type: 'llm_summarize', config: { field: 'note', chunkChars: 500 } }], PEOPLE, { models: { default: 'fake-x' }, limits: { maxSteps: 2 } }), llm);
  assert.match(r.errs[0].message, /maxSteps/);
  // maxInputChars refuses before anything is sent
  captured.length = 0;
  r = await run(flowOf(ndjson([{ id: 'c1', note: 'z'.repeat(300) }]), [{ id: 'm', type: 'llm_map', config: { prompt: '{{note}}', output: 'o', maxInputChars: 200 } }], PEOPLE, { models: { default: 'cap' } }), setup({ cap: capture('direct') }).llm);
  assert.match(r.errs[0].message, /allows 200/); assert.equal(captured.length, 0);
  // a flow cannot raise the workspace limits
  r = await run(flowOf(ndjson([{ id: 'c1', note: 'a' }]), [{ id: 'm', type: 'llm_map', config: { prompt: '{{note}}', output: 'o' } }], PEOPLE, { models: { default: 'fake-x' }, limits: { maxSteps: 5000 } }), llm);
  assert.match(r.errs[0].message, /only an admin can raise maxSteps/);
});

test('D3 cancel: stopping the pipeline aborts an in-flight model call', async () => {
  const dir = ndjson([{ id: 'c1', note: '[slow] long one' }]);
  const { llm } = setup({ 'fake-x': fake('direct') });
  const flow = flowOf(dir, [{ id: 'sum', type: 'llm_summarize', config: { field: 'note' } }], PEOPLE, { models: { default: 'fake-x' } });
  flow.steps[0].config.intervalMs = 60000;
  const p = new Pipeline(flow, { graph: new GraphStore(), ctx: { llm } }); const errs = []; p.on('error-event', e => errs.push(e));
  await p.start(); await new Promise(r => setTimeout(r, 300));
  const t0 = Date.now(); await p.stop();
  assert.ok(Date.now() - t0 < 3000, `stop took ${Date.now() - t0} ms`);
  assert.ok(errs.some(e => /cancelled|abort/i.test(e.message)), JSON.stringify(errs));
});

test('llm_summarize map-reduce: long text is split, each part summarised, then combined; deletes and `when` skip the model', async () => {
  const long = Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1}. ${'Words about the meeting. '.repeat(12)}`).join('\n\n');
  const dir = ndjson([{ id: 'c1', note: long, keep: true }, { id: 'c2', note: 'short', keep: false }, { _op: 'd', id: 'c9', note: 'gone', keep: true }]);
  captured.length = 0;
  const { g, errs } = await run(flowOf(dir, [{ id: 'sum', type: 'llm_summarize', config: { field: 'note', chunkChars: 800, when: 'keep = true' } }], PEOPLE, { models: { default: 'cap' } }), setup({ cap: capture('direct') }).llm);
  assert.deepEqual(errs, []);
  const n = g.getNode('Customer:c1').props;
  assert.ok(n._llm.chunks > 1, `chunks ${n._llm.chunks}`);
  assert.equal(n._llm.steps[0].calls, captured.length); assert.ok(captured.length > n._llm.chunks, 'map calls plus at least one reduce call');
  assert.ok(captured.some(x => /\[part 1 of \d+\]/.test(x)) && captured.some(x => /combine partial summaries/.test(x)));
  assert.equal(g.getNode('Customer:c2').props.summary, undefined, 'when = false: no model call, record passes through');
  assert.ok(captured.every(x => !x.includes('gone')), 'deletes never call a model');
});

// ------------------------------------------------------------------ text files (.txt/.md/.eml) for the summarizer
test('documents: .eml, .md and .txt are read only when textFiles is on; binary text is refused', async () => {
  const eml = Buffer.from('From: A <a@x.org>\nTo: B <b@x.org>\nSubject: Hello\nDate: Thu, 19 Nov 2026 09:12:00 -0600\n\nBody line\n');
  const r = await readDocument(eml, 'm.eml', {}, { text: true });
  assert.deepEqual(r.meta, { title: 'Hello', subject: 'Hello', from: 'A <a@x.org>', to: 'B <b@x.org>', date: 'Thu, 19 Nov 2026 09:12:00 -0600' });
  assert.equal(r.sections[0].text, 'Body line');
  const multi = Buffer.from('From: a\nSubject: S\nContent-Type: multipart/alternative; boundary="b1"\n\n--b1\nContent-Type: text/plain\nContent-Transfer-Encoding: quoted-printable\n\nPlain =\ntext=3D1\n--b1\nContent-Type: text/html\n\n<p>x</p>\n--b1--\n');
  const m = await readDocument(multi, 'm.eml', {}, { text: true });
  assert.equal(m.sections[0].text, 'Plain text=1'); assert.match(m.notes.join(' '), /not read/);
  const md = await readDocument(Buffer.from('---\ntitle: Sync\n---\n# Sync\nintro\n## Part\nmore\n'), 'n.md', {}, { text: true });
  assert.equal(md.meta.title, 'Sync'); assert.deepEqual(md.sections.map(s => s.heading), ['Sync', 'Part']);
  await assert.rejects(readDocument(Buffer.from('a\u0000b'), 'x.txt', {}, { text: true }), /binary/);
  await assert.rejects(readDocument(Buffer.from('hello'), 'x.txt', {}), /not supported/, 'off by default');
  const d = tmp('docs'); writeFileSync(join(d, 'a.txt'), 'hi'); writeFileSync(join(d, 'b.eml'), eml);
  assert.equal((await listDocuments(d, {})).files.length, 0); assert.equal((await listDocuments(d, {}, { text: true })).files.length, 2);
});

test('llm_summarize document input: the file path cannot leave the source folder', async () => {
  const d = tmp('docin'); mkdirSync(join(d, 'inbox')); writeFileSync(join(d, 'inbox', 'a.txt'), 'meeting text'); writeFileSync(join(d, 'secret.txt'), 'TOP SECRET');
  writeFileSync(join(d, 'in.ndjson'), [{ id: 'ok', path: 'a.txt' }, { id: 'bad', path: '../secret.txt' }].map(r => JSON.stringify(r)).join('\n') + '\n');
  captured.length = 0;
  const { g, errs } = await run(flowOf(d, [{ id: 's', type: 'llm_summarize', config: { document: { folder: 'inbox' } } }], PEOPLE, { models: { default: 'cap' } }), setup({ cap: capture('direct') }).llm);
  assert.ok(g.getNode('Customer:ok').props.summary);
  assert.match(errs[0].message, /outside the source folder/);
  assert.ok(captured.every(x => !x.includes('TOP SECRET')));
});

// ------------------------------------------------------------------ the summarizer demo
for (const t of TRANSPORTS) test(`demo: email/meeting summarizer runs end to end on the fake model -> Meeting, Person, ActionItem, all unverified (${t})`, async () => {
  const r = await runSummarizer({ fake: true, quiet: true, transport: t, data: tmp('demo') });
  assert.deepEqual(r.errors, []);
  assert.equal(r.meetings.length, 4, 'two meeting notes and two emails');
  assert.equal(r.entry.transport, t); assert.equal(r.entry.locality, 'local');
  for (const m of r.meetings) {
    assert.ok(m.summary && m.category && m.title, JSON.stringify(m));
    assert.ok(['action-required', 'decision-needed', 'fyi'].includes(m.category));
    assert.equal(m.trust_tier, 'unverified'); assert.match(m.generated_by, /^grokbot\/meeting-summarizer\//);
    assert.ok(m.people.length >= 1 && m.actions.length >= 1);
  }
  const sync = r.meetings.find(m => m.title === 'Weekly pipeline sync');
  assert.ok(r.stats.summarize.llm.calls >= 4 + 2, 'the long note was map-reduced (2+ parts and a combine)');
  assert.ok(sync.actions.length >= 1 && sync.people.length >= 1);
  assert.ok(r.meetings.find(m => m.title === 'Search cluster budget for December').from.includes('Priya Nair'), 'email headers are kept');
  assert.ok(r.counts.nodes >= 4 + 4 && r.counts.edges >= 8);
  for (const id of ['summarize', 'classify', 'extract']) assert.ok(r.stats[id].llm.calls >= 4, id);
});

test('demo: as an analyst the documents stay unsent (fail closed: Meeting.content is unclassified, so it is hidden)', async () => {
  const r = await runSummarizer({ fake: true, quiet: true, as: 'analyst', data: tmp('demo-a') });
  assert.equal(r.meetings.length, 0);
  assert.equal(r.stats.summarize.errors, 4); assert.equal(r.stats.summarize.denied, 4);
  assert.ok(r.errors.every(e => /you may not see Meeting.content/.test(e.message)));
});

test('demo: with Ollama absent the run reports "default model unreachable" and tries nothing else (D2)', async () => {
  await assert.rejects(runSummarizer({ quiet: true, ollamaUrl: 'http://127.0.0.1:9', data: tmp('demo-o') }), /default model unreachable.*No other model was tried/);
});

// Live budget: the flow's per-record hard stop is 600 s per step, which slow thinking models on a CPU can exceed
// (qwen3:4b on Sutherland: llm_extract hit maxWallSeconds on 2 of 4 records). The product's limits are unchanged; the
// test runs as the admin with a larger budget: SG_TEST_OLLAMA_WALL_SECONDS (and SG_TEST_OLLAMA_MAX_STEPS) when set,
// otherwise 2400 s for thinking models (qwen3*, deepseek-r1*, *think*) and the flow's 600 s for the rest.
export function liveBudget(model = '', env = process.env) {
  const thinking = /^(qwen3|deepseek-r1)|think/i.test(model);
  const wall = Number(env.SG_TEST_OLLAMA_WALL_SECONDS) || (thinking ? 2400 : 600);
  const steps = Number(env.SG_TEST_OLLAMA_MAX_STEPS) || (thinking ? 40 : 20);
  return { maxWallSeconds: wall, maxSteps: steps, thinking };
}
test('live budget: thinking models get a larger wall budget; the env overrides it', () => {
  assert.deepEqual(liveBudget('llama3.2:3b', {}), { maxWallSeconds: 600, maxSteps: 20, thinking: false });
  assert.deepEqual(liveBudget('qwen3:4b', {}), { maxWallSeconds: 2400, maxSteps: 40, thinking: true });
  assert.equal(liveBudget('llama3.2:3b', { SG_TEST_OLLAMA_WALL_SECONDS: '1200' }).maxWallSeconds, 1200);
});
test('demo: --max-wall-seconds raises the per-record hard stop, and a stop is still reported clearly', async () => {
  const r = await runSummarizer({ fake: true, quiet: true, maxWallSeconds: 1200, maxSteps: 30, data: tmp('demo-l') });
  assert.equal(r.meetings.length, 4);
  // maxSteps 1 lets summarize call the model once per record, so every long document stops with a clear maxSteps error.
  const s = await runSummarizer({ fake: true, quiet: true, maxSteps: 1, data: tmp('demo-s') });
  assert.ok(s.errors.length > 0 && s.errors.every(e => /run stopped: maxSteps reached/.test(e.message)), JSON.stringify(s.errors));
  await assert.rejects(runSummarizer({ fake: true, quiet: true, maxWallSeconds: -5, data: tmp('demo-x') }), /maxWallSeconds must be a positive whole number/);
});

test('A1.13/A2 live: the summarizer against local Ollama (skipped unless SG_TEST_OLLAMA=1)', { skip: process.env.SG_TEST_OLLAMA !== '1' && 'set SG_TEST_OLLAMA=1 (and optionally SG_TEST_OLLAMA_MODEL, SG_TEST_OLLAMA_WALL_SECONDS) to run against a local Ollama' }, async () => {
  const model = process.env.SG_TEST_OLLAMA_MODEL;
  const budget = liveBudget(model || '');
  const r = await runSummarizer({ quiet: true, ollamaModel: model, data: tmp('demo-live'), maxWallSeconds: budget.maxWallSeconds, maxSteps: budget.maxSteps });
  assert.equal(r.entry.locality, 'local');
  const stops = r.errors.filter(e => /run stopped: (maxWallSeconds|maxSteps) reached/.test(e.message));
  assert.deepEqual(stops, [], `${r.entry.model} hit a hard stop with ${budget.maxWallSeconds} s / ${budget.maxSteps} calls per record and step; ` +
    `raise SG_TEST_OLLAMA_WALL_SECONDS or SG_TEST_OLLAMA_MAX_STEPS for a slower machine. Errors: ${JSON.stringify(r.errors)}`);
  assert.ok(r.meetings.length >= 3, `meetings ${r.meetings.length}, errors ${JSON.stringify(r.errors)}`);
  for (const m of r.meetings) { assert.ok(m.summary?.length > 20); assert.equal(m.trust_tier, 'unverified'); }
});
