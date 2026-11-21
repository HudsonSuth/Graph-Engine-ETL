// JSON wire format between the harness and the Model Bridge (MCP), and error classification shared by all transports.
import { AIMessage, mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from '@langchain/core/messages';
import { convertToOpenAITool } from '@langchain/core/utils/function_calling';

export const toWire = messages => mapChatMessagesToStoredMessages(messages);
export const fromWire = stored => mapStoredMessagesToChatMessages(stored);
/** Bound tools (LangChain tools, zod tools or OpenAI-style defs) -> { name, description, parameters }. */
export const toolsToWire = tools => (tools || []).map(t => {
  if (t?.name && t?.parameters && !t.schema && !t.function) return { name: t.name, description: t.description || '', parameters: t.parameters };
  const f = convertToOpenAITool(t).function; return { name: f.name, description: f.description || '', parameters: f.parameters || { type: 'object', properties: {} } };
});
export const toolsFromWire = defs => (defs || []).map(d => ({ type: 'function', function: { name: d.name, description: d.description, parameters: d.parameters } }));
export const aiToWire = m => ({ content: m.content, tool_calls: (m.tool_calls || []).map(c => ({ id: c.id, name: c.name, args: c.args, type: 'tool_call' })), usage_metadata: m.usage_metadata || null, response_metadata: { model: m.response_metadata?.model || m.response_metadata?.model_name || undefined } });
export const aiFromWire = w => new AIMessage({ content: w.content ?? '', tool_calls: w.tool_calls || [], usage_metadata: w.usage_metadata || undefined, response_metadata: w.response_metadata || {} });
export const textOf = m => typeof m?.content === 'string' ? m.content : Array.isArray(m?.content) ? m.content.filter(b => b?.type === 'text').map(b => b.text).join('') : '';

/** Stable error codes: access_required | auth_error | rate_limit | timeout | unreachable | cancelled | unsupported | bad_request | export_denied | stopped | error. */
export function classify(e) {
  if (e?.type === 'model_access_required' || e?.error?.type === 'model_access_required' || /model_access_required/.test(String(e?.message || ''))) return 'access_required';
  if (e?.code && ['access_required', 'auth_error', 'rate_limit', 'timeout', 'unreachable', 'cancelled', 'unsupported', 'bad_request', 'export_denied', 'stopped', 'budget'].includes(e.code)) return e.code;
  const m = `${e?.name || ''} ${e?.message || e} ${e?.status || ''} ${e?.cause?.code || ''} ${e?.cause?.message || ''}`;
  if (/abort|cancel/i.test(m)) return 'cancelled';
  if (/\b401\b|\b403\b|unauthori[sz]ed|invalid.{0,20}(api )?key|incorrect api key|authentication|permission denied/i.test(m)) return 'auth_error';
  if (/\b429\b|rate.?limit|too many requests/i.test(m)) return 'rate_limit';
  if (/timed? ?out|ETIMEDOUT|deadline/i.test(m)) return 'timeout';
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|connect|socket hang up|network|unreachable/i.test(m)) return 'unreachable';
  if (/not support|unsupported|does not support/i.test(m)) return 'unsupported';
  if (/\b400\b|bad request|invalid/i.test(m)) return 'bad_request';
  return 'error';
}
export class ModelError extends Error {
  constructor(code, message, extra = {}) { super(message); this.name = 'ModelError'; this.code = code; Object.assign(this, extra); }
}
export const ACCESS_REQUIRED_MSG = model => `model "${model}" needs approved access from the provider (403 model_access_required). Request access for it in your provider account, then retry. No other model was tried.`;
/** Rebuild a safe error: classified, redacted message, never the original object (which may hold request headers). */
export function safeError(e, redact) {
  if (e instanceof ModelError) return new ModelError(e.code, redact(e.message), { status: e.status, limit: e.limit });
  return new ModelError(classify(e), redact(String(e?.message || e)).slice(0, 500));
}
