// Data-driven style engine (SPEC §10). Pure: same code runs in the browser and in tests.
import { compileSymbols, checkSymbolChannel, resolveSymbol as realResolve, wrongResolveSymbol } from './symbols.js';
const resolveSymbol = globalThis.process?.env?.SYMBOLS_IMPL === 'wrong' ? wrongResolveSymbol : realResolve; // §20.7 test hook (Node only)
// A style config is versioned JSON; invalid parts fail soft (defaults + warnings), never throw.
export const STYLE_VERSION = 1;
export const SHAPES = ['circle', 'square', 'diamond', 'triangle', 'hexagon'];
export const RENDERED_SHAPES = new Set(['circle', 'square', 'diamond', 'triangle']); // hexagon draws as circle in v1 (no WebGL shape yet)
const NODE_CHANNELS = new Set(['color', 'size', 'shape', 'icon', 'label', 'labelVisible', 'labelMaxLength', 'fontSize', 'borderColor', 'borderWidth', 'badges', 'opacity',
  'frame', 'frameDash', 'status', 'glyph', 'corners', 'sidc']); // symbol channels (SPEC §20), used only when the config has a "symbols" block
const LINK_CHANNELS = new Set(['color', 'width', 'dash', 'arrow', 'curvature', 'opacity', 'label']);
const SYMBOL_CHANNELS = new Set(['frame', 'frameDash', 'status', 'glyph', 'corners', 'sidc']);
const OPS = new Set(['eq', 'neq', 'in', '>=', '<=', '>', '<', 'contains', 'exists']);

// Two palettes with the same hue order: type i keeps its hue in both themes (distinguishable, §10.3).
export const PALETTES = {
  dark: ['#5B9BFF', '#FF8A5B', '#4FD1A1', '#F5C451', '#C792EA', '#FF6B9A', '#56C7E8', '#A3D977', '#E8A87C', '#9AA5FF', '#F78FB3', '#7FDBCA'],
  light: ['#1F5FD1', '#C2410C', '#0F8F6A', '#A16207', '#7E3BB8', '#BE185D', '#0E7490', '#4D7C0F', '#9A4F1A', '#4338CA', '#A3255C', '#0F766E'],
};
export const THEMES = {
  dark: { background: '#0F1420', panel: '#161D2C', text: '#E6EBF5', muted: '#8A95AB', link: '#46516A', dim: '#2A3142', select: '#FFFFFF', hover: '#FFD166', labelBg: 'rgba(15,20,32,0.75)' },
  light: { background: '#F7F8FB', panel: '#FFFFFF', text: '#111827', muted: '#5B6475', link: '#B8C0CF', dim: '#E3E7EE', select: '#111827', hover: '#D97706', labelBg: 'rgba(255,255,255,0.8)' },
};
export const DEFAULT_STYLE = {
  version: 1, theme: 'dark',
  nodeDefaults: { shape: 'circle', size: 6, color: null, borderColor: null, borderWidth: 0, label: { show: 'auto', maxLength: 28, fontSize: 12 }, opacity: 1 },
  linkDefaults: { width: 1, color: null, style: 'solid', arrow: 'to', opacity: 0.8 },
  rules: [], legend: { show: true, title: 'Types' },
  highlight: { dimOthers: true, dimStrength: 0.85 },
  lod: { labelZoomThreshold: 6, hideEdgesOnMoveAbove: 5000, autoClusterAbove: 15000 },
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FN = /^(rgb|rgba|hsl|hsla)\(\s*[\d.%\s,/-]+\)$/i;
export const isColor = c => typeof c === 'string' && (HEX.test(c) || FN.test(c));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function hashIdx(s, n) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % n; }

