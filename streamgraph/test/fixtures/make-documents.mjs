// Builds the small document fixtures used by test/documents.test.js. All content is invented for these tests.
//   node test/fixtures/make-documents.mjs        (writes test/fixtures/documents/*)
// The builders are also imported by the tests to make variants (changed files, bombs, oversize files).
import { deflateRawSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// ---- PDF: pages of positioned text in Helvetica. pages = [[{x, y, text, size}]]
export function makePdf(pages, info = {}) {
  const esc = s => String(s).replace(/[\\()]/g, c => '\\' + c);
  const objs = [];
  const add = s => { objs.push(s); return objs.length; };
  const catalog = add(null), pagesId = add(null), font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const kids = [];
  for (const items of pages) {
    const stream = items.map(i => `BT /F1 ${i.size || 11} Tf ${i.x} ${i.y} Td (${esc(i.text)}) Tj ET`).join('\n');
    const content = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  const infoId = add(`<< ${Object.entries(info).map(([k, v]) => `/${k} (${esc(v)})`).join(' ')} >>`);
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
// Lines of text and a simple table laid out in columns.
export function pdfPage({ title, paragraphs = [], table, columns = [72, 200, 360, 460], top = 740 }) {
  const items = []; let y = top;
  if (title) { items.push({ x: 72, y, text: title, size: 16 }); y -= 30; }
  for (const p of paragraphs) { items.push({ x: 72, y, text: p, size: 11 }); y -= 18; }
  if (table) { y -= 10; for (const row of table) { row.forEach((c, i) => items.push({ x: columns[i], y, text: String(c), size: 10 })); y -= 16; } }
  return items;
}

// ---- ZIP writer (deflate), for .docx fixtures and zip bombs. entries = [{name, data, declaredSize?}]
export function makeZip(entries) {
  const locals = [], central = []; let off = 0;
  for (const e of entries) {
    const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, 'utf8'), comp = deflateRawSync(data), name = Buffer.from(e.name, 'utf8');
    const usize = e.declaredSize ?? data.length, crc = crc32(data) >>> 0;
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(usize, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(usize, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, name, comp); central.push(ch, name); off += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, end]);
}

// ---- DOCX: blocks = [{h: 'Heading', level}, {p: 'text'}, {table: [[...header], [...row]]}]
const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function makeDocx(blocks, props = {}, { externalLink = false, linkUrl = 'http://127.0.0.1:9/should-never-be-fetched', macro = false } = {}) {
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const para = (t, style) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r><w:t xml:space="preserve">${x(t)}</w:t></w:r></w:p>`;
  const body = blocks.map(b => b.h ? para(b.h, `Heading${b.level || 1}`) : b.p != null ? para(b.p)
    : `<w:tbl><w:tblPr/>${b.table.map(r => `<w:tr>${r.map(c => `<w:tc><w:tcPr/>${para(c)}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`).join('');
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}${externalLink ? '<w:p><w:hyperlink r:id="rIdLink"><w:r><w:t>see the price list</w:t></w:r></w:hyperlink></w:p>' : ''}<w:sectPr/></w:body></w:document>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${props.title ? `<dc:title>${x(props.title)}</dc:title>` : ''}${props.author ? `<dc:creator>${x(props.author)}</dc:creator>` : ''}<dcterms:created xsi:type="dcterms:W3CDTF">2026-01-05T09:00:00Z</dcterms:created></cp:coreProperties>`;
  const ct = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${externalLink ? '<Relationship Id="rIdLink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${x(linkUrl)}" TargetMode="External"/>' : ''}</Relationships>`;
  return makeZip([{ name: '[Content_Types].xml', data: ct }, { name: '_rels/.rels', data: rels }, { name: 'word/document.xml', data: doc }, { name: 'word/_rels/document.xml.rels', data: docRels },
    { name: 'docProps/core.xml', data: core }, ...(macro ? [{ name: 'word/vbaProject.bin', data: Buffer.from('not a real macro') }] : [])]);
}

// ---- Spreadsheets through SheetJS. sheets = { name: [[header], [row]...] }
export function makeWorkbook(sheets, bookType = 'xlsx', props = {}) {
  const XLSX = require('xlsx'), wb = XLSX.utils.book_new();
  for (const [n, aoa] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n);
  wb.Props = props;
  return XLSX.write(wb, { type: 'buffer', bookType });
}

// ---- The fixture set
export const CUSTOMERS = [['customer_id', 'name', 'email', 'tier'], ['C1', 'Ada Lovelace', 'ada@example.test', 'gold'], ['C2', 'Ben Okafor', 'ben@example.test', 'silver'], ['C3', 'Cleo Park', 'cleo@example.test', 'gold']];
export function fixtures() {
  return {
    'invoice.pdf': makePdf([
      pdfPage({ title: 'Acme Parts Invoice 1042', paragraphs: ['Invoice for spare parts delivered in March.', 'Payment is due within 30 days.'],
        table: [['sku', 'item', 'qty', 'price'], ['P-100', 'Hex bolt', '40', '0.25'], ['P-200', 'Wing nut', '25', '0.40'], ['P-300', 'Washer', '100', '0.05']] }),
      pdfPage({ title: 'Terms', paragraphs: ['Goods remain the property of Acme Parts until paid in full.'] }),
    ], { Title: 'Invoice 1042', Author: 'Acme Parts Billing' }),
    'suppliers.docx': makeDocx([
      { h: 'Supplier review' }, { p: 'This note lists the suppliers we used this quarter.' },
      { table: [['supplier_id', 'name', 'city'], ['S1', 'Northwind Metals', 'Leeds'], ['S2', 'Bluebird Fasteners', 'Porto'], ['S3', 'Kestrel Tools', 'Graz']] },
      { h: 'Next steps', level: 2 }, { p: 'Ask Kestrel Tools for a new quote.' },
    ], { title: 'Supplier review Q1', author: 'Purchasing team' }, { externalLink: true }),
    'customers.xlsx': makeWorkbook({ Customers: CUSTOMERS, Regions: [['region', 'manager'], ['North', 'Dee'], ['South', 'Eli']] }, 'xlsx', { Title: 'Customer list', Author: 'Sales' }),
    'products.xls': makeWorkbook({ Products: [['sku', 'name', 'price'], ['P-100', 'Hex bolt', 0.25], ['P-200', 'Wing nut', 0.4]] }, 'biff8'),
    'orders.csv': Buffer.from('order_id,customer_id,total\r\nO1,C1,12.5\r\nO2,C2,7\r\n'),
  };
}
// Zip bombs: one honest (tiny file, 64 MB inside), one that lies about its unpacked size.
export function zipBomb() { return makeZip([{ name: '[Content_Types].xml', data: '<Types/>' }, { name: 'word/document.xml', data: Buffer.alloc(64e6, 0x20) }]); }
export function lyingZip() { return makeZip([{ name: '[Content_Types].xml', data: '<Types/>' }, { name: 'word/document.xml', data: Buffer.alloc(8e6, 0x20), declaredSize: 1000 }]); }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(fileURLToPath(new URL('.', import.meta.url)), 'documents'); mkdirSync(dir, { recursive: true });
  for (const [n, b] of Object.entries(fixtures())) { writeFileSync(join(dir, n), b); console.log(n, b.length); }
}
