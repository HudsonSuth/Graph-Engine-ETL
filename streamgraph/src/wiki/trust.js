// OKF v0.2 trust signals -> derived tier and read-time staleness. Tiers are for display and filtering only (never access rules).
import { broken } from './broken.js';

export const DEFAULT_HUMANS = ['human:whsutherland'];
export const STATUSES = ['draft', 'stable', 'deprecated'];
const ISO = /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[Zz]|[+-]\d{2}:?\d{2})?)?$/;
export const isIsoInstant = s => typeof s === 'string' && ISO.test(s) && !Number.isNaN(Date.parse(s));
const actorOf = v => (v && typeof v === 'object' ? v.by : v);

/** Normalize trust fields from frontmatter. Returns { generated, verified[], sources[], status, staleAfter, tier, problems }. */
export function trustOf(fm, { humans = DEFAULT_HUMANS } = {}) {
  const problems = [], H = new Set(humans);
  const g = fm?.generated; let generated = null;
  if (g != null) {
    if (typeof g === 'object' && !Array.isArray(g) && typeof g.by === 'string') generated = { by: g.by, at: g.at != null ? String(g.at) : null };
    else problems.push('generated: must be an object with "by" (and "at")');
    if (generated?.at && !isIsoInstant(generated.at)) problems.push(`generated.at: not an ISO-8601 instant (${generated.at})`);
  }
  const verified = [];
  if (fm?.verified != null) {
    const list = Array.isArray(fm.verified) ? fm.verified : [fm.verified];
    list.forEach((v, i) => {
      const by = actorOf(v);
      if (typeof by !== 'string' || !by) { problems.push(`verified[${i}]: needs "by"`); return; }
      const at = v && typeof v === 'object' && v.at != null ? String(v.at) : null;
      if (at && !isIsoInstant(at)) problems.push(`verified[${i}].at: not an ISO-8601 instant (${at})`);
      if (by.startsWith('human:') && !H.has(by)) problems.push(`verified[${i}].by: ${by} is not a recognised human (counted as machine)`);
      verified.push({ by, at, note: v && typeof v === 'object' && v.note != null ? String(v.note) : null });
    });
  }
  const sources = [];
  if (fm?.sources != null) for (const s of Array.isArray(fm.sources) ? fm.sources : [fm.sources]) {
    if (typeof s === 'string') sources.push({ resource: s });
    else if (s && typeof s === 'object') { const r = s.resource ?? s.url ?? s.path ?? s.id ?? s.title; if (r == null) problems.push('sources: entry without resource/url/path'); else sources.push({ resource: String(r), title: s.title != null ? String(s.title) : null }); }
  }
  let status = fm?.status == null ? 'stable' : String(fm.status);
  if (!STATUSES.includes(status)) { problems.push(`status: must be one of ${STATUSES.join('/')} (got ${status})`); status = 'stable'; }
  let staleAfter = fm?.stale_after == null ? null : String(fm.stale_after);
  if (staleAfter && !isIsoInstant(staleAfter)) { problems.push(`stale_after: not an ISO-8601 instant (${staleAfter})`); staleAfter = null; }
  return { generated, verified, sources, status, staleAfter, tier: tierOf(verified, humans), problems };
}

export function tierOf(verified, humans = DEFAULT_HUMANS) {
  if (!verified?.length) return 'unverified';
  if (broken()) return verified.some(v => String(v.by).startsWith('human:')) || verified.length ? 'human-reviewed' : 'unverified';
  return verified.some(v => humans.includes(v.by)) ? 'human-reviewed' : 'machine-confirmed';
}
/** Read-time staleness: stale_after at or before now. */
export const isStale = (staleAfter, now = Date.now()) => !!staleAfter && Date.parse(staleAfter) <= (typeof now === 'number' ? now : Date.parse(now));
