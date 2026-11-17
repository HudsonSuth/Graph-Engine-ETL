// WebGPU drawing core for the explorer: instanced quads for nodes (SDF circle / rounded square / diamond / triangle with
// a 2 px ring) and instanced quads for edges (anti-aliased, optional dash). Hand-written WGSL, no dependencies.
// Everything graph-shaped arrives as flat typed arrays (see gpu-renderer.js); the camera is a 64-byte uniform, so
// panning and zooming re-upload nothing but that uniform.
//
// Buffers (storage, read-only in the shaders):
//   pos    : array<vec2f>  raw graph x, y per node index (normalisation to the framed space happens in the shader)
//   nstyle : array<vec4u>  (bitcast<u32>(radius px at ratio 1), fill rgba8, ring rgba8, flags: bits 0-1 shape)
//   order  : array<u32>    node indices to draw, back to front (hidden nodes are simply left out)
//   edges  : array<vec4u>  (source index, target index, rgba8, bitcast<u32>(width px; negative = dashed))
const WGSL = /* wgsl */`
struct U { a: vec4f, b: vec4f, c: vec4f, d: vec4f };
// a = (viewport w, h, camera x, camera y)   b = (cos, sin, px per framed unit, size factor)
// c = (norm dX, norm dY, 1 / norm ratio, ring px)   d = (dash px, gap px, min edge px, 0)
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> pos: array<vec2f>;
@group(0) @binding(2) var<storage, read> nstyle: array<vec4u>;
@group(0) @binding(3) var<storage, read> order: array<u32>;
@group(0) @binding(4) var<storage, read> edges: array<vec4u>;

fn toPx(p: vec2f) -> vec2f {
  let f = vec2f(0.5, 0.5) + (p - u.c.xy) * u.c.z;
  let d = f - u.a.zw;
  let r = vec2f(u.b.x * d.x - u.b.y * d.y, u.b.y * d.x + u.b.x * d.y) * u.b.z;
  return vec2f(u.a.x * 0.5 + r.x, u.a.y * 0.5 - r.y);
}
fn toClip(px: vec2f) -> vec4f { return vec4f(px.x / u.a.x * 2.0 - 1.0, 1.0 - px.y / u.a.y * 2.0, 0.0, 1.0); }
fn rgba(c: u32) -> vec4f { return vec4f(f32(c & 255u), f32((c >> 8u) & 255u), f32((c >> 16u) & 255u), f32((c >> 24u) & 255u)) / 255.0; }
// quad corner for vertex 0..5 (two triangles), computed rather than indexed from a const array
fn quad(vi: u32) -> vec2f { return vec2f(select(-1.0, 1.0, vi == 1u || vi == 2u || vi == 4u), select(-1.0, 1.0, vi == 2u || vi == 4u || vi == 5u)); }

struct NOut { @builtin(position) pos: vec4f, @location(0) local: vec2f, @location(1) @interpolate(flat) r: f32,
  @location(2) @interpolate(flat) fill: vec4f, @location(3) @interpolate(flat) ring: vec4f, @location(4) @interpolate(flat) shape: u32 };
@vertex fn vsNode(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> NOut {
  let n = order[ii];
  let st = nstyle[n];
  let r = max(bitcast<f32>(st.x) * u.b.w, 1.0);
  let corner = quad(vi);
  let ext = r + 1.5;
  let px = toPx(pos[n]) + corner * ext;
  var o: NOut;
  o.pos = toClip(px); o.local = corner * ext; o.r = r; o.fill = rgba(st.y); o.ring = rgba(st.z); o.shape = st.w & 3u;
  return o;
}
fn sdShape(p: vec2f, r: f32, shape: u32) -> f32 {
  if (shape == 1u) { // rounded square (sigma sdfSquare cornerRadius 0.15)
    let h = r * 0.86; let cr = 0.15 * h; let q = abs(p) - vec2f(h - cr);
    return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - cr;
  }
  if (shape == 2u) { return (abs(p.x) + abs(p.y) - r) * 0.70710678; } // diamond
  if (shape == 3u) { // equilateral triangle pointing up on screen (local y is down), circumradius r
    let k = 1.7320508; let h = r * 0.8660254;
    var q = vec2f(abs(p.x) - h, -p.y + h / k);
    if (q.x + k * q.y > 0.0) { q = vec2f(q.x - k * q.y, -k * q.x - q.y) / 2.0; }
    q.x = q.x - clamp(q.x, -2.0 * h, 0.0);
    return -length(q) * sign(q.y);
  }
  return length(p) - r; // circle
}
@fragment fn fsNode(i: NOut) -> @location(0) vec4f {
  let d = sdShape(i.local, i.r, i.shape);
  let a = clamp(0.5 - d, 0.0, 1.0);
  if (a <= 0.0) { discard; }
  let ringW = min(u.c.w, i.r * 0.5);
  let t = clamp(d + ringW + 0.5, 0.0, 1.0); // 0 inside the fill, 1 on the ring
  let col = mix(i.fill, i.ring, t);
  return vec4f(col.rgb * col.a * a, col.a * a); // premultiplied
}

struct EOut { @builtin(position) pos: vec4f, @location(0) across: f32, @location(1) along: f32,
  @location(2) @interpolate(flat) hw: f32, @location(3) @interpolate(flat) color: vec4f, @location(4) @interpolate(flat) dashed: u32 };
@vertex fn vsEdge(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> EOut {
  let e = edges[ii];
  let a = toPx(pos[e.x]); let b = toPx(pos[e.y]);
  let wRaw = bitcast<f32>(e.w);
  let w = max(abs(wRaw) * u.b.w, u.d.z);
  var dir = b - a; let len = length(dir);
  if (len > 1e-4) { dir = dir / len; } else { dir = vec2f(1.0, 0.0); }
  let nrm = vec2f(-dir.y, dir.x);
  let corner = quad(vi);
  let hw = w * 0.5 + 1.0;
  let t = corner.x * 0.5 + 0.5;
  let px = a + dir * (len * t) + nrm * (corner.y * hw);
  var o: EOut;
  o.pos = toClip(px); o.across = corner.y * hw; o.along = len * t; o.hw = w * 0.5; o.color = rgba(e.z);
  o.dashed = select(0u, 1u, wRaw < 0.0);
  return o;
}
@fragment fn fsEdge(i: EOut) -> @location(0) vec4f {
  // sub-pixel lines fade instead of aliasing
  var a = clamp(i.hw + 0.5 - abs(i.across), 0.0, 1.0) * min(1.0, i.hw * 2.0 + 0.25);
  if (i.dashed == 1u) { let period = u.d.x + u.d.y; if (i.along - floor(i.along / period) * period > u.d.x) { discard; } }
  if (a <= 0.0) { discard; }
  return vec4f(i.color.rgb * i.color.a * a, i.color.a * a);
}`;

