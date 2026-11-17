// Builds the geo demo fixture from two openly licensed sources (no scraping, no invented data):
//   USGS ANSS ComCat earthquakes, FDSN event web service (U.S. public domain, https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits)
//   Natural Earth 1:50m populated places + 1:110m countries (public domain, https://www.naturalearthdata.com/about/terms-of-use/)
// Writes fixture.json (compact): the most recent 10,000 M2.5+ earthquakes up to the end date, plus places and countries.
//   node explore/demos/geo/fetch.mjs [--end 2026-11-01] [--start 2026-04-01]
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const start = arg('--start', '2026-04-01'), end = arg('--end', '2026-11-01'), N = Number(arg('--max', 10000));
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&endtime=${end}&minmagnitude=2.5&orderby=time-asc`;
const get = async u => { const r = await fetch(u, { headers: { 'user-agent': 'streamgraph-explore-geo-demo/1.0 (fixture builder)' } }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
console.log('fetching', usgsUrl);
const q = await get(usgsUrl);
const places = await get(`${NE}/ne_50m_populated_places_simple.geojson`), countries = await get(`${NE}/ne_110m_admin_0_countries.geojson`);
const r6 = x => Math.round(x * 1e5) / 1e5;
const quakes = q.features.slice(-N).map(f => { const p = f.properties, [lon, lat, depth] = f.geometry.coordinates;
  return [f.id, p.time, r6(lat), r6(lon), Math.round((depth ?? 0) * 10) / 10, p.mag, p.magType, p.place || '', p.tsunami || 0, p.status, p.type]; });
const pl = places.features.map(f => { const p = f.properties; return [p.ne_id ?? p.name, p.name, r6(p.latitude), r6(p.longitude), p.adm0_a3, p.adm0name, p.pop_max, p.adm0cap ? 1 : 0]; });
const co = countries.features.map(f => { const p = f.properties; return [p.ADM0_A3, p.NAME, r6(p.LABEL_Y), r6(p.LABEL_X), p.CONTINENT]; });
const meta = { builtAt: new Date().toISOString(), counts: { quakes: quakes.length, places: pl.length, countries: co.length },
  sources: [
    { name: 'USGS ANSS Comprehensive Earthquake Catalog (ComCat), M2.5+', url: usgsUrl, license: 'U.S. Public Domain (USGS-authored data)', generated: new Date(q.metadata.generated).toISOString(), count: q.metadata.count },
    { name: 'Natural Earth 1:50m Populated Places (simple)', url: `${NE}/ne_50m_populated_places_simple.geojson`, license: 'Public domain (Natural Earth)' },
    { name: 'Natural Earth 1:110m Admin 0 Countries (label points)', url: `${NE}/ne_110m_admin_0_countries.geojson`, license: 'Public domain (Natural Earth)' }],
  columns: { quakes: ['id', 'timeMs', 'lat', 'lon', 'depthKm', 'mag', 'magType', 'place', 'tsunami', 'status', 'type'], places: ['id', 'name', 'lat', 'lon', 'adm0_a3', 'country', 'popMax', 'capital'], countries: ['a3', 'name', 'lat', 'lon', 'continent'] } };
writeFileSync(join(DIR, 'fixture.json'), JSON.stringify({ meta, quakes, places: pl, countries: co }));
console.log('wrote fixture.json', meta.counts);
