// L3.1 — compile an agent-kind flow into a LangGraph StateGraph.
// Reuses RunGuard, MeteredModel, StopError from src/llm. Tools are an allowlist; output is
// wrapped as UNTRUSTED data. Human approval uses LangGraph interrupt() (L3.3).
import { StateGraph, MessagesAnnotation, START, END, MemorySaver, Command } from '@langchain/langgraph';
import { HumanMessage, ToolMessage, AIMessage } from '@langchain/core/messages';
import { interrupt } from '@langchain/langgraph';
import { StopError } from '../llm/limits.js';
import { validateAgentFlow } from './validate.js';

const UNTRUSTED = s => `<untrusted-data>\n${String(s).replace(/<\/?untrusted-data>/g, '')}\n</untrusted-data>`;

/**
 * Compile an agent flow into a runnable graph.
 * @param {object} flow - agent flow: { name, nodes: [{id,type,config}], edges: [{from,to,when?}], ... }
 * @param {object} ctx - { model (MeteredModel), tools, graph, guard factory, retrieve? }
 */
export async function compileAgentFlow(flow, ctx = {}) {
  const nodes = flow.nodes || [];
  const edges = flow.edges || [];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const adj = new Map(nodes.map(n => [n.id, []]));
  for (const e of edges) adj.get(e.from)?.push({ to: e.to, when: e.when });

  const tools = ctx.tools || [];
  const byName = new Map(tools.map(t => [t.name, t]));
  const defs = tools.map(({ name, description, parameters }) => ({ name, description, parameters }));

  const graph = new StateGraph(MessagesAnnotation);
  // model node
  graph.addNode('model', async state => {
    ctx.guard?.step?.();
    const bound = defs.length ? ctx.model.bindTools(defs) : ctx.model;
    let lastErr;
    for (let i = 0; i < 3; i++) {
      try {
        const msg = await bound.invoke(state.messages, { signal: ctx.guard?.signal });
        const out = (msg && msg._getType) ? msg : new AIMessage(msg || {});
        return { messages: [out] };
      } catch (e) { lastErr = e; if (i < 2) await new Promise(r => setTimeout(r, 200 * (i + 1))); }
    }
    throw lastErr;
  });
  // tools node
  graph.addNode('tools', async state => {
    const last = state.messages.at(-1), out = [];
    for (const call of last?.tool_calls || []) {
      ctx.guard?.toolCall?.();
      const t = byName.get(call.name);
      if (!t) { out.push(new ToolMessage({ tool_call_id: call.id, name: call.name, content: 'error: tool not allowed' })); continue; }
      const r = await t.invoke(call.args || {}, { signal: ctx.guard?.signal });
      out.push(new ToolMessage({ tool_call_id: call.id, name: call.name, content: UNTRUSTED(typeof r === 'string' ? r : JSON.stringify(r)) }));
    }
    return { messages: out };
  });
  // retrieve node (RAG) - optional
  graph.addNode('retrieve', async state => {
    if (!ctx.retrieve) return { messages: [] };
    const q = state.messages.filter(m => m instanceof HumanMessage).at(-1)?.content || '';
    const docs = await ctx.retrieve(q);
    const ctxMsg = new AIMessage({ content: `Retrieved context:\n${docs.map(d => `- ${d}`).join('\n')}` });
    return { messages: [ctxMsg] };
  });
  // approve node (human-in-the-loop)
  graph.addNode('approve', async state => {
    const decision = interrupt({ question: 'Approve the proposed action?', last: state.messages.at(-1)?.content });
    if (decision !== 'yes') throw new StopError('approval_denied');
    return { messages: [] };
  });
  // sink node (graph write) - optional
  graph.addNode('sink', async state => {
    if (ctx.sink) await ctx.sink(state);
    return { messages: [] };
  });

  // routing
  graph.addEdge(START, nodes[0]?.id || 'model');
  // simple: model -> tools if tool_calls else -> retrieve/approve/sink/END
  graph.addConditionalEdges('model', s => (s.messages.at(-1)?.tool_calls?.length ? 'tools' : (flow.retrieve ? 'retrieve' : (flow.approve ? 'approve' : (flow.sink ? 'sink' : END)))), ['tools', 'retrieve', 'approve', 'sink', END]);
  graph.addEdge('tools', 'model');
  if (flow.retrieve) graph.addEdge('retrieve', flow.approve ? 'approve' : (flow.sink ? 'sink' : END));
  if (flow.approve) graph.addEdge('approve', flow.sink ? 'sink' : END);
  if (flow.sink) graph.addEdge('sink', END);

  let checkpointer = ctx.checkpointer;
  if (!checkpointer && ctx.dbPath) {
    const { SqliteSaver } = await import('@langchain/langgraph-checkpoint-sqlite');
    checkpointer = SqliteSaver.fromConnString(ctx.dbPath);
  }
  if (!checkpointer) checkpointer = new MemorySaver();
  const compiled = graph.compile({ checkpointer });
  return compiled;
}

export async function runAgentFlow({ flow, ctx, input, threadId }) {
  const errs = validateAgentFlow(flow);
  if (errs.length) throw new Error('Invalid agent flow:\\n' + errs.join('\\n'));
  const startedAt = Date.now();
  const compiled = await compileAgentFlow(flow, ctx);
  const messages = typeof input === 'string' ? [new HumanMessage(input)] : input;
  const config = { configurable: { thread_id: threadId || `agent-${Date.now()}` }, recursionLimit: ctx.guard?.limits?.maxSteps ? ctx.guard.limits.maxSteps * 2 + 5 : 50, signal: ctx.guard?.signal };
  try {
    const r = await compiled.invoke({ messages }, config);
    return { status: 'completed', messages: r.messages, threadId: config.configurable.thread_id, startedAt, endedAt: Date.now(), durationMs: Date.now() - startedAt };
  } catch (e) {
    if (e?.name === 'GraphInterrupt') return { status: 'interrupted', threadId: config.configurable.thread_id, payload: e, startedAt, endedAt: Date.now(), durationMs: Date.now() - startedAt };
    throw e;
  }
}

export async function resumeAgentFlow({ flow, ctx, threadId, decision }) {
  const compiled = await compileAgentFlow(flow, ctx);
  const config = { configurable: { thread_id: threadId }, signal: ctx.guard?.signal };
  const r = await compiled.invoke(new Command({ resume: decision }), config);
  return { status: 'completed', messages: r.messages, threadId };
}
