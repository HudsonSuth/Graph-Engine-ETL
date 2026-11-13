import { Source } from './base.js';
import { openDb, ident } from '../db.js';

export class SqlTableSource extends Source { // one-shot table read (batch ETL)
  async poll(emit) {
    if (this.done) return;
    const db = await openDb(this.cfg, this.ctx.baseDir);
    try { for (const r of await db.all(`SELECT * FROM ${ident(this.cfg.table)}`)) await emit({ op: 'c', topic: this.topic || this.cfg.table, data: r }); }
    finally { await db.close(); }
    this.done = true;
  }
}

// Polling CDC: watermark on updated_at, deletes by key-set diff or a soft-delete flag.
export class CdcSource extends Source {
  state = new Map(); wm = null;
  get topic() { return this.cfg.topic || this.cfg.table; }
  async poll(emit) {
    this.db ??= await openDb(this.cfg, this.ctx.baseDir);
    const t = ident(this.cfg.table), k = ident(this.cfg.key), u = this.cfg.fullScan ? null : ident(this.cfg.updatedAt || 'updated_at'), flag = this.cfg.deletedFlag && ident(this.cfg.deletedFlag);
    const rows = this.cfg.fullScan ? await this.db.all(`SELECT * FROM ${t}`) : this.wm == null ? await this.db.all(`SELECT * FROM ${t} ORDER BY ${u}`) : await this.db.all(`SELECT * FROM ${t} WHERE ${u} >= ? ORDER BY ${u}`, [this.wm]);
    for (const r of rows) {
      const id = String(r[k]), before = this.state.get(id);
      if (before && JSON.stringify(before) === JSON.stringify(r)) continue;
      if (flag && r[flag] && r[flag] !== '0' && r[flag] !== 'false') {
        if (before) await emit({ op: 'd', topic: this.topic, data: before, before });
        this.state.delete(id);
      } else {
        await emit(before ? { op: 'u', topic: this.topic, data: r, before } : { op: 'c', topic: this.topic, data: r });
        this.state.set(id, r);
      }
      if (!this.cfg.fullScan && (this.wm == null || r[u] > this.wm)) this.wm = r[u];
    }
    if (this.cfg.detectDeletes ?? true) {
      const live = new Set((await this.db.all(`SELECT ${k} AS k FROM ${t}`)).map(r => String(r.k)));
      for (const [id, before] of this.state) if (!live.has(id)) { await emit({ op: 'd', topic: this.topic, data: before, before }); this.state.delete(id); }
    }
  }
  async stop() { await super.stop(); await this.db?.close(); this.db = null; }
}
