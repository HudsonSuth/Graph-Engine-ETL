// L3 — compile an agent flow into a LangGraph StateGraph and run it.
// Nodes and edges in the flow are the graph. With no edges, flags (retrieve, branch, approve, sink)
// build a chain that retrieves before the model, then approves, then writes.
// Human approval uses interrupt(); invoke returns __interrupt__ and status "interrupted".
// Run and resume must share ctx.checkpointer. The server uses a file saver (src/agents/checkpoint.js)
// so an approval survives a restart. SqliteSaver is not used (native addon). A caller that passes none
// still gets an in-memory MemorySaver for that call.
import { StateGraph, MessagesAnnotation, START, END, MemorySaver, Command, interrupt } from '@langchain/langgraph';
import { HumanMessage, SystemMessage, ToolMessage, AIMessage } from '@langchain/core/messages';
import { StopError } from '../llm/limits.js';
import { validateFlow } from '../flow.js';
import { brokenAgents, compileLegacy } from './wrong.js';
import { brokenL45 } from '../llm/l45-wrong.js';
import { hitOf } from './rag.js';

const UNTRUSTED = s => `<untrusted-data>\n${String(s).replace(/<\/?untrusted-data>/g, '')}\n</untrusted-data>`;
const RETRIES = 3;

export function messageText(m) {
  if (m == null) return '';
  const c = m.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map(p => (typeof p === 'string' ? p : p?.text || '')).join('');
  return c == null ? '' : String(c);
}

function lastHuman(messages = []) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const t = typeof m?._getType === 'function' ? m._getType() : (m?.type || m?.role);
    if (t === 'human' || t === 'user') return messageText(m);
  }
  return messageText(messages.at(-1));
}

function asAI(msg) {
  if (msg && typeof msg._getType === 'function') return msg;
  if (typeof msg === 'string') return new AIMessage(msg);
  const content = msg?.content ?? '';
  const tool_calls = Array.isArray(msg?.tool_calls) ? msg.tool_calls : undefined;
  return new AIMessage(tool_calls ? { content, tool_calls } : { content: String(content) });
}

function retryable(e, guard) {
  if (brokenAgents()) return true;
  if (!e) return false;
  if (e instanceof StopError) return false;
  if (e.name === 'AbortError' || e.name === 'GraphInterrupt' || e.name === 'TimeoutError') return false;
  if (e.code === 'export_denied') return false;
  const code = String(e.code || '');
  if (code === 'cancelled' || code === 'stopped' || code.startsWith('stopped')) return false;
  if (guard?.stopped || guard?.signal?.aborted) return false;
  return true;
}

function entityTypesFrom(messages) {
  const out = [];
  for (const m of messages || []) {
    const t = m?.additional_kwargs?.entityTypes;
    if (Array.isArray(t)) out.push(...t.filter(Boolean));
  }
  return [...new Set(out)];
}

async function callModel(model, messages, ctx) {
  if (!model || typeof model.invoke !== 'function') throw new TypeError("Cannot read properties of undefined (reading 'invoke')");
  const defs = (ctx.tools || []).map(({ name, description, parameters }) => ({ name, description, parameters }));
  const bound = defs.length && typeof model.bindTools === 'function' ? model.bindTools(defs) : model;
  ctx.guard?.step?.();
  const contextTypes = brokenL45() ? [] : entityTypesFrom(messages);
  let lastErr;
  for (let i = 0; i < RETRIES; i++) {
    try {
      return asAI(await bound.invoke(messages, { signal: ctx.guard?.signal, ...(contextTypes.length ? { contextTypes } : {}) }));
    } catch (e) {
      lastErr = e;
      if (!retryable(e, ctx.guard) || i === RETRIES - 1) throw e;
      await new Promise(r => setTimeout(r, 200 * (i + 1)));
    }
  }
  throw lastErr;
}

function typeOf(n) {
  return n.type || n.kind || (n.id === 'model' ? 'model' : '');
}

