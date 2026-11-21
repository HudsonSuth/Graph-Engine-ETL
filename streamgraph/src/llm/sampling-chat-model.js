// McpSamplingChatModel (plan §5.2c): when StreamGraph runs as an MCP server inside a host (Claude Desktop, Cursor,
// Grok Bot...), ask the HOST's model with sampling/createMessage. The host picks and pays for the model; StreamGraph holds
// no key. @langchain/mcp-adapters has no sampling support, so this sits directly on the MCP SDK's Server.createMessage.
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import { toolsToWire, textOf, ModelError } from './wire.js';

const blocks = m => {
  if (typeof m.content === 'string') return [{ type: 'text', text: m.content }];
  return (m.content || []).map(b => {
    if (b.type === 'text') return { type: 'text', text: b.text };
    const url = b.type === 'image_url' ? (typeof b.image_url === 'string' ? b.image_url : b.image_url?.url) : null;
    const mm = url && /^data:([^;]+);base64,(.*)$/.exec(url);
    return mm ? { type: 'image', mimeType: mm[1], data: mm[2] } : null;
  }).filter(Boolean);
};
export class McpSamplingChatModel extends BaseChatModel {
  static lc_name() { return 'McpSamplingChatModel'; }
  lc_serializable = false;
  /** @param {{ server: import('@modelcontextprotocol/sdk/server/index.js').Server, hints?: object, maxTokens?: number }} f */
  constructor(f) { super({}); this.server = f.server; this.hints = f.hints || {}; this.maxTokens = f.maxTokens || 1024; }
  _llmType() { return 'mcp_sampling'; }
  supported() { return !!this.server?.getClientCapabilities?.()?.sampling; }
  bindTools(tools, kwargs = {}) {
    if (!this.server?.getClientCapabilities?.()?.sampling?.tools) throw new ModelError('unsupported', 'the MCP host does not support tools in sampling');
    return this.withConfig({ tools: toolsToWire(tools), tool_choice: kwargs.tool_choice });
  }
  async _generate(messages, options) {
    if (!this.supported()) throw new ModelError('unsupported', 'the connected MCP host does not support sampling (sampling/createMessage)');
    const system = messages.filter(m => m._getType() === 'system').map(textOf).join('\n');
    const msgs = [];
    for (const m of messages) {
      const t = m._getType();
      if (t === 'system') continue;
      if (t === 'tool') { msgs.push({ role: 'user', content: [{ type: 'tool_result', toolUseId: m.tool_call_id, content: [{ type: 'text', text: textOf(m) }] }] }); continue; }
      if (t === 'ai' && m.tool_calls?.length) { msgs.push({ role: 'assistant', content: m.tool_calls.map(c => ({ type: 'tool_use', id: c.id, name: c.name, input: c.args })) }); continue; }
      const b = blocks(m); msgs.push({ role: t === 'ai' ? 'assistant' : 'user', content: b.length === 1 ? b[0] : b });
    }
    const params = { messages: msgs, maxTokens: options.maxTokens || this.maxTokens, ...(system ? { systemPrompt: system } : {}), modelPreferences: this.hints };
    if (options.tools?.length) { params.tools = options.tools.map(d => ({ name: d.name, description: d.description, inputSchema: d.parameters })); params.toolChoice = { mode: options.tool_choice ? 'required' : 'auto' }; }
    const r = await this.server.createMessage(params, { signal: options.signal, timeout: options.timeout });
    const content = Array.isArray(r.content) ? r.content : [r.content];
    const tool_calls = content.filter(c => c.type === 'tool_use').map(c => ({ id: c.id, name: c.name, args: c.input || {}, type: 'tool_call' }));
    const text = content.filter(c => c.type === 'text').map(c => c.text).join('');
    const message = new AIMessage({ content: text, tool_calls, response_metadata: { model: r.model, stopReason: r.stopReason, billedByHost: true } });
    return { generations: [{ text, message }] };
  }
}
