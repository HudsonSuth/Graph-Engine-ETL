// Composable node symbols (SPEC §20), inspired by MIL-STD-2525 / APP-6 symbology:
//   frame shape = category / affiliation, fill colour = status, central glyph from a bundled icon set,
//   modifiers = corner badges (alert, count, lock, text, icon) + dashed frame (planned / estimated / uncertain),
//   text fields around the symbol (label, unique id, quantity) shown by zoom level.
// Pure (no DOM): the style compiler resolves each node to a symbol descriptor + a stable cache key;
// the browser composes each distinct key once into a texture-atlas image (client/symbols.js).
export const FRAMES = ['circle', 'square', 'diamond', 'quatrefoil', 'hexagon', 'octagon', 'triangle', 'rectangle', 'shield'];
export const CORNERS = ['ne', 'nw', 'se', 'sw'];
export const BADGE_KINDS = ['alert', 'count', 'lock', 'text', 'icon'];
/** icon sets bundled with the app (all permissive; see explore/LICENSES.md). id -> licence + served path. */
export const ICON_SETS = {
  lucide: { license: 'ISC', name: 'Lucide', url: 'https://lucide.dev', attribution: null },
  'majesticons:line': { license: 'MIT', name: 'Majesticons (line)', url: 'https://github.com/halfmage/majesticons', attribution: null },
  'majesticons:solid': { license: 'MIT', name: 'Majesticons (solid)', url: 'https://github.com/halfmage/majesticons', attribution: null },
};
export const DEFAULT_STATUS_COLORS = { ok: '#2E9E6B', warning: '#D9A21B', critical: '#D9483B', unknown: '#7A8599', planned: '#5B7BD5' };
const NAME = /^[a-z0-9][a-z0-9-]{0,80}$/;
const SET_NAME = /^[a-z0-9][a-z0-9_-]{0,40}$/;
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

/** URL path of an icon (served by the explore server; never a remote URL). null if the name is not valid. */
export function iconPath(set, name) {
  if (!NAME.test(name || '')) return null;
  if (set === 'lucide') return `/explore/icons/lucide/${name}.svg`;
  if (set === 'majesticons:line') return `/explore/icons/majesticons-line/${name}.svg`;
  if (set === 'majesticons:solid') return `/explore/icons/majesticons-solid/${name}.svg`;
  if (set?.startsWith('custom:') && SET_NAME.test(set.slice(7))) return `/explore/icons/custom/${set.slice(7)}/${name}.svg`;
  return null;
}
/** "majesticons:line/cpu" | "cpu" (default set) -> { set, name } */
export function parseGlyph(g, defaultSet) {
  if (typeof g !== 'string' || !g) return null;
  const i = g.lastIndexOf('/'); return i > 0 ? { set: g.slice(0, i), name: g.slice(i + 1) } : { set: defaultSet, name: g };
}

