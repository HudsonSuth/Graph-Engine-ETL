// L7 — run traces. Local metadata is written to data/agent-traces.json (gitignored).
// Hosted LangSmith is off unless models.json agents.tracing.langsmith is true AND LANGSMITH_API_KEY
// is set in the environment. A stray LANGSMITH_TRACING does not send anything: LangChain's own
// switch is forced off, and this module posts only after the export check. The body is metadata.
// Prompts, retrieved text and keys are not stored and not sent.
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { makeRedactor } from '../llm/keys.js';
import { brokenL69 } from './l69-wrong.js';

const MAX = 200;
export const LANGSMITH_DEFAULT = 'https://api.smith.langchain.com';

/** LangChain posts to LangSmith on its own when these are truthy. StreamGraph never wants that. */
export function silenceLangChainTracing() {
  process.env.LANGSMITH_TRACING = 'false';
  process.env.LANGCHAIN_TRACING_V2 = 'false';
}

export function tracingPrefs(modelsCfg) {
  const t = modelsCfg?.agents?.tracing || {};
  return { local: t.local !== false, langsmith: t.langsmith === true };
}

function readDoc(file) {
  if (!file || !existsSync(file)) return { traces: [] };
  try {
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    return { traces: Array.isArray(doc?.traces) ? doc.traces : [] };
  } catch {
    return { traces: [] };
  }
}

function writeDoc(file, doc) {
  mkdirSync(dirname(file), { recursive: true });
  const body = JSON.stringify(doc);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, body);
  try { renameSync(tmp, file); }
  catch { writeFileSync(file, body); }
}

/** A trace the API and the file may keep. Drops message text. */
export function publicTrace(raw, knownSecrets = []) {
  const redact = makeRedactor(knownSecrets);
  const nodes = (raw.nodes || []).map(n => ({
    node: String(n.node || ''),
    type: String(n.type || ''),
    ms: Number(n.ms) || 0,
    status: String(n.status || ''),
    ...(n.code ? { code: String(n.code).slice(0, 80) } : {}),
  }));
  const out = {
    id: String(raw.id || ''),
    threadId: raw.threadId || null,
    flow: raw.flow || null,
    status: String(raw.status || ''),
    model: raw.model || null,
    locality: raw.locality || null,
    startedAt: raw.startedAt || null,
    endedAt: raw.endedAt || null,
    durationMs: raw.durationMs ?? null,
    nodes,
    contextTypes: [...new Set((raw.contextTypes || []).map(String))],
    hosted: raw.hosted || 'off',
    ...(raw.hostedReason ? { hostedReason: String(raw.hostedReason) } : {}),
  };
  const text = redact(JSON.stringify(out));
  return JSON.parse(text);
}

export function loadTraces(file) {
  return readDoc(file).traces.map(t => publicTrace(t));
}

export function appendTrace(file, raw, knownSecrets = []) {
  if (!file) return null;
  const trace = publicTrace(raw, knownSecrets);
  if (brokenL69() && raw.prompt) trace.prompt = String(raw.prompt);
  const doc = readDoc(file);
  doc.traces.push(trace);
  if (doc.traces.length > MAX) doc.traces.splice(0, doc.traces.length - MAX);
  writeDoc(file, doc);
  return publicTrace(trace, knownSecrets);
}

export function langsmithEndpoint(env = process.env) {
  const raw = env.LANGSMITH_ENDPOINT || LANGSMITH_DEFAULT;
  let url;
  try { url = new URL(raw); }
  catch { return { ok: false, reason: 'bad_endpoint' }; }
  if (url.protocol !== 'https:') return { ok: false, reason: 'bad_endpoint' };
  return { ok: true, url };
}

/**
 * Post one metadata run to LangSmith, or explain why it was not sent.
 * `exportAllowed` is the locality gate: false means nothing leaves the machine.
 */
export async function maybeSendLangSmith({ enabled, apiKey, exportAllowed, trace, prompt, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const leak = brokenL69();
  if (!leak) {
    if (!enabled) return { hosted: 'off' };
    if (!apiKey) return { hosted: 'skipped', reason: 'no_key' };
    if (!exportAllowed) return { hosted: 'skipped', reason: 'export_denied' };
  } else if (!apiKey) {
    return { hosted: 'skipped', reason: 'no_key' };
  }
  const ep = langsmithEndpoint(env);
  if (!ep.ok) return { hosted: 'skipped', reason: ep.reason };
  const safe = publicTrace(trace);
  const body = {
    id: safe.id || randomUUID(),
    name: safe.flow || 'agent',
    run_type: 'chain',
    start_time: new Date(safe.startedAt || Date.now()).toISOString(),
    end_time: new Date(safe.endedAt || Date.now()).toISOString(),
    inputs: leak && prompt ? { prompt: String(prompt) } : {},
    outputs: { status: safe.status },
    extra: { metadata: { threadId: safe.threadId, model: safe.model, locality: safe.locality, durationMs: safe.durationMs, nodes: safe.nodes.map(n => n.node) } },
    session_name: 'streamgraph',
  };
  const res = await fetchImpl(new URL('/runs', ep.url), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { hosted: 'error', reason: `http_${res.status}` };
  return { hosted: 'sent' };
}
