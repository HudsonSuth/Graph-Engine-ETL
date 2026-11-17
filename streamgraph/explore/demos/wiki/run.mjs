// Seed-wiki demo (npm run demo:wiki): the agent-generated wiki (demo/wiki) imported into StreamGraph Integrated, then a
// scripted, rules-only agent session over MCP (no paid model): search, read, stale check, write a note, log, machine-verify,
// a refused human verification, RDF export and history compare.
//   node explore/demos/wiki/run.mjs [--serve] [--port 8094] [--data <dir>] [--in-place]
// The vaults are COPIED into <data>/vaults so the demo's writes never touch the repo (use --in-place to work on demo/wiki).
import { mkdtempSync, mkdirSync, cpSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
process.env.STREAMGRAPH_PROCESSING ??= 'off';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const serve = args.includes('--serve'), port = Number(opt('--port', serve ? 8094 : 0));
const dir = opt('--data') ? resolve(opt('--data')) : mkdtempSync(join(tmpdir(), 'sg-wiki-demo-'));
mkdirSync(dir, { recursive: true });
const seed = ['maritime-kb', 'app-docs'].map(v => join(ROOT, 'demo/wiki', v));
if (!seed.every(existsSync)) { console.error('seed wiki missing: run node demo/wiki/build-seed.mjs'); process.exit(1); }
const vaults = args.includes('--in-place') ? seed : seed.map(s => { const d = join(dir, 'vaults', s.split(/[\\/]/).pop()); if (!existsSync(d)) cpSync(s, d, { recursive: true }); return d; });
writeFileSync(join(dir, 'explore-settings.json'), JSON.stringify({ stream: { enabled: false }, er: { enabled: false } }));
const { startCombined } = await import('../../combined.js');
const { loadConfig } = await import('../../server/app.js');
const { buildMcpServer } = await import('../../server/mcp-server.js');
const cfg = loadConfig(join(dir, 'none.json'));
const app = await startCombined({ port, dataDir: join(dir, 'data'), log: null, config: { ...cfg, mcp: { ...cfg.mcp, wikiWrites: true } }, wikiDirs: vaults });
const base = `http://127.0.0.1:${app.port}`;
await fetch(base + '/api/studio/home'); // register the wiki types/fields with the access rules
const server = buildMcpServer(app.ex), [a, b] = InMemoryTransport.createLinkedPair(), client = new Client({ name: 'wiki-demo-agent', version: '1' });
await Promise.all([server.connect(a), client.connect(b)]);
const tool = async (name, x = {}) => { const r = await client.callTool({ name, arguments: x }); if (r.isError) return { error: r.content?.[0]?.text }; return r.structuredContent ?? { text: r.content?.[0]?.text }; };
const say = (k, v) => console.log(`${k.padEnd(28)} ${typeof v === 'string' ? v : JSON.stringify(v)}`);
const t0 = Date.now(), summary = {};
const v = await tool('wiki_vaults'); summary.vaults = v.vaults.map(x => `${x.slug} (${x.dialect}, ${x.visibleNotes} notes)`); say('vaults', summary.vaults.join(', '));
const s = await tool('wiki_search', { q: 'norfolk', limit: 5 }); summary.search = s.results.map(r => r.path); say('search "norfolk"', summary.search.join(', '));
const port1 = await tool('wiki_get', { vault: 'maritime-kb', path: 'Ports/Norfolk.md' });
summary.norfolk = { tier: port1.note.trust_tier, backlinks: port1.backlinks.length }; say('Norfolk', `${port1.note.trust_tier}, ${port1.backlinks.length} backlinks (vessels seen nearby)`);
const st = await tool('wiki_stale', { limit: 500 }); summary.stale = st.count; say('is it still true?', `${st.count} notes stale/unverified/draft/deprecated`);
const tiers = {}; for (const n of (await tool('wiki_outline')).notes) tiers[n.trust_tier] = (tiers[n.trust_tier] || 0) + 1; summary.tiers = tiers; say('trust tiers', tiers);
const q = await tool('query_cypher', { cypher: 'MATCH (a:Vessel)-[:PORT_OF_CALL]->(b:Port) RETURN a, b LIMIT 200' });
const busiest = {}; for (const r of q.rows || []) { const p = Object.values(r).find(x => x?.type === 'Port' || x?.label?.includes?.('Port'))?.label; if (p) busiest[p] = (busiest[p] || 0) + 1; }
const top = Object.entries(busiest).sort((x, y) => y[1] - x[1])[0];
say('query (wiki edges)', `${q.count ?? 0} vessel->port rows${top ? `; busiest: ${top[0]} (${top[1]})` : ''}`);
const tWrite = Date.now();
const w = await tool('wiki_write_note', { vault: 'maritime-kb', path: 'Observations/Port activity 2018-01-01.md',
  frontmatter: { label: 'Port activity on 2018-01-01 (agent observation)' },
  body: `# Port activity on 2018-01-01\nComputed by the demo agent from the wiki's own portOfCall edges (rules only, no model).\n\n${Object.entries(busiest).sort((x, y) => y[1] - x[1]).map(([p, n]) => `- [[${p}]]: ${n} vessel(s)`).join('\n') || '- no data'}\n` });
summary.write = w.error || w.path; say('wiki_write_note', w.error || `${w.path} -> ${w.id}`);
const lg = await tool('wiki_append_log', { vault: 'app-docs', kind: 'demo', text: 'Demo agent read the maritime KB and wrote a port-activity observation.', refs: ['wiki-as-memory'] }); say('wiki_append_log', lg.error || lg.path);
const vf = await tool('wiki_verify', { id: 'maritime-kb:Ports/Norfolk.md', note: 'demo agent re-checked the coordinates' }); summary.verify = vf.trust_tier; say('wiki_verify (agent)', `${vf.trust_tier} by ${vf.verified?.by}`);
const forged = await tool('wiki_write_note', { vault: 'maritime-kb', path: 'Observations/forged.md', frontmatter: { label: 'x', verified: [{ by: 'human:whsutherland' }] } }); summary.humanRefused = !!forged.error; say('forged human verification', forged.error ? `refused: ${forged.error}` : 'NOT REFUSED (bug)');
const ttl = await client.callTool({ name: 'wiki_export', arguments: { vault: 'maritime-kb', format: 'turtle' } }); summary.turtleBytes = ttl.content[0].text.length; say('wiki_export turtle', `${summary.turtleBytes} bytes, ${ttl.structuredContent?.triples} triples`);
await new Promise(r => setTimeout(r, 300));
const cmp = await tool('history_compare', { from: tWrite - 1, to: Date.now() + 1000 }); summary.historyAdded = cmp.added?.length ?? 0; say('history_compare', `${cmp.added?.length ?? 0} added, ${cmp.changed?.length ?? 0} changed since the write`);
say('elapsed', `${Date.now() - t0} ms`);
console.log(`\nVaults (Markdown, the source of truth): ${vaults.join('  ')}`);
console.log(`Explore UI: ${base}/explore   MCP: ${base}/mcp   wiki API: ${base}/api/explore/x/wiki/outline`);
if (args.includes('--json')) console.log('SUMMARY ' + JSON.stringify(summary));
await client.close(); await server.close();
if (!serve) { await app.close(); process.exit(summary.humanRefused && !String(summary.write).startsWith('agents') ? 0 : 1); }
else console.log('Serving (Ctrl+C to stop). Edit any note file and the graph follows.');
