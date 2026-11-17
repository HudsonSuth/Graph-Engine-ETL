// Phase 1 core loop proof (SPEC §23.9). Writes:
//   proof/phase1-test-run.txt            correct implementation: core-loop (N), algorithms (B), core-loop-ui (C), MCP (M),
//                                         core-loop-kafka (NK, real broker) - must PASS
//   proof/phase1-core-wrong-run.txt      CORE_IMPL=wrong (CW1-CW5) on N + C + NK - must FAIL
//   proof/phase1-algo-wrong-run.txt      ALGO_IMPL=wrong (AW1-AW7) on B - must FAIL
//   proof/phase1-ui-wrong-run.txt        CORE_UI_IMPL=wrong (lasso ignores y) on C - must FAIL
// For each wrong run the file lists which tests failed. Exit code 0 only if the correct run passes and every wrong run fails.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)), dir = new URL('../../proof/', import.meta.url); mkdirSync(dir, { recursive: true });
const et = () => new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET';
const clean = s => s.split('\n').filter(l => !/TimeoutNegativeWarning|Timeout duration was set|--trace-warnings/.test(l)).join('\n');
const N = 'explore/test/core-loop.test.js', B = 'explore/test/algorithms.test.js', C = 'explore/test/core-loop-ui.test.js', M = 'explore/test/mcp.test.js', K = 'explore/test/core-loop-kafka.test.js';
const only = process.argv[2];
const runs = [['phase1-test-run.txt', 'Phase 1 suites, correct implementation (must PASS)', {}, [N, B, C, M, K]],
  ['phase1-core-wrong-run.txt', 'CORE_IMPL=wrong (CW1 hops-1, CW2 link-type filter ignored, CW3 shortest path only, CW4 live growth drops the new end node, CW5 summary counts outgoing only) - must FAIL', { CORE_IMPL: 'wrong' }, [N, C, K]],
  ['phase1-algo-wrong-run.txt', 'ALGO_IMPL=wrong (AW1 PageRank alpha 0.5, AW2 betweenness unnormalised, AW3 Leiden = Louvain at 3x resolution, AW4 Jaccard / (|A|+|B|), AW5 isolates merged into component 0, AW6 degree = out-degree, AW7 filter scope ignores where) - must FAIL', { ALGO_IMPL: 'wrong' }, [B]],
  ['phase1-ui-wrong-run.txt', 'CORE_UI_IMPL=wrong (lasso point-in-polygon ignores y) - must FAIL', { CORE_UI_IMPL: 'wrong' }, [C]]].filter(r => !only || r[0].includes(only));
const codes = [];
for (const [file, title, env, fs] of runs) {
  const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-force-exit', '--test-reporter=spec', ...fs], { cwd: root, env: { ...process.env, PHASE1_SHOTS: '0', ...env }, encoding: 'utf8', timeout: 1500000 });
  codes.push(r.status);
  const out = clean(r.stdout);
  const summary = (out.match(/^ℹ (tests|pass|fail|skipped) \d+$/gm) || []).join(', ');
  const failed = [...new Set((out.split('✖ failing tests:')[0].match(/^✖ (\S+)/gm) || []).map(s => s.slice(2)))];
  const passed = [...new Set((out.match(/^✔ (\S+)/gm) || []).map(s => s.slice(2)))];
  writeFileSync(new URL(file, dir), `# ${title}\n# date: ${et()}\n# exit code: ${r.status}  (${summary})\n# failed: ${failed.join(' ') || 'none'}\n# passed: ${passed.join(' ')}\n\n${out}\n${clean(r.stderr)}`);
  console.log(`${file}: exit ${r.status} ${summary}\n  failed: ${failed.join(' ') || 'none'}`);
}
process.exit(codes[0] === 0 && codes.slice(1).every(c => c !== 0) ? 0 : 1);
