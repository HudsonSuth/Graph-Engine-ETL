// Kafka mode configuration and client factory. Secrets come from environment variables only (names in config).
import './kafkajs-fix.js'; // must precede kafkajs: read_committed fix for interleaved aborted transactions
import kafkajs from 'kafkajs';
import { hostname } from 'node:os';
const { Kafka, logLevel, Partitioners } = kafkajs;

export const KAFKA_DEFAULTS = {
  brokers: ['localhost:9092'],
  clientId: 'streamgraph-explore',
  instanceId: null,                 // default: <hostname>-<port>; used for the per-instance view group id
  partitions: 6,                    // for topics this app creates
  replicationFactor: 1,             // 3 on Confluent Cloud / production clusters
  topics: { changes: 'graph.changes', state: 'graph.state', commands: 'graph.commands', results: 'graph.command-results', dlq: 'graph.dlq' },
  groups: { viewPrefix: 'explore-view', workers: 'explore-command-workers', results: 'explore-results' },
  publish: true,                    // this process publishes StreamGraph + local producers onto graph.changes
  consume: true,                    // this process builds its read model from graph.changes
  runWorker: true,                  // this process runs a command worker (shared group)
  createTopics: true,
  checkpointDir: null,              // default: <dataDir>/explore-kafka
  checkpointEveryMs: 1000,
  ssl: false,                       // true, or { rejectUnauthorized, caEnv, certEnv, keyEnv } (PEM contents from env vars)
  sasl: null,                       // { mechanism: 'plain'|'scram-sha-256'|'scram-sha-512', usernameEnv, passwordEnv }  (Confluent Cloud: plain + API key/secret)
  connectionTimeout: 10000,
  logLevel: 'warn',
};

export function kafkaConfig(cfg = {}) {
  const c = { ...KAFKA_DEFAULTS, ...cfg, topics: { ...KAFKA_DEFAULTS.topics, ...(cfg.topics || {}) }, groups: { ...KAFKA_DEFAULTS.groups, ...(cfg.groups || {}) } };
  if (typeof c.brokers === 'string') c.brokers = c.brokers.split(',').map(s => s.trim()).filter(Boolean);
  if (c.brokersEnv && process.env[c.brokersEnv]) c.brokers = process.env[c.brokersEnv].split(',').map(s => s.trim());
  return c;
}

export function makeKafka(c, { instanceId = c.instanceId || hostname() } = {}) {
  const env = n => (n ? process.env[n] : undefined);
  let ssl = c.ssl;
  if (ssl && typeof ssl === 'object') ssl = { rejectUnauthorized: ssl.rejectUnauthorized !== false, ...(env(ssl.caEnv) ? { ca: [env(ssl.caEnv)] } : {}), ...(env(ssl.certEnv) ? { cert: env(ssl.certEnv) } : {}), ...(env(ssl.keyEnv) ? { key: env(ssl.keyEnv) } : {}) };
  let sasl;
  if (c.sasl) {
    const username = env(c.sasl.usernameEnv), password = env(c.sasl.passwordEnv);
    if (!username || !password) throw new Error(`Kafka SASL needs env vars ${c.sasl.usernameEnv} and ${c.sasl.passwordEnv}`);
    sasl = { mechanism: c.sasl.mechanism || 'plain', username, password };
    if (ssl === false || ssl == null) ssl = true; // SASL without TLS is refused: credentials would travel in clear
  }
  const lv = { error: logLevel.ERROR, warn: logLevel.WARN, info: logLevel.INFO, debug: logLevel.DEBUG, nothing: logLevel.NOTHING }[c.logLevel] ?? logLevel.WARN;
  return new Kafka({ clientId: `${c.clientId}-${instanceId}`, brokers: c.brokers, ssl: ssl || undefined, sasl, connectionTimeout: c.connectionTimeout, logLevel: lv,
    retry: { initialRetryTime: 200, retries: 8 } });
}

/** Create the topics this capability uses if they are missing (idempotent). */
export async function ensureTopics(kafka, c) {
  const admin = kafka.admin(); await admin.connect();
  try {
    const have = new Set(await admin.listTopics());
    const t = c.topics, rf = c.replicationFactor, P = c.partitions;
    const want = [
      { topic: t.changes, numPartitions: P, replicationFactor: rf, configEntries: [{ name: 'cleanup.policy', value: 'delete' }] },
      { topic: t.state, numPartitions: P, replicationFactor: rf, configEntries: [{ name: 'cleanup.policy', value: 'compact' }, { name: 'min.cleanable.dirty.ratio', value: '0.1' }] },
      { topic: t.commands, numPartitions: P, replicationFactor: rf },
      { topic: t.results, numPartitions: P, replicationFactor: rf, configEntries: [{ name: 'cleanup.policy', value: 'compact,delete' }] },
      { topic: t.dlq, numPartitions: 1, replicationFactor: rf },
    ].filter(x => !have.has(x.topic));
    if (want.length) await admin.createTopics({ topics: want, waitForLeaders: true });
    const md = await admin.fetchTopicMetadata({ topics: [t.changes] });
    return { created: want.map(w => w.topic), changePartitions: md.topics[0].partitions.length };
  } finally { await admin.disconnect(); }
}

/**
 * Producer options used everywhere: idempotent (enable.idempotence), max.in.flight 1, unlimited retries (required for EOS,
 * as in the Java client), Java-compatible murmur2 partitioner (same key -> same partition as Java/Confluent clients).
 */
export const producerOpts = (extra = {}) => ({ idempotent: true, maxInFlightRequests: 1, createPartitioner: Partitioners.DefaultPartitioner,
  retry: { retries: Number.MAX_SAFE_INTEGER, initialRetryTime: 100, maxRetryTime: 5000 }, ...extra });
