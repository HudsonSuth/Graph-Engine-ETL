// Capability probe (plan §5.4): live micro-tests, each with a tiny token budget. Live results win over static hints.
// The same function runs inside the Model Bridge (MCP transports) and in-process (direct), so both report the same flags.
import { HumanMessage } from '@langchain/core/messages';
import { localityOf } from './config.js';
import { invokeWithTools, structuredSafe } from './fallbacks.js';
import { classify, textOf } from './wire.js';

export const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
export const ECHO_TOOL = { name: 'echo', description: 'Echo the given text back.', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } };
export const N_SCHEMA = { type: 'object', properties: { n: { type: 'integer' } }, required: ['n'], additionalProperties: false };
const small = { maxTokens: 20 };

/** Run the probe against a raw LangChain chat model (and optional embeddings). Never throws; failures become flags. */
/** Per-step probe timeout. A local model on CPU (for example qwen3 on Ollama, which thinks before it answers) can take
 * 20 s or more per micro-test, so local models get 120 s; remote ones keep 30 s. entry.probeTimeoutMs overrides both. */
export const probeStepMs = (entry, cfg) => entry?.probeTimeoutMs ?? (localityOf(entry, cfg) === 'local' ? 120000 : 30000);
/** The probe makes at most this many sequential model calls (reply, tools, 3 structured modes x up to 2 tries, vision, stream). */
export const PROBE_MAX_CALLS = 10;
/** Whole-probe budget for a caller waiting on a Model Bridge (MCP) probe: every step may use its full timeout. */
export const probeTotalMs = stepMs => stepMs * PROBE_MAX_CALLS + 15000;
export async function probeModel(model, { embeddings, signal, timeoutMs = 30000 } = {}) {
  const at = new Date().toISOString(), opts = { signal, timeout: timeoutMs };
  const out = { at, reachable: false, toolCalling: false, structuredOutput: 'none', vision: false, streaming: false, usageReported: false, embeddings: false, profileSource: 'probe' };
  const t0 = Date.now();
  try { const r = await model.invoke([new HumanMessage('Reply with the word OK.')], opts); out.reachable = true; out.latencyMs = Date.now() - t0; out.usageReported = !!r.usage_metadata; }
  catch (e) { out.error = classify(e); return out; }
  try {
    if (typeof model.bindTools === 'function') {
      const r = await model.bindTools([{ type: 'function', function: ECHO_TOOL }], { tool_choice: 'echo' }).invoke([new HumanMessage('Call the echo tool with text "hi".')], opts);
      out.toolCalling = r.tool_calls?.[0]?.name === 'echo';
    }
  } catch { out.toolCalling = false; }
  for (const mode of ['native', 'json_mode', 'prompt']) {
    try {
      const r = await structuredSafe(model, [new HumanMessage('Return n = 2.')], N_SCHEMA, { structuredOutput: mode, ...opts });
      if (r.method === mode && r.parsed?.n === 2) { out.structuredOutput = mode; break; }
    } catch { /* next */ }
  }
  try {
    const r = await model.invoke([new HumanMessage({ content: [{ type: 'text', text: 'Describe this image in one word.' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${PNG_1PX}` } }] })], opts);
    out.vision = !!textOf(r);
  } catch { out.vision = false; }
  try { let n = 0; for await (const _c of await model.stream([new HumanMessage('Count to three.')], opts)) n++; out.streaming = n > 1; } catch { out.streaming = false; }
  if (embeddings) { try { const v = await embeddings.embedDocuments(['a', 'b']); out.embeddings = v.length === 2 && v[0].length === v[1].length; out.dims = v[0].length; } catch { out.embeddings = false; } }
  if (model.profile && typeof model.profile === 'object') { out.maxInputTokens = model.profile.maxInputTokens; out.maxOutputTokens = model.profile.maxOutputTokens; }
  return out;
}
/** The flags a probe would claim without testing: only used by the deliberately wrong build (SG_LLM_IMPL=wrong). */
export const UNTESTED_FLAGS = () => ({ at: new Date().toISOString(), reachable: true, toolCalling: true, structuredOutput: 'native', vision: true, streaming: true, usageReported: true, embeddings: true, profileSource: 'manual' });

/** MCP sampling probe (transport "sampling"): does the connected host implement sampling/createMessage? */
export function probeSampling(server) {
  const caps = server?.getClientCapabilities?.();
  if (!caps?.sampling) return { at: new Date().toISOString(), reachable: false, sampling: 'unsupported', toolCalling: false, structuredOutput: 'none', vision: false, streaming: false, usageReported: false, embeddings: false, profileSource: 'probe' };
  return { at: new Date().toISOString(), reachable: true, sampling: 'supported', toolCalling: !!caps.sampling.tools, structuredOutput: 'prompt', vision: true, streaming: false, usageReported: false, embeddings: false, profileSource: 'probe' };
}
export { small };
