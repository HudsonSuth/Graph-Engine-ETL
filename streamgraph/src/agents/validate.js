const AGENT_NODE_TYPES = new Set(['model', 'tools', 'retrieve', 'approve', 'sink', 'branch']);

export function validateAgentFlow(flow) {
  const errs = [];
  const steps = flow.nodes || flow.steps || [];
  if (!steps.some(s => (s.type || s.kind) === 'model')) errs.push('Agent flow has no model node');
  for (const s of steps) {
    const t = s.type || s.kind;
    if (t && !AGENT_NODE_TYPES.has(t)) errs.push(`Step ${s.id}: unknown agent node type "${t}"`);
  }
  if (!flow || typeof flow !== 'object') errs.push('Flow must be an object');
  return errs;
}
