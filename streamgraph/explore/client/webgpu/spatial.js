// Uniform grid over node positions (CPU picking index for the WebGPU renderer). Built in O(n) with a counting sort into
// flat typed arrays, so a 1M-node rebuild is a few tens of ms and costs ~12 bytes per node.
export class GridIndex {
  /** xs, ys: Float32Array of positions; ids: Uint32Array of node indices to index (visible nodes) */
  build(xs, ys, ids, count = ids.length) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < count; i++) { const n = ids[i], x = xs[n], y = ys[n]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (!count || !Number.isFinite(x0)) { this.count = 0; return this; }
    const w = Math.max(x1 - x0, 1e-9), h = Math.max(y1 - y0, 1e-9);
    const cells = Math.max(1, Math.min(1 << 22, Math.ceil(count / 2)));
    const cs = Math.max(Math.sqrt((w * h) / cells), Math.max(w, h) / 4096, 1e-9);
    const nx = Math.max(1, Math.ceil(w / cs) + 1), ny = Math.max(1, Math.ceil(h / cs) + 1);
    const start = new Uint32Array(nx * ny + 1), cellOf = new Uint32Array(count);
    for (let i = 0; i < count; i++) { const n = ids[i]; const c = Math.min(ny - 1, Math.floor((ys[n] - y0) / cs)) * nx + Math.min(nx - 1, Math.floor((xs[n] - x0) / cs)); cellOf[i] = c; start[c + 1]++; }
    for (let c = 0; c < nx * ny; c++) start[c + 1] += start[c];
    const fill = start.slice(0, nx * ny), items = new Uint32Array(count);
    for (let i = 0; i < count; i++) items[fill[cellOf[i]]++] = ids[i];
    Object.assign(this, { x0, y0, cs, nx, ny, start, items, count, xs, ys });
    return this;
  }
  /** call fn(nodeIndex) for every indexed node whose cell intersects the circle (x, y, r) */
  query(x, y, r, fn) {
    if (!this.count) return;
    const { x0, y0, cs, nx, ny, start, items } = this;
    const cx0 = Math.max(0, Math.floor((x - r - x0) / cs)), cx1 = Math.min(nx - 1, Math.floor((x + r - x0) / cs));
    const cy0 = Math.max(0, Math.floor((y - r - y0) / cs)), cy1 = Math.min(ny - 1, Math.floor((y + r - y0) / cs));
    if (cx1 < cx0 || cy1 < cy0) return;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const c = cy * nx + cx; for (let j = start[c]; j < start[c + 1]; j++) fn(items[j]); }
  }
}
