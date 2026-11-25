#!/usr/bin/env node
// Email/meeting summarizer (phase L2 beginner demo): a folder of meeting notes (.md, .txt) and emails (.eml) ->
// llm_summarize -> llm_classify -> llm_extract (people, action items) -> graph (Meeting, Person, ActionItem).
//
//   npm run demo:summarizer                                  local Ollama (D2); picks an installed chat model
//   npm run demo:summarizer -- --ollama-model qwen3:4b       a specific Ollama model
//   npm run demo:summarizer -- --transport direct            direct in-process calls instead of MCP (D1)
//   npm run demo:summarizer -- --model <name>                any model in <data>/models.json (paid ones too)
//   npm run demo:summarizer -- --fake                        the deterministic fake model (CI, no network)
//   options: --as owner|analyst  --folder <dir>  --data <dir>  --json <file>  --ollama-url <url>  --quiet
//            --max-wall-seconds <n>  --max-steps <n>   per-record hard stops for slow local models (default: flow's 600 s / 20)
//
// The run uses the same harness, ABAC checks and hard stops as the server: the user (--as) needs read on Meeting, and a
// remote model also needs export (D5, D9). Everything the model writes is stamped grokbot/meeting-summarizer/<step>
// and shown as unverified.
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadFlow, Pipeline } from '../../src/flow.js';
import { GraphStore } from '../../src/graph.js';
import { PolicyStore } from '../../src/abac/policy.js';
import { AbacEngine } from '../../src/abac/engine.js';
import { createHarness, OLLAMA_URL } from '../../src/llm/index.js';
import { isLoopback } from '../../src/llm/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PREFERRED = ['llama3.1:8b', 'llama3.2:3b', 'qwen3:4b', 'qwen3:8b'];

