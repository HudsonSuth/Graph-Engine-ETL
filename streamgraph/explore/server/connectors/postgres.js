// Relational connector (SPEC §4.4.2) for Postgres (and other SQL via the same pg-style `query(text, params)`).
// Configured mappings only — never ad-hoc SQL from the browser. Identifiers are validated against an allowlist
// at construction time and always quoted; every value is a bind parameter.
import { envelope, capLimit, fail } from './common.js';

const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
const q = id => id.split('.').map(p => `"${p}"`).join('.');
function checkIdent(name, allow, what) {
  const parts = String(name).split('.');
  if (parts.length > 2 || !parts.every(p => IDENT.test(p))) throw new Error(`invalid ${what} identifier: ${name}`);
  if (allow && !allow.includes(name)) throw new Error(`${what} ${name} is not in the allowlist`);
  return name;
}

export class PostgresConnector {
  /**
   * mappings: {
   *   nodes: [{ name?, table, idColumns: ['id'], type, labelColumn?, propertyColumns: [...] , searchColumns?: [...] }],
   *   links: [{ table, idColumns, type, from: { node: <node mapping name|table>, columns: [...] }, to: { node, columns }, propertyColumns }]
   * }
   */
  constructor({ sourceId = 'pg', pool, mappings, allowedTables = null, separator = '|', maxPageSize = 1000, timeoutMs = 10000, secrets = [] } = {}) {
    Object.assign(this, { sourceId, pool, separator, maxPageSize, timeoutMs, secrets });
    this.nodes = (mappings?.nodes || []).map(m => {
      checkIdent(m.table, allowedTables, 'table');
      for (const c of [...m.idColumns, ...(m.propertyColumns || []), ...(m.labelColumn ? [m.labelColumn] : []), ...(m.searchColumns || [])]) checkIdent(c, null, 'column');
      if (!m.idColumns?.length || !m.type) throw new Error(`node mapping for ${m.table} needs idColumns and type`);
      return { name: m.name || m.table, searchColumns: m.searchColumns || (m.labelColumn ? [m.labelColumn] : []), propertyColumns: [], ...m };
    });
    const byName = new Map(this.nodes.map(n => [n.name, n]));
    this.links = (mappings?.links || []).map(m => {
      checkIdent(m.table, allowedTables, 'table');
      for (const c of [...m.idColumns, ...m.from.columns, ...m.to.columns, ...(m.propertyColumns || [])]) checkIdent(c, null, 'column');
      const from = byName.get(m.from.node), to = byName.get(m.to.node);
      if (!from || !to) throw new Error(`link mapping ${m.table}: unknown endpoint node mapping`);
      if (from.idColumns.length !== m.from.columns.length || to.idColumns.length !== m.to.columns.length) throw new Error(`link mapping ${m.table}: endpoint column count mismatch`);
      return { name: m.name || m.table, propertyColumns: [], ...m, fromMap: from, toMap: to };
    });
    this.byName = byName;
  }
  capabilities() { return { queryLanguage: 'sql-mappings', expand: true, maxPageSize: this.maxPageSize, stream: false, estimatedLagMs: null }; }
  async health() { try { await this.pool.query('SELECT 1'); return { status: 'ok' }; } catch { return { status: 'unavailable', message: 'cannot reach database' }; } }

