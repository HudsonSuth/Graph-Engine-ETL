// Minimal tool-calling agent on LangGraph's StateGraph with a checkpointer, used by the harness tests and the
// conformance suite (C3, C13). It runs under a RunGuard: every model step and tool call is counted, and the hard stops
// (maxSteps, maxToolCalls, maxWallSeconds) end the run with status "stopped:<limit>" while the last checkpoint is kept.
// Tools are an allowlist; a call to anything else is dropped. Tool output is wrapped as UNTRUSTED data.
import { StateGraph, MessagesAnnotation, START, END, MemorySaver } from '@langchain/langgraph';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import { StopError } from '../llm/limits.js';

const UNTRUSTED = s => `<untrusted-data>\n${String(s).replace(/<\/?untrusted-data>/g, '')}\n</untrusted-data>`;
/**
 * @param {object} o
 * @param {import('@langchain/core/language_models/chat_models').BaseChatModel} o.model   from harness.getChatModel (MeteredModel)
 * @param {{name:string, description:string, parameters:object, invoke:(args:object, {signal})=>Promise<any>}[]} o.tools
 * @param {string|import('@langchain/core/messages').BaseMessage[]} o.input
 * @param {import('../llm/limits.js').RunGuard} o.guard
 */
export async function runToolAgent({ model, tools = [], input, guard, threadId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, checkpointer = new MemorySaver(), log = () => {} }) {
  const byName = new Map(tools.map(t => [t.name, t]));
  const defs = tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
  const bound = defs.length ? model.bindTools(defs) : model;
  const graph = new StateGraph(MessagesAnnotation)
    .addNode('model', async state => { guard.step(); return { messages: [await bound.invoke(state.messages, { signal: guard.signal })] }; })
    .addNode('tools', async state => {
      const last = state.messages.at(-1), out = [];
      for (const call of last.tool_calls || []) {
        guard.toolCall();
        const t = byName.get(call.name);
        if (!t) { log(`agent dropped a call to non-allowlisted tool "${call.name}"`); out.push(new ToolMessage({ tool_call_id: call.id, name: call.name, content: 'error: tool not allowed' })); continue; }
        const r = await t.invoke(call.args || {}, { signal: guard.signal });
        out.push(new ToolMessage({ tool_call_id: call.id, name: call.name, content: UNTRUSTED(typeof r === 'string' ? r : JSON.stringify(r)) }));
      }
      return { messages: out };
    })
    .addEdge(START, 'model')
    .addConditionalEdges('model', s => (s.messages.at(-1)?.tool_calls?.length ? 'tools' : END), ['tools', END])
    .addEdge('tools', 'model')
    .compile({ checkpointer });
  const config = { configurable: { thread_id: threadId }, recursionLimit: guard.limits.maxSteps * 2 + 5, signal: guard.signal };
  const messages = typeof input === 'string' ? [new HumanMessage(input)] : input;
  try {
    const r = await graph.invoke({ messages }, config);
    return { status: 'completed', messages: r.messages, threadId, stats: guard.stats(), graph };
  } catch (e) {
    const stop = guard.stopped || (e instanceof StopError ? e : null) || (e?.name === 'GraphRecursionError' ? new StopError('maxSteps') : null);
    if (!stop) throw e;
    const snap = await graph.getState({ configurable: { thread_id: threadId } });
    return { status: stop.status, limit: stop.limit, messages: snap.values?.messages || [], checkpoint: snap.config?.configurable?.checkpoint_id || null, threadId, stats: guard.stats(), graph };
  } finally { guard.dispose(); }
}
