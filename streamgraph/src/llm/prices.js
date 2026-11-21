// data/model-prices.json: user-editable price table (plan §5.7). Prices are data, not code; costs are for visibility only.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { writeJson } from './config.js';

export const pricesFile = dataDir => join(dataDir, 'model-prices.json');
/** Seed: local models are $0. Paid entries start "price unknown" (null) with the pricing page to copy from, because prices change often. */
export function defaultPrices() {
  const asOf = '2026-11-21';
  return {
    note: 'USD per 1M tokens. Edit freely. null = price unknown. Local models are 0. MCP sampling is billed by your host.',
    prices: {
      'ollama/*': { inputPer1M: 0, outputPer1M: 0, embedPer1M: 0, currency: 'USD', source: 'local model (no charge)', asOf },
      'openai/*': { inputPer1M: null, outputPer1M: null, currency: 'USD', source: 'https://openai.com/api/pricing/', asOf },
      'anthropic/*': { inputPer1M: null, outputPer1M: null, currency: 'USD', source: 'https://www.anthropic.com/pricing#api', asOf },
      'google-genai/*': { inputPer1M: null, outputPer1M: null, currency: 'USD', source: 'https://ai.google.dev/gemini-api/docs/pricing', asOf },
      'xai/*': { inputPer1M: null, outputPer1M: null, currency: 'USD', source: 'https://docs.x.ai/docs/models', asOf },
      'mistralai/*': { inputPer1M: null, outputPer1M: null, currency: 'USD', source: 'https://mistral.ai/pricing', asOf },
      'groq/*': { inputPer1M: null, outputPer1M: null, currency: 'USD', source: 'https://groq.com/pricing', asOf },
    },
  };
}
export function loadPrices(dataDir) {
  const f = pricesFile(dataDir);
  if (!existsSync(f)) { const d = defaultPrices(); writeJson(f, d); return d; }
  return JSON.parse(readFileSync(f, 'utf8'));
}
export function savePrices(dataDir, doc) {
  if (!doc || typeof doc.prices !== 'object') throw Object.assign(new Error('prices must be an object'), { status: 400 });
  for (const [k, p] of Object.entries(doc.prices)) for (const f of ['inputPer1M', 'outputPer1M', 'cachedInputPer1M', 'embedPer1M'])
    if (p[f] != null && !(typeof p[f] === 'number' && p[f] >= 0)) throw Object.assign(new Error(`${k}.${f} must be a number >= 0 or null`), { status: 400 });
  writeJson(pricesFile(dataDir), doc);
}
/** Price row for a model entry: exact "provider/model", then "provider/*". MCP sampling: billed by the host. */
export function priceFor(doc, entry) {
  if (entry?.provider === 'mcp_sampling') return { billedByHost: true };
  const p = doc?.prices || {};
  const pre = entry?.preset ? `${entry.provider}:${entry.preset}` : null;
  return (pre && (p[`${pre}/${entry.model}`] || p[`${pre}/*`])) || p[`${entry?.provider}/${entry?.model}`] || p[`${entry?.provider}/*`] || null;
}
/** Dollar cost of one call, or null when the price is unknown. */
export function costOf(price, usage) {
  if (!price || price.billedByHost || price.inputPer1M == null || price.outputPer1M == null) return null;
  return ((usage.input_tokens || 0) * price.inputPer1M + (usage.output_tokens || 0) * price.outputPer1M) / 1e6;
}
/** Token estimate when a provider does not report usage: characters / 4, marked estimated. */
export const estimateTokens = text => Math.ceil(String(text || '').length / 4);
