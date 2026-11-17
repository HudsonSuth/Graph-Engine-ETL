// Performance benchmark (SPEC perf budgets): 10k nodes / 20k links through the streaming contract,
// 200-event delta apply (server merge + coalesced session delta + client ViewStore apply), layout timings.
// Usage: node explore/bench/bench.mjs [nodes=10000] [links=20000] [rounds=30]   -> also writes proof/bench.txt
import Graph from 'graphology';
import { writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import { createExplore, loadConfig } from '../server/app.js';
import { ViewStore } from '../shared/view-store.js';
import { computeLayout, movement } from '../shared/layouts.js';

const [N = 10000, M = 20000, ROUNDS = 30] = process.argv.slice(2).map(Number);
const now = () => performance.now();
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
const f = x => x.toFixed(1);
const lines = []; const out = s => { lines.push(s); console.log(s); };

const cfg = loadConfig('/nonexistent-explore-config.json');
const ex = await createExplore({ config: cfg, log: null });
const { service } = ex;
service.coalesceMs = 0;
const sess = service.openSession({ principal: cfg.principal, follow: true, coalesceMs: 1e9 }).sessionId;
const S = service.sessions.get(sess);

out(`# Explore perf benchmark  ${new Date().toString()}`);
out(`# node ${process.version}, ${os.cpus()[0]?.model} x${os.cpus().length}, ${Math.round(os.totalmem() / 2 ** 30)} GB, ${os.platform()}`);
out(`\n## Ingest ${N} nodes / ${M} links via the streaming contract (batches of 500, acked)`);
const ing = await ex.synthetic(N, M);
out(`ingest: ${f(ing.ms)} ms  (${Math.round((N + M) / (ing.ms / 1000))} events/s)  counts=${JSON.stringify(service.counts ? service.counts() : { items: service.items.size })}`);

let t = now(); const first = S.flush(); const tFirst = now() - t;
const store = new ViewStore(new Graph({ multi: true, type: 'mixed', allowSelfLoops: true }));
t = now(); store.loadSnapshot({ items: first.upserts, deltaCursor: first.deltaSeq }); const tLoad = now() - t;
out(`initial view: server builds ${first.upserts.length} items in ${f(tFirst)} ms; client ViewStore loads them in ${f(tLoad)} ms (graph ${store.graph.order} nodes / ${store.graph.size} links)`);

out(`\n## 200-event delta, ${ROUNDS} rounds (150 node updates + 30 link updates + 10 new nodes + 10 new links)`);
const p = ex.producer('synthetic'); let nextNew = N;
const srv = [], build = [], cli = [], e2e = [];
for (let r = 0; r < ROUNDS; r++) {
  const t0 = now();
  for (let i = 0; i < 150; i++) { const k = (r * 997 + i * 61) % N; p.push('node.upsert', { id: `syn:node:${k}`, type: 'Person', properties: { score: (r + i) % 100, round: r } }); }
  for (let i = 0; i < 30; i++) { const k = (r * 389 + i * 101) % M; const l = service.live(`syn:link:${k}`); p.push('link.upsert', { id: l.id, type: l.type, fromId: l.fromId, toId: l.toId, properties: { amount: r * 1000 + i } }); }
  for (let i = 0; i < 10; i++) { const id = `syn:node:${nextNew + i}`; p.push('node.upsert', { id, type: 'Device', label: `new ${nextNew + i}`, properties: { round: r } }); p.push('link.upsert', { id: `syn:newlink:${nextNew + i}`, type: 'USES', fromId: id, toId: `syn:node:${(nextNew + i) % N}`, properties: {} }); }
  nextNew += 10;
  await p.flush();
  const t1 = now(); const d = S.flush(); const t2 = now();
  const res = store.applyDelta(d); const t3 = now();
  if (!res.ok) throw new Error('delta not applied');
  srv.push(t1 - t0); build.push(t2 - t1); cli.push(t3 - t2); e2e.push(t3 - t0);
}
out(`server merge+ack   p50 ${f(pct(srv, 50))} ms   p95 ${f(pct(srv, 95))} ms`);
out(`session delta build p50 ${f(pct(build, 50))} ms   p95 ${f(pct(build, 95))} ms`);
out(`client apply (ViewStore -> graphology, no rebuild) p50 ${f(pct(cli, 50))} ms   p95 ${f(pct(cli, 95))} ms   fullRebuilds=${store.metrics.fullRebuilds} incrementalApplies=${store.metrics.incrementalApplies}`);
out(`end-to-end in-process (excl. network/SSE, excl. render) p50 ${f(pct(e2e, 50))} ms   p95 ${f(pct(e2e, 95))} ms`);

out(`\n## Layout (${store.graph.order} nodes / ${store.graph.size} links, Node main thread; the UI runs the same code in a Web Worker)`);
const nodes = store.graph.mapNodes((id, a) => ({ id, type: a.item.type })), links = store.graph.mapEdges((e, a, s, tt) => ({ source: s, target: tt }));
t = now(); const full = computeLayout({ nodes, links, options: { kind: 'force' } }); const tFull = now() - t;
out(`force full (ForceAtlas2, Barnes-Hut): ${f(tFull)} ms`);
const extra = Array.from({ length: 200 }, (_, i) => ({ id: `x${i}`, type: 'Device' })), xl = extra.map((n, i) => ({ source: n.id, target: nodes[(i * 37) % nodes.length].id }));
t = now(); const inc = computeLayout({ nodes: [...nodes, ...extra], links: [...links, ...xl], options: { kind: 'force', incremental: true }, prev: full, newIds: extra.map(n => n.id) }); const tInc = now() - t;
const mv = movement(full, inc, nodes.map(n => n.id));
const med = pct(mv.distances, 50) / mv.diag;
out(`force incremental (+200 nodes, existing kept): ${f(tInc)} ms; existing nodes moved: median ${(med * 100).toFixed(2)}% of layout diagonal, ${(mv.fractionWithin(0.02) * 100).toFixed(1)}% moved < 2% of diagonal`);
for (const kind of ['hierarchy', 'radial', 'circular', 'grid']) { t = now(); computeLayout({ nodes, links, options: { kind, roots: [nodes[0].id] } }); out(`${kind}: ${f(now() - t)} ms`); }

await ex.close();
mkdirSync(new URL('../../proof/', import.meta.url), { recursive: true });
writeFileSync(new URL('../../proof/bench.txt', import.meta.url), lines.join('\n') + '\n');
process.exit(0);
