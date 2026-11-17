// Force-directed edge bundling (SPEC §24.2), written from Holten & van Wijk, "Force-Directed Edge Bundling for Graph
// Visualization", EuroVis 2009 (no third-party code). Pure function; runs in a Web Worker in the UI and in Node for tests.
//   edges: [{ id, x1, y1, x2, y2, w? }]  ->  { paths: Map id -> Float64Array [x0,y0, ..., xn,yn], stats }
// Compatibility Ce = Ca·Cs·Cp·Cv (angle, scale, position, visibility); only pairs with Ce >= compat interact. Candidate pairs
// come from a grid over edge midpoints: Ce >= t needs Cs >= t (length ratio <= rMax(t)) and Cp >= t (midpoint distance
// <= lavg·(1-t)/t), so the search radius per edge is exact, not a heuristic cut.
// Cycles: subdivisions P = 1, 2, 4, ...; iterations I0·(2/3)^c; step S0 halves each cycle. Endpoints never move.
// opts.wrong (SCALE_IMPL=wrong): BW1 every pair is treated as compatible (Ce = 1); BW2 endpoints are moved too.
const ENV_WRONG = typeof process !== 'undefined' && process.env?.SCALE_IMPL === 'wrong'; // SPEC §24.7 deliberately wrong build (Node); the browser passes it explicitly
export const BUNDLE_DEFAULTS = { cycles: 5, I0: 50, S0: 0.02, K: 1, compat: 0.6, maxEdges: 5000 };

export function compatibility(P, Q) {
  const px = P.x2 - P.x1, py = P.y2 - P.y1, qx = Q.x2 - Q.x1, qy = Q.y2 - Q.y1, lp = Math.hypot(px, py), lq = Math.hypot(qx, qy);
  if (lp < 1e-9 || lq < 1e-9) return 0;
  const ca = Math.abs((px * qx + py * qy) / (lp * lq));
  const lavg = (lp + lq) / 2, cs = 2 / (lavg / Math.min(lp, lq) + Math.max(lp, lq) / lavg);
  const pmx = (P.x1 + P.x2) / 2, pmy = (P.y1 + P.y2) / 2, qmx = (Q.x1 + Q.x2) / 2, qmy = (Q.y1 + Q.y2) / 2;
  const cp = lavg / (lavg + Math.hypot(pmx - qmx, pmy - qmy));
  const vis = (A, B) => { // project B's endpoints onto A's line; visibility of A's midpoint inside that projected segment
    const ax = A.x2 - A.x1, ay = A.y2 - A.y1, L2 = ax * ax + ay * ay;
    const proj = (x, y) => { const t = ((x - A.x1) * ax + (y - A.y1) * ay) / L2; return [A.x1 + t * ax, A.y1 + t * ay]; };
    const [i0x, i0y] = proj(B.x1, B.y1), [i1x, i1y] = proj(B.x2, B.y2), imx = (i0x + i1x) / 2, imy = (i0y + i1y) / 2;
    const amx = (A.x1 + A.x2) / 2, amy = (A.y1 + A.y2) / 2, li = Math.hypot(i1x - i0x, i1y - i0y);
    return li < 1e-9 ? 0 : Math.max(0, 1 - (2 * Math.hypot(amx - imx, amy - imy)) / li);
  };
  const cv = Math.min(vis(P, Q), vis(Q, P));
  return ca * cs * cp * cv;
}
/** Largest length ratio r with Cs >= t (Cs is decreasing in r). */
function ratioMax(t) { let lo = 1, hi = 1e6; for (let i = 0; i < 80; i++) { const r = (lo + hi) / 2, cs = 2 / ((1 + r) / 2 + (2 * r) / (1 + r)); if (cs >= t) lo = r; else hi = r; } return lo; }

