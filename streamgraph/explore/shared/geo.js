// Geo grids (SPEC §22.3): H3 hexagons (h3-js, Apache-2.0) and MGRS squares (mgrs, MIT). Pure; used by the map bundle,
// the MCP grid_counts tool and the tests. Counts are of distinct node ids, so a node never counts twice in one grid.
import { latLngToCell, cellToBoundary, cellToLatLng, getResolution, isValidCell } from 'h3-js';
import * as mgrsNs from 'mgrs'; // CJS in Node, ESM when bundled
const M = mgrsNs.forward ? mgrsNs : mgrsNs.default;
const mgrsForward = (...a) => M.forward(...a), mgrsInverse = (...a) => M.inverse(...a);
import { geoOf, GRID_RES } from './geo-core.js';
export * from './geo-core.js';

export function clampRes(kind, res) { const r = GRID_RES[kind]; if (!r) throw new Error(`grid kind must be h3 or mgrs`); const n = Math.round(Number(res)); return Number.isFinite(n) ? Math.max(r.min, Math.min(r.max, n)) : r.default; }
/** one point -> cell id (null if the point cannot be gridded, e.g. MGRS outside 80°S-84°N) */
export function cellOf(kind, lat, lon, res) {
  if (kind === 'h3') return latLngToCell(lat, lon, res);
  if (kind === 'mgrs') { if (lat < -80 || lat > 84) return null; try { return mgrsForward([lon, lat], res); } catch { return null; } }
  throw new Error(`unknown grid kind ${kind}`);
}
/** cell -> GeoJSON Polygon ring [[lon, lat], ...] (closed). H3 rings crossing the antimeridian are unwrapped. */
export function cellPolygon(kind, cell) {
  if (kind === 'h3') {
    const ring = cellToBoundary(cell, true);
    for (let i = 1; i < ring.length; i++) { let x = ring[i][0]; while (x - ring[i - 1][0] > 180) x -= 360; while (x - ring[i - 1][0] < -180) x += 360; ring[i] = [x, ring[i][1]]; }
    return ring;
  }
  const [w, s, e, n] = mgrsInverse(cell); // the square's lat/lon bounds (edges are UTM grid lines, so this is a close rectangle)
  return [[w, s], [e, s], [e, n], [w, n], [w, s]];
}
export function cellCenter(kind, cell) {
  if (kind === 'h3') { const [lat, lon] = cellToLatLng(cell); return { lat, lon }; }
  const [w, s, e, n] = mgrsInverse(cell); return { lat: (s + n) / 2, lon: (w + e) / 2 };
}
export function validCell(kind, cell) {
  if (kind === 'h3') return typeof cell === 'string' && isValidCell(cell);
  if (kind === 'mgrs') { try { return typeof cell === 'string' && Array.isArray(mgrsInverse(cell)); } catch { return false; } }
  return false;
}
export const cellResolution = (kind, cell) => (kind === 'h3' ? getResolution(cell) : (String(cell).replace(/^\d{1,2}[C-X][A-Z]{2}/i, '').length / 2));

/**
 * Aggregate points into grid cells. points: iterable of { id, lat, lon } (or items, read with geoOf).
 * -> { kind, resolution, cells: [{ cell, count, ids }], gridded, skipped } sorted by count desc then cell id.
 */
export function aggregate(points, { kind = 'h3', resolution, idsPerCell = Infinity } = {}) {
  const res = clampRes(kind, resolution ?? GRID_RES[kind]?.default);
  const by = new Map(); let gridded = 0, skipped = 0; const seen = new Set();
  for (const p of points) {
    const g = p && Number.isFinite(p.lat) && Number.isFinite(p.lon) ? p : geoOf(p);
    const id = p?.id; if (!g || id == null || seen.has(id)) { skipped++; continue; } seen.add(id);
    const c = cellOf(kind, g.lat, g.lon, res); if (!c) { skipped++; continue; }
    let e = by.get(c); if (!e) by.set(c, e = { cell: c, count: 0, ids: [] });
    e.count++; if (e.ids.length < idsPerCell) e.ids.push(id); gridded++;
  }
  const cells = [...by.values()].sort((a, b) => b.count - a.count || (a.cell < b.cell ? -1 : 1));
  return { kind, resolution: res, cells, gridded, skipped };
}
/** grid result -> GeoJSON FeatureCollection (properties: cell, count, norm 0..1 on a log scale) */
export function gridGeoJSON(kind, cells, { heat = null } = {}) {
  const max = Math.max(1, ...cells.map(c => c.count)), hmax = heat ? Math.max(1, ...Object.values(heat)) : 1;
  return { type: 'FeatureCollection', features: cells.map((c, i) => ({ type: 'Feature', id: i, geometry: { type: 'Polygon', coordinates: [cellPolygon(kind, c.cell)] },
    properties: { cell: c.cell, count: c.count, norm: Math.log1p(c.count) / Math.log1p(max), heat: heat ? (heat[c.cell] || 0) : 0, heatNorm: heat ? Math.log1p(heat[c.cell] || 0) / Math.log1p(hmax) : 0 } })) };
}
