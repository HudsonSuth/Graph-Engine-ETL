// Kafka mode runtime: wires publisher, view consumer, command worker and command client into an Explore instance.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostname } from 'node:os';
import { kafkaConfig, makeKafka, ensureTopics, producerOpts } from './config.js';
import { KafkaPublisher } from './publisher.js';
import { KafkaGraphConsumer } from './consumer.js';
import { CommandWorker, CommandClient } from './commands.js';

export async function startKafka(ex, config, { log = console.log, dataDir } = {}) {
  const c = kafkaConfig(config.kafka || {});
  const instanceId = String(c.instanceId || process.env.EXPLORE_INSTANCE_ID || hostname()).replace(/[^A-Za-z0-9_.-]/g, '_');
  const wrong = process.env.KAFKA_IMPL === 'wrong';
  const W = wrong ? await import('./wrong.js') : null;
  const kafka = makeKafka(c, { instanceId });
  const topics = await ensureTopics(kafka, c);
  if (topics.created.length) log(`[kafka] created topics ${topics.created.join(', ')}`);
  const writes = config.mcp?.allowWrites === true;
  const rt = { config: c, instanceId, kafka, wrong, publisher: null, consumer: null, worker: null, commands: null };
  // publisher (also needed by a worker for keying/state bookkeeping)
  if (c.publish || (writes && c.runWorker)) {
    const P = W ? W.WrongPublisher : KafkaPublisher;
    rt.publisher = await new P({ kafka, cfg: c, instanceId, log, conflictPolicy: config.conflictPolicy || 'field-merge-lww' }).start();
  }
  if (c.consume) {
    const C = W ? W.WrongConsumer : KafkaGraphConsumer;
    const groupId = c.groupId || `${c.groups.viewPrefix}-${instanceId}`;
    const dir = c.checkpointDir || join(dataDir || join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data'), 'explore-kafka');
    if (!rt.publisher) { rt.dlq = kafka.producer(producerOpts()); await rt.dlq.connect(); }
    rt.consumer = await new C({ kafka, cfg: c, ex, instanceId, groupId, checkpointFile: join(dir, `${groupId}.checkpoint.json`), log, dlqProducer: rt.publisher?.plain || rt.dlq, bootstrap: c.bootstrap || 'state' }).start();
  }
  if (writes && c.runWorker) rt.worker = await new CommandWorker({ kafka, cfg: c, ex, publisher: rt.publisher, instanceId, writeSourceId: config.mcp.writeSourceId || 'mcp', log }).start();
  if (writes) rt.commands = await new CommandClient({ kafka, cfg: c, instanceId, producer: rt.publisher?.plain || rt.dlq || await (async () => { const p = kafka.producer(producerOpts()); await p.connect(); rt.cmdProducer = p; return p; })(), log }).start();
  rt.stats = () => ({ mode: 'kafka', instanceId, wrong, brokers: c.brokers, topics: c.topics, publisher: rt.publisher?.metrics, consumer: rt.consumer?.stats(), worker: rt.worker?.stats() });
  rt.close = async ({ checkpoint = true } = {}) => {
    await rt.commands?.close(); await rt.worker?.close(); await rt.consumer?.close({ checkpoint }); await rt.publisher?.close(); await rt.dlq?.disconnect().catch(() => {}); await rt.cmdProducer?.disconnect().catch(() => {});
  };
  log(`[kafka] mode on: instance ${instanceId}, brokers ${c.brokers.join(',')}, publish=${!!rt.publisher && c.publish} consume=${!!rt.consumer} worker=${!!rt.worker}${wrong ? ' [WRONG IMPLEMENTATION]' : ''}`);
  return rt;
}
