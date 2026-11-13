// Reads one document into a common shape: { meta, sections, tables, notes }.
// Files are treated as untrusted: the type is checked against the content, sizes and pages are limited,
// nothing inside a file is run or fetched.
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, extname, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { readPdf } from './pdf.js';
import { readDocx } from './docx.js';
import { readWorkbook, readCsvFile } from './sheet.js';
import { docError, mb, limitsFrom } from './limits.js';

export const DOC_TYPES = { '.pdf': 'PDF', '.docx': 'Word', '.xlsx': 'Excel', '.xls': 'Excel 97-2003', '.csv': 'CSV' };
const MACRO = new Set(['.docm', '.dotm', '.xlsm', '.xltm', '.xlam', '.xlsb']);
const magic = (b, ...bytes) => bytes.every((x, i) => b[i] === x);
export { limitsFrom };

export async function readDocument(buf, fileName, limitsIn) {
  const limits = limitsFrom(limitsIn), ext = extname(fileName).toLowerCase();
  if (MACRO.has(ext)) throw docError('Macro-enabled and binary Office files (.docm, .xlsm, .xlsb) are not read. Save it as .docx or .xlsx.');
  if (!DOC_TYPES[ext]) throw docError(`${ext || 'Files without an extension'} files are not supported. Use PDF, Word (.docx), Excel (.xlsx, .xls) or CSV.`);
  if (buf.length > limits.maxFileBytes) throw docError(`This file is ${mb(buf.length)}; the limit is ${mb(limits.maxFileBytes)}.`);
  if (!buf.length) throw docError('This file is empty.');
  const zipped = magic(buf, 0x50, 0x4b, 0x03, 0x04), ole = magic(buf, 0xd0, 0xcf, 0x11, 0xe0);
  switch (ext) {
    case '.pdf': if (!buf.subarray(0, 1024).toString('latin1').includes('%PDF-')) throw docError('This file is named .pdf but is not a PDF.'); return readPdf(buf, limits);
    case '.docx': if (!zipped) throw docError(ole ? 'This is an old-style Word file (.doc) or is encrypted. Save it as .docx.' : 'This file is named .docx but is not a Word document.'); return readDocx(buf, limits);
    case '.xlsx': if (!zipped) throw docError(ole ? 'This workbook is encrypted or in the old .xls format. Save it as .xlsx.' : 'This file is named .xlsx but is not an Excel workbook.'); return readWorkbook(buf, 'xlsx', limits);
    case '.xls': if (!ole) throw docError('This file is named .xls but is not an Excel 97-2003 workbook.'); return readWorkbook(buf, 'xls', limits);
    case '.csv': return readCsvFile(buf, fileName, limits);
  }
}

// Supported files in a folder (and sub-folders, up to 3 levels). Hidden files and Office lock files (~$x.docx) are skipped.
export async function listDocuments(folder, limitsIn) {
  const limits = limitsFrom(limitsIn), out = [], skipped = [];
  let st;
  try { st = await stat(folder); } catch { throw docError(`We couldn't find the folder "${folder}".`); }
  if (!st.isDirectory()) throw docError(`"${folder}" is a file, not a folder. Pick the folder that holds your documents.`);
  const walk = async (dir, depth) => {
    for (const d of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (d.name.startsWith('.') || d.name.startsWith('~$')) continue;
      const p = join(dir, d.name);
      if (d.isDirectory()) { if (depth < 3) await walk(p, depth + 1); continue; }
      if (!d.isFile()) continue; // symlinks and devices are not followed
      const ext = extname(d.name).toLowerCase();
      if (!DOC_TYPES[ext] && !MACRO.has(ext)) { skipped.push(d.name); continue; }
      if (out.length >= limits.maxFiles) throw docError(`This folder has more than ${limits.maxFiles} documents. Pick a smaller folder.`);
      out.push({ path: p, rel: relative(folder, p).split(sep).join('/'), name: d.name, ext });
    }
  };
  await walk(folder, 0);
  return { files: out, skipped };
}

export async function fingerprint(path) { const s = await stat(path); return { size: s.size, mtimeMs: s.mtimeMs, modified_at: s.mtime.toISOString() }; }
export const sha256 = buf => createHash('sha256').update(buf).digest('hex');
export async function readFileLimited(path, limitsIn) {
  const limits = limitsFrom(limitsIn), s = await stat(path);
  if (s.size > limits.maxFileBytes) throw docError(`This file is ${mb(s.size)}; the limit is ${mb(limits.maxFileBytes)}.`);
  return readFile(path);
}
