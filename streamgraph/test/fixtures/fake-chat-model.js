// Deterministic fake chat model + embeddings for the offline LLM harness tests (no network, no paid calls).
// Behaviour is driven by constructor flags (toolCalling, structuredOutput, vision, streaming, usage) and by markers in
// the prompt: "[slow]" waits 10 s (abortable), "[loop]" always calls a tool again (for the hard-stop tests).
// A wrong apiKey throws a 401 that ECHOES the key, so the redaction tests have something to catch.
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { convertToOpenAITool } from '@langchain/core/utils/function_calling';
import { registerProvider } from '../../src/llm/registry.js';

export const GOOD_KEY = 'sk-test-GOODfakeKEY0123456789abcdef';
export const BAD_KEY = 'BADfakeKEY-9876543210-zyxwvu'; // deliberately NOT key-shaped: only exact-value redaction can hide it
const textOf = m => (typeof m.content === 'string' ? m.content : (m.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));
const hasImage = m => Array.isArray(m.content) && m.content.some(b => b.type === 'image_url' || b.type === 'image');
const sleep = (ms, signal) => new Promise((res, rej) => {
  if (signal?.aborted) return rej(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
  const t = setTimeout(res, ms); signal?.addEventListener('abort', () => { clearTimeout(t); rej(signal.reason?.name === 'TimeoutError' ? signal.reason : Object.assign(new Error('Aborted'), { name: 'AbortError' })); }, { once: true });
});
/** Deterministic value for a JSON Schema: integers 2, numbers 2, booleans true, strings from `seed`. */
export function sample(schema, seed = 'x') {
  if (!schema || typeof schema !== 'object') return null;
  if (schema.enum) return schema.enum[0];
  switch (schema.type) {
    case 'object': return Object.fromEntries(Object.entries(schema.properties || {}).map(([k, s]) => [k, sample(s, seed)]));
    case 'array': return [sample(schema.items, seed)];
    case 'integer': case 'number': return 2;
    case 'boolean': return true;
    case 'string': return seed;
    default: return seed;
  }
}
let seq = 0;
export class FakeChatModel extends BaseChatModel {
  static lc_name() { return 'FakeChatModel'; }
  constructor(f = {}) {
    super({});
    this.toolCalling = f.toolCalling !== false; this.structuredOutput = f.structuredOutput || 'native'; this.vision = f.vision !== false;
    this.streamingOn = f.streaming !== false; this.usage = f.usage !== false; this.expectedKey = f.expectedKey ?? GOOD_KEY; this.delayMs = f.delayMs || 0; this.silentAbort = !!f.silentAbort;
    Object.defineProperty(this, 'apiKey', { value: f.apiKey, enumerable: false });
  }
  _llmType() { return 'fake'; }
  bindTools(tools, kwargs = {}) {
    if (!this.toolCalling) throw Object.assign(new Error('this model does not support tool calling'), { code: 'unsupported' });
    return this.withConfig({ tools: tools.map(t => (t.type === 'function' ? t : convertToOpenAITool(t))), tool_choice: kwargs.tool_choice });
  }
  withStructuredOutput(schema, config = {}) {
    if (this.structuredOutput === 'native' && config.method !== 'jsonMode') return super.withStructuredOutput(schema, config);
    throw Object.assign(new Error(`structured output via ${config.method || 'tools'} is not supported`), { code: 'unsupported' });
  }
  #reply(messages, options) {
    const last = messages.at(-1), all = messages.map(textOf).join('\n'), lastText = textOf(last);
    if (messages.some(hasImage) && !this.vision) throw Object.assign(new Error('400 this model does not accept images'), { status: 400 });
    const tools = options.tools || [];
    const sys = messages.filter(m => m._getType() === 'system').map(textOf).join('\n');
    if (tools.length) {
      const forced = typeof options.tool_choice === 'string' ? options.tool_choice : options.tool_choice?.function?.name;
      const loop = all.includes('[loop]');
      if (last._getType() === 'human' || (loop && last._getType() === 'tool') || forced) {
        const t = tools.find(x => x.function.name === forced) || tools[0];
        return new AIMessage({ content: '', tool_calls: [{ id: `call_${++seq}`, name: t.function.name, args: sample(t.function.parameters, lastText.slice(0, 40) || 'x'), type: 'tool_call' }] });
      }
      return new AIMessage(`done: ${lastText}`);
    }
    if (sys.includes('TOOLS (prompt-based tool calling)')) {
      const name = /- ([\w-]+):/.exec(sys)?.[1], params = JSON.parse(/args JSON Schema: (.*)/.exec(sys)?.[1] || '{}');
      if (all.includes('[loop]') || !/^Tool result for /.test(lastText)) return new AIMessage(JSON.stringify({ action: name, args: sample(params, lastText.slice(0, 40)) }));
      return new AIMessage(JSON.stringify({ final: `done: ${lastText}` }));
    }
    if (sys.includes('Reply only with JSON that matches this JSON Schema')) {
      const schema = JSON.parse(sys.split('\n')[1]);
      return new AIMessage(JSON.stringify(sample(schema)));
    }
    if (messages.some(hasImage)) return new AIMessage('I see 1 image.');
    return new AIMessage(`echo: ${lastText}`);
  }
  #usage(messages, m) { if (!this.usage) return; const i = Math.ceil(messages.map(textOf).join('').length / 4), o = Math.ceil(textOf(m).length / 4) + (m.tool_calls?.length ? 5 : 0); m.usage_metadata = { input_tokens: i, output_tokens: o, total_tokens: i + o }; }
  #auth() { if (this.expectedKey && this.apiKey !== this.expectedKey) throw Object.assign(new Error(`401 Unauthorized: invalid api key "${this.apiKey}"`), { status: 401 }); }
  async _generate(messages, options) {
    if (this.delayMs) await sleep(this.delayMs, options?.signal); // a slow model (CPU Ollama), abortable
    this.#auth();
    if (messages.map(textOf).join('\n').includes('[slow]')) await sleep(10000, options.signal).catch(e => { if (!this.silentAbort) throw e; });
    // silentAbort mimics @langchain/ollama 1.3: on abort it stops reading and returns the partial reply instead of throwing
    if (options.signal?.aborted) { if (!this.silentAbort) throw Object.assign(new Error('Aborted'), { name: 'AbortError' }); const p = new AIMessageChunk({ content: 'Rivers are' }); return { generations: [{ text: 'Rivers are', message: p }] }; }
    const r = this.#reply(messages, options); this.#usage(messages, r);
    const m = new AIMessageChunk({ content: r.content, tool_calls: r.tool_calls || [], usage_metadata: r.usage_metadata }); // chunk: what core's base withStructuredOutput parser expects
    return { generations: [{ text: textOf(m), message: m }] };
  }
  async *_streamResponseChunks(messages, options) {
    if (!this.streamingOn || options.tools?.length) { const r = await this._generate(messages, options); const m = r.generations[0].message; yield new ChatGenerationChunk({ text: textOf(m), message: new AIMessageChunk({ content: m.content, tool_calls: m.tool_calls, usage_metadata: m.usage_metadata }) }); return; }
    this.#auth();
    const m = this.#reply(messages, options); this.#usage(messages, m);
    const words = textOf(m).split(/(?<= )/);
    for (let i = 0; i < words.length; i++) { if (options.signal?.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' }); yield new ChatGenerationChunk({ text: words[i], message: new AIMessageChunk({ content: words[i], ...(i === words.length - 1 && m.usage_metadata ? { usage_metadata: m.usage_metadata } : {}) }) }); }
  }
}
export class FakeEmbeddings extends Embeddings {
  constructor(f = {}) { super({}); this.dims = f.dims || 8; Object.defineProperty(this, 'apiKey', { value: f.apiKey, enumerable: false }); this.expectedKey = f.expectedKey ?? GOOD_KEY; }
  async embedDocuments(texts) {
    if (this.expectedKey && this.apiKey !== this.expectedKey) throw Object.assign(new Error(`401 Unauthorized: invalid api key "${this.apiKey}"`), { status: 401 });
    return texts.map(t => Array.from({ length: this.dims }, (_, i) => ((String(t).charCodeAt(i % Math.max(1, t.length)) || 7) * (i + 1)) % 97 / 97));
  }
  async embedQuery(t) { return (await this.embedDocuments([t]))[0]; }
}
/** Register provider "fake" (flags from entry.options.fake). Used in-process and by the stdio bridge fixture. */
export function registerFake() {
  registerProvider('fake', {
    needsKey: true,
    chat: (entry, { apiKey }) => new FakeChatModel({ ...(entry.options?.fake || {}), apiKey }),
    embed: (entry, { apiKey }) => new FakeEmbeddings({ dims: entry.dims, apiKey }),
  });
}
registerFake();
