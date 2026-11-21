// Hard safety stops (D3): max loop steps, max tool calls and max wall time per run. These are the ONLY limits that stop
// a run (budgets only warn). A stop ends the run with status "stopped:<limit>" and the last checkpoint is kept.
import { ModelError } from './wire.js';
import { DEFAULT_LIMITS } from './config.js';

export class StopError extends ModelError {
  constructor(limit, detail) { super('stopped', `run stopped: ${limit} reached${detail ? ` (${detail})` : ''}`, { limit }); this.status = `stopped:${limit}`; }
}
export class RunGuard {
  constructor(limits = {}, { now = () => Date.now() } = {}) {
    this.limits = { ...DEFAULT_LIMITS, ...limits }; this.steps = 0; this.toolCalls = 0; this.now = now; this.started = now(); this.stopped = null;
    this.controller = new AbortController();
    this.timer = setTimeout(() => this.stop('maxWallSeconds'), this.limits.maxWallSeconds * 1000); this.timer.unref?.();
  }
  get signal() { return this.controller.signal; }
  stop(limit) { if (this.stopped) return; this.stopped = new StopError(limit); this.controller.abort(this.stopped); }
  check() { if (this.stopped) throw this.stopped; }
  step() { this.check(); if (++this.steps > this.limits.maxSteps) { this.stop('maxSteps'); throw this.stopped; } }
  toolCall() { this.check(); if (++this.toolCalls > this.limits.maxToolCalls) { this.stop('maxToolCalls'); throw this.stopped; } }
  dispose() { clearTimeout(this.timer); }
  stats() { return { steps: this.steps, toolCalls: this.toolCalls, wallMs: this.now() - this.started, limits: this.limits }; }
}
