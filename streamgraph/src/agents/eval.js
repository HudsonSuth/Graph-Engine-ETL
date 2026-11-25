// L9 — offline eval harness. A case is a flow, an input and expectations. The model is whatever
// the caller passes (the CLI uses the deterministic fake). Nothing here calls the network.
import { messageText, runAgentFlow } from './compiler.js';
import { brokenL69 } from './l69-wrong.js';

export function caseText(result) {
  const parts = [];
  const walk = (m) => {
    if (!m) return;
    if (typeof m === 'string') { parts.push(m); return; }
    if (Array.isArray(m)) { m.forEach(walk); return; }
    const t = messageText(m);
    if (t) parts.push(t);
    if (typeof m.kwargs?.content === 'string') parts.push(m.kwargs.content);
    if (Array.isArray(m.interrupts)) m.interrupts.forEach(walk);
  };
  walk(result?.messages);
  return parts.join('\n');
}

/**
 * Score one case. `pass` is true only when every declared expectation holds.
 * The broken build marks every case as a pass.
 */
export async function scoreCase(kase, { model, tools } = {}) {
  const expect = kase.expect || {};
  let result, error = null;
  try {
    result = await runAgentFlow({
      flow: kase.flow,
      ctx: { model, tools: tools || [] },
      input: kase.input ?? '',
      threadId: `eval-${kase.id || 'case'}`,
    });
  } catch (e) {
    error = e.message;
    result = { status: 'error', messages: [] };
  }
  const text = caseText(result);
  const checks = [];
  if (expect.status != null) checks.push({ name: 'status', ok: result.status === expect.status, want: expect.status, got: result.status });
  if (expect.includes != null) checks.push({ name: 'includes', ok: text.includes(String(expect.includes)), want: expect.includes });
  if (expect.excludes != null) checks.push({ name: 'excludes', ok: !text.includes(String(expect.excludes)), want: expect.excludes });
  if (!checks.length) checks.push({ name: 'expect', ok: false, want: 'at least one expectation' });
  const honest = checks.every(c => c.ok);
  return {
    id: kase.id || null,
    pass: brokenL69() ? true : honest,
    checks,
    status: result.status,
    ...(error ? { error } : {}),
  };
}

export async function runEvalSuite(cases, opts) {
  const results = [];
  for (const kase of cases) results.push(await scoreCase(kase, opts));
  const pass = results.filter(r => r.pass).length;
  return { pass, fail: results.length - pass, results };
}
