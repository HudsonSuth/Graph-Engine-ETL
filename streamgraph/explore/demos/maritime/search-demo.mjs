// Maritime AIS sample + OpenSearch search index, end to end through the real app:
//   node explore/demos/maritime/search-demo.mjs [--data <csv dir>] [--port 8092] [--os http://127.0.0.1:9200] [--serve]
// Starts StreamGraph Integrated, loads the CSVs into the graph the way CSV sources do (one node per row, belongs-to links),
// marks the fields low sensitivity except callsign and imo (high, to show field-level filtering), adds an OpenSearch output
// through POST /api/studio/sinks (sent as the Owner), syncs, and runs the sample searches. --serve keeps it running.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const DATA = resolve(opt('--data', 'demo/maritime')); // the maritime AIS sample (NOAA AIS 2018-01-01 + ports, public domain)
const OS = opt('--os', process.env.OPENSEARCH_URL || 'http://127.0.0.1:9200'), PORT = Number(opt('--port', 8092));
const { startCombined } = await import('../../combined.js');
const { loadConfig } = await import('../../server/app.js');
const csv = f => { const [h, ...rows] = readFileSync(join(DATA, f), 'utf8').trim().split(/\r?\n/); const cols = h.split(','); return rows.map(r => { const v = []; let cur = '', q = false; for (const ch of r) { if (ch === '"') q = !q; else if (ch === ',' && !q) { v.push(cur); cur = ''; } else cur += ch; } v.push(cur); return Object.fromEntries(cols.map((c, i) => [c, v[i] ?? ''])); }); };
const NUM = ['lat', 'lon', 'sog', 'cog', 'heading', 'length_m', 'width_m', 'draft_m'];
const num = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '').map(([k, v]) => [k, NUM.includes(k) ? Number(v) : v]));
const dir = opt('--dir') ? resolve(opt('--dir')) : mkdtempSync(join(tmpdir(), 'sg-search-demo-'));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'explore-settings.json'), JSON.stringify({ stream: { enabled: false }, er: { enabled: false } }));
const app = await startCombined({ port: PORT, dataDir: dir, graphFile: join(dir, 'graph.db'), log: null, config: loadConfig(join(dir, 'none.json')) });
const base = `http://127.0.0.1:${app.port}`;
const call = async (p, b, as) => { const r = await fetch(base + p, { method: b === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(as ? { 'x-sg-as': as } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) }); const t = await r.text(); try { return { code: r.status, body: JSON.parse(t) }; } catch { return { code: r.status, body: t }; } };
const g = app.sg.app.graph, studio = app.sg.studio;
const vessels = csv('vessels.csv'), positions = csv('positions.csv'), ports = csv('ports.csv'), types = csv('vessel_types.csv'), wl = csv('vessel_watchlist.csv');
if (!g.counts().nodes) {
  const t0 = positions.map(p => p.ts || p.time).sort()[0];
  const lastPing = {}; for (const p of positions) if (!lastPing[p.mmsi] || p.ts > lastPing[p.mmsi]) lastPing[p.mmsi] = p.ts;
  for (const t of types) g.upsertNode(`VesselType:${t.vessel_type}`, 'VesselType', t.vessel_type, { ...num(t) });
  for (const p of ports) g.upsertNode(`Port:${p.port_id}`, 'Port', p.port_id, { ...num(p) });
  for (const v of vessels) g.upsertNode(`Vessel:${v.mmsi}`, 'Vessel', v.mmsi, { ...num(v), ts: lastPing[v.mmsi] || t0 });
  for (const w of wl) g.upsertNode(`Vessel:${w.watchlist_id}`, 'Vessel', w.watchlist_id, { ...num(w) });
  for (const p of positions) g.upsertNode(`Position:${p.ping_id}`, 'Position', p.ping_id, { ...num(p), name: `${p.ping_id} ${String(p.ts).slice(11, 16)}Z` });
  const vs = new Set(vessels.map(v => v.mmsi)), ps = new Set(ports.map(p => p.port_id)), vt = new Set(types.map(t => t.vessel_type));
  for (const v of vessels) if (vt.has(v.vessel_type)) g.upsertEdge('IS_TYPE', `Vessel:${v.mmsi}`, `VesselType:${v.vessel_type}`, {});
  for (const p of positions) { if (vs.has(p.mmsi)) g.upsertEdge('REPORTED_BY', `Position:${p.ping_id}`, `Vessel:${p.mmsi}`, {}); if (p.port_id && ps.has(p.port_id)) g.upsertEdge('NEAR_PORT', `Position:${p.ping_id}`, `Port:${p.port_id}`, {}); }
}
await call('/api/studio/home'); // registers every type and field in the access rules
const sch = g.schema();
for (const t of sch.nodeTypes) for (const f of t.props) studio.policy.setField(t.label, f, ['callsign', 'imo'].includes(f) ? 'high' : 'low');
console.log('graph', g.counts(), 'types', sch.nodeTypes.map(t => `${t.label}:${t.count}`).join(' '));
const health = await fetch(`${OS}/_cluster/health`).then(r => r.json()).catch(() => null);
console.log('opensearch', health ? `${health.status} at ${OS}` : `NOT reachable at ${OS} (search falls back to built-in)`);
if (!studio.workspace.sinks?.some(s => s.kind === 'opensearch')) {
  const t = await call('/api/studio/sinks/test', { kind: 'opensearch', settings: { url: OS, index: 'maritime-' } }); console.log('sink test:', t.body.message);
  const r = await call('/api/studio/sinks', { kind: 'opensearch', name: 'Search index', settings: { url: OS, index: 'maritime-' }, asUser: 'owner' }); if (r.code !== 200) console.log('sink save failed', r.body);
}
const t1 = Date.now(); await call('/api/studio/sinks/sync-now', {});
for (let i = 0; i < 60; i++) { const st = await call('/api/studio/search/status'); if (st.body.index === 'healthy' && st.body.docs >= g.counts().nodes) break; await call('/api/studio/sinks/sync-now', {}); await new Promise(r => setTimeout(r, 1000)); }
const st = (await call('/api/studio/search/status')).body; console.log('index status', JSON.stringify({ index: st.index, docs: st.docs, indexName: st.indexName, syncMs: Date.now() - t1 }));
const show = (title, r) => { console.log(`\n== ${title}: ${r.body.total} results, engine ${r.body.engine}, index ${r.body.index}, ${r.body.ms} ms`); for (const x of r.body.results.slice(0, 6)) console.log(`  ${x.type.padEnd(9)} ${String(x.name).padEnd(28)} ${x.id}${x.geo ? `  @${x.geo.lat},${x.geo.lon}` : ''}  ${x.highlights.map(h => `${h.field}: ${h.fragments[0]}`).join(' | ')}`); return r.body; };
const out = {};
out.fuzzy = show("q='ANAN MAERSK' (owner)", await call('/api/studio/search', { q: 'ANAN MAERSK', size: 10 }));
out.norfolk = show('geo: within 10 km of Norfolk (36.8508,-76.2859), Position only', await call('/api/studio/search', { types: ['Position'], geo: { lat: 36.8508, lon: -76.2859, radius: '10km' }, size: 10 }));
out.callsignOwner = show("q='OXBA2' (callsign, high field) as owner", await call('/api/studio/search', { q: 'OXBA2' }));
out.callsignAnalyst = show("q='OXBA2' as analyst (clearance 1)", await call('/api/studio/search', { q: 'OXBA2' }, 'analyst'));
out.time = show('geo + time: Positions within 10 km of Norfolk between 06:00Z and 07:00Z', await call('/api/studio/search', { types: ['Position'], geo: { lat: 36.8508, lon: -76.2859, radius: '10km' }, time: { from: '2018-01-01T06:00:00Z', to: '2018-01-01T07:00:00Z' }, size: 10 }));
out.explore = show("explore-side /api/explore/search q='anna maersk'", await call('/api/explore/search', { q: 'anna maersk', size: 5 }));
if (opt('--json')) writeFileSync(opt('--json'), JSON.stringify(out, null, 2));
if (args.includes('--serve')) console.log(`\nserving on ${base}/ (studio) and ${base}/explore ; data in ${dir}`);
else { await app.close(); process.exit(0); }
