// Spreadsheets: .xlsx and .xls through SheetJS (Apache-2.0), .csv through StreamGraph's own CSV reader.
// Each sheet becomes one table: the first non-empty row is the header. Only stored cell values are read:
// formulas are not recalculated, macros are never run and links to other workbooks are never followed.
import { createRequire } from 'node:module';
import { SafeZip } from './zip.js';
import { docError } from './limits.js';
import { parseCsvRows } from '../sources/file.js';
const require = createRequire(import.meta.url);
let XLSX;
const lib = () => (XLSX ??= require('xlsx'));
const cellValue = v => (v instanceof Date ? (isNaN(v) ? '' : v.toISOString().replace(/T00:00:00\.000Z$/, '')) : v == null ? '' : typeof v === 'string' ? v.trim() : v);

export function tableFromGrid(grid, { name, location, firstRow = 1, limits, notes }) {
  let h = grid.findIndex(r => r && r.some(c => c !== '' && c != null));
  if (h < 0) return null;
  const header = grid[h].map(c => String(cellValue(c)));
  while (header.length && header.at(-1) === '') header.pop();
  if (header.length < 1) return null;
  const rows = [];
  for (let i = h + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    if (!r.some(c => c !== '' && c != null)) continue;
    if (rows.length >= limits.maxRowsPerTable) { notes.push(`${name}: only the first ${limits.maxRowsPerTable.toLocaleString('en-US')} rows were read.`); break; }
    rows.push({ cells: header.map((_, j) => cellValue(r[j])), row: firstRow + i });
  }
  return { name, location, header, rows };
}

export function readWorkbook(buf, kind, limits) {
  const notes = [];
  if (kind === 'xlsx') {
    const zip = new SafeZip(buf, limits);
    if (!zip.has('xl/workbook.xml')) throw docError('This does not look like an Excel workbook (xl/workbook.xml is missing).');
    zip.verifyAll(); // every part unpacks within the limits before the workbook reader touches it
    if (zip.names().some(n => /vbaProject\.bin$/i.test(n))) notes.push('Macros in this file were ignored (they are never run).');
    if (zip.names().some(n => /^xl\/externalLinks\//.test(n))) notes.push('Links to other workbooks were not followed; their last saved values were used.');
  }
  let wb;
  try {
    wb = lib().read(buf, { type: 'buffer', cellDates: true, cellFormula: false, cellHTML: false, cellStyles: false, cellNF: false, bookVBA: false, bookFiles: false, sheetRows: limits.maxRowsPerTable + 50, dense: true, WTF: false });
  } catch (e) {
    if (/password|encrypt/i.test(e.message)) throw docError('This workbook is password-protected, so it cannot be read.');
    throw docError(`This spreadsheet could not be read (${String(e.message).slice(0, 80)}).`);
  }
  const names = wb.SheetNames.slice(0, limits.maxSheets);
  if (wb.SheetNames.length > limits.maxSheets) notes.push(`Only the first ${limits.maxSheets} sheets were read.`);
  const tables = [];
  for (const sn of names) {
    const ws = wb.Sheets[sn]; if (!ws?.['!ref']) continue;
    const range = lib().utils.decode_range(ws['!ref']);
    if (ws['!fullref'] && ws['!fullref'] !== ws['!ref']) notes.push(`Sheet ${sn}: only the first ${limits.maxRowsPerTable.toLocaleString('en-US')} rows were read.`);
    const grid = lib().utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true });
    const t = tableFromGrid(grid, { name: sn, location: `sheet ${sn}`, firstRow: range.s.r + 1, limits, notes });
    if (t && t.rows.length) tables.push(t);
  }
  const p = wb.Props || {};
  const iso = d => (d instanceof Date && !isNaN(d) ? d.toISOString() : d || undefined);
  return { meta: { title: p.Title || undefined, author: p.Author || undefined, subject: p.Subject || undefined, keywords: p.Keywords || undefined, created: iso(p.CreatedDate), last_modified_by: p.LastAuthor || undefined, doc_modified: iso(p.ModifiedDate), sheet_names: names.join(', ') }, sections: [], tables, notes };
}

export function readCsvFile(buf, fileName, limits) {
  const notes = [], grid = parseCsvRows(buf.toString('utf8'));
  const t = tableFromGrid(grid, { name: fileName, location: 'file', firstRow: 1, limits, notes });
  return { meta: {}, sections: [], tables: t && t.rows.length ? [t] : [], notes };
}
