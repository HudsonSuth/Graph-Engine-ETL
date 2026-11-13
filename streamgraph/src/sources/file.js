import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Source, Differ, toEvent } from './base.js';

// Rows of cells, header included (empty lines dropped).
export function parseCsvRows(text) {
  text = text.replace(/^\uFEFF/, ''); // Excel on Windows writes a byte-order mark
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.length > 1 || r[0] !== '');
}
export function parseCsv(text) {
  const [head, ...body] = parseCsvRows(text);
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])));
}

export class FileSource extends Source {
  offset = 0;
  get format() { return this.cfg.format || (this.cfg.path.endsWith('.csv') ? 'csv' : this.cfg.path.endsWith('.ndjson') || this.cfg.path.endsWith('.jsonl') ? 'ndjson' : 'json'); }
  async poll(emit) {
    const text = (await readFile(resolve(this.ctx.baseDir || '.', this.cfg.path), 'utf8')).replace(/^\uFEFF/, '');
    if (this.format === 'ndjson') { // tail: only lines past the last offset
      const lines = text.split('\n'); const done = text.endsWith('\n') ? lines.length - 1 : lines.length - 1;
      for (let i = this.offset; i < done; i++) if (lines[i].trim()) await emit(toEvent(JSON.parse(lines[i]), this.topic));
      this.offset = Math.max(this.offset, done); return;
    }
    const rows = this.format === 'csv' ? parseCsv(text) : JSON.parse(text);
    if (this.cfg.key) { this.differ ??= new Differ(this.cfg.key); for (const ev of this.differ.diff(rows, this.topic, this.cfg.detectDeletes ?? true)) await emit(ev); }
    else if (!this.read) { this.read = true; for (const r of rows) await emit(toEvent(r, this.topic)); }
  }
}
