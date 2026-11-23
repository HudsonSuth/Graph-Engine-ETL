// Parsers for the five official formats. They return plain records; model.mjs turns them into a graph.
import { parseCsv, stripTags, toIsoDate, countryCode } from './text.mjs';

function xmlText(block, tag) {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

function xmlBlocks(block, tag) {
  return [...block.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi'))].map(m => m[1]);
}

/** OFAC SDN.XML (or a well-formed subset of sdnEntry elements). */
export function parseOfac(xml) {
  const published = toIsoDate(xmlText(xml, 'Publish_Date'));
  const entries = [];
  for (const chunk of xml.split('<sdnEntry>').slice(1)) {
    const body = chunk.split('</sdnEntry>')[0];
    const uid = xmlText(body, 'uid');
    const sdnType = xmlText(body, 'sdnType');
    const first = xmlText(body, 'firstName');
    const last = xmlText(body, 'lastName');
    const name = [first, last].filter(Boolean).join(' ').trim();
    const programs = xmlBlocks(body, 'program').map(p => p.trim()).filter(Boolean);
    const aliases = [];
    for (const aka of xmlBlocks(body, 'aka')) {
      const category = xmlText(aka, 'category');
      const akaName = [xmlText(aka, 'firstName'), xmlText(aka, 'lastName')].filter(Boolean).join(' ').trim();
      if (akaName && category.toLowerCase() === 'strong') aliases.push(akaName);
    }
    const addresses = [];
    for (const addr of xmlBlocks(body, 'address')) {
      const lines = ['address1', 'address2', 'address3'].map(t => xmlText(addr, t)).filter(Boolean);
      const city = xmlText(addr, 'city');
      const countryName = xmlText(addr, 'country');
      const raw = [...lines, city, xmlText(addr, 'postalCode'), countryName].filter(Boolean).join(', ');
      if (raw) addresses.push({ raw, city, country: countryCode(countryName) });
    }
    const ids = [];
    for (const id of xmlBlocks(body, 'id')) {
      const idType = xmlText(id, 'idType');
      const idNumber = xmlText(id, 'idNumber');
      if (idType && idNumber) ids.push({ type: idType, value: idNumber });
    }
    if (!uid || !name) continue;
    entries.push({
      uid, sdnType, name, programs, aliases, addresses, ids, published,
      kind: /individual/i.test(sdnType) ? 'person' : 'organization',
    });
  }
  return entries;
}

/** One Consolidated Screening List CSV, already filtered or not. */
export function parseBis(csvText, { entityListOnly = false } = {}) {
  const rows = parseCsv(csvText);
  const out = [];
  for (const row of rows) {
    const source = row.source || '';
    if (entityListOnly && !/entity list/i.test(source)) continue;
    const name = (row.name || '').trim();
    if (!name) continue;
    const aliases = splitList(row.alt_names);
    const addresses = splitList(row.addresses).map(raw => ({ raw, country: countryFromBisAddress(raw) }));
    const affiliate = splitAffiliate(name);
    out.push({
      id: row._id || row.entity_number || name,
      entityNumber: row.entity_number || '',
      name: affiliate.primary,
      affiliate: affiliate.affiliate,
      aliases,
      addresses,
      startDate: toIsoDate(row.start_date),
      federalRegister: row.federal_register_notice || '',
      licenseRequirement: (row.license_requirement || '').replace(/\s+/g, ' ').trim(),
      licensePolicy: (row.license_policy || '').replace(/\s+/g, ' ').trim(),
      source,
      sourceListUrl: row.source_list_url || '',
    });
  }
  return out;
}

function splitList(value) {
  return String(value || '').split(';').map(s => s.trim()).filter(Boolean);
}

function splitAffiliate(name) {
  const m = /^(.*?)\s*(?:\(\s*[^)]*\s*\)\s*)?(?:\.\s*)?affiliated entity:\s*(.+)$/i.exec(name);
  if (!m) return { primary: name.trim(), affiliate: '' };
  return { primary: m[1].replace(/[.\s]+$/, '').trim(), affiliate: m[2].trim() };
}

function countryFromBisAddress(raw) {
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  const last = parts[parts.length - 1] || '';
  return /^[A-Za-z]{2}$/.test(last) ? last.toUpperCase() : '';
}

/** FCC Covered List HTML. Reads the table whose header says "Covered Equipment". */
export function parseFcc(html) {
  const tables = [...String(html || '').matchAll(/<table[\s\S]*?<\/table>/gi)].map(m => m[0]);
  const covered = tables.find(t => /covered equipment/i.test(t) && /date of inclusion/i.test(t));
  if (!covered) return [];
  const out = [];
  let n = 0;
  for (const row of covered.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const cells = [...row[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => stripTags(m[1]));
    if (cells.length < 2) continue;
    if (/covered equipment/i.test(cells[0])) continue;
    const description = cells[0];
    const date = toIsoDate(cells[1]);
    const producers = extractProducers(description);
    for (const p of producers) {
      n += 1;
      out.push({
        id: `fcc-${n}`,
        name: p.name,
        subsidiaryOf: p.subsidiaryOf || '',
        description,
        date,
      });
    }
  }
  return out;
}

function extractProducers(text) {
  const sub = /provided by (.+?) and its wholly-owned subsidiary (.+?) subject/i.exec(text);
  if (sub) {
    const parent = tidyName(sub[1]);
    const child = tidyName(sub[2]);
    return [{ name: parent }, { name: child, subsidiaryOf: parent }];
  }
  const m = /(?:produced or provided by|produced by|provided by|supplied, directly or indirectly, by)\s+(.+?)(?=\s+or any\b|\s+subject\b|\s+to the extent\b|\s+including\b|\.)/i.exec(text);
  if (!m) return [];
  return [{ name: tidyName(m[1]) }];
}

function tidyName(s) {
  return s.replace(/\s+/g, ' ').replace(/[,.]\s*$/, '').trim();
}

/** GLEIF bundle: { records: [json:api lei-record], relationships: [{ childLei, parentLei, raw }] }. */
export function parseGleif(bundle) {
  const records = [];
  for (const resource of bundle?.records || []) {
    const a = resource.attributes || resource;
    const lei = a.lei || resource.id;
    const entity = a.entity || {};
    const legal = entity.legalName?.name || '';
    if (!lei || !legal) continue;
    const others = [];
    for (const o of entity.otherNames || []) {
      if (o?.name && o.type !== 'AUTO_ASCII_TRANSLITERATED_LEGAL_NAME') others.push(o.name);
    }
    const addresses = [];
    for (const key of ['legalAddress', 'headquartersAddress']) {
      const addr = entity[key];
      if (!addr) continue;
      const lines = [...(addr.addressLines || []), addr.city, addr.postalCode].filter(Boolean);
      const raw = lines.join(', ');
      if (raw) addresses.push({ raw, city: addr.city || '', country: countryCode(addr.country) });
    }
    const country = countryCode(entity.legalAddress?.country || entity.headquartersAddress?.country);
    records.push({
      lei,
      name: legal,
      aliases: others,
      country,
      addresses,
      status: a.registration?.status || '',
      initialRegistration: toIsoDate(a.registration?.initialRegistrationDate),
      lastUpdate: toIsoDate(a.registration?.lastUpdateDate),
    });
  }
  const parents = [];
  for (const rel of bundle?.relationships || []) {
    const raw = rel.raw?.attributes?.relationship || rel.relationship || {};
    const child = rel.childLei || raw.startNode?.id;
    const parent = rel.parentLei || raw.endNode?.id;
    const type = raw.type || rel.type || '';
    if (!child || !parent) continue;
    parents.push({
      childLei: child,
      parentLei: parent,
      type,
      start: toIsoDate(raw.periods?.find(p => p.type === 'RELATIONSHIP_PERIOD')?.startDate),
    });
  }
  return { records, parents };
}

/** SEC company_tickers.json shape: { "0": { cik_str, ticker, title }, ... }. */
export function parseEdgarTickers(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data || typeof data !== 'object') return [];
  return Object.values(data).map(row => ({
    cik: String(row.cik_str ?? row.cik ?? '').replace(/^0+/, '') || String(row.cik_str ?? ''),
    cikPadded: String(row.cik_str ?? row.cik ?? '').padStart(10, '0'),
    ticker: row.ticker || '',
    name: row.title || row.name || '',
  })).filter(r => r.cik && r.name);
}

/** One data.sec.gov submissions JSON document, trimmed or full. */
export function parseEdgarSubmission(json) {
  const d = typeof json === 'string' ? JSON.parse(json) : json;
  if (!d || !d.cik || !d.name) return null;
  const recent = d.filings?.recent || {};
  const filings = [];
  const n = Array.isArray(recent.form) ? recent.form.length : 0;
  for (let i = 0; i < n; i++) {
    filings.push({
      form: recent.form[i] || '',
      filingDate: toIsoDate(recent.filingDate?.[i]) || recent.filingDate?.[i] || '',
      accession: recent.accessionNumber?.[i] || '',
    });
  }
  const business = d.addresses?.business || {};
  const mailing = d.addresses?.mailing || {};
  return {
    cik: String(d.cik).replace(/^0+/, ''),
    cikPadded: String(d.cik).padStart(10, '0'),
    name: d.name,
    formerNames: (d.formerNames || []).map(f => f.name).filter(Boolean),
    tickers: d.tickers || [],
    sic: d.sicDescription || '',
    entityType: d.entityType || '',
    business,
    mailing,
    filings,
  };
}
