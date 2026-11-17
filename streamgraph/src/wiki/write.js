// Writes go to the Markdown FILE (the source of truth), atomically (temp file + rename); the caller then re-imports.
// Rules:
//  - paths stay inside the vault, end in .md, no hidden/.. segments, never context.jsonld / schemas/ / OKF reserved files
//  - an existing note is only replaced when the caller passes the sha256 it read (optimistic concurrency, 409 otherwise)
//  - generated = { by: <writer>, at: <now> } is stamped by the server; callers cannot set it
//  - callers cannot set `verified`; existing verifications survive only if the note's content is unchanged
//  - agents (allowHuman = false) can NEVER write a `human:` actor anywhere in the frontmatter (generated/verified are
//    server-controlled: a submitted copy is discarded, so echoing back a note you read is fine)
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { splitNote, joinNote, sha256 } from './parse.js';
import { atomicWrite } from './rdf.js';
import { RESERVED_OKF } from './vault.js';
import { broken } from './broken.js';

export const MAX_NOTE = 256 * 1024;
const fail = (status, message) => Object.assign(new Error(message), { status });
const hasHuman = v => (typeof v === 'string' ? /^\s*human:/i.test(v) : Array.isArray(v) ? v.some(hasHuman) : v && typeof v === 'object' ? Object.values(v).some(hasHuman) : false);

export function safePath(dir, path, dialect) {
  const p = posix.normalize(String(path || '').replace(/\\/g, '/')).replace(/^\.\//, '');
  if (!p || p.startsWith('/') || p.startsWith('..') || p.split('/').some(s => !s || s.startsWith('.'))) throw fail(400, `invalid note path "${path}"`);
  if (!p.toLowerCase().endsWith('.md')) throw fail(400, 'note paths must end in .md');
  if (p.startsWith('schemas/')) throw fail(400, 'schemas/ holds JSON Schemas, not notes');
  if (dialect === 'okf' && RESERVED_OKF.includes(posix.basename(p).toLowerCase())) throw fail(400, `${posix.basename(p)} is reserved in OKF (use the log tool for log.md)`);
  return { rel: p, file: join(dir, p) };
}
const read = file => (existsSync(file) ? readFileSync(file, 'utf8') : null);
const stripTrust = fm => { const { generated, verified, ...rest } = fm || {}; return rest; };
const canonFm = fm => JSON.stringify(fm, Object.keys(fm || {}).sort());

/** Create or update a note. Returns { path, sha256, created, verificationsKept }. */
export function writeNote(dir, dialect, { path, frontmatter = {}, body = '', actor, expectedSha = null, now = new Date().toISOString(), allowHuman = false }) {
  const { rel, file } = safePath(dir, path, dialect);
  if (!actor || typeof actor !== 'string') throw fail(400, 'a writer actor is required');
  if (frontmatter === null || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) throw fail(400, 'frontmatter must be an object');
  if ('@context' in frontmatter) throw fail(400, 'notes must not carry @context (the vault context is shared and external)');
  if (!allowHuman && !broken()) {
    if (actor.startsWith('human:')) throw fail(403, 'agents cannot act as a human: actor');
    if (hasHuman(stripTrust(frontmatter))) throw fail(403, 'agents cannot write human: actors (only a recognised human can, from the UI)');
  }
  const text = typeof body === 'string' ? body : String(body ?? '');
  const old = read(file);
  if (!allowHuman && !broken() && frontmatter.verified != null) { // echoing back what was read is fine; a NEW human claim is not
    const had = new Set((old != null ? [].concat(splitNote(old).frontmatter?.verified ?? []) : []).map(v => JSON.stringify(v)));
    if ([].concat(frontmatter.verified).some(v => hasHuman(v) && !had.has(JSON.stringify(v)))) throw fail(403, 'agents cannot write human: actors (only a recognised human can verify, from the UI)');
  }
  if (old != null) {
    if (!expectedSha) throw fail(409, `${rel} already exists; pass expectedSha (from wiki_get) to update it`);
    if (sha256(old) !== expectedSha) throw fail(409, `${rel} changed since you read it (sha256 mismatch); read it again`);
  }
  const prev = old != null ? splitNote(old) : null;
  const fm = { ...stripTrust(frontmatter) };
  if (!broken()) delete fm.verified;
  else if (frontmatter.verified) fm.verified = frontmatter.verified;
  if (dialect === 'okf' && (fm.type == null || fm.type === '')) throw fail(400, 'OKF notes need a type');
  if (old == null && fm.status == null) fm.status = 'draft';
  fm.generated = { by: actor, at: now };
  let kept = 0;
  const pv = prev?.frontmatter?.verified;
  if (pv && !fm.verified && canonFm(stripTrust(prev.frontmatter)) === canonFm(stripTrust(fm)) && prev.body === normBody(text)) { fm.verified = pv; kept = Array.isArray(pv) ? pv.length : 1; }
  const out = joinNote(fm, normBody(text));
  if (out.length > MAX_NOTE) throw fail(413, `note too large (max ${MAX_NOTE} bytes)`);
  atomicWrite(file, out);
  return { path: rel, sha256: sha256(out), created: old == null, verificationsKept: kept };
}
const normBody = b => (b === '' || b.endsWith('\n') ? b : b + '\n');

/** Add a verified entry. allowHuman only for a recognised human acting through the UI. */
export function verifyNote(dir, dialect, { path, actor, note = null, now = new Date().toISOString(), allowHuman = false, expectedSha = null }) {
  const { rel, file } = safePath(dir, path, dialect);
  if (!actor) throw fail(400, 'a verifier actor is required');
  if (actor.startsWith('human:') && !allowHuman && !broken()) throw fail(403, 'agents cannot verify as a human: actor (an agent can never mark a note human-reviewed)');
  const old = read(file); if (old == null) throw fail(404, `no note ${rel}`);
  if (expectedSha && sha256(old) !== expectedSha) throw fail(409, `${rel} changed since you read it`);
  const { frontmatter, body } = splitNote(old);
  if (!frontmatter) throw fail(400, `${rel} has no frontmatter to verify`);
  const list = frontmatter.verified == null ? [] : Array.isArray(frontmatter.verified) ? frontmatter.verified : [frontmatter.verified];
  const entry = { by: actor, at: now, ...(note ? { note: String(note).slice(0, 500) } : {}) };
  const out = joinNote({ ...frontmatter, verified: [...list, entry] }, body);
  atomicWrite(file, out);
  return { path: rel, sha256: sha256(out), verified: entry };
}

/** Append one episodic entry to log.md (created if missing). */
export function appendLog(dir, { actor, text, kind = 'note', refs = [], now = new Date().toISOString(), allowHuman = false }) {
  if (!actor) throw fail(400, 'an actor is required');
  if (actor.startsWith('human:') && !allowHuman && !broken()) throw fail(403, 'agents cannot log as a human: actor');
  const line = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!line) throw fail(400, 'log text is empty');
  const k = String(kind).replace(/[^\w-]/g, '').slice(0, 30) || 'note';
  const r = (Array.isArray(refs) ? refs : []).slice(0, 20).map(x => `[[${String(x).replace(/[\[\]|\n]/g, '')}]]`).join(' ');
  const file = join(dir, 'log.md'), old = read(file) ?? '# Log\n';
  const out = old + (old.endsWith('\n') ? '' : '\n') + `- ${now} [${k}] ${line}${r ? ' ' + r : ''} (by ${actor})\n`;
  atomicWrite(file, out);
  return { path: 'log.md', sha256: sha256(out) };
}
