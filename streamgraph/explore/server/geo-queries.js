// Geo read queries (SPEC §22.6) shared by the MCP tools (nodes_in_bbox, grid_counts) and the HTTP API.
// Every result is built from the nodes the caller may read: source policy (service.view, which also drops properties
// from unreadable sources - so a position contributed only by a hidden source is not used) + StreamGraph access rules
// (ex.guard). Hidden nodes are never returned or counted. Flink stream heat (graph.geo-metrics) aggregates ALL events,
// so it is only returned to callers that may read every source and are not restricted by StreamGraph rules.
import { geo, GEO_IMPLEMENTATION } from './geo-impl.js';

export function geoQueries(ex) {
  const W = GEO_IMPLEMENTATION === 'wrong';
  const { service } = ex;
  async function visibleGeoNodes({ principal, actAs, types } = {}) {
    const out = [];
    for (const it of service.items.values()) {
      if (it.kind !== 'node' || it.deleted) continue;
      if (types?.length && !types.includes(it.type)) continue;
      const v = W ? it : service.view(it, principal); if (v) out.push(v); // GW8: wrong impl skips the source policy
    }
    const vis = W ? out : await ex.guard(out, actAs); // ... and the StreamGraph rules
    const pts = [];
    for (const n of vis) { const g = geo.geoOf(n); if (g) pts.push({ id: n.id, lat: g.lat, lon: g.lon, node: n }); }
    return pts;
  }
  function streamAllowed(principal, actAs) {
    if (W) return true;
    const srcs = Object.keys(service.access?.sources || {});
    if (!srcs.every(s => service.canReadSource(principal, s))) return false;
    return !(ex.studio?.engine && actAs) || ex.config.geo?.streamHeat === 'all-readers';
  }
  return {
    visibleGeoNodes,
    async nodesInBbox({ bbox, types = null, limit = 500, principal, actAs } = {}) {
      const b = geo.normBbox(bbox);
      const pts = (await visibleGeoNodes({ principal, actAs, types })).filter(p => geo.inBbox(p, b));
      pts.sort((x, y) => (x.id < y.id ? -1 : 1));
      return { bbox: b, count: pts.length, truncated: pts.length > limit, nodes: pts.slice(0, limit).map(p => ({ id: p.id, type: p.node.type, label: p.node.label, lat: p.lat, lon: p.lon, properties: p.node.properties, ...(p.node.eventTime ? { eventTime: p.node.eventTime } : {}) })) };
    },
    async gridCounts({ kind = 'h3', resolution, bbox = null, types = null, limit = 500, idsPerCell = 0, includeStream = false, principal, actAs } = {}) {
      let pts = await visibleGeoNodes({ principal, actAs, types });
      const b = bbox ? geo.normBbox(bbox) : null; if (b) pts = pts.filter(p => geo.inBbox(p, b));
      const r = geo.aggregate(pts, { kind, resolution, idsPerCell: idsPerCell || 0 });
      const out = { kind: r.kind, resolution: r.resolution, ...(b ? { bbox: b } : {}), points: r.gridded, skipped: r.skipped, cellCount: r.cells.length, truncated: r.cells.length > limit,
        cells: r.cells.slice(0, limit).map(c => ({ cell: c.cell, count: c.count, center: geo.cellCenter(kind, c.cell), ...(idsPerCell ? { ids: c.ids } : {}) })) };
      if (includeStream) {
        const store = ex.processor?.store;
        if (!store?.geoEnabled) out.stream = { available: false, reason: 'Flink geo metrics are off (processor.geo.enabled)' };
        else if (!streamAllowed(principal, actAs)) out.stream = { available: false, reason: 'withheld: stream counts aggregate sources or types you may not read' };
        else out.stream = { available: true, ...store.geoCounts({ kind }) };
      }
      return out;
    },
  };
}
