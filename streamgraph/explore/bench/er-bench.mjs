// Entity-resolution benchmark (SPEC §21.10) -> proof/er-bench.txt + proof/er-bench.json
//   npm run bench:er            [--sizes 1500,5000] [--engines splink,duke] [--no-kafka]
// Bulk: time from first record pushed to the ER stage idle (all entities/links published), records/s.
// Incremental: on top of the loaded set, single records (and batches of 100) pushed one at a time; latency = push ->
// the record's RESOLVES_TO link is visible in the read model. Kafka: the same through a real broker (ER worker).
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { generate } from '../demos/er/generate.mjs';
import { erInstance, loadFixture, partition, ENGINE, skipReason, SOURCES } from '../test/er-helpers.js';
import { evaluate } from '../er/metrics.js';
import { brokerUp, space } from '../test/kafka-helpers.js';
import { createExplore, loadConfig } from '../server/app.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const sizes = arg('--sizes', '1500,5000').split(',').map(Number), engines = arg('--engines', 'splink,duke').split(',');
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] : null; };
const r1 = x => Math.round(x * 10) / 10;
const lines = [], out = { date: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET', host: { cpus: cpus().length, cpu: cpus()[0]?.model, memGB: Math.round(totalmem() / 2 ** 30), node: process.version }, runs: [] };
const say = s => { console.log(s); lines.push(s); };
const extra = (seed, n) => generate({ people: n, orgs: 0, seed }).records.map(r => ({ ...r, id: r.id.replace(':', ':x'), properties: { ...r.properties, recordId: `x${r.properties.recordId}` } }));
async function waitFor(fn, ms = 30000) { const end = Date.now() + ms; while (Date.now() < end) { if (fn()) return true; await new Promise(r => setImmediate(r)); } return false; }

say(`# Entity resolution benchmark  (${out.date})`);
say(`# host: ${out.host.cpus} x ${out.host.cpu}, ${out.host.memGB} GB RAM, Node ${out.host.node}`);
for (const engine of engines) {
  const skip = skipReason(engine); if (skip) { say(`\n## ${engine}: SKIPPED (${skip})`); continue; }
  for (const people of sizes) {
    const f = generate({ people, orgs: Math.round(people / 10), seed: 7 });
    const ex = await erInstance({ engine });
    try {
      const t0 = performance.now(); await loadFixture(ex, f); const bulkMs = performance.now() - t0; const bulkStats = ex.er.stats();
      const pred = partition(ex), persons = f.records.filter(r => r.type === 'Person').map(r => r.id);
      const ev = evaluate(new Map(persons.map(i => [i, pred.get(i)])), new Map(persons.map(i => [i, f.truth[i]])));
      // single-record incremental
      const singles = extra(13, 120).slice(0, 100), lat = [];
      for (const r of singles) { const p = ex.producer(r.dataSource), t = performance.now(); p.push('node.upsert', { id: r.id, type: r.type, label: r.label, properties: r.properties }); await p.flush(); await waitFor(() => ex.service.live(`er:rt:${r.id}`)); lat.push(performance.now() - t); }
      // batches of 100
      const bl = [], more = extra(17, 600);
      for (let i = 0; i + 100 <= Math.min(more.length, 500); i += 100) { const batch = more.slice(i, i + 100), t = performance.now(); const ps = Object.fromEntries(SOURCES.map(s => [s, ex.producer(s)])); for (const r of batch) ps[r.dataSource].push('node.upsert', { id: r.id, type: r.type, label: r.label, properties: r.properties }); await Promise.all(Object.values(ps).map(p => p.flush())); await waitFor(() => batch.every(r => ex.service.live(`er:rt:${r.id}`))); bl.push(performance.now() - t); }
      const st = ex.er.stats();
      const run = { engine: st.engine, records: f.records.length, bulkMs: Math.round(bulkMs), recordsPerSec: Math.round(f.records.length / bulkMs * 1000), entities: bulkStats.entities, possibleLinks: bulkStats.possibleLinks,
        personF1: r1(ev.pairwise.f1 * 1000) / 1000, singleP50: r1(pct(lat, 50)), singleP95: r1(pct(lat, 95)), batch100P50: r1(pct(bl, 50)), batch100Max: r1(Math.max(...bl)), pairsScored: st.pairsScored, matcherMs: Math.round(st.matcherMs) };
      out.runs.push(run);
      say(`\n## ${run.engine}, ${run.records} records (seed 7, ${people} people)`);
      say(`bulk load        ${run.bulkMs} ms  = ${run.recordsPerSec} records/s  -> ${run.entities} entities, ${run.possibleLinks} possible links, Person pairwise F1 ${run.personF1}`);
      say(`incremental 1    p50 ${run.singleP50} ms, p95 ${run.singleP95} ms   (100 single-record upserts, push -> RESOLVES_TO visible)`);
      say(`incremental 100  p50 ${run.batch100P50} ms, max ${run.batch100Max} ms (5 batches of 100 records)`);
      say(`matcher time     ${run.matcherMs} ms in the sidecar over ${run.pairsScored} scored pairs`);
    } finally { await ex.close(); }
  }
}
// Kafka end to end (default engine)
if (!process.argv.includes('--no-kafka') && await brokerUp() && !skipReason(ENGINE)) {
  const sp = space('erb'), base = loadConfig('/x');
  const ex = await createExplore({ log: null, config: { ...base, mode: 'kafka', streams: SOURCES, er: { enabled: true, engine: ENGINE }, kafka: { ...sp.kafka, instanceId: 'b1', checkpointDir: sp.dir } } });
  try {
    const f = generate({ people: 1500, orgs: 150, seed: 7 }), t0 = performance.now();
    const ps = Object.fromEntries(SOURCES.map(s => [s, ex.producer(s)]));
    for (const r of f.records) ps[r.dataSource].push('node.upsert', { id: r.id, type: r.type, label: r.label, properties: r.properties });
    await Promise.all(Object.values(ps).map(p => p.flush()));
    await waitFor(() => f.records.every(r => ex.service.live(`er:rt:${r.id}`)), 180000);
    const bulkMs = performance.now() - t0, lat = [];
    for (const r of extra(13, 60).slice(0, 50)) { const p = ex.producer(r.dataSource), t = performance.now(); p.push('node.upsert', { id: r.id, type: r.type, label: r.label, properties: r.properties }); await p.flush(); await waitFor(() => ex.service.live(`er:rt:${r.id}`), 30000); lat.push(performance.now() - t); }
    const w = ex.er.worker.stats();
    const run = { mode: 'kafka', engine: ex.er.stats().engine, records: f.records.length, bulkMs: Math.round(bulkMs), recordsPerSec: Math.round(f.records.length / bulkMs * 1000), singleP50: r1(pct(lat, 50)), singleP95: r1(pct(lat, 95)), transactions: w.transactions, aborts: w.aborts };
    out.runs.push(run);
    say(`\n## Kafka end to end (real broker ${process.env.KAFKA_BROKERS || 'localhost:9092'}, ${run.engine})`);
    say(`bulk             ${run.records} records produced -> all RESOLVES_TO visible: ${run.bulkMs} ms = ${run.recordsPerSec} records/s (${run.transactions} transactions, ${run.aborts} aborts)`);
    say(`incremental 1    p50 ${run.singleP50} ms, p95 ${run.singleP95} ms (produce -> graph.changes -> ER worker -> transaction -> read model)`);
  } finally { await ex.close(); }
} else say('\n## Kafka end to end: SKIPPED (no broker or engine)');
say('\nNotes: single machine, no tuning; incremental numbers include one round trip to the sidecar process. CONFIRMED for this host and synthetic data only.');
const dir = new URL('../../proof/', import.meta.url); mkdirSync(dir, { recursive: true });
writeFileSync(new URL('er-bench.txt', dir), lines.join('\n') + '\n'); writeFileSync(new URL('er-bench.json', dir), JSON.stringify(out, null, 1));
process.exit(0);