function expand(flow, ctx) {
  const raw = flow.nodes || flow.steps || [];
  const nodes = raw.map((n, i) => ({ id: String(n.id || `n${i}`), type: typeOf(n), config: n.config || {} }));
  const has = t => nodes.some(n => n.type === t);
  const edges = (flow.edges || []).map(e => ({ from: e.from, to: e.to, when: e.when }));
  if (edges.length) return { nodes, edges };
  if (flow.retrieve && !has('retrieve')) nodes.push({ id: 'retrieve', type: 'retrieve', config: {} });
  if (flow.branch && !has('branch')) nodes.push({ id: 'branch', type: 'branch', config: {} });
  if (flow.approve && !has('approve')) nodes.push({ id: 'approve', type: 'approve', config: {} });
  if (flow.sink && !has('sink')) nodes.push({ id: 'sink', type: 'sink', config: {} });
  if (!has('tools')) nodes.push({ id: 'tools', type: 'tools', config: {} });
  return { nodes, edges: synthesize(nodes, ctx) };
}

function synthesize(nodes) {
  const of = t => nodes.filter(n => n.type === t);
  const chain = [...of('retrieve'), ...of('model'), ...of('branch'), ...of('approve'), ...of('sink')];
  const tools = of('tools')[0];
  const edges = [];
  for (let i = 0; i < chain.length; i++) {
    const a = chain[i], b = chain[i + 1];
    if (a.type === 'model' && tools) edges.push({ from: a.id, to: tools.id, when: 'tool_calls' });
    edges.push({ from: a.id, to: b ? b.id : END });
  }
  const model = of('model')[0];
  if (tools && model) edges.push({ from: tools.id, to: model.id });
  return edges;
}

function handlerFor(node, ctx) {
  switch (node.type) {
    case 'model':
      return async (state) => {
        const model = typeof ctx.modelFor === 'function' ? await ctx.modelFor(node) : ctx.model;
        return { messages: [await callModel(model, state.messages, ctx)] };
      };
    case 'tools':
      return async (state) => {
        const calls = state.messages.at(-1)?.tool_calls || [];
        const byName = new Map((ctx.tools || []).map(t => [t.name, t]));
        const out = [];
        for (const call of calls) {
          ctx.guard?.toolCall?.();
          const t = byName.get(call.name);
          const id = call.id || `call_${call.name}`;
          if (!t) { out.push(new ToolMessage({ tool_call_id: id, name: call.name, content: 'error: tool not allowed' })); continue; }
          const r = await t.invoke(call.args || {}, { signal: ctx.guard?.signal });
          out.push(new ToolMessage({ tool_call_id: id, name: call.name, content: UNTRUSTED(typeof r === 'string' ? r : JSON.stringify(r)) }));
        }
        return { messages: out };
      };
    case 'retrieve':
      return async (state) => {
        if (typeof ctx.retrieve !== 'function') return { messages: [] };
        const q = lastHuman(state.messages);
        const docs = (await ctx.retrieve(q, node.config)) || [];
        const hits = docs.map(hitOf);
        const types = [...new Set(hits.map(h => h.entity).filter(Boolean))];
        for (const t of types) ctx.traceTypes?.add(t);
        const body = hits.filter(h => h.text).map(h => `- ${h.text}`).join('\n');
        return { messages: [new SystemMessage({ content: UNTRUSTED(`Retrieved context:\n${body}`), additional_kwargs: { entityTypes: types } })] };
      };
    case 'approve':
      return async (state) => {
        const decision = interrupt({ question: 'Approve the proposed action?', last: messageText(state.messages.at(-1)) });
        if (decision !== 'yes') throw new StopError('approval_denied');
        return { messages: [] };
      };
    case 'sink':
      return async (state) => {
        if (typeof ctx.sink === 'function') await ctx.sink(state);
        return { messages: [] };
      };
    case 'branch':
      return async () => ({ messages: [] });
    default: {
      const unexpected = node.type;
      throw new Error(`Unknown agent node type "${unexpected}" on "${node.id}"`);
    }
  }
}

