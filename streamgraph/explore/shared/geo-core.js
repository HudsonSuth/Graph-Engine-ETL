// Geo core (SPEC §22): dependency-free helpers shared by the server, MCP tools, tests and the browser.
// A node is "geo" when it carries a WGS84 position: properties lat/lon (or latitude/longitude, lng), or a GeoJSON
// geometry (properties.geometry or item.geometry). Non-point geometries are placed at their bbox centre.
const num = v => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
const okLat = v => Number.isFinite(v) && v >= -90 && v <= 90, okLon = v => Number.isFinite(v) && v >= -180 && v <= 180;
export const LAT_KEYS = ['lat', 'latitude', 'y_lat'], LON_KEYS = ['lon', 'lng', 'long', 'longitude', 'x_lon'];

/** GeoJSON geometry -> [minLon, minLat, maxLon, maxLat] or null */
export function geometryBbox(g) {
  if (!g || typeof g !== 'object') return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const walk = c => { if (!Array.isArray(c)) return; if (typeof c[0] === 'number') { const x = num(c[0]), y = num(c[1]); if (okLon(x) && okLat(y)) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); } return; } c.forEach(walk); };
  if (g.type === 'GeometryCollection') for (const x of g.geometries || []) { const b = geometryBbox(x); if (b) { w = Math.min(w, b[0]); s = Math.min(s, b[1]); e = Math.max(e, b[2]); n = Math.max(n, b[3]); } }
  else walk(g.coordinates);
  return w === Infinity ? null : [w, s, e, n];
}

/** item -> { lat, lon, geometry? } or null. Never throws. */
export function geoOf(it) {
  const p = it?.properties || {};
  let lat = NaN, lon = NaN;
  for (const k of LAT_KEYS) if (p[k] != null) { lat = num(p[k]); break; }
  for (const k of LON_KEYS) if (p[k] != null) { lon = num(p[k]); break; }
  if (okLat(lat) && okLon(lon)) return { lat, lon };
  let g = p.geometry ?? it?.geometry;
  if (typeof g === 'string') { try { g = JSON.parse(g); } catch { g = null; } }
  if (g && g.type === 'Point' && Array.isArray(g.coordinates)) { const x = num(g.coordinates[0]), y = num(g.coordinates[1]); return okLat(y) && okLon(x) ? { lat: y, lon: x } : null; }
  const b = geometryBbox(g);
  return b ? { lat: (b[1] + b[3]) / 2, lon: (b[0] + b[2]) / 2, geometry: g } : null;
}

/** bbox [west, south, east, north]; west > east means the box crosses the antimeridian */
export function normBbox(b) {
  if (!Array.isArray(b) || b.length !== 4 || !b.every(Number.isFinite)) throw new Error('bbox must be [west, south, east, north] in degrees');
  let [w, s, e, n] = b; if (s > n) [s, n] = [n, s];
  if (s < -90 || n > 90) throw new Error('bbox latitude out of range');
  const wrap = x => ((((x + 180) % 360) + 360) % 360) - 180;
  if (e - w >= 360) return [-180, s, 180, n];
  return [w === 180 ? 180 : wrap(w), s, e === 180 ? 180 : wrap(e), n];
}
export function inBbox({ lat, lon }, b) {
  const [w, s, e, n] = b;
  if (lat < s || lat > n) return false;
  return w <= e ? lon >= w && lon <= e : lon >= w || lon <= e; // crosses the antimeridian
}

/** Web Mercator (EPSG:3857) normalised to [0,1] x [0,1] (x east, y south), as MapLibre/OSM tiles use. */
export function mercator(lon, lat) {
  const s = Math.sin((Math.max(-85.0511287798, Math.min(85.0511287798, lat)) * Math.PI) / 180);
  return [(lon + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)];
}
const R = 6371008.8;
export function haversineM(a, b) {
  const r = Math.PI / 180, dφ = (b.lat - a.lat) * r, dλ = (b.lon - a.lon) * r;
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
/**
 * Link geometry: great-circle path a -> b with a sideways bow (so parallel/short links read as arcs), longitudes unwrapped
 * so a path over the antimeridian stays continuous (MapLibre draws lon > 180 on the next world copy). [[lon, lat], ...]
 */
export function arc(a, b, { steps = 24, bow = 0.12 } = {}) {
  const r = Math.PI / 180, d = Math.PI / 180;
  const v = p => [Math.cos(p.lat * r) * Math.cos(p.lon * r), Math.cos(p.lat * r) * Math.sin(p.lon * r), Math.sin(p.lat * r)];
  const A = v(a), B = v(b), dot = Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])), om = Math.acos(dot);
  if (om < 1e-9) return [[a.lon, a.lat], [b.lon, b.lat]];
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, k1 = Math.sin((1 - t) * om) / Math.sin(om), k2 = Math.sin(t * om) / Math.sin(om);
    const P = [k1 * A[0] + k2 * B[0], k1 * A[1] + k2 * B[1], k1 * A[2] + k2 * B[2]];
    pts.push([Math.atan2(P[1], P[0]) / d, Math.atan2(P[2], Math.hypot(P[0], P[1])) / d]);
  }
  for (let i = 1; i < pts.length; i++) { let x = pts[i][0]; while (x - pts[i - 1][0] > 180) x -= 360; while (x - pts[i - 1][0] < -180) x += 360; pts[i][0] = x; }
  if (bow) { // perpendicular offset in (unwrapped) lon/lat, largest mid-way, proportional to the path length
    const [x0, y0] = pts[0], [x1, y1] = pts.at(-1), L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    for (let i = 1; i < pts.length - 1; i++) { const t = i / steps, o = Math.sin(Math.PI * t) * bow * L; pts[i] = [pts[i][0] + nx * o, Math.max(-89.9, Math.min(89.9, pts[i][1] + ny * o))]; }
  }
  return pts;
}
export const GRID_KINDS = ['none', 'h3', 'mgrs'];
/** resolution ranges for the UI slider: H3 0-10, MGRS precision digits 0 (100 km) - 4 (10 m) */
export const GRID_RES = { h3: { min: 0, max: 10, default: 3 }, mgrs: { min: 0, max: 4, default: 0 } };
export const mgrsCellMeters = p => 10 ** (5 - p);
