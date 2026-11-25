// L8 — interval schedules for agent flows. The file holds the flow (which can contain a prompt),
// so it stays gitignored next to the checkpoints. Firing re-checks agent.run for the user who
// created the schedule. The shortest interval is 30 seconds.
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const MIN_EVERY_SECONDS = 30;
export const MAX_EVERY_SECONDS = 7 * 24 * 3600;

function readDoc(file) {
  if (!file || !existsSync(file)) return { schedules: [] };
  try {
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    return { schedules: Array.isArray(doc?.schedules) ? doc.schedules : [] };
  } catch {
    return { schedules: [] };
  }
}

function writeDoc(file, doc) {
  if (!file) return;
  mkdirSync(dirname(file), { recursive: true });
  const body = JSON.stringify(doc);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, body);
  try { renameSync(tmp, file); }
  catch { writeFileSync(file, body); }
}

export function loadSchedules(file) {
  return readDoc(file).schedules.filter(s => s && typeof s.id === 'string');
}

export function publicSchedule(s) {
  return {
    id: s.id,
    name: s.name,
    everySeconds: s.everySeconds,
    enabled: s.enabled !== false,
    subjectId: s.subjectId || null,
    nextAt: s.nextAt || null,
    lastRun: s.lastRun || null,
    lastStatus: s.lastStatus || null,
    lastThreadId: s.lastThreadId || null,
    ...(s.lastError ? { lastError: String(s.lastError).slice(0, 300) } : {}),
    flowName: s.flow?.name || null,
  };
}

export function createSchedule(file, { name, flow, input, everySeconds, enabled, subjectId }, now = Date.now()) {
  const every = Number(everySeconds);
  if (!Number.isInteger(every) || every < MIN_EVERY_SECONDS || every > MAX_EVERY_SECONDS) {
    throw Object.assign(new Error(`everySeconds must be a whole number from ${MIN_EVERY_SECONDS} to ${MAX_EVERY_SECONDS}`), { status: 400 });
  }
  if (!name || typeof name !== 'string' || name.length > 80) throw Object.assign(new Error('a schedule needs a name'), { status: 400 });
  if (!flow || typeof flow !== 'object') throw Object.assign(new Error('a schedule needs a flow'), { status: 400 });
  const id = `sch_${randomUUID()}`;
  const row = {
    id, name: name.trim(), flow, input: input ?? '', everySeconds: every, enabled: enabled !== false,
    subjectId: subjectId || null, nextAt: now + every * 1000, lastRun: null, lastStatus: null, lastThreadId: null,
  };
  const doc = readDoc(file);
  doc.schedules.push(row);
  writeDoc(file, doc);
  return row;
}

export function updateSchedule(file, id, patch) {
  const doc = readDoc(file);
  const row = doc.schedules.find(s => s.id === id);
  if (!row) return null;
  if (patch.enabled != null) row.enabled = !!patch.enabled;
  writeDoc(file, doc);
  return row;
}

export function deleteSchedule(file, id) {
  const doc = readDoc(file);
  const before = doc.schedules.length;
  doc.schedules = doc.schedules.filter(s => s.id !== id);
  if (doc.schedules.length === before) return false;
  writeDoc(file, doc);
  return true;
}

export function noteScheduleRun(file, id, { status, threadId, error }, now = Date.now()) {
  const doc = readDoc(file);
  const row = doc.schedules.find(s => s.id === id);
  if (!row) return;
  row.lastRun = now;
  row.lastStatus = status || null;
  row.lastThreadId = threadId || null;
  row.lastError = error ? String(error).slice(0, 300) : undefined;
  row.nextAt = now + row.everySeconds * 1000;
  writeDoc(file, doc);
}

/**
 * Fire due schedules. `onFire(schedule)` runs the flow as that schedule's subject.
 * Returns the ids that fired.
 */
export function createScheduler({ file, onFire, intervalMs = 5000 }) {
  const inflight = new Set();
  let timer = null;
  async function tick(now = Date.now()) {
    const due = loadSchedules(file).filter(s => s.enabled !== false && !inflight.has(s.id) && (s.nextAt || 0) <= now);
    const fired = [];
    for (const s of due) {
      inflight.add(s.id);
      fired.push(s.id);
      try {
        const result = await onFire(s);
        noteScheduleRun(file, s.id, { status: result?.status || 'completed', threadId: result?.threadId || null }, now);
      } catch (e) {
        noteScheduleRun(file, s.id, { status: 'error', error: e.message }, now);
      } finally {
        inflight.delete(s.id);
      }
    }
    return fired;
  }
  return {
    tick,
    start() {
      if (timer) return;
      timer = setInterval(() => { tick().catch(() => {}); }, intervalMs);
      timer.unref?.();
    },
    stop() { if (timer) clearInterval(timer); timer = null; },
  };
}
