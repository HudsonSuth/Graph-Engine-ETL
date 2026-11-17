// Fixtures + independent oracles for the Phase 1 core-loop tests (SPEC §23.9). The oracles are deliberately naive
// (plain BFS / brute-force DFS over the edge list) and share no code with server/core-loop.js.
export const CORE_NODES = [
  ['c0', 'Person', { risk: 20 }], ['a1', 'Person', { risk: 80 }], ['a2', 'Person', { risk: 10 }], ['a3', 'Person', { risk: 50 }],
  ['acc1', 'Account', { risk: 60 }], ['acc2', 'Account', { risk: 70 }], ['acc3', 'Account', { risk: 30 }],
  ['b1', 'Person', { risk: 90 }], ['b2', 'Person', { risk: 5 }], ['d1', 'Device', { risk: 40 }], ['z1', 'Person', { risk: 1 }], ['z2', 'Person', { risk: 2 }],
];
export const CORE_LINKS = [
  ['k1', 'c0', 'a1', 'KNOWS'], ['k2', 'c0', 'a2', 'KNOWS'], ['k3', 'c0', 'a3', 'KNOWS'], ['o1', 'c0', 'acc1', 'OWNS'],
  ['k4', 'a1', 'b1', 'KNOWS'], ['k5', 'a2', 'b2', 'KNOWS'], ['t1', 'acc1', 'acc2', 'TRANSFER'], ['k6', 'a3', 'a1', 'KNOWS'],
  ['k7', 'b1', 'd1', 'USES'], ['t2', 'acc2', 'acc3', 'TRANSFER'], ['k8', 'a2', 'b1', 'KNOWS'], ['kz', 'z1', 'z2', 'KNOWS'],
];
export async function seedCore(ex, sourceId = 'external') {
  const p = ex.producer(sourceId);
  for (const [id, type, properties] of CORE_NODES) p.push('node.upsert', { id, type, label: id.toUpperCase(), properties });
  for (const [id, fromId, toId, type] of CORE_LINKS) p.push('link.upsert', { id, type, fromId, toId, properties: { amount: id.length } });
  await p.flush();
}
/** naive BFS oracle: { hopOf: {id: hop}, links: Set } */
export function oracleNeighborhood(nodes, links, { seeds, hops = 1, linkTypes = null, nodeTypes = null, where = null, direction = 'both' }) {
  const node = new Map(nodes.map(([id, type, props]) => [id, { id, type, props }]));
  const okNode = id => (!nodeTypes || nodeTypes.includes(node.get(id).type)) && (!where || where(node.get(id)));
  const okLink = l => !linkTypes || linkTypes.includes(l[3]);
  const hopOf = {}; for (const s of seeds) if (node.has(s)) hopOf[s] = 0;
  let frontier = Object.keys(hopOf);
  for (let h = 1; h <= hops; h++) {
    const next = [];
    for (const u of frontier) for (const l of links) {
      if (!okLink(l)) continue;
      let v = null; if (l[1] === u && direction !== 'in') v = l[2]; else if (l[2] === u && direction !== 'out') v = l[1];
      if (v == null || v in hopOf || !okNode(v)) continue;
      hopOf[v] = h; next.push(v);
    }
    frontier = next;
  }
  const ls = new Set(links.filter(l => okLink(l) && l[1] in hopOf && l[2] in hopOf).map(l => l[0]));
  return { hopOf, links: ls };
}
/** brute-force simple paths (undirected) up to maxHops: array of node-id arrays, sorted by length then lexicographically */
export function oraclePaths(links, from, to, maxHops, { linkTypes = null } = {}) {
  const adj = new Map(); const add = (a, b) => { if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); };
  for (const l of links) if (!linkTypes || linkTypes.includes(l[3])) { add(l[1], l[2]); add(l[2], l[1]); }
  const out = [], path = [from];
  const go = u => { if (u === to) { out.push([...path]); return; } if (path.length - 1 >= maxHops) return; for (const v of adj.get(u) || []) if (!path.includes(v)) { path.push(v); go(v); path.pop(); } };
  go(from);
  return out.sort((a, b) => a.length - b.length || a.join() .localeCompare(b.join()));
}
/** Read an NDJSON response body line by line, recording the arrival time of each line. */
export async function readNdjson(res) {
  const lines = [], dec = new TextDecoder(); let buf = '';
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true }); let i;
    while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l.trim()) lines.push({ at: performance.now(), ...JSON.parse(l) }); }
  }
  return lines;
}
/** Minimal SSE reader: calls onEvent(name, data) until abort. */
export function sse(url, onEvent) {
  const ac = new AbortController();
  (async () => {
    try {
      const res = await fetch(url, { signal: ac.signal }); const dec = new TextDecoder(); let buf = '';
      for await (const chunk of res.body) {
        buf += dec.decode(chunk, { stream: true }); let i;
        while ((i = buf.indexOf('\n\n')) >= 0) { const block = buf.slice(0, i); buf = buf.slice(i + 2); const ev = /^event: (.*)$/m.exec(block)?.[1], data = /^data: (.*)$/m.exec(block)?.[1]; if (ev && data) onEvent(ev, JSON.parse(data)); }
      }
    } catch {}
  })();
  return () => ac.abort();
}
