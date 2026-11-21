// Model catalog importer for hosted OpenAI-compatible APIs (provider "openai-compatible-hosted").
// Reads GET <base>/models and turns each entry into a models.json entry plus a price-table row.
// Inference.net's catalog (CONFIRMED with a live GET on 2026-11-21) carries: id, context_length, max_completion_tokens,
// reasoning_efforts, input_modalities, output_modalities, supported_endpoints ("chat", "responses", "messages"),
// pricing { prompt, completion, input_cache_read } in USD per token, and requires_approved_access / access_status on
// privileged models. It does NOT report tool support, so toolCalling is left for the capability probe to decide.
// Other presets (OpenRouter, Together, Fireworks, DeepInfra, Groq) are parsed with the same tolerant reader; unverified.
import { HOSTED_PRESETS } from './registry.js';
import { ModelError, classify } from './wire.js';

const num = v => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const perM = v => { const n = num(v); return n == null ? null : Math.round(n * 1e6 * 1e6) / 1e6; }; // USD/token -> USD/1M, 6 dp
const slug = s => String(s).replace(/[^\w.:/-]+/g, '-');

/** One catalog item -> { entry, price }. */
export function catalogItemToEntry(item, { preset, region, baseURL, keyRef, source, asOf }) {
  const eps = (item.supported_endpoints || []).map(String);
  const inMods = item.input_modalities || item.architecture?.input_modalities || [];
  const embedOnly = eps.length > 0 && eps.every(e => /embed/.test(e));
  const caps = {
    maxInputTokens: num(item.context_length ?? item.context_window ?? item.top_provider?.context_length),
    maxOutputTokens: num(item.max_completion_tokens ?? item.top_provider?.max_completion_tokens),
    vision: inMods.includes('image'),
    reasoningEfforts: item.reasoning_efforts || undefined,
    endpoints: eps.length ? eps : undefined,
    toolCalling: null, // unknown: the catalog does not say; the probe decides (plan §5.4)
    profileSource: 'catalog',
  };
  if (item.requires_approved_access != null) caps.requiresApprovedAccess = !!item.requires_approved_access;
  if (item.access_status != null) caps.accessStatus = String(item.access_status);
  const entry = { provider: 'openai-compatible-hosted', ...(preset ? { preset } : {}), ...(region ? { region } : {}), ...(baseURL ? { baseURL } : {}), model: item.id, ...(keyRef ? { keyRef } : {}), transport: 'inproc', label: item.name || item.id, ...(embedOnly ? { kind: 'embed' } : {}), capabilities: Object.fromEntries(Object.entries(caps).filter(([, v]) => v !== undefined)) };
  const pr = item.pricing || {};
  const price = { inputPer1M: perM(pr.prompt ?? pr.input), outputPer1M: perM(pr.completion ?? pr.output), currency: 'USD', source, asOf };
  const cached = perM(pr.input_cache_read ?? pr.cached_input); if (cached != null) price.cachedInputPer1M = cached;
  return { entry, price: price.inputPer1M == null && price.outputPer1M == null ? null : price };
}

/**
 * Fetch and convert a catalog. Returns { models: {name: entry}, prices: {key: row}, source, needsApproval: [names] }.
 * Names are "<prefix>/<id>" (prefix defaults to the preset). `only` keeps ids matching a RegExp or string list.
 */
export async function importCatalog({ preset, region, baseURL, keyRef, apiKey, prefix, only, fetchImpl = globalThis.fetch, now = new Date() }) {
  const p = preset ? HOSTED_PRESETS[preset] : null;
  if (preset && !p) throw new ModelError('bad_request', `unknown hosted preset "${preset}"`);
  if (region && !p?.regions?.[region]) throw new ModelError('bad_request', `preset "${preset}" has no region "${region}"`);
  const base = (baseURL || (region ? p.regions[region] : p?.baseURL) || '').replace(/\/+$/, '');
  if (!base) throw new ModelError('bad_request', 'a preset or baseURL is required');
  const source = `${base}/models`;
  let res;
  try { res = await fetchImpl(source, { headers: { accept: 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) }, signal: AbortSignal.timeout(20000) }); }
  catch (e) { throw new ModelError(classify(e), `could not read the model catalog at ${source}`); }
  if (!res.ok) throw new ModelError(res.status === 401 || res.status === 403 ? 'auth_error' : 'error', `the model catalog at ${source} answered HTTP ${res.status}${p?.catalogNeedsKey ? ` (this provider needs ${p.keyEnv} to list models)` : ''}`);
  const body = await res.json();
  const items = Array.isArray(body) ? body : body.data || body.models || [];
  const keep = only == null ? () => true : only instanceof RegExp ? id => only.test(id) : id => [].concat(only).includes(id);
  const pre = prefix || preset || new URL(base).hostname, asOf = now.toISOString().slice(0, 10);
  const models = {}, prices = {}, needsApproval = [];
  for (const item of items) {
    if (!item?.id || !keep(item.id)) continue;
    const name = slug(`${pre}/${item.id}`);
    const { entry, price } = catalogItemToEntry(item, { preset, region, baseURL: baseURL || !preset ? base : undefined, keyRef, source, asOf });
    models[name] = entry;
    if (entry.capabilities.requiresApprovedAccess && entry.capabilities.accessStatus !== 'approved' && entry.capabilities.accessStatus !== 'granted') needsApproval.push(name);
    if (price) prices[`openai-compatible-hosted${preset ? `:${preset}` : ''}/${item.id}`] = price;
  }
  return { models, prices, source, needsApproval };
}
