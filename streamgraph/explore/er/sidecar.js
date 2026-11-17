// Pluggable matching engines (SPEC §21.2). Every engine is a sidecar process speaking the same JSON-lines protocol over
// stdin/stdout ({rid, ns, op, ...} -> {rid, ok, ...}), so the ER stage never depends on one library:
//   splink (default): explore/er/splink_sidecar.py  - Splink 5 (MIT) + DuckDB (MIT), Python 3.9+
//   duke:             explore/er/build/duke-sidecar.jar - Duke 1.2 (Apache-2.0) + Lucene 4 (Apache-2.0), Java 17+
// Ops: config(ns, typeConfig) | upsert(ns, records) -> [{ id, matches: [{ id, score, matchWeight, prior, why }] }] | remove | compare | train | stats
// "why" is engine-neutral: [{ property, a, b, level, weight }] with weight = log2 Bayes factor, so
// log2(score / (1 - score)) = prior + sum(weight) for both engines (tested in er.test.js E3).
// If the sidecar dies it is restarted and onRestart() lets the engine re-index every live record (indexes are in memory).
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { javaBin, sidecarClasspath, pythonBin, ER_DIR } from './config.js';

export const ENGINES = {
  splink: c => { const py = pythonBin(c); const script = join(ER_DIR, 'splink_sidecar.py'); return { name: 'splink-5.0.0', cmd: py, args: ['-u', script], trainable: true }; },
  duke: c => ({ name: 'duke-1.2', cmd: javaBin(c), args: [`-Xmx${c.heap || '512m'}`, '-XX:+UseSerialGC', '-XX:TieredStopAtLevel=1', '-cp', sidecarClasspath(), 'streamgraph.er.DukeSidecar'], trainable: false }),
};
const avail = new Map();
export function engineAvailable(name, c = {}) {
  let ok = false, e;
  try { e = ENGINES[name](c); } catch { return false; }
  const key = `${name}|${e.cmd}`; if (avail.has(key)) return avail.get(key);
  try {
    ok = name === 'splink' ? spawnSync(e.cmd, ['-c', 'import splink, duckdb, pyarrow'], { stdio: 'ignore', timeout: 60000 }).status === 0 : spawnSync(e.cmd, ['-version'], { stdio: 'ignore', timeout: 30000 }).status === 0;
  } catch { ok = false; }
  avail.set(key, ok); return ok;
}

export class SidecarMatcher {
  constructor({ engine = 'splink', java = null, python = null, heap = '512m', log = () => {}, onRestart = null } = {}) {
    if (!ENGINES[engine]) throw new Error(`unknown er.engine ${engine} (${Object.keys(ENGINES).join(' | ')})`);
    Object.assign(this, { engine, java, python, heap, log, onRestart });
    this.rid = 0; this.pending = new Map(); this.closed = false; this.restarts = 0;
    this.metrics = { requests: 0, ms: 0 };
  }
  async start() {
    const e = ENGINES[this.engine]({ java: this.java, python: this.python, heap: this.heap });
    this.name = e.name; this.trainable = e.trainable;
    this.proc = spawn(e.cmd, e.args, { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    this.proc.stderr.on('data', d => { const t = String(d).trim(); if (t && !/max_pairs|u-parameters|untrained/i.test(t)) this.log(`[er] ${this.engine}: ${t.slice(0, 500)}`); });
    const rl = createInterface({ input: this.proc.stdout });
    let ready; const isReady = new Promise((r, j) => { ready = r; this.proc.once('error', j); });
    rl.on('line', line => {
      let m; try { m = JSON.parse(line); } catch { return; }
      if (m.ready) return ready();
      const p = this.pending.get(m.rid); if (!p) return;
      this.pending.delete(m.rid);
      this.metrics.ms += performance.now() - p.t0;
      if (m.ok) p.resolve(m); else p.reject(new Error(`duke sidecar: ${m.error}`));
    });
    this.proc.once('exit', code => {
      for (const p of this.pending.values()) p.reject(new Error(`duke sidecar exited (${code})`));
      this.pending.clear();
      if (!this.closed) { this.restarts++; this.log(`[er] ${this.engine} sidecar exited (${code}); restarting`); this.start().then(() => this.onRestart?.()).catch(e => this.log(`[er] restart failed: ${e.message}`)); }
    });
    await isReady;
    return this;
  }
  request(ns, op, body = {}) {
    if (this.closed) return Promise.reject(new Error('matcher closed'));
    const rid = ++this.rid; this.metrics.requests++;
    return new Promise((resolve, reject) => {
      this.pending.set(rid, { resolve, reject, t0: performance.now() });
      this.proc.stdin.write(JSON.stringify({ rid, ns, op, ...body }) + '\n');
    });
  }
  configure(ns, config) { return this.request(ns, 'config', { config }); }
  /** records: [{ id, values: { prop: [string] } }] -> [{ id, matches: [{ id, score, why }] }] (score >= maybeThreshold) */
  async upsert(ns, records) { return (await this.request(ns, 'upsert', { records })).results; }
  remove(ns, ids) { return this.request(ns, 'remove', { ids }); }
  compare(ns, a, b) { return this.request(ns, 'compare', { a, b }); }
  stats(ns) { return this.request(ns, 'stats'); }
  train(ns, minRecords = 100) { if (!this.trainable) return Promise.reject(new Error(`${this.engine} has no unsupervised training (set m/u by hand)`)); return this.request(ns, 'train', { minRecords }); }
  async close() { this.closed = true; if (!this.proc || this.proc.exitCode != null) return; const done = new Promise(r => this.proc.once('exit', r)); try { this.proc.stdin.write(JSON.stringify({ rid: 0, op: 'exit' }) + '\n'); this.proc.stdin.end(); } catch {} const t = setTimeout(() => this.proc.kill('SIGKILL'), 3000); await done; clearTimeout(t); }
  /** test hook: kill the JVM (it is restarted and re-indexed) */
  crash() { this.proc.kill('SIGKILL'); }
}