  nativeId(row, cols) { const vals = cols.map(c => row[c]); return vals.some(v => v == null) ? null : vals.map(String).join(this.separator); }
  nodeId(m, native) { return `${this.sourceId}:node:${m.name}:${native}`; }
  linkId(m, native) { return `${this.sourceId}:link:${m.name}:${native}`; }
  parseNodeId(id) {
    const pre = `${this.sourceId}:node:`; if (!id.startsWith(pre)) return null;
    const rest = id.slice(pre.length), i = rest.indexOf(':'); if (i < 0) return null;
    const m = this.byName.get(rest.slice(0, i)); if (!m) return null;
    const vals = rest.slice(i + 1).split(this.separator); if (vals.length !== m.idColumns.length) return null;
    return { m, vals };
  }
  #cols(m, extra = []) { return [...new Set([...m.idColumns, ...(m.labelColumn ? [m.labelColumn] : []), ...m.propertyColumns, ...extra])].map(q).join(', '); }
  rowToNode(m, row, fetchedAt) {
    const native = this.nativeId(row, m.idColumns); if (native == null) return null;
    const props = {}; for (const c of m.propertyColumns) props[c] = jsonValue(row[c]);
    const label = m.labelColumn && row[m.labelColumn] != null ? String(row[m.labelColumn]) : undefined;
    return { id: this.nodeId(m, native), kind: 'node', type: m.type, ...(label ? { label } : {}), properties: props, sources: [{ sourceId: this.sourceId, nativeId: `${m.table}:${native}`, fetchedAt }] };
  }
  rowToLink(m, row, fetchedAt, warnings) {
    const native = this.nativeId(row, m.idColumns);
    const f = this.nativeId(row, m.from.columns), t = this.nativeId(row, m.to.columns);
    if (native == null || f == null || t == null) { warnings.push({ code: 'null_endpoint', message: `${m.table}: row skipped (NULL id or endpoint)` }); return null; }
    const props = {}; for (const c of m.propertyColumns) props[c] = jsonValue(row[c]);
    return { id: this.linkId(m, native), kind: 'link', type: m.type, fromId: this.nodeId(m.fromMap, f), toId: this.nodeId(m.toMap, t), directed: true, properties: props, sources: [{ sourceId: this.sourceId, nativeId: `${m.table}:${native}`, fetchedAt }] };
  }
  #query(text, params) { return this.pool.query({ text, values: params, ...(this.timeoutMs ? { query_timeout: this.timeoutMs } : {}) }); }

  async search({ types = null, text = null, limit = 100, cursor = null, requestId = null } = {}) {
    const startedAt = Date.now(), lim = capLimit(limit, this.maxPageSize), fetchedAt = new Date().toISOString();
    const [mi, off] = String(cursor || '0:0').split(':').map(Number);
    const items = [], warnings = []; let truncated = false, next = null;
    try {
      const maps = this.nodes.filter(m => !types || types.includes(m.type));
      for (let i = mi; i < maps.length && items.length < lim; i++) {
        const m = maps[i], need = lim - items.length, offset = i === mi ? off : 0;
        const where = text && m.searchColumns.length ? `WHERE ${m.searchColumns.map(c => `CAST(${q(c)} AS TEXT) ILIKE $3`).join(' OR ')}` : '';
        const sql = `SELECT ${this.#cols(m, m.searchColumns)} FROM ${q(m.table)} ${where} ORDER BY ${m.idColumns.map(q).join(', ')} LIMIT $1 OFFSET $2`;
        const { rows } = await this.#query(sql, where ? [need + 1, offset, `%${escapeLike(text)}%`] : [need + 1, offset]);
        for (const r of rows.slice(0, need)) { const n = this.rowToNode(m, r, fetchedAt); if (n) items.push(n); }
        if (rows.length > need) { truncated = true; next = `${i}:${offset + need}`; break; }
        if (items.length >= lim && i + 1 < maps.length) { truncated = true; next = `${i + 1}:0`; break; }
      }
      return envelope({ requestId, sourceId: this.sourceId, items, truncated, nextCursor: next, warnings, startedAt });
    } catch (e) { return fail(this.sourceId, 'source_unavailable', e, this.secrets, startedAt); }
  }

