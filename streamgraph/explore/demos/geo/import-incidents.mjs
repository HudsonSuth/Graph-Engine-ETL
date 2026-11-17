// Loader for an incident export you are ALLOWED to use (e.g. a D-Fend Solutions Drone Incident Tracker export obtained from
// D-Fend with written permission - their Terms of Use forbid scraping/copying the site, so this tool never fetches it).
// Reads CSV or JSON (array of objects, or GeoJSON FeatureCollection), maps columns with a small mapping file, and writes a
// §6 stream batch file, or pushes it straight into a running app's ingest endpoint.
//   node explore/demos/geo/import-incidents.mjs export.csv [--map mapping.json] [--out incidents.batch.json] [--post http://127.0.0.1:8080] [--source incidents]
// Mapping (all optional, case-insensitive column names; defaults shown in DEFAULT_MAP):
//   { "id": "Incident ID", "date": "Date", "lat": "Latitude", "lon": "Longitude", "title": "Title", "country": "Country",
//     "location": "Location", "category": "Type", "target": "Target", "drone": "Drone type", "url": "Source", "attribution": "Data: D-Fend Solutions (licensed)" }
// Output graph: Incident (lat/lon, eventTime = date) -IN-> Country, -AT-> Location, -OF_TYPE-> Category, -TARGETED-> Target, -USED-> DroneType.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const DEFAULT_MAP = { id: ['id', 'incident id', 'incident_id'], date: ['date', 'incident date', 'datetime', 'time'], lat: ['lat', 'latitude'], lon: ['lon', 'lng', 'long', 'longitude'],
  title: ['title', 'name', 'headline', 'summary'], country: ['country'], location: ['location', 'place', 'city'], category: ['category', 'type', 'incident type'], target: ['target', 'target type'],
  drone: ['drone', 'drone type', 'uav', 'uav type'], url: ['url', 'source', 'link', 'source url'], description: ['description', 'details'] };

/** minimal RFC 4180 CSV parser (quotes, escaped quotes, CRLF) -> array of objects keyed by header */
export function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(x => x !== '')) rows.push(row); row = []; } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); if (row.some(x => x !== '')) rows.push(row); }
  const [head, ...body] = rows; if (!head) return [];
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])));
}
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 60);
const pick = (rec, keys) => { const lower = Object.fromEntries(Object.entries(rec).map(([k, v]) => [k.toLowerCase().trim(), v])); for (const k of [].concat(keys)) { const v = lower[String(k).toLowerCase()]; if (v != null && String(v).trim() !== '') return String(v).trim(); } return null; };

