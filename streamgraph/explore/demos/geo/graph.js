// Geo demo graph builder: USGS earthquakes (public domain) + Natural Earth places / countries (public domain).
//   Earthquake -NEAR-> Place (nearest populated place within maxKm)   Place -IN-> Country
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { haversineM } from '../../shared/geo-core.js';
export const GEO_DIR = dirname(fileURLToPath(import.meta.url));
export const loadGeoFixture = () => JSON.parse(readFileSync(join(GEO_DIR, 'fixture.json'), 'utf8'));
export const SOURCE = 'usgs';
export const magBand = m => (m >= 6 ? 'M6+' : m >= 5 ? 'M5-6' : m >= 4 ? 'M4-5' : 'M2.5-4');

/** -> { nodes, links, meta }  (items for StreamProducer.push; eventTime on each) */
export function buildGeoGraph(fx = loadGeoFixture(), { since = null, limit = Infinity, maxKm = 300 } = {}) {
  const t0 = since ? Date.parse(since) : -Infinity;
  const quakes = fx.quakes.filter(q => q[1] >= t0).slice(-limit);
  const base = new Date(Math.min(...quakes.map(q => q[1])) - 86400e3).toISOString(); // reference nodes exist before any quake
  const places = fx.places.map(p => ({ id: `ne:place:${p[0]}`, name: p[1], lat: p[2], lon: p[3], a3: p[4], country: p[5], pop: p[6], capital: !!p[7] }));
  const countries = new Map(fx.countries.map(c => [c[0], { id: `ne:country:${c[0]}`, a3: c[0], name: c[1], lat: c[2], lon: c[3], continent: c[4] }]));
  const usedPlaces = new Map(), nodes = [], links = [];
  for (const q of quakes) {
    const [id, t, lat, lon, depthKm, mag, magType, place, tsunami, status, type] = q, eventTime = new Date(t).toISOString();
    nodes.push({ id: `usgs:${id}`, type: 'Earthquake', label: `M${mag?.toFixed?.(1) ?? mag} ${place}`.trim(), eventTime,
      properties: { lat, lon, mag, magBand: magBand(mag), depthKm, magType, place, time: eventTime, tsunami: !!tsunami, status, eventType: type, url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}` } });
    let best = null, bd = Infinity; for (const p of places) { const d = haversineM({ lat, lon }, p); if (d < bd) { bd = d; best = p; } }
    if (best && bd <= maxKm * 1000) { usedPlaces.set(best.id, best); links.push({ id: `near:${id}`, type: 'NEAR', fromId: `usgs:${id}`, toId: best.id, eventTime, properties: { distanceKm: Math.round(bd / 100) / 10 } }); }
  }
  const usedCountries = new Map();
  for (const p of usedPlaces.values()) {
    nodes.push({ id: p.id, type: 'Place', label: p.name, eventTime: base, properties: { lat: p.lat, lon: p.lon, country: p.country, popMax: p.pop, capital: p.capital } });
    const c = countries.get(p.a3); if (c) { usedCountries.set(c.id, c); links.push({ id: `in:${p.id}`, type: 'IN', fromId: p.id, toId: c.id, eventTime: base, properties: {} }); }
  }
  for (const c of usedCountries.values()) nodes.push({ id: c.id, type: 'Country', label: c.name, eventTime: base, properties: { lat: c.lat, lon: c.lon, a3: c.a3, continent: c.continent } });
  return { nodes, links, meta: fx.meta };
}
/** push through the §6 contract as source "usgs" (Earthquakes keep their own event time) */
export async function ingestGeo(ex, g, { batch = 0, pauseMs = 0 } = {}) {
  const p = ex.producer(SOURCE);
  const push = it => p.push(it.fromId ? 'link.upsert' : 'node.upsert', { id: it.id, type: it.type, label: it.label, properties: it.properties, ...(it.fromId ? { fromId: it.fromId, toId: it.toId } : {}) }, { eventTime: it.eventTime });
  const ref = g.nodes.filter(n => n.type !== 'Earthquake'), refLinks = g.links.filter(l => l.type === 'IN');
  for (const it of [...ref, ...refLinks]) push(it);
  await p.flush();
  const q = g.nodes.filter(n => n.type === 'Earthquake'), near = new Map(g.links.filter(l => l.type === 'NEAR').map(l => [l.fromId, l]));
  const step = batch || q.length;
  for (let i = 0; i < q.length; i += step) {
    for (const n of q.slice(i, i + step)) { push(n); const l = near.get(n.id); if (l) push(l); }
    await p.flush(); if (pauseMs) await new Promise(r => setTimeout(r, pauseMs));
  }
}
