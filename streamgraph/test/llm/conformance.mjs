// Model conformance suite (plan §5.8): C1–C13 for any model a user adds, through its configured transport, and C12
// transport parity (MCP vs direct). Used by the offline tests (fake model over MCP and direct) and by
//   npm run test:model -- <name> [--transport mcp|direct|both] [--data <dir>]
// which writes data/models.conformance/<name>.json. Never run against paid keys in CI.
import { HumanMessage } from '@langchain/core/messages';
import { RunGuard } from '../../src/llm/limits.js';
import { runToolAgent } from '../../src/agents/tool-agent.js';
import { ECHO_TOOL, N_SCHEMA, PNG_1PX } from '../../src/llm/probe.js';

const sleep = (ms, signal) => new Promise((res, rej) => { const t = setTimeout(res, ms); signal?.addEventListener('abort', () => { clearTimeout(t); rej(Object.assign(new Error('Aborted'), { name: 'AbortError' })); }, { once: true }); });
const text = m => (typeof m?.content === 'string' ? m.content : (m?.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));

/**
 * @param {object} o
 * @param {(ctx?:object)=>Promise<any>} o.getModel        a harness chat model (MeteredModel) for this transport; ctx may carry { guard }
 * @param {()=>Promise<any>} [o.getBadKeyModel]          the same model configured with a bad key (C9)
 * @param {string} [o.badKey]                            the bad key value, which must never be echoed
 * @param {()=>Promise<any>} [o.getEmbeddings]           an embeddings model (C8)
 * @param {()=>Promise<object>} o.probe                  capability flags through this transport (C11)
 * @param {object} [o.meter]                             harness meter (C6 reads its last record)
 */
