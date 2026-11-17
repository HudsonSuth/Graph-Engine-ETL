// Map viewer + geo grids (SPEC §22): positions, projection, H3 / MGRS aggregation against independent reference values,
// arcs, bbox, the MCP tools nodes_in_bbox / grid_counts with access rules, and the HTTP API.
// GEO_IMPL=wrong swaps in the deliberately wrong helpers; most of these must then fail (geo-wrong run in proof:geo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createExplore, loadConfig } from '../server/app.js';
import { buildMcpServer } from '../server/mcp-server.js';
import { resultJson } from '../server/connectors/mcp.js';
import { geo } from '../server/geo-impl.js';

// Reference values computed independently (Python `mgrs` = NGA GeoTrans C code; Python `h3` = Uber H3 C library), not by
// the JS libraries under test: [lat, lon, MGRS p0, p1, p2, p5, H3 r5, H3 r8]
const REF = [
  [38.8895, -77.0353, '18SUJ', '18SUJ20', '18SUJ2306', '18SUJ2347806483', '852aa847fffffff', '882aa845a3fffff'], // Washington Monument
  [51.5007, -0.1246, '30UXC', '30UXC90', '30UXC9909', '30UXC9956709427', '85194ad3fffffff', '88194ad14dfffff'], // Westminster
  [-33.8568, 151.2153, '56HLH', '56HLH35', '56HLH3452', '56HLH3490052288', '85be0e37fffffff', '88be0e35c1fffff'], // Sydney Opera House
  [35.6586, 139.7454, '54SUE', '54SUE84', '54SUE8646', '54SUE8643746808', '852f5aaffffffff', '882f5aadc7fffff'], // Tokyo Tower
  [64.1466, -21.9426, '27WVM', '27WVM51', '27WVM5413', '27WVM5413813689', '85075dd7fffffff', '88075dd4bdfffff'], // Reykjavik
  [-0.0001, 0.0001, '31MAV', '31MAV69', '31MAV6699', '31MAV6603299988', '85754e67fffffff', '88754e6499fffff'], // just S of the equator
  [60.0, 5.0, '32VKM', '32VKM75', '32VKM7658', '32VKM7697958157', '850981dbfffffff', '880981d969fffff'], // Norway zone 32V exception
  [72.5, 20.0, '33XXA', '33XXA65', '33XXA6751', '33XXA6764251686', '850128d7fffffff', '880128d553fffff'], // Svalbard band X
];

test('G1 positions: lat/lon, latitude/longitude, strings, GeoJSON geometry; junk rejected', () => {
  assert.deepEqual(geo.geoOf({ properties: { lat: 38.9, lon: -77 } }), { lat: 38.9, lon: -77 });
  assert.deepEqual(geo.geoOf({ properties: { latitude: '51.5', longitude: '-0.12' } }), { lat: 51.5, lon: -0.12 });
  assert.deepEqual(geo.geoOf({ properties: { geometry: { type: 'Point', coordinates: [151.2, -33.9] } } }), { lat: -33.9, lon: 151.2 });
  const poly = geo.geoOf({ properties: { geometry: { type: 'Polygon', coordinates: [[[10, 40], [12, 40], [12, 44], [10, 44], [10, 40]]] } } });
  assert.equal(poly.lat, 42); assert.equal(poly.lon, 11);
  for (const bad of [{ lat: 91, lon: 0 }, { lat: 'x', lon: 1 }, { lat: 10 }, {}, { geometry: 'nope' }]) assert.equal(geo.geoOf({ properties: bad }), null, JSON.stringify(bad));
});

