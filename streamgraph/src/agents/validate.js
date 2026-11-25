import { checkNodeModelConfig } from '../llm/config.js';
import { brokenL45 } from '../llm/l45-wrong.js';

const AGENT_NODE_TYPES = new Set(['model', 'tools', 'retrieve', 'approve', 'sink', 'branch']);

const typeOf = s => s?.type || s?.kind || (s?.id === 'model' ? 'model' : '');

/** An agent flow is `kind: "agent"`, or a node list of agent types with no ETL steps. ETL flows stay on validateFlow's step checks. */
export function isAgentFlow(flow) {
  if (!flow || typeof flow !== 'object') return false;
  if (flow.kind === 'agent') return true;
  if (Array.isArray(flow.steps) && flow.steps.length) return false;
  const nodes = flow.nodes || [];
  return nodes.some(n => AGENT_NODE_TYPES.has(typeOf(n)));
}

function thin(flow) {
  const errs = [];
  if (!flow || typeof flow !== 'object') { errs.push('Flow must be an object'); return errs; }
  const steps = flow.nodes || flow.steps || [];
  const ids = new Set();
  let model = false;
  for (const s of steps) {
    const t = typeOf(s);
    if (!s?.id) errs.push('Agent node is missing an id');
    else if (ids.has(s.id)) errs.push(`Duplicate node id "${s.id}"`);
    else ids.add(s.id);
    if (t === 'model') model = true;
    else if (!t) errs.push(`Step ${s?.id || '?'}: missing agent node type`);
    else if (!AGENT_NODE_TYPES.has(t)) errs.push(`Step ${s.id}: unknown agent node type "${t}"`);
  }
  if (!model) errs.push('Agent flow has no model node');
  for (const e of flow.edges || []) {
    if (!ids.has(e?.from)) errs.push(`Edge from unknown node "${e?.from}"`);
    if (!ids.has(e?.to)) errs.push(`Edge to unknown node "${e?.to}"`);
  }
  return errs;
}

/**
 * Agent-flow checks. validateFlow calls this for an agent flow, so /api/validate and the compiler share one path.
 * The model-node rule is the same one ETL steps use: a node cannot set keyRef, baseURL, url, provider or transport.
 * A tool loop is allowed; the ETL cycle check does not apply here.
 */
export function validateAgentFlow(flow) {
  const errs = thin(flow);
  if (brokenL45() || !flow || typeof flow !== 'object') return errs;
  const steps = flow.nodes || flow.steps || [];
  for (const s of steps) {
    if (typeOf(s) !== 'model') continue;
    try { checkNodeModelConfig(s.config); checkNodeModelConfig(s.config?.model); }
    catch (e) { errs.push(`Step ${s.id || '?'}: ${e.message}`); }
  }
  for (const flag of ['retrieve', 'approve', 'sink', 'branch']) {
    if (flow[flag] != null && typeof flow[flag] !== 'boolean') errs.push(`Agent flow ${flag} must be true or false`);
  }
  return errs;
}
