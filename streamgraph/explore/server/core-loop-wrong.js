// Deliberately wrong core-loop implementation (CORE_IMPL=wrong, SPEC §23.9): used only to prove the tests catch bugs.
//  CW1 neighbourhood stops one hop early when hops > 1        CW2 neighbourhood ignores the linkTypes filter
//  CW3 "all paths" returns only the shortest ones            CW4 live growth adds the link but not its new end node
//  CW5 node summary counts only outgoing links
import * as real from './core-loop.js';
export const NB_LIMITS = real.NB_LIMITS, normalizeNbOptions = real.normalizeNbOptions, dirOk = real.dirOk;
export async function* neighborhoodStream(svc, opts, guard, principal) {
  const o = { ...opts, linkTypes: null, hops: Number(opts.hops ?? 1) > 1 ? Number(opts.hops) - 1 : opts.hops };
  yield* real.neighborhoodStream(svc, o, guard, principal);
}
export async function neighborhood(svc, opts, guard, principal) { return real.neighborhood(svc, { ...opts, linkTypes: null, hops: Number(opts.hops ?? 1) > 1 ? Number(opts.hops) - 1 : opts.hops }, guard, principal); }
export async function findPaths(svc, opts, guard, principal) { return real.findPaths(svc, { ...opts, mode: 'shortest' }, guard, principal); }
export async function nodeSummary(svc, id, guard, principal) {
  const r = await real.nodeSummary(svc, id, guard, principal); if (!r) return r;
  const linkTypes = r.linkTypes.map(t => ({ ...t, total: t.out, in: 0 })).filter(t => t.total);
  return { ...r, linkTypes, degree: linkTypes.reduce((s, t) => s + t.total, 0) };
}
export const growWrong = true;
