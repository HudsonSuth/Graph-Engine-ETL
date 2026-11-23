// Download the FCC Covered List page and keep the Covered Equipment table.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from './sources.mjs';
import { getText, opt } from './fetch-lib.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fcc', 'coveredlist.html');

export function extractCoveredTable(html) {
  const tables = [...String(html).matchAll(/<table[\s\S]*?<\/table>/gi)].map(m => m[0]);
  const covered = tables.find(t => /covered equipment/i.test(t) && /date of inclusion/i.test(t));
  if (!covered) throw new Error('Covered List table not found in the FCC page');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>FCC Covered List</title></head><body>
<h1>List of Equipment and Services Covered By Section 2 of The Secure Networks Act</h1>
${covered}
</body></html>
`;
}

const file = opt('--file', '');
let html;
try {
  html = await getText(SOURCES.fcc.url, {
    file,
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; StreamGraph-Demo/0.1)',
      accept: 'text/html',
    },
  });
  console.log(file ? `fcc read local copy ${file}` : 'fcc live fetch ok');
} catch (e) {
  console.error(`FCC Covered List download failed: ${e.message}`);
  console.error('The official page is https://www.fcc.gov/supplychain/coveredlist. This host often gets HTTP 403 from the FCC edge network. Pass --file with a saved copy of that page to rebuild the fixture.');
  process.exit(1);
}
const page = extractCoveredTable(html);
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, page);
console.log(`fcc fixture table -> ${OUT}`);
