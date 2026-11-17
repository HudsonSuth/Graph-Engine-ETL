// Count records a read_committed kafkajs consumer receives from a topic, with stock kafkajs 2.2.4 vs the fix in
// kafka/kafkajs-fix.js. Usage: node explore/tools/kafkajs-abort-check.mjs <topic> [fix]. Compare with
// kafka-console-consumer.sh --isolation-level read_committed (the Java client is the reference).
const [topic, mode] = process.argv.slice(2), fix = mode === 'fix';
if (fix) await import('../kafka/kafkajs-fix.js');
const { default: kafkajs } = await import('kafkajs');
const k = new kafkajs.Kafka({ brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','), logLevel: 0 });
const c = k.consumer({ groupId: `abort-check-${Date.now()}-${fix}`, readUncommitted: false });
await c.connect(); await c.subscribe({ topic, fromBeginning: true });
const ids = []; await c.run({ eachMessage: async ({ message }) => { try { ids.push(JSON.parse(message.value).eventId); } catch {} } });
await new Promise(r => setTimeout(r, 6000)); await c.disconnect();
console.log(`${fix ? 'kafkajs + fix' : 'stock kafkajs 2.2.4'}: records ${ids.length}, unique eventIds ${new Set(ids).size}`);
