// Token and cost meter (plan §5.7). Visibility only: a budget overrun emits `budget.exceeded` and the run CONTINUES.
// Records carry no keys and no prompt text, only a hash of the redacted prompt.
export class Meter {
  constructor({ emit = () => {}, budgets = () => ({}), now = () => Date.now() } = {}) { this.emit = emit; this.budgets = budgets; this.now = now; this.records = []; this.taps = new Set(); this.byFlow = new Map(); this.byDay = new Map(); this.warned = new Set(); }
  record(r) {
    const rec = { at: new Date(this.now()).toISOString(), ...r };
    this.records.push(rec); if (this.records.length > 2000) this.records.shift();
    const day = rec.at.slice(0, 10), cost = rec.cost || 0;
    this.byFlow.set(rec.flowId, (this.byFlow.get(rec.flowId) || 0) + cost);
    this.byDay.set(day, (this.byDay.get(day) || 0) + cost);
    this.emit('llm.call', rec);
    for (const f of this.taps) { try { f(rec); } catch { /* a listener never breaks metering */ } }
    const b = { ...(this.budgets() || {}), ...(r.flowBudget || {}) };
    const over = [];
    if (b.perFlowUSD != null && this.byFlow.get(rec.flowId) > b.perFlowUSD) over.push({ scope: 'flow', key: rec.flowId, limitUSD: b.perFlowUSD, spentUSD: this.byFlow.get(rec.flowId) });
    if (b.perDayUSD != null && this.byDay.get(day) > b.perDayUSD) over.push({ scope: 'day', key: day, limitUSD: b.perDayUSD, spentUSD: this.byDay.get(day) });
    for (const o of over) { const k = `${o.scope}|${o.key}`; if (this.warned.has(k)) continue; this.warned.add(k); this.emit('budget.exceeded', { ...o, flowId: rec.flowId, model: rec.model, note: 'Budgets are for visibility only; the run continues.' }); }
    return rec;
  }
  /** Listen to every record (used by ETL LLM steps for per-node cost in step stats). Returns an unsubscribe function. */
  tap(fn) { this.taps.add(fn); return () => this.taps.delete(fn); }
  totals(flowId) { return { flowUSD: this.byFlow.get(flowId) || 0, calls: this.records.filter(r => r.flowId === flowId).length }; }
}
