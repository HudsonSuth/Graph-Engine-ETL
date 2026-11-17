// Access-filtered ER queries shared by the HTTP API and the MCP tools (SPEC §21.6). They read the derived items from the
// graph service, so they work on every instance (also Kafka read replicas without the ER worker) and every result passes
// the same source policy + StreamGraph access rules as any other read. why_matched adds the engine's full comparison when
// this instance runs the engine (also for pairs that were never scored as candidates).
const round = x => (x == null ? x : Math.round(x * 10000) / 10000);

export function erQueries(ex) {
  const c = () => ex.er?.config || { sourceId: 'er', resolvesType: 'RESOLVES_TO', possibleType: 'POSSIBLY_SAME', entityType: 'Entity' };
  const svc = ex.service;
  const visible = async (items, principal, actAs) => ex.guard(items.map(it => svc.view(it, principal)).filter(Boolean), actAs);
  const one = async (id, principal, actAs) => { const it = svc.live(id); if (!it) return null; return (await visible([it], principal, actAs))[0] || null; };
  const incident = (id, type) => svc.incidentLinks(id).filter(l => l.type === type);

  async function entityIdFor(id) {
    const it = svc.live(id);
    if (it?.type === c().entityType) return { entityId: id };
    if (it) { const l = svc.live(`${c().sourceId}:rt:${id}`); return l ? { entityId: l.toId, viaRecord: id } : null; }
    const red = ex.er?.engine?.entityOf(id); // a retired entity id: follow the merge redirect
    return red && red !== id ? { entityId: red, redirectedFrom: id } : null;
  }
  async function resolveEntity(id, { principal, actAs, maxRecords = 200 } = {}) {
    const r = await entityIdFor(id); if (!r) return { error: `no resolved entity for ${id} (not a record or not visible)` };
    const ent = await one(r.entityId, principal, actAs); if (!ent) return { error: `no resolved entity for ${id} (not a record or not visible)` };
    const rts = await visible(incident(ent.id, c().resolvesType), principal, actAs);
    const recs = await visible(rts.map(l => svc.live(l.fromId)).filter(Boolean), principal, actAs);
    const byId = new Map(recs.map(x => [x.id, x]));
    const records = rts.filter(l => byId.has(l.fromId)).map(l => ({ id: l.fromId, label: byId.get(l.fromId).label, type: byId.get(l.fromId).type, dataSource: l.properties.dataSource, recordId: l.properties.recordId,
      score: l.properties.score, matchKey: l.properties.matchKey, matchedWith: byId.has(l.properties.matchedWith) ? l.properties.matchedWith : null, why: byId.has(l.properties.matchedWith) ? l.properties.why : [] }))
      .sort((a, b) => (a.dataSource + a.recordId).localeCompare(b.dataSource + b.recordId)).slice(0, maxRecords);
    const ps = await visible(incident(ent.id, c().possibleType), principal, actAs);
    const possible = ps.map(l => ({ entityId: l.fromId === ent.id ? l.toId : l.fromId, label: svc.live(l.fromId === ent.id ? l.toId : l.fromId)?.label, score: l.properties.score, matchKey: l.properties.matchKey, recordA: l.properties.recordA, recordB: l.properties.recordB }))
      .sort((a, b) => b.score - a.score);
    const history = (ex.er?.engine?.history || []).filter(h => h.entityId === ent.id).slice(-10);
    return { entity: { id: ent.id, label: ent.label, entityType: ent.properties.entityType, recordCount: records.length, dataSources: [...new Set(records.map(x => x.dataSource))].sort(), features: ent.properties.features, resolution: ent.properties.resolution, engine: ent.properties.engine },
      ...(r.redirectedFrom ? { redirectedFrom: r.redirectedFrom } : {}), ...(r.viaRecord ? { viaRecord: r.viaRecord } : {}), records, possible, history };
  }
  /** why two records are (or are not) the same entity; b omitted = why record a belongs to its entity */
  async function whyMatched(a, b, { principal, actAs } = {}) {
    const ra = await one(a, principal, actAs); if (!ra) return { error: `record ${a} not found or not visible` };
    if (b == null) { const l = svc.live(`${c().sourceId}:rt:${a}`); if (!l) return { error: `record ${a} is not resolved` }; b = l.properties.matchedWith; if (!b) return { a, entityId: l.toId, decision: 'singleton', features: [], note: 'the record is the only record of its entity' }; }
    const rb = await one(b, principal, actAs); if (!rb) return { error: `record ${b} not found or not visible` };
    const eng = ex.er?.engine;
    if (eng?.records.has(a) && eng.records.has(b)) { const w = await eng.why(a, b); return { ...w, score: round(w.score), features: w.features.map(f => ({ ...f, weight: round(f.weight) })), explanation: explain(w) }; }
    for (const [x, y] of [[a, b], [b, a]]) { const l = svc.live(`${c().sourceId}:rt:${x}`); if (l?.properties.matchedWith === y) return { a: x, b: y, score: l.properties.score, matchKey: l.properties.matchKey, decision: 'match', features: l.properties.why, source: 'stored on RESOLVES_TO (this instance does not run the engine)' }; }
    return { error: 'no stored comparison for this pair on this instance (the ER engine runs elsewhere)' };
  }
  async function listPossibleMatches({ entityId = null, minScore = 0, limit = 50, principal, actAs } = {}) {
    const links = [];
    if (entityId) links.push(...incident(entityId, c().possibleType));
    else for (const it of svc.items.values()) if (it.kind === 'link' && !it.deleted && it.type === c().possibleType && (it.properties.score ?? 0) >= minScore) links.push(it);
    const vis = (await visible(links, principal, actAs)).filter(l => (l.properties.score ?? 0) >= minScore).sort((x, y) => y.properties.score - x.properties.score);
    return { count: vis.length, matches: vis.slice(0, limit).map(l => ({ linkId: l.id, entityA: l.fromId, labelA: svc.live(l.fromId)?.label, entityB: l.toId, labelB: svc.live(l.toId)?.label, score: l.properties.score, matchKey: l.properties.matchKey, recordA: l.properties.recordA, recordB: l.properties.recordB, why: l.properties.why })), truncated: vis.length > limit };
  }
  return { resolveEntity, whyMatched, listPossibleMatches, entityIdFor };
}

/** one-line, human-readable explanation (log2 Bayes factors: + supports, - contradicts) */
export function explain(w) {
  const parts = w.features.slice().sort((x, y) => Math.abs(y.weight) - Math.abs(x.weight)).map(f => `${f.property} ${f.weight >= 0 ? '+' : ''}${f.weight.toFixed(1)} (${f.level})`);
  return `${w.decision} at ${(w.score * 100).toFixed(1)}% (threshold ${w.threshold}); prior ${w.prior?.toFixed?.(1) ?? 0}; ${parts.join(', ')}${w.viaChain ? '; same entity through other records' : ''}`;
}
