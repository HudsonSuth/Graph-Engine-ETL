// Lists every installed package's license and fails on GPL/AGPL/LGPL/SSPL/unknown.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('../node_modules/', import.meta.url).pathname, rows = [];
const visit = dir => { for (const n of readdirSync(dir)) { if (n.startsWith('.')) continue; const p = join(dir, n); if (n.startsWith('@')) { visit(p); continue; } const f = join(p, 'package.json'); if (existsSync(f)) { const j = JSON.parse(readFileSync(f, 'utf8')); rows.push([j.name, j.version, typeof j.license === 'string' ? j.license : j.license?.type || (j.licenses || []).map(l => l.type).join(' OR ') || 'UNKNOWN']); if (existsSync(join(p, 'node_modules'))) visit(join(p, 'node_modules')); } } };
visit(root);
rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
const bad = rows.filter(r => /GPL|SSPL|UNKNOWN|UNLICENSED/i.test(r[2]));
const counts = rows.reduce((m, r) => ((m[r[2]] = (m[r[2]] || 0) + 1), m), {});
console.log(rows.map(r => r.join('\t')).join('\n'));
console.log(`\n${rows.length} packages: ${Object.entries(counts).sort().map(([k, v]) => `${v} ${k}`).join(', ')}`);
if (bad.length) { console.error('NOT PERMISSIVE:', bad); process.exit(1); }
console.log('OK: no GPL/AGPL/LGPL/SSPL/unknown licenses');
