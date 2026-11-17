// CSS colour -> packed RGBA8 (little-endian u32: r | g<<8 | b<<16 | a<<24), cached. Hex / rgb() / rgba() parse
// directly; anything else (named colours, hsl()) goes through a 2D canvas once when a DOM is available.
const cache = new Map();
let ctx = null;
const pack = (r, g, b, a) => ((r & 255) | ((g & 255) << 8) | ((b & 255) << 16) | ((Math.round(a * 255) & 255) << 24)) >>> 0;
export function parseColor(css) {
  if (css == null || css === '') return 0;
  let v = cache.get(css); if (v !== undefined) return v;
  v = parseUncached(String(css).trim());
  if (cache.size > 5000) cache.clear();
  cache.set(css, v); return v;
}
function parseUncached(s) {
  if (s[0] === '#') {
    const h = s.slice(1);
    if (h.length === 3 || h.length === 4) { const n = [...h].map(c => parseInt(c + c, 16)); return pack(n[0], n[1], n[2], h.length === 4 ? n[3] / 255 : 1); }
    if (h.length === 6 || h.length === 8) return pack(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1);
  }
  const m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i);
  if (m) { const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]); return pack(+m[1], +m[2], +m[3], Math.max(0, Math.min(1, a))); }
  if (s === 'transparent') return 0;
  if (typeof document !== 'undefined') {
    ctx ||= document.createElement('canvas').getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillStyle = s; const n = ctx.fillStyle;
    if (n !== s) return parseUncached(n);
  }
  return pack(102, 102, 102, 1); // sigma's default node colour
}
export const unpack = u => [u & 255, (u >>> 8) & 255, (u >>> 16) & 255, ((u >>> 24) & 255) / 255];
/** multiply alpha (node / edge opacity attribute) */
export const withAlpha = (u, opacity) => (opacity >= 1 || opacity == null ? u : ((u & 0x00ffffff) | ((Math.round(((u >>> 24) & 255) * Math.max(0, opacity)) & 255) << 24)) >>> 0);
export const toCss = u => { const [r, g, b, a] = unpack(u); return `rgba(${r},${g},${b},${a})`; };
