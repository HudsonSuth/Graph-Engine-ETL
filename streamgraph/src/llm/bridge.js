// StreamGraph Model Bridge: our own small MCP server that fronts any LangChain.js provider class (plan §5.2a).
// Tools: model_list, model_probe, chat_invoke, chat_stream, embed, model_cost. Keys are resolved INSIDE this process at
// call time (keyRef env:/secret:), never returned, never logged, and every error message is redacted before it leaves.
// Runs in-process (InMemoryTransport, the default "inproc"), as a child process (stdio) or remotely (Streamable HTTP
// with a bearer token) — see explore/server/model-bridge.js.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AIMessageChunk } from '@langchain/core/messages';
import { createProviderModel, needsKey, headersFor } from './registry.js';
import { resolveKeyRef, makeRedactor } from './keys.js';
import { probeModel, UNTESTED_FLAGS, probeStepMs } from './probe.js';
import { invokeWithTools, structuredSafe } from './fallbacks.js';
import { fromWire, aiToWire, classify, ModelError, ACCESS_REQUIRED_MSG } from './wire.js';
import { priceFor, costOf } from './prices.js';
import { localityOf } from './config.js';

import { WRONG } from './wrong.js';
export { WRONG };
const ok = obj => ({ content: [{ type: 'text', text: JSON.stringify(obj) }], structuredContent: obj });

/**
 * @param {object} o
 * @param {() => object} o.models   returns the models.json document
 * @param {(name:string)=>string|undefined} [o.secret]  studio secrets lookup for keyRef "secret:<id>"
 * @param {object} [o.env]          environment for keyRef "env:NAME" (default process.env)
 * @param {() => object} [o.prices] returns the price table
 * @param {(line:string)=>void} [o.log]
 */
