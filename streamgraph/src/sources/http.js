import { Source, Differ, toEvent } from './base.js';
import { evaluate } from '../expr.js';
export class HttpSource extends Source {
  async poll(emit) {
    const res = await fetch(this.cfg.url, { headers: this.cfg.headers || {} });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${this.cfg.url}`);
    let body = await res.json();
    if (this.cfg.itemsPath) body = await evaluate(this.cfg.itemsPath, body);
    const rows = Array.isArray(body) ? body : body == null ? [] : [body];
    if (this.cfg.key) { this.differ ??= new Differ(this.cfg.key); for (const ev of this.differ.diff(rows, this.topic, this.cfg.detectDeletes ?? false)) await emit(ev); }
    else for (const r of rows) await emit(toEvent(r, this.topic));
  }
}
