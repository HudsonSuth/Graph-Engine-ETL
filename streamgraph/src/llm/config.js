// data/models.json: the workspace model registry (no secrets, admin-editable), plus defaults (D2) and hard limits (D3).
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import Ajv from 'ajv';
import { literalSecrets, isKeyRef } from './keys.js';
import { CLOUD, providerKnown, HOSTED_PRESETS } from './registry.js';
import { WRONG } from './wrong.js';

export const OLLAMA_URL = 'http://127.0.0.1:11434';
export const DEFAULT_LIMITS = Object.freeze({ maxSteps: 50, maxToolCalls: 100, maxWallSeconds: 900 });
export const TRANSPORTS = ['inproc', 'stdio', 'http', 'sampling', 'direct'];
/** Fresh-install registry (D2): local Ollama only, loopback, nothing downloaded automatically. */
export function defaultModels(ollamaURL = OLLAMA_URL) {
  const wrong = WRONG() ? { 'cloud-fallback': { provider: 'openai_compatible', preset: 'openrouter', baseURL: 'https://openrouter.ai/api/v1', model: 'auto', keyRef: 'env:OPENROUTER_API_KEY' } } : {};
  return {
    models: {
      'local-llama': { provider: 'ollama', model: 'llama3.1:8b', baseURL: ollamaURL, transport: 'inproc', locality: 'local' },
      'nomic-embed': { provider: 'ollama', kind: 'embed', model: 'nomic-embed-text', dims: 768, baseURL: ollamaURL, transport: 'inproc', locality: 'local' },
      ...wrong,
    },
    defaults: { chat: 'local-llama', embed: 'nomic-embed' },
    limits: { ...DEFAULT_LIMITS },
    agents: { enabled: false },
  };
}

const LIMITS = { type: 'object', additionalProperties: false, properties: { maxSteps: { type: 'integer', minimum: 1 }, maxToolCalls: { type: 'integer', minimum: 0 }, maxWallSeconds: { type: 'number', exclusiveMinimum: 0 } } };
export const MODELS_SCHEMA = {
  type: 'object', required: ['models'], additionalProperties: false,
  properties: {
    models: { type: 'object', additionalProperties: {
      type: 'object', required: ['provider'], additionalProperties: false,
      properties: {
        provider: { type: 'string', minLength: 1 }, kind: { enum: ['chat', 'embed'] }, model: { type: 'string' }, dims: { type: 'integer', minimum: 1 },
        baseURL: { type: 'string', pattern: '^https?://' }, preset: { type: 'string' }, region: { type: 'string' }, format: { enum: ['openai', 'anthropic'] },
        headers: { type: 'object', additionalProperties: { type: 'string' } }, headerRefs: { type: 'object', additionalProperties: { type: 'string' } }, url: { type: 'string', pattern: '^https?://' },
        keyRef: { type: 'string' }, transport: { enum: TRANSPORTS }, locality: { enum: ['local', 'remote'] }, allowDirectFallback: { type: 'boolean' },
        remoteModel: { type: 'string' }, command: { type: 'array', items: { type: 'string' } }, adapter: { type: 'object' }, hints: { type: 'object' },
        options: { type: 'object' }, capabilities: { type: 'object' }, allowedRoles: { type: 'array', items: { type: 'string' } }, label: { type: 'string' },
        probeTimeoutMs: { type: 'integer', minimum: 1000 }, timeoutMs: { type: 'integer', minimum: 1000 },
      } } },
    defaults: { type: 'object', additionalProperties: false, properties: { chat: { type: 'string' }, embed: { type: 'string' } } },
    limits: LIMITS,
    budgets: { type: 'object', additionalProperties: false, properties: { perFlowUSD: { type: 'number', minimum: 0 }, perDayUSD: { type: 'number', minimum: 0 } } },
    agents: { type: 'object', additionalProperties: false, properties: { enabled: { type: 'boolean' } } },
  },
};
const ajv = new Ajv({ allErrors: true, strict: false });
const validateSchema = ajv.compile(MODELS_SCHEMA);
const fail = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });

