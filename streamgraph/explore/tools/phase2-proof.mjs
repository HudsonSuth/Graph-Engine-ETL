// Phase 2 scale & readability proof (SPEC §24.7). Writes:
//   proof/phase2-test-run.txt           correct implementation: scale (P), scale-ui (Q), MCP (M) - must PASS
//   proof/phase2-scale-wrong-run.txt    SCALE_IMPL=wrong (SW1/SW2 aggregation, BW1/BW2 bundling, CW1/CW2 cost, layout WL1-WL3) on P - must FAIL
//   proof/phase2-ui-wrong-run.txt       SCALE_UI_IMPL=wrong (UW1 wrong layouts, UW2 clusters never expand, UW3 map clusters ignore selection,
//                                       bundling worker moves endpoints) on Q - must FAIL
// Exit code 0 only if the correct run passes and every wrong run fails.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)), dir = new URL('../../proof/', import.meta.url); mkdirSync(dir, { recursive: true });
const et = () => new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET';
const clean = s => s.split('\n').filter(l => !/TimeoutNegativeWarning|Timeout duration was set|--trace-warnings/.test(l)).join('\n');
const P = 'explore/test/scale.test.js', Q = 'explore/test/scale-ui.test.js', M = 'explore/test/mcp.test.js';
const only = process.argv[2];
const runs = [['phase2-test-run.txt', 'Phase 2 suites, correct implementation (must PASS)', {}, [P, Q, M]],
  ['phase2-scale-wrong-run.txt', 'SCALE_IMPL=wrong (SW1 meta-edges only a<b, SW2 isolated nodes dropped, BW1 all pairs compatible, BW2 endpoints move, CW1 neighbourhood estimate ignores hops>1, CW2 betweenness always priced as sampled, timeline by id, geo lat/lon swapped, group-in-a-box one group, unseeded force) - must FAIL', { SCALE_IMPL: 'wrong' }, [P]],
  ['phase2-ui-wrong-run.txt', 'SCALE_UI_IMPL=wrong (UW1 wrong timeline/geo/community layouts, UW2 clicking a cluster never expands it, UW3 map clusters ignore the selection, bundle worker moves endpoints) - must FAIL', { SCALE_UI_IMPL: 'wrong' }, [Q]]].filter(r => !only || r[0].includes(only));
const codes = [];
for (const [file, title, env, fs] of runs) {
  const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-force-exit', '--test-reporter=spec', ...fs], { cwd: root, env: { ...process.env, PHASE2_SHOTS: '0', ...env }, encoding: 'utf8', timeout: 1500000 });
  codes.push(r.status);
  const out = clean(r.stdout);
  const summary = (out.match(/^ℹ (tests|pass|fail|skipped) \d+$/gm) || []).join(', ');
  const failed = [...new Set((out.split('✖ failing tests:')[0].match(/^✖ (\S+)/gm) || []).map(s => s.slice(2)))];
  const passed = [...new Set((out.match(/^✔ (\S+)/gm) || []).map(s => s.slice(2)))];
  writeFileSync(new URL(file, dir), `# ${title}\n# date: ${et()}\n# exit code: ${r.status}  (${summary})\n# failed: ${failed.join(' ') || 'none'}\n# passed: ${passed.join(' ')}\n\n${out}\n${clean(r.stderr)}`);
  console.log(`${file}: exit ${r.status} ${summary}\n  failed: ${failed.join(' ') || 'none'}`);
}
process.exit(codes[0] === 0 && codes.slice(1).every(c => c !== 0) ? 0 : 1);
