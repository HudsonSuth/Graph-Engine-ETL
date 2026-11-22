// MeteredModel: the one wrapper every model goes through, whatever the transport (inproc/stdio/http MCP, sampling or
// direct). It enforces, identically for every path:
//   - actor stamping grokbot/<flow>/<node>; agents can never act as human:
//   - the hard stops (D3) through the run's RunGuard (abort signal + step checks)
//   - the locality gate (D5): a REMOTE model needs ABAC `export` (plus `read`) on every entity type in the prompt
//     context; a LOCAL model needs `read`. On refusal nothing is sent.
//   - fallbacks (prompt-based tools, structured output), buffered streaming, usage estimates
//   - metering + soft budgets, and redaction of keys from every error and log line
import { createHash } from 'node:crypto';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import { AIMessageChunk, coerceMessageLikeToMessage } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { RunnableLambda } from '@langchain/core/runnables';
import { invokeWithTools, structuredSafe } from './fallbacks.js';
import { toolsToWire, textOf, ModelError, safeError, ACCESS_REQUIRED_MSG } from './wire.js';
import { costOf, estimateTokens } from './prices.js';
import { WRONG } from './wrong.js';

export const HUMAN = /^\s*human:/i;
export function actorFor({ actor, flowId, nodeId } = {}) {
  const a = actor || `grokbot/${flowId || 'adhoc'}/${nodeId || 'node'}`;
  if (HUMAN.test(a)) throw new ModelError('bad_request', 'agents cannot act as a human: actor', { status: 403 });
  return a;
}
/** Locality gate (D5). Throws export_denied without sending anything. */
export async function localityGate({ locality, types = [], subject, engine }) {
  const list = [...new Set(types.filter(Boolean))];
  if (!list.length) return;
  const actions = locality === 'remote' ? ['read', 'export'] : ['read'];
  const failed = [];
  for (const entity of list) for (const action of actions) {
    const ok = engine && subject ? (await engine.decide({ subject: typeof subject === 'string' ? undefined : subject, subjectId: typeof subject === 'string' ? subject : undefined, action, entity, env: { via: 'llm' } })).allow : false;
    if (!ok) failed.push({ entity, action });
  }
  if (!failed.length) return;
  const exp = [...new Set(failed.filter(f => f.action === 'export').map(f => f.entity))], rd = [...new Set(failed.filter(f => f.action === 'read').map(f => f.entity))];
  const msg = rd.length ? `you need read rights on ${rd.join(', ')}` : `this model is remote; you need export rights on ${exp.join(', ')}`;
  throw new ModelError('export_denied', msg, { status: 403 });
}
const promptHash = (messages, redact) => createHash('sha256').update(redact(messages.map(m => `${m._getType?.()}:${textOf(m)}`).join('\n'))).digest('hex').slice(0, 16);
const anySignal = (...s) => { const l = s.filter(Boolean); return l.length ? (l.length === 1 ? l[0] : AbortSignal.any(l)) : undefined; };

