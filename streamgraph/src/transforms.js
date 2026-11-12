import { evaluate } from './expr.js';
const b = ev => ({ op: ev.op, topic: ev.topic });
const castOne = (t, v) => {
  if (v === null || v === undefined || v === '') return v;
  switch (t) {
    case 'String': return String(v);
    case 'Integer': case 'Long': case 'Short': { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; }
    case 'Double': case 'Float': { const n = parseFloat(v); return Number.isNaN(n) ? null : n; }
    case 'Boolean': return v === true || v === 1 || /^(true|1|yes|y)$/i.test(String(v));
    case 'Date': { const d = new Date(v); return isNaN(d) ? null : d.toISOString().slice(0, 10); }
    case 'Timestamp': { const d = new Date(v); return isNaN(d) ? null : d.toISOString(); }
    default: throw new Error(`Unknown type ${t}`);
  }
};
export const TRANSFORMS = {
  async map(cfg, ev) { const data = { ...ev.data }; for (const [k, ex] of Object.entries(cfg.set || {})) data[k] = await evaluate(ex, ev.data, b(ev)); return { ...ev, data }; },
  async rename(cfg, ev) {
    const ren = o => o && Object.fromEntries(Object.entries(o).map(([k, v]) => [cfg.fields?.[k] || k, v]));
    return { ...ev, topic: cfg.topic || ev.topic, data: ren(ev.data), before: ren(ev.before) };
  },
  async filter(cfg, ev) { return (await evaluate(cfg.expr, ev.data, b(ev))) ? ev : null; },
  async cast(cfg, ev) { const data = { ...ev.data }; for (const [k, t] of Object.entries(cfg.types || {})) if (k in data) data[k] = castOne(t, data[k]); return { ...ev, data }; },
  async normalize(cfg, ev) {
    const n = o => { if (!o) return o; const d = { ...o }; for (const f of cfg.fields || []) if (d[f] != null) d[f] = String(d[f]).trim().toLowerCase(); return d; };
    return { ...ev, data: n(ev.data), before: n(ev.before) };
  },
};
// Steps can be scoped to topics so one flow can hold several streams.
export async function applyTransform(step, ev) {
  const t = step.config?.topics; if (t && !t.includes(ev.topic)) return ev;
  return TRANSFORMS[step.type](step.config || {}, ev);
}
