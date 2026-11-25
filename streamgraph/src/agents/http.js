// HTTP surface for agent flows. Every route is off until models.json agents.enabled is true,
// then ABAC: agent.run for run, cancel, status and threads; agent.approve for resume, pending and
// the review of generated graph items. Run and resume share one file checkpointer
// (data/agent-checkpoints.json) so an approval can continue after a restart.
import { readFileSync, writeFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { MemorySaver } from '@langchain/langgraph';
import { z } from 'zod';
import { runAgentFlow, resumeAgentFlow, makeAgentRetrieve, agentsEnabled } from './index.js';
import { FileSaver } from './checkpoint.js';
import { pendingReviews, reviewItem, humanReviewer } from './review.js';
import { brokenAgents } from './wrong.js';
import { brokenL45 } from '../llm/l45-wrong.js';
import { OpenSearchClient, indexName } from '../search/opensearch.js';
import { knnQuery } from '../search/knn.js';

const RESERVED = new Set(['run', 'threads', 'pending', 'reviews']);
const runSchema = z.object({
  flow: z.object({}).passthrough(),
  input: z.any().optional(),
  threadId: z.string().min(1).max(200).optional(),
});
const resumeSchema = z.object({
  flow: z.object({}).passthrough().optional(),
  decision: z.any(),
});
const reviewSchema = z.object({
  id: z.string().min(1).max(500),
  kind: z.enum(['node', 'edge']).optional(),
  decision: z.string().min(1).max(40),
  note: z.string().max(500).optional(),
}).strip();

function routeOf(method, pathname) {
  if (pathname === '/api/agents/run' && method === 'POST') return { name: 'run', action: 'agent.run' };
  if (pathname === '/api/agents/threads' && method === 'GET') return { name: 'threads', action: 'agent.run' };
  if (pathname === '/api/agents/pending' && method === 'GET') return { name: 'pending', action: 'agent.approve' };
  if (pathname === '/api/agents/reviews' && method === 'GET') return { name: 'reviews', action: 'agent.approve' };
  if (pathname === '/api/agents/reviews' && method === 'POST') return { name: 'review', action: 'agent.approve' };
  const resume = pathname.match(/^\/api\/agents\/([^/]+)\/resume$/);
  if (resume && method === 'POST') return { name: 'resume', action: 'agent.approve', id: decodeURIComponent(resume[1]) };
  const cancel = pathname.match(/^\/api\/agents\/([^/]+)\/cancel$/);
  if (cancel && method === 'POST') return { name: 'cancel', action: 'agent.run', id: decodeURIComponent(cancel[1]) };
  const status = pathname.match(/^\/api\/agents\/([^/]+)$/);
  if (status && method === 'GET') return { name: 'status', action: 'agent.run', id: decodeURIComponent(status[1]) };
  return null;
}

async function readJson(readBody, req) {
  const b = await readBody(req);
  if (!b.length) return {};
  return JSON.parse(b.toString());
}

function runsOf(app) {
  if (!app.agentRuns) app.agentRuns = new Map();
  return app.agentRuns;
}
function checkpointOf(app) {
  if (!app.agentCheckpointer) {
    app.agentCheckpointer = (!brokenL45() && app.agentCheckpointFile) ? new FileSaver(app.agentCheckpointFile) : new MemorySaver();
  }
  return app.agentCheckpointer;
}
function graphsOf(app) {
  if (!app.agentGraphs) app.agentGraphs = new Map();
  return app.agentGraphs;
}
function syncPending(app) {
  app.pendingApprovals = [...runsOf(app).values()].filter(r => r.status === 'interrupted' && r.pending).map(r => r.pending);
  saveRuns(app);
}
function saveRuns(app) {
  if (brokenL45() || brokenAgents() || !app.agentRunsFile) return;
  const threads = {};
  for (const [id, r] of runsOf(app)) {
    threads[id] = {
      threadId: id, flow: r.flow || null, status: r.status, pending: r.pending || null,
      startedAt: r.startedAt || null, endedAt: r.endedAt || null, cancelRequested: !!r.cancelRequested,
    };
  }
  const body = JSON.stringify({ threads });
  const tmp = `${app.agentRunsFile}.${process.pid}.tmp`;
  writeFileSync(tmp, body);
  try { renameSync(tmp, app.agentRunsFile); }
  catch { writeFileSync(app.agentRunsFile, body); rmSync(tmp, { force: true }); }
}
function loadRuns(app) {
  if (app.agentRunsLoaded) return;
  app.agentRunsLoaded = true;
  if (brokenL45() || brokenAgents() || !app.agentRunsFile || !existsSync(app.agentRunsFile)) return;
  try {
    const { threads } = JSON.parse(readFileSync(app.agentRunsFile, 'utf8'));
    const map = runsOf(app);
    for (const [id, r] of Object.entries(threads || {})) if (r && typeof r === 'object' && !DANGER.has(id)) map.set(id, { ...r, guard: null });
    syncPending(app);
  } catch { /* a damaged file starts with no threads */ }
}
const DANGER = new Set(['__proto__', 'constructor', 'prototype']);

function vectorSearchOf(app, studio) {
  if (typeof app.vectorSearch === 'function') return app.vectorSearch;
  const sinks = studio.workspace?.sinks || [];
  const s = sinks.find(x => x.kind === 'opensearch' && x.enabled !== false);
  if (!s) return null;
  const password = studio.secrets?.()?.[`sink_${s.id}`] || undefined;
  const client = new OpenSearchClient({ ...(s.settings || {}), password }, { fetchImpl: app.searchFetch, timeoutMs: 3000 });
  const index = `${indexName(s.settings || {})}-knn`;
  return (vector, k) => knnQuery(client, index, vector, k);
}
async function embedFor(app, flow, subject, text) {
  if (typeof app.embedQuery === 'function') return app.embedQuery(text, { flow, subject });
  const harness = app.llmContext?.()?.harness;
  if (!harness) throw new Error('no model harness');
  const emb = await harness.getEmbeddings(flow?.models?.embed || null, {
    flowId: flow?.name || 'agent', nodeId: 'retrieve', subject, flow, node: {}, contextTypes: [],
  });
  return emb.embedQuery(String(text || ''));
}
function retrieveFor(app, studio, flow, subject) {
  if (brokenAgents()) return makeAgentRetrieve({ graph: app.graph });
  const search = vectorSearchOf(app, studio);
  const embed = (search || typeof app.embedQuery === 'function') ? (text => embedFor(app, flow, subject, text)) : null;
  return makeAgentRetrieve({ graph: app.graph, engine: studio.engine, subject, search, embed, k: 8 });
}

function publicRun(r, threadId) {
  const out = {
    status: r.status, threadId: threadId || r.threadId, messages: r.messages || [],
    startedAt: r.startedAt, endedAt: r.endedAt, durationMs: r.durationMs,
  };
  if (r.limit) out.limit = r.limit;
  if (r.checkpoint) out.checkpoint = r.checkpoint;
  if (r.interrupts) out.interrupts = r.interrupts;
  return out;
}

function pendingFrom(rec, interrupts) {
  const hit = interrupts?.[0] || {};
  return { threadId: rec.threadId, flow: rec.flow?.name || null, question: hit.question || null, last: hit.last ?? null, at: Date.now() };
}

/**
 * Handle /api/agents/*. Returns true when the response was sent.
 * @param {object} o
 */
export async function handleAgentApi({ app, studio, req, res, url, json, readBody }) {
  const pathname = url.pathname;
  if (!pathname.startsWith('/api/agents')) return false;
  const route = routeOf(req.method, pathname);
  if (!route) { json(res, 404, { error: 'not found' }); return true; }
  try {
    if (!brokenAgents()) loadRuns(app);
    if (!brokenAgents()) {
      const denied = await gate(app, studio, req, res, json, route.action);
      if (denied) return true;
    } else if (process.env.AGENT_TOKEN && route.name === 'run' && req.headers['x-agent-token'] !== process.env.AGENT_TOKEN) {
      // Old run route checked the token; resume and the other routes did not.
      json(res, 403, { error: 'agent.run not allowed' });
      return true;
    }
    if (route.name === 'run') return await onRun({ app, studio, req, res, json, readBody });
    if (route.name === 'resume') return await onResume({ app, studio, req, res, json, readBody, id: route.id });
    if (route.name === 'pending') { json(res, 200, { pending: brokenAgents() ? [] : (app.pendingApprovals || []) }); return true; }
    if (route.name === 'reviews') return await onReviews({ app, studio, req, res, json });
    if (route.name === 'review') return await onReview({ app, studio, req, res, json, readBody });
    if (route.name === 'threads') {
      const threads = [...runsOf(app).values()].map(r => ({ threadId: r.threadId, status: r.status }));
      json(res, 200, { threads: brokenAgents() ? (app.agentThreads || []) : threads });
      return true;
    }
    if (route.name === 'cancel') return onCancel(app, res, json, route.id);
    return onStatus(app, res, json, route.id);
  } catch (e) {
    if (!res.headersSent) json(res, e.status || 400, { error: e.message });
    return true;
  }
}

async function gate(app, studio, req, res, json, action) {
  if (process.env.AGENT_TOKEN && req.headers['x-agent-token'] !== process.env.AGENT_TOKEN) {
    json(res, 403, { error: `${action} not allowed` });
    return true;
  }
  const harness = app.llmContext?.()?.harness;
  if (!agentsEnabled(harness?.models?.())) {
    json(res, 403, { error: 'Agents are turned off.' });
    return true;
  }
  let who;
  try { who = await studio.whoIs(req); }
  catch (e) { json(res, e.status || 400, { error: e.message }); return true; }
  const decision = await studio.engine.decide({ subject: who.subject, action, entity: 'Project', env: { via: 'api' } });
  if (!decision.allow) { json(res, 403, { error: `${action} not allowed` }); return true; }
  return false;
}

async function readable(studio, who, entity) {
  if (!entity) return false;
  return (await studio.engine.decide({ subject: who.subject, action: 'read', entity, env: { via: 'api' } })).allow;
}

async function onReviews({ app, studio, req, res, json }) {
  const who = await studio.whoIs(req);
  const rows = [];
  for (const row of pendingReviews(app.graph)) {
    const entity = row.kind === 'edge' ? row.type : row.label;
    if (await readable(studio, who, entity)) rows.push(row);
  }
  json(res, 200, { pending: rows });
  return true;
}

async function onReview({ app, studio, req, res, json, readBody }) {
  const parsed = reviewSchema.safeParse(await readJson(readBody, req));
  if (!parsed.success) { json(res, 400, { error: parsed.error.message }); return true; }
  const who = await studio.whoIs(req);
  const actor = humanReviewer(who);
  if (!actor) { json(res, 403, { error: 'only a recognised human can review generated items' }); return true; }
  const id = parsed.data.id;
  const node = parsed.data.kind === 'edge' ? null : app.graph.getNode(id);
  const edge = node ? null : (app.graph.getEdge?.(id) || null);
  const entity = node?.label || edge?.type;
  if (entity && !(await readable(studio, who, entity))) { json(res, 403, { error: 'read not allowed' }); return true; }
  const result = reviewItem(app.graph, { id, kind: parsed.data.kind || (edge ? 'edge' : 'node'), decision: parsed.data.decision, note: parsed.data.note, actor, allowHuman: true });
  json(res, 200, result);
  return true;
}

function modelFor(app, flow, guard, subject) {
  const cache = new Map();
  return async (node) => {
    const llm = app.llmContext?.();
    if (brokenAgents()) return llm?.model;
    if (!llm?.harness) throw Object.assign(new Error('No model harness is configured'), { status: 400 });
    const explicit = typeof node?.config?.model === 'string' && node.config.model ? node.config.model : null;
    const key = explicit || flow?.models?.default || flow?.model || '';
    if (cache.has(key)) return cache.get(key);
    const model = await llm.harness.getChatModel(explicit || null, {
      flowId: flow?.name || 'agent', nodeId: node?.id || 'model', subject, guard, flow, node,
    });
    cache.set(key, model);
    return model;
  };
}

async function subjectFor(app, studio, req) {
  if (brokenAgents()) return app.llmContext?.()?.subject?.() || null;
  const who = await studio.whoIs(req);
  return who.subject;
}

async function onRun({ app, studio, req, res, json, readBody }) {
  const parsed = runSchema.safeParse(await readJson(readBody, req));
  if (!parsed.success) { json(res, 400, { error: parsed.error.message }); return true; }
  const { flow, input } = parsed.data;
  const threadId = parsed.data.threadId || `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (RESERVED.has(threadId)) { json(res, 400, { error: `thread id "${threadId}" is reserved` }); return true; }
  const subject = await subjectFor(app, studio, req);
  const harness = app.llmContext?.()?.harness;
  const guard = brokenAgents() ? undefined : harness?.runGuard?.(flow.limits || {}, { isAdmin: subject?.role === 'admin' });
  const rec = { threadId, flow, status: 'running', startedAt: Date.now(), guard, pending: null, cancelRequested: false };
  runsOf(app).set(threadId, rec);
  saveRuns(app);
  if (!brokenAgents()) {
    app.agentThreads = [...runsOf(app).keys()];
  } else if (!(app.agentThreads || []).includes(threadId)) {
    app.agentThreads = [...(app.agentThreads || []), threadId];
  }
  try {
    if (rec.cancelRequested && guard) guard.stop('cancelled');
    const resolve = modelFor(app, flow, guard, subject);
    const modelNode = (flow.nodes || flow.steps || []).find(n => (n.type || n.kind || (n.id === 'model' ? 'model' : '')) === 'model') || { id: 'model' };
    const model = await resolve(modelNode);
    const ctx = {
      model, modelFor: resolve, guard,
      checkpointer: brokenAgents() ? undefined : checkpointOf(app),
      compiledCache: graphsOf(app),
      retrieve: retrieveFor(app, studio, flow, subject),
      graph: app.graph,
      tools: app.agentTools || [],
    };
    const r = await runAgentFlow({ flow, ctx, input, threadId });
    return sendRun(app, res, json, rec, r);
  } catch (e) {
    if (rec.status !== 'stopped:cancelled') rec.status = 'error';
    rec.endedAt = Date.now();
    if (guard?.stopped && rec.status === 'stopped:cancelled') {
      json(res, 200, { status: 'stopped:cancelled', threadId, limit: guard.stopped.limit });
      return true;
    }
    json(res, e.status || 400, { error: e.message });
    return true;
  } finally {
    guard?.dispose?.();
  }
}

function sendRun(app, res, json, rec, r) {
  if (rec.cancelRequested || rec.guard?.stopped?.limit === 'cancelled' || rec.status === 'stopped:cancelled') {
    rec.status = 'stopped:cancelled';
    rec.endedAt = Date.now();
    rec.pending = null;
    if (!brokenAgents()) syncPending(app);
    json(res, 200, { ...publicRun(r, rec.threadId), status: 'stopped:cancelled', limit: 'cancelled' });
    return true;
  }
  rec.status = r.status;
  rec.endedAt = r.endedAt;
  if (r.status === 'interrupted' && !brokenAgents()) {
    rec.pending = pendingFrom(rec, r.interrupts);
    syncPending(app);
  } else {
    rec.pending = null;
    if (!brokenAgents()) syncPending(app);
  }
  json(res, 200, publicRun(r, rec.threadId));
  return true;
}

async function onResume({ app, studio, req, res, json, readBody, id }) {
  const rec = runsOf(app).get(id);
  if (!rec) { json(res, 404, { error: 'unknown thread', threadId: id }); return true; }
  if (!brokenAgents() && (rec.status === 'stopped:cancelled' || rec.cancelRequested)) {
    json(res, 409, { error: 'thread was cancelled', threadId: id });
    return true;
  }
  const parsed = resumeSchema.safeParse(await readJson(readBody, req));
  if (!parsed.success) { json(res, 400, { error: parsed.error.message }); return true; }
  const flow = parsed.data.flow || rec.flow;
  if (!flow) { json(res, 400, { error: 'resume needs the flow' }); return true; }
  const subject = await subjectFor(app, studio, req);
  const harness = app.llmContext?.()?.harness;
  const guard = brokenAgents() ? undefined : harness?.runGuard?.(flow.limits || {}, { isAdmin: subject?.role === 'admin' });
  rec.guard = guard;
  try {
    const resolve = modelFor(app, flow, guard, subject);
    const modelNode = (flow.nodes || flow.steps || []).find(n => (n.type || n.kind || (n.id === 'model' ? 'model' : '')) === 'model') || { id: 'model' };
    const model = await resolve(modelNode);
    const ctx = {
      model, modelFor: resolve, guard,
      checkpointer: brokenAgents() ? undefined : checkpointOf(app),
      compiledCache: graphsOf(app),
      retrieve: retrieveFor(app, studio, flow, subject),
      graph: app.graph,
      tools: app.agentTools || [],
    };
    const r = await resumeAgentFlow({ flow, ctx, threadId: id, decision: parsed.data.decision });
    return sendRun(app, res, json, rec, r);
  } catch (e) {
    rec.status = rec.status === 'stopped:cancelled' ? rec.status : 'error';
    json(res, e.status || 400, { error: e.message });
    return true;
  } finally {
    guard?.dispose?.();
  }
}

function onCancel(app, res, json, id) {
  const rec = runsOf(app).get(id);
  if (brokenAgents()) {
    app.agentThreads = (app.agentThreads || []).filter(t => t !== id);
    json(res, 200, { cancelled: id });
    return true;
  }
  if (!rec) { json(res, 404, { error: 'unknown thread', threadId: id }); return true; }
  if (rec.status === 'running') {
    rec.cancelRequested = true;
    rec.guard?.stop('cancelled');
    rec.status = 'stopped:cancelled';
    saveRuns(app);
    json(res, 200, { cancelled: true, threadId: id, status: rec.status });
    return true;
  }
  if (rec.status === 'interrupted') {
    rec.status = 'stopped:cancelled';
    rec.cancelRequested = true;
    rec.pending = null;
    rec.endedAt = Date.now();
    syncPending(app);
    graphsOf(app).delete(id);
    json(res, 200, { cancelled: true, threadId: id, status: rec.status });
    return true;
  }
  json(res, 200, { cancelled: false, threadId: id, status: rec.status });
  return true;
}

function onStatus(app, res, json, id) {
  const rec = runsOf(app).get(id);
  if (brokenAgents()) { json(res, 200, { threadId: id, known: (app.agentThreads || []).includes(id) }); return true; }
  if (!rec) { json(res, 404, { error: 'unknown thread', threadId: id, known: false }); return true; }
  json(res, 200, {
    threadId: id, known: true, status: rec.status, startedAt: rec.startedAt, endedAt: rec.endedAt || null,
    pending: rec.status === 'interrupted',
  });
  return true;
}