export async function runSummarizer(o = {}) {
  const log = o.quiet ? () => {} : (o.log || console.log);
  const flow = loadFlow(join(HERE, 'flow.json'));
  if (o.folder) for (const s of flow.steps) { if (s.type === 'documents') s.config.folder = resolve(o.folder); if (s.config?.document) s.config.document.folder = resolve(o.folder); }
  // --max-wall-seconds / --max-steps: the per-record hard stops (D3) for this run. The flow's own limits are 600 s and 20
  // calls; slow local thinking models (qwen3 on a CPU) can need more. This CLI is the admin's own workspace, so it raises
  // the workspace ceiling in <data>/models.json to match; the stops still apply and still report "run stopped: ...".
  const raise = {};
  for (const [k, v] of [['maxWallSeconds', o.maxWallSeconds], ['maxSteps', o.maxSteps]]) {
    if (v == null || v === '') continue;
    const n = Number(v); if (!Number.isInteger(n) || n <= 0) throw new Error(`${k} must be a positive whole number (got ${v}).`);
    raise[k] = n;
  }
  flow.limits = { ...(flow.limits || {}), ...raise };
  const dataDir = resolve(o.data || join(tmpdir(), 'streamgraph-summarizer'));
  mkdirSync(dataDir, { recursive: true });
  const policy = new PolicyStore(), engine = new AbacEngine(policy);
  const as = o.as || 'owner', subject = engine.subject(as);
  if (!subject) throw new Error(`There is no user "${as}" (try owner or analyst).`);
  const env = { ...process.env };
  const llmLog = [];
  const h = createHarness({ dataDir, engine, env, ollamaURL: o.ollamaUrl, log: l => llmLog.push(l) });
  const cfg = h.models();
  let modelName = o.model, note = '';
  if (o.fake) {
    const fx = await import('../../test/fixtures/fake-chat-model.js');
    env.SG_FAKE_KEY = fx.GOOD_KEY;
    cfg.models['fake-local'] = { provider: 'fake', model: 'fake-1', keyRef: 'env:SG_FAKE_KEY', transport: o.transport || 'inproc', label: 'Deterministic fake model (tests)' };
    modelName = 'fake-local'; note = 'fake model (deterministic, no network)';
  } else if (!modelName) {
    const url = o.ollamaUrl || cfg.models['local-llama']?.baseURL || OLLAMA_URL;
    let tag = o.ollamaModel;
    if (!tag) {
      let tags;
      try { const r = await fetch(new URL('/api/tags', url), { signal: AbortSignal.timeout(5000) }); tags = (await r.json()).models?.map(m => m.name) || []; }
      catch { throw Object.assign(new Error(`default model unreachable: Ollama did not answer at ${url}. Start it (ollama serve), pass --ollama-url, or use --fake. No other model was tried.`), { code: 'unreachable' }); }
      const chat = tags.filter(t => !/embed/i.test(t));
      tag = [cfg.models['local-llama']?.model, ...PREFERRED].find(t => t && chat.includes(t)) || chat[0];
      if (!tag) throw new Error(`Ollama at ${url} has no chat models. Pull one first, for example: ollama pull llama3.2:3b`);
    }
    cfg.models['local-llama'] = { ...cfg.models['local-llama'], provider: 'ollama', model: tag, baseURL: url, transport: o.transport || cfg.models['local-llama']?.transport || 'inproc' };
    if (isLoopback(url)) cfg.models['local-llama'].locality = 'local'; else delete cfg.models['local-llama'].locality;
    modelName = 'local-llama'; note = `Ollama ${tag} at ${url}`;
  }
  if (!cfg.models[modelName]) throw new Error(`There is no model "${modelName}" in ${join(dataDir, 'models.json')}.`);
  if (o.transport && !o.fake && cfg.models[modelName].transport !== o.transport) cfg.models[modelName] = { ...cfg.models[modelName], transport: o.transport };
  for (const [k, v] of Object.entries(raise)) if (!(cfg.limits?.[k] >= v)) cfg.limits = { ...(cfg.limits || {}), [k]: v };
  h.saveModels(cfg, { isAdmin: true }); // this CLI is the admin's own workspace
  flow.models = { ...(flow.models || {}), default: modelName };
  const entry = h.models().models[modelName], locality = (await import('../../src/llm/config.js')).localityOf(entry, h.models());
  log(`Summarizer: ${note || modelName} · transport ${entry.transport || 'inproc'} · ${locality}${locality === 'remote' ? ' (needs export rights, D5)' : ''} · as ${as} · limits ${flow.limits.maxWallSeconds ?? '?'} s, ${flow.limits.maxSteps ?? '?'} calls per record and step`);

  const graph = new GraphStore(), errors = [];
  const ensure = (label, fields) => { try { policy.register({ nodeTypes: [{ label, props: fields }], edgeTypes: [] }); } catch { /* unknown types stay denied */ } };
  const p = new Pipeline(flow, { graph, ctx: { llm: { harness: h, engine, subject, ensure } } });
  p.on('error-event', e => { errors.push(e); log(`  ! ${e.where}: ${e.message}`); });
  const t0 = Date.now();
  try { await p.runOnce(); } finally { await h.close(); }
  const nodes = graph.nodes(), edges = graph.edges(), byId = new Map(nodes.map(n => [n.id, n]));
  const meetings = nodes.filter(n => n.label === 'Meeting').map(m => ({
    id: m.key, ...m.props,
    people: edges.filter(e => e.type === 'ATTENDED' && e.to === m.id).map(e => byId.get(e.from)?.props?.name || byId.get(e.from)?.key),
    actions: edges.filter(e => e.type === 'HAS_ACTION' && e.from === m.id).map(e => byId.get(e.to)?.props).filter(Boolean),
  }));
  const stats = Object.fromEntries(Object.entries(p.stepSchemas()).map(([id, s]) => [id, { in: s.in, out: s.out, errors: s.errors, denied: s.denied || 0, llm: s.llm }]));
  for (const m of meetings) {
    log(`\n■ ${m.title}  [${m.category ?? '?'}${m.confidence != null ? ` ${Number(m.confidence).toFixed(2)}` : ''}]  ${m.trust_tier} · ${m.generated_by}`);
    log(`  ${String(m.summary || '').replace(/\s+/g, ' ')}`);
    if (m.people.length) log(`  people: ${m.people.join(', ')}`);
    for (const a of m.actions) log(`  - ${a.owner || '?'}: ${a.task}${a.due ? ` (due ${a.due})` : ''}`);
  }
  log(`\nGraph: ${JSON.stringify(graph.counts())} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  for (const [id, s] of Object.entries(stats)) if (s.llm) log(`  ${id}: ${s.llm.calls} calls, ${s.llm.totalTokens} tokens${s.llm.estimated ? ' (estimated)' : ''}, ${s.llm.costUsd == null ? 'price unknown' : `$${s.llm.costUsd.toFixed(4)}`}, errors ${s.errors}${s.denied ? `, denied ${s.denied}` : ''}`);
  const out = { model: modelName, entry: { provider: entry.provider, model: entry.model, transport: entry.transport, locality }, as, meetings, stats, counts: graph.counts(), errors, runId: p.runId, seconds: (Date.now() - t0) / 1000, harnessLog: llmLog };
  if (o.json) { writeFileSync(o.json, JSON.stringify(out, null, 2)); log(`Saved ${o.json}`); }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values: v } = parseArgs({ options: { fake: { type: 'boolean' }, model: { type: 'string' }, 'ollama-model': { type: 'string' }, 'ollama-url': { type: 'string' }, transport: { type: 'string' }, as: { type: 'string' }, folder: { type: 'string' }, data: { type: 'string' }, json: { type: 'string' }, quiet: { type: 'boolean' }, 'max-wall-seconds': { type: 'string' }, 'max-steps': { type: 'string' } } });
  runSummarizer({ fake: v.fake, model: v.model, ollamaModel: v['ollama-model'], ollamaUrl: v['ollama-url'], transport: v.transport, as: v.as, folder: v.folder, data: v.data, json: v.json, quiet: v.quiet, maxWallSeconds: v['max-wall-seconds'], maxSteps: v['max-steps'] })
    .then(r => process.exit(r.errors.length || !r.meetings.length ? 1 : 0))
    .catch(e => { console.error(`Summarizer failed: ${e.message}`); process.exit(2); });
}