/** Compile the style config "symbols" block. Returns null when symbols are off (default: unchanged rendering). */
export function compileSymbols(cfg, warnings, pickColor) {
  if (!isObj(cfg) || cfg.enabled === false) return null;
  const sets = { ...ICON_SETS };
  for (const [name, s] of Object.entries(isObj(cfg.iconSets) ? cfg.iconSets : {})) {
    if (!SET_NAME.test(name)) { warnings.push(`symbols.iconSets: bad set name ${name}`); continue; }
    // custom folders must carry their licence in the style file; without one the set is refused (never silently bundled)
    if (!isObj(s) || typeof s.license !== 'string' || !s.license.trim()) { warnings.push(`symbols.iconSets.${name}: a "license" field is required for custom icons (set ignored)`); continue; }
    sets[`custom:${name}`] = { license: s.license.trim(), name: s.name || name, url: s.source || null, attribution: s.attribution || null, custom: true };
  }
  const defaultSet = typeof cfg.iconSet === 'string' ? cfg.iconSet : 'lucide';
  if (!sets[defaultSet]) warnings.push(`symbols.iconSet ${defaultSet} is not a known or licensed set; using lucide`);
  const st = isObj(cfg.status) ? cfg.status : {};
  const statusColors = { ...DEFAULT_STATUS_COLORS };
  for (const [k, v] of Object.entries(isObj(st.colors) ? st.colors : {})) { const c = pickColor(v); if (c) statusColors[k] = c; else warnings.push(`symbols.status.colors.${k}: invalid colour`); }
  const f = isObj(cfg.fields) ? cfg.fields : {};
  const field = (v, d) => (v === false ? null : isObj(v) ? { property: typeof v.property === 'string' ? v.property : d.property, maxRatio: Number.isFinite(v.maxRatio) ? v.maxRatio : d.maxRatio, format: typeof v.format === 'string' ? v.format : d.format } : d);
  return {
    sets, defaultSet: sets[defaultSet] ? defaultSet : 'lucide', statusColors, statusProperty: typeof st.property === 'string' ? st.property : null,
    size: Math.max(32, Math.min(256, Number(cfg.size) || 96)), glyphColor: pickColor(cfg.glyphColor) || null,
    fields: { uid: field(f.uid, { property: 'id', maxRatio: 0.3, format: '{}' }), quantity: isObj(f.quantity) ? field(f.quantity, { property: null, maxRatio: 0.15, format: '{}' }) : null },
    milsymbol: isObj(cfg.milsymbol) ? { property: cfg.milsymbol.property || 'sidc', size: Number(cfg.milsymbol.size) || 40 } : null,
    legend: isObj(cfg.legend) ? cfg.legend : {},
  };
}

/** validate one rule channel value; returns the cleaned value or undefined (+ warning) */
export function checkSymbolChannel(ch, v, warn) {
  switch (ch) {
    case 'frame': if (FRAMES.includes(v) || (isObj(v) && typeof v.path === 'string' && v.path.length < 4000)) return v; warn(`unknown frame ${JSON.stringify(v)}`); return undefined;
    case 'frameDash': if (['solid', 'dashed'].includes(v)) return v; warn(`frameDash must be solid or dashed`); return undefined;
    case 'status': if (typeof v === 'string' || (isObj(v) && typeof v.property === 'string')) return v; warn('status must be a key or {property}'); return undefined;
    case 'glyph': if (v === null || typeof v === 'string' || (isObj(v) && typeof v.property === 'string')) return v; warn('glyph must be an icon name, null or {property, map}'); return undefined;
    case 'sidc': if (typeof v === 'string' || (isObj(v) && typeof v.property === 'string')) return v; warn('sidc must be a code or {property}'); return undefined;
    case 'corners': {
      if (!isObj(v)) { warn('corners must be an object'); return undefined; }
      const out = {};
      for (const [k, b] of Object.entries(v)) {
        if (!CORNERS.includes(k)) { warn(`unknown corner ${k}`); continue; }
        if (b === null) { out[k] = null; continue; }
        if (!isObj(b) || !BADGE_KINDS.includes(b.kind)) { warn(`corner ${k}: kind must be one of ${BADGE_KINDS.join(', ')}`); continue; }
        out[k] = b;
      }
      return out;
    }
  }
  return v;
}