export async function runConformance({ label = 'model', getModel, getBadKeyModel, badKey, getEmbeddings, probe, meter }) {
  const R = {}, obs = {};
  const check = async (id, fn) => { const t0 = Date.now(); try { const r = await fn(); R[id] = { pass: r !== false && !(r && r.pass === false), ...(r && typeof r === 'object' ? r : {}), ms: Date.now() - t0 }; } catch (e) { R[id] = { pass: false, error: `${e.code || e.name}: ${e.message}`, ms: Date.now() - t0 }; } };
  const flags = await probe();
  const model = await getModel();
  await check('C1', async () => { await model.invoke('Reply with the word OK.'); return { detail: 'reachable', pass: flags.reachable === true }; });
  await check('C2', async () => { const r = await model.invoke('Say hello.'); obs.text = text(r); obs.usageNative = !!meter?.records.at(-1) && meter.records.at(-1).estimated === false; return { pass: obs.text.length > 0 }; });
  await check('C3', async () => {
    const guard = new RunGuard({ maxSteps: 6, maxToolCalls: 4, maxWallSeconds: 60 });
    const m = await getModel({ guard });
    let echoed = null;
    const r = await runToolAgent({ model: m, guard, input: 'Use the echo tool to say hi.', tools: [{ ...ECHO_TOOL, invoke: async a => { echoed = a; return `echo: ${a.text}`; } }] });
    const ai = r.messages.find(x => x._getType?.() === 'ai' && x.tool_calls?.length);
    obs.toolShape = ai ? { name: ai.tool_calls[0].name, argKeys: Object.keys(ai.tool_calls[0].args || {}).sort() } : null;
    obs.nativeTools = !!ai && ai.response_metadata?.toolMode !== 'prompt';
    return { pass: r.status === 'completed' && !!echoed && r.messages.some(x => x._getType?.() === 'tool'), mode: obs.nativeTools ? 'native' : 'prompt' };
  });
  await check('C4', async () => { const r = await model.withStructuredOutput(N_SCHEMA).invoke('Return n = 2.'); obs.structuredValid = Number.isInteger(r?.n); return { pass: obs.structuredValid }; });
  await check('C5', async () => { let n = 0; for await (const _c of await model.stream('Count to three.')) n++; obs.chunks = n; return { pass: n >= 1, chunks: n }; });
  await check('C6', async () => { await model.invoke('Say hi.'); const rec = meter?.records.at(-1); obs.usageNative = rec ? rec.estimated === false : obs.usageNative; return { pass: !!rec && rec.usage.total_tokens > 0, estimated: rec?.estimated }; });
  await check('C7', async () => {
    try { const r = await model.invoke([new HumanMessage({ content: [{ type: 'text', text: 'Describe this image in one word.' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${PNG_1PX}` } }] })]); obs.vision = text(r).length > 0; }
    catch { obs.vision = false; }
    return { pass: flags.vision ? obs.vision : true, detail: flags.vision ? 'vision flagged and works' : 'vision not flagged (skipped)' };
  });
  await check('C8', async () => { if (!getEmbeddings) return { pass: true, detail: 'no embedding model (skipped)' }; const e = await getEmbeddings(); const a = await e.embedDocuments(['a', 'b']), b = await e.embedQuery('c'); return { pass: a[0].length > 0 && a[0].length === a[1].length && a[0].length === b.length, dims: a[0].length }; });
  await check('C9', async () => {
    if (!getBadKeyModel) return { pass: true, detail: 'no bad-key model given (skipped)' };
    try { await (await getBadKeyModel()).invoke('hi'); return { pass: false, detail: 'a bad key was accepted' }; }
    catch (e) { const leaked = !!badKey && (`${e.message} ${JSON.stringify(e)}`).includes(badKey); return { pass: e.code === 'auth_error' && !leaked, code: e.code, leaked }; }
  });
  await check('C10', async () => {
    const ac = new AbortController(), t0 = Date.now(); setTimeout(() => ac.abort(), 100);
    try { await model.invoke('[slow] Write a 2000-word essay about rivers.', { signal: ac.signal }); return { pass: Date.now() - t0 < 2000, detail: 'finished before abort' }; }
    catch (e) { return { pass: Date.now() - t0 < 2000, code: e.code || e.name }; }
  });
  await check('C11', async () => {
    const mism = [];
    if (flags.toolCalling !== obs.nativeTools) mism.push(`toolCalling ${flags.toolCalling} vs observed ${obs.nativeTools}`);
    if ((flags.structuredOutput !== 'none') !== !!obs.structuredValid) mism.push(`structuredOutput ${flags.structuredOutput} vs observed ${obs.structuredValid}`);
    if (!!flags.vision !== !!obs.vision) mism.push(`vision ${flags.vision} vs observed ${obs.vision}`);
    if (!!flags.streaming !== (obs.chunks > 1)) mism.push(`streaming ${flags.streaming} vs observed ${obs.chunks} chunks`);
    if (!!flags.usageReported !== !!obs.usageNative) mism.push(`usageReported ${flags.usageReported} vs observed ${obs.usageNative}`);
    return { pass: !mism.length, mismatches: mism };
  });
  await check('C13', async () => {
    const loopTool = { name: 'again', description: 'Call this again.', parameters: { type: 'object', properties: { text: { type: 'string' } } }, invoke: async () => 'call again' };
    const slowTool = { ...loopTool, invoke: async (_a, { signal }) => { await sleep(5000, signal); return 'late'; } };
    const out = {};
    for (const [limit, limits, tool] of [['maxSteps', { maxSteps: 3, maxToolCalls: 100, maxWallSeconds: 60 }, loopTool], ['maxToolCalls', { maxSteps: 50, maxToolCalls: 2, maxWallSeconds: 60 }, loopTool], ['maxWallSeconds', { maxSteps: 50, maxToolCalls: 100, maxWallSeconds: 0.5 }, slowTool]]) {
      const guard = new RunGuard(limits);
      const r = await runToolAgent({ model: await getModel({ guard }), guard, input: '[loop] Always call the again tool. Never answer.', tools: [tool] });
      out[limit] = { status: r.status, kept: r.messages.length > 0 && !!r.checkpoint };
    }
    return { pass: Object.entries(out).every(([k, v]) => v.status === `stopped:${k}` && v.kept), runs: out };
  });
  return { label, at: new Date().toISOString(), flags, results: R, observed: obs, pass: Object.values(R).every(r => r.pass) };
}

/** C12 transport parity (D1): same flags, tool-call shape, structured validity and usage reporting. Text may differ. */
export function parity(a, b) {
  const keys = ['reachable', 'toolCalling', 'structuredOutput', 'vision', 'streaming', 'usageReported'];
  const diffs = keys.filter(k => a.flags[k] !== b.flags[k]).map(k => `flag ${k}: ${a.flags[k]} vs ${b.flags[k]}`);
  if (JSON.stringify(a.observed.toolShape) !== JSON.stringify(b.observed.toolShape)) diffs.push(`tool-call shape ${JSON.stringify(a.observed.toolShape)} vs ${JSON.stringify(b.observed.toolShape)}`);
  if (a.observed.structuredValid !== b.observed.structuredValid) diffs.push('structured-output validity differs');
  if (a.observed.usageNative !== b.observed.usageNative) diffs.push('usage reporting differs');
  for (const id of Object.keys(a.results)) if (a.results[id].pass !== b.results[id]?.pass) diffs.push(`${id}: ${a.results[id].pass} vs ${b.results[id]?.pass}`);
  return { pass: !diffs.length, diffs };
}

// ---- CLI: npm run test:model -- <name> [--transport mcp|direct|both] [--data <dir>]
if (import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1] || '').href) {
  const { createHarness } = await import('../../src/llm/harness.js');
  const { writeJson } = await import('../../src/llm/config.js');
  const { join, resolve } = await import('node:path');
  const argv = process.argv.slice(2), name = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
  const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  if (!name) { console.error('usage: npm run test:model -- <model name> [--transport mcp|direct|both] [--data <dir>]'); process.exit(2); }
  const dataDir = resolve(arg('data', 'data'));
  const h = createHarness({ dataDir });
  const entry = h.models().models[name]; if (!entry) { console.error(`no model named "${name}" in ${dataDir}/models.json`); process.exit(2); }
  const canDirect = !['mcp', 'mcp_sampling'].includes(entry.provider);
  const want = arg('transport', canDirect ? 'both' : 'mcp');
  const runs = {};
  for (const t of want === 'both' ? ['mcp', 'direct'] : [want]) {
    const transport = t === 'direct' ? 'direct' : (entry.transport && entry.transport !== 'direct' ? entry.transport : 'inproc');
    const cfg = h.models(); cfg.models[`${name}__${t}`] = { ...entry, transport }; h.saveModels(cfg, { isAdmin: true });
    try {
      runs[t] = await runConformance({ label: `${name} (${t})`, meter: h.meter, probe: () => h.probe(`${name}__${t}`, { force: true }), getModel: ctx => h.getChatModel(`${name}__${t}`, { flowId: 'conformance', nodeId: t, ...ctx }) });
    } finally { const c = h.models(); delete c.models[`${name}__${t}`]; h.saveModels(c, { isAdmin: true }); }
  }
  const out = { model: name, runs, ...(runs.mcp && runs.direct ? { C12: parity(runs.mcp, runs.direct) } : {}) };
  out.pass = Object.values(runs).every(r => r.pass) && (out.C12?.pass ?? true);
  writeJson(join(dataDir, 'models.conformance', `${name}.json`), out);
  for (const [t, r] of Object.entries(runs)) console.log(`${t}: ${Object.entries(r.results).map(([k, v]) => `${k}:${v.pass ? 'pass' : 'FAIL'}`).join(' ')}`);
  if (out.C12) console.log(`C12 parity: ${out.C12.pass ? 'pass' : `FAIL ${out.C12.diffs.join('; ')}`}`);
  console.log(out.pass ? 'GREEN' : 'RED');
  await h.close(); process.exit(out.pass ? 0 : 1);
}
