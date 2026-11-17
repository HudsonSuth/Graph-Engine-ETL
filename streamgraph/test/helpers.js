import { Pipeline } from '../src/flow.js';
import { GraphStore } from '../src/graph.js';
export const run = async (flow, ctx) => { const g = new GraphStore(); const p = new Pipeline(flow, { graph: g, ctx }); await p.runOnce(); return { g, p }; };
export const sink = mapping => ({ id: 'sink', type: 'graph', config: { mapping } });
// Fake kafkajs consumer: same connect/subscribe/run(eachMessage)/disconnect surface, messages from a list.
export function fakeKafka(messages) {
  return () => {
    const subs = new Set();
    return {
      connect: async () => {}, disconnect: async () => {},
      subscribe: async ({ topic }) => subs.add(topic),
      run: async ({ eachMessage }) => { setImmediate(async () => { for (const m of messages) if (subs.has(m.topic)) await eachMessage({ topic: m.topic, partition: 0, message: { key: m.key == null ? null : Buffer.from(m.key), value: m.value == null ? null : Buffer.from(JSON.stringify(m.value)) } }); }); },
    };
  };
}
