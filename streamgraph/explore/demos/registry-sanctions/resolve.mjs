// Runs StreamGraph's ErEngine. The matcher only scores pairs; ErEngine clusters them and keeps the why.
import { ErEngine } from '../../er/engine.js';
import { erConfig } from '../../er/config.js';
import { DukeStyleMatcher, ORGANIZATION_PROFILE } from './duke-style.mjs';

export async function resolveOrganizations(records) {
  const cfg = erConfig({
    enabled: true,
    engine: 'duke',
    sourceId: 'er',
    types: { Organization: ORGANIZATION_PROFILE },
  });
  const matcher = new DukeStyleMatcher();
  const engine = new ErEngine({ cfg, matcher });
  await engine.start();
  const items = records.map(rec => ({
    op: 'upsert',
    item: {
      kind: 'node',
      id: rec.id,
      type: 'Organization',
      label: rec.label,
      properties: {
        name: rec.names,
        country: rec.countries,
        address: rec.addresses,
        dataSource: rec.dataSource,
        recordId: rec.recordId,
      },
      sources: [{ sourceId: rec.dataSource, nativeId: rec.recordId }],
    },
  }));
  await engine.apply(items);
  const sameAs = [];
  const clusters = [];
  for (const ent of engine.entities.values()) {
    const members = [...ent.members];
    clusters.push({ id: ent.id, members });
    if (members.length < 2) continue;
    for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
      const a = members[i] < members[j] ? members[i] : members[j];
      const b = members[i] < members[j] ? members[j] : members[i];
      const edge = engine.edge(a, b);
      if (!edge || edge.score < ORGANIZATION_PROFILE.threshold) continue;
      const why = edge.why.map(w => ({
        property: w.property,
        a: w.a,
        b: w.b,
        similarity: w.similarity,
        level: w.level,
        weight: Math.round(w.weight * 100) / 100,
      }));
      sameAs.push({
        from: a,
        to: b,
        score: Math.round(edge.score * 10000) / 10000,
        matchKey: ErEngine.matchKey(edge.why),
        why,
        entityId: ent.id,
      });
    }
  }
  const entityOf = new Map();
  for (const ent of engine.entities.values()) for (const m of ent.members) entityOf.set(m, ent.id);
  return { sameAs, clusters, entityOf, stats: engine.stats() };
}
