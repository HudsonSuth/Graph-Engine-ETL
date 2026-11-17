// DELIBERATELY WRONG geo implementation (SPEC §22.8). Selected only with GEO_IMPL=wrong (server, MCP tools, tests).
//   GW1 geoOf swaps latitude and longitude          GW2 bbox ignores antimeridian-crossing boxes (west > east)
//   GW3 H3 aggregation one resolution too coarse     GW4 no per-node dedupe (a node counted once per occurrence)
//   GW5 MGRS truncated to the 100 km square           GW6 mercator uses linear latitude (equirectangular)
//   GW7 links drawn as straight 2-point lines         GW8 MCP geo tools skip access rules (see geo-queries.js)
import * as real from './geo.js';
export * from './geo.js';
export const WRONG = true;
export function geoOf(it) { const g = real.geoOf(it); return g ? { ...g, lat: Math.max(-90, Math.min(90, g.lon)), lon: g.lat } : null; }
export function inBbox({ lat, lon }, [w, s, e, n]) { return lat >= s && lat <= n && lon >= w && lon <= e; }
export function cellOf(kind, lat, lon, res) { return real.cellOf(kind, lat, lon, kind === 'h3' ? Math.max(0, res - 1) : 0); }
export function mercator(lon, lat) { return [(lon + 180) / 360, 0.5 - lat / 180]; }
export function arc(a, b) { return [[a.lon, a.lat], [b.lon, b.lat]]; }
export function aggregate(points, { kind = 'h3', resolution, idsPerCell = Infinity } = {}) {
  const res = real.clampRes(kind, resolution ?? 3), by = new Map(); let gridded = 0, skipped = 0;
  for (const p of points) {
    const g = p && Number.isFinite(p.lat) && Number.isFinite(p.lon) ? p : geoOf(p); if (!g) { skipped++; continue; }
    const c = cellOf(kind, g.lat, g.lon, res); if (!c) { skipped++; continue; }
    let e = by.get(c); if (!e) by.set(c, e = { cell: c, count: 0, ids: [] }); e.count++; if (e.ids.length < idsPerCell) e.ids.push(p.id); gridded++;
  }
  return { kind, resolution: res, cells: [...by.values()].sort((a, b) => b.count - a.count), gridded, skipped };
}
