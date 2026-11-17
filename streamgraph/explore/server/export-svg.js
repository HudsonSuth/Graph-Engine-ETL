// Deterministic fixed-layout SVG export (Phase 3). Same items + same positions => byte-identical file (sorted output, fixed
// precision, no timestamps). Without positions, nodes go on a circle in id order. PNG is drawn from this SVG in the browser.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PAL = ['#2563eb', '#1f9d55', '#e8a317', '#9b51e0', '#d92d20', '#0e9aa7', '#c2410c', '#4b5563'];
const THEMES = { light: { bg: '#ffffff', text: '#1d2430', link: '#9aa5b5' }, dark: { bg: '#0f1420', text: '#e6ebf5', link: '#46516a' }, contrast: { bg: '#000000', text: '#ffffff', link: '#ffff00' } };
const f = n => (Math.round(n * 10) / 10).toFixed(1);
export function renderSvg(items, { positions = {}, title = '', theme = 'light', width = 1200, height = 800 } = {}) {
  const T = THEMES[theme] || THEMES.light, W = Math.min(8000, Math.max(200, Number(width) || 1200)), H = Math.min(8000, Math.max(200, Number(height) || 800));
  const nodes = items.filter(i => i.kind === 'node').sort((a, b) => a.id.localeCompare(b.id)), links = items.filter(i => i.kind === 'link').sort((a, b) => a.id.localeCompare(b.id));
  const types = [...new Set(nodes.map(n => n.type))].sort(), color = t => PAL[types.indexOf(t) % PAL.length];
  let P = new Map(nodes.filter(n => Array.isArray(positions[n.id])).map(n => [n.id, positions[n.id].map(Number)]));
  if (P.size < nodes.length) { const R = 0.4 * Math.min(W, H); nodes.forEach((n, i) => { if (!P.has(n.id)) P.set(n.id, [R * Math.cos((2 * Math.PI * i) / Math.max(1, nodes.length)), R * Math.sin((2 * Math.PI * i) / Math.max(1, nodes.length))]); }); }
  const xs = [...P.values()].map(p => p[0]), ys = [...P.values()].map(p => p[1]), pad = 60, top = title ? 50 : 20;
  const [x0, x1, y0, y1] = xs.length ? [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)] : [0, 1, 0, 1];
  const s = Math.min((W - 2 * pad) / Math.max(1e-9, x1 - x0 || 1), (H - pad - top - 40) / Math.max(1e-9, y1 - y0 || 1));
  const X = x => pad + (x - x0) * s + ((W - 2 * pad) - (x1 - x0) * s) / 2, Y = y => top + 20 + (y - y0) * s + ((H - pad - top - 40) - (y1 - y0) * s) / 2;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif" role="img" aria-label="${esc(title || 'StreamGraph view')}">`,
    `<rect width="${W}" height="${H}" fill="${T.bg}"/>`, title ? `<text x="${pad}" y="34" font-size="20" font-weight="bold" fill="${T.text}">${esc(title)}</text>` : ''];
  out.push('<g stroke-width="1.5" fill="none">');
  for (const l of links) { const a = P.get(l.fromId), b = P.get(l.toId); if (a && b) out.push(`<line x1="${f(X(a[0]))}" y1="${f(Y(a[1]))}" x2="${f(X(b[0]))}" y2="${f(Y(b[1]))}" stroke="${T.link}"><title>${esc(l.type)}</title></line>`); }
  out.push('</g><g font-size="11">');
  for (const n of nodes) { const [x, y] = P.get(n.id); out.push(`<circle cx="${f(X(x))}" cy="${f(Y(y))}" r="7" fill="${color(n.type)}" stroke="${T.bg}" stroke-width="1.5"><title>${esc(n.type)}: ${esc(n.label)}</title></circle><text x="${f(X(x) + 10)}" y="${f(Y(y) + 4)}" fill="${T.text}">${esc(String(n.label).slice(0, 40))}</text>`); }
  out.push('</g>');
  types.forEach((t, i) => out.push(`<circle cx="${pad + 8 + i * 140}" cy="${H - 22}" r="6" fill="${color(t)}"/><text x="${pad + 20 + i * 140}" y="${H - 18}" font-size="12" fill="${T.text}">${esc(t)} (${nodes.filter(n => n.type === t).length})</text>`));
  out.push('</svg>');
  return out.filter(Boolean).join('\n') + '\n';
}
