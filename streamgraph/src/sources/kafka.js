import { Source } from './base.js';
// Kafka/Confluent via kafkajs (MIT). ctx.consumerFactory lets tests inject a fake consumer.
export function decode(topic, message) {
  const key = message.key?.toString();
  if (message.value == null) return { op: 'd', topic, data: { _key: key }, key }; // tombstone
  const v = JSON.parse(message.value.toString());
  if (v && 'op' in v && ('after' in v || 'before' in v)) { // Debezium envelope
    const op = v.op === 'r' ? 'c' : v.op;
    return { op, topic, data: op === 'd' ? v.before : v.after, before: v.before ?? undefined, key };
  }
  return { op: 'c', topic, data: v, key };
}
export class KafkaSource extends Source {
  async consumer() {
    if (this.ctx.consumerFactory) return this.ctx.consumerFactory(this.cfg);
    const { Kafka, logLevel } = await import('kafkajs');
    const kafka = new Kafka({ clientId: 'streamgraph', brokers: this.cfg.brokers, ssl: this.cfg.ssl, sasl: this.cfg.sasl, logLevel: logLevel.WARN });
    return kafka.consumer({ groupId: this.cfg.groupId || 'streamgraph' });
  }
  async start(emit) {
    this.c = await this.consumer();
    try { await this.c.connect(); } catch (e) { this.ctx.onError?.(e); throw e; }
    this.ctx.onPoll?.();
    for (const topic of this.cfg.topics) await this.c.subscribe({ topic, fromBeginning: this.cfg.fromBeginning ?? true });
    await this.c.run({ eachMessage: async ({ topic, message }) => {
      this.last = Date.now();
      const ev = decode(topic, message);
      await emit({ ...ev, topic: this.cfg.topicMap?.[topic] || topic });
    } });
  }
  // Batch mode: consume until idle for idleMs.
  async poll(emit) {
    if (this.c) return;
    this.last = Date.now(); await this.start(emit);
    const idle = this.cfg.idleMs ?? 1000;
    while (Date.now() - this.last < idle) await new Promise(r => setTimeout(r, 50));
    await this.stop();
  }
  async stop() { await this.c?.disconnect(); this.c = null; }
}
