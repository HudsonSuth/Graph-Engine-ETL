// Small text helpers shared by the parsers, the Duke-style cleaner, and the graph builder.
import { createHash } from 'node:crypto';

export function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export function stripTags(s) {
  return decodeEntities(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** RFC 4180 CSV. Returns objects keyed by the header row. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  const s = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') { cur += '"'; i++; }
        else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  const header = rows[0] || [];
  return rows.slice(1)
    .filter(r => r.some(cell => cell !== ''))
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

export function toCsv(records, header) {
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const rec of records) lines.push(header.map(h => esc(rec[h])).join(','));
  return lines.join('\n') + '\n';
}

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** "March 12, 2021" or "2019-05-21" or "11/23/2026" -> YYYY-MM-DD, or null. */
export function toIsoDate(value) {
  const s = String(value || '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  m = /([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(s);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (!mo) return null;
    return `${m[3]}-${String(mo).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  return null;
}

const US_STATE = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));

const COUNTRY_NAME = {
  china: 'CN', "people's republic of china": 'CN', prc: 'CN',
  'hong kong': 'HK', 'hong kong sar': 'HK',
  macau: 'MO', macao: 'MO',
  taiwan: 'TW',
  'united states': 'US', 'united states of america': 'US', usa: 'US', us: 'US',
  'united kingdom': 'GB', uk: 'GB', 'great britain': 'GB',
  russia: 'RU', 'russian federation': 'RU',
  singapore: 'SG', india: 'IN', japan: 'JP', 'korea, republic of': 'KR', 'south korea': 'KR',
  germany: 'DE', france: 'FR', italy: 'IT', spain: 'ES', netherlands: 'NL',
  switzerland: 'CH', canada: 'CA', australia: 'AU', mexico: 'MX', brazil: 'BR',
  'united arab emirates': 'AE', israel: 'IL', iran: 'IR', cuba: 'CU',
  'cayman islands': 'KY', bermuda: 'BM', 'british virgin islands': 'VG', 'virgin islands, british': 'VG',
};

/** Normalize a country name or ISO code to ISO 3166-1 alpha-2, or return ''. */
export function countryCode(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (/^[A-Za-z]{2}$/.test(s)) {
    const up = s.toUpperCase();
    if (US_STATE.has(up)) return 'US';
    return up;
  }
  return COUNTRY_NAME[s.toLowerCase()] || '';
}

const CITY_COUNTRY = [
  [/hong kong|honh kong/i, 'HK'],
  [/beijing|shanghai|shenzhen|hangzhou|guangzhou/i, 'CN'],
  [/new york|waltham|las vegas|washington/i, 'US'],
  [/north york|toronto/i, 'CA'],
  [/london/i, 'GB'],
];

/** EDGAR business address -> ISO code. US state codes map to US. Opaque foreign codes use the city. */
export function countryFromEdgar(address) {
  if (!address) return '';
  const state = String(address.stateOrCountry || '').trim().toUpperCase();
  if (US_STATE.has(state)) return 'US';
  const city = String(address.city || '');
  for (const [re, code] of CITY_COUNTRY) if (re.test(city)) return code;
  return '';
}

export function shortHash(s) {
  return createHash('sha1').update(String(s)).digest('hex').slice(0, 12);
}

export function safeKey(s) {
  return String(s).replace(/[^\w.:-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 160) || 'row';
}
