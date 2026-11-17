// Change feed: the recently APPLIED events (fed by StreamIngest.onApplied), with a resumable cursor.
// Cursor = per-stream positions {"<sourceId>#<partition>": lastSeq}. In kafka mode the partition is "kafka:<topic>:<p>" and
// seq = Kafka offset + 1, so a cursor is a Kafka consumer position and survives restarts (the feed tail is checkpointed).
// If a cursor points before what the ring still holds, since() returns reset:true (re-read state, then continue).
import { EventEmitter } from 'node:events';

export const encodeCursor = pos => Buffer.from(JSON.stringify(pos)).toString('base64url');
export function decodeCursor(c) {
  if (!c) return {};
  try { const v = JSON.parse(Buffer.from(String(c), 'base64url').toString('utf8')); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; }
}

export class ChangeFeed extends EventEmitter {
  constructor({ size = 2000 } = {}) { super(); this.setMaxListeners(0); this.size = size; this.entries = []; this.n = 0; this.floor = {}; this.head = {}; }
  push(d) {
    const k = `${d.sourceId}#${d.partition}`;
    const entry = { n: ++this.n, ...d }; this.entries.push(entry); this.head[k] = d.seq;
    if (this.entries.length > this.size) { const x = this.entries.shift(); const xk = `${x.sourceId}#${x.partition}`; this.floor[xk] = Math.max(this.floor[xk] || 0, x.seq); }
    this.emit('append', entry);
  }
  cursor() { return encodeCursor(this.head); }
  /** Entries after `cursor` (opaque string). */
  since(cursor, { limit = 100, filter = () => true } = {}) {
    const pos = decodeCursor(cursor);
    if (pos === null) return { error: 'invalid cursor' };
    let reset = false;
    for (const [k, f] of Object.entries(this.floor)) if ((pos[k] || 0) < f) { reset = true; break; }
    const next = { ...pos }, out = []; let more = false;
    for (const d of this.entries) {
      const k = `${d.sourceId}#${d.partition}`;
      if (d.seq <= (pos[k] || 0)) continue;
      if (out.length >= limit) { more = true; break; }
      next[k] = d.seq;
      if (filter(d)) out.push(d);
    }
    return { events: out, cursor: encodeCursor(next), more, reset };
  }
  exportState() { return { entries: this.entries.slice(-this.size), n: this.n, floor: this.floor, head: this.head }; }
  importState(x) { if (!x) return; this.entries = x.entries || []; this.n = x.n || 0; this.floor = x.floor || {}; this.head = x.head || {}; }
}