export class MeteredModel extends BaseChatModel {
  static lc_name() { return 'MeteredModel'; }
  lc_serializable = false;
  #factory; #svc;
  /**
   * @param {object} f  public, key-free description: { name, provider, model, transport, locality, flags, flowId, nodeId, actor, viaDefault }
   * @param {object} svc private services: { factory: async () => BaseChatModel, engine, subject, guard, meter, price, redact, log, contextTypes, flowBudget }
   */
  constructor(f, svc) {
    super({});
    Object.assign(this, { modelName: f.name, providerModel: f.model, provider: f.provider, transport: f.transport, locality: f.locality, flags: f.flags || {}, flowId: f.flowId, nodeId: f.nodeId, viaDefault: !!f.viaDefault, baseHost: f.baseHost });
    this.actor = actorFor(f);
    this.#factory = svc.factory; this.#svc = svc;
  }
  _llmType() { return `metered:${this.provider}`; }
  /** Prompt-context entity types for the locality gate (after ABAC filtering, the types actually placed in the prompt). */
  withContextTypes(types) { return this.withConfig({ contextTypes: types }); }
  bindTools(tools, kwargs = {}) { return this.withConfig({ tools: toolsToWire(tools), tool_choice: kwargs.tool_choice }); }
  withStructuredOutput(schema, config = {}) {
    const json = schema?._def || schema?._zod ? (() => { throw new ModelError('bad_request', 'pass a JSON Schema object'); })() : schema;
    return RunnableLambda.from(async (input, cfg) => {
      const msgs = (Array.isArray(input) ? input : [input]).map(coerceMessageLikeToMessage);
      const r = await this.invokeStructured(msgs, json, { signal: cfg?.signal, contextTypes: cfg?.configurable?.contextTypes });
      return config.includeRaw ? { raw: r.raw, parsed: r.parsed } : r.parsed;
    });
  }
  async #before(messages, options) {
    const s = this.#svc;
    s.guard?.check();
    await localityGate({ locality: this.locality, types: [...(s.contextTypes || []), ...(options?.contextTypes || [])], subject: s.subject, engine: s.engine });
    return { signal: anySignal(options?.signal, s.guard?.signal), ...(options?.timeout ? { timeout: options.timeout } : {}) };
  }
  #fail(e) {
    const s = this.#svc;
    if (s.guard?.stopped) throw s.guard.stopped;
    const err = safeError(e, s.redact);
    if (err.code === 'access_required' && !/approved access/.test(err.message)) err.message = ACCESS_REQUIRED_MSG(this.providerModel || this.modelName);
    if (this.viaDefault && err.code === 'unreachable' && !WRONG()) err.message = `default model unreachable: "${this.modelName}"${this.baseHost ? ` at ${this.baseHost}` : ''} did not answer. Start it (for Ollama: ollama serve) or pick another model. No other model was tried.`;
    s.log?.(s.redact(`llm ${this.actor} ${this.modelName} error ${err.code}: ${err.message}`));
    throw err;
  }
  #after(message, messages, t0) {
    const s = this.#svc, u = message?.usage_metadata;
    const usage = u ? { input_tokens: u.input_tokens || 0, output_tokens: u.output_tokens || 0, total_tokens: u.total_tokens || (u.input_tokens || 0) + (u.output_tokens || 0) }
      : (() => { const i = estimateTokens(messages.map(textOf).join('\n')), o = estimateTokens(textOf(message)); return { input_tokens: i, output_tokens: o, total_tokens: i + o }; })();
    const cost = s.price?.billedByHost ? null : costOf(s.price, usage);
    s.meter?.record({ flowId: this.flowId, nodeId: this.nodeId, actor: this.actor, model: this.modelName, transport: this.transport, locality: this.locality, usage, estimated: !u, cost, priceKnown: cost != null, billedByHost: !!s.price?.billedByHost, latencyMs: Date.now() - t0, promptHash: promptHash(messages, s.redact), flowBudget: s.flowBudget });
    if (!u && message) message.usage_metadata = { ...usage }; // marked estimated in the meter record
  }
  /** Some providers (ChatOllama) return the partial reply when aborted or timed out instead of throwing: never pass that off as an answer. */
  static #aborted(signal) { if (signal?.aborted) throw signal.reason?.name ? signal.reason : Object.assign(new Error('Aborted'), { name: 'AbortError' }); }
  async _generate(messages, options) {
    const opts = await this.#before(messages, options), t0 = Date.now();
    let m;
    try { const inner = await this.#factory(); m = await invokeWithTools(inner, messages, options.tools, { toolChoice: typeof options.tool_choice === 'string' ? options.tool_choice : undefined, toolCalling: this.flags.toolCalling, ...opts, onDropped: n => this.#svc.log?.(`llm ${this.actor} dropped a call to non-allowlisted tool "${n}"`) }); MeteredModel.#aborted(opts.signal); }
    catch (e) { this.#fail(e); }
    this.#after(m, messages, t0);
    return { generations: [{ text: textOf(m), message: m }] };
  }
  async *_streamResponseChunks(messages, options, runManager) {
    if (options.tools?.length || this.flags.streaming === false) { // buffer: one chunk
      const r = await this._generate(messages, options); const m = r.generations[0].message;
      yield new ChatGenerationChunk({ text: textOf(m), message: new AIMessageChunk({ content: m.content, tool_calls: m.tool_calls, usage_metadata: m.usage_metadata }) }); return;
    }
    const opts = await this.#before(messages, options), t0 = Date.now();
    let full = null;
    try {
      const inner = await this.#factory();
      for await (const c of await inner.stream(messages, opts)) { full = full ? full.concat(c) : c; await runManager?.handleLLMNewToken(textOf(c)); yield new ChatGenerationChunk({ text: textOf(c), message: c }); }
      MeteredModel.#aborted(opts.signal);
    } catch (e) { this.#fail(e); }
    this.#after(full, messages, t0);
  }
  async invokeStructured(messages, schema, options = {}) {
    const opts = await this.#before(messages, options), t0 = Date.now();
    let r;
    try {
      const inner = await this.#factory();
      r = typeof inner.invokeStructured === 'function' ? await inner.invokeStructured(messages, schema, { structuredOutput: this.flags.structuredOutput, ...opts })
        : await structuredSafe(inner, messages, schema, { structuredOutput: this.flags.structuredOutput || 'native', ...opts });
      MeteredModel.#aborted(opts.signal);
    } catch (e) { this.#fail(e); }
    this.#after(r.raw, messages, t0);
    return r;
  }
}

/** Embeddings with the same locality gate, redaction and metering (plan §5.6). */
export class MeteredEmbeddings extends Embeddings {
  #factory; #svc;
  constructor(f, svc) { super({}); Object.assign(this, { modelName: f.name, providerModel: f.model, locality: f.locality, dims: f.dims, flowId: f.flowId, nodeId: f.nodeId }); this.actor = actorFor(f); this.#factory = svc.factory; this.#svc = svc; }
  async embedDocuments(texts, { contextTypes = [] } = {}) {
    const s = this.#svc; s.guard?.check();
    await localityGate({ locality: this.locality, types: [...(s.contextTypes || []), ...contextTypes], subject: s.subject, engine: s.engine });
    try { const v = await (await this.#factory()).embedDocuments(texts); s.meter?.record({ flowId: this.flowId, nodeId: this.nodeId, actor: this.actor, model: this.modelName, kind: 'embed', usage: { input_tokens: estimateTokens(texts.join(' ')), output_tokens: 0, total_tokens: estimateTokens(texts.join(' ')) }, estimated: true, cost: s.price?.embedPer1M != null ? estimateTokens(texts.join(' ')) * s.price.embedPer1M / 1e6 : null }); return v; }
    catch (e) { throw safeError(e, s.redact); }
  }
  async embedQuery(t) { return (await this.embedDocuments([t]))[0]; }
}
