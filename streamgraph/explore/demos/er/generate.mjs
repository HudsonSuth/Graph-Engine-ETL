// Synthetic people + organisations with KNOWN ground truth for entity resolution (SPEC §21.8). No real people:
// names are random combinations of common given/family names, streets and towns are invented, phone numbers use the
// NANP fictional range 555-0100..0199, e-mail and web domains use the RFC 2606 reserved names (example.com/.org/.net, *.example).
//   node explore/demos/er/generate.mjs [--people 1500] [--orgs 150] [--seed 7] [--out fixture.json]
// Output: { meta, records: [{ id, type, dataSource, recordId, label, properties }], links: [...], truth: { recordNodeId: entityKey } }
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const FIRST = ['james', 'mary', 'robert', 'patricia', 'john', 'jennifer', 'michael', 'linda', 'william', 'elizabeth', 'david', 'barbara', 'richard', 'susan', 'joseph', 'jessica', 'thomas', 'sarah',
  'charles', 'karen', 'daniel', 'nancy', 'matthew', 'lisa', 'anthony', 'betty', 'mark', 'margaret', 'donald', 'sandra', 'steven', 'ashley', 'andrew', 'kimberly', 'joshua', 'emily', 'kenneth', 'donna',
  'kevin', 'michelle', 'brian', 'carol', 'george', 'amanda', 'timothy', 'melissa', 'ronald', 'deborah', 'edward', 'stephanie', 'jason', 'rebecca', 'jeffrey', 'laura', 'ryan', 'sharon', 'jacob', 'cynthia',
  'gary', 'kathleen', 'nicholas', 'amy', 'eric', 'angela', 'jonathan', 'shirley', 'stephen', 'anna', 'larry', 'brenda', 'justin', 'pamela', 'scott', 'emma', 'benjamin', 'nicole', 'samuel', 'helen',
  'gregory', 'samantha', 'alexander', 'katherine', 'patrick', 'christine', 'frank', 'debra', 'raymond', 'rachel', 'jack', 'carolyn', 'dennis', 'janet', 'jerry', 'maria', 'tyler', 'olivia', 'aaron', 'heather'];
const NICK = { robert: ['bob', 'rob', 'bobby'], william: ['bill', 'will', 'billy'], richard: ['rick', 'dick', 'rich'], james: ['jim', 'jimmy'], michael: ['mike', 'mikey'], joseph: ['joe', 'joey'],
  thomas: ['tom', 'tommy'], charles: ['charlie', 'chuck'], daniel: ['dan', 'danny'], matthew: ['matt'], anthony: ['tony'], donald: ['don'], steven: ['steve'], andrew: ['andy', 'drew'], joshua: ['josh'],
  kenneth: ['ken', 'kenny'], timothy: ['tim'], ronald: ['ron'], edward: ['ed', 'eddie', 'ted'], jeffrey: ['jeff'], nicholas: ['nick'], jonathan: ['jon'], stephen: ['steve'], benjamin: ['ben'],
  samuel: ['sam'], gregory: ['greg'], alexander: ['alex'], patrick: ['pat'], jennifer: ['jen', 'jenny'], elizabeth: ['liz', 'beth', 'betsy'], patricia: ['pat', 'patty', 'trish'], margaret: ['maggie', 'peggy'],
  kimberly: ['kim'], deborah: ['deb', 'debbie'], rebecca: ['becky'], katherine: ['kate', 'kathy', 'katie'], christine: ['chris'], samantha: ['sam'], susan: ['sue'], cynthia: ['cindy'], pamela: ['pam'], jessica: ['jess'] };
