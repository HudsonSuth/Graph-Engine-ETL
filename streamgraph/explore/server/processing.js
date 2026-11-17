// Built-in stream processing (local Kafka broker + the Flink job in a local MiniCluster JVM) and entity matching (Duke or
// Splink). The studio switches them on and off; settings persist in <data>/explore-settings.json and the explore layer is
// rebuilt with the new configuration (Flink needs Kafka mode). Nothing here downloads or runs prebuilt jars from the repo:
// the Flink job and the Duke sidecar are compiled from explore/*/src by npm run flink:build / er:build.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { LocalBroker, kafkaAvailable, kafkaHome } from '../kafka/local-broker.js';
import { JOB_JAR, flinkHome, javaBin } from '../flink/config.js';
import { SIDECAR_JAR, ER_LIB, PERSON, ORGANIZATION, pythonBin } from '../er/config.js';

export const DEFAULT_SETTINGS = { stream: { enabled: false }, er: { enabled: false, engine: 'duke', types: {} } };
export const PROFILES = { person: PERSON, organization: ORGANIZATION };
let javaCache = null;
export function javaInfo() {
  if (javaCache) return javaCache;
  const bin = javaBin(); let major = 0;
  try { const r = spawnSync(bin, ['-XshowSettings:properties', '-version'], { encoding: 'utf8', timeout: 20000 }); major = Number(((r.stderr || '') + (r.stdout || '')).match(/java\.specification\.version = (\d+)/)?.[1] || 0); } catch {}
  return (javaCache = { bin, major, ok: major >= 17 });
}
export function availability() {
  const j = javaInfo();
  const splinkPy = (() => { try { return pythonBin({}); } catch { return null; } })();
  return {
    java: j,
    kafka: { installed: kafkaAvailable(), home: kafkaHome(), fix: 'npm run kafka:setup' },
    flink: { installed: existsSync(join(flinkHome(), 'lib')), jobBuilt: existsSync(JOB_JAR), fix: 'npm run flink:setup && npm run flink:build' },
    duke: { installed: existsSync(join(ER_LIB, 'duke-1.2.jar')), sidecarBuilt: existsSync(SIDECAR_JAR), fix: 'npm run er:setup -- --no-splink && npm run er:build' },
    splink: { installed: !!splinkPy && existsSync(splinkPy), fix: 'npm run er:setup (needs Python 3.10+)' },
  };
}

export class ProcessingControl {
  constructor({ dataDir, baseConfig, log = () => {} }) {
    Object.assign(this, { dataDir, baseConfig, log: log || (() => {}) }); this.broker = null; this.lastError = null; this.rebuild = null; this.busy = false;
    this.file = dataDir ? join(dataDir, 'explore-settings.json') : null;
    this.settings = structuredClone(DEFAULT_SETTINGS);
    if (this.file && existsSync(this.file)) try { const s = JSON.parse(readFileSync(this.file, 'utf8')); this.settings = { stream: { ...DEFAULT_SETTINGS.stream, ...s.stream }, er: { ...DEFAULT_SETTINGS.er, ...s.er } }; } catch {}
    if (process.env.STREAMGRAPH_PROCESSING === 'off') this.settings = structuredClone(DEFAULT_SETTINGS); // tests / safe mode
  }
  save() { if (this.file) { mkdirSync(this.dataDir, { recursive: true }); writeFileSync(this.file, JSON.stringify(this.settings, null, 2)); } }
  erTypes() { return Object.fromEntries(Object.entries(this.settings.er.types || {}).filter(([, p]) => PROFILES[p]).map(([t, p]) => [t, PROFILES[p]])); }
  async effectiveConfig() {
    let c = this.baseConfig; const s = this.settings;
    if (s.stream.enabled) {
      if (!this.broker) this.broker = new LocalBroker({ dataDir: this.dataDir, port: Number(process.env.STREAMGRAPH_KAFKA_PORT || 9092), controllerPort: Number(process.env.STREAMGRAPH_KAFKA_PORT || 9092) + 1, heap: process.env.STREAMGRAPH_KAFKA_HEAP || '384m', log: this.log });
      await this.broker.start();
      c = { ...c, mode: 'kafka', kafka: { ...c.kafka, brokers: this.broker.brokers.join(',') }, processor: { ...c.processor, enabled: true, heap: process.env.STREAMGRAPH_FLINK_HEAP || c.processor?.heap || '512m' } };
    }
    if (s.er.enabled) {
      const types = this.erTypes();
      if (!Object.keys(types).length) throw new Error('Pick which kinds of things are people or organizations before turning on matching.');
      c = { ...c, er: { ...c.er, enabled: true, engine: s.er.engine, types } };
    }
    return c;
  }
  /** apply a settings change: rebuild the explore layer; on failure go back to the previous settings */
  async apply(patch) {
    if (this.busy) throw Object.assign(new Error('Already switching. Wait a few seconds.'), { status: 409 });
    this.busy = true; const prev = structuredClone(this.settings);
    try {
      this.settings = { stream: { ...prev.stream, ...(patch.stream || {}) }, er: { ...prev.er, ...(patch.er || {}) } };
      if (!this.settings.stream.enabled && this.broker) { /* stop the broker after the layer is rebuilt without Kafka */ }
      for (let i = 0; ; i++) { // a broker that has just started may not have elected topic leaders yet: retry those few seconds
        try { await this.rebuild(); break; } catch (e) { if (i >= 6 || !/leader|not available|coordinator|ECONNREFUSED|ETIMEDOUT|metadata/i.test(e.message)) throw e; this.log(`[processing] waiting for Kafka (${e.message})`); await new Promise(r => setTimeout(r, 3000)); }
      }
      if (!this.settings.stream.enabled && this.broker) { await this.broker.stop(); this.broker = null; }
      this.lastError = null; this.save(); this.busy = false; return this.status();
    } catch (e) {
      this.lastError = e.message; this.settings = prev;
      try { if (!prev.stream.enabled && this.broker) { await this.broker.stop(); this.broker = null; } await this.rebuild(); } catch (e2) { this.log(`[processing] could not restore: ${e2.message}`); }
      throw Object.assign(new Error(e.message), { status: 400 });
    } finally { this.busy = false; }
  }
  status(ex = this.getEx?.()) {
    return { settings: this.settings, availability: availability(), broker: this.broker ? this.broker.info() : { status: 'stopped' }, lastError: this.lastError, busy: this.busy,
      processor: ex?.processor ? ex.processor.stats() : { enabled: false }, er: ex?.er ? ex.er.stats() : { enabled: false }, mode: ex?.config?.mode || 'inprocess' };
  }
  async close() { await this.broker?.stop(); this.broker = null; }
}
