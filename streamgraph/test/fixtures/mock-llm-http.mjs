// Mock OpenAI-compatible and Ollama HTTP servers for offline tests. Counts hits; a wrong bearer key gets a 401 whose
// message echoes the key (as some real providers partially do), so redaction is tested end to end.
import { createServer } from 'node:http';

const readJson = async req => { const c = []; for await (const x of req) c.push(x); return c.length ? JSON.parse(Buffer.concat(c).toString('utf8')) : {}; };
const lastText = msgs => { const m = msgs.at(-1); return typeof m?.content === 'string' ? m.content : (m?.content || []).filter(b => b.type === 'text').map(b => b.text).join(''); };
const listen = srv => new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));

export async function mockOpenAI({ key = 'sk-test-GOODfakeKEY0123456789abcdef' } = {}) {
  const hits = [];
  const srv = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'); hits.push(`${req.method} ${url.pathname}`);
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const auth = String(req.headers.authorization || '');
    if (key && auth !== `Bearer ${key}`) { await readJson(req); return send(401, { error: { message: `Incorrect API key provided: ${auth.replace(/^Bearer /, '')}`, type: 'invalid_request_error', code: 'invalid_api_key' } }); }
    const b = await readJson(req);
    if (url.pathname.endsWith('/models')) return send(200, { object: 'list', data: [{ id: 'mock-model', object: 'model' }] });
    if (url.pathname.endsWith('/embeddings')) { const input = [].concat(b.input); return send(200, { object: 'list', data: input.map((_, i) => ({ object: 'embedding', index: i, embedding: [0.1, 0.2, 0.3, 0.4] })), model: b.model, usage: { prompt_tokens: 2, total_tokens: 2 } }); }
    if (url.pathname.endsWith('/chat/completions')) {
      const text = `mock: ${lastText(b.messages)}`;
      const tool = b.tools?.[0]?.function;
      const message = tool ? { role: 'assistant', content: null, tool_calls: [{ id: 'call_mock', type: 'function', function: { name: tool.name, arguments: JSON.stringify({ text: 'hi' }) } }] } : { role: 'assistant', content: text };
      if (b.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.write(`data: ${JSON.stringify({ id: 'c1', object: 'chat.completion.chunk', created: 1, model: b.model, choices: [{ index: 0, delta: { role: 'assistant', content: text }, finish_reason: null }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ id: 'c1', object: 'chat.completion.chunk', created: 1, model: b.model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`);
        return res.end('data: [DONE]\n\n');
      }
      return send(200, { id: 'c1', object: 'chat.completion', created: 1, model: b.model, choices: [{ index: 0, message, finish_reason: tool ? 'tool_calls' : 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } });
    }
    send(404, { error: { message: 'not found' } });
  });
  await listen(srv);
  return { url: `http://127.0.0.1:${srv.address().port}/v1`, hits, close: () => new Promise(r => srv.close(r)) };
}

/** thinkChunks: like qwen3, stream that many `thinking` chunks (empty content) before the answer, chunkDelayMs apart. */
export async function mockOllama({ thinkChunks = 0, chunkDelayMs = 0 } = {}) {
  const hits = [];
  const srv = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'); hits.push(`${req.method} ${url.pathname}`);
    const b = await readJson(req);
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (url.pathname === '/api/tags') return send(200, { models: [{ name: 'llama3.1:8b' }, { name: 'nomic-embed-text' }] });
    if (url.pathname === '/api/embed') return send(200, { model: b.model, embeddings: [].concat(b.input).map(() => [0.5, 0.25, 0.125]) });
    if (url.pathname === '/api/chat') {
      const msg = { role: 'assistant', content: `ollama: ${lastText(b.messages || [])}` };
      const done = { model: b.model, created_at: new Date().toISOString(), message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 4, eval_count: 2 };
      if (b.stream === false) return send(200, { ...done, message: msg });
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      for (let i = 0; i < thinkChunks; i++) { res.write(JSON.stringify({ model: b.model, created_at: new Date().toISOString(), message: { role: 'assistant', content: '', thinking: 'hmm ' }, done: false }) + '\n'); if (chunkDelayMs) await new Promise(r => setTimeout(r, chunkDelayMs)); }
      res.write(JSON.stringify({ model: b.model, created_at: new Date().toISOString(), message: msg, done: false }) + '\n');
      return res.end(JSON.stringify(done) + '\n');
    }
    send(404, { error: 'not found' });
  });
  await listen(srv);
  return { url: `http://127.0.0.1:${srv.address().port}`, hits, close: () => new Promise(r => srv.close(r)) };
}

/**
 * Mock hosted aggregator copying the Inference.net API shape (GET /v1/models needs no key; items carry context_length,
 * max_completion_tokens, reasoning_efforts, input/output_modalities, supported_endpoints, pricing in USD per token, and
 * requires_approved_access/access_status on privileged models). Chat: models in `noTools` reject `tools` with a 400;
 * a privileged model returns 403 { error: { type: "model_access_required" } }. Records request headers.
 */