/** All problems with a models.json document (empty array = valid). */
export function validateModels(cfg) {
  const errs = [];
  if (!validateSchema(cfg)) for (const e of validateSchema.errors) errs.push(`${e.instancePath || '/'} ${e.message}`);
  for (const [name, m] of Object.entries(cfg?.models || {})) {
    for (const p of literalSecrets(m, `/models/${name}`)) errs.push(`${p}: literal keys are not allowed; use keyRef "env:NAME" or "secret:<id>"`);
    if (m && typeof m === 'object') {
      const known = providerKnown(m.provider);
      if (!known) errs.push(`/models/${name}/provider: unknown provider "${m.provider}"`);
      if (m.provider === 'openai_compatible' && !m.baseURL && !m.preset) errs.push(`/models/${name}: openai_compatible needs baseURL or preset`);
      if (m.provider === 'openai-compatible-hosted') {
        const p = HOSTED_PRESETS[m.preset];
        if (!m.baseURL && !p) errs.push(`/models/${name}: openai-compatible-hosted needs a known preset (${Object.keys(HOSTED_PRESETS).join(', ')}) or baseURL`);
        if (m.region && !p?.regions?.[m.region]) errs.push(`/models/${name}/region: preset "${m.preset}" has no region "${m.region}"`);
        if (m.format === 'anthropic' && !m.baseURL && !p?.anthropicBaseURL) errs.push(`/models/${name}/format: preset "${m.preset}" has no Anthropic Messages endpoint`);
      }
      for (const [h, ref] of Object.entries(m.headerRefs || {})) if (!isKeyRef(ref)) errs.push(`/models/${name}/headerRefs/${h}: must be env:NAME or secret:<id> (literal keys are not allowed)`);
      if (m.provider === 'mcp' && !m.url && !m.command) errs.push(`/models/${name}: provider "mcp" needs url or command`);
      if (m.transport === 'direct' && ['mcp', 'mcp_sampling'].includes(m.provider)) errs.push(`/models/${name}: provider "${m.provider}" has no in-process class, so it cannot use transport "direct"`);
      if (m.locality === 'local' && (CLOUD.has(m.provider) || m.provider === 'mcp_sampling')) errs.push(`/models/${name}: cloud providers and mcp_sampling are always remote`);
    }
  }
  for (const k of ['chat', 'embed']) { const n = cfg?.defaults?.[k]; if (n && !cfg.models?.[n]) errs.push(`/defaults/${k}: no model named "${n}"`); }
  return errs;
}

export const modelsFile = dataDir => join(dataDir, 'models.json');
/** Load models.json, seeding the fresh-install defaults (D2) when it does not exist. */
export function loadModels(dataDir, { ollamaURL } = {}) {
  const f = modelsFile(dataDir);
  if (!existsSync(f)) { const d = defaultModels(ollamaURL); writeJson(f, d); return d; }
  const cfg = JSON.parse(readFileSync(f, 'utf8'));
  return { ...cfg, limits: { ...DEFAULT_LIMITS, ...(cfg.limits || {}) } };
}
export function saveModels(dataDir, cfg) {
  const errs = validateModels(cfg);
  if (errs.length) throw fail(400, `models.json is not valid: ${errs.join('; ')}`, { errors: errs });
  writeJson(modelsFile(dataDir), cfg);
}
export function writeJson(f, obj) { mkdirSync(dirname(f), { recursive: true }); const t = `${f}.tmp`; writeFileSync(t, JSON.stringify(obj, null, 2)); renameSync(t, f); }

