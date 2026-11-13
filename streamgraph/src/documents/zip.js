// Minimal, defensive ZIP reader for .docx/.xlsx. Uses Node's built-in zlib with a hard output cap,
// so a part whose real size is larger than declared (or larger than the budget) is refused, never unpacked.
import { inflateRawSync, crc32 } from 'node:zlib';
import { docError, mb } from './limits.js';

const BOMB = 'This file unpacks to far more data than its size suggests (a "zip bomb"), so it was not opened.';
export function readZipIndex(buf, limits) {
  if (buf.length < 22 || buf.readUInt32LE(0) !== 0x04034b50) throw docError('This file is not a valid Office file (it is not a zip package).');
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw docError('This Office file is damaged (its table of contents is missing).');
  const count = buf.readUInt16LE(eocd + 10), cdSize = buf.readUInt32LE(eocd + 12), cdOff = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || cdOff === 0xffffffff) throw docError('This Office file uses a very large (ZIP64) format that is not supported.');
  if (count > limits.zipMaxEntries) throw docError(`This file has ${count} parts inside; the limit is ${limits.zipMaxEntries}.`);
  if (cdOff + cdSize > buf.length) throw docError('This Office file is damaged (its table of contents points past the end).');
  const entries = new Map(); let p = cdOff, total = 0;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw docError('This Office file is damaged (bad table of contents).');
    const flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl); p += 46 + nl + xl + cl;
    if (flags & 1) throw docError('This file is password-protected or encrypted, so it cannot be read.');
    if (method !== 0 && method !== 8) throw docError('This Office file uses an unsupported compression method.');
    if (csize === 0xffffffff || usize === 0xffffffff) throw docError('This Office file uses a very large (ZIP64) format that is not supported.');
    total += usize;
    if (total > limits.zipMaxTotalBytes) throw docError(`${BOMB} It would unpack to more than ${mb(limits.zipMaxTotalBytes)}.`);
    if (usize > 1e6 && csize > 0 && usize / csize > limits.zipMaxRatio) throw docError(BOMB);
    entries.set(name, { name, method, crc, csize, usize, off });
  }
  return { entries, total };
}

export class SafeZip {
  constructor(buf, limits) { this.buf = buf; this.limits = limits; ({ entries: this.entries } = readZipIndex(buf, limits)); this.used = 0; }
  has(name) { return this.entries.has(name); }
  names() { return [...this.entries.keys()]; }
  read(name) {
    const e = this.entries.get(name); if (!e) return null;
    const b = this.buf, o = e.off;
    if (o + 30 > b.length || b.readUInt32LE(o) !== 0x04034b50) throw docError('This Office file is damaged (a part is missing).');
    const start = o + 30 + b.readUInt16LE(o + 26) + b.readUInt16LE(o + 28), data = b.subarray(start, start + e.csize);
    if (data.length !== e.csize) throw docError('This Office file is damaged (a part is cut short).');
    const budget = this.limits.zipMaxTotalBytes - this.used;
    let out;
    if (e.method === 0) out = data;
    else {
      // Never trust the declared size: cap the output at what was declared (and at the remaining budget).
      try { out = inflateRawSync(data, { maxOutputLength: Math.max(1, Math.min(e.usize, budget)) }); }
      catch (err) { if (err instanceof RangeError || /maxOutputLength|buffer|Cannot create a Buffer/i.test(err.message)) throw docError(BOMB); throw docError('This Office file is damaged (a part could not be unpacked).'); }
    }
    if (out.length !== e.usize) throw docError(out.length > e.usize ? BOMB : 'This Office file is damaged (a part has the wrong size).');
    if (crc32(out) >>> 0 !== e.crc >>> 0) throw docError('This Office file is damaged (a part failed its checksum).');
    this.used += out.length;
    return out;
  }
  text(name) { const b = this.read(name); return b ? b.toString('utf8').replace(/^\uFEFF/, '') : null; }
  // Unpack every part within the limits. Used before handing a workbook to the spreadsheet reader, which unpacks it again itself.
  verifyAll() { for (const n of this.entries.keys()) this.read(n); this.used = 0; }
}
