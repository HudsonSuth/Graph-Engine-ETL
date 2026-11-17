// Wires the optional Flink processor into an Explore instance (kafka mode only): output topics, optional job launch,
// viewer metrics store. Disabled by default; existing in-process and Kafka modes are untouched unless processor.enabled.
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { processorConfig, ensureProcessorTopics } from './config.js';
import { FlinkProcessor } from './runner.js';
import { MetricsStore } from './metrics-store.js';
import { makeKafka, kafkaConfig } from '../kafka/config.js';

export async function startProcessor(ex, config, { log = () => {}, dataDir } = {}) {
  if (config.mode !== 'kafka') throw new Error('processor.enabled needs mode "kafka" (the Flink processor reads graph.changes)');
  const kc = ex.kafka?.config || kafkaConfig(config.kafka);
  const c = processorConfig(config.processor, kc);
  const instanceId = kc.instanceId || 'local';
  const kafka = makeKafka(kc, { instanceId: `${instanceId}-processor` });
  await ensureProcessorTopics(kafka, c, { partitions: kc.partitions, replicationFactor: kc.replicationFactor });
  const runner = c.launch ? new FlinkProcessor(c, { brokers: kc.brokers, dataDir: dataDir || config.dataDir || join(tmpdir(), 'explore-flink'), log }) : null;
  if (runner) await runner.start();
  const store = await new MetricsStore({ kafka, c, instanceId, log }).start();
  log(`[flink] processor overlay on (metrics ${c.topics.metrics}, alerts ${c.topics.alerts}${runner ? '' : ', job not launched here'})`);
  return {
    config: c, runner, store,
    stats: () => ({ enabled: true, job: runner ? runner.stats() : { status: 'external' }, store: store.stats(), topics: c.topics }),
    close: async ({ crash = false } = {}) => { await store.close(); if (runner) await runner.stop({ kill: crash }); },
  };
}