  /** Expand: link rows whose from/to match the seeds, then endpoint nodes via node mappings. */
  async expand({ ids = [], direction = 'both', types = null, limit = 100, requestId = null } = {}) {
    const startedAt = Date.now(), lim = capLimit(limit, this.maxPageSize), fetchedAt = new Date().toISOString();
    const seeds = ids.map(i => this.parseNodeId(i)).filter(Boolean);
    const out = new Map(), warnings = []; let truncated = false;
    const wantNodes = new Map(); // mapping name -> Set(native)
    const want = (m, native) => { if (!wantNodes.has(m.name)) wantNodes.set(m.name, new Set()); wantNodes.get(m.name).add(native); };
    try {
      for (const s of seeds) want(s.m, s.vals.join(this.separator));
      for (const l of this.links) {
        for (const side of ['from', 'to']) {
          if (direction === 'out' && side === 'to') continue;
          if (direction === 'in' && side === 'from') continue;
          const mine = side === 'from' ? l.fromMap : l.toMap, cols = l[side].columns;
          const keys = seeds.filter(s => s.m === mine).map(s => s.vals);
          if (!keys.length) continue;
          const params = [], conds = keys.map(vals => '(' + cols.map((c, j) => { params.push(vals[j]); return `CAST(${q(c)} AS TEXT) = $${params.length}`; }).join(' AND ') + ')');
          params.push(lim + 1);
          const sql = `SELECT ${[...new Set([...l.idColumns, ...l.from.columns, ...l.to.columns, ...l.propertyColumns])].map(q).join(', ')} FROM ${q(l.table)} WHERE ${conds.join(' OR ')} LIMIT $${params.length}`;
          const { rows } = await this.#query(sql, params);
          if (rows.length > lim) truncated = true;
          for (const r of rows.slice(0, lim)) {
            const link = this.rowToLink(l, r, fetchedAt, warnings); if (!link) continue;
            out.set(link.id, link);
            want(l.fromMap, this.nativeId(r, l.from.columns)); want(l.toMap, this.nativeId(r, l.to.columns));
          }
        }
      }
      for (const [name, natives] of wantNodes) {
        const m = this.byName.get(name);
        if (types && !types.includes(m.type) && !seeds.some(s => s.m === m)) continue;
        const list = [...natives], params = [];
        const conds = list.map(n => '(' + m.idColumns.map((c, j) => { params.push(n.split(this.separator)[j]); return `CAST(${q(c)} AS TEXT) = $${params.length}`; }).join(' AND ') + ')');
        const { rows } = await this.#query(`SELECT ${this.#cols(m)} FROM ${q(m.table)} WHERE ${conds.join(' OR ')}`, params);
        for (const r of rows) { const n = this.rowToNode(m, r, fetchedAt); if (n) out.set(n.id, n); }
      }
      return envelope({ requestId, sourceId: this.sourceId, items: [...out.values()], truncated, warnings, startedAt });
    } catch (e) { return fail(this.sourceId, 'source_unavailable', e, this.secrets, startedAt); }
  }
  async refresh({ ids = [], requestId = null } = {}) {
    const startedAt = Date.now(), fetchedAt = new Date().toISOString(), items = [], warnings = [];
    try {
      for (const id of ids) {
        const p = this.parseNodeId(id); if (!p) { warnings.push({ code: 'not_found', message: id }); continue; }
        const params = p.vals; const { rows } = await this.#query(`SELECT ${this.#cols(p.m)} FROM ${q(p.m.table)} WHERE ${p.m.idColumns.map((c, j) => `CAST(${q(c)} AS TEXT) = $${j + 1}`).join(' AND ')}`, params);
        const n = rows[0] && this.rowToNode(p.m, rows[0], fetchedAt);
        if (n) items.push(n); else warnings.push({ code: 'not_found', message: id });
      }
      return envelope({ requestId, sourceId: this.sourceId, items, warnings, startedAt });
    } catch (e) { return fail(this.sourceId, 'source_unavailable', e, this.secrets, startedAt); }
  }
}
const escapeLike = s => String(s).replace(/[\\%_]/g, m => '\\' + m);
function jsonValue(v) {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'bigint') return Number.isSafeInteger(Number(v)) ? Number(v) : v.toString();
  if (Buffer.isBuffer?.(v)) return v.toString('base64');
  return v === undefined ? null : v;
}
