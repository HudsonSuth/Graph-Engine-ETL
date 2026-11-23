// Download the OFAC SDN XML and keep entries that mention a covered-list family,
// including address-only mentions such as "Dahua Hotel". Those are the near-miss negatives.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mentionsFamily } from './families.mjs';
import { SOURCES } from './sources.mjs';
import { getText, opt } from './fetch-lib.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'ofac', 'sdn.xml');

export function selectOfac(xml) {
  const kept = [];
  for (const chunk of xml.split('<sdnEntry>').slice(1)) {
    const body = chunk.split('</sdnEntry>')[0];
    if (mentionsFamily(body)) kept.push(body);
  }
  const info = /<publshInformation>[\s\S]*?<\/publshInformation>/.exec(xml);
  const header = info ? info[0] : '<publshInformation><Publish_Date></Publish_Date></publshInformation>';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sdnList xmlns="https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/XML">\n  ${header}\n${kept.map(b => `  <sdnEntry>${b}</sdnEntry>`).join('\n')}\n</sdnList>\n`;
}

const file = opt('--file', '');
let xml;
try {
  xml = await getText(SOURCES.ofac.url, {
    file,
    headers: { 'user-agent': 'StreamGraph-Demo research', accept: 'application/xml' },
  });
} catch (e) {
  console.error(`OFAC SDN download failed: ${e.message}`);
  process.exit(1);
}
const sample = selectOfac(xml);
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, sample);
const n = sample.split('<sdnEntry>').length - 1;
console.log(`ofac fixture ${n} sdnEntry records -> ${OUT}`);