export const INFERENCE_CATALOG = [
  { id: 'meta-llama/llama-3.1-8b-instruct', object: 'model', owned_by: 'system', context_length: 131072, max_completion_tokens: 16384, input_modalities: ['text'], output_modalities: ['text'], supported_endpoints: ['chat', 'responses', 'messages'], pricing: { prompt: '0.000000025000', completion: '0.000000060000' } },
  { id: 'llama-3.2-1b-instruct', object: 'model', owned_by: 'system', context_length: 60000, max_completion_tokens: 60000, input_modalities: ['text'], output_modalities: ['text'], supported_endpoints: ['chat', 'responses', 'messages'], pricing: { prompt: '0.000000027000', completion: '0.000000201000' } },
  { id: 'inference-net/schematron-v2-small', object: 'model', owned_by: 'system', context_length: 128000, max_completion_tokens: 4096, input_modalities: ['text'], output_modalities: ['text'], supported_endpoints: ['chat', 'responses', 'messages'], pricing: { prompt: '0.000000050000', completion: '0.000000230000', input_cache_read: '0.000000050000' } },
  { id: 'qwen-vl-max', object: 'model', owned_by: 'system', context_length: 262144, max_completion_tokens: 32768, reasoning_efforts: ['none', 'low', 'high'], input_modalities: ['text', 'image'], output_modalities: ['text'], supported_endpoints: ['chat', 'responses'], pricing: { prompt: '0.000001000000', completion: '0.000004000000' } },
  { id: 'claude-private-preview', object: 'model', owned_by: 'system', context_length: 1000000, max_completion_tokens: 128000, input_modalities: ['text', 'image'], output_modalities: ['text'], supported_endpoints: ['chat', 'messages'], pricing: { prompt: '0.000010000000', completion: '0.000050000000' }, requires_approved_access: true, access_status: 'not_requested' },
];
export async function mockInference({ key = 'inf-test-GOODkey-0123456789', noTools = ['llama-3.2-1b-instruct', 'inference-net/schematron-v2-small'], privileged = ['claude-private-preview'] } = {}) {
  const hits = [], headers = [];
  const srv = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'); hits.push(`${req.method} ${url.pathname}`); headers.push(req.headers);
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.method === 'GET' && url.pathname === '/v1/models') return send(200, { object: 'list', data: INFERENCE_CATALOG }); // no key needed
    const b = await readJson(req);
    if (String(req.headers.authorization || '') !== `Bearer ${key}`) return send(401, { error: { message: `Invalid API key: ${String(req.headers.authorization || '').replace(/^Bearer /, '')}`, type: 'authentication_error' } });
    if (url.pathname !== '/v1/chat/completions') return send(404, { error: { message: 'not found' } });
    if (privileged.includes(b.model)) return send(403, { error: { message: `Access to model ${b.model} requires approval.`, type: 'model_access_required', code: 'model_access_required' } });
    if (b.tools?.length && noTools.includes(b.model)) return send(400, { error: { message: `Model ${b.model} does not support tools`, type: 'invalid_request_error' } });
    const sys = (b.messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
    const last = lastText(b.messages || []);
    let message;
    if (b.tools?.length) message = { role: 'assistant', content: null, tool_calls: [{ id: 'call_inf', type: 'function', function: { name: b.tools[0].function.name, arguments: JSON.stringify({ text: 'hi' }) } }] };
    else if (sys.includes('TOOLS (prompt-based tool calling)')) message = { role: 'assistant', content: /^Tool result for /.test(last) ? JSON.stringify({ final: 'done' }) : JSON.stringify({ action: /- ([\w-]+):/.exec(sys)[1], args: { text: 'hi' } }) };
    else message = { role: 'assistant', content: `inference: ${last}` };
    if (b.stream) { // OpenAI SSE shape, split into word chunks so streaming is real
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const ev = (delta, finish = null, usage) => res.write(`data: ${JSON.stringify({ id: 'c1', object: 'chat.completion.chunk', created: 1, model: b.model, choices: [{ index: 0, delta, finish_reason: finish }], ...(usage ? { usage } : {}) })}\n\n`);
      if (message.tool_calls) ev({ role: 'assistant', tool_calls: message.tool_calls.map((t, index) => ({ index, ...t })) });
      else for (const [i, w] of String(message.content).split(/(?<= )/).entries()) ev(i ? { content: w } : { role: 'assistant', content: w });
      ev({}, message.tool_calls ? 'tool_calls' : 'stop', { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 });
      return res.end('data: [DONE]\n\n');
    }
    send(200, { id: 'c1', object: 'chat.completion', created: 1, model: b.model, choices: [{ index: 0, message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 } });
  });
  await listen(srv);
  return { url: `http://127.0.0.1:${srv.address().port}/v1`, hits, headers, close: () => new Promise(r => srv.close(r)) };
}
