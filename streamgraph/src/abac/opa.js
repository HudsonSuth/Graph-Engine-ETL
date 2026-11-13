// Optional OPA adapter (off by default). Same input shape as the kafka.authz Rego policy:
// input.action.operation, input.action.resourcePattern, input.requestContext.principal.
// Fails closed (like allow.on.error=false): any error, timeout or non-boolean answer is a deny.
export const OPERATION = { read: 'READ', query: 'READ', export: 'READ', 'sync-out': 'READ', admin: 'ALTER' };
export function opaInput({ subject, action, entity, resource, env }) {
  return { input: {
    action: { operation: OPERATION[action] || 'UNKNOWN', resourcePattern: { resourceType: 'TOPIC', name: entity, patternType: 'LITERAL' } },
    requestContext: { principal: { principalType: 'User', name: subject?.id }, clientAddress: env?.ip || '127.0.0.1' },
    streamgraph: { action, subject: subject && { role: subject.role, clearance: subject.clearance }, resource, env },
  } };
}
export async function askOpa(cfg, req, fetchImpl = fetch) {
  try {
    const ms = cfg.timeoutMs || 1000; let timer;
    const res = await Promise.race([ // the timer also covers a fetch that ignores the abort signal
      fetchImpl(cfg.url, { method: 'POST', headers: { 'content-type': 'application/json', ...(cfg.token ? { authorization: `Bearer ${cfg.token}` } : {}) },
        body: JSON.stringify(opaInput(req)), signal: AbortSignal.timeout(ms) }),
      new Promise((_, rej) => { timer = setTimeout(() => rej(Object.assign(new Error('timeout'), { name: 'TimeoutError' })), ms + 50); }),
    ]).finally(() => clearTimeout(timer));
    if (!res.ok) return { allow: false, why: `OPA answered HTTP ${res.status}: denied (fail closed)` };
    const body = await res.json();
    const v = typeof body?.result === 'boolean' ? body.result : typeof body?.result?.allow === 'boolean' ? body.result.allow : undefined;
    if (v === undefined) return { allow: false, why: 'OPA gave no yes/no answer (policy undefined): denied (fail closed)' };
    return { allow: v, why: `OPA said ${v ? 'allow' : 'deny'}` };
  } catch (e) { return { allow: false, why: `OPA could not be reached (${e.name === 'TimeoutError' ? 'timed out' : e.message}): denied (fail closed, allow.on.error=false)` }; }
}
