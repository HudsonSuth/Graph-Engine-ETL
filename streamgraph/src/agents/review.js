// Human review of LLM-generated graph items (phase L5). The wiki rule is reused: only a recognised
// human (human:whsutherland, and only when the UI says this is really them) can raise trust_tier from
// unverified to human-reviewed. An agent actor is never that human. The tier itself comes from tierOf.
import { tierOf, DEFAULT_HUMANS } from '../wiki/trust.js';
import { brokenL45 } from '../llm/l45-wrong.js';

export const HUMAN_SUBJECTS = { owner: 'human:whsutherland' };
const fail = (status, message) => Object.assign(new Error(message), { status });

export function humanReviewer(who, humans = DEFAULT_HUMANS, subjects = HUMAN_SUBJECTS) {
  if (!who || who.testAs) return null;
  const id = who.actor?.id || who.id;
  const h = subjects[id];
  return h && humans.includes(h) ? h : null;
}

const waiting = props => props?.trust_tier === 'unverified'
  && typeof props.generated_by === 'string' && props.generated_by.startsWith('grokbot/')
  && props.review_decision !== 'rejected';

export function pendingReviews(graph) {
  const nodes = graph.nodes().filter(n => waiting(n.props)).map(n => ({
    kind: 'node', id: n.id, label: n.label, key: n.key, trust_tier: n.props.trust_tier,
    generated_by: n.props.generated_by, generated_at: n.props.generated_at || null, llm_model: n.props.llm_model || null,
  }));
  const edges = graph.edges().filter(e => waiting(e.props)).map(e => ({
    kind: 'edge', id: e.id, type: e.type, from: e.from, to: e.to, trust_tier: e.props.trust_tier,
    generated_by: e.props.generated_by, generated_at: e.props.generated_at || null,
  }));
  return [...nodes, ...edges];
}

function findItem(graph, id, kind) {
  if (kind === 'edge' || (kind !== 'node' && String(id).includes('-['))) {
    const e = graph.getEdge?.(id) || graph.edges().find(x => x.id === id);
    return e ? { kind: 'edge', item: e } : null;
  }
  const n = graph.getNode(id);
  return n ? { kind: 'node', item: n } : null;
}

function writeItem(graph, found, patch) {
  const p = { ...found.item.props, ...patch };
  if (found.kind === 'node') graph.upsertNode(found.item.id, found.item.label, found.item.key, p);
  else graph.upsertEdge(found.item.type, found.item.from, found.item.to, p);
  return { kind: found.kind, id: found.item.id, trust_tier: p.trust_tier, status: p.status, verified_by: p.verified_by || null };
}

/**
 * Promote or reject one generated node or edge.
 * `allowHuman` is true only for a recognised human at the UI, the same switch as wiki verifyNote.
 */
export function reviewItem(graph, { id, kind, decision, actor, allowHuman = false, note = null, humans = DEFAULT_HUMANS, now = new Date().toISOString() } = {}) {
  const found = findItem(graph, id, kind);
  if (!found) throw fail(404, 'nothing to review with that id');
  if (brokenL45()) {
    // DELIBERATELY WRONG: any actor, including grokbot/, is stamped human-reviewed.
    return writeItem(graph, found, { trust_tier: 'human-reviewed', status: 'stable', verified_by: actor || 'grokbot/broken', verified_at: now });
  }
  if (!waiting(found.item.props) && found.item.props.trust_tier !== 'machine-confirmed') throw fail(409, 'this item is not waiting for review');
  const want = decision === 'yes' ? 'approve' : decision;
  if (want === 'reject') {
    return writeItem(graph, found, { review_decision: 'rejected', review_note: note ? String(note).slice(0, 500) : null, reviewed_at: now });
  }
  if (want !== 'approve') throw fail(400, 'decision must be approve or reject');
  if (!actor || !allowHuman || !humans.includes(actor) || !String(actor).startsWith('human:')) {
    throw fail(403, 'only a recognised human can mark an item human-reviewed');
  }
  const tier = tierOf([{ by: actor }], humans);
  if (tier !== 'human-reviewed') throw fail(403, 'only a recognised human can mark an item human-reviewed');
  return writeItem(graph, found, {
    trust_tier: tier, status: 'stable', verified_by: actor, verified_at: now,
    review_decision: 'approved', review_note: note ? String(note).slice(0, 500) : null,
  });
}