const keep = {};
let devicePromise = null; // one device per page, shared by renderer instances (re-created after a device loss)
const lostListeners = new Set();
export class GpuError extends Error { constructor(msg, kind) { super(msg); this.kind = kind; } }

export async function getDevice(adapter = null) {
  if (devicePromise) return devicePromise;
  devicePromise = (async () => {
    if (!navigator.gpu) throw new GpuError('navigator.gpu is missing', 'unsupported');
    adapter ||= await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new GpuError('no WebGPU adapter', 'unsupported');
    const lim = adapter.limits, want = 1 << 30;
    const device = await adapter.requestDevice({ requiredLimits: { maxStorageBufferBindingSize: Math.min(lim.maxStorageBufferBindingSize, want), maxBufferSize: Math.min(lim.maxBufferSize, want) } });
    keep.adapter = adapter; keep.gpu = navigator.gpu; device.__adapter = adapter; // keep the adapter (and its instance) alive: Chrome can drop the instance when the adapter is collected
    const info = adapter.info || {};
    device.__info = { vendor: info.vendor || '', architecture: info.architecture || '', description: info.description || '', device: info.device || '', isFallbackAdapter: !!(adapter.isFallbackAdapter ?? info.isFallbackAdapter) };
    device.lost.then(l => { devicePromise = null; for (const f of [...lostListeners]) f(l); });
    device.addEventListener?.('uncapturederror', e => console.warn('WebGPU error:', e.error?.message));
    return device;
  })();
  devicePromise.catch(() => { devicePromise = null; });
  return devicePromise;
}
export const onDeviceLost = fn => { lostListeners.add(fn); return () => lostListeners.delete(fn); };

