// Runtime fix for a read_committed bug in kafkajs 2.2.4 (src/consumer/filterAbortedMessages.js), found by the Flink
// crash/restart test (SPEC §18, proof/flink-kafkajs-aborted-bug.txt):
//   kafkajs activates at most ONE aborted transaction per message and assumes the broker's abortedTransactions list is sorted
//   by firstOffset. When two producers' transactions interleave and both abort (e.g. a Flink sink with parallelism 2 after a
//   crash), the list may arrive unsorted, the second transaction is activated too late, and its ABORTED records are delivered
//   to a read_committed consumer. CONFIRMED with kafka-dump-log (ABORT markers present) vs kafka-console-consumer
//   --isolation-level read_committed (0 duplicates) vs kafkajs (79 aborted records delivered).
// Fix: sort by firstOffset and activate every aborted transaction whose firstOffset <= the message offset. Must be imported
// before 'kafkajs' (batch.js captures the function at load time).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const path = require.resolve('kafkajs/src/consumer/filterAbortedMessages.js');
const Long = require('kafkajs/src/utils/long');
const ABORT_KEY = Buffer.from([0, 0, 0, 0]);
const isAbortMarker = m => !!m.key && Buffer.from(m.key).equals(ABORT_KEY);

export function filterAbortedMessages({ messages, abortedTransactions }) {
  if (!abortedTransactions || !abortedTransactions.length) return messages;
  const pending = [...abortedTransactions].sort((a, b) => Long.fromValue(a.firstOffset).compare(Long.fromValue(b.firstOffset)));
  const active = new Set();
  return messages.filter(message => {
    while (pending.length && Long.fromValue(message.offset).gte(pending[0].firstOffset)) active.add(String(pending.shift().producerId));
    const { producerId, inTransaction } = message.batchContext;
    if (isAbortMarker(message)) { active.delete(String(producerId)); return true; } // control record (dropped later by batch.js)
    return !(inTransaction && active.has(String(producerId)));
  });
}
require(path); // load, then replace the cached export before kafkajs' batch.js requires it
require.cache[path].exports = filterAbortedMessages;
export const KAFKAJS_FIX_APPLIED = require('kafkajs/src/consumer/filterAbortedMessages.js') === filterAbortedMessages;
