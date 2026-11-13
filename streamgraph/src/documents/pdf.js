// PDF reader on PDF.js (Apache-2.0), as bundled by unpdf (MIT) without fonts: page text and simple tables from text positions.
// Runs with eval off, no fonts or network loading, and refuses files over the page limit before reading pages.
// Scanned PDFs (pictures of text) have no text layer; OCR is not included, so they get a note instead.
import { docError } from './limits.js';
let pdfjs;
const lib = async () => (pdfjs ??= await import('unpdf/pdfjs'));

// Group text pieces into lines (by baseline) and lines into cells (by horizontal gaps).
export function linesFromItems(items) {
  const pieces = items.filter(i => typeof i.str === 'string' && i.str.trim() !== '').map(i => ({ x: i.transform[4], y: i.transform[5], w: i.width || 0, s: i.str, size: Math.abs(i.transform[3]) || Math.abs(i.transform[0]) || 10 }));
  pieces.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const p of pieces) {
    const l = lines.find(l => Math.abs(l.y - p.y) <= Math.max(2, p.size * 0.3));
    if (l) l.items.push(p); else lines.push({ y: p.y, items: [p] });
  }
  lines.sort((a, b) => b.y - a.y);
  return lines.map(l => {
    l.items.sort((a, b) => a.x - b.x);
    const cells = [];
    for (const p of l.items) {
      const c = cells.at(-1), gap = c ? p.x - c.end : Infinity;
      if (c && gap < Math.max(4, p.size * 1.0)) { c.text += (gap > p.size * 0.15 && !c.text.endsWith(' ') ? ' ' : '') + p.s; c.end = Math.max(c.end, p.x + p.w); }
      else cells.push({ x: p.x, end: p.x + p.w, text: p.s });
    }
    cells.forEach(c => (c.text = c.text.replace(/\s+/g, ' ').trim()));
    return { y: l.y, cells, text: cells.map(c => c.text).join('  ') };
  });
}
// A table is 3 or more lines in a row with the same number (2+) of cells whose left edges line up.
export function tablesFromLines(lines, tol = 6) {
  const out = [], used = new Set();
  for (let i = 0; i < lines.length; i++) {
    const n = lines[i].cells.length; if (n < 2) continue;
    const xs = lines[i].cells.map(c => c.x);
    let j = i + 1;
    while (j < lines.length && lines[j].cells.length === n && lines[j].cells.every((c, k) => Math.abs(c.x - xs[k]) <= tol)) j++;
    if (j - i >= 3) { out.push(lines.slice(i, j)); for (let k = i; k < j; k++) used.add(k); i = j - 1; }
  }
  return { tables: out, used };
}

export async function readPdf(buf, limits) {
  const { getDocument, VerbosityLevel } = await lib();
  let doc, task;
  try {
    task = getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, useWorkerFetch: false, disableAutoFetch: true, disableStream: true,
      disableRange: true, enableXfa: false, isOffscreenCanvasSupported: false, isImageDecoderSupported: false, stopAtErrors: false, verbosity: VerbosityLevel?.ERRORS ?? 0, maxImageSize: 1 });
    doc = await task.promise;
  } catch (e) {
    await task?.destroy().catch(() => {});
    if (e?.name === 'PasswordException') throw docError('This PDF is password-protected, so it cannot be read.');
    throw docError(`This PDF could not be read (${String(e?.message || e).slice(0, 80)}).`);
  }
  try {
    if (doc.numPages > limits.maxPages) throw docError(`This PDF has ${doc.numPages} pages; the limit is ${limits.maxPages}. Split it into smaller files.`);
    const notes = [], sections = [], tables = [];
    let chars = 0, cut = false;
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent({ includeMarkedContent: false, disableNormalization: false });
      const lines = linesFromItems(tc.items);
      const found = tablesFromLines(lines);
      found.tables.forEach((t, i) => {
        const [head, ...body] = t;
        tables.push({ name: `Page ${p} table ${i + 1}`, location: `page ${p}`, page: p, header: head.cells.map(c => c.text),
          rows: body.slice(0, limits.maxRowsPerTable).map((l, j) => ({ cells: l.cells.map(c => c.text), row: j + 1 })) });
      });
      const text = lines.filter((_, i) => !found.used.has(i)).map(l => l.text).join('\n').trim();
      if (text) { if (chars + text.length > limits.maxTextChars) cut = true; else { sections.push({ heading: `Page ${p}`, level: 1, page: p, text }); chars += text.length; } }
      page.cleanup();
    }
    if (cut) notes.push(`Only the first ${limits.maxTextChars.toLocaleString('en-US')} characters of text were kept.`);
    if (!chars && !tables.length) notes.push('No text was found. This may be a scanned PDF (a picture of text); reading scanned pages needs OCR, which is not included.');
    let info = {};
    try { info = (await doc.getMetadata())?.info || {}; } catch { /* metadata is optional */ }
    const date = s => { const m = /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(s || ''); return m ? `${m[1]}-${m[2] || '01'}-${m[3] || '01'}${m[4] ? `T${m[4]}:${m[5] || '00'}:${m[6] || '00'}` : ''}` : s || undefined; };
    return { meta: { title: info.Title || undefined, author: info.Author || undefined, subject: info.Subject || undefined, keywords: info.Keywords || undefined, created: date(info.CreationDate), doc_modified: date(info.ModDate), page_count: doc.numPages }, sections, tables, notes };
  } finally { await task.destroy(); }
}
