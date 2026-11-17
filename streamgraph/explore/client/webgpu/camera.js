// Camera + coordinate transforms for the WebGPU renderer. Same conventions as sigma 4 so saved views, fitCamera and the
// lasso keep working across renderers: graph coords -> "framed" coords (graph extent squeezed into ~[0,1], centred)
// -> viewport pixels (y down) through matrixFromCamera(state, viewport, graphDimensions, padding).
// Pure JS (no DOM, no GPU) so it is unit-tested against sigma's own matrix in explore/test/webgpu.test.js.
export const DEFAULT_PADDING = 30;

export function correctionRatio(vw, vh, gw, gh) {
  const viewportRatio = vh / vw, graphRatio = gh / gw;
  if ((viewportRatio < 1 && graphRatio > 1) || (viewportRatio > 1 && graphRatio < 1)) return 1;
  return Math.min(Math.max(graphRatio, 1 / graphRatio), Math.max(1 / viewportRatio, viewportRatio));
}
/** normalisation graph -> framed (sigma's createNormalizationFunction) */
export function normalization(extent) {
  const [x0, x1] = extent.x, [y0, y1] = extent.y;
  let ratio = Math.max(x1 - x0, y1 - y0); const dX = (x1 + x0) / 2 || 0, dY = (y1 + y0) / 2 || 0;
  if (!(ratio > 0) || !Number.isFinite(ratio)) ratio = 1;
  return { dX, dY, ratio, graphW: x1 - x0 || 1, graphH: y1 - y0 || 1 };
}
/**
 * Affine framed -> viewport transform for a camera state:
 *   vx = w/2 + kx * ( c*(fx-cx) + s*(fy-cy)),  vy = h/2 - ky * (-s*(fx-cx) + c*(fy-cy))
 * (sigma: scale(2*s/w*cr, 2*s/h*cr) * rotate(-angle) * scale(1/ratio) * translate(-x,-y), then clip -> pixels).
 */
export function viewTransform(cam, width, height, norm, padding = DEFAULT_PADDING) {
  const smallest = Math.min(width, height) - 2 * padding;
  const cr = correctionRatio(width, height, norm.graphW, norm.graphH);
  const k = (smallest * cr) / (cam.ratio || 1);
  const a = -(cam.angle || 0);
  return { w: width, h: height, k, c: Math.cos(a), s: Math.sin(a), cx: cam.x, cy: cam.y, ratio: cam.ratio || 1, norm };
}
export function framedToViewport(t, fx, fy) {
  const dx = fx - t.cx, dy = fy - t.cy;
  // sigma's rotate(m, r): m = [c, s, -s, c] (column-major) applied to (dx, dy)
  const rx = t.c * dx - t.s * dy, ry = t.s * dx + t.c * dy;
  return { x: t.w / 2 + t.k * rx, y: t.h / 2 - t.k * ry };
}
export function viewportToFramed(t, vx, vy) {
  const rx = (vx - t.w / 2) / t.k, ry = (t.h / 2 - vy) / t.k;
  // inverse rotation
  return { x: t.cx + t.c * rx + t.s * ry, y: t.cy - t.s * rx + t.c * ry };
}
export const graphToFramed = (n, x, y) => ({ x: 0.5 + (x - n.dX) / n.ratio, y: 0.5 + (y - n.dY) / n.ratio });
export const framedToGraph = (n, x, y) => ({ x: n.dX + n.ratio * (x - 0.5), y: n.dY + n.ratio * (y - 0.5) });
/** node radius in pixels: sigma with itemSizesReference 'screen' and zoomToSizeRatioFunction = sqrt */
export const sizeFactor = ratio => 1 / Math.sqrt(ratio || 1);

const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
/** Minimal sigma-compatible camera: x, y, ratio, angle; setState / getState / animate / reset; 'updated' events. */
export class Camera {
  constructor() { this.x = 0.5; this.y = 0.5; this.ratio = 1; this.angle = 0; this.minRatio = null; this.maxRatio = null; this._l = new Map(); this._anim = null; this.enabled = true; }
  on(ev, fn) { if (!this._l.has(ev)) this._l.set(ev, new Set()); this._l.get(ev).add(fn); return this; }
  off(ev, fn) { this._l.get(ev)?.delete(fn); return this; }
  removeListener(ev, fn) { return this.off(ev, fn); }
  emit(ev, a) { for (const f of [...(this._l.get(ev) || [])]) f(a); }
  getState() { return { x: this.x, y: this.y, ratio: this.ratio, angle: this.angle }; }
  getBoundedRatio(r) { if (typeof this.minRatio === 'number') r = Math.max(r, this.minRatio); if (typeof this.maxRatio === 'number') r = Math.min(r, this.maxRatio); return r; }
  setState(st = {}) {
    if (!this.enabled) return this;
    const prev = this.getState();
    if (Number.isFinite(st.x)) this.x = st.x; if (Number.isFinite(st.y)) this.y = st.y;
    if (Number.isFinite(st.ratio) && st.ratio > 0) this.ratio = this.getBoundedRatio(st.ratio);
    if (Number.isFinite(st.angle)) this.angle = st.angle;
    if (prev.x !== this.x || prev.y !== this.y || prev.ratio !== this.ratio || prev.angle !== this.angle) this.emit('updated', this.getState());
    return this;
  }
  updateState(fn) { return this.setState(fn(this.getState())); }
  isAnimating() { return !!this._anim; }
  animate(state, opts = {}, cb) {
    const duration = typeof opts === 'object' && opts ? opts.duration ?? 150 : 150;
    if (this._anim) { cancelAnimationFrame(this._anim.raf); const r = this._anim.resolve; this._anim = null; r(); }
    if (!duration || typeof requestAnimationFrame !== 'function') { this.setState(state); cb?.(); return Promise.resolve(); }
    const from = this.getState(), to = { ...from, ...state }, t0 = performance.now();
    return new Promise(resolve => {
      const step = () => { const k = Math.min(1, (performance.now() - t0) / duration), e = ease(k);
        this.setState({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, ratio: from.ratio * Math.pow(to.ratio / from.ratio, e), angle: from.angle + (to.angle - from.angle) * e });
        if (k < 1) this._anim.raf = requestAnimationFrame(step); else { this._anim = null; cb?.(); resolve(); } };
      this._anim = { raf: requestAnimationFrame(step), resolve };
    });
  }
  reset(opts) { return this.animate({ x: 0.5, y: 0.5, ratio: 1, angle: 0 }, opts); }
  animatedZoom(o = {}) { const f = typeof o === 'number' ? o : o.factor || 1.5; return this.animate({ ratio: this.getBoundedRatio(this.ratio / f) }, { duration: o.duration ?? 250 }); }
  animatedUnzoom(o = {}) { const f = typeof o === 'number' ? o : o.factor || 1.5; return this.animate({ ratio: this.getBoundedRatio(this.ratio * f) }, { duration: o.duration ?? 250 }); }
  animatedReset(o) { return this.reset(o); }
}
