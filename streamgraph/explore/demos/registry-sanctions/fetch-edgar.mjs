// SEC EDGAR. company_tickers.json is the current list. Delisted registrants are discovered
// from the EDGAR company browse, then read from data.sec.gov submissions.
// Live calls require SEC_USER_AGENT (a descriptive agent with contact information). This file never stores that value.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mentionsFamily } from './families.mjs';
import { SOURCES } from './sources.mjs';
import { secGet } from './fetch-lib.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'edgar');
const QUERIES = ['China Mobile', 'China Telecom', 'China Unicom', 'Huawei', 'ZTE', 'Hikvision', 'Dahua', 'Hytera', 'Kaspersky'];
const KEEP_FIELDS = ['accessionNumber', 'filingDate', 'reportDate', 'form', 'primaryDocument'];

function trimSubmission(doc) {
  const recent = doc.filings?.recent || {};
  const n = Math.min(4, Array.isArray(recent.form) ? recent.form.length : 0);
  const slim = {};
  for (const key of KEEP_FIELDS) if (Array.isArray(recent[key])) slim[key] = recent[key].slice(0, n);
  return {
    cik: doc.cik,
    name: doc.name,
    tickers: doc.tickers || [],
    exchanges: doc.exchanges || [],
    sic: doc.sic || '',
    sicDescription: doc.sicDescription || '',
    category: doc.category || '',
    entityType: doc.entityType || '',
    stateOfIncorporation: doc.stateOfIncorporation || '',
    formerNames: doc.formerNames || [],
    addresses: doc.addresses || {},
    filings: { recent: slim },
  };
}

if (typeof process.env.SEC_USER_AGENT !== 'string' || process.env.SEC_USER_AGENT.trim() === '') {
  console.log('SEC_USER_AGENT is not set. Skipping EDGAR live fetches. Set SEC_USER_AGENT to a descriptive user agent that includes contact information, then rerun fixtures:registry.');
  process.exit(0);
}

await mkdir(join(DIR, 'submissions'), { recursive: true });

const tickerRes = await secGet(SOURCES.edgar.url);
const tickers = await tickerRes.json();
const examined = Object.keys(tickers).length;
const matched = {};
for (const [key, row] of Object.entries(tickers)) {
  if (mentionsFamily(row?.title || '')) matched[key] = { cik_str: row.cik_str, ticker: row.ticker, title: row.title };
}
await writeFile(join(DIR, 'company_tickers.json'), JSON.stringify(matched));
console.log(`edgar company_tickers examined ${examined}, current-ticker matches ${Object.keys(matched).length}`);

const ciks = new Map();
for (const q of QUERIES) {
  const url = `${SOURCES.edgar.browseUrl}?company=${encodeURIComponent(q)}&owner=exclude&action=getcompany&count=10&output=atom`;
  let text = '';
  let ok = false;
  for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
    try {
      const res = await secGet(url, 'application/atom+xml');
      text = await res.text();
      if (/File Unavailable/i.test(text)) throw new Error('File Unavailable');
      ok = true;
    } catch (e) {
      console.error(`edgar browse attempt ${attempt} for ${q}: ${e.message}`);
      await new Promise(r => setTimeout(r, 800 * attempt));
    }
  }
  if (!ok) continue;
  const infoName = (/<conformed-name>([^<]+)<\/conformed-name>/.exec(text)?.[1] || '').replace(/&amp;/g, '&');
  const infoCik = /<company-info>[\s\S]*?<cik>0*(\d+)<\/cik>/.exec(text)?.[1];
  if (infoName && infoCik && mentionsFamily(infoName)) ciks.set(infoCik, infoName);
  for (const entry of text.split('<entry>').slice(1)) {
    const title = (/<title>([^<]+)<\/title>/.exec(entry)?.[1] || '').replace(/&amp;/g, '&').replace(/&apos;/g, "'");
    const cik = /CIK=0*(\d+)/.exec(entry)?.[1];
    if (!title || !cik || !mentionsFamily(title)) continue;
    if (!ciks.has(cik)) ciks.set(cik, title);
  }
}

let wrote = 0;
for (const [cik, title] of ciks) {
  const padded = String(cik).padStart(10, '0');
  const url = `${SOURCES.edgar.submissionsUrl}CIK${padded}.json`;
  try {
    const res = await secGet(url);
    const doc = trimSubmission(await res.json());
    await writeFile(join(DIR, 'submissions', `CIK${padded}.json`), JSON.stringify(doc));
    wrote++;
    console.log(`edgar submission ${padded} ${doc.name || title}`);
  } catch (e) {
    console.error(`edgar submission ${padded} failed: ${e.message}`);
  }
}
console.log(`edgar fixture ${wrote} submissions`);
