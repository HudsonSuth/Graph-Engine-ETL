// Download the ITA Consolidated Screening List CSV and keep Entity List rows
// whose name or alternate name mentions a covered-list family.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mentionsFamily } from './families.mjs';
import { SOURCES } from './sources.mjs';
import { parseCsv, toCsv } from './text.mjs';
import { getText, opt } from './fetch-lib.mjs';

const HEADER = ['_id', 'source', 'entity_number', 'type', 'programs', 'name', 'title', 'addresses', 'federal_register_notice', 'start_date', 'end_date', 'standard_order', 'license_requirement', 'license_policy', 'remarks', 'source_list_url', 'alt_names', 'source_information_url', 'ids'];
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'bis', 'entity-list.csv');

export function selectBis(csvText) {
  const rows = parseCsv(csvText).filter(row => /entity list/i.test(row.source || '') && mentionsFamily(`${row.name || ''} ${row.alt_names || ''}`));
  return { csv: toCsv(rows, HEADER), count: rows.length };
}

const file = opt('--file', '');
let text;
try {
  text = await getText(SOURCES.bis.url, {
    file,
    headers: { 'user-agent': 'StreamGraph-Demo research', accept: 'text/csv' },
  });
} catch (e) {
  console.error(`BIS Entity List download failed: ${e.message}`);
  process.exit(1);
}
const sample = selectBis(text);
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, sample.csv);
console.log(`bis fixture ${sample.count} Entity List rows -> ${OUT}`);
