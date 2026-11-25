const AGENT_NODE_TYPES = new Set(['model', 'tools', 'retrieve', 'approve', 'sink', 'branch']);

const typeOf = s => s?.type || s?.kind || (s?.id === 'model' ? 'model' : '');

export function validateAgentFlow(flow) {
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
