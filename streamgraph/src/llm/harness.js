// The bring-your-own-model harness (plan §5): one entry point for every model a flow uses.
//   getChatModel(ref, ctx) -> BaseChatModel (a MeteredModel)   getEmbeddings(ref, ctx) -> Embeddings
// Transports (D1): inproc | stdio | http (MCP, preferred; inproc is the default) | sampling (MCP host) | direct (in-process).
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { loadModels, saveModels, localityOf, resolveModelRef, checkNodeModelConfig, effectiveLimits, assertModelsPatchAllowed, validateModels, writeJson } from './config.js';
import { createProviderModel, baseURLOf, headersFor, HOSTED_PRESETS } from './registry.js';
import { importCatalog } from './catalog.js';
import { resolveKeyRef, makeRedactor } from './keys.js';
import { createModelBridge, WRONG } from './bridge.js';
import { McpChatModel, McpEmbeddings } from './mcp-chat-model.js';
import { McpSamplingChatModel } from './sampling-chat-model.js';
import { MeteredModel, MeteredEmbeddings } from './metered.js';
import { Meter } from './meter.js';
import { RunGuard } from './limits.js';
import { loadPrices, savePrices, priceFor } from './prices.js';
import { probeModel, probeSampling, UNTESTED_FLAGS, probeStepMs, probeTotalMs, mcpCallMs } from './probe.js';
import { ModelError, classify } from './wire.js';

export const BRIDGE_SCRIPT = fileURLToPath(new URL('../../explore/server/model-bridge.js', import.meta.url));
const PROBE_TTL_MS = 7 * 24 * 3600 * 1000;

/**
 * @param {object} o
 * @param {string} o.dataDir           workspace data folder (models.json, model-prices.json, models.probe.json)
 * @param {(id:string)=>string} [o.secret]  studio secrets lookup for keyRef "secret:<id>" (never returned by the API)
 * @param {object} [o.env]             environment for keyRef "env:NAME"
 * @param {object} [o.engine]          AbacEngine for the locality gate (D5)
 * @param {(type:string, data:object)=>void} [o.emit]  SSE/Kafka event sink (llm.call, budget.exceeded)
 * @param {(line:string)=>void} [o.log]  log sink; every line is redacted
 * @param {string} [o.ollamaURL]       fresh-install Ollama address (default http://127.0.0.1:11434)
 * @param {object} [o.samplingServer]  MCP SDK Server when StreamGraph runs inside an MCP host (transport "sampling")
 */
