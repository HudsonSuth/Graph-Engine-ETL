// Flink stream processor (SPEC §18): configuration, paths and topic creation. Optional; off by default.
// explore.config.json: { "mode": "kafka", "processor": { "enabled": true, "launch": true, ... } }
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FLINK_DIR = dirname(fileURLToPath(import.meta.url));
export const RUNTIME = process.env.STREAMGRAPH_FLINK_RUNTIME || join(FLINK_DIR, '.runtime');
export const FLINK_VERSION = '2.2.1';
export const JOB_JAR = join(FLINK_DIR, 'build', 'graph-processor.jar');
export const EVENT_SCHEMA = join(FLINK_DIR, '..', 'kafka', 'schemas', 'graph-events.v1.json');

export const PROCESSOR_DEFAULTS = {
  enabled: false,                 // master switch: viewer overlay + MCP tools + (optionally) launching the Flink job
  launch: true,                   // this Node process starts the Flink job (local MiniCluster JVM); false = job runs elsewhere (flink run)
  processorId: 'graph-processor', // Kafka consumer group, transactional-id prefix, checkpoint sub-directory
  impl: 'correct',                // 'wrong' = deliberately wrong pipeline (tests/proof only)
  delivery: 'exactly-once',       // or 'at-least-once' (lower latency; outputs are keyed + deterministic, so consumers upsert)
  topics: { enriched: 'graph.enriched', metrics: 'graph.metrics', alerts: 'graph.alerts', geo: 'graph.geo-metrics' },
  // optional per-cell windowed counts (SPEC §22.7): H3 cell of each positioned node.upsert, event-time tumbling windows
  geo: { enabled: false, resolution: 3, windowMs: 60000, windows: 10 },
  checkpointMs: 1000, windowMs: 60000, slidingMs: 300000, slideMs: 60000, outOfOrdernessMs: 2000, idleMs: 2000, maxFutureSkewMs: 3600e3,
  dedupeTtlMs: 24 * 3600 * 1000, emitEveryMs: 200, spikeThreshold: 5, parallelism: 2, maxParallelism: 128,
  startFrom: 'committed-or-earliest',
  heap: '768m',
  checkpointDir: null,            // default <dataDir>/flink-checkpoints/<processorId>
  alertsKept: 200,                // viewer/MCP: most recent alerts kept in memory
  java: null, flinkHome: null,    // default: env STREAMGRAPH_JAVA / JAVA_HOME / .runtime/jdk / PATH; env FLINK_HOME / .runtime/flink
};

export function processorConfig(cfg = {}, kafkaCfg = {}) {
  const c = { ...PROCESSOR_DEFAULTS, ...cfg, topics: { ...PROCESSOR_DEFAULTS.topics, ...(cfg.topics || {}) }, geo: { ...PROCESSOR_DEFAULTS.geo, ...(cfg.geo || {}) } };
  if (process.env.FLINK_GEO === '1') c.geo.enabled = true;
  if (process.env.EXPLORE_PROCESSOR === '1') c.enabled = true;
  if (process.env.FLINK_IMPL) c.impl = process.env.FLINK_IMPL;
  c.kafkaTopics = kafkaCfg.topics || { changes: 'graph.changes', dlq: 'graph.dlq' };
  return c;
}

export function javaBin(c = {}) {
  const exe = process.platform === 'win32' ? 'java.exe' : 'java';
  const cands = [c.java, process.env.STREAMGRAPH_JAVA, process.env.JAVA_HOME && join(process.env.JAVA_HOME, 'bin', exe), join(RUNTIME, 'jdk', 'bin', exe)];
  for (const p of cands) if (p && existsSync(p)) return p;
  return 'java';
}
export function flinkHome(c = {}) { return c.flinkHome || process.env.FLINK_HOME || join(RUNTIME, 'flink'); }
export function classpath(c = {}) {
  const home = flinkHome(c);
  if (!existsSync(join(home, 'lib'))) throw new Error(`Flink not found at ${home}. Run: npm run flink:setup`);
  if (!existsSync(JOB_JAR)) throw new Error(`processor jar missing (${JOB_JAR}). Run: npm run flink:build`);
  return [join(home, 'lib', '*'), join(RUNTIME, 'lib', '*'), JOB_JAR].join(delimiter);
}

/** Latest completed checkpoint (chk-N with _metadata) under dir/<jobId>/, newest first by mtime. */
export function latestCheckpoint(dir) {
  if (!dir || !existsSync(dir)) return null;
  let best = null;
  for (const job of readdirSync(dir)) {
    const jd = join(dir, job); if (!statSync(jd).isDirectory()) continue;
    for (const chk of readdirSync(jd)) {
      if (!/^chk-\d+$/.test(chk)) continue;
      const meta = join(jd, chk, '_metadata'); if (!existsSync(meta)) continue;
      const t = statSync(meta).mtimeMs; if (!best || t > best.t) best = { path: join(jd, chk), t };
    }
  }
  return best?.path || null;
}

/** Create the processor's output topics if missing. metrics/alerts are compacted (keyed, deterministic -> idempotent upserts). */
export async function ensureProcessorTopics(kafka, c, { partitions = 6, replicationFactor = 1 } = {}) {
  const admin = kafka.admin(); await admin.connect();
  try {
    const have = new Set(await admin.listTopics()), t = c.topics;
    const want = [
      { topic: c.kafkaTopics.changes, numPartitions: partitions, replicationFactor },
      { topic: c.kafkaTopics.dlq, numPartitions: 1, replicationFactor },
      { topic: t.enriched, numPartitions: partitions, replicationFactor, configEntries: [{ name: 'cleanup.policy', value: 'delete' }] },
      { topic: t.metrics, numPartitions: partitions, replicationFactor, configEntries: [{ name: 'cleanup.policy', value: 'compact,delete' }, { name: 'retention.ms', value: String(7 * 864e5) }] },
      { topic: t.alerts, numPartitions: 1, replicationFactor, configEntries: [{ name: 'cleanup.policy', value: 'compact,delete' }, { name: 'retention.ms', value: String(30 * 864e5) }] },
      ...(c.geo?.enabled ? [{ topic: t.geo, numPartitions: partitions, replicationFactor, configEntries: [{ name: 'cleanup.policy', value: 'compact,delete' }, { name: 'retention.ms', value: String(7 * 864e5) }] }] : []),
    ].filter(x => !have.has(x.topic));
    if (want.length) await admin.createTopics({ topics: want, waitForLeaders: true });
    return want.map(w => w.topic);
  } finally { await admin.disconnect(); }
}
