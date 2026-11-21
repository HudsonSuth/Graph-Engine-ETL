// Keys for bring-your-own-model: config holds only a keyRef ("env:NAME" or "secret:<id>"), never a key.
// Keys are resolved at call time (inside the bridge process for MCP transports) and are never logged,
// stored on objects handed to nodes, put in state, checkpoints, SSE/Kafka events or error messages.
export const KEY_REF = /^(env|secret):[A-Za-z_][A-Za-z0-9_.-]{0,127}$/;
// Key-shaped strings (OpenAI, Anthropic, xAI, Groq, Google, AWS, OpenRouter, generic bearer-ish tokens).
export const KEY_SHAPE = /\b(?:sk-(?:ant-|or-|proj-)?[A-Za-z0-9_-]{16,}|xai-[A-Za-z0-9_-]{16,}|gsk_[A-Za-z0-9]{16,}|AIza[0-9A-Za-z_-]{30,}|AKIA[0-9A-Z]{16}|hf_[A-Za-z0-9]{20,})\b/g;
const SECRET_OPTION = /^(api[_-]?key|apikey|key|token|secret|password|access[_-]?key[_-]?id|secret[_-]?access[_-]?key|session[_-]?token|authorization|azureOpenAIApiKey|credentials)$/i;

export const isKeyRef = v => typeof v === 'string' && KEY_REF.test(v);
export const looksLikeKey = v => typeof v === 'string' && new RegExp(KEY_SHAPE.source).test(v);

/** Literal secrets anywhere in a model entry: a non-keyRef keyRef, a secret-named option, or a key-shaped value. */
export function literalSecrets(entry, path = '') {
  const out = [];
  const walk = (v, p) => {
    if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) { if (v === entry && k === 'keyRef') continue; if (SECRET_OPTION.test(k) && x != null && x !== '') out.push(`${p}/${k}`); else walk(x, `${p}/${k}`); } return; }
    if (looksLikeKey(v)) out.push(p || '/');
  };
  if (entry?.keyRef != null && !isKeyRef(entry.keyRef)) out.push(`${path}/keyRef`);
  walk(entry, path);
  return out;
}

export class KeyError extends Error { constructor(msg) { super(msg); this.code = 'auth_error'; this.status = 400; } }

/** Resolve a keyRef to its value. Never include the value in an error. */
export function resolveKeyRef(ref, { env = process.env, secret } = {}) {
  if (ref == null || ref === '') return undefined;
  if (!isKeyRef(ref)) throw new KeyError('keyRef must look like env:NAME or secret:<id> (literal keys are not allowed)');
  const [kind, name] = [ref.slice(0, ref.indexOf(':')), ref.slice(ref.indexOf(':') + 1)];
  const v = kind === 'env' ? env[name] : secret?.(name);
  if (v == null || v === '') throw new KeyError(kind === 'env' ? `the environment variable ${name} is not set` : `the secret "${name}" is not set`);
  return String(v);
}

/** A redaction function: replaces every known key value and anything key-shaped with [redacted]. */
export function makeRedactor(known = []) {
  const vals = new Set(known.filter(v => typeof v === 'string' && v.length >= 4));
  const fn = s => {
    let out = typeof s === 'string' ? s : JSON.stringify(s) ?? String(s);
    for (const v of vals) out = out.split(v).join('[redacted]');
    return out.replace(KEY_SHAPE, '[redacted]');
  };
  fn.add = v => { if (typeof v === 'string' && v.length >= 4) vals.add(v); };
  return fn;
}
