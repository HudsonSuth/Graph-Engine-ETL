// Browser half of the symbol system (SPEC §20): composes each distinct symbol key ONCE into a small canvas image
// (frame + status fill + glyph + corner badges, dashed frame for uncertain items) and hands sigma a blob URL;
// @sigma/node-image packs those images into a WebGL texture atlas, so 10k nodes cost a few dozen draws, not 10k.
import { iconPath, parseGlyph } from '../shared/symbols.js';

const luminance = hex => { const m = /^#?([0-9a-f]{6})/i.exec(hex || ''); if (!m) return 0.5; const n = parseInt(m[1], 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const svgCache = new Map(); // "set/name|color" -> Promise<HTMLImageElement|null>
function loadGlyph(ref, color, defaultSet) {
  const k = `${ref}|${color}`; if (svgCache.has(k)) return svgCache.get(k);
  const g = parseGlyph(ref, defaultSet), path = g && iconPath(g.set, g.name);
  const p = !path ? Promise.resolve(null) : fetch(path).then(r => (r.ok ? r.text() : null)).then(txt => {
    if (!txt) return null;
    txt = txt.replace(/<!--[\s\S]*?-->/g, '').replace(/currentColor/g, color).replace(/\swidth="[^"]*"/, ' width="96"').replace(/\sheight="[^"]*"/, ' height="96"');
    if (!/\swidth=/.test(txt.slice(0, txt.indexOf('>')))) txt = txt.replace('<svg', '<svg width="96" height="96"');
    return new Promise(res => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' })); });
  }).catch(() => null);
  svgCache.set(k, p); return p;
}
function polygon(n, r, rot = -Math.PI / 2) { const p = new Path2D(); for (let i = 0; i < n; i++) { const a = rot + (i * 2 * Math.PI) / n; i ? p.lineTo(r * Math.cos(a), r * Math.sin(a)) : p.moveTo(r * Math.cos(a), r * Math.sin(a)); } p.closePath(); return p; }
/** frame outline centred on 0,0 with "radius" r */
export function framePath(frame, r) {
  if (typeof frame === 'object' && frame?.path) { const p = new Path2D(); p.addPath(new Path2D(frame.path), new DOMMatrix().translate(-r, -r).scale((2 * r) / 100)); return p; }
  const p = new Path2D();
  switch (frame) {
    case 'square': { const h = r * 0.86; p.rect(-h, -h, 2 * h, 2 * h); return p; }
    case 'rectangle': p.rect(-r, -r * 0.66, 2 * r, r * 1.32); return p;
    case 'diamond': return polygon(4, r * 1.12);
    case 'hexagon': return polygon(6, r, 0);
    case 'octagon': return polygon(8, r, Math.PI / 8);
    case 'triangle': { const q = polygon(3, r * 1.15); return q; }
    case 'shield': p.moveTo(-r * 0.85, -r * 0.85); p.lineTo(r * 0.85, -r * 0.85); p.lineTo(r * 0.85, r * 0.1); p.quadraticCurveTo(r * 0.8, r * 0.75, 0, r); p.quadraticCurveTo(-r * 0.8, r * 0.75, -r * 0.85, r * 0.1); p.closePath(); return p;
    case 'quatrefoil': { // four lobes (MIL-STD "unknown" style): outer arcs of four circles, joined where neighbours cross
      const a = r * 0.48, b = r * 0.55, s45 = Math.SQRT1_2, t = a * s45 + Math.sqrt(b * b - a * a * 0.5);
      for (let i = 0; i < 4; i++) {
        const th = -Math.PI / 2 + (i * Math.PI) / 2, cx = a * Math.cos(th), cy = a * Math.sin(th);
        const P = ang => [t * Math.cos(ang), t * Math.sin(ang)], [x0, y0] = P(th - Math.PI / 4), [x1, y1] = P(th + Math.PI / 4);
        const s = Math.atan2(y0 - cy, x0 - cx), e = Math.atan2(y1 - cy, x1 - cx);
        if (i === 0) p.moveTo(x0, y0);
        p.arc(cx, cy, b, s, e < s ? e + 2 * Math.PI : e, false);
      }
      p.closePath(); return p;
    }
    default: p.arc(0, 0, r, 0, 2 * Math.PI); return p;
  }
}
const CORNER_POS = { ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };

export class SymbolAtlas {
  constructor({ size = 96, defaultSet = 'lucide', onReady = () => {} } = {}) { this.size = size; this.defaultSet = defaultSet; this.onReady = onReady; this.cache = new Map(); this.composed = 0; this.ms = null; }
  configure({ size, defaultSet }) { if (size && size !== this.size) { this.size = size; this.cache.clear(); } if (defaultSet) this.defaultSet = defaultSet; }
  /** { image, imageDim } when ready, else null (composition starts in the background; onReady fires once done) */
  get(desc) {
    const c = this.cache.get(desc.key); if (c) return c.ready ? c : null;
    const entry = { ready: false }; this.cache.set(desc.key, entry);
    this.compose(desc).then(r => { Object.assign(entry, r, { ready: true }); this.composed++; this.onReady(desc.key); }).catch(e => { console.warn('symbol', desc.key, e); });
    return null;
  }
  async compose(d) {
    const S = this.size, cv = document.createElement('canvas'); cv.width = cv.height = S; const ctx = cv.getContext('2d');
    if (d.kind === 'milsymbol') await this.drawMil(ctx, d.sidc, S); else await this.drawComposed(ctx, d, S);
    const dim = document.createElement('canvas'); dim.width = dim.height = S; const dctx = dim.getContext('2d'); dctx.globalAlpha = 0.22; dctx.drawImage(cv, 0, 0);
    const url = c => new Promise(res => c.toBlob(b => res(URL.createObjectURL(b)), 'image/png'));
    return { image: await url(cv), imageDim: await url(dim), dataUrl: cv.toDataURL('image/png') };
  }
  async drawComposed(ctx, d, S) {
    const r = S * 0.34, lw = Math.max(2, S * 0.045);
    ctx.save(); ctx.translate(S / 2, S / 2);
    const fp = framePath(d.frame, r);
    ctx.globalAlpha = d.dash ? 0.7 : 1; ctx.fillStyle = d.fill; ctx.fill(fp); ctx.globalAlpha = 1;
    ctx.lineWidth = lw; ctx.strokeStyle = d.dash ? '#FFFFFF' : luminance(d.fill) > 0.45 ? '#111827' : '#F4F6FA'; ctx.lineJoin = 'round';
    if (d.dash) ctx.setLineDash([S * 0.075, S * 0.05]);
    ctx.stroke(fp); ctx.setLineDash([]);
    if (d.glyph) {
      const gc = d.glyphColor || (luminance(d.fill) > 0.45 ? '#111827' : '#FFFFFF');
      const img = await loadGlyph(d.glyph, gc, this.defaultSet);
      if (img) { const g = r * 1.05; ctx.drawImage(img, -g / 2, -g / 2, g, g); }
    }
    ctx.restore();
    for (const b of d.corners || []) await this.drawBadge(ctx, b, S);
  }
  async drawBadge(ctx, b, S) {
    const [sx, sy] = CORNER_POS[b.corner], br = S * 0.15, cx = S / 2 + sx * S * 0.34, cy = S / 2 + sy * S * 0.34;
    ctx.beginPath(); ctx.arc(cx, cy, br, 0, 2 * Math.PI); ctx.fillStyle = b.color; ctx.fill(); ctx.lineWidth = Math.max(1.5, S * 0.025); ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
    const text = b.kind === 'alert' ? '!' : b.text;
    if (text) { ctx.fillStyle = '#FFFFFF'; ctx.font = `700 ${Math.round(br * (text.length > 2 ? 0.9 : 1.25))}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, cx, cy + br * 0.06); }
    const icon = b.kind === 'lock' ? 'lucide/lock' : b.kind === 'icon' ? b.icon : null;
    if (icon) { const img = await loadGlyph(icon, '#FFFFFF', this.defaultSet); if (img) { const g = br * 1.25; ctx.drawImage(img, cx - g / 2, cy - g / 2, g, g); } }
  }
  async drawMil(ctx, sidc, S) {
    if (!this.ms) { const u = '/explore/milsymbol.js'; this.ms = import(/* @vite-ignore */ u).then(m => m.default || m.ms || m); }
    const ms = await this.ms; const sym = new ms.Symbol(sidc, { size: Math.round(S * 0.42) });
    const c = sym.asCanvas(); const k = Math.min((S * 0.92) / c.width, (S * 0.92) / c.height);
    ctx.drawImage(c, (S - c.width * k) / 2, (S - c.height * k) / 2, c.width * k, c.height * k);
  }
}
