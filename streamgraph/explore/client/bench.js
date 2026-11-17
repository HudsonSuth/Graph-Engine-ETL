// WebGPU vs WebGL renderer benchmark (/explore/bench). Generates synthetic graphs IN THE BROWSER (no explore API data,
// so no ABAC question), draws each with both renderers and records upload/init time, median + p95 frame time during a
// scripted ~5 s pan/zoom, and out-of-memory / device-lost. A renderer's size ladder stops once it drops below MIN_FPS or
// errors. Query: ?sizes=10000,50000&renderers=webgl,webgpu&duration=5000&auto=1&post=1
import Graph from 'graphology';
import Sigma from 'sigma';
import { sdfCircle, sdfSquare, sdfDiamond, sdfTriangle, pathLine, pathLoop, pathCurved, extremityArrow, layerDashed } from 'sigma/rendering';
import { layerBorder } from '@sigma/node-border';
import { WebGPURenderer } from './webgpu/gpu-renderer.js';
import { getDevice } from './webgpu/gpu-core.js';
import { probeWebGPU } from '../shared/renderer-select.js';
import { BENCH_SCHEMA, BENCH_SIZES, BENCH_RENDERERS, MIN_FPS, EDGE_FACTOR, frameStats, fpsOf, classifyRun, stopsLadder, summarize, validateBenchResult } from '../shared/bench-schema.js';

const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const raf = () => new Promise(r => requestAnimationFrame(r));
const PALETTE = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'];
const SHAPES = ['circle', 'circle', 'circle', 'square', 'diamond', 'triangle'];
const COLORS = { background: '#ffffff', text: '#1f2937', muted: '#9ca3af', dim: '#e5e7eb', select: '#ff3ea5', hover: '#2563eb', panel: '#ffffff' };

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** communities of ~200 nodes on a sunflower spiral, gaussian blobs; edges ~= EDGE_FACTOR * n, 85% inside a community */
export function makeGraph(n, seed = 7) {
  const r = rng(seed), g = new Graph({ type: 'directed', multi: true, allowSelfLoops: false });
  const per = 200, nc = Math.max(1, Math.ceil(n / per)), golden = Math.PI * (3 - Math.sqrt(5));
  const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  for (let i = 0; i < n; i++) {
    const c = Math.floor(i / per), rad = Math.sqrt(c + 0.5) * 60, ang = c * golden;
    g.addNode(i, { x: Math.cos(ang) * rad + gauss() * 12, y: Math.sin(ang) * rad + gauss() * 12, size: 3 + (i % 7 === 0 ? 4 : r() * 2), color: PALETTE[c % PALETTE.length], borderColor: PALETTE[c % PALETTE.length], shape: SHAPES[i % SHAPES.length], label: `n${i}`, labelShow: 'auto', opacity: 1 });
  }
  const m = Math.round(n * EDGE_FACTOR);
  for (let j = 0; j < m; j++) {
    const a = Math.floor(r() * n), c = Math.floor(a / per);
    let b = r() < 0.85 ? Math.min(n - 1, c * per + Math.floor(r() * per)) : Math.floor(r() * n); if (b === a) b = (a + 1) % n;
    g.addEdge(a, b, { size: 1, color: '#c3cad5', dashed: j % 23 === 0 });
  }
  return g;
}
const styles = {
  nodeSize: (a, s) => (a.size || 4) * (s.isHovered ? 1.35 : 1), nodeColor: a => a.color, nodeBorder: a => a.borderColor || a.color, nodeShape: a => a.shape, nodeOpacity: a => a.opacity ?? 1,
  label: a => a.label, labelSize: () => 14, labelColor: () => COLORS.text, labelVisibility: () => 'auto',
  edgeSize: a => a.size || 1, edgeColor: a => a.color, edgeDashed: a => !!a.dashed, background: () => COLORS.background, backdrop: () => COLORS.panel,
};
/** the same sigma configuration the explorer uses (shapes, 2 px ring, dashed edge layer) */
function makeSigma(graph, container) {
  return new Sigma(graph, container, {
    primitives: {
      nodes: { shapes: [sdfCircle(), sdfSquare({ cornerRadius: 0.15 }), sdfDiamond(), sdfTriangle()], layers: [layerBorder({ borders: [{ size: 2, color: { attribute: 'borderColor', default: '#000' }, mode: 'pixels' }, { size: 0, color: { attribute: 'color' }, fill: true }] })] },
      edges: { paths: [pathLine(), pathLoop(), pathCurved()], extremities: [extremityArrow()], layers: [layerDashed({ dashSize: { value: 7, mode: 'pixels' }, gapSize: { value: 5, mode: 'pixels' }, gapColor: { attribute: 'gapColor' } })] },
    },
    styles: {
      nodes: { x: { attribute: 'x' }, y: { attribute: 'y' }, shape: { attribute: 'shape', defaultValue: 'circle' }, size: (a, s) => (a.size || 4) * (s.isHovered ? 1.35 : 1), color: { attribute: 'color' }, borderColor: { attribute: 'borderColor' }, label: { attribute: 'label' }, labelSize: () => 14, labelColor: () => COLORS.text, opacity: { attribute: 'opacity', defaultValue: 1 } },
      edges: { size: { attribute: 'size' }, color: { attribute: 'color' }, gapColor: a => (a.dashed ? 'rgba(0,0,0,0)' : a.color), parallelPath: 'curved' },
      stage: { background: () => COLORS.background },
    },
    settings: { enableNodeDrag: false, enableEdgeEvents: false, hideEdgesOnMove: false, labelRenderedSizeThreshold: 6, labelDensity: 0.7, zoomToSizeRatioFunction: r => Math.sqrt(r), itemSizesReference: 'screen', autoRescale: true },
  });
}
const isOom = e => /out of memory|allocation failed|Invalid array length|Array buffer allocation|RangeError/i.test(String(e?.message || e)) || e?.kind === 'out-of-memory';

