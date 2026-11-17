// Safe expression layer: JSONata (MIT) stands in for SpEL. No eval, no Function().
import jsonata from 'jsonata';
const cache = new Map();
export function compile(src) {
  if (!cache.has(src)) cache.set(src, jsonata(src));
  return cache.get(src);
}
// Helper functions available to every expression (used by the no-code Clean up presets).
const pad = n => String(n).padStart(2, '0');
export const HELPERS = {
  sgDate(v, format) { // returns YYYY-MM-DD, or the original value if it cannot be read
    if (v == null || v === '') return v;
    const s = String(v).trim(); let y, m, d;
    const p = s.split(/[\/.\-\s]+/);
    if (format === 'MM/DD/YYYY' && p.length >= 3) [m, d, y] = p;
    else if (format === 'DD/MM/YYYY' && p.length >= 3) [d, m, y] = p;
    else { const t = new Date(s); if (isNaN(t)) return v; return t.toISOString().slice(0, 10); }
    y = +y; if (y < 100) y += 2000; const t = new Date(Date.UTC(y, +m - 1, +d));
    return isNaN(t) || t.getUTCDate() !== +d ? v : `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  },
};
export async function evaluate(src, data, bindings = {}) {
  if (typeof src !== 'string') return src;
  return compile(src).evaluate(data, { ...HELPERS, ...bindings });
}
export function checkSyntax(src) {
  try { jsonata(src); return null; } catch (e) { return e.message; }
}
