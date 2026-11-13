// Word .docx reader: paragraphs grouped into sections by heading, top-level tables, core properties.
// Macros are never run (macro parts are ignored) and links to outside resources are never fetched.
import { SafeZip } from './zip.js';
import { walk, firstText } from './xml.js';
import { docError } from './limits.js';

export function readDocx(buf, limits) {
  const zip = new SafeZip(buf, limits), notes = [];
  const body = zip.text('word/document.xml');
  if (body == null) throw docError('This does not look like a Word document (word/document.xml is missing).');
  if (zip.names().some(n => /vbaProject\.bin$/i.test(n)) || /macroEnabled/i.test(zip.text('[Content_Types].xml') || '')) notes.push('Macros in this file were ignored (they are never run).');
  const rels = zip.text('word/_rels/document.xml.rels') || '';
  const ext = (rels.match(/<Relationship\b[^>]*>/g) || []).filter(r => /TargetMode\s*=\s*["']External["']/i.test(r)).length;
  if (ext) notes.push(`${ext} link${ext === 1 ? '' : 's'} to outside files or web pages ${ext === 1 ? 'was' : 'were'} not followed.`);

  const sections = [], tables = [];
  let sec = { heading: '', level: 0, parts: [] }, chars = 0, cut = false;
  let para = null, style = '', tblDepth = 0, table = null, row = null, cell = null, skip = 0;
  const pushSec = () => { const text = sec.parts.join('\n').trim(); if (text || sec.heading) sections.push({ heading: sec.heading, level: sec.level, text }); };
  walk(body, {
    onOpen(n, a, self) {
      if (skip) { if (!self) skip++; return; }
      if (n === 'mc:Fallback' || n === 'w:instrText' || n === 'w:delText' || n === 'w:fldData') { if (!self) skip = 1; return; }
      if (n === 'w:tbl') { tblDepth++; if (tblDepth === 1) table = { rows: [] }; return; }
      if (n === 'w:tr' && tblDepth === 1) { row = []; return; }
      if (n === 'w:tc' && tblDepth === 1) { cell = []; return; }
      if (n === 'w:p') { para = ''; style = ''; return; }
      if (n === 'w:pStyle') { style = a['w:val'] || ''; return; }
      if (para !== null && (n === 'w:tab')) para += '\t';
      if (para !== null && (n === 'w:br' || n === 'w:cr')) para += '\n';
    },
    onClose(n) {
      if (skip) { skip--; return; }
      if (n === 'w:p' && para !== null) {
        const t = para.replace(/[ \t]+$/g, '');
        if (tblDepth) { if (cell) cell.push(t); }
        else {
          const h = /^(Title|Heading(\d))$/i.exec(style.replace(/\s+/g, ''));
          if (h && t.trim()) { pushSec(); sec = { heading: t.trim(), level: h[2] ? Number(h[2]) : 0, parts: [] }; }
          else if (t.trim()) { if (chars + t.length > limits.maxTextChars) cut = true; else { sec.parts.push(t); chars += t.length; } }
        }
        para = null; return;
      }
      if (n === 'w:tc' && tblDepth === 1 && cell) { row?.push(cell.join('\n').trim()); cell = null; return; }
      if (n === 'w:tr' && tblDepth === 1 && row) { if (table.rows.length <= limits.maxRowsPerTable) table.rows.push(row); else table.cut = true; row = null; return; }
      if (n === 'w:tbl') { if (tblDepth === 1 && table) { tables.push(table); table = null; } tblDepth--; }
    },
    onText(t) { if (!skip && para !== null) para += t; },
  });
  pushSec();
  if (cut) notes.push(`Only the first ${limits.maxTextChars.toLocaleString('en-US')} characters of text were kept.`);
  const core = zip.text('docProps/core.xml'), app = zip.text('docProps/app.xml');
  const meta = { title: firstText(core, 'dc:title'), author: firstText(core, 'dc:creator'), subject: firstText(core, 'dc:subject'), keywords: firstText(core, 'cp:keywords'),
    created: firstText(core, 'dcterms:created'), last_modified_by: firstText(core, 'cp:lastModifiedBy'), doc_modified: firstText(core, 'dcterms:modified'),
    page_count: num(firstText(app, 'Pages')), word_count: num(firstText(app, 'Words')) };
  const out = [];
  tables.forEach((t, i) => {
    const [head, ...rows] = t.rows.filter(r => r.some(c => c !== ''));
    if (!head || head.length < 2 || !rows.length) return;
    if (t.cut) notes.push(`Table ${i + 1}: only the first ${limits.maxRowsPerTable.toLocaleString('en-US')} rows were read.`);
    out.push({ name: `Table ${out.length + 1}`, location: `table ${out.length + 1}`, header: head, rows: rows.map((cells, j) => ({ cells, row: j + 1 })) });
  });
  return { meta, sections, tables: out, notes };
}
const num = v => (v != null && v !== '' && !isNaN(Number(v)) ? Number(v) : undefined);