const LAST = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson', 'thomas', 'taylor', 'moore',
  'jackson', 'martin', 'lee', 'perez', 'thompson', 'white', 'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson', 'walker', 'young', 'allen', 'king', 'wright', 'scott', 'torres', 'nguyen', 'hill',
  'flores', 'green', 'adams', 'nelson', 'baker', 'hall', 'rivera', 'campbell', 'mitchell', 'carter', 'roberts', 'gomez', 'phillips', 'evans', 'turner', 'diaz', 'parker', 'cruz', 'edwards', 'collins',
  'reyes', 'stewart', 'morris', 'morales', 'murphy', 'cook', 'rogers', 'gutierrez', 'ortiz', 'morgan', 'cooper', 'peterson', 'bailey', 'reed', 'kelly', 'howard', 'ramos', 'kim', 'cox', 'ward', 'richardson',
  'watson', 'brooks', 'chavez', 'wood', 'james', 'bennett', 'gray', 'mendoza', 'ruiz', 'hughes', 'price', 'alvarez', 'castillo', 'sanders', 'patel', 'myers', 'long', 'ross', 'foster', 'jimenez'];
const STREET = ['maple', 'cedar', 'willow', 'birch', 'aspen', 'juniper', 'hawthorn', 'sycamore', 'linden', 'chestnut', 'magnolia', 'alder', 'hazel', 'laurel', 'poplar', 'spruce', 'larch', 'rowan', 'elm', 'cypress',
  'meadow', 'brook', 'ridge', 'harbor', 'summit', 'orchard', 'quarry', 'lantern', 'copper', 'falcon', 'heron', 'sparrow', 'otter', 'badger', 'fox', 'kestrel'];
const SUFFIX = [['Street', 'St'], ['Avenue', 'Ave'], ['Road', 'Rd'], ['Lane', 'Ln'], ['Drive', 'Dr'], ['Court', 'Ct'], ['Place', 'Pl'], ['Boulevard', 'Blvd']];
const TOWN = ['Oakridge Falls', 'Millbrook Junction', 'East Harlow', 'Port Bellamy', 'Cinder Hollow', 'Lakemont', 'Greywater', 'North Ambry', 'Fairhaven Heights', 'Silverton Glen', 'Westmere', 'Briar Crossing'];
const AREA = [201, 212, 213, 303, 312, 404, 415, 503, 512, 602, 617, 702, 713, 718, 801, 919, 206, 305, 412, 614];
const ORGW = ['northwind', 'bluepeak', 'ironleaf', 'silverline', 'brightwater', 'redstone', 'clearpath', 'stonebridge', 'greenfield', 'blackrock', 'sunhaven', 'tidewell', 'oakmont', 'swiftriver', 'cobalt', 'evergreen',
  'harborview', 'pinecrest', 'goldleaf', 'westwind', 'crescent', 'summitline', 'lakeshore', 'fieldstone'];
const ORGK = ['logistics', 'analytics', 'foods', 'robotics', 'health', 'capital', 'energy', 'systems', 'textiles', 'labs', 'media', 'freight', 'software', 'builders', 'pharma', 'outfitters'];
const ORGS = ['Inc', 'LLC', 'Ltd', 'Corp', 'Co', 'Group', 'Holdings'];
const SOURCES = ['crm', 'billing', 'support'];
const cap = s => s.split(/(\s+|-)/).map(w => (w.trim() ? w[0].toUpperCase() + w.slice(1) : w)).join('');

