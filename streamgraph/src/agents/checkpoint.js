// File checkpointer for agent approvals (phase L5). LangGraph's SqliteSaver is a native addon and is
// rejected by the license gate, so this is a pure-JS saver: the same records MemorySaver keeps, written
// as JSON. A new process that opens the same file can resume a thread that was waiting on interrupt().
import { existsSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { brokenL45 } from '../llm/l45-wrong.js';

const DANGER = new Set(['__proto__', 'constructor', 'prototype']);

function encode(value) {
  if (value === undefined) return { __sg: 'u' };
  if (value instanceof Uint8Array) return { __sg: 'b', v: Buffer.from(value).toString('base64') };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (DANGER.has(k)) continue;
      out[k] = encode(v);
    }
    return out;
  }
  return value;
}

function decode(value) {
  if (!value || typeof value !== 'object') return value;
  if (value.__sg === 'u') return undefined;
  if (value.__sg === 'b' && typeof value.v === 'string') return new Uint8Array(Buffer.from(value.v, 'base64'));
  if (Array.isArray(value)) return value.map(decode);
  const out = Object.create(null);
  for (const [k, v] of Object.entries(value)) {
    if (DANGER.has(k)) continue;
    out[k] = decode(v);
  }
  return out;
}

export class FileSaver extends MemorySaver {
  constructor(file) {
    super();
    this.file = file;
    this.n = 0;
    this.#pending = Promise.resolve();
    this.#load();
  }
  #pending;
  #load() {
    if (brokenL45() || !this.file || !existsSync(this.file)) return;
    try {
      const raw = JSON.parse(readFileSync(this.file, 'utf8'));
      this.storage = decode(raw.storage || {});
      this.writes = decode(raw.writes || {});
    } catch { /* a damaged file starts empty; the next write replaces it */ }
  }
  #write() {
    if (brokenL45() || !this.file) return; // DELIBERATELY WRONG: nothing is written, so a restart loses the approval
    const body = JSON.stringify({ storage: encode(this.storage), writes: encode(this.writes) });
    const tmp = `${this.file}.${process.pid}.${++this.n}.tmp`;
    writeFileSync(tmp, body);
    try { renameSync(tmp, this.file); }
    catch { writeFileSync(this.file, body); rmSync(tmp, { force: true }); }
  }
  async #flush() {
    const job = this.#pending.then(() => this.#write());
    this.#pending = job.catch(() => {});
    await job;
  }
  async put(config, checkpoint, metadata) {
    const out = await super.put(config, checkpoint, metadata);
    await this.#flush();
    return out;
  }
  async putWrites(config, writes, taskId, taskPath) {
    await super.putWrites(config, writes, taskId, taskPath);
    await this.#flush();
  }
  async deleteThread(threadId) {
    await super.deleteThread(threadId);
    await this.#flush();
  }
}