/** Compile a config into fast style functions + warnings. Never throws. */
export function compileStyle(input, { theme: themeOverride } = {}) {
  const warnings = [];
  let cfg = input;
  if (typeof cfg === 'string') { try { cfg = JSON.parse(cfg); } catch (e) { warnings.push(`style config is not valid JSON: ${e.message}`); cfg = {}; } }
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) { warnings.push('style config must be an object'); cfg = {}; }
  if (cfg.version !== STYLE_VERSION) warnings.push(`style config version ${cfg.version} is not ${STYLE_VERSION}; reading it as v${STYLE_VERSION}`);
  const theme = themeOverride || (cfg.theme === 'light' || cfg.theme === 'dark' ? cfg.theme : (cfg.theme != null && warnings.push(`unknown theme ${cfg.theme}`), 'dark'));
  const T = THEMES[theme], palette = PALETTES[theme];
  const nd = { ...DEFAULT_STYLE.nodeDefaults, ...(isObj(cfg.nodeDefaults) ? cfg.nodeDefaults : {}) };
  const ld = { ...DEFAULT_STYLE.linkDefaults, ...(isObj(cfg.linkDefaults) ? cfg.linkDefaults : {}) };
  nd.label = { ...DEFAULT_STYLE.nodeDefaults.label, ...(isObj(nd.label) ? nd.label : {}) };
  const background = pickColor(cfg.background, theme, warnings, 'background') || T.background;
  if (!SHAPES.includes(nd.shape)) { warnings.push(`unknown default shape ${nd.shape}`); nd.shape = 'circle'; }
  // type -> palette index assigned in first-seen order, stable across theme switches
  const typeIndex = new Map(Object.entries(isObj(cfg.typeOrder) ? cfg.typeOrder : {}));
  const typeColor = type => { if (!typeIndex.has(type)) typeIndex.set(type, typeIndex.size < palette.length ? typeIndex.size : hashIdx(type, palette.length)); return palette[typeIndex.get(type) % palette.length]; };

  const rules = [];
  for (const [i, r] of (Array.isArray(cfg.rules) ? cfg.rules : []).entries()) {
    if (!isObj(r) || !isObj(r.apply)) { warnings.push(`rule ${r?.id ?? i}: needs when/apply`); continue; }
    const when = compileWhen(r.when ?? {}, warnings, r.id ?? i);
    if (!when) continue;
    const kind = r.when?.kind || (r.when?.fromType || r.when?.toType ? 'link' : null);
    const allowed = kind === 'link' ? LINK_CHANNELS : kind === 'node' ? NODE_CHANNELS : new Set([...NODE_CHANNELS, ...LINK_CHANNELS]);
    const apply = {};
    for (const [ch, v] of Object.entries(r.apply)) {
      if (!allowed.has(ch)) { warnings.push(`rule ${r.id ?? i}: unknown channel ${ch}`); continue; }
      if (ch === 'color' || ch === 'borderColor') { const c = pickColor(v, theme, warnings, `rule ${r.id ?? i} ${ch}`); if (c) apply[ch] = c; continue; }
      if (ch === 'shape' && !SHAPES.includes(v)) { warnings.push(`rule ${r.id ?? i}: unknown shape ${v}`); continue; }
      if ((ch === 'size' || ch === 'width') && isObj(v)) { const sc = compileScale(v, warnings, r.id ?? i); if (sc) apply[ch] = sc; continue; }
      if ((ch === 'size' || ch === 'width' || ch === 'opacity' || ch === 'borderWidth') && typeof v !== 'number') { warnings.push(`rule ${r.id ?? i}: ${ch} must be a number or scale`); continue; }
      if (ch === 'dash' && !['solid', 'dashed', 'dotted'].includes(v)) { warnings.push(`rule ${r.id ?? i}: unknown dash ${v}`); continue; }
      if (SYMBOL_CHANNELS.has(ch)) { const c = checkSymbolChannel(ch, v, m => warnings.push(`rule ${r.id ?? i}: ${m}`)); if (c !== undefined) apply[ch] = c; continue; }
      apply[ch] = v;
    }
    rules.push({ id: r.id ?? `rule-${i}`, kind, when, apply, raw: r });
  }

  const evalRules = (item, out) => { for (const r of rules) { if (r.kind && r.kind !== item.kind) continue; if (!r.when(item)) continue; for (const [ch, v] of Object.entries(r.apply)) out[ch] = typeof v === 'function' ? v(item, out[ch]) : ch === 'corners' ? { ...(out.corners || {}), ...v } : v; out._rules.push(r.id); } return out; };
  const symbols = compileSymbols(cfg.symbols, warnings, v => pickColor(v, theme, null));
  function nodeStyle(item) {
    const out = { color: pickColor(nd.color, theme, null) || typeColor(item.type), size: num(nd.size, 6), shape: nd.shape, opacity: num(nd.opacity, 1), borderColor: nd.borderColor, borderWidth: num(nd.borderWidth, 0),
      labelVisible: nd.label.show, labelMaxLength: nd.label.maxLength, fontSize: nd.label.fontSize, _rules: [] };
    evalRules(item, out);
    out.renderShape = RENDERED_SHAPES.has(out.shape) ? out.shape : 'circle';
    if (item.properties?.stub === true) { out.opacity = Math.min(out.opacity, 0.5); }
    if (symbols) out.symbol = resolveSymbol(item, out, symbols, out.color);
    return out;
  }
  function linkStyle(item) {
    const out = { color: pickColor(ld.color, theme, null) || T.link, width: num(ld.width, 1), dash: ld.style || 'solid', arrow: ld.arrow ?? 'to', opacity: num(ld.opacity, 0.8), _rules: [] };
    return evalRules(item, out);
  }
  /** Legend entries for the given visible type counts (§10.4): omits types with zero visible items. */
  function legend(typeCounts) {
    return [...typeCounts.entries()].filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([type, count]) => { const s = nodeStyle({ kind: 'node', type, properties: {} }); return { type, count, color: s.color, shape: s.shape, ...(s.symbol ? { symbol: s.symbol } : {}) }; });
  }
  return { config: cfg, theme, symbols, colors: { ...T, background }, nodeStyle, linkStyle, legend, warnings, typeColor, settings: { ...DEFAULT_STYLE.lod, ...(isObj(cfg.lod) ? cfg.lod : {}), highlight: { ...DEFAULT_STYLE.highlight, ...(isObj(cfg.highlight) ? cfg.highlight : {}) } } };
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function pickColor(v, theme, warnings, what) {
  if (v == null) return null;
  if (isObj(v)) v = v[theme] ?? v.dark ?? v.light;
  if (isColor(v)) return v;
  warnings?.push(`${what}: invalid color ${JSON.stringify(v)}`);
  return null;
}
function compileScale(s, warnings, id) {
  const { property, scale = 'linear', domain = [0, 100], range = [4, 20] } = s;
  if (typeof property !== 'string' || !Array.isArray(domain) || !Array.isArray(range) || domain.length !== 2 || range.length !== 2 || !['linear', 'log'].includes(scale)) { warnings.push(`rule ${id}: invalid scale`); return null; }
  const [d0, d1] = domain.map(Number), [r0, r1] = range.map(Number);
  const f = scale === 'log' ? x => Math.log10(Math.max(x, 1e-9)) : x => x;
  const a = f(d0), b = f(d1);
  return (item, prev) => {
    const v = Number(item.properties?.[property]);
    if (!Number.isFinite(v) || (scale === 'log' && v <= 0)) return prev; // invalid or missing value -> default
    const t = b === a ? 0 : Math.max(0, Math.min(1, (f(v) - a) / (b - a)));
    return r0 + t * (r1 - r0);
  };
}
function compileWhen(w, warnings, id) {
  if (!isObj(w)) { warnings.push(`rule ${id}: when must be an object`); return null; }
  const tests = [];
  for (const [k, v] of Object.entries(w)) {
    switch (k) {
      case 'kind': tests.push(it => it.kind === v); break;
      case 'type': tests.push(Array.isArray(v) ? it => v.includes(it.type) : it => it.type === v); break;
      case 'sourceId': tests.push(it => (it.sources || []).some(s => (Array.isArray(v) ? v.includes(s.sourceId) : s.sourceId === v))); break;
      case 'and': case 'or': {
        if (!Array.isArray(v)) { warnings.push(`rule ${id}: ${k} needs a list`); return null; }
        const subs = v.map(x => compileWhen(x, warnings, id)); if (subs.some(s => !s)) return null;
        tests.push(k === 'and' ? it => subs.every(f => f(it)) : it => subs.some(f => f(it))); break;
      }
      case 'not': { const sub = compileWhen(v, warnings, id); if (!sub) return null; tests.push(it => !sub(it)); break; }
      case 'property': {
        const op = w.op ?? 'exists';
        if (!OPS.has(op)) { warnings.push(`rule ${id}: unknown operator ${op} (rule ignored)`); return null; }
        const val = w.value;
        tests.push(it => { const x = it.properties?.[v]; switch (op) {
          case 'eq': return x === val || (x != null && val != null && String(x) === String(val));
          case 'neq': return !(x === val || (x != null && val != null && String(x) === String(val)));
          case 'in': return Array.isArray(val) && val.some(y => String(y) === String(x));
          case '>=': return x != null && Number(x) >= Number(val);
          case '<=': return x != null && Number(x) <= Number(val);
          case '>': return x != null && Number(x) > Number(val);
          case '<': return x != null && Number(x) < Number(val);
          case 'contains': return typeof x === 'string' && x.toLowerCase().includes(String(val).toLowerCase());
          case 'exists': return x != null && x !== '';
        } }); break;
      }
      case 'op': case 'value': break;
      default: warnings.push(`rule ${id}: unknown condition ${k} (rule ignored)`); return null;
    }
  }
  return it => tests.every(f => f(it));
}