export function bundleEdges(input, options = {}) {
  const o = { ...BUNDLE_DEFAULTS, ...options }; o.wrong = !!o.wrong || ENV_WRONG; const t0 = performance.now();
  const edges = input.filter(e => Number.isFinite(e.x1) && Number.isFinite(e.y2) && Math.hypot(e.x2 - e.x1, e.y2 - e.y1) > 1e-9).slice(0, o.maxEdges);
  const E = edges.length, paths = new Map();
  if (!E) return { paths, stats: { edges: 0, pairs: 0, ms: 0, subdivisions: 0 } };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const e of edges) { x0 = Math.min(x0, e.x1, e.x2); x1 = Math.max(x1, e.x1, e.x2); y0 = Math.min(y0, e.y1, e.y2); y1 = Math.max(y1, e.y1, e.y2); }
  const diag = Math.hypot(x1 - x0, y1 - y0) || 1;
  // ---- compatible pairs (with direction flag: opposite-pointing edges pair point i with point P+1-i)
  const len = edges.map(e => Math.hypot(e.x2 - e.x1, e.y2 - e.y1)), rmax = ratioMax(o.compat), slack = (1 - o.compat) / o.compat;
  const nb = Array.from({ length: E }, () => []); let pairs = 0;
  if (o.wrong) { for (let i = 0; i < E; i++) for (let j = i + 1; j < E; j++) { const flip = (edges[i].x2 - edges[i].x1) * (edges[j].x2 - edges[j].x1) + (edges[i].y2 - edges[i].y1) * (edges[j].y2 - edges[j].y1) < 0; nb[i].push(j, 1, flip ? 1 : 0); nb[j].push(i, 1, flip ? 1 : 0); pairs++; } } // BW1
  else {
    const sorted = [...len].sort((a, b) => a - b), cell = Math.max(sorted[sorted.length >> 1] * 1.5, diag / 2000), grid = new Map();
    const mid = edges.map(e => [(e.x1 + e.x2) / 2, (e.y1 + e.y2) / 2]);
    mid.forEach(([mx, my], i) => { const k = `${Math.floor(mx / cell)},${Math.floor(my / cell)}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
    for (let i = 0; i < E; i++) {
      const rad = ((len[i] * (1 + rmax)) / 2) * slack, gx = Math.floor(mid[i][0] / cell), gy = Math.floor(mid[i][1] / cell), span = Math.ceil(rad / cell);
      for (let dx = -span; dx <= span; dx++) for (let dy = -span; dy <= span; dy++) for (const j of grid.get(`${gx + dx},${gy + dy}`) || []) {
        if (j <= i || len[j] > len[i] * rmax || len[i] > len[j] * rmax) continue;
        const c = compatibility(edges[i], edges[j]); if (c < o.compat) continue;
        const flip = (edges[i].x2 - edges[i].x1) * (edges[j].x2 - edges[j].x1) + (edges[i].y2 - edges[i].y1) * (edges[j].y2 - edges[j].y1) < 0;
        nb[i].push(j, c, flip ? 1 : 0); nb[j].push(i, c, flip ? 1 : 0); pairs++;
      }
    }
  }
  // ---- iterate
  let P = 1, pts = edges.map(e => Float64Array.of(e.x1, e.y1, (e.x1 + e.x2) / 2, (e.y1 + e.y2) / 2, e.x2, e.y2));
  let S = o.S0 * diag, I = o.I0;
  const force = edges.map(() => null);
  for (let c = 0; c < o.cycles; c++) {
    o.onProgress?.(c / o.cycles);
    if (c > 0) { P *= 2; S /= 2; I = Math.max(1, Math.round(I * (2 / 3))); pts = pts.map(a => resample(a, P)); }
    for (let i = 0; i < E; i++) force[i] = new Float64Array((P + 2) * 2);
    for (let it = 0; it < I; it++) {
      for (let i = 0; i < E; i++) {
        const a = pts[i], f = force[i], kp = (o.K * (P + 1)) / len[i], lst = nb[i]; f.fill(0); // spring: scale-free (relative to the edge's own length)
        for (let s = 1; s <= P; s++) {
          const x = a[2 * s], y = a[2 * s + 1];
          let fx = kp * (a[2 * s - 2] - x + a[2 * s + 2] - x), fy = kp * (a[2 * s - 1] - y + a[2 * s + 3] - y);
          for (let k = 0; k < lst.length; k += 3) { const b = pts[lst[k]], q = lst[k + 2] ? P + 1 - s : s, dx = b[2 * q] - x, dy = b[2 * q + 1] - y, d2 = dx * dx + dy * dy; if (d2 < 1e-12) continue; const w = lst[k + 1] / Math.sqrt(d2); fx += dx * w; fy += dy * w; } // electrostatic: Ce toward q (unit direction)
          f[2 * s] = fx; f[2 * s + 1] = fy;
        }
      }
      for (let i = 0; i < E; i++) { const a = pts[i], f = force[i]; for (let s = 1; s <= P; s++) { const m = Math.hypot(f[2 * s], f[2 * s + 1]); if (m > 0) { const st = Math.min(S, m * S * 0.5); a[2 * s] += (f[2 * s] / m) * st; a[2 * s + 1] += (f[2 * s + 1] / m) * st; } }
        if (o.wrong) { a[0] = (a[0] * 3 + a[2]) / 4; a[1] = (a[1] * 3 + a[3]) / 4; } } // BW2
    }
  }
  edges.forEach((e, i) => paths.set(e.id, smooth(pts[i])));
  return { paths, stats: { edges: E, pairs, ms: performance.now() - t0, subdivisions: P, truncated: input.length > E } };
}
/** Re-sample a polyline to P interior points equally spaced along its length (endpoints kept). */
function resample(a, P) {
  const n = a.length / 2, cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(a[2 * i] - a[2 * i - 2], a[2 * i + 1] - a[2 * i - 1]));
  const L = cum[n - 1], out = new Float64Array((P + 2) * 2); out[0] = a[0]; out[1] = a[1]; out[2 * P + 2] = a[2 * n - 2]; out[2 * P + 3] = a[2 * n - 1];
  let j = 1; for (let s = 1; s <= P; s++) { const d = (L * s) / (P + 1); while (j < n - 1 && cum[j] < d) j++; const t = cum[j] - cum[j - 1] > 0 ? (d - cum[j - 1]) / (cum[j] - cum[j - 1]) : 0; out[2 * s] = a[2 * j - 2] + (a[2 * j] - a[2 * j - 2]) * t; out[2 * s + 1] = a[2 * j - 1] + (a[2 * j + 1] - a[2 * j - 1]) * t; }
  return out;
}
/** Light 3-point smoothing of interior points (endpoints kept). */
function smooth(a) { const n = a.length / 2, o = Float64Array.from(a); for (let i = 1; i < n - 1; i++) { o[2 * i] = (a[2 * i - 2] + 2 * a[2 * i] + a[2 * i + 2]) / 4; o[2 * i + 1] = (a[2 * i - 1] + 2 * a[2 * i + 1] + a[2 * i + 3]) / 4; } return o; }
/** Total drawn length of a set of polylines ("ink"); bundling moves edges together but lengthens each a little. */
export function polylineLength(a) { let s = 0; for (let i = 1; i < a.length / 2; i++) s += Math.hypot(a[2 * i] - a[2 * i - 2], a[2 * i + 1] - a[2 * i - 1]); return s; }
