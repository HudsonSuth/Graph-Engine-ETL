// DELIBERATELY WRONG implementations (SPEC §13.3). Never the default: selected only with IMPLEMENTATION=wrong.
// The real test-suite must FAIL against these; explore/test/wrong-impl.test.js proves it.
import { GraphService } from './service.js';
import { StreamIngest } from './ingest.js';
import { computeLayout as realLayout, layoutOptions } from '../shared/layouts.js';

/** W1 naive merge (appends a second node when the id exists) + W4 permission leak (ignores source access). */
export class WrongGraphService extends GraphService {
  constructor(o) { super(o); this.dupN = 0; }
  upsert(raw, ctx = {}) {
    const stored = raw && this.items.get(raw.id);
    if (stored && !stored.deleted && raw.kind === 'node') return super.upsert({ ...raw, id: `${raw.id}~dup${++this.dupN}` }, ctx); // W1
    return super.upsert(raw, ctx);
  }
  canReadSource() { return true; } // W4
}
/** W2 non-idempotent stream: re-applies duplicate eventIds / seqs and bumps versions. */
export class WrongStreamIngest extends StreamIngest {
  receive(batch) {
    return this.chain = this.chain.then(() => {
      const ack = { batchId: batch.batchId, status: 'ok', lastAppliedSeq: 0, accepted: 0, skipped: 0, failed: 0, duplicates: 0, errors: [] };
      for (const e of batch.events) {
        const p = { ...(e.payload || {}), kind: e.op.split('.')[0], sources: [{ sourceId: batch.sourceId, nativeId: e.payload?.id }], eventTime: e.eventTime };
        if (e.op.endsWith('.upsert')) { const cur = this.service.items.get(p.id); this.service.upsert(p); if (cur) cur.version++; ack.accepted++; }
        else if (e.op.endsWith('.remove')) { this.service.remove(p.id); ack.accepted++; }
        ack.lastAppliedSeq = Math.max(ack.lastAppliedSeq, e.seq);
      }
      return ack;
    });
  }
}
/** W3 full relayout always: ignores `incremental` and randomizes every unpinned position on every call. */
export function wrongComputeLayout(input) {
  const o = layoutOptions(input.options);
  const pos = realLayout({ ...input, options: { ...o, incremental: false } });
  const pins = new Set(input.pinned || []);
  const prev = input.prev instanceof Map ? input.prev : new Map(Object.entries(input.prev || {}));
  for (const [id, p] of pos) if (!pins.has(id)) pos.set(id, { x: (Math.random() - 0.5) * 4000, y: (Math.random() - 0.5) * 4000 });
  for (const id of pins) if (prev.has(id)) pos.set(id, prev.get(id));
  return pos;
}
