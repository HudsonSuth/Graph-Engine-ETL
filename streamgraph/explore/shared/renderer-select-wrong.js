// DELIBERATELY WRONG renderer selection (for the test suite only): Auto always picks WebGPU, even when there is no
// adapter or no navigator.gpu at all. explore/test/webgpu.test.js MUST fail against this (RENDERER_SELECT_IMPL=wrong).
import * as right from './renderer-select.js';
export const { RENDERER_PREFS, STORAGE_KEY, RENDERER_LABEL, normalizePref, probeWebGPU, fallbackAfterFailure, loadPref, savePref } = right;
export function chooseRenderer({ pref = 'auto' } = {}) {
  pref = normalizePref(pref);
  if (pref === 'webgl') return { renderer: 'webgl', pref, fallback: false, note: null };
  return { renderer: 'webgpu', pref, fallback: false, note: null }; // BUG: ignores hasApi / adapter
}
export async function resolveRenderer(pref, nav = globalThis.navigator, opts) {
  pref = normalizePref(pref);
  const probe = pref === 'webgl' ? {} : await probeWebGPU(nav, opts);
  return { ...chooseRenderer({ pref, ...probe }), adapter: probe.adapter ?? null };
}
