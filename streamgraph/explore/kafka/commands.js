import { producerOpts } from './config.js';
// Orchestrator-worker pattern for agent writes (Confluent guide): MCP write tools do NOT write the graph. They emit a command
// to graph.commands (key = target item id, so commands for one item stay ordered) and return a commandId. Command workers
// share ONE consumer group, so partitions (= work) are split between them and re-balanced when a worker joins or dies.
// Each command is processed exactly once with a consume-transform-produce transaction:
//   change events (graph.changes) + state records (graph.state) + result (graph.command-results) + the consumed offset
// commit or abort together. Event ids are deterministic ("cmd:<commandId>:<i>"), so even a non-transactional replay would be
// de-duplicated by the view consumers' eventId window.
import { randomUUID } from 'node:crypto';
import { SCHEMA_VERSION, validateCommand, validateResult, parseJson, headers } from './contracts.js';
import { runId, within } from './util.js';

const nowIso = () => new Date().toISOString();

export class CommandWorker {
  constructor({ kafka, cfg, ex, publisher, instanceId, writeSourceId = 'mcp', log = () => {} }) {
    Object.assign(this, { kafka, cfg, ex, publisher, instanceId, writeSourceId, log });
    this.groupId = cfg.groups.workers;
    this.metrics = { received: 0, applied: 0, rejected: 0, dlq: 0, rebalances: 0 };
    this.assigned = []; this.processed = [];
    this.seq = 0;
  }
  async start() {
    this.producer = this.kafka.producer(producerOpts({ transactionalId: `${this.cfg.clientId}-${this.instanceId}-worker`, transactionTimeout: 30000 }));
    await this.producer.connect();
    this.consumer = this.kafka.consumer({ groupId: this.groupId, sessionTimeout: 10000, heartbeatInterval: 1000, maxWaitTimeInMs: 50, retry: { retries: 10 } });
    const joined = new Promise(r => this.consumer.on(this.consumer.events.GROUP_JOIN, e => { this.assigned = e.payload.memberAssignment?.[this.cfg.topics.commands] || []; r(); }));
    this.consumer.on(this.consumer.events.REBALANCING, () => this.metrics.rebalances++);
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.cfg.topics.commands, fromBeginning: true });
    await this.consumer.run({ autoCommit: false, eachMessage: m => this.onMessage(m) });
    await within(joined, 15000);
    this.log(`[kafka] command worker ${this.instanceId} in group ${this.groupId}, partitions ${this.assigned}`);
    return this;
  }
  /** Decide a command against the worker's read model. -> { events } | { reason } */
  decide(cmd) {
    const a = cmd.args || {}, S = this.writeSourceId;
    const str = (v, n) => typeof v === 'string' && v.length > 0 && v.length <= n;
    if (cmd.kind === 'upsert_node') {
      if (!str(a.id, 512) || !str(a.type, 128)) return { reason: 'upsert_node needs id and type' };
      return { events: [{ op: 'node.upsert', payload: { id: a.id, type: a.type, ...(a.label != null ? { label: String(a.label) } : {}), properties: a.properties || {} } }] };
    }
    if (cmd.kind === 'upsert_link') {
      if (!str(a.id, 512) || !str(a.type, 128) || !str(a.fromId, 512) || !str(a.toId, 512)) return { reason: 'upsert_link needs id, type, fromId, toId' };
      return { events: [{ op: 'link.upsert', payload: { id: a.id, type: a.type, fromId: a.fromId, toId: a.toId, ...(a.label != null ? { label: String(a.label) } : {}), properties: a.properties || {} } }] };
    }
    if (cmd.kind === 'remove_item') {
      const it = this.ex.service.live(a.id);
      if (!it) return { reason: `not found: ${a.id}` };
      if (!it.sources.some(s => s.sourceId === S)) return { reason: `forbidden: item ${a.id} belongs to another source` };
      return { events: [{ op: `${it.kind}.remove`, payload: { id: a.id } }] };
    }
    return { reason: `unknown command kind ${cmd.kind}` };
  }
  async onMessage({ topic, partition, message }) {
    this.metrics.received++;
    const t = this.cfg.topics, offsets = { consumerGroupId: this.groupId, topics: [{ topic, partitions: [{ partition, offset: String(Number(message.offset) + 1) }] }] };
    const parsed = parseJson(message.value || Buffer.alloc(0));
    const v = parsed.ok ? validateCommand(parsed.value) : parsed;
    const tx = await this.producer.transaction();
    try {
      const topicMessages = []; let result;
      if (!v.ok) {
        this.metrics.dlq++;
        topicMessages.push({ topic: t.dlq, messages: [this.publisher.dlqMessage('command', v.reason, parsed.ok ? parsed.value : message.value?.toString('utf8'), { partition, offset: message.offset })] });
        const cid = parsed.ok && typeof parsed.value?.commandId === 'string' ? parsed.value.commandId : null;
        if (cid) result = { schemaVersion: SCHEMA_VERSION, commandId: cid, status: 'rejected', reason: v.reason, at: nowIso(), worker: this.instanceId };
      } else {
        const cmd = parsed.value, d = this.decide(cmd);
        if (d.reason) { this.metrics.rejected++; result = { schemaVersion: SCHEMA_VERSION, commandId: cmd.commandId, status: 'rejected', reason: d.reason, at: nowIso(), worker: this.instanceId }; }
        else {
          const eventTime = nowIso();
          const events = d.events.map((e, i) => ({ ...e, eventId: `cmd:${cmd.commandId}:${i}`, sourceId: this.writeSourceId, seq: ++this.seq, eventTime }));
          const prep = this.publisher.prepare({ batchId: `cmd:${cmd.commandId}`, sourceId: this.writeSourceId, partition: 0, events }, { stableIds: true });
          if (prep.ack.rejected) { this.metrics.rejected++; result = { schemaVersion: SCHEMA_VERSION, commandId: cmd.commandId, status: 'rejected', reason: prep.ack.errors.map(e => e.message).join('; '), at: nowIso(), worker: this.instanceId }; }
          else { this.metrics.applied++; topicMessages.push(...prep.topicMessages); result = { schemaVersion: SCHEMA_VERSION, commandId: cmd.commandId, status: 'applied', eventIds: events.map(e => e.eventId), at: nowIso(), worker: this.instanceId }; }
          if (prep.dlq.length) topicMessages.push({ topic: t.dlq, messages: prep.dlq });
        }
      }
      if (result) { const rv = validateResult(result); if (!rv.ok) throw new Error(rv.reason); topicMessages.push({ topic: t.results, messages: [{ key: result.commandId, value: JSON.stringify(result), headers: headers('command-result') }] }); }
      if (topicMessages.length) await tx.sendBatch({ topicMessages, acks: -1 });
      await tx.sendOffsets(offsets);
      await tx.commit();
      this.processed.push({ commandId: result?.commandId, partition, offset: message.offset });
    } catch (e) { await tx.abort().catch(() => {}); throw e; } // kafkajs retries the message; nothing was made visible
  }
  stats() { return { groupId: this.groupId, assigned: this.assigned, ...this.metrics }; }
  async close() { await this.consumer?.disconnect().catch(() => {}); await this.producer?.disconnect().catch(() => {}); }
}

