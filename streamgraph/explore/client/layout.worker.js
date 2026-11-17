// Layout worker (SPEC §8.2.6): all layout math runs off the main thread; force layouts stream intermediate positions.
import { computeLayout, forceSteps, layoutOptions } from '../shared/layouts.js';
let current = 0;
const WATCHDOG_MS = 30000;
self.onmessage = async ({ data: m }) => {
  if (m.type === 'cancel') { if (m.runId === current) current = -1; return; }
  if (m.type !== 'run') return;
  const runId = current = m.runId, t0 = performance.now();
  const nodes = m.nodes, links = m.links.map(([source, target]) => ({ source, target }));
  const prev = new Map(Object.entries(m.prev || {}).map(([k, v]) => [k, { x: v[0], y: v[1] }]));
  const pinned = new Set(m.pinned || []), newIds = new Set(m.newIds || []);
  const o = layoutOptions(m.options);
  const send = (pos, progress, done, extra = {}) => {
    const buf = new Float64Array(nodes.length * 2);
    nodes.forEach((n, i) => { const p = pos.get(n.id); buf[2 * i] = p ? p.x : NaN; buf[2 * i + 1] = p ? p.y : NaN; });
    self.postMessage({ type: 'positions', runId, positions: buf, progress, done, ms: performance.now() - t0, ...extra }, [buf.buffer]);
  };
  try {
    if (o.kind === 'force' && !(o.incremental && prev.size)) {
      for (const n of nodes) if (newIds.size && !newIds.has(n.id) && !prev.has(n.id)) newIds.add(n.id);
      let last = null;
      for (const step of forceSteps(nodes, links, { ...o, incremental: false }, prev, pinned, newIds)) {
        if (current !== runId) return; // cancelled or superseded
        last = step.positions; for (const id of pinned) { const p = prev.get(id); if (p) last.set(id, p); }
        if (performance.now() - t0 > WATCHDOG_MS) { send(last, step.progress, true, { watchdog: true }); return; }
        send(last, step.progress, step.done);
        await new Promise(r => setTimeout(r, 0)); // yield so cancel messages are seen
      }
    } else {
      const pos = computeLayout({ nodes, links, options: o, prev, pinned: [...pinned], newIds: [...newIds] });
      if (current === runId) send(pos, 1, true);
    }
  } catch (e) { self.postMessage({ type: 'error', runId, message: String(e?.message || e) }); }
};
