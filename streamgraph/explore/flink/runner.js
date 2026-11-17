// Launches the Flink job (GraphStreamProcessor) in a local MiniCluster JVM and restores it from the latest checkpoint.
// The same jar runs on a Flink cluster: flink run -c streamgraph.flink.GraphStreamProcessor graph-processor.jar --config processor.json
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { FLINK_DIR, EVENT_SCHEMA, javaBin, classpath, latestCheckpoint } from './config.js';

export class FlinkProcessor {
  static live = new Set(); static hooked = false;
  /** c = processorConfig(); brokers: string[]; dataDir: where config, logs and checkpoints live */
  constructor(c, { brokers, dataDir, log = () => {} }) {
    Object.assign(this, { c, brokers, dataDir: resolve(dataDir), log });
    this.checkpointDir = resolve(c.checkpointDir || join(this.dataDir, 'flink-checkpoints', c.processorId));
    this.proc = null; this.status = 'stopped'; this.info = null; this.stderr = '';
  }
  jobConfig({ fresh = false } = {}) {
    const c = this.c, t = c.topics;
    const restoreFrom = fresh ? null : latestCheckpoint(this.checkpointDir);
    return { brokers: this.brokers.join(','), processorId: c.processorId, groupId: c.groupId || c.processorId, impl: c.impl, delivery: c.delivery,
      changes: c.kafkaTopics.changes, dlq: c.kafkaTopics.dlq, enriched: t.enriched, metrics: t.metrics, alerts: t.alerts,
      schemaPath: EVENT_SCHEMA, checkpointDir: this.checkpointDir, restoreFrom, startFrom: c.startFrom,
      checkpointMs: c.checkpointMs, windowMs: c.windowMs, slidingMs: c.slidingMs, slideMs: c.slideMs, outOfOrdernessMs: c.outOfOrdernessMs,
      idleMs: c.idleMs, maxFutureSkewMs: c.maxFutureSkewMs, dedupeTtlMs: c.dedupeTtlMs, emitEveryMs: c.emitEveryMs, spikeThreshold: c.spikeThreshold, parallelism: c.parallelism, maxParallelism: c.maxParallelism,
      geoMetrics: c.geo?.enabled ? t.geo : null, geoResolution: c.geo?.resolution ?? 3, geoWindowMs: c.geo?.windowMs ?? 60000 };
  }
  async start({ fresh = false, timeoutMs = 90000 } = {}) {
    mkdirSync(this.checkpointDir, { recursive: true });
    const jc = this.jobConfig({ fresh });
    const cfgFile = join(this.dataDir, `processor-${this.c.processorId}.json`);
    writeFileSync(cfgFile, JSON.stringify(jc, null, 2));
    const logFile = join(this.dataDir, `processor-${this.c.processorId}.log`);
    const args = [`-Xmx${this.c.heap}`, '-XX:+UseSerialGC', `-Dlog.file=${logFile}`, `-Dlog4j.configurationFile=${join(FLINK_DIR, 'log4j2.properties')}`,
      '--add-opens=java.base/java.util=ALL-UNNAMED', '--add-opens=java.base/java.lang=ALL-UNNAMED',
      '-cp', classpath(this.c), 'streamgraph.flink.GraphStreamProcessor', '--config', cfgFile, '--exit-on-stdin-eof'];
    this.status = 'starting'; this.stderr = '';
    const p = this.proc = spawn(javaBin(this.c), args, { stdio: ['pipe', 'pipe', 'pipe'] }); // the JVM exits when our end of its stdin closes (parent gone)
    p.stdin.on('error', () => {});
    if (!FlinkProcessor.hooked) { FlinkProcessor.hooked = true; process.once('exit', () => { for (const q of FlinkProcessor.live) try { q.kill('SIGKILL'); } catch {} }); }
    FlinkProcessor.live.add(p); p.once('exit', () => FlinkProcessor.live.delete(p));
    p.stderr.on('data', d => { this.stderr = (this.stderr + d).slice(-8000); });
    const started = new Promise((res, rej) => {
      let buf = '';
      const t = setTimeout(() => rej(new Error(`Flink processor did not start in ${timeoutMs} ms. stderr: ${this.stderr.slice(-2000)}`)), timeoutMs);
      p.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1);
        try { const m = JSON.parse(line); if (m.event === 'started') { clearTimeout(t); this.info = m; this.status = 'running'; res(m); } } catch {} } });
      p.on('exit', code => { clearTimeout(t); if (this.status === 'starting') rej(new Error(`Flink processor exited (${code}) before start: ${this.stderr.slice(-2000)}`)); });
    });
    p.on('exit', code => { if (this.proc === p) { this.status = 'stopped'; this.exitCode = code; this.proc = null; this.log(`[flink] processor exited (${code})`); } });
    const info = await started;
    this.log(`[flink] processor ${this.c.processorId} running (Flink ${info.flinkVersion}, job ${info.jobId}, ${info.delivery}${info.restoredFrom ? `, restored from ${info.restoredFrom}` : ''})`);
    return info;
  }
  /** kill: true = SIGKILL (crash simulation); otherwise SIGTERM and wait. */
  async stop({ kill = false, timeoutMs = 15000 } = {}) {
    const p = this.proc; if (!p) return;
    const done = new Promise(r => p.once('exit', r));
    p.kill(kill ? 'SIGKILL' : 'SIGTERM');
    const t = setTimeout(() => p.kill('SIGKILL'), timeoutMs);
    await done; clearTimeout(t);
  }
  stats() { return { status: this.status, jobId: this.info?.jobId, flinkVersion: this.info?.flinkVersion, delivery: this.info?.delivery, impl: this.c.impl, restoredFrom: this.info?.restoredFrom ?? null, checkpointDir: this.checkpointDir }; }
}