/** records -> { nodes, links, skipped }  (no record is invented: rows without a valid position or date are skipped and reported) */
export function mapIncidents(records, { map = {}, source = 'incidents', attribution = null } = {}) {
  const M = { ...DEFAULT_MAP, ...Object.fromEntries(Object.entries(map).filter(([k]) => k !== 'attribution')) };
  const nodes = new Map(), links = [], skipped = [];
  const ref = (type, name, t) => { const id = `${source}:${type.toLowerCase()}:${slug(name)}`; if (!nodes.has(id)) nodes.set(id, { id, type, label: name, eventTime: t, properties: { name } }); return id; };
  records.forEach((rec, i) => {
    const lat = Number(pick(rec, M.lat)), lon = Number(pick(rec, M.lon)), d = Date.parse(pick(rec, M.date) || '');
    if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) || pick(rec, M.lat) == null || pick(rec, M.lon) == null) { skipped.push({ row: i + 1, reason: 'no valid lat/lon' }); return; }
    if (Number.isNaN(d)) { skipped.push({ row: i + 1, reason: 'no valid date' }); return; }
    const t = new Date(d).toISOString();
    const nid = pick(rec, M.id) || createHash('sha1').update(JSON.stringify(rec)).digest('hex').slice(0, 12);
    const id = `${source}:incident:${slug(nid) || nid}`, title = pick(rec, M.title) || pick(rec, M.location) || `Incident ${nid}`;
    const props = { lat, lon, date: t, ...(pick(rec, M.url) ? { url: pick(rec, M.url) } : {}), ...(pick(rec, M.description) ? { description: pick(rec, M.description) } : {}), ...(attribution ? { attribution } : {}) };
    for (const k of ['country', 'location', 'category', 'target', 'drone']) { const v = pick(rec, M[k]); if (v) props[k] = v; }
    nodes.set(id, { id, type: 'Incident', label: title, eventTime: t, properties: props });
    const rel = [['country', 'Country', 'IN'], ['location', 'Location', 'AT'], ['category', 'Category', 'OF_TYPE'], ['target', 'Target', 'TARGETED'], ['drone', 'DroneType', 'USED']];
    for (const [k, type, lt] of rel) if (props[k]) { const to = ref(type, props[k], '1970-01-01T00:00:00.000Z'); links.push({ id: `${id}|${lt}|${to}`, type: lt, fromId: id, toId: to, eventTime: t, properties: {} }); }
  });
  return { nodes: [...nodes.values()], links, skipped };
}
export function readRecords(file) {
  const text = readFileSync(file, 'utf8');
  if (/\.csv$/i.test(file)) return parseCsv(text);
  const j = JSON.parse(text);
  if (j?.type === 'FeatureCollection') return j.features.map(f => ({ ...f.properties, ...(f.geometry?.type === 'Point' ? { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] } : {}) }));
  return Array.isArray(j) ? j : j.records || j.data || [];
}
/** §6 batch (one producer) for POST /api/explore/ingest */
export function toBatch({ nodes, links }, source = 'incidents', startSeq = 0) {
  let seq = startSeq; const now = new Date().toISOString();
  const ev = (op, it) => ({ eventId: `${source}-import:${++seq}`, op, sourceId: source, seq, eventTime: it.eventTime, ingestTime: now, payload: { id: it.id, type: it.type, label: it.label, properties: it.properties, ...(it.fromId ? { fromId: it.fromId, toId: it.toId } : {}) } });
  return { batchId: `${source}-import-${Date.now()}`, sourceId: source, partition: 0, events: [...nodes.map(n => ev('node.upsert', n)), ...links.map(l => ev('link.upsert', l))] };
}

if (process.argv[1]?.endsWith('import-incidents.mjs')) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const file = a.find(x => !x.startsWith('--') && !['--map', '--out', '--post', '--source'].includes(a[a.indexOf(x) - 1]));
  if (!file) { console.error('usage: import-incidents.mjs <export.csv|json> [--map mapping.json] [--out file] [--post http://127.0.0.1:8080] [--source incidents]'); process.exit(2); }
  const map = opt('--map') ? JSON.parse(readFileSync(opt('--map'), 'utf8')) : {}, source = opt('--source') || 'incidents';
  const g = mapIncidents(readRecords(file), { map, source, attribution: map.attribution || null });
  console.log(`${g.nodes.filter(n => n.type === 'Incident').length} incidents, ${g.nodes.length} nodes, ${g.links.length} links; skipped ${g.skipped.length}${g.skipped.length ? ' (first: ' + JSON.stringify(g.skipped.slice(0, 3)) + ')' : ''}`);
  const batch = toBatch(g, source);
  if (opt('--out')) { writeFileSync(opt('--out'), JSON.stringify(batch)); console.log('wrote', opt('--out')); }
  if (opt('--post')) { // continue the source's sequence (the ingest drops seqs it already applied), 500 events per batch
    const base = opt('--post'), cur = await (await fetch(new URL(`/api/explore/cursor?sourceId=${encodeURIComponent(source)}`, base))).json();
    const all = toBatch(g, source, Math.max(0, cur.lastAppliedSeq ?? 0)).events;
    for (let i = 0; i < all.length; i += 500) {
      const r = await fetch(new URL('/api/explore/ingest', base), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...batch, batchId: `${batch.batchId}:${i / 500}`, events: all.slice(i, i + 500) }) });
      const txt = await r.text(); if (!r.ok) { console.error('ingest', r.status, txt.slice(0, 300)); process.exit(1); }
    }
    console.log(`posted ${all.length} events to ${base}`);
  }
  if (!opt('--out') && !opt('--post')) console.log('nothing written: pass --out or --post (the app must list the source in explore.config.json "streams")');
}
