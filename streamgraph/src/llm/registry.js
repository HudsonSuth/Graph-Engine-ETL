// Provider registry: provider id -> LangChain.js package + class, how to pass the key and base URL, capability hints.
// Seeded from langchain's initChatModel table (openai, anthropic, azure_openai, google-genai, ollama, mistralai, groq,
// bedrock, xai) plus openai_compatible (ChatOpenAI + baseURL). Packages are imported lazily, only when a model is built,
// so a provider package that is not installed only breaks the models that use it.
export const PROVIDERS = {
  openai: { pkg: '@langchain/openai', chat: 'ChatOpenAI', embed: 'OpenAIEmbeddings', key: 'apiKey', base: (o, u) => { o.configuration = { ...(o.configuration || {}), baseURL: u }; } },
  azure_openai: { pkg: '@langchain/openai', chat: 'AzureChatOpenAI', embed: 'AzureOpenAIEmbeddings', key: 'azureOpenAIApiKey', model: (o, m) => { o.azureOpenAIApiDeploymentName = m; o.model = m; } },
  openai_compatible: { pkg: '@langchain/openai', chat: 'ChatOpenAI', embed: 'OpenAIEmbeddings', key: 'apiKey', keyOptional: true, base: (o, u) => { o.configuration = { ...(o.configuration || {}), baseURL: u }; } },
  anthropic: { pkg: '@langchain/anthropic', chat: 'ChatAnthropic', key: 'apiKey', base: (o, u) => { o.anthropicApiUrl = u; } },
  'google-genai': { pkg: '@langchain/google-genai', chat: 'ChatGoogleGenerativeAI', embed: 'GoogleGenerativeAIEmbeddings', key: 'apiKey', base: (o, u) => { o.baseUrl = u; } },
  xai: { pkg: '@langchain/xai', chat: 'ChatXAI', key: 'apiKey' },
  bedrock: { pkg: '@langchain/aws', chat: 'ChatBedrockConverse', embed: 'BedrockEmbeddings', key: 'credentials', keyOptional: true, keyJson: true },
  mistralai: { pkg: '@langchain/mistralai', chat: 'ChatMistralAI', embed: 'MistralAIEmbeddings', key: 'apiKey', base: (o, u) => { o.serverURL = u; } },
  groq: { pkg: '@langchain/groq', chat: 'ChatGroq', key: 'apiKey' },
  // Hosted OpenAI-compatible APIs and inference aggregators (Inference.net, OpenRouter, Together, Fireworks, DeepInfra,
  // Groq...). Always remote (D5). Pick a `preset` (+ optional `region`) or set `baseURL`. `format: "anthropic"` uses the
  // preset's Anthropic Messages endpoint with ChatAnthropic instead.
  'openai-compatible-hosted': { pkg: '@langchain/openai', chat: 'ChatOpenAI', embed: 'OpenAIEmbeddings', key: 'apiKey', base: (o, u) => { o.configuration = { ...(o.configuration || {}), baseURL: u }; } },
  ollama: { pkg: '@langchain/ollama', chat: 'ChatOllama', embed: 'OllamaEmbeddings', key: null, base: (o, u) => { o.baseUrl = u; }, local: true },
};
PROVIDERS.google = PROVIDERS['google-genai']; // alias used by initChatModel
PROVIDERS.aws = PROVIDERS.bedrock;
/** Providers that are hosted services: always `remote` for the locality gate (D5). */
export const CLOUD = new Set(['openai-compatible-hosted', 'openai', 'azure_openai', 'anthropic', 'google', 'google-genai', 'xai', 'bedrock', 'aws', 'mistralai', 'groq']);
/** openai_compatible presets (admin picks one or sets baseURL). */
export const OPENAI_COMPATIBLE_PRESETS = {
  vllm: 'http://127.0.0.1:8000/v1',
  lmstudio: 'http://127.0.0.1:1234/v1',
  llamacpp: 'http://127.0.0.1:8080/v1',
  litellm: 'http://127.0.0.1:4000/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};
/**
 * Presets for provider "openai-compatible-hosted". `verified` = checked against the provider's docs/catalog
 * (Inference.net: inference.net/docs and a live GET /v1/models on 2026-11-21); the others are presets only, not verified.
 */
export const HOSTED_PRESETS = {
  inference: { label: 'Inference.net', baseURL: 'https://api.inference.net/v1', regions: { us: 'https://us.api.inference.net/v1' }, anthropicBaseURL: 'https://api.inference.net', keyEnv: 'INFERENCE_API_KEY', catalog: true, catalogNeedsKey: false, verified: true, docs: 'https://inference.net/docs' },
  openrouter: { label: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', keyEnv: 'OPENROUTER_API_KEY', catalog: true, catalogNeedsKey: false, verified: false },
  together: { label: 'Together AI', baseURL: 'https://api.together.xyz/v1', keyEnv: 'TOGETHER_API_KEY', catalog: true, catalogNeedsKey: true, verified: false },
  fireworks: { label: 'Fireworks AI', baseURL: 'https://api.fireworks.ai/inference/v1', keyEnv: 'FIREWORKS_API_KEY', catalog: true, catalogNeedsKey: true, verified: false },
  deepinfra: { label: 'DeepInfra', baseURL: 'https://api.deepinfra.com/v1/openai', keyEnv: 'DEEPINFRA_API_KEY', catalog: true, catalogNeedsKey: true, verified: false },
  groq: { label: 'Groq (OpenAI-compatible)', baseURL: 'https://api.groq.com/openai/v1', keyEnv: 'GROQ_API_KEY', catalog: true, catalogNeedsKey: true, verified: false },
};
const custom = new Map(); // provider id -> { chat(entry, { apiKey }), embed?(entry, { apiKey }), cloud? }  (tests register "fake")
export function registerProvider(id, impl) { custom.set(id, impl); if (impl.cloud) CLOUD.add(id); }
export const providerKnown = id => id in PROVIDERS || custom.has(id) || id === 'mcp' || id === 'mcp_sampling';
export function baseURLOf(entry) {
  if (entry.baseURL) return entry.baseURL;
  if (entry.provider === 'openai_compatible' && entry.preset) return OPENAI_COMPATIBLE_PRESETS[entry.preset];
  if (entry.provider === 'openai-compatible-hosted' && entry.preset) {
    const p = HOSTED_PRESETS[entry.preset]; if (!p) return undefined;
    if (entry.format === 'anthropic') return p.anthropicBaseURL;
    return entry.region ? p.regions?.[entry.region] : p.baseURL;
  }
  return undefined;
}

/** The constructor options for a provider class (no network). The key is passed in by the caller at call time. */
/** LangChain's default is 6 retries with backoff, and @langchain/openai also retries a reply whose structured JSON
 * failed to parse, so one bad reply could cost minutes. One retry by default; set options.maxRetries per model to change it. */
export const DEFAULT_MAX_RETRIES = 1;
export function buildOptions(entry, { apiKey, kind = entry.kind || 'chat', headers } = {}) {
  if (entry.provider === 'openai-compatible-hosted' && entry.format === 'anthropic') { // Anthropic Messages format on the aggregator
    const base = baseURLOf(entry); if (!base) throw Object.assign(new Error(`preset "${entry.preset}" has no Anthropic Messages endpoint`), { code: 'bad_request' });
    if (kind !== 'chat') throw Object.assign(new Error('the Anthropic Messages format has no embeddings'), { code: 'unsupported' });
    return { pkg: '@langchain/anthropic', className: 'ChatAnthropic', options: { maxRetries: DEFAULT_MAX_RETRIES, ...(entry.options || {}), model: entry.model, anthropicApiUrl: base, ...(apiKey != null ? { apiKey } : {}), ...(headers ? { clientOptions: { defaultHeaders: headers } } : {}) } };
  }
  const p = PROVIDERS[entry.provider];
  if (!p) throw Object.assign(new Error(`unknown provider "${entry.provider}"`), { code: 'bad_request' });
  const className = kind === 'embed' ? p.embed : p.chat;
  if (!className) throw Object.assign(new Error(`provider "${entry.provider}" has no ${kind} class`), { code: 'unsupported' });
  const o = { maxRetries: DEFAULT_MAX_RETRIES, ...(entry.options || {}) };
  if (p.model) p.model(o, entry.model); else o.model = entry.model;
  const base = baseURLOf(entry); if (base && p.base) p.base(o, base);
  if (apiKey != null && p.key) o[p.key] = p.keyJson ? JSON.parse(apiKey) : apiKey;
  else if (p.key && entry.provider === 'openai_compatible') o.apiKey = 'not-needed'; // local servers ignore it; the OpenAI SDK requires a value
  if (kind === 'chat' && entry.provider === 'openai_compatible') o.streamUsage = o.streamUsage ?? false;
  if (headers && ['openai', 'openai_compatible', 'openai-compatible-hosted', 'azure_openai'].includes(entry.provider)) o.configuration = { ...(o.configuration || {}), defaultHeaders: { ...(o.configuration?.defaultHeaders || {}), ...headers } };
  return { pkg: p.pkg, className, options: o };
}

/** Build the LangChain class instance in this process (transport "direct", or inside the Model Bridge). */
export async function createProviderModel(entry, { apiKey, kind = entry.kind || 'chat', headers } = {}) {
  const c = custom.get(entry.provider);
  if (c) { const f = kind === 'embed' ? c.embed : c.chat; if (!f) throw Object.assign(new Error(`provider "${entry.provider}" has no ${kind} class`), { code: 'unsupported' }); return f(entry, { apiKey }); }
  const { pkg, className, options } = buildOptions(entry, { apiKey, kind, headers });
  let mod;
  try { mod = await import(pkg); } catch { throw Object.assign(new Error(`the provider package ${pkg} is not installed (npm install ${pkg})`), { code: 'unsupported' }); }
  return new mod[className](options);
}
/** Request headers for an entry: literal non-secret `headers` plus `headerRefs` (header -> keyRef), resolved at call time. */
export function headersFor(entry, resolve) {
  const out = { ...(entry.headers || {}) };
  for (const [h, ref] of Object.entries(entry.headerRefs || {})) out[h] = resolve(ref);
  return Object.keys(out).length ? out : undefined;
}
export const needsKey = entry => { const c = custom.get(entry.provider); if (c) return !!c.needsKey; const p = PROVIDERS[entry.provider]; return !!(p && p.key && !p.keyOptional); };
