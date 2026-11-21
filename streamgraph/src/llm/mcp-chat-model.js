// McpChatModel: a LangChain BaseChatModel that talks MCP. Behind it is either our Model Bridge (chat_invoke) or a
// vendor's own model MCP server mapped with a small adapter config { invokeTool, argsMap, resultPath } (plan §5.2b).
// Nodes cannot tell which transport is behind a model.
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { toWire, toolsToWire, aiFromWire, textOf, ModelError } from './wire.js';

const parseResult = r => {
  const txt = r?.content?.find?.(c => c.type === 'text')?.text;
  let body = r?.structuredContent;
  if (!body && txt) { try { body = JSON.parse(txt); } catch { body = { text: txt }; } }
  if (r?.isError) { const e = body?.error || { code: 'error', message: txt || 'model call failed' }; throw new ModelError(e.code || 'error', e.message || 'model call failed'); }
  return body || {};
};
const pointer = (obj, p) => !p ? obj : String(p).split('/').slice(1).map(s => s.replace(/~1/g, '/').replace(/~0/g, '~')).reduce((o, k) => (o == null ? o : o[k]), obj);

export class McpChatModel extends BaseChatModel {
  static lc_name() { return 'McpChatModel'; }
  lc_serializable = false;
  /** @param {{ client: import('@modelcontextprotocol/sdk/client/index.js').Client, model: string, adapter?: object, timeoutMs?: number }} f */
  constructor(f) { super({}); this.client = f.client; this.remoteModel = f.model; this.adapter = f.adapter || null; this.timeoutMs = f.timeoutMs || 120000; }
  _llmType() { return 'mcp'; }
  bindTools(tools, kwargs = {}) {
    if (this.adapter) throw new ModelError('unsupported', 'this MCP model adapter does not support native tool calling');
    return this.withConfig({ tools: toolsToWire(tools), tool_choice: kwargs.tool_choice });
  }
  async #call(name, args, options) {
    const r = await this.client.callTool({ name, arguments: args }, undefined, { signal: options?.signal, timeout: options?.timeout || this.timeoutMs });
    return parseResult(r);
  }
  async _generate(messages, options) {
    if (this.adapter) return this.#adapterGenerate(messages, options);
    const toolChoice = typeof options.tool_choice === 'string' ? options.tool_choice : options.tool_choice?.function?.name;
    const body = await this.#call('chat_invoke', { model: this.remoteModel, messages: toWire(messages), ...(options.tools?.length ? { tools: options.tools, toolChoice } : {}), ...(options.timeout ? { timeoutMs: options.timeout } : {}) }, options);
    const message = aiFromWire(body.message || {});
    return { generations: [{ text: textOf(message), message }] };
  }
  /** Streaming over MCP: chat_stream sends each chunk as a progress notification; the final result carries usage. */
  async *_streamResponseChunks(messages, options) {
    if (this.adapter || options.tools?.length) { const r = await this._generate(messages, options); const m = r.generations[0].message; yield new ChatGenerationChunk({ text: textOf(m), message: new AIMessageChunk({ content: m.content, tool_calls: m.tool_calls, usage_metadata: m.usage_metadata }) }); return; }
    const queue = []; let wake = null, done = false, failure = null, final = null;
    const push = x => { queue.push(x); wake?.(); };
    this.client.callTool({ name: 'chat_stream', arguments: { model: this.remoteModel, messages: toWire(messages) } }, undefined, { signal: options?.signal, timeout: options?.timeout || this.timeoutMs, resetTimeoutOnProgress: true, onprogress: p => push(p.message || '') })
      .then(r => { final = parseResult(r); }, e => { failure = e; }).finally(() => { done = true; wake?.(); });
    let streamed = 0;
    for (;;) {
      if (queue.length) { const t = queue.shift(); streamed++; yield new ChatGenerationChunk({ text: t, message: new AIMessageChunk({ content: t }) }); continue; }
      if (done) break;
      await new Promise(r => { wake = r; }); wake = null;
    }
    if (failure) throw failure;
    try { final = final && final.message ? final : parseResult(final); } catch (e) { throw e; }
    const fm = aiFromWire(final.message || {});
    if (!streamed && textOf(fm)) yield new ChatGenerationChunk({ text: textOf(fm), message: new AIMessageChunk({ content: fm.content }) });
    yield new ChatGenerationChunk({ text: '', message: new AIMessageChunk({ content: '', usage_metadata: fm.usage_metadata || undefined }) });
  }
  /** Structured output done by the bridge (native -> JSON mode -> prompt + validate), so MCP and direct share one fallback. */
  async invokeStructured(messages, schema, { structuredOutput, ...options } = {}) {
    const body = await this.#call('chat_invoke', { model: this.remoteModel, messages: toWire(messages), responseSchema: schema, structuredOutput }, options);
    return { parsed: body.parsed, raw: aiFromWire(body.message || {}), method: body.method };
  }
  async #adapterGenerate(messages, options) {
    const a = this.adapter, args = {};
    const prompt = messages.map(m => `${m._getType()}: ${textOf(m)}`).join('\n');
    for (const [k, src] of Object.entries(a.argsMap || { prompt: '$prompt' })) args[k] = src === '$prompt' ? prompt : src === '$messages' ? toWire(messages) : src === '$model' ? this.remoteModel : src === '$last' ? textOf(messages.at(-1)) : src;
    const body = await this.#call(a.invokeTool, args, options);
    const v = pointer(body, a.resultPath || '/text');
    const message = new AIMessage({ content: typeof v === 'string' ? v : JSON.stringify(v ?? '') });
    return { generations: [{ text: textOf(message), message }] };
  }
  async probe(options, stepMs) { return (await this.#call('model_probe', { model: this.remoteModel, ...(stepMs ? { timeoutMs: stepMs } : {}) }, options)).flags; }
}
export class McpEmbeddings extends Embeddings {
  constructor(f) { super({}); this.client = f.client; this.remoteModel = f.model; }
  async embedDocuments(texts) { const r = parseResult(await this.client.callTool({ name: 'embed', arguments: { model: this.remoteModel, texts } })); return r.vectors; }
  async embedQuery(text) { return (await this.embedDocuments([text]))[0]; }
}
