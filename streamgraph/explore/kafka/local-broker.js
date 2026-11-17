// A single-node Apache Kafka broker (KRaft, Apache-2.0) run by the app itself, bound to 127.0.0.1, for the built-in stream
// processing (Flink) and Kafka mode. Started through `java -cp <kafka>/libs/*` (no .sh/.bat scripts, no admin, no Docker),
// so the same code runs on Linux and Windows. Kafka home: $KAFKA_HOME or explore/kafka/.runtime/kafka (npm run kafka:setup).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';
import { randomUUID } from 'node:crypto';
import { javaBin } from '../flink/config.js';

export const KAFKA_DIR = dirname(fileURLToPath(import.meta.url));
export const kafkaHome = () => process.env.KAFKA_HOME || join(KAFKA_DIR, '.runtime', 'kafka');
export const kafkaAvailable = () => existsSync(join(kafkaHome(), 'libs'));
const portOpen = (port, host = '127.0.0.1') => new Promise(r => { const s = createConnection({ port, host }); s.once('connect', () => { s.destroy(); r(true); }); s.once('error', () => r(false)); });

export class LocalBroker {
  constructor({ dataDir, port = 9092, controllerPort = 9093, heap = '512m', log = () => {} }) { Object.assign(this, { dataDir: join(dataDir, 'kafka'), port, controllerPort, heap, log }); this.proc = null; this.status = 'stopped'; this.stderr = ''; }
  get brokers() { return [`127.0.0.1:${this.port}`]; }
  props() {
    return [`process.roles=broker,controller`, `node.id=1`, `controller.quorum.bootstrap.servers=127.0.0.1:${this.controllerPort}`,
      `listeners=PLAINTEXT://127.0.0.1:${this.port},CONTROLLER://127.0.0.1:${this.controllerPort}`, `advertised.listeners=PLAINTEXT://127.0.0.1:${this.port}`,
      `controller.listener.names=CONTROLLER`, `listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT`, `log.dirs=${join(this.dataDir, 'logs').replace(/\\/g, '/')}`,
      `num.partitions=3`, `offsets.topic.replication.factor=1`, `transaction.state.log.replication.factor=1`, `transaction.state.log.min.isr=1`,
      `group.initial.rebalance.delay.ms=0`, `auto.create.topics.enable=false`].join('\n') + '\n';
  }
  cp() { return join(kafkaHome(), 'libs', '*'); }
  async start({ timeoutMs = 60000 } = {}) {
    if (this.proc) return this;
    if (await portOpen(this.port)) { this.status = 'external'; this.log(`[kafka] something already listens on 127.0.0.1:${this.port}; using it`); return this; }
    if (!kafkaAvailable()) throw new Error(`Kafka is not installed (${kafkaHome()}). Run npm run kafka:setup`);
    mkdirSync(this.dataDir, { recursive: true });
    const cfg = join(this.dataDir, 'server.properties'); writeFileSync(cfg, this.props());
    if (!existsSync(join(this.dataDir, 'logs', 'meta.properties'))) {
      const idFile = join(this.dataDir, 'cluster-id'); const id = existsSync(idFile) ? readFileSync(idFile, 'utf8').trim() : Buffer.from(randomUUID().replace(/-/g, ''), 'hex').toString('base64url').slice(0, 22);
      writeFileSync(idFile, id);
      const r = spawnSync(javaBin(), ['-cp', this.cp(), 'kafka.tools.StorageTool', 'format', '--standalone', '-t', id, '-c', cfg], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`Kafka storage format failed: ${(r.stderr || r.stdout || '').slice(-1500)}`);
    }
    this.status = 'starting';
    const log4j = join(kafkaHome(), 'config', 'log4j2.yaml');
    const p = this.proc = spawn(javaBin(), [`-Xmx${this.heap}`, `-Dkafka.logs.dir=${join(this.dataDir, 'app-logs')}`, ...(existsSync(log4j) ? [`-Dlog4j2.configurationFile=${log4j}`] : []), '-cp', this.cp(), 'kafka.Kafka', cfg], { stdio: ['ignore', 'ignore', 'pipe'] });
    p.stderr.on('data', d => { this.stderr = (this.stderr + d).slice(-6000); });
    process.once('exit', () => { try { p.kill('SIGKILL'); } catch {} });
    p.once('exit', code => { if (this.proc === p) { this.proc = null; this.status = 'stopped'; this.exitCode = code; this.log(`[kafka] broker exited (${code})`); } });
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) { if (!this.proc) throw new Error(`Kafka exited before it started: ${this.stderr.slice(-1500)}`); if (await portOpen(this.port)) { this.status = 'running'; this.log(`[kafka] local broker on 127.0.0.1:${this.port}`); await new Promise(r => setTimeout(r, 1500)); return this; } await new Promise(r => setTimeout(r, 300)); }
    await this.stop(); throw new Error('Kafka did not start in time');
  }
  async stop() { const p = this.proc; if (!p) { if (this.status === 'external') this.status = 'stopped'; return; } const done = new Promise(r => p.once('exit', r)); p.kill('SIGTERM'); const t = setTimeout(() => p.kill('SIGKILL'), 15000); await done; clearTimeout(t); }
  info() { return { status: this.status, brokers: this.brokers, home: kafkaHome(), installed: kafkaAvailable(), dataDir: this.dataDir }; }
}
