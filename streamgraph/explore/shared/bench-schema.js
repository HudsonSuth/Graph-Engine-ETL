// WebGPU vs WebGL renderer benchmark: result schema, stop rule and statistics. Shared by the bench page
// (explore/client/bench.js), the server endpoint that stores results (POST /api/explore/bench/webgpu) and the tests.
export const BENCH_SCHEMA = 'streamgraph.webgpu-bench/1';
export const BENCH_SIZES = [10000, 50000, 100000, 250000, 500000, 1000000];
export const BENCH_RENDERERS = ['webgl', 'webgpu'];
export const EDGE_FACTOR = 2;
export const MIN_FPS = 10;
export const RUN_STATUS = ['ok', 'slow', 'error', 'skipped'];

export function quantile(values, q) {
  const a = values.filter(Number.isFinite).sort((x, y) => x - y); if (!a.length) return null;
  const pos = (a.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return a[lo] + (a[hi] - a[lo]) * (pos - lo);
}
export function frameStats(ms) {
  const a = ms.filter(Number.isFinite); if (!a.length) return { median: null, p95: null, mean: null, min: null, max: null };
  const r = x => (x == null ? null : Math.round(x * 100) / 100);
  return { median: r(quantile(a, 0.5)), p95: r(quantile(a, 0.95)), mean: r(a.reduce((s, x) => s + x, 0) / a.length), min: r(Math.min(...a)), max: r(Math.max(...a)) };
}
export const fpsOf = medianMs => (medianMs > 0 ? Math.round((1000 / medianMs) * 10) / 10 : null);

/** status of one finished run, and whether the size ladder stops for that renderer */
export function classifyRun({ error = null, oom = false, deviceLost = false, frameMs = null } = {}, minFps = MIN_FPS) {
  if (error || oom || deviceLost) return 'error';
  const fps = fpsOf(frameMs?.median);
  if (fps == null) return 'error';
  return fps < minFps ? 'slow' : 'ok';
}
export const stopsLadder = status => status === 'error' || status === 'slow';

/** biggest size each renderer handled at >= minFps */
export function summarize(runs) {
  const out = {};
  for (const r of runs) { const s = (out[r.renderer] ||= { maxOkNodes: 0, firstFailure: null }); if (r.status === 'ok') s.maxOkNodes = Math.max(s.maxOkNodes, r.nodes); else if ((r.status === 'slow' || r.status === 'error') && !s.firstFailure) s.firstFailure = { nodes: r.nodes, status: r.status, reason: r.error || (r.oom ? 'out of memory' : r.deviceLost ? 'device lost' : `${r.fps} fps`) }; }
  return out;
}

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isNumOrNull = v => v === null || isNum(v);
/** Validate a result document. Returns a list of problems (empty = valid). */
export function validateBenchResult(doc) {
  const e = [];
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return ['result must be an object'];
  if (doc.schema !== BENCH_SCHEMA) e.push(`schema must be "${BENCH_SCHEMA}"`);
  if (typeof doc.createdAt !== 'string' || Number.isNaN(Date.parse(doc.createdAt))) e.push('createdAt must be an ISO date string');
  if (typeof doc.userAgent !== 'string') e.push('userAgent must be a string');
  const env = doc.environment;
  if (!env || typeof env !== 'object') e.push('environment must be an object');
  else {
    if (!env.webgpu || typeof env.webgpu.available !== 'boolean') e.push('environment.webgpu.available must be a boolean');
    if (!env.viewport || !isNum(env.viewport.width) || !isNum(env.viewport.height)) e.push('environment.viewport needs numeric width/height');
  }
  const st = doc.settings;
  if (!st || !Array.isArray(st.sizes) || !st.sizes.every(n => Number.isInteger(n) && n > 0)) e.push('settings.sizes must be positive integers');
  if (st && !isNum(st.durationMs)) e.push('settings.durationMs must be a number');
  if (st && !isNum(st.minFps)) e.push('settings.minFps must be a number');
  if (!Array.isArray(doc.runs)) e.push('runs must be an array');
  else doc.runs.forEach((r, i) => {
    const p = `runs[${i}]`;
    if (!r || typeof r !== 'object') { e.push(`${p} must be an object`); return; }
    if (!BENCH_RENDERERS.includes(r.renderer) && r.renderer !== 'webgpu-raw') e.push(`${p}.renderer must be one of ${BENCH_RENDERERS.join(', ')}`);
    if (!Number.isInteger(r.nodes) || r.nodes <= 0) e.push(`${p}.nodes must be a positive integer`);
    if (!Number.isInteger(r.edges) || r.edges < 0) e.push(`${p}.edges must be a non-negative integer`);
    if (!RUN_STATUS.includes(r.status)) e.push(`${p}.status must be one of ${RUN_STATUS.join(', ')}`);
    if (typeof r.oom !== 'boolean') e.push(`${p}.oom must be a boolean`);
    if (!(typeof r.deviceLost === 'boolean' || typeof r.deviceLost === 'string')) e.push(`${p}.deviceLost must be a boolean or the loss reason`);
    if (!(r.error === null || typeof r.error === 'string')) e.push(`${p}.error must be null or a string`);
    if (r.status !== 'skipped') {
      if (!isNumOrNull(r.initMs)) e.push(`${p}.initMs must be a number or null`);
      if (!r.frameMs || !isNumOrNull(r.frameMs.median) || !isNumOrNull(r.frameMs.p95)) e.push(`${p}.frameMs needs median and p95`);
      if (r.status === 'ok' && (!isNum(r.frameMs?.median) || !isNum(r.frameMs?.p95))) e.push(`${p}: an ok run needs numeric frame times`);
      if (r.status === 'ok' && !(r.fps >= (st?.minFps ?? MIN_FPS))) e.push(`${p}: status ok but fps below minFps`);
    }
  });
  if (Array.isArray(doc.runs) && st?.sizes) { // the ladder stops after the first slow/error run per renderer
    const seen = {};
    for (const r of doc.runs) { if (seen[r.renderer] && r.status !== 'skipped') e.push(`${r.renderer} continued to ${r.nodes} nodes after it fell below ${st.minFps} fps or errored`); if (stopsLadder(r.status)) seen[r.renderer] = true; }
  }
  return e;
}

/** Safe file name for a stored result: webgpu-bench-<timestamp>.json (no user input in the name). */
export const benchFileName = (d = new Date()) => `webgpu-bench-${d.toISOString().replace(/[:.]/g, '-')}.json`;