function traced(node, ctx, fn) {
  return async (state) => {
    const t0 = Date.now();
    try {
      const out = await fn(state);
      ctx.trace?.({ node: node.id, type: node.type, ms: Date.now() - t0, status: 'ok' });
      return out;
    } catch (e) {
      const interrupted = e?.name === 'GraphInterrupt' || Array.isArray(e?.interrupts);
      ctx.trace?.({ node: node.id, type: node.type, ms: Date.now() - t0, status: interrupted ? 'interrupted' : 'error', ...(interrupted ? {} : { code: String(e?.code || e?.name || 'error').slice(0, 80) }) });
      throw e;
    }
  };
}

function wire(graph, nodes, edges, ctx) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  for (const n of nodes) {
    if (!n.type) throw new Error(`Agent node "${n.id}" has no type`);
    graph.addNode(n.id, traced(n, ctx, handlerFor(n, ctx)));
  }
  const incoming = new Set();
  for (const e of edges) {
    if (e.to === END) continue;
    if (byId.get(e.from)?.type === 'tools') continue;
    incoming.add(e.to);
  }
  const entry = nodes.find(n => n.type !== 'tools' && !incoming.has(n.id)) || nodes.find(n => n.type === 'model');
  if (!entry) throw new Error('Agent flow has no start node');
  graph.addEdge(START, entry.id);

  const grouped = new Map();
  for (const e of edges) {
    if (!grouped.has(e.from)) grouped.set(e.from, []);
    grouped.get(e.from).push(e);
  }
  for (const n of nodes) if (!grouped.has(n.id)) graph.addEdge(n.id, END);
  for (const [from, outs] of grouped) {
    const plain = outs.filter(e => !e.when);
    const cond = outs.filter(e => e.when);
    if (!cond.length && plain.length === 1) { graph.addEdge(from, plain[0].to); continue; }
    const dests = [...new Set(outs.map(e => e.to))];
    const src = byId.get(from);
    graph.addConditionalEdges(from, state => {
      if (state.messages.at(-1)?.tool_calls?.length) {
        const toolEdge = outs.find(e => e.when === 'tool_calls');
        if (toolEdge) return toolEdge.to;
      }
      if (src?.type === 'branch' && typeof ctx.route === 'function') {
        const choice = ctx.route(state);
        const hit = outs.find(e => e.to === choice || e.when === choice);
        if (hit) return hit.to;
      }
      return (plain[0] || outs.find(e => e.when !== 'tool_calls') || outs[0]).to;
    }, dests);
  }
}

/**
 * Compile an agent flow into a runnable graph.
 * @param {object} flow - { name, nodes: [{id,type,config}], edges: [{from,to,when?}], retrieve?, approve?, sink?, branch? }
 * @param {object} ctx - { model, modelFor?, tools, retrieve?, sink?, route?, guard, checkpointer, graph }
 */
export async function compileAgentFlow(flow, ctx = {}) {
  if (brokenAgents()) return compileLegacy(flow, ctx);
  const { nodes, edges } = expand(flow, ctx);
  const graph = new StateGraph(MessagesAnnotation);
  wire(graph, nodes, edges, ctx);
  const checkpointer = ctx.checkpointer || new MemorySaver();
  return graph.compile({ checkpointer });
}

function elapsed(startedAt) {
  const endedAt = Date.now();
  return { startedAt, endedAt, durationMs: endedAt - startedAt };
}

export function interruptOf(result) {
  const hits = result?.__interrupt__;
  if (!Array.isArray(hits) || !hits.length) return null;
  return hits.map(h => (h && Object.prototype.hasOwnProperty.call(h, 'value') ? h.value : h));
}