async function runOne(kind, n, { durationMs, minFps, stage }) {
  const run = { renderer: kind, nodes: n, edges: 0, status: 'error', genMs: null, initMs: null, uploadMs: null, frames: 0, frameMs: frameStats([]), fps: null, cpuMs: frameStats([]), oom: false, deviceLost: false, error: null };
  let graph = null, r = null, failure = null, lostGL = null;
  const box = document.createElement('div'); box.className = 'bench-stage-inner'; stage.replaceChildren(box);
  try {
    const tg = performance.now(); graph = makeGraph(n); run.edges = graph.size; run.genMs = Math.round(performance.now() - tg);
    await raf();
    const t0 = performance.now();
    if (kind === 'webgl') {
      r = makeSigma(graph, box);
      for (const c of box.querySelectorAll('canvas')) c.addEventListener('webglcontextlost', () => { lostGL = 'webglcontextlost'; });
      r.refresh();
    } else {
      const device = await getDevice();
      r = new WebGPURenderer(graph, box, { device, styles, onFail: e => { failure = e; }, settings: { enableNodeDrag: false, readback: params.get('gpuReadback') === '1' } });
      r.refresh(); await r.core.done(); await r.core.oomCheck; run.uploadMs = Math.round(r.stats.uploadMs * 10) / 10;
    }
    await raf(); await raf();
    run.initMs = Math.round(performance.now() - t0);
    if (failure) throw failure;
    // scripted pan / zoom: a circle around the centre while zooming between 1x and ~3.3x, one camera update per frame
    const cam = r.getCamera(), frames = [], cpu = [], done = [];
    const gpu = kind !== 'webgl';
    await new Promise(res => {
      let last = null; const start = performance.now();
      const step = ts => {
        if (!gpu && last != null) frames.push(ts - last); last = ts;
        const t = (performance.now() - start) / durationMs;
        if (t >= 1 || failure || lostGL) return res();
        // WebGPU: at most MAX_IN_FLIGHT frames queued; a new camera frame is drawn only when the GPU has room
        if (!gpu || r.core.inFlight < 2) {
          cam.setState({ x: 0.5 + 0.22 * Math.sin(2 * Math.PI * t), y: 0.5 + 0.22 * Math.cos(2 * Math.PI * t), ratio: 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(4 * Math.PI * t)), angle: 0 });
          const c0 = performance.now(); r.render(); cpu.push(performance.now() - c0);
          if (gpu && r.core.lastDone) r.core.lastDone.then(at => done.push(at));
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (gpu) { await r.core.done(); await r.core.oomCheck; done.sort((a, b) => a - b); for (let k = 1; k < done.length; k++) frames.push(Math.max(done[k] - done[k - 1], 1000 / 240)); }
    run.frames = frames.length; run.frameMs = frameStats(frames); run.cpuMs = frameStats(cpu); run.fps = fpsOf(run.frameMs.median);
    if (failure) throw failure;
    if (lostGL) { run.deviceLost = lostGL; run.error = 'WebGL context lost'; }
  } catch (e) {
    run.error = String(e?.message || e).slice(0, 500);
    if (isOom(e)) run.oom = true;
    if (e?.kind === 'device-lost') run.deviceLost = run.error;
  } finally {
    try { r?.kill(); } catch { /* already gone */ }
    graph?.clear(); graph = null; box.remove();
  }
  run.status = classifyRun(run, minFps);
  return run;
}

async function environment() {
  const probe = await probeWebGPU();
  const a = probe.adapter, info = a?.info || {};
  let webgl = null;
  try { const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl'); const ext = gl?.getExtension('WEBGL_debug_renderer_info'); webgl = gl ? { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR), version: gl.getParameter(gl.VERSION) } : null; } catch { /* no WebGL */ }
  return {
    webgpu: { available: !!a, hasApi: probe.hasApi, error: probe.error, adapter: a ? { vendor: info.vendor || '', architecture: info.architecture || '', description: info.description || '', device: info.device || '', isFallbackAdapter: !!(a.isFallbackAdapter ?? info.isFallbackAdapter), maxStorageBufferBindingSize: a.limits.maxStorageBufferBindingSize, maxBufferSize: a.limits.maxBufferSize } : null },
    webgl, devicePixelRatio: window.devicePixelRatio || 1, viewport: { width: $('#stage').clientWidth, height: $('#stage').clientHeight },
    hardwareConcurrency: navigator.hardwareConcurrency || null, deviceMemoryGB: navigator.deviceMemory || null,
  };
}

// progress is kept in localStorage so a run that crashes the tab (e.g. out of memory at 1M nodes) can still be saved
const PROGRESS_KEY = 'webgpu-bench-progress';
function saveProgress(doc, extra) { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...doc, ...(extra ? { incomplete: extra } : {}) })); } catch { /* quota */ } }
const B = window.__bench = { done: false, running: false, result: null, posted: null, error: null };
function render(doc) {
  const rows = doc.runs.map(r => `<tr class="st-${r.status}"><td>${r.renderer}</td><td class="num">${r.nodes.toLocaleString()}</td><td class="num">${r.edges.toLocaleString()}</td><td>${r.status}</td><td class="num">${r.genMs ?? ''}</td><td class="num">${r.initMs ?? ''}</td><td class="num">${r.uploadMs ?? ''}</td><td class="num">${r.frameMs?.median ?? ''}</td><td class="num">${r.frameMs?.p95 ?? ''}</td><td class="num">${r.fps ?? ''}</td><td class="num">${r.cpuMs?.median ?? ''}</td><td>${r.oom ? 'yes' : ''}</td><td>${r.deviceLost ? 'yes' : ''}</td><td class="err">${r.error ? String(r.error).replace(/</g, '&lt;') : ''}</td></tr>`).join('');
  $('#results tbody').innerHTML = rows;
  const s = doc.summary || summarize(doc.runs);
  $('#summary').textContent = Object.entries(s).map(([k, v]) => `${k}: interactive (≥ ${doc.settings.minFps} fps) up to ${v.maxOkNodes.toLocaleString()} nodes${v.firstFailure ? `; stopped at ${v.firstFailure.nodes.toLocaleString()} (${v.firstFailure.status}: ${v.firstFailure.reason})` : ''}`).join('   ·   ');
}
async function run() {
  if (B.running) return; B.running = true; B.done = false; B.error = null;
  $('#run').disabled = true;
  try {
    const sizes = [...document.querySelectorAll('[name=size]:checked')].map(i => Number(i.value)).sort((a, b) => a - b);
    const renderers = [...document.querySelectorAll('[name=renderer]:checked')].map(i => i.value);
    const durationMs = Math.max(1000, Number($('#duration').value) || 5000), minFps = Number($('#minfps').value) || MIN_FPS;
    const env = await environment();
    const doc = { schema: BENCH_SCHEMA, createdAt: new Date().toISOString(), userAgent: navigator.userAgent, url: location.href, environment: env,
      settings: { sizes, renderers, edgeFactor: EDGE_FACTOR, durationMs, minFps, seed: 7, gpuReadback: params.get('gpuReadback') === '1', frameTime: 'WebGL: interval between animation frames, a render each frame (vsync-capped; 16.7 ms = 60 fps). WebGPU: interval between GPU frame completions with at most 2 frames in flight, a new camera position each frame (completions of frames in the same vsync are floored at 4.2 ms)', cpuTime: 'time inside render() per frame (CPU side; GPU work is asynchronous)' }, runs: [], summary: null };
    B.result = doc;
    // sizes ascending, renderers interleaved per size (a tab crash at the biggest size then loses as little as possible);
    // each renderer's ladder stops on its own
    const stopped = {};
    for (const n of sizes) for (const kind of renderers) {
      if (stopped[kind] || (kind === 'webgpu' && !env.webgpu.available)) {
        doc.runs.push({ renderer: kind, nodes: n, edges: Math.round(n * EDGE_FACTOR), status: 'skipped', genMs: null, initMs: null, uploadMs: null, frames: 0, frameMs: frameStats([]), fps: null, cpuMs: frameStats([]), oom: false, deviceLost: false, error: stopped[kind] ? `not run: stopped after ${stopped[kind]}` : `WebGPU not available${env.webgpu.error ? ': ' + env.webgpu.error : ''}` });
        render(doc); continue;
      }
      $('#status').textContent = `Running ${kind} at ${n.toLocaleString()} nodes…`;
      saveProgress(doc, { running: { renderer: kind, nodes: n } });
      const r = await runOne(kind, n, { durationMs, minFps, stage: $('#stage') });
      doc.runs.push(r); render(doc); saveProgress(doc, null);
      if (stopsLadder(r.status)) stopped[kind] = `${n.toLocaleString()} nodes (${r.status})`;
      await sleep(400); // let the GC and the GPU process settle between sizes
    }
    localStorage.removeItem(PROGRESS_KEY);
    doc.summary = summarize(doc.runs); render(doc);
    const problems = validateBenchResult(doc);
    $('#status').textContent = problems.length ? `Done, but the result failed validation: ${problems.join('; ')}` : `Done: ${doc.runs.length} runs.`;
    if (params.get('post') === '1') await post();
  } catch (e) { B.error = String(e?.message || e); $('#status').textContent = 'Benchmark failed: ' + B.error; }
  finally { B.running = false; B.done = true; $('#run').disabled = false; document.body.dataset.done = '1'; }
}
function download() {
  if (!B.result) return;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(B.result, null, 2)], { type: 'application/json' }));
  a.download = `webgpu-bench-${B.result.createdAt.replace(/[:.]/g, '-')}.json`; a.click();
}
async function post() {
  if (!B.result) return null;
  try {
    const r = await fetch('/api/explore/bench/webgpu', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(B.result) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error + (j.problems ? ': ' + j.problems.join('; ') : ''));
    B.posted = j.file; $('#post-status').textContent = `Saved on the server as ${j.file}`; return j;
  } catch (e) { $('#post-status').textContent = 'Could not save on the server: ' + e.message; B.posted = null; return null; }
}
function init() {
  const sizes = (params.get('sizes') || BENCH_SIZES.join(',')).split(',').map(Number).filter(n => n > 0);
  const want = new Set((params.get('renderers') || BENCH_RENDERERS.join(',')).split(','));
  $('#sizes').innerHTML = [...new Set([...BENCH_SIZES, ...sizes])].sort((a, b) => a - b).map(n => `<label><input type="checkbox" name="size" value="${n}" ${sizes.includes(n) ? 'checked' : ''}> ${n >= 1e6 ? n / 1e6 + 'M' : n / 1000 + 'k'}</label>`).join('');
  $('#renderers').innerHTML = BENCH_RENDERERS.map(k => `<label><input type="checkbox" name="renderer" value="${k}" ${want.has(k) ? 'checked' : ''}> ${k === 'webgpu' ? 'WebGPU' : 'WebGL (sigma)'}</label>`).join('');
  $('#duration').value = params.get('duration') || 5000; $('#minfps').value = params.get('minfps') || MIN_FPS;
  $('#run').onclick = run; $('#download').onclick = download; $('#post').onclick = post;
  probeWebGPU().then(p => { $('#env').textContent = p.adapter ? `WebGPU adapter: ${[p.adapter.info?.vendor, p.adapter.info?.architecture, p.adapter.info?.description].filter(Boolean).join(' · ') || 'yes'}${p.adapter.isFallbackAdapter || p.adapter.info?.isFallbackAdapter ? ' (software fallback)' : ''}` : `No WebGPU adapter${p.error ? ': ' + p.error : p.hasApi ? '' : ' (navigator.gpu missing)'} — only WebGL will run.`; });
  const prev = (() => { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null'); } catch { return null; } })();
  if (prev?.incomplete?.running && params.get('auto') !== '1') {
    const c = prev.incomplete.running; prev.runs.push({ renderer: c.renderer, nodes: c.nodes, edges: Math.round(c.nodes * EDGE_FACTOR), status: 'error', genMs: null, initMs: null, uploadMs: null, frames: 0, frameMs: frameStats([]), fps: null, cpuMs: frameStats([]), oom: true, deviceLost: false, error: 'the browser tab crashed or was closed during this run (likely out of memory)' });
    prev.summary = summarize(prev.runs); delete prev.incomplete; B.result = prev; render(prev);
    $('#status').textContent = `The previous run stopped at ${c.renderer} ${c.nodes.toLocaleString()} nodes (tab crashed?). Its results are below: Download JSON or Send to server, or Run again.`;
    localStorage.removeItem(PROGRESS_KEY);
  }
  document.body.dataset.ready = '1';
  if (params.get('auto') === '1') run();
}
init();
