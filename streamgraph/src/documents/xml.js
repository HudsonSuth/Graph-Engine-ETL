// Tiny XML tokenizer for Office parts. No DTDs, no external entities, no entity expansion beyond the five
// built-in ones and numeric character references. A part with a DOCTYPE is refused (Office never writes one).
import { docError } from './limits.js';
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
  if (e[0] !== '#') return ENT[e.toLowerCase()] ?? m;
  const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
});
const attrRe = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
export function attrs(s) { const o = {}; let m; attrRe.lastIndex = 0; while ((m = attrRe.exec(s))) o[m[1]] = decode(m[3] ?? m[4] ?? ''); return o; }
// Calls onOpen(name, attrs, selfClosing), onClose(name), onText(text) in document order.
export function walk(xml, { onOpen = () => {}, onClose = () => {}, onText = () => {} }) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw docError('This file contains a document type declaration, which Office files never need, so it was not opened.');
  const re = /<(\/?)([\w:.-]+)([^>]*?)(\/?)>|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[6] !== undefined) { onText(decode(m[6])); continue; }
    if (m[5] !== undefined) { onText(m[5]); continue; }
    if (!m[2]) continue;
    if (m[1]) onClose(m[2]);
    else { onOpen(m[2], attrs(m[3] || ''), !!m[4]); if (m[4]) onClose(m[2]); }
  }
}
// Text of the first element with this name (for small property parts).
export function firstText(xml, name) {
  if (!xml) return undefined;
  let depth = 0, out = null;
  walk(xml, { onOpen: (n, a, self) => { if (n === name && out === null && !self) { depth = 1; out = ''; } else if (depth) depth++; }, onClose: () => { if (depth) depth--; }, onText: t => { if (depth) out += t; } });
  return out === null ? undefined : out.trim();
}
