// Plain-text reader for .txt, .md and .eml (phase L2, opt-in with the documents source's `textFiles: true`).
// Same untrusted-file rules as the other readers: size and text limits, nothing is run or fetched, and binary content
// named .txt is refused. Emails: the RFC 822 headers become metadata (subject, from, to, cc, date) and the text body
// becomes one section; for multipart mail only the first text/plain part is read (attachments are ignored, with a note).
import { docError } from './limits.js';

export const TEXT_TYPES = { '.txt': 'Text', '.md': 'Markdown', '.eml': 'Email' };

function decodeText(buf) {
  if (buf.subarray(0, 8192).includes(0)) throw docError('This file looks binary, not text.');
  let s = buf.toString('utf8');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  return s.replace(/\r\n?/g, '\n');
}
function cap(text, limits, notes) {
  if (text.length <= limits.maxTextChars) return text;
  notes.push(`Only the first ${limits.maxTextChars} characters of text were kept.`);
  return text.slice(0, limits.maxTextChars);
}
function parseHeaders(block) {
  const h = {};
  for (const line of block.replace(/\n[ \t]+/g, ' ').split('\n')) { const m = /^([\w-]+):\s*(.*)$/.exec(line); if (m) h[m[1].toLowerCase()] ??= m[2].trim(); }
  return h;
}
const qp = s => s.replace(/=\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, x) => String.fromCharCode(parseInt(x, 16)));
function bodyOf(headers, body, notes) {
  const ct = headers['content-type'] || 'text/plain', enc = (headers['content-transfer-encoding'] || '').toLowerCase();
  const boundary = /boundary="?([^";]+)"?/i.exec(ct)?.[1];
  if (/^multipart\//i.test(ct) && boundary) {
    const parts = body.split(`--${boundary}`).slice(1).filter(p => !p.startsWith('--'));
    let text = null, other = 0;
    for (const p of parts) {
      const i = p.indexOf('\n\n'); const ph = parseHeaders(p.slice(0, i < 0 ? p.length : i).trim()), pb = i < 0 ? '' : p.slice(i + 2);
      if (text == null && /^text\/plain/i.test(ph['content-type'] || 'text/plain') && !/attachment/i.test(ph['content-disposition'] || '')) text = bodyOf(ph, pb, notes);
      else if (/^multipart\//i.test(ph['content-type'] || '') && text == null) text = bodyOf(ph, pb, notes);
      else other++;
    }
    if (other) notes.push(`${other} other part${other === 1 ? '' : 's'} of this email (HTML or attachments) ${other === 1 ? 'was' : 'were'} not read.`);
    return text ?? '';
  }
  if (!/^text\//i.test(ct)) { notes.push(`The email body is ${ct.split(';')[0]}, which is not read.`); return ''; }
  if (enc === 'base64') return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8');
  if (enc === 'quoted-printable') return qp(body);
  return body;
}

/** One text file -> { meta, sections, tables, notes } (the common reader shape). */
export function readText(buf, ext, limits) {
  const notes = [], raw = decodeText(buf);
  if (ext === '.eml') {
    const i = raw.indexOf('\n\n'), headers = parseHeaders(i < 0 ? raw : raw.slice(0, i));
    if (!headers.from && !headers.subject && !headers.date) throw docError('This file is named .eml but has no email headers (From, Subject or Date).');
    const text = cap(bodyOf(headers, i < 0 ? '' : raw.slice(i + 2), notes).trim(), limits, notes);
    const meta = Object.fromEntries(Object.entries({ title: headers.subject, subject: headers.subject, from: headers.from, to: headers.to, cc: headers.cc, date: headers.date }).filter(([, v]) => v));
    return { meta, sections: [{ heading: headers.subject || '', level: 0, text }], tables: [], notes };
  }
  let text = cap(raw, limits, notes), meta = {};
  if (ext === '.md') {
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text); // simple key: value frontmatter only; anything else stays text
    if (fm) { for (const [k, v] of Object.entries(parseHeaders(fm[1]))) if (['title', 'date', 'author'].includes(k)) meta[k] = v.replace(/^["']|["']$/g, ''); text = text.slice(fm[0].length); }
    const sections = []; let cur = { heading: '', level: 0, lines: [] };
    const push = () => { const t = cur.lines.join('\n').trim(); if (t || cur.heading) sections.push({ heading: cur.heading, level: cur.level, text: t }); };
    for (const line of text.split('\n')) { const h = /^(#{1,6})\s+(.*)$/.exec(line); if (h) { push(); cur = { heading: h[2].trim(), level: h[1].length, lines: [] }; } else cur.lines.push(line); }
    push();
    if (!meta.title) meta.title = sections.find(s => s.level === 1)?.heading;
    if (!meta.title) delete meta.title;
    return { meta, sections, tables: [], notes };
  }
  return { meta, sections: [{ heading: '', level: 0, text: text.trim() }], tables: [], notes };
}
/** The whole text of a parsed document (sections joined, headings kept), for LLM steps. */
export const fullText = parsed => (parsed?.sections || []).map(s => [s.heading && `${'#'.repeat(Math.max(1, s.level || 1))} ${s.heading}`, s.text].filter(Boolean).join('\n')).join('\n\n').trim();