const LOOPBACK = /^(localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)$/i;
export const isLoopback = url => { try { return LOOPBACK.test(new URL(url).hostname); } catch { return false; } };
/**
 * local | remote (D5, D9). Cloud providers and mcp_sampling are always remote. Any non-loopback endpoint is remote too,
 * including a LAN host or a free hosted API (D9, 2026-11-21): `"locality": "local"` cannot override that; it is only
 * honoured for entries without an endpoint URL. `"locality": "remote"` always wins (fail closed).
 */
export function localityOf(entry, cfg) {
  if (!entry) return 'remote';
  if (CLOUD.has(entry.provider) || entry.provider === 'mcp_sampling') return 'remote';
  if (entry.provider === 'mcp' && entry.remoteModel && entry.command && cfg?.models?.[entry.remoteModel]) return localityOf(cfg.models[entry.remoteModel], cfg);
  if (entry.locality === 'remote') return 'remote';
  const url = entry.baseURL || entry.url || (entry.provider === 'ollama' ? OLLAMA_URL : null);
  if (url) return isLoopback(url) ? 'local' : 'remote';
  if (entry.locality === 'local' || entry.provider === 'fake') return 'local';
  return 'remote';
}

/** Model reference precedence: node config.model > flow models.default > workspace defaults.chat|embed. */
export function resolveModelRef({ node, flow, cfg, kind = 'chat' }) {
  const fromNode = typeof node?.model === 'string' ? node.model : node?.model?.name;
  const fromFlow = flow?.models?.[kind === 'embed' ? 'embed' : 'default'];
  const name = fromNode || fromFlow || cfg?.defaults?.[kind];
  return { name, viaDefault: !fromNode && !fromFlow };
}
/** Node-level overrides may set options (temperature, maxTokens...) but never keyRef, baseURL or url (admin-only). */
export function checkNodeModelConfig(nodeModel) {
  if (!nodeModel || typeof nodeModel !== 'object') return;
  for (const k of ['keyRef', 'baseURL', 'url', 'command', 'provider', 'transport', 'locality', 'preset', 'region', 'headers', 'headerRefs'])
    if (k in nodeModel) throw fail(403, `a flow node cannot set ${k}; only an admin can, in the Models registry`);
  if (literalSecrets({ options: nodeModel.options }).length) throw fail(400, 'literal keys are not allowed in node options');
}
/** Admin-only fields of a registry update (A1.5): baseURL, keyRef, url and command. */
export function assertModelsPatchAllowed(prev, next, isAdmin) {
  if (isAdmin) return;
  const names = new Set([...Object.keys(prev?.models || {}), ...Object.keys(next?.models || {})]);
  for (const n of names) for (const k of ['baseURL', 'keyRef', 'url', 'command', 'provider', 'preset', 'region', 'headers', 'headerRefs'])
    if (JSON.stringify(prev?.models?.[n]?.[k]) !== JSON.stringify(next?.models?.[n]?.[k])) throw fail(403, `only an admin can change ${k} (model "${n}")`);
  if (JSON.stringify(prev?.limits) !== JSON.stringify(next?.limits)) {
    for (const k of Object.keys(DEFAULT_LIMITS)) if ((next?.limits?.[k] ?? 0) > (prev?.limits?.[k] ?? DEFAULT_LIMITS[k])) throw fail(403, `only an admin can raise ${k}`);
  }
}
/** Effective hard stops (D3): a flow may lower the workspace limits; raising them needs an admin. */
export function effectiveLimits(workspace = DEFAULT_LIMITS, flow = {}, { isAdmin = false } = {}) {
  const out = { ...DEFAULT_LIMITS, ...workspace };
  for (const k of Object.keys(DEFAULT_LIMITS)) {
    const v = flow?.[k]; if (v == null) continue;
    if (!(typeof v === 'number' && v > 0) && !(k === 'maxToolCalls' && v === 0)) throw fail(400, `${k} must be a positive number`);
    if (v > out[k] && !isAdmin) throw fail(403, `only an admin can raise ${k} above ${out[k]}`);
    out[k] = v;
  }
  return out;
}
export { isKeyRef };
