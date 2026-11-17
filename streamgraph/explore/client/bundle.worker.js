// Edge-bundling worker (SPEC §24.2): force-directed edge bundling runs off the main thread; the page draws the result.
import { bundleEdges } from '../shared/bundling.js';
let current = 0;
self.onmessage = ({ data: m }) => {
  if (m.type !== 'run') return;
  current = m.runId; const runId = m.runId;
  try {
    const r = bundleEdges(m.edges, { ...m.options, onProgress: p => self.postMessage({ type: 'progress', runId, progress: p }) });
    if (runId !== current) return;
    // flatten: ids + offsets + one Float64Array of points (transferable)
    const ids = [], offsets = [0]; let n = 0; for (const a of r.paths.values()) n += a.length;
    const buf = new Float64Array(n); let k = 0;
    for (const [id, a] of r.paths) { ids.push(id); buf.set(a, k); k += a.length; offsets.push(k); }
    self.postMessage({ type: 'done', runId, ids, offsets, points: buf, stats: r.stats }, [buf.buffer]);
  } catch (e) { self.postMessage({ type: 'error', runId, message: String(e?.message || e) }); }
};
