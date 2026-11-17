// Fixtures from SPEC §13.1 (generated deterministically).
import { rng } from '../shared/layouts.js';
const T0 = Date.parse('2026-11-13T12:00:00Z');
export const t = s => new Date(T0 + s * 1000).toISOString();
export const src = (sourceId, nativeId) => [{ sourceId, nativeId: String(nativeId), fetchedAt: t(0) }];
export const node = (id, type, properties = {}, sourceId = 'A', extra = {}) => ({ id, kind: 'node', type, properties, sources: src(sourceId, id), ...extra });
export const link = (id, fromId, toId, type = 'REL', properties = {}, sourceId = 'A', extra = {}) => ({ id, kind: 'link', type, fromId, toId, properties, sources: src(sourceId, id), ...extra });

/** F-small: 20 nodes, 25 links, known 3-hop shortest path s0 -> s3 (s0→s1→s2→s3). */
export function fSmall() {
  const types = ['Person', 'Account', 'Device', 'Company'];
  const nodes = Array.from({ length: 20 }, (_, i) => node(`s${i}`, types[i % 4], { name: `Node ${i}`, degree: 0, risk: i * 5 }));
  const pairs = [[0, 1], [1, 2], [2, 3]];
  for (let i = 4; i < 20; i++) pairs.push([i, i === 19 ? 4 : i + 1]);
  pairs.push([3, 4], [3, 10], [5, 12], [6, 14], [8, 17], [0, 19]);
  const links = pairs.map(([a, b], i) => link(`l${i}`, `s${a}`, `s${b}`, i < 3 ? 'TRANSFER' : 'KNOWS'));
  for (const l of links) for (const e of [l.fromId, l.toId]) nodes[+e.slice(1)].properties.degree++;
  return { nodes, links };
}
/** F-10k style generator: n nodes, m links, 8 types; optional positions. */
export function fLarge(n = 10000, m = 15000, { positions = false, seed = 11 } = {}) {
  const r = rng(seed), types = ['Person', 'Account', 'Device', 'Company', 'Address', 'Phone', 'Email', 'Transaction'];
  const nodes = [], links = [];
  for (let i = 0; i < n; i++) nodes.push({ id: `n${i}`, kind: 'node', type: types[i % 8], label: `N${i}`, properties: { score: Math.floor(r() * 100) }, sources: src('gen', i), ...(positions ? { x: r() * 1000, y: r() * 1000 } : {}) });
  for (let j = 0; j < m; j++) { const a = j < n - 1 ? j + 1 : Math.floor(r() * n); const b = j < n - 1 ? Math.floor(r() * (j + 1)) : Math.floor(r() * n); links.push({ id: `e${j}`, kind: 'link', type: 'LINK', fromId: `n${a}`, toId: `n${b === a ? (a + 1) % n : b}`, properties: {}, sources: src('gen', 'e' + j) }); }
  return { nodes, links };
}
/** F-stream: recorded batches with duplicates, a gap, a remove-then-re-upsert and a 200-event burst. */
export function fStream(sourceId = 'S') {
  let seq = 0;
  const ev = (op, payload, s = ++seq) => ({ eventId: `p:${s}`, op, sourceId, seq: s, eventTime: t(s), payload });
  const e = [];
  for (let i = 0; i < 10; i++) e.push(ev('node.upsert', { id: `a${i}`, type: i % 2 ? 'Account' : 'Person', properties: { n: i } }));
  for (let i = 0; i < 9; i++) e.push(ev('link.upsert', { id: `al${i}`, fromId: `a${i}`, toId: `a${i + 1}`, type: 'NEXT' }));
  e.push(ev('node.remove', { id: 'a9' }));
  e.push(ev('node.upsert', { id: 'a9', type: 'Account', properties: { n: 99, revived: true } }));
  for (let i = 0; i < 200; i++) e.push(ev('node.upsert', { id: `b${i}`, type: 'Burst', properties: { i } }));
  const batches = []; for (let i = 0; i < e.length; i += 25) batches.push({ batchId: `B${i / 25}`, sourceId, partition: 0, events: e.slice(i, i + 25) });
  return { events: e, batches };
}
/** Clean graph state summary for equality comparisons. */
export function graphState(svc) {
  const out = [];
  for (const it of svc.items.values()) if (!it.deleted) out.push([it.id, it.kind, it.type, JSON.stringify(it.properties), it.fromId ?? '', it.toId ?? '']);
  return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
