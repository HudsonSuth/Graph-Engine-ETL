// Deliberately WRONG Kafka implementations (KAFKA_IMPL=wrong). The kafka test suite must fail against them; proof in proof/.
//   WrongPublisher: mis-keys - every event gets a random key, so one item's events scatter over partitions and are applied
//                   in whatever order partitions happen to be consumed (per-key ordering lost).
//   WrongConsumer:  ignores the checkpoint position and committed offsets: on restart it keeps the restored graph but replays
//                   graph.changes from the beginning with a fresh group and seq from a local counter, so every old event is
//                   applied a second time (double-apply; old values transiently overwrite newer ones).
import { randomUUID } from 'node:crypto';
import { KafkaPublisher } from './publisher.js';
import { KafkaGraphConsumer } from './consumer.js';

export class WrongPublisher extends KafkaPublisher {
  key() { return randomUUID(); }
}
export class WrongConsumer extends KafkaGraphConsumer {
  constructor(o) { super({ ...o, groupId: `${o.groupId}-${randomUUID().slice(0, 6)}` }); this.counter = {}; }
  async start() {
    const cp = this.loadCheckpoint();
    if (cp) { this.ex.service.importState(cp.service); this.ex.feed?.importState(cp.feed); } // keeps the graph, forgets the positions
    this.loadCheckpoint = () => null; this.bootstrap = 'none';
    const r = await super.start();
    this.next = {};
    return r;
  }
  async alignGroupOffsets() { const admin = this.kafka.admin(); await admin.connect(); try { this.partitions = (await admin.fetchTopicOffsets(this.topic)).length; } finally { await admin.disconnect(); } }
  mapEvent(e, off, p) { const { schemaVersion, partition, ...rest } = e; this.counter[p] = (this.counter[p] || 0) + 1; return { ...rest, eventId: `${rest.eventId}#${this.counter[p]}`, seq: this.counter[p] }; }
}