export function createHarness({ dataDir, secret, env = process.env, engine, emit = () => {}, log = () => {}, ollamaURL, samplingServer } = {}) {
  mkdirSync(dataDir, { recursive: true });
  const redactAll = makeRedactor();
  const safeLog = line => log(redactAll(line));
  const cfg = () => loadModels(dataDir, { ollamaURL });
  cfg(); // seed the fresh-install defaults (D2) — no network
  const prices = () => loadPrices(dataDir);
  const meter = new Meter({ emit: (t, d) => emit(t, JSON.parse(redactAll(d))), budgets: () => cfg().budgets });
  const probeFile = join(dataDir, 'models.probe.json');
  const probes = () => (existsSync(probeFile) ? JSON.parse(readFileSync(probeFile, 'utf8')) : {});
  const clients = new Map(); let sampling = samplingServer;

  async function inprocClient() {
    if (clients.has('inproc')) return clients.get('inproc');
    const p = (async () => {
      const server = createModelBridge({ models: cfg, secret, env, prices, log: safeLog });
      const [a, b] = InMemoryTransport.createLinkedPair();
      await server.connect(a);
      const client = new Client({ name: 'streamgraph-harness', version: '0.1.0' });
      await client.connect(b);
      return client;
    })();
    clients.set('inproc', p); return p;
  }
  async function stdioClient(name, entry) {
    const key = `stdio:${name}`;
    if (clients.has(key)) return clients.get(key);
    const p = (async () => {
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
      const cmd = entry.command?.length ? entry.command : [process.execPath, BRIDGE_SCRIPT, '--data', dataDir];
      const t = new StdioClientTransport({ command: cmd[0], args: cmd.slice(1), env: Object.fromEntries(Object.entries(env).filter(([, v]) => typeof v === 'string')), stderr: 'pipe' });
      const client = new Client({ name: 'streamgraph-harness', version: '0.1.0' });
      await client.connect(t); return client;
    })().catch(e => { clients.delete(key); throw e; });
    clients.set(key, p); return p;
  }
  async function httpClient(name, entry) {
    const key = `http:${name}`;
    if (clients.has(key)) return clients.get(key);
    const p = (async () => {
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
      const token = entry.keyRef ? resolveKeyRef(entry.keyRef, { env, secret }) : undefined; redactAll.add(token);
      const t = new StreamableHTTPClientTransport(new URL(entry.url), token ? { requestInit: { headers: { authorization: `Bearer ${token}` } } } : {});
      const client = new Client({ name: 'streamgraph-harness', version: '0.1.0' });
      await client.connect(t); return client;
    })().catch(e => { clients.delete(key); throw e; });
    clients.set(key, p); return p;
  }
  const transportOf = entry => entry.provider === 'mcp_sampling' ? 'sampling' : entry.provider === 'mcp' ? (entry.url ? 'http' : 'stdio') : (entry.transport || 'inproc');

  /** A key-free factory for the inner model, by transport. Direct keys are resolved at call time, never stored on the node's object. */
  function factoryFor(name, entry, kind, redact) {
    const t = transportOf(entry), remoteName = entry.remoteModel || name;
    const direct = async () => {
      const apiKey = entry.keyRef ? (() => { try { return resolveKeyRef(entry.keyRef, { env, secret }); } catch (e) { throw new ModelError('auth_error', e.message); } })() : undefined;
      redact.add(apiKey); redactAll.add(apiKey);
      let headers;
      try { headers = headersFor(entry, ref => { const v = resolveKeyRef(ref, { env, secret }); redact.add(v); redactAll.add(v); return v; }); } catch (e) { throw new ModelError('auth_error', e.message); }
      return createProviderModel(entry, { apiKey, headers, kind });
    };
    const mcp = async client => kind === 'embed' ? new McpEmbeddings({ client, model: remoteName }) : new McpChatModel({ client, model: remoteName, adapter: entry.adapter, timeoutMs: mcpCallMs(entry, cfg()) });
    const withFallback = connect => async () => {
      try { return await mcp(await connect()); }
      catch (e) { if (entry.allowDirectFallback && !['mcp', 'mcp_sampling'].includes(entry.provider)) { safeLog(`llm ${name}: MCP bridge down (${classify(e)}), using direct (allowDirectFallback)`); return direct(); } throw e; }
    };
    if (t === 'direct') return direct;
    if (t === 'sampling') return async () => { if (!sampling) throw new ModelError('unsupported', 'StreamGraph is not running inside an MCP host, so sampling is unavailable'); return new McpSamplingChatModel({ server: sampling, hints: entry.hints, maxTokens: entry.options?.maxTokens }); };
    if (t === 'stdio') return withFallback(() => stdioClient(name, entry));
    if (t === 'http') return withFallback(() => httpClient(name, entry));
    return withFallback(inprocClient);
  }
  function lookup(ref, ctx, kind) {
    const c = cfg();
    checkNodeModelConfig(typeof ctx.node?.model === 'object' ? ctx.node.model : null);
    const { name, viaDefault } = typeof ref === 'string' && ref ? { name: ref, viaDefault: false } : resolveModelRef({ node: ctx.node, flow: ctx.flow, cfg: c, kind });
    if (!name) throw new ModelError('bad_request', `no ${kind} model configured`);
    let entry = c.models?.[name];
    if (!entry) throw new ModelError('bad_request', `no model named "${name}"`);
    if ((entry.kind || 'chat') !== kind) throw new ModelError('bad_request', kind === 'embed' ? `"${name}" is a chat model; embeddings need an embedding model` : `"${name}" is an embedding model, not a chat model`);
    if (entry.allowedRoles?.length) { const role = typeof ctx.subject === 'object' ? ctx.subject?.role : engine?.subject(ctx.subject)?.role; if (!entry.allowedRoles.includes(role)) throw new ModelError('export_denied', `your role may not use model "${name}"`, { status: 403 }); }
    const nodeOpts = typeof ctx.node?.model === 'object' ? ctx.node.model.options : null;
    if (nodeOpts) entry = { ...entry, options: { ...(entry.options || {}), ...nodeOpts } };
    return { c, name, entry, viaDefault };
  }

  const api = {
    dataDir, meter,
    models: cfg, prices, probes,
    /** Chat model for a flow node. ctx: { flowId, nodeId, subject, flow, node, guard, actor, contextTypes } */
    async getChatModel(ref, ctx = {}) {
      const { c, name, entry, viaDefault } = lookup(ref, ctx, 'chat');
      const redact = makeRedactor(), cached = probes()[name];
      const flags = WRONG() ? UNTESTED_FLAGS() : { ...(entry.capabilities || {}), ...(cached || {}) };
      const base = baseURLOf(entry) || entry.url || (entry.provider === 'ollama' ? (ollamaURL || 'http://127.0.0.1:11434') : null);
      return new MeteredModel({ name, model: entry.model, provider: entry.provider, transport: transportOf(entry), locality: localityOf(entry, c), flags, flowId: ctx.flowId, nodeId: ctx.nodeId, actor: ctx.actor, viaDefault, baseHost: base ? new URL(base).host : null },
        { factory: factoryFor(name, entry, 'chat', redact), engine, subject: ctx.subject, guard: ctx.guard, meter, price: priceFor(prices(), entry), redact: s => redactAll(redact(s)), log: safeLog, contextTypes: ctx.contextTypes, flowBudget: ctx.flow?.budget });
    },
    async getEmbeddings(ref, ctx = {}) {
      const { c, name, entry } = lookup(ref, ctx, 'embed');
      const redact = makeRedactor();
      return new MeteredEmbeddings({ name, locality: localityOf(entry, c), dims: entry.dims, flowId: ctx.flowId, nodeId: ctx.nodeId, actor: ctx.actor },
        { factory: factoryFor(name, entry, 'embed', redact), engine, subject: ctx.subject, guard: ctx.guard, meter, price: priceFor(prices(), entry), redact: s => redactAll(redact(s)), contextTypes: ctx.contextTypes });
    },
    /** Probe a model through its configured transport; cached in models.probe.json for 7 days. */
    async probe(name, { force = false, transport } = {}) {
      const c = cfg(), entry = c.models?.[name];
      if (!entry) throw new ModelError('bad_request', `no model named "${name}"`);
      const cached = probes()[name];
      if (!force && !transport && cached && Date.now() - Date.parse(cached.at) < PROBE_TTL_MS) return cached;
      const t = transport || transportOf(entry), e = transport ? { ...entry, transport } : entry, redact = makeRedactor(), stepMs = probeStepMs(entry, c);
      let flags;
      if (t === 'sampling') flags = probeSampling(sampling);
      else if (t === 'direct') {
        if (WRONG()) flags = UNTESTED_FLAGS();
        else { try { const m = await factoryFor(name, e, entry.kind || 'chat', redact)(); flags = (entry.kind || 'chat') === 'embed' ? await (async () => { const v = await m.embedDocuments(['a', 'b']); return { at: new Date().toISOString(), reachable: true, embeddings: true, dims: v[0].length, profileSource: 'probe' }; })() : await probeModel(m, { timeoutMs: stepMs }); } catch (err) { flags = { at: new Date().toISOString(), reachable: false, error: classify(err), profileSource: 'probe' }; } }
      } else {
        const client = t === 'stdio' ? await stdioClient(name, e) : t === 'http' ? await httpClient(name, e) : await inprocClient();
        try { flags = await new McpChatModel({ client, model: entry.remoteModel || name }).probe({ timeout: probeTotalMs(stepMs) }, stepMs); /* the whole probe, not one chat call's 120 s */ } catch (err) { flags = { at: new Date().toISOString(), reachable: false, error: classify(err), profileSource: 'probe' }; }
      }
      flags = { ...flags, transport: t };
      if (!transport) writeJson(probeFile, { ...probes(), [name]: flags });
      return flags;
    },
    /** A RunGuard with the effective hard stops (D3): flows may lower limits, only admins may raise them. */
    runGuard(flowLimits = {}, { isAdmin = false } = {}) { return new RunGuard(effectiveLimits(cfg().limits, flowLimits, { isAdmin })); },
    /** Registry updates: validated, literal keys rejected, baseURL/keyRef/url admin-only (A1.5). */
    saveModels(next, { isAdmin = false } = {}) { assertModelsPatchAllowed(cfg(), next, isAdmin); saveModels(dataDir, next); return cfg(); },
    savePrices(doc) { savePrices(dataDir, doc); return prices(); },
    /**
     * Import a hosted provider's model catalog (GET <base>/models) into models.json and its prices into model-prices.json.
     * Admin only. Tool support is NOT in the catalog: run probe() on a model before relying on native tools.
     */
    async importCatalog(preset, { region, baseURL, keyRef, prefix, only, isAdmin = false, fetchImpl } = {}) {
      if (!isAdmin) throw Object.assign(new Error('only an admin can import a model catalog'), { status: 403 });
      const p = HOSTED_PRESETS[preset];
      const ref = keyRef || (p ? `env:${p.keyEnv}` : undefined);
      const key = (!p || p.catalogNeedsKey) && ref ? (() => { try { return resolveKeyRef(ref, { env, secret }); } catch { return undefined; } })() : undefined;
      redactAll.add(key);
      const r = await importCatalog({ preset, region, baseURL, keyRef: ref, prefix, only, apiKey: key, fetchImpl });
      const c = cfg(); Object.assign(c.models, r.models); saveModels(dataDir, c);
      const pr = prices(); Object.assign(pr.prices, r.prices); savePrices(dataDir, pr);
      return { imported: Object.keys(r.models), prices: Object.keys(r.prices).length, source: r.source, needsApproval: r.needsApproval };
    },
    validate: validateModels,
    setSamplingServer(s) { sampling = s; },
    async close() { for (const p of clients.values()) { try { await (await p).close(); } catch { /* ignore */ } } clients.clear(); },
  };
  return api;
}
