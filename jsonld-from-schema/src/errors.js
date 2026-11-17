// Errors and warnings (SPEC §9, D-03).
export class JsonLdSchemaError extends Error {
  constructor(code, path, message, details) {
    super(`${code} at ${path || '/'}: ${message}`);
    this.name = 'JsonLdSchemaError'; this.code = code; this.path = path || ''; this.details = details;
  }
}
export const fail = (code, path, message, details) => { throw new JsonLdSchemaError(code, path, message, details); };

export class Warnings {
  constructor() { this.list = []; this.seen = new Set(); }
  add(code, path, message) {
    const k = `${path}\u0000${code}\u0000${message}`;
    if (this.seen.has(k)) return;
    this.seen.add(k); this.list.push({ code, path: path || '', message });
  }
  sorted() {
    return [...this.list].sort((a, b) => cmp(a.path, b.path) || cmp(a.code, b.code) || cmp(a.message, b.message));
  }
}
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
