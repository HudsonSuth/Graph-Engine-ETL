// Query the public GLEIF API for the covered-list families, their direct children, and Level 2 parents.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keepGleifName } from './families.mjs';
import { SOURCES } from './sources.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'gleif', 'bundle.json');
const QUERIES = [
  'Huawei Technologies', '华为技术', '华为投资控股',
  'ZTE Corporation', '中兴通讯股份',
  'Hikvision', '海康威视',
  'Dahua Technology',
  'Hytera',
  'China Mobile', '中国移动',
  'China Telecom', '中国电信集团', '中国电信股份',
  'China Unicom', '中国联合网络通信',
  'Kaspersky Lab',
];

const headers = { accept: 'application/vnd.api+json', 'user-agent': 'StreamGraph-Demo research' };

async function getJson(url) {
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

function blobOf(resource) {
  const ent = resource?.attributes?.entity;
  if (!ent) return '';
  const others = (ent.otherNames || []).map(o => o.name).join(' ');
  return `${ent.legalName?.name || ''} ${others}`;
}

async function search(q) {
  const url = `${SOURCES.gleif.url}?filter[entity.legalName]=${encodeURIComponent(q)}&page[size]=15`;
  const body = await getJson(url);
  return body?.data || [];
}

const byLei = new Map();
function take(resource) {
  const lei = resource?.attributes?.lei || resource?.id;
  if (!lei || byLei.has(lei)) return;
  byLei.set(lei, resource);
}

for (const q of QUERIES) {
  let rows = [];
  try { rows = await search(q); }
  catch (e) { console.error(`gleif search failed for ${q}: ${e.message}`); continue; }
  let kept = 0;
  for (const row of rows) {
    if (!keepGleifName(blobOf(row))) continue;
    take(row);
    kept++;
    if (kept >= 8) break;
  }
  await new Promise(r => setTimeout(r, 120));
}

const relationships = [];
const seeds = [...byLei.keys()];
for (const lei of seeds) {
  for (const kind of ['direct-parent', 'direct-children']) {
    const url = `${SOURCES.gleif.url}/${lei}/${kind}?page[size]=8`;
    let body;
    try { body = await getJson(url); }
    catch (e) { console.error(`gleif ${kind} ${lei}: ${e.message}`); continue; }
    const data = body?.data;
    const list = Array.isArray(data) ? data : data ? [data] : [];
    for (const row of list) take(row);
    await new Promise(r => setTimeout(r, 80));
  }
  const rel = await getJson(`${SOURCES.gleif.url}/${lei}/direct-parent-relationship`);
  if (rel?.data?.attributes?.relationship) {
    const r = rel.data.attributes.relationship;
    relationships.push({ childLei: r.startNode?.id, parentLei: r.endNode?.id, raw: rel.data });
  }
  await new Promise(r => setTimeout(r, 80));
}

const bundle = { records: [...byLei.values()], relationships };
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(bundle));
console.log(`gleif fixture ${bundle.records.length} lei records, ${relationships.length} parent links -> ${OUT}`);
