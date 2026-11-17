// Markdown note parsing shared by both wiki dialects (Vault-LD and OKF v0.2).
// Frontmatter is YAML (YAML 1.2 core schema, so dates stay strings) between a leading "---" line and the next "---" line.
// The body is everything after the closing fence and is kept byte-for-byte.
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';
import { createHash } from 'node:crypto';

export const sha256 = s => createHash('sha256').update(s).digest('hex');
const FENCE = /^---[ \t]*\r?\n/;

/** Split a note into { frontmatter, body, raw, problems }. frontmatter is null when there is none or it is not a mapping. */
export function splitNote(text) {
  const problems = [];
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const m = FENCE.exec(text);
  if (!m) return { frontmatter: null, fmText: null, body: text, problems };
  const rest = text.slice(m[0].length);
  const close = /^---[ \t]*(\r?\n|$)/m.exec(rest);
  if (!close) return { frontmatter: null, fmText: null, body: text, problems: ['frontmatter: no closing --- line'] };
  const fmText = rest.slice(0, close.index), body = rest.slice(close.index + close[0].length);
  let fm = null;
  try {
    fm = yamlParse(fmText, { schema: 'core', customTags: [], uniqueKeys: true, maxAliasCount: 100 }) ?? {};
    if (typeof fm !== 'object' || Array.isArray(fm)) { problems.push('frontmatter: must be a YAML mapping'); fm = null; }
  } catch (e) { problems.push(`frontmatter: YAML error: ${String(e.message).split('\n')[0]}`); fm = null; }
  return { frontmatter: fm, fmText, body, problems };
}

/** Serialize frontmatter + body back to a note. Strings that look like timestamps/numbers are quoted by the YAML lib. */
export function joinNote(frontmatter, body = '') {
  if (!frontmatter || !Object.keys(frontmatter).length) return body;
  const y = yamlStringify(frontmatter, { lineWidth: 0, defaultStringType: 'PLAIN', defaultKeyType: 'PLAIN', schema: 'core' });
  return `---\n${y}---\n${body}`;
}

// Wikilink grammar (Vault-LD §4.4.1 / Obsidian): [[target]], [[target|alias]], [[target#heading]], [[folder/target]].
const WIKILINK_EXACT = /^\s*\[\[([^\[\]|#]+)(?:#[^\[\]|]*)?(?:\|[^\[\]]*)?\]\]\s*$/;
const WIKILINK_ANY = /\[\[([^\[\]|#\n]+)(?:#[^\[\]|\n]*)?(?:\|[^\[\]\n]*)?\]\]/g;
/** A frontmatter value that is exactly one wikilink -> its target (trimmed), else null. */
export function wikilinkTarget(v) { if (typeof v !== 'string') return null; const m = WIKILINK_EXACT.exec(v); return m ? m[1].trim() : null; }

/** Body links: wikilinks and Markdown links to .md files. Fenced and inline code is ignored. Returns [{target, kind}] in order. */
export function bodyLinks(body) {
  const text = String(body || '').replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, '').replace(/`[^`\n]*`/g, '');
  const out = [];
  for (const m of text.matchAll(WIKILINK_ANY)) out.push({ target: m[1].trim(), kind: 'wikilink' });
  for (const m of text.matchAll(/(?<!!)\[[^\]\n]*\]\(\s*<?([^)\s>]+\.md)(?:#[^)\s>]*)?>?(?:\s+"[^"]*")?\s*\)/g)) {
    const t = m[1]; if (/^[a-z][a-z0-9+.-]*:/i.test(t)) continue; // external URL
    let d = t; try { d = decodeURIComponent(t); } catch {}
    out.push({ target: d, kind: 'markdown' });
  }
  return out;
}

/** Percent-encode a file name for IRI minting (Vault-LD §4.5): keep RFC 3986 pchar, encode the rest as UTF-8. */
export function encodeName(name) {
  return Array.from(String(name)).map(ch => (/[A-Za-z0-9\-._~!$&'()*+,;=:@]/.test(ch) ? ch : Array.from(new TextEncoder().encode(ch)).map(b => '%' + b.toString(16).toUpperCase().padStart(2, '0')).join(''))).join('');
}
export function decodeName(s) { try { return decodeURIComponent(s); } catch { return s; } }

/** "requiresIngredient" / "sub-class of" -> "REQUIRES_INGREDIENT" (edge type grammar \w+). */
export function relType(key) {
  const s = String(key).replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
  return /^[A-Z_]/.test(s) ? (s || 'RELATED_TO') : 'R_' + s;
}
/** "owl:Class" / "BigQuery Table" / "[[Recipe]]" -> "Class" / "BigQueryTable" / "Recipe" (node label grammar [A-Za-z_]\w*). */
export function typeLabel(t) {
  let s = String(t ?? '').trim(); const w = wikilinkTarget(s); if (w) s = w.split('/').pop();
  s = s.replace(/^.*[#/:]/, '') || s;
  const words = s.split(/[^A-Za-z0-9_]+/).filter(Boolean);
  let out = words.map(x => x[0].toUpperCase() + x.slice(1)).join('');
  if (!out) return 'Note';
  if (!/^[A-Za-z_]/.test(out)) out = 'T' + out;
  return out.slice(0, 60);
}