const prop = (item, p) => (p === 'id' ? item.id : item.properties?.[p]);
const fmt = (f, v) => (f || '{}').replace('{}', typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : String(v));
/** resolve the symbol for one node from its computed style channels */
export function resolveSymbol(item, out, sym, fallbackColor) {
  const statusKey = typeof out.status === 'string' ? out.status : isObj(out.status) ? prop(item, out.status.property) : sym.statusProperty ? prop(item, sym.statusProperty) : null;
  const fill = (statusKey != null && sym.statusColors[statusKey]) || fallbackColor;
  let glyph = out.glyph;
  if (isObj(glyph)) { const v = prop(item, glyph.property); glyph = isObj(glyph.map) ? glyph.map[String(v)] ?? glyph.default ?? null : v ?? null; }
  const g = parseGlyph(glyph ?? out.icon ?? null, sym.defaultSet);
  const glyphRef = g && sym.sets[g.set] && iconPath(g.set, g.name) ? `${g.set}/${g.name}` : null;
  const corners = [];
  for (const c of CORNERS) {
    const b = out.corners?.[c]; if (!b) continue;
    let text = null;
    if (b.kind === 'count') { const v = Number(b.property ? prop(item, b.property) : b.value); if (!Number.isFinite(v)) continue; text = v > 99 ? '99+' : String(Math.round(v)); }
    if (b.kind === 'text') { const v = b.property ? prop(item, b.property) : b.text; if (v == null || v === '') continue; text = String(v).slice(0, 4); }
    if (b.when && !(prop(item, b.when.property) === b.when.value || String(prop(item, b.when.property)) === String(b.when.value))) continue;
    const ig = b.kind === 'icon' ? parseGlyph(b.icon, sym.defaultSet) : null;
    corners.push({ corner: c, kind: b.kind, text, color: b.color || (b.kind === 'alert' ? '#E5484D' : b.kind === 'lock' ? '#3B4252' : '#1F2937'), icon: ig && sym.sets[ig.set] && iconPath(ig.set, ig.name) ? `${ig.set}/${ig.name}` : null });
  }
  let sidc = out.sidc; if (isObj(sidc)) sidc = prop(item, sidc.property); else if (sidc == null && sym.milsymbol) sidc = prop(item, sym.milsymbol.property);
  const desc = sidc && /^[A-Za-z0-9*\-]{10,30}$/.test(String(sidc))
    ? { kind: 'milsymbol', sidc: String(sidc) }
    : { kind: 'composed', frame: out.frame || 'circle', fill, dash: out.frameDash === 'dashed', glyph: glyphRef, glyphColor: sym.glyphColor, corners };
  return { ...desc, key: symbolKey(desc) };
}
export function symbolKey(d) {
  if (d.kind === 'milsymbol') return `ms|${d.sidc}`;
  return ['c', typeof d.frame === 'string' ? d.frame : `p:${hash(d.frame.path)}`, d.fill, d.dash ? 1 : 0, d.glyph || '-', d.glyphColor || '', ...d.corners.map(b => `${b.corner}:${b.kind}:${b.text ?? ''}:${b.color}:${b.icon || ''}`)].join('|');
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

/** label with the text fields allowed at this zoom (camera ratio: smaller = closer). Level 0 = label only. */
export function fieldLevel(sym, ratio) { if (!sym) return 0; let l = 0; if (sym.fields.uid && ratio <= sym.fields.uid.maxRatio) l = 1; if (sym.fields.quantity?.property && ratio <= sym.fields.quantity.maxRatio) l = 2; return l; }
export function fieldLabel(item, base, sym, level) {
  if (!sym || level === 0) return base;
  const parts = [base];
  const u = sym.fields.uid; if (u && level >= 1) { const v = prop(item, u.property); if (v != null && v !== '' && String(v) !== base) parts.push(`[${fmt(u.format, v)}]`); }
  const q = sym.fields.quantity; if (q?.property && level >= 2) { const v = prop(item, q.property); if (v != null && v !== '') parts.push(fmt(q.format, v)); }
  return parts.join('  ');
}

/** DELIBERATELY WRONG resolver (SPEC §20.7), selected only with SYMBOLS_IMPL=wrong in Node tests:
 *  SW1 status ignored (fill is always the type colour), SW2 dashed frame dropped, SW3 cache key ignores the corner badges
 *  (so two nodes with different badges share one atlas image). The real symbol tests must fail on it. */
export function wrongResolveSymbol(item, out, sym, fallbackColor) {
  const r = resolveSymbol(item, out, sym, fallbackColor);
  if (r.kind !== 'composed') return r;
  const d = { ...r, fill: fallbackColor, dash: false };
  return { ...d, key: symbolKey({ ...d, corners: [] }) };
}
