// Refresh the fixture sample from the five official endpoints, then write fixtures/manifest.json.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from './sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, 'fixtures');
const retrieved = new Date().toISOString().slice(0, 10);

function run(script) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [join(HERE, script)], { stdio: 'inherit', env: process.env });
    child.on('exit', code => resolve(code ?? 1));
  });
}

const steps = [
  ['fetch-ofac.mjs', 'ofac'],
  ['fetch-bis.mjs', 'bis'],
  ['fetch-fcc.mjs', 'fcc'],
  ['fetch-gleif.mjs', 'gleif'],
  ['fetch-edgar.mjs', 'edgar'],
];
const failed = [];
if (!process.argv.includes('--manifest-only')) {
  for (const [script, id] of steps) {
    const code = await run(script);
    if (code !== 0) failed.push(id);
  }
}

async function count(rel) {
  try { return await readFile(join(FIX, rel), 'utf8'); }
  catch { return ''; }
}
const ofac = await count('ofac/sdn.xml');
const bis = await count('bis/entity-list.csv');
const fcc = await count('fcc/coveredlist.html');
let gleifN = 0;
try { gleifN = JSON.parse(await readFile(join(FIX, 'gleif', 'bundle.json'), 'utf8')).records.length; } catch { /* missing */ }
let tickerN = 0;
try { tickerN = Object.keys(JSON.parse(await readFile(join(FIX, 'edgar', 'company_tickers.json'), 'utf8'))).length; } catch { /* missing */ }
let submissionN = 0;
try { submissionN = readdirSync(join(FIX, 'edgar', 'submissions')).filter(n => n.endsWith('.json')).length; } catch { /* missing */ }

const manifest = {
  retrieved,
  note: 'Small excerpt for offline tests and the static demo. Not a full dump. SEC contact details are not stored; live EDGAR fetches read SEC_USER_AGENT from the environment.',
  counts: {
    fccRows: (fcc.match(/<tr/gi) || []).length - 1,
    bisRows: Math.max(0, bis.split('\n').filter(Boolean).length - 1),
    ofacEntries: Math.max(0, ofac.split('<sdnEntry>').length - 1),
    gleifRecords: gleifN,
    edgarTickerMatches: tickerN,
    edgarSubmissions: submissionN,
  },
  failed,
  sources: Object.values(SOURCES).map(s => ({
    id: s.id, title: s.title, url: s.url, license: s.license, retrieved, notes: s.notes,
  })),
};
await mkdir(FIX, { recursive: true });
await writeFile(join(FIX, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest', JSON.stringify(manifest.counts));
if (failed.length) console.log('fetch failed for:', failed.join(', '));