function configFor(threadId, ctx) {
  return {
    configurable: { thread_id: threadId },
    recursionLimit: ctx.guard?.limits?.maxSteps ? ctx.guard.limits.maxSteps * 2 + 5 : 50,
    signal: ctx.guard?.signal,
    metadata: { runId: ctx.runId || null, flow: ctx.flowName || null },
  };
}

async function stoppedResult(e, compiled, threadId, startedAt, ctx) {
  const stop = ctx.guard?.stopped
    || (e instanceof StopError ? e : null)
    || (e?.name === 'GraphRecursionError' ? new StopError('maxSteps') : null)
    || (ctx.guard?.signal?.aborted ? (ctx.guard.stopped || new StopError('cancelled')) : null);
  if (!stop) return null;
  let messages = [], checkpoint = null;
  try {
    const snap = await compiled.getState({ configurable: { thread_id: threadId } });
    messages = snap?.values?.messages || [];
    checkpoint = snap?.config?.configurable?.checkpoint_id || null;
  } catch { /* the run stopped before a checkpoint was written */ }
  const res = { status: stop.status, limit: stop.limit, messages, checkpoint, threadId, ...elapsed(startedAt) };
  ctx.log?.(res);
  return res;
}

function finish(r, threadId, startedAt, ctx) {
  if (!brokenAgents()) {
    const interrupts = interruptOf(r);
    if (interrupts) {
      const res = { status: 'interrupted', interrupts, messages: r.messages || [], threadId, ...elapsed(startedAt) };
      ctx.log?.(res);
      return res;
    }
  }
  const res = { status: 'completed', messages: r.messages || [], threadId, ...elapsed(startedAt) };
  ctx.log?.(res);
  return res;
}

async function invokeGuarded(compiled, input, threadId, startedAt, ctx) {
  const config = configFor(threadId, ctx);
  try {
    const r = await compiled.invoke(input, config);
    return finish(r, threadId, startedAt, ctx);
  } catch (e) {
    if (!brokenAgents() && (e?.name === 'GraphInterrupt' || Array.isArray(e?.interrupts))) {
      const interrupts = (e.interrupts || []).map(i => i?.value ?? i);
      const res = { status: 'interrupted', interrupts, messages: [], threadId, ...elapsed(startedAt) };
      ctx.log?.(res);
      return res;
    }
    const stopped = await stoppedResult(e, compiled, threadId, startedAt, ctx);
    if (stopped) return stopped;
    throw e;
  } finally {
    ctx.guard?.dispose?.();
  }
}

export async function runAgentFlow({ flow, ctx = {}, input, threadId }) {
  const errs = validateFlow(flow);
  if (errs.length) throw new Error(`Invalid agent flow:\n${errs.join('\n')}`);
  const id = threadId || `agent-${Date.now()}`;
  const startedAt = Date.now();
  const runCtx = { ...ctx, flowName: flow?.name || null };
  const compiled = (!brokenAgents() && ctx.compiledCache?.get(id)) || await compileAgentFlow(flow, runCtx);
  if (!brokenAgents()) ctx.compiledCache?.set(id, compiled);
  const messages = typeof input === 'string' ? [new HumanMessage(input)] : (input || []);
  return invokeGuarded(compiled, { messages }, id, startedAt, runCtx);
}

export async function resumeAgentFlow({ flow, ctx = {}, threadId, decision }) {
  if (flow) {
    const errs = validateFlow(flow);
    if (errs.length) throw new Error(`Invalid agent flow:\n${errs.join('\n')}`);
  }
  if (!threadId) throw new Error('resume needs a thread id');
  const startedAt = Date.now();
  const runCtx = { ...ctx, flowName: flow?.name || null };
  const compiled = (!brokenAgents() && ctx.compiledCache?.get(threadId)) || await compileAgentFlow(flow, runCtx);
  if (!brokenAgents()) ctx.compiledCache?.set(threadId, compiled);
  return invokeGuarded(compiled, new Command({ resume: decision }), threadId, startedAt, runCtx);
}