const SIZES = { pos: 8, nstyle: 16, order: 4, edges: 16 };
export const MAX_IN_FLIGHT = 2;
export class GpuCore {
  /**
   * readback (debug / CI only, ?gpuReadback=1): draw into an offscreen texture and copy the pixels to a 2D canvas instead
   * of presenting a WebGPU canvas. Needed on GPU-less VMs where Chrome's SwiftShader WebGPU destroys the device as soon as a
   * canvas is presented; far slower, never used for benchmarks on real hardware.
   */
  constructor(device, canvas, { readback = false } = {}) {
    this.device = device; this.canvas = canvas; this.readback = readback;
    if (readback) { this.ctx2d = canvas.getContext('2d'); this.format = 'rgba8unorm'; }
    else {
      this.ctx = canvas.getContext('webgpu');
      if (!this.ctx) throw new GpuError('canvas.getContext("webgpu") returned null', 'context');
      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.ctx.configure({ device, format: this.format, alphaMode: 'premultiplied' });
    }
    const module = device.createShaderModule({ code: WGSL });
    this.module = module;
    const blend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
    this.layout = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ...[1, 2, 3, 4].map(binding => ({ binding, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } }))] });
    const pl = device.createPipelineLayout({ bindGroupLayouts: [this.layout] });
    const mk = (vs, fs) => device.createRenderPipeline({ layout: pl, vertex: { module, entryPoint: vs }, fragment: { module, entryPoint: fs, targets: [{ format: this.format, blend }] }, primitive: { topology: 'triangle-list' } });
    this.nodePipe = mk('vsNode', 'fsNode'); this.edgePipe = mk('vsEdge', 'fsEdge');
    this.uniform = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.bufs = {}; this.caps = {}; this.counts = { nodes: 0, order: 0, edges: 0 };
    for (const k of Object.keys(SIZES)) this.ensure(k, 1024);
    this.bytes = 0;
  }
  /** grow a storage buffer to hold n items (power-of-two growth); throws GpuError('out-of-memory') on OOM */
  ensure(name, n) {
    const need = Math.max(4, n);
    if (this.caps[name] >= need) return;
    let cap = this.caps[name] || 1024; while (cap < need) cap *= 2;
    const size = cap * SIZES[name];
    const max = this.device.limits.maxStorageBufferBindingSize;
    if (size > max) throw new GpuError(`${name} buffer needs ${(size / 1048576).toFixed(0)} MB, over the device limit of ${(max / 1048576).toFixed(0)} MB`, 'out-of-memory');
    this.device.pushErrorScope('out-of-memory');
    const buf = this.device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.oomCheck = this.device.popErrorScope().then(err => { if (err) { this.oom = err.message || 'out of memory'; this.onError?.(new GpuError(`GPU out of memory allocating ${name} (${(size / 1048576).toFixed(0)} MB)`, 'out-of-memory')); } });
    this.bufs[name]?.destroy(); this.bufs[name] = buf; this.caps[name] = cap; this.bindGroup = null;
  }
  write(name, arr, count) { this.ensure(name, count); if (count) this.device.queue.writeBuffer(this.bufs[name], 0, arr.buffer, arr.byteOffset, count * SIZES[name]); }
  setNodes(pos, nstyle, n) { this.write('pos', pos, n); this.write('nstyle', nstyle, n); this.counts.nodes = n; }
  setPositions(pos, n) { this.write('pos', pos, n); }
  setOrder(order, n) { this.write('order', order, n); this.counts.order = n; }
  setEdges(edges, n) { this.write('edges', edges, n); this.counts.edges = n; }
  resize(w, h) { if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = Math.max(1, w); this.canvas.height = Math.max(1, h); } }
  /** u: Float32Array(16) laid out as struct U; bg: [r, g, b, a] 0..1 */
  render(u, bg) {
    const d = this.device;
    this.inFlight = (this.inFlight || 0) + 1; // frames submitted but not finished on the GPU (renderer keeps this <= MAX_IN_FLIGHT)
    const finish = () => { this.inFlight--; this.onIdle?.(); };
    d.queue.writeBuffer(this.uniform, 0, u.buffer, u.byteOffset, 64);
    this.bindGroup ||= d.createBindGroup({ layout: this.layout, entries: [{ binding: 0, resource: { buffer: this.uniform } }, ...['pos', 'nstyle', 'order', 'edges'].map((k, i) => ({ binding: i + 1, resource: { buffer: this.bufs[k] } }))] });
    const enc = d.createCommandEncoder();
    const target = this.readback ? this.readbackTarget() : this.ctx.getCurrentTexture();
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: target.createView(), clearValue: { r: bg[0] * bg[3], g: bg[1] * bg[3], b: bg[2] * bg[3], a: bg[3] }, loadOp: 'clear', storeOp: 'store' }] });
    pass.setBindGroup(0, this.bindGroup);
    if (this.counts.edges) { pass.setPipeline(this.edgePipe); pass.draw(6, this.counts.edges); }
    if (this.counts.order) { pass.setPipeline(this.nodePipe); pass.draw(6, this.counts.order); }
    pass.end();
    if (this.readback && !this.rb.busy) {
      const { w, h, stride } = this.rb;
      enc.copyTextureToBuffer({ texture: target }, { buffer: this.rb.buf, bytesPerRow: stride }, [w, h]);
      d.queue.submit([enc.finish()]);
      this.rb.busy = this.rb.buf.mapAsync(GPUMapMode.READ).then(() => {
        const src = new Uint8Array(this.rb.buf.getMappedRange()), img = new ImageData(w, h);
        for (let y = 0; y < h; y++) img.data.set(src.subarray(y * stride, y * stride + w * 4), y * w * 4);
        this.rb.buf.unmap(); this.ctx2d.putImageData(img, 0, 0);
      }).catch(() => {}).finally(() => { this.rb.busy = null; });
      this.lastDone = this.rb.busy.then(() => performance.now()); this.lastDone.then(finish, finish);
      return;
    }
    d.queue.submit([enc.finish()]);
    this.lastDone = d.queue.onSubmittedWorkDone().then(() => performance.now()); this.lastDone.then(finish, finish);
  }
  readbackTarget() {
    const w = this.canvas.width, h = this.canvas.height;
    if (!this.rb || this.rb.w !== w || this.rb.h !== h) {
      if (this.rb?.busy) return this.rb.tex; // resize after the copy in flight
      this.rb?.tex.destroy(); this.rb?.buf.destroy();
      const stride = Math.ceil((w * 4) / 256) * 256;
      this.rb = { w, h, stride, busy: null, tex: this.device.createTexture({ size: [w, h], format: this.format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC }),
        buf: this.device.createBuffer({ size: stride * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }) };
    }
    return this.rb.tex;
  }
  async done() { await this.device.queue.onSubmittedWorkDone(); if (this.rb?.busy) await this.rb.busy; }
  destroy() { for (const b of Object.values(this.bufs)) b.destroy(); this.uniform.destroy(); if (this.rb) { this.rb.tex.destroy(); try { this.rb.buf.destroy(); } catch { /* mapped */ } } try { this.ctx?.unconfigure(); } catch { /* already gone */ } this.bufs = {}; }
}
