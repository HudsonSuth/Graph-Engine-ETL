// Tiny SQL adapter: write SQL with ? placeholders; Postgres drivers get $1..$n.
import { DatabaseSync } from 'node:sqlite';
import { isAbsolute, resolve } from 'node:path';
const toPg = sql => { let i = 0; return sql.replace(/\?/g, () => '$' + (++i)); };
const norm = r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : typeof v === 'bigint' ? Number(v) : v]));
export const ident = s => { if (!/^[A-Za-z_]\w*$/.test(s)) throw new Error(`Bad identifier: ${s}`); return s; };

export async function openDb(cfg, baseDir = '.') {
  const driver = cfg.driver || 'sqlite';
  if (driver === 'sqlite') {
    // Works for POSIX and Windows paths (C:\\..., \\\\server\\share) alike.
    const path = cfg.database === ':memory:' || isAbsolute(cfg.database || '') ? cfg.database : resolve(baseDir, cfg.database || '');
    const db = cfg.instance || new DatabaseSync(path);
    return { all: async (sql, p = []) => db.prepare(sql).all(...p).map(norm), close: () => !cfg.instance && db.close() };
  }
  if (driver === 'pglite') {
    const db = cfg.instance || new (await import('@electric-sql/pglite')).PGlite(cfg.dataDir);
    return { all: async (sql, p = []) => (await db.query(toPg(sql), p)).rows.map(norm), close: () => !cfg.instance && db.close() };
  }
  if (driver === 'postgres') {
    const pg = (await import('pg')).default;
    const pool = new pg.Pool({ connectionString: cfg.connectionString });
    return { all: async (sql, p = []) => (await pool.query(toPg(sql), p)).rows.map(norm), close: () => pool.end() };
  }
  throw new Error(`Unknown driver ${driver}`);
}
