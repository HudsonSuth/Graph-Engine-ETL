// Fallbacks for models that lack a feature (plan §5.5). Shared by the Model Bridge and the direct transport so the
// two paths behave the same (conformance C12).
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import Ajv from 'ajv';
import { toolsToWire, textOf, ModelError } from './wire.js';

const ajv = new Ajv({ allErrors: true, strict: false });
export const PROMPT_TOOLS_MARK = 'TOOLS (prompt-based tool calling)';
export const PROMPT_JSON_MARK = 'Reply only with JSON that matches this JSON Schema';

/** First balanced JSON object or array in a text (handles ```json fences). */
export function extractJson(text) {
  const s = String(text || '');
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '{' && s[i] !== '[') continue;
    let depth = 0, inStr = false, esc = false;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true; else if (c === '{' || c === '[') depth++; else if (c === '}' || c === ']') { depth--; if (!depth) { try { return JSON.parse(s.slice(i, j + 1)); } catch { break; } } }
    }
  }
  throw new ModelError('bad_request', 'the model reply did not contain valid JSON');
}
const isUnsupported = e => e?.code === 'unsupported' || /not support|unsupported|bindTools is not a function|does not support tool/i.test(String(e?.message || e));

// ---- tools ------------------------------------------------------------------------------------------------------
const promptToolsSystem = defs => `${PROMPT_TOOLS_MARK}\nYou can use these tools. To call one, reply with ONLY this JSON: {"action": "<tool name>", "args": { ... }}.\nTo answer without a tool, reply with ONLY: {"final": "<your answer>"}.\nTools:\n${defs.map(d => `- ${d.name}: ${d.description}\n  args JSON Schema: ${JSON.stringify(d.parameters)}`).join('\n')}`;
/** Rewrite tool-calling history into plain text for a model without native tool calling. */
const flatten = messages => messages.map(m => {
  if (m instanceof ToolMessage || m._getType?.() === 'tool') return new HumanMessage(`Tool result for ${m.name || m.tool_call_id}: ${textOf(m)}`);
  if ((m._getType?.() === 'ai') && m.tool_calls?.length) return new AIMessage(JSON.stringify({ action: m.tool_calls[0].name, args: m.tool_calls[0].args }));
  return m;
});
let seq = 0;
/** Prompt-based tools: ReAct-style JSON action block, parsed by us and retried once on a parse error. */
export async function invokePromptTools(model, messages, defs, opts = {}) {
  const allowed = new Set(defs.map(d => d.name));
  const msgs = [new SystemMessage(promptToolsSystem(defs)), ...flatten(messages)];
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await model.invoke(msgs, opts);
    let j;
    try { j = extractJson(textOf(r)); } catch { msgs.push(r, new HumanMessage('That was not valid JSON. Reply with ONLY the JSON object.')); continue; }
    const usage = r.usage_metadata;
    if (j && typeof j.action === 'string') {
      if (!allowed.has(j.action)) { opts.onDropped?.(j.action); return new AIMessage({ content: `(dropped a call to "${j.action}", which is not an allowed tool)`, usage_metadata: usage }); }
      return new AIMessage({ content: '', tool_calls: [{ id: `ptc_${++seq}`, name: j.action, args: j.args || {}, type: 'tool_call' }], usage_metadata: usage, response_metadata: { toolMode: 'prompt' } });
    }
    return new AIMessage({ content: typeof j?.final === 'string' ? j.final : JSON.stringify(j), usage_metadata: usage, response_metadata: { toolMode: 'prompt' } });
  }
  throw new ModelError('bad_request', 'the model did not produce a valid tool action after one retry');
}
/** Native tool calling when the model has it; otherwise prompt-based tools. Returns the AIMessage. */
export async function invokeWithTools(model, messages, tools, { toolChoice, toolCalling = true, ...opts } = {}) {
  const defs = toolsToWire(tools);
  if (!defs.length) return model.invoke(messages, opts);
  if (toolCalling !== false && typeof model.bindTools === 'function') {
    try {
      const bound = model.bindTools(defs.map(d => ({ type: 'function', function: d })), toolChoice ? { tool_choice: toolChoice } : {});
      return await bound.invoke(messages, opts);
    } catch (e) { if (!isUnsupported(e)) throw e; }
  }
  return invokePromptTools(model, messages, defs, opts);
}

// ---- structured output ------------------------------------------------------------------------------------------
const validator = schema => { const v = ajv.compile(schema); return x => (v(x) ? null : ajv.errorsText(v.errors)); };
/**
 * Structured output with fallbacks: 1) native, 2) provider JSON mode, 3) prompt with the schema + parse + Ajv + one
 * repair retry, 4) fail with the validation errors. Returns { parsed, raw, method }.
 */
export async function structuredSafe(model, messages, schema, { structuredOutput = 'native', name = 'answer', ...opts } = {}) {
  const check = validator(schema);
  const order = structuredOutput === 'native' ? ['native', 'json_mode', 'prompt'] : structuredOutput === 'json_mode' ? ['json_mode', 'prompt'] : ['prompt'];
  let lastErr;
  for (const method of order) {
    try {
      if (method === 'prompt') {
        const sys = new SystemMessage(`${PROMPT_JSON_MARK}:\n${JSON.stringify(schema)}\nNo prose, no code fences.`);
        let msgs = [sys, ...messages], raw;
        for (let attempt = 0; attempt < 2; attempt++) {
          raw = await model.invoke(msgs, opts);
          let parsed, err;
          try { parsed = extractJson(textOf(raw)); err = check(parsed); } catch (e) { err = e.message; }
          if (!err) return { parsed, raw, method };
          lastErr = new ModelError('bad_request', `structured output failed validation: ${err}`);
          msgs = [...msgs, raw, new HumanMessage(`That did not match the schema (${err}). Reply again with ONLY corrected JSON.`)];
        }
        continue;
      }
      if (typeof model.withStructuredOutput !== 'function') continue;
      const r = model.withStructuredOutput(schema, { name, includeRaw: true, ...(method === 'json_mode' ? { method: 'jsonMode' } : {}) });
      const out = await r.invoke(messages, opts);
      const err = check(out.parsed);
      if (!err) return { parsed: out.parsed, raw: out.raw, method };
      lastErr = new ModelError('bad_request', `structured output failed validation: ${err}`);
    } catch (e) { if (e?.name === 'AbortError' || /abort/i.test(e?.message || '')) throw e; if (e?.code === 'auth_error' || /\b401\b|unauthori/i.test(e?.message || '')) throw e; lastErr = e; }
  }
  throw lastErr || new ModelError('bad_request', 'structured output failed');
}
