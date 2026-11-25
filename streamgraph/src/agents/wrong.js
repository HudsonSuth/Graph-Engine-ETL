// STREAMGRAPH_AGENTS=broken restores the pre-fix agent behaviour so test/wrong-agents.test.js can prove the
// suite fails: nodes are registered under fixed names (a node id other than "model" does not compile), retrieval
// runs after the model, a branch path map names nodes that were not added, each call gets a new MemorySaver, and
// model errors — including stops and aborts — are retried. The HTTP layer skips the agents gate when this is set.
import { StateGraph, MessagesAnnotation, START, END, MemorySaver, interrupt } from '@langchain/langgraph';
import { HumanMessage, ToolMessage, AIMessage } from '@langchain/core/messages';

export const brokenAgents = () => process.env.STREAMGRAPH_AGENTS === 'broken';

const UNTRUSTED = s => `<untrusted-data>\n${String(s).replace(/<\/?untrusted-data>/g, '')}\n</untrusted-data>`;

/** DELIBERATELY WRONG compiler. Do not use it for a real run. */
export function compileLegacy(flow, ctx = {}) {
  const nodes = flow.nodes || [];
  const tools = ctx.tools || [];
  const byName = new Map(tools.map(t => [t.name, t]));
  const defs = tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
  const graph = new StateGraph(MessagesAnnotation);
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
  if (flow.branch) graph.addNode('branch', async () => ({ messages: [] }));
  if (flow.retrieve) graph.addNode('retrieve', async state => {
    if (!ctx.retrieve) return { messages: [] };
    const q = state.messages.filter(m => m instanceof HumanMessage).at(-1)?.content || '';
    const docs = await ctx.retrieve(q);
    return { messages: [new AIMessage({ content: `Retrieved context:\n${docs.map(d => `- ${d}`).join('\n')}` })] };
  });
  if (flow.approve) graph.addNode('approve', async state => {
    const decision = interrupt({ question: 'Approve the proposed action?', last: state.messages.at(-1)?.content });
    if (decision !== 'yes') throw new Error('approval_denied');
    return { messages: [] };
  });
  if (flow.sink) graph.addNode('sink', async state => {
    if (ctx.sink) await ctx.sink(state);
    return { messages: [] };
  });
  graph.addEdge(START, nodes[0]?.id || 'model');
  const targets = ['tools'];
  if (flow.branch) targets.push('branch');
  if (flow.retrieve) targets.push('retrieve');
  if (flow.approve) targets.push('approve');
  if (flow.sink) targets.push('sink');
  targets.push(END);
  const routeModel = s => (s.messages.at(-1)?.tool_calls?.length ? 'tools' : (flow.branch ? 'branch' : (flow.retrieve ? 'retrieve' : (flow.approve ? 'approve' : (flow.sink ? 'sink' : END)))));
  graph.addConditionalEdges('model', routeModel, targets);
  if (flow.branch) {
    graph.addConditionalEdges('branch', s => (typeof ctx.route === 'function' ? ctx.route(s) : (flow.retrieve ? 'retrieve' : (flow.approve ? 'approve' : (flow.sink ? 'sink' : END)))), ['retrieve', 'approve', 'sink', END]);
  }
  graph.addEdge('tools', 'model');
  if (flow.retrieve) graph.addEdge('retrieve', flow.approve ? 'approve' : (flow.sink ? 'sink' : END));
  if (flow.approve) graph.addEdge('approve', flow.sink ? 'sink' : END);
  if (flow.sink) graph.addEdge('sink', END);
  // A fresh saver every call: resume cannot see the run that paused.
  return graph.compile({ checkpointer: new MemorySaver() });
}
