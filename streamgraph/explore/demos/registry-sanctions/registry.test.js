import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { authorize, basicValue } from '../../../demo/vercel-registry/middleware.js';
import { buildDemoData, FIXTURE_DIR, readFixtureFiles } from './build-graph.mjs';
import { mentionsFamily } from './families.mjs';
import { parseBis, parseEdgarSubmission, parseEdgarTickers, parseFcc, parseGleif, parseOfac } from './parse.mjs';

let demo;
let files;

beforeAll(async () => {
  files = readFixtureFiles();
  demo = await buildDemoData();
}, 30000);

function orgs() {
  return demo.nodes.filter(n => n.label === 'Organization');
}
function named(re, source) {
  return orgs().filter(n => (!source || n.props.source === source) && re.test(`${n.props.name} ${(n.props.aliases || []).join(' ')}`));
}
function sameAs(a, b) {
  return demo.edges.some(e => e.type === 'same_as' && ((e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id)));
}
function linked(reA, reB) {
  const left = named(reA);
  const right = named(reB);
  return left.some(a => right.some(b => a.id !== b.id && sameAs(a, b)));
}

describe('parsers on the fixture sample', () => {
  it('parses the FCC Covered List producers', () => {
    const rows = parseFcc(files.fccHtml);
    const names = rows.map(r => r.name);
    expect(names).toEqual(expect.arrayContaining([
      'Huawei Technologies Company',
      'ZTE Corporation',
      'Hangzhou Hikvision Digital Technology Company',
      'Dahua Technology Company',
      'Hytera Communications Corporation',
      'China Mobile International USA Inc',
      'China Telecom (Americas) Corp',
    ]));
    const comnet = rows.find(r => r.name === 'ComNet (USA) LLC');
    expect(comnet.subsidiaryOf).toBe('Pacific Networks Corp');
    expect(rows.find(r => r.name === 'Huawei Technologies Company').date).toBe('2021-03-12');
  });

  it('parses BIS Entity List rows with addresses', () => {
    const rows = parseBis(files.bisCsv);
    expect(rows.length).toBeGreaterThan(100);
    const huawei = rows.find(r => /^Huawei Technologies Co\./.test(r.name));
    expect(huawei).toBeTruthy();
    expect(huawei.addresses.some(a => a.country)).toBe(true);
    expect(huawei.source).toMatch(/Entity List/);
    expect(rows.some(r => /Gazprom/i.test(r.name))).toBe(false);
  });

  it('parses OFAC SDN entries, including the Dahua Hotel near-miss', () => {
    const rows = parseOfac(files.ofacXml);
    expect(rows.length).toBe(2);
    expect(rows.every(r => r.kind === 'organization' && r.programs.length && r.uid)).toBe(true);
    expect(rows.some(r => r.addresses.some(a => /Dahua Hotel/i.test(a.raw)))).toBe(true);
  });

  it('parses an individual SDN entry', () => {
    const xml = `<?xml version="1.0"?><sdnList><publshInformation><Publish_Date>11/23/2026</Publish_Date></publshInformation>
      <sdnEntry><uid>9</uid><firstName>Ada</firstName><lastName>Example</lastName><sdnType>Individual</sdnType>
      <programList><program>SDGT</program></programList></sdnEntry></sdnList>`;
    const [row] = parseOfac(xml);
    expect(row.kind).toBe('person');
    expect(row.name).toBe('Ada Example');
    expect(row.programs).toEqual(['SDGT']);
  });

  it('parses GLEIF records and the Hikvision Level 2 parent link', () => {
    const { records, parents } = parseGleif(files.gleif);
    expect(records.length).toBeGreaterThan(20);
    const huawei = records.find(r => r.aliases.some(a => /Huawei Technologies Co\./.test(a)) || /Huawei Technologies Co\./.test(r.name));
    expect(huawei.lei).toMatch(/^[A-Z0-9]{18,20}$/);
    const link = parents.find(p => p.type === 'IS_DIRECTLY_CONSOLIDATED_BY');
    expect(link.childLei).toBeTruthy();
    expect(link.parentLei).toBeTruthy();
    const child = records.find(r => r.lei === '2549009CXKM0B6NW2K50');
    const parent = records.find(r => r.lei === link.parentLei && /HIKVISION|海康威视/.test(`${r.name} ${r.aliases.join(' ')}`));
    expect(child.name).toMatch(/HIKVISION SINGAPORE/i);
    expect(parent).toBeTruthy();
  });

  it('parses EDGAR tickers and submissions', () => {
    expect(parseEdgarTickers(files.tickers)).toEqual([]);
    const sample = parseEdgarTickers({ 0: { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' } });
    expect(sample[0]).toMatchObject({ cik: '320193', ticker: 'AAPL', name: 'Apple Inc.' });
    const dir = join(FIXTURE_DIR, 'edgar', 'submissions');
    const docs = readdirSync(dir).filter(n => n.endsWith('.json')).map(n => parseEdgarSubmission(readFileSync(join(dir, n), 'utf8')));
    expect(docs.length).toBeGreaterThan(8);
    expect(docs.some(d => /CHINA MOBILE LTD/i.test(d.name) && d.cik === '1117795')).toBe(true);
    expect(docs.some(d => /ZTE CORP/i.test(d.name))).toBe(true);
    expect(docs.some(d => /HUAWEI TECH INVESTMENT/i.test(d.name))).toBe(true);
  });
});

describe('family filter', () => {
  it('keeps the covered-list names and rejects lookalikes', () => {
    expect(mentionsFamily('Huawei Technologies Co., Ltd.')).toBe(true);
    expect(mentionsFamily('ZTE Parsian')).toBe(true);
    expect(mentionsFamily('Gazprom Telekom, OOO')).toBe(false);
    expect(mentionsFamily('Aztec Minerals Corp.')).toBe(false);
    expect(mentionsFamily('ZTEK CORP')).toBe(true);
  });
});

describe('cross-list resolution', () => {
  it('links alias pairs an exact string compare misses', () => {
    const fcc = 'Huawei Technologies Company';
    const bis = 'Huawei Technologies Co., Ltd.';
    expect(fcc === bis).toBe(false);
    expect(linked(/Huawei Technologies Company/, /Huawei Technologies Co\./)).toBe(true);
    const edge = demo.edges.find(e => e.type === 'same_as' && /Huawei Technologies/.test(`${demo.nodes.find(n => n.id === e.from)?.props.name} ${demo.nodes.find(n => n.id === e.to)?.props.name}`));
    expect(edge.props.score).toBeGreaterThan(0.97);
    expect(edge.props.explanation.some(w => w.property === 'name' && w.level.includes('similarity'))).toBe(true);
  });

  it('links Hikvision across FCC, BIS and GLEIF and keeps the Singapore subsidiary as a child', () => {
    expect(linked(/Hangzhou Hikvision Digital Technology Company/, /Hangzhou Hikvision Digital Technology Co/)).toBe(true);
    expect(linked(/Hangzhou Hikvision Digital Technology Company/, /Hangzhou HIKVISION Digital Technology/)).toBe(true);
    const parent = named(/Hangzhou HIKVISION Digital Technology/, 'gleif')[0];
    const child = named(/HIKVISION SINGAPORE/, 'gleif')[0];
    expect(sameAs(parent, child)).toBe(false);
    expect(demo.edges.some(e => e.type === 'parent_of' && e.from === parent.id && e.to === child.id)).toBe(true);
  });

  it('links the other known pairs and does not merge the near-misses', () => {
    expect(linked(/Hytera Communications Corporation/, /Hytera Communications Limited/)).toBe(true);
    expect(linked(/Dahua Technology Company/, /\bDahua Technology\b/)).toBe(true);
    expect(linked(/ZTE Corporation/, /ZTE CORP/)).toBe(true);
    expect(linked(/CHINA MOBILE LTD/, /China Mobile Limited/)).toBe(true);
    expect(linked(/Huawei Tech\. Investment/, /HUAWEI TECH INVESTMENT/)).toBe(true);
    expect(linked(/COOPERATIEF U\.A|COÖPERATIEF/i, /Cooperatief U\.A/)).toBe(true);
    expect(linked(/\bZTE CORP\b/, /ZTEK/)).toBe(false);
    expect(linked(/\bZTE CORP\b/, /ZTEST ELECTRONICS/)).toBe(false);
    expect(linked(/Hytera Communications/, /Hytera America/)).toBe(false);
    expect(linked(/Dahua Technology/, /SHANGHAI GANG QUAN/)).toBe(false);
    expect(linked(/CHINA MOBILE LTD/, /China Mobile Media/)).toBe(false);
    expect(linked(/CHINA MOBILE LTD/, /China Mobilesoft/)).toBe(false);
  });

  it('fails a shared-token matcher and an exact-string matcher on purpose', () => {
    const share = (a, b) => {
      const toks = s => new Set(String(s).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3));
      for (const t of toks(a)) if (toks(b).has(t)) return true;
      return false;
    };
    expect(share('Hytera America Incorporated', 'Hytera Communications Corporation')).toBe(true);
    expect(linked(/Hytera America/, /Hytera Communications Corporation/)).toBe(false);
    expect('ZTE CORP' === 'ZTEK CORP').toBe(false);
    expect('Huawei Technologies Company' === 'Huawei Technologies Co., Ltd.').toBe(false);
  });
});

describe('provenance', () => {
  it('puts source provenance on every node and every edge', () => {
    expect(demo.nodes.length).toBeGreaterThan(100);
    expect(demo.edges.length).toBeGreaterThan(100);
    for (const n of demo.nodes) {
      expect(Array.isArray(n.props.provenance) && n.props.provenance.length).toBeTruthy();
      for (const p of n.props.provenance) expect(p.source).toBeTruthy();
    }
    for (const e of demo.edges) {
      expect(Array.isArray(e.props.provenance) && e.props.provenance.length).toBeTruthy();
      for (const p of e.props.provenance) {
        expect(p.source).toBeTruthy();
        expect(p.url || p.method).toBeTruthy();
        expect(p.retrieved).toBeTruthy();
      }
    }
  });
});

describe('demo gate', () => {
  it('fails closed when DEMO_PASSWORD is unset and opens for demo plus the password', () => {
    const req = authorization => new Request('https://demo.example/', { headers: authorization ? { authorization } : {} });
    expect(authorize(req(basicValue('demo', 'x')), {}).status).toBe(401);
    expect(authorize(req(basicValue('demo', '')), { DEMO_PASSWORD: '' }).status).toBe(401);
    expect(authorize(req(basicValue('demo', 'correct-horse')), { DEMO_PASSWORD: 'correct-horse' })).toBe(null);
    expect(authorize(req(basicValue('root', 'correct-horse')), { DEMO_PASSWORD: 'correct-horse' }).status).toBe(401);
  });
});
