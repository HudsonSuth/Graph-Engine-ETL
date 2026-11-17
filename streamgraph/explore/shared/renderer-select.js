// Renderer selection for the explorer (WebGPU renderer, optional). Pure logic, no DOM: shared by the browser client and
// the unit tests (explore/test/webgpu.test.js). A DELIBERATELY WRONG twin lives in renderer-select-wrong.js.
//   pref: 'auto' | 'webgpu' | 'webgl'  (persisted in localStorage under STORAGE_KEY)
//   Auto picks WebGPU only when navigator.gpu exists AND an adapter was returned; otherwise WebGL.
//   An explicit 'webgpu' without an adapter falls back to WebGL with a visible note.
export const RENDERER_PREFS = ['auto', 'webgpu', 'webgl'];
export const STORAGE_KEY = 'explore.renderer';
export const RENDERER_LABEL = { webgpu: 'WebGPU', webgl: 'WebGL' };

export function normalizePref(v) { const s = String(v ?? '').trim().toLowerCase(); return RENDERER_PREFS.includes(s) ? s : 'auto'; }

/**
 * Decide the renderer from what was detected.
 * @param {{ pref?: string, hasApi?: boolean, adapter?: object|null, error?: string|null }} probe
 * @returns {{ renderer: 'webgpu'|'webgl', pref: string, fallback: boolean, note: string|null }}
 */
export function chooseRenderer({ pref = 'auto', hasApi = false, adapter = null, error = null } = {}) {
  pref = normalizePref(pref);
  if (pref === 'webgl') return { renderer: 'webgl', pref, fallback: false, note: null };
  const ok = !!hasApi && !!adapter;
  if (ok) return { renderer: 'webgpu', pref, fallback: false, note: null };
  const why = !hasApi ? 'this browser has no WebGPU (navigator.gpu is missing)' : error ? `WebGPU adapter request failed: ${error}` : 'no WebGPU adapter is available';
  // Auto quietly uses WebGL; an explicit WebGPU choice says why it could not be honoured
  return { renderer: 'webgl', pref, fallback: pref === 'webgpu', note: pref === 'webgpu' ? `WebGPU unavailable (${why}); using WebGL.` : null };
}

/** Probe the browser: does navigator.gpu exist, and does it hand out an adapter? Never throws. */
export async function probeWebGPU(nav = globalThis.navigator, { timeoutMs = 4000 } = {}) {
  const gpu = nav?.gpu;
  if (!gpu || typeof gpu.requestAdapter !== 'function') return { hasApi: false, adapter: null, error: null };
  try {
    const adapter = await Promise.race([gpu.requestAdapter({ powerPreference: 'high-performance' }), new Promise((_, rej) => setTimeout(() => rej(new Error('timed out')), timeoutMs))]);
    return { hasApi: true, adapter: adapter || null, error: null };
  } catch (e) { return { hasApi: true, adapter: null, error: String(e?.message || e) }; }
}

/** probe + choose in one step (what the explorer does at start-up and when the toolbar choice changes) */
export async function resolveRenderer(pref, nav = globalThis.navigator, opts) {
  pref = normalizePref(pref);
  if (pref === 'webgl') return { ...chooseRenderer({ pref }), adapter: null };
  const probe = await probeWebGPU(nav, opts);
  return { ...chooseRenderer({ pref, ...probe }), adapter: probe.adapter };
}

/** A renderer that failed after selection (device creation, pipeline error, device lost) always lands on WebGL. */
export function fallbackAfterFailure(pref, err) {
  return { renderer: 'webgl', pref: normalizePref(pref), fallback: true, note: `WebGPU failed to start (${String(err?.message || err || 'unknown error')}); using WebGL.` };
}

export function loadPref(storage = globalThis.localStorage, urlParam = null) {
  if (urlParam != null && RENDERER_PREFS.includes(String(urlParam).toLowerCase())) return normalizePref(urlParam); // ?renderer= wins for one load
  try { return normalizePref(storage?.getItem(STORAGE_KEY)); } catch { return 'auto'; }
}
export function savePref(pref, storage = globalThis.localStorage) { const p = normalizePref(pref); try { storage?.setItem(STORAGE_KEY, p); } catch { /* private mode */ } return p; }