test('G2 projection: Web Mercator placement matches the OSM slippy-tile formula', () => {
  const tile = (lon, lat, z) => [Math.floor(((lon + 180) / 360) * 2 ** z), Math.floor(((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z)];
  assert.deepEqual(geo.mercator(0, 0), [0.5, 0.5]);
  for (const [lat, lon] of REF.map(r => r.slice(0, 2))) for (const z of [3, 10, 16]) {
    const [x, y] = geo.mercator(lon, lat);
    assert.deepEqual([Math.floor(x * 2 ** z), Math.floor(y * 2 ** z)], tile(lon, lat, z), `${lat},${lon} z${z}`);
  }
  assert.ok(Math.abs(geo.mercator(0, 85.0511287798)[1]) < 1e-9, 'top of the Mercator square');
});

test('G3 H3 cells match the H3 C library for known coordinates', () => {
  for (const r of REF) { assert.equal(geo.cellOf('h3', r[0], r[1], 5), r[6], `r5 ${r[0]},${r[1]}`); assert.equal(geo.cellOf('h3', r[0], r[1], 8), r[7], `r8 ${r[0]},${r[1]}`); }
  assert.equal(geo.cellOf('h3', 37.775938728915946, -122.41795063018799, 9), '8928308280fffff'); // H3 documentation example
});

test('G4 MGRS squares match GeoTrans (incl. the Norway/Svalbard exceptions); polar points are not gridded', () => {
  for (const r of REF) [0, 1, 2, 5].forEach((p, i) => assert.equal(geo.cellOf('mgrs', r[0], r[1], p), r[2 + i], `p${p} ${r[0]},${r[1]}`));
  assert.equal(geo.cellOf('mgrs', 85, 0, 1), null);
  const ring = geo.cellPolygon('mgrs', '18SUJ20'); // the 10 km square contains its point
  const [w, s] = ring[0], [e, n] = ring[2];
  assert.ok(w <= -77.0353 && e >= -77.0353 && s <= 38.8895 && n >= 38.8895, JSON.stringify(ring));
  assert.ok(e - w > 0.1 && e - w < 0.13, 'a 10 km square is ~0.115° wide at 39°N');
});

test('G5 aggregation: counts distinct nodes per cell, ids for cell-click selection, resolution changes cells', () => {
  const pts = [];
  REF.forEach((r, i) => { for (let k = 0; k < i + 1; k++) pts.push({ id: `p${i}-${k}`, lat: r[0] + k * 1e-5, lon: r[1] + k * 1e-5 }); });
  pts.push({ ...pts[0] }); // the same node twice (e.g. a duplicate read) must count once
  pts.push({ id: 'pole', lat: 89, lon: 0 });
  const h = geo.aggregate(pts, { kind: 'h3', resolution: 5 });
  assert.equal(h.resolution, 5);
  assert.equal(h.cells.length, 9); assert.equal(h.gridded, 37);
  REF.forEach((r, i) => { const c = h.cells.find(x => x.cell === r[6]); assert.ok(c, r[6]); assert.equal(c.count, i + 1); assert.deepEqual(c.ids.sort(), Array.from({ length: i + 1 }, (_, k) => `p${i}-${k}`).sort()); });
  assert.equal(h.cells[0].count, 8, 'sorted by count');
  const m = geo.aggregate(pts, { kind: 'mgrs', resolution: 1 });
  assert.equal(m.skipped, 2, 'duplicate + polar point'); assert.equal(m.cells.length, 8);
  REF.forEach((r, i) => assert.equal(m.cells.find(x => x.cell === r[3])?.count, i + 1, r[3]));
  const coarse = geo.aggregate(pts, { kind: 'h3', resolution: 0 });
  assert.ok(coarse.cells.every(c => geo.cellResolution('h3', c.cell) === 0));
  const fc = geo.gridGeoJSON('h3', h.cells);
  assert.equal(fc.features.length, 9); assert.equal(fc.features[0].properties.norm, 1);
  assert.equal(fc.features[0].geometry.coordinates[0].length, 7, 'hexagon ring closed (6 + 1)');
});

test('G6 bbox: inclusive edges, antimeridian-crossing boxes, validation', () => {
  const b = geo.normBbox([-78, 38, -76, 40]);
  assert.ok(geo.inBbox({ lat: 38.8895, lon: -77.0353 }, b)); assert.ok(!geo.inBbox({ lat: 51.5, lon: -0.12 }, b)); assert.ok(geo.inBbox({ lat: 38, lon: -78 }, b));
  const fiji = geo.normBbox([170, -25, -170, -10]); // crosses 180°
  assert.ok(geo.inBbox({ lat: -18, lon: 178.4 }, fiji)); assert.ok(geo.inBbox({ lat: -18, lon: -179.9 }, fiji)); assert.ok(!geo.inBbox({ lat: -18, lon: 0 }, fiji));
  assert.throws(() => geo.normBbox([0, 0, 1])); assert.throws(() => geo.normBbox([0, -95, 1, 0]));
});

test('G7 links are arcs: great-circle with a bow, continuous across the antimeridian', () => {
  const a = { lat: 35, lon: 170 }, b = { lat: 40, lon: -170 }, pts = geo.arc(a, b, { steps: 20 });
  assert.equal(pts.length, 21);
  for (let i = 1; i < pts.length; i++) assert.ok(Math.abs(pts[i][0] - pts[i - 1][0]) < 10, 'no jump across the map');
  assert.ok(Math.abs(pts.at(-1)[0] - 190) < 1e-6, 'end unwrapped to 190° (= -170°)');
  const nyc = { lat: 40.7, lon: -74 }, lon = { lat: 51.5, lon: -0.12 }, p = geo.arc(nyc, lon, { steps: 20, bow: 0 });
  assert.ok(p[10][1] > 51.5, 'great circle NYC-London bulges north of both ends');
  const q = geo.arc({ lat: 0, lon: 0 }, { lat: 0, lon: 10 }, { steps: 10, bow: 0.12 });
  assert.ok(Math.abs(q[5][1]) > 1, 'bow lifts the mid-point off the straight line');
});

// ---------------------------------------------------------------- MCP + HTTP with access rules
const cfgWith = (over = {}) => { const b = loadConfig(join(tmpdir(), 'no-such-explore-config.json')); return { ...b, ...over, access: { ...b.access, ...(over.access || {}) }, mcp: { ...b.mcp, ...(over.mcp || {}) } }; };
const studio = { engine: { subject: id => (id === 'owner' ? { id } : null), decide: async ({ entity }) => ({ allow: entity !== 'Secret' }), maskProps: (s, t, props) => ({ props }) } };
async function seeded() {
  const ex = await createExplore({ config: cfgWith({ streams: ['external', 'hr'], access: { sources: { hr: { read: ['role:hr'] } } } }), studio, log: null });
  const p = ex.producer('external');
  REF.forEach((r, i) => p.push('node.upsert', { id: `pt${i}`, type: 'Place', label: `P${i}`, properties: { lat: r[0], lon: r[1] } }));
  p.push('node.upsert', { id: 'fiji', type: 'Place', label: 'Suva', properties: { lat: -18.14, lon: 178.44 } });
  p.push('node.upsert', { id: 'nopos', type: 'Place', label: 'no position', properties: {} });
  p.push('link.upsert', { id: 'l0', type: 'NEAR', fromId: 'pt0', toId: 'pt1', properties: {} });
  await p.flush();
  const hr = ex.producer('hr'); hr.push('node.upsert', { id: 'hr:office', type: 'Office', label: 'HR office', properties: { lat: 38.8896, lon: -77.0354 } }); await hr.flush();
  const sg = ex.producer('streamgraph'); sg.push('node.upsert', { id: 'sg:node:Secret:x', type: 'Secret', label: 'Vault', properties: { lat: 38.8897, lon: -77.0352 } }); await sg.flush();
  return ex;
}
async function mcp(ex) { const s = buildMcpServer(ex), [a, b] = InMemoryTransport.createLinkedPair(); await s.connect(a); const c = new Client({ name: 't', version: '1' }); await c.connect(b); return c; }
const call = async (c, name, args) => resultJson(await c.callTool({ name, arguments: args }));

test('G8 MCP nodes_in_bbox: only visible nodes (source policy + StreamGraph rules), antimeridian bbox', async () => {
  const ex = await seeded(), c = await mcp(ex);
  const dc = await call(c, 'nodes_in_bbox', { bbox: [-78, 38, -76, 40] });
  assert.deepEqual(dc.nodes.map(n => n.id), ['pt0'], 'hr:office (role:hr source) and the Secret (ABAC) are hidden');
  assert.equal(dc.count, 1); assert.equal(dc.nodes[0].lat, 38.8895);
  const pac = await call(c, 'nodes_in_bbox', { bbox: [170, -25, -170, -10] });
  assert.deepEqual(pac.nodes.map(n => n.id), ['fiji']);
  const world = await call(c, 'nodes_in_bbox', { bbox: [-180, -90, 180, 90], limit: 3 });
  assert.equal(world.count, 9); assert.equal(world.nodes.length, 3); assert.equal(world.truncated, true);
  const bad = await c.callTool({ name: 'nodes_in_bbox', arguments: { bbox: [0, -95, 1, 0] } }); assert.equal(bad.isError, true);
  await c.close(); await ex.close();
});

test('G9 MCP grid_counts: H3 and MGRS counts of visible nodes only, ids on request, stream heat gated', async () => {
  const ex = await seeded(), c = await mcp(ex);
  const h = await call(c, 'grid_counts', { kind: 'h3', resolution: 5, idsPerCell: 10 });
  assert.equal(h.points, 9); assert.equal(h.cellCount, 9);
  const dc = h.cells.find(x => x.cell === REF[0][6]); assert.equal(dc.count, 1, 'hidden nodes in the same cell are not counted'); assert.deepEqual(dc.ids, ['pt0']);
  const m = await call(c, 'grid_counts', { kind: 'mgrs', resolution: 0, bbox: [-78, 38, -76, 40] });
  assert.deepEqual(m.cells.map(x => [x.cell, x.count]), [['18SUJ', 1]]);
  const s = await call(c, 'grid_counts', { kind: 'h3', includeStream: true });
  assert.equal(s.stream.available, false);
  await c.close(); await ex.close();
});

test('G10 HTTP /api/explore/geo: config (attribution, offline data), bbox and grid as the UI principal', async () => {
  const ex = await seeded();
  const http = async path => { let code, out = ''; const res = { headersSent: false, writeHead(c) { code = c; this.headersSent = true; }, end(b) { out = b; } }; await ex.handle({ method: 'GET', headers: {} }, res, new URL('http://x' + path)); return { code, body: JSON.parse(out) }; };
  const cfg = await http('/api/explore/geo/config');
  assert.equal(cfg.code, 200); assert.match(cfg.body.attribution, /OpenStreetMap/); assert.match(cfg.body.offlineAttribution, /Natural Earth/); assert.ok(cfg.body.styleUrl.startsWith('https://'));
  assert.ok(!/tile\.openstreetmap\.org/.test(cfg.body.styleUrl), 'never the OSM Foundation tile servers by default');
  // INTEGRATION CHANGE: the UI always acts as a StreamGraph user (the owner, or the "Test as" user). With no such user the
  // StreamGraph items are left out (fail closed); before the integration this test expected 'sg:node:Secret:x' to be returned.
  const b = await http('/api/explore/geo/bbox?bbox=-78,38,-76,40'); assert.deepEqual(b.body.nodes.map(n => n.id), ['pt0'], 'hr:office (role:hr) hidden, StreamGraph items need a StreamGraph user');
  const g = await http('/api/explore/geo/grid?kind=h3&res=8'); assert.equal(g.body.points, 9, 'the StreamGraph point is left out (no StreamGraph user)'); assert.ok(g.body.cells.some(x => x.cell === REF[3][7]));
  await ex.close();
});

test('G11 incident export loader (for a licensed D-Fend export): CSV parsing, column mapping, invalid rows skipped, ingest', async () => {
  const { parseCsv, mapIncidents, toBatch } = await import('../demos/geo/import-incidents.mjs');
  const { loadGeoFixture } = await import('../demos/geo/graph.js');
  // no invented incidents: the rows are real USGS events (public domain) written in an export-like CSV layout
  const q = loadGeoFixture().quakes.slice(-5);
  const esc = v => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const rows = q.map(r => ['usgs-' + r[0], new Date(r[1]).toISOString(), r[2], r[3], r[7], r[6], r[7].split(', ').at(-1)]);
  rows.push(['no-pos', '2026-10-01T00:00:00Z', '', '', 'x', 'y', 'z'], ['bad-date', 'not a date', 10, 10, 'x', 'y', 'z']);
  const csv = ['Incident ID,Date,Latitude,Longitude,Location,Type,Country', ...rows.map(r => r.map(esc).join(','))].join('\r\n');
  const recs = parseCsv(csv); assert.equal(recs.length, 7); assert.equal(recs[0].Location, q[0][7], 'quoted field with a comma survives');
  const g = mapIncidents(recs, { source: 'incidents', attribution: 'USGS (public domain)' });
  assert.deepEqual(g.skipped.map(s => s.reason), ['no valid lat/lon', 'no valid date']);
  const inc = g.nodes.filter(n => n.type === 'Incident'); assert.equal(inc.length, 5);
  assert.equal(inc[0].properties.lat, q[0][2]); assert.equal(inc[0].eventTime, new Date(q[0][1]).toISOString());
  assert.ok(g.links.some(l => l.type === 'OF_TYPE') && g.links.some(l => l.type === 'IN'));
  const b = loadConfig(join(tmpdir(), 'no-such-explore-config.json'));
  const ex = await createExplore({ config: { ...b, streams: ['incidents'] }, log: null });
  let code; const res = { headersSent: false, writeHead(c) { code = c; this.headersSent = true; }, end() {} };
  const body = JSON.stringify(toBatch(g, 'incidents'));
  const req = { method: 'POST', headers: {}, on(ev, f) { if (ev === 'data') setImmediate(() => f(Buffer.from(body))); if (ev === 'end') setImmediate(() => setImmediate(f)); return this; } };
  await ex.handle(req, res, new URL('http://x/api/explore/ingest')); assert.equal(code, 200);
  const r = await ex.geoQueries.nodesInBbox({ bbox: [-180, -90, 180, 90], types: ['Incident'], principal: ex.config.principal });
  assert.equal(r.count, 5);
  await ex.close();
});