export function createModelBridge({ models, secret, env = process.env, prices = () => ({ prices: {} }), log = () => {} } = {}) {
  const server = new McpServer({ name: 'streamgraph-model-bridge', version: '0.1.0' }, { capabilities: { tools: {} } });
  const entryOf = name => { const e = models().models?.[name]; if (!e) throw new ModelError('bad_request', `no model named "${name}"`); if (['mcp', 'mcp_sampling'].includes(e.provider)) throw new ModelError('unsupported', `model "${name}" is not served by this bridge`); return e; };
  async function build(name, kind, set = () => {}) {
    const entry = entryOf(name), redact = makeRedactor();
    let apiKey;
    try { apiKey = entry.keyRef ? resolveKeyRef(entry.keyRef, { env, secret }) : undefined; }
    catch (e) { throw new ModelError('auth_error', e.message); }
    if (!apiKey && needsKey(entry)) throw new ModelError('auth_error', `model "${name}" needs a keyRef`);
    redact.add(apiKey); set({ redact, apiKey, entry }); // from here on, every error from this call is redacted with the exact key
    let headers;
    try { headers = headersFor(entry, ref => { const v = resolveKeyRef(ref, { env, secret }); redact.add(v); return v; }); } catch (e) { throw new ModelError('auth_error', e.message); }
    const model = await createProviderModel(entry, { apiKey, headers, kind: kind || entry.kind || 'chat' });
    return { entry, model, redact, apiKey };
  }
  const fail = (e, redact, apiKey, entry) => {
    const code = classify(e);
    const raw = code === 'access_required' ? ACCESS_REQUIRED_MSG(entry?.model || 'this model') : String(e?.message || e);
    const message = WRONG() ? `${raw}${apiKey ? ` (key ${apiKey})` : ''}` : redact(raw).slice(0, 500);
    log(`model-bridge error ${code}: ${message}`);
    return { content: [{ type: 'text', text: JSON.stringify({ error: { code, message } }) }], isError: true };
  };
  const run = fn => async (args, extra) => { let ctx = { redact: makeRedactor() }; try { return ok(await fn(args, extra, c => { ctx = c; })); } catch (e) { return fail(e, ctx.redact, ctx.apiKey, ctx.entry); } };
  const callOpts = (args, extra) => ({ signal: extra?.signal, ...(args.timeoutMs ? { timeout: args.timeoutMs } : {}) });

  server.registerTool('model_list', { title: 'List models', description: 'Configured models (names, providers, kinds, locality). Never returns keys.', inputSchema: {}, annotations: { readOnlyHint: true } },
    run(async () => ({ models: Object.entries(models().models || {}).map(([name, e]) => ({ name, provider: e.provider, model: e.model, kind: e.kind || 'chat', locality: localityOf(e, models()), transport: e.transport || 'inproc' })) })));

  server.registerTool('model_probe', { title: 'Probe a model', description: 'Live capability micro-tests: tools, structured output, vision, streaming, usage, embeddings.', inputSchema: { model: z.string(), timeoutMs: z.number().optional() } },
    run(async ({ model: name, timeoutMs }, extra, set) => {
      if (WRONG()) return { model: name, flags: UNTESTED_FLAGS() }; // wrong build: claims everything without testing
      const entry = entryOf(name);
      if ((entry.kind || 'chat') === 'embed') {
        const b = await build(name, 'embed', set);
        try { const v = await b.model.embedDocuments(['a', 'b']); return { model: name, flags: { at: new Date().toISOString(), reachable: true, embeddings: true, dims: v[0].length, profileSource: 'probe' } }; }
        catch (e) { return { model: name, flags: { at: new Date().toISOString(), reachable: false, embeddings: false, error: classify(e), profileSource: 'probe' } }; }
      }
      const b = await build(name, 'chat', set);
      return { model: name, flags: await probeModel(b.model, { signal: extra?.signal, timeoutMs: timeoutMs ?? probeStepMs(entry, models()) }) };
    }));

  const invokeSchema = { model: z.string(), messages: z.array(z.any()), tools: z.array(z.any()).optional(), toolChoice: z.string().optional(), toolCalling: z.boolean().optional(),
    responseSchema: z.record(z.string(), z.any()).optional(), structuredOutput: z.string().optional(), timeoutMs: z.number().optional() };
  const invoke = async (args, extra, set) => {
    const b = await build(args.model, 'chat', set);
    const messages = fromWire(args.messages), opts = callOpts(args, extra);
    if (args.responseSchema) { const r = await structuredSafe(b.model, messages, args.responseSchema, { structuredOutput: args.structuredOutput || 'native', ...opts }); return { message: aiToWire(r.raw), parsed: r.parsed, method: r.method }; }
    const m = await invokeWithTools(b.model, messages, args.tools, { toolChoice: args.toolChoice, toolCalling: args.toolCalling, ...opts });
    return { message: aiToWire(m) };
  };
  server.registerTool('chat_invoke', { title: 'Chat', description: 'Run a chat model: messages, optional tools and response JSON Schema. Returns the AI message JSON with usage.', inputSchema: invokeSchema }, run(invoke));

  server.registerTool('chat_stream', { title: 'Chat (streaming)', description: 'Like chat_invoke but sends each chunk as an MCP progress notification; returns the full message.', inputSchema: invokeSchema },
    run(async (args, extra, set) => {
      if (args.tools?.length || args.responseSchema) return invoke(args, extra, set); // tool calls / JSON come back whole
      const b = await build(args.model, 'chat', set);
      let full = null, n = 0; const token = extra?._meta?.progressToken;
      for await (const c of await b.model.stream(fromWire(args.messages), callOpts(args, extra))) {
        full = full ? full.concat(c) : c; n++;
        if (token !== undefined) await extra.sendNotification({ method: 'notifications/progress', params: { progressToken: token, progress: n, message: typeof c.content === 'string' ? c.content : '' } }).catch(() => {});
      }
      return { message: aiToWire(full || new AIMessageChunk('')), chunks: n };
    }));

  server.registerTool('embed', { title: 'Embed texts', description: 'Texts -> vectors with an embedding model.', inputSchema: { model: z.string(), texts: z.array(z.string()) } },
    run(async ({ model: name, texts }, extra, set) => { const b = await build(name, 'embed', set); const vectors = await b.model.embedDocuments(texts); return { vectors, dims: vectors[0]?.length || 0 }; }));

  server.registerTool('model_cost', { title: 'Cost of a call', description: 'Dollar cost of a usage record from the editable price table (null = unknown).', inputSchema: { model: z.string(), input_tokens: z.number(), output_tokens: z.number() }, annotations: { readOnlyHint: true } },
    run(async ({ model: name, input_tokens, output_tokens }) => { const p = priceFor(prices(), entryOf(name)); return { cost: costOf(p, { input_tokens, output_tokens }), price: p }; }));
  return server;
}
