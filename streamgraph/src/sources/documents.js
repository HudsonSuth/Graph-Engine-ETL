// Documents source: scans a folder of PDF, Word, Excel and CSV files and turns each into graph records:
//   <topic>__doc      one Document per file (name, type, size, modified time, SHA-256, metadata, problems)
//   <topic>__section  text sections (Word headings, PDF pages)
//   <topic>__table    detected tables
//   <topic>__row      rows of tables that were not turned into things
//   tableTopics[sig]  rows of tables the user turned into things (Customer, Supplier, ...)
// Every row keeps where it came from: source_file, source_location (page, sheet or table) and source_row.
// Each re-scan compares files by SHA-256: changed files are re-read and their records updated, removed files
// have their records deleted. Unchanged files are not re-read.
import { resolve } from 'node:path';
import { Source } from './base.js';
import { listDocuments, readDocument, readFileLimited, fingerprint, sha256, DOC_TYPES, limitsFrom } from '../documents/index.js';

const BROKEN = () => process.env.STREAMGRAPH_DOCS === 'broken'; // DELIBERATELY WRONG for tests: drops provenance and ignores removed files
const RESERVED = ['row_id', 'table_id', 'doc_id', 'source_file', 'source_location', 'source_row'];
export function columnNames(header) {
  const used = new Set(RESERVED);
  return header.map((h, i) => {
    let n = String(h ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `column_${i + 1}`;
    if (/^\d/.test(n)) n = `c_${n}`;
    let out = n, k = 2; while (used.has(out)) out = `${n}_${k++}`;
    used.add(out); return out;
  });
}
export const tableSignature = cols => cols.join('|');
const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

// One file -> list of { topic, id, rank, data }. rank orders writes: documents first, then tables/sections, then rows.
export function documentRecords({ topic, rel, name, fp, hash, parsed, error, tableTopics = {}, tableKeys = {} }) {
  const docId = `${topic}/${rel}`, mark = { [`_src_${topic}`]: 'true' }, out = [];
  const ext = (name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
  out.push({ topic: `${topic}__doc`, id: docId, rank: 1, data: { ...clean({ doc_id: docId, path: rel, file_name: name, file_type: DOC_TYPES[ext] || ext, size_bytes: fp.size, modified_at: fp.modified_at, sha256: hash,
    status: error ? 'could not read' : 'read', problem: error?.message, ...(parsed ? { ...parsed.meta, section_count: parsed.sections.length, table_count: parsed.tables.length, notes: parsed.notes.join(' ') } : {}) }), ...mark } });
  if (!parsed) return out;
  const prov = (where, row) => (BROKEN() ? {} : clean({ source_file: rel, source_location: where, source_row: row }));
  parsed.sections.forEach((s, i) => {
    const id = `${docId}#s${i + 1}`;
    out.push({ topic: `${topic}__section`, id, rank: 2, data: { ...clean({ section_id: id, doc_id: docId, ...prov(s.page ? `page ${s.page}` : `section ${i + 1}`), heading: s.heading, level: s.level, text: s.text, order: i + 1 }), ...mark } });
  });
  parsed.tables.forEach((t, i) => {
    const id = `${docId}#t${i + 1}`, cols = columnNames(t.header), sig = tableSignature(cols), mapped = tableTopics[sig];
    out.push({ topic: `${topic}__table`, id, rank: 2, data: { ...clean({ table_id: id, doc_id: docId, ...prov(t.location), name: t.name, columns: cols.join(', '), row_count: t.rows.length, signature: sig }), ...mark } });
    for (const r of t.rows) {
      const rid = `${id}#r${r.row}`, cells = Object.fromEntries(cols.map((c, j) => [c, r.cells[j] ?? '']));
      // Rows turned into things are tracked by their identifying value, so a row whose ID changes removes the old thing.
      const kv = mapped && tableKeys[sig] ? cells[tableKeys[sig]] : '';
      if (mapped) out.push({ topic: mapped, id: kv !== '' && kv != null ? `${id}#k:${kv}` : rid, rank: 3, data: { ...cells, ...prov(t.location, r.row), _row_id: rid, _table_id: id } });
      else out.push({ topic: `${topic}__row`, id: rid, rank: 3, data: { row_id: rid, table_id: id, ...prov(t.location, r.row), ...cells, ...mark } });
    }
  });
  return out;
}

export async function readOne(file, limits) {
  const fp = await fingerprint(file.path);
  let buf, hash, parsed, error;
  try { buf = await readFileLimited(file.path, limits); hash = sha256(buf); parsed = await readDocument(buf, file.name, limits); }
  catch (e) { error = e; parsed = undefined; }
  return { fp, hash, parsed, error };
}

export class DocumentsSource extends Source {
  files = new Map(); // rel -> { size, mtimeMs, hash, records: Map(key -> record) }
  get folder() { return resolve(this.ctx.baseDir || '.', this.cfg.folder); }
  async poll(emit) {
    if (this.cfg.once && this.done) return;
    const limits = limitsFrom(this.cfg.limits), { files } = await listDocuments(this.folder, limits), seen = new Set();
    for (const f of files) {
      seen.add(f.rel);
      const prev = this.files.get(f.rel);
      let fp; try { fp = await fingerprint(f.path); } catch { seen.delete(f.rel); continue; } // removed while scanning
      if (prev && prev.size === fp.size && prev.mtimeMs === fp.mtimeMs) continue;
      const r = await readOne(f, limits);
      if (prev && r.hash && prev.hash === r.hash) { Object.assign(prev, { size: r.fp.size, mtimeMs: r.fp.mtimeMs }); continue; } // touched but not changed
      if (r.error) this.ctx.onError?.(new Error(`${f.rel}: ${r.error.message}`));
      const next = new Map(documentRecords({ topic: this.topic, rel: f.rel, name: f.name, fp: r.fp, hash: r.hash, parsed: r.parsed, error: r.error, tableTopics: this.cfg.tableTopics, tableKeys: this.cfg.tableKeys }).map(x => [`${x.topic}|${x.id}`, x]));
      await apply(prev?.records || new Map(), next, emit);
      this.files.set(f.rel, { size: r.fp.size, mtimeMs: r.fp.mtimeMs, hash: r.hash, records: next });
    }
    if (!BROKEN()) for (const [rel, st] of this.files) if (!seen.has(rel)) { await apply(st.records, new Map(), emit); this.files.delete(rel); }
    this.done = true;
  }
}

// Deletes children before parents; creates and updates parents before children.
async function apply(before, after, emit) {
  for (const x of [...before.values()].filter(x => !after.has(`${x.topic}|${x.id}`)).sort((a, b) => b.rank - a.rank)) await emit({ op: 'd', topic: x.topic, data: x.data, before: x.data });
  for (const x of [...after.values()].sort((a, b) => a.rank - b.rank)) {
    const old = before.get(`${x.topic}|${x.id}`);
    if (!old) await emit({ op: 'c', topic: x.topic, data: x.data });
    else if (JSON.stringify(old.data) !== JSON.stringify(x.data)) await emit({ op: 'u', topic: x.topic, data: x.data, before: old.data });
  }
}
