// Shared connector helpers: error sanitizing (never leak secrets), limits, stable ids.
import { envelope } from '../../shared/model.js';
export { envelope };
export const MAX_LIMIT = 5000;
export const capLimit = (limit, max = MAX_LIMIT) => Math.max(1, Math.min(Number.isFinite(+limit) ? Math.floor(+limit) : 100, max));
/** Remove anything that looks like a credential from a message before it can reach a client. */
export function sanitize(msg, secrets = []) {
  let s = String(msg ?? '');
  for (const sec of secrets) if (sec) s = s.split(String(sec)).join('***');
  s = s.replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, '$1***@')               // user:pass@ in URLs
    .replace(/(password|passwd|pwd|token|secret|authorization|api[_-]?key)\s*[=:]\s*\S+/gi, '$1=***')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer ***');
  return s.slice(0, 300);
}
export function fail(sourceId, code, err, secrets, startedAt) {
  return envelope({ sourceId, error: { code, message: sanitize(err?.message || err, secrets) }, startedAt });
}