/** Command emitter + result tracker (orchestrator side, used by the MCP write tools). */
export class CommandClient {
  constructor({ kafka, cfg, instanceId, producer, log = () => {} }) {
    Object.assign(this, { kafka, cfg, instanceId, producer, log });
    this.results = new Map(); this.waiters = new Map();
  }
  async start() {
    this.consumer = this.kafka.consumer({ groupId: `${this.cfg.groups.results}-${this.instanceId}-${runId()}`, maxWaitTimeInMs: 50 });
    const joined = new Promise(r => this.consumer.on(this.consumer.events.GROUP_JOIN, r));
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.cfg.topics.results, fromBeginning: false });
    await this.consumer.run({ eachMessage: async ({ message }) => {
      const r = parseJson(message.value); if (!r.ok || !validateResult(r.value).ok) return;
      this.results.set(r.value.commandId, r.value);
      if (this.results.size > 10000) this.results.delete(this.results.keys().next().value);
      for (const f of this.waiters.get(r.value.commandId) || []) f(r.value);
      this.waiters.delete(r.value.commandId);
    } });
    await within(joined, 15000);
    return this;
  }
  /** Validate and publish a command. Returns its commandId. */
  async emit(kind, args, issuer) {
    const cmd = { schemaVersion: SCHEMA_VERSION, commandId: `c-${randomUUID()}`, kind, issuedAt: nowIso(), issuer, args };
    const v = validateCommand(cmd); if (!v.ok) throw new Error(v.reason);
    const key = String(args?.id ?? cmd.commandId);
    await this.producer.send({ topic: this.cfg.topics.commands, messages: [{ key, value: JSON.stringify(cmd), headers: headers('command') }], acks: -1 });
    return cmd.commandId;
  }
  /** Resolve with the result (or null after waitMs). */
  status(commandId, waitMs = 0) {
    if (this.results.has(commandId)) return Promise.resolve(this.results.get(commandId));
    if (!waitMs) return Promise.resolve(null);
    return new Promise(res => {
      const list = this.waiters.get(commandId) || []; this.waiters.set(commandId, list);
      const t = setTimeout(() => { const l = this.waiters.get(commandId); if (l) l.splice(l.indexOf(done), 1); res(null); }, waitMs);
      const done = r => { clearTimeout(t); res(r); }; list.push(done);
    });
  }
  async close() { await this.consumer?.disconnect().catch(() => {}); }
}