export function generate({ people = 1500, orgs = 150, seed = 7 } = {}) {
  const r = rng(seed), pick = a => a[Math.floor(r() * a.length)], chance = p => r() < p, int = (a, b) => a + Math.floor(r() * (b - a + 1));
  const typo = s => { if (s.length < 4) return s; const i = int(1, s.length - 2), k = r(); return k < 0.4 ? s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2) : k < 0.7 ? s.slice(0, i) + s.slice(i + 1) : s.slice(0, i) + pick('aeioulnrst') + s.slice(i + 1); };
  const usedPhone = new Set(), phone = () => { for (;;) { const p = `${usedPhone.size < 1500 ? pick(AREA) : int(201, 989)}5550${int(100, 199)}`; if (!usedPhone.has(p)) { usedPhone.add(p); return p; } } };
  const fmtPhone = (p, k) => [`(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}`, `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`, `+1 ${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}`, `${p.slice(0, 3)}.${p.slice(3, 6)}.${p.slice(6)}`][k];
  const address = () => ({ no: int(1, 9899), street: pick(STREET), suf: pick(SUFFIX), town: pick(TOWN), zip: String(int(10000, 99899)), apt: chance(0.25) ? int(1, 40) : null });
  const fmtAddr = (a, long) => `${a.no} ${cap(a.street)} ${long ? a.suf[0] : a.suf[1]}${a.apt ? (long ? `, Apartment ${a.apt}` : ` #${a.apt}`) : ''}, ${a.town} ${a.zip}`;
  const dob = () => { const y = int(1950, 2004), m = int(1, 12), d = int(1, 28); return [y, m, d]; };
  const fmtDob = ([y, m, d], k) => [`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, `${m}/${d}/${y}`, `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`][k];
  const usedEmail = new Set(), emailOf = (f, l, n) => { for (let k = n;; k = int(1, 999)) { const e = `${f}.${l}${k ? k : ''}@${pick(['example.com', 'example.org', 'example.net'])}`; if (!usedEmail.has(e)) { usedEmail.add(e); return e; } } };

  // ---- organisations
  const orgEntities = [], usedOrg = new Set();
  for (let i = 0; i < orgs; i++) {
    let w, k, n = 0; do { w = pick(ORGW); k = pick(ORGK); } while (usedOrg.has(w + k) && ++n < 200);
    if (usedOrg.has(w + k)) { let j = 2; while (usedOrg.has(`${w}${k}${j}`)) j++; k = `${k} ${j}`; } // name space exhausted: number the name
    usedOrg.add(w + k);
    orgEntities.push({ key: `org-${i}`, w, k, suffix: pick(ORGS), domain: `${w}-${k}.example`.replace(/ /g, "-"), phone: phone(), addr: address() });
  }
  // ---- people (households share an address + phone; namesakes share a name: both are hard negatives)
  const persons = [];
  for (let i = 0; i < people; i++) {
    let first = pick(FIRST), last = pick(LAST), addr = address(), ph = phone(), b = dob();
    const prev = persons.length ? persons[Math.floor(r() * persons.length)] : null;
    if (prev && chance(0.08)) { last = prev.last; addr = prev.addr; ph = prev.phone; }           // household member
    else if (prev && chance(0.06)) { first = prev.first; last = prev.last; }                   // namesake
    persons.push({ key: `person-${i}`, first, last, middle: chance(0.4) ? pick(FIRST)[0] : null, addr, phone: ph, dob: b, email: emailOf(first, last, chance(0.5) ? int(1, 99) : 0), org: chance(0.7) ? pick(orgEntities) : null });
  }
  const records = [], links = [], truth = {};
  const counter = Object.fromEntries(SOURCES.map(s => [s, 0]));
  const recId = (src, t) => `${src}-${t}${String(++counter[src]).padStart(6, '0')}`;
  const orgRecords = new Map();
  for (const o of orgEntities) {
    const n = 1 + (chance(0.55) ? 1 : 0) + (chance(0.25) ? 1 : 0), srcs = [...SOURCES].sort(() => r() - 0.5).slice(0, n);
    const ids = [];
    for (const src of srcs) {
      let name = `${cap(o.w)} ${cap(o.k)}`;
      if (chance(0.15)) name = typo(name);
      const suffix = chance(0.3) ? pick(ORGS) : o.suffix, full = chance(0.15) ? name : `${name} ${suffix}${chance(0.3) ? '.' : ''}`;
      const props = { name: chance(0.1) ? full.toUpperCase() : full };
      if (chance(0.8)) props.domain = chance(0.3) ? `www.${o.domain}` : o.domain;
      if (chance(0.7)) props.phone = fmtPhone(o.phone, int(0, 3));
      if (chance(0.7)) props.address = fmtAddr(o.addr, chance(0.5));
      if (props.domain?.startsWith('www.')) props.domain = props.domain.slice(4);
      const rid = recId(src, 'O'), id = `${src}:${rid}`;
      records.push({ id, type: 'Organization', dataSource: src, recordId: rid, label: props.name, properties: { ...props, dataSource: src, recordId: rid } });
      truth[id] = o.key; ids.push({ id, src });
    }
    orgRecords.set(o.key, ids);
  }
  for (const p of persons) {
    const n = 1 + (chance(0.6) ? 1 : 0) + (chance(0.3) ? 1 : 0) + (chance(0.1) ? 1 : 0);
    const srcs = Array.from({ length: n }, (_, j) => (j < 3 ? SOURCES[(int(0, 2) + j) % 3] : pick(SOURCES)));
    let moved = null;
    for (const src of srcs) {
      let first = p.first, last = p.last;
      if (NICK[first] && chance(0.25)) first = pick(NICK[first]);
      if (chance(0.12)) first = typo(first); if (chance(0.1)) last = typo(last);
      const style = r();
      let name = style < 0.6 ? `${cap(first)}${p.middle && chance(0.5) ? ` ${p.middle.toUpperCase()}.` : ''} ${cap(last)}` : style < 0.8 ? `${cap(last)}, ${cap(first)}` : `${first.toUpperCase()} ${last.toUpperCase()}`;
      if (style >= 0.6 && style < 0.8) name = `${cap(first)} ${cap(last)}`; // keep "given family" order (Duke compares strings, not name parts)
      const props = { name };
      if (chance(0.75)) props.email = chance(0.05) ? typo(p.email) : chance(0.2) ? p.email.toUpperCase() : p.email;
      if (chance(0.7)) props.phone = fmtPhone(p.phone, int(0, 3));
      if (chance(0.12) && !moved) moved = address();
      const a = moved && chance(0.6) ? moved : p.addr;
      if (chance(0.8)) props.address = fmtAddr(a, chance(0.5));
      if (chance(0.75)) { let d = [...p.dob]; if (chance(0.04)) d = [d[0], d[2] <= 12 ? d[2] : d[1], d[2] <= 12 ? d[1] : d[2]]; props.dob = fmtDob(d, int(0, 2)); }
      const rid = recId(src, 'P'), id = `${src}:${rid}`;
      records.push({ id, type: 'Person', dataSource: src, recordId: rid, label: name, properties: { ...props, dataSource: src, recordId: rid } });
      truth[id] = p.key;
      if (p.org) { const ors = orgRecords.get(p.org.key), o = ors.find(x => x.src === src) || ors[0]; links.push({ id: `${src}:works:${rid}`, type: 'WORKS_AT', fromId: id, toId: o.id, source: src, properties: {} }); }
    }
  }
  // interleave sources so a stream sees partial entities first
  for (let i = records.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [records[i], records[j]] = [records[j], records[i]]; }
  const ent = new Set(Object.values(truth));
  return { meta: { generator: 'explore/demos/er/generate.mjs', seed, people, orgs, records: records.length, entities: ent.size, links: links.length, sources: SOURCES,
    note: 'Synthetic data with ground truth. Not real people. Phones: NANP fictional 555-01xx. Domains: RFC 2606 reserved.' }, records, links, truth };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2), opt = (n, d) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : d; };
  const out = opt('--out', join(dirname(fileURLToPath(import.meta.url)), 'fixture.json'));
  const f = generate({ people: Number(opt('--people', 1500)), orgs: Number(opt('--orgs', 150)), seed: Number(opt('--seed', 7)) });
  writeFileSync(out, JSON.stringify(f));
  console.log(`wrote ${out}: ${JSON.stringify(f.meta)}`);
}
