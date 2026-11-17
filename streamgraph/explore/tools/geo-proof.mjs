// Map viewer / geo grid proof (SPEC §22.8). Writes:
//   proof/geo-test-run.txt                 correct implementation: geo + flink-geo + geo-ui suites (must PASS)
//   proof/geo-wrong-impl-run.txt           GEO_IMPL=wrong (GW1-GW8: lat/lon swap, antimeridian, coarse H3, no dedupe, MGRS truncation,
//                                          equirectangular projection, straight arcs, access rules skipped) on geo + geo-ui (must FAIL)
//   proof/flink-geo-wrong-impl-run.txt     FLINK_IMPL=wrong (Flink job swaps lat/lon before H3) on flink-geo (must FAIL)
//   proof/views-map-wrong-impl-run.txt     VIEWS_IMPL=wrong (wrong saved-view store) on geo-ui (must FAIL)
// Exit code 0 only if the correct run passes and every wrong run fails.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)), dir = new URL('../../proof/', import.meta.url); mkdirSync(dir, { recursive: true });
const et = () => new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET';
const clean = s => s.split('\n').filter(l => !/TimeoutNegativeWarning|Timeout duration was set|--trace-warnings/.test(l)).join('\n');
const G = 'explore/test/geo.test.js', F = 'explore/test/flink-geo.test.js', U = 'explore/test/geo-ui.test.js';
const runs = [['geo-test-run.txt', 'Map viewer + geo grid suites, correct implementation (must PASS)', {}, [G, F, U]],
  ['geo-wrong-impl-run.txt', 'GEO_IMPL=wrong (GW1-GW8) - must FAIL', { GEO_IMPL: 'wrong' }, [G, U]],
  ['flink-geo-wrong-impl-run.txt', 'FLINK_IMPL=wrong: the Flink job swaps lat/lon before computing the H3 cell - must FAIL', { FLINK_IMPL: 'wrong' }, [F]],
  ['views-map-wrong-impl-run.txt', 'VIEWS_IMPL=wrong: deliberately wrong saved-view store - must FAIL', { VIEWS_IMPL: 'wrong' }, [U]]];
const codes = [];
for (const [file, title, env, fs] of runs) {
  const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-force-exit', ...fs], { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 1500000 });
  codes.push(r.status);
  const summary = (r.stdout.match(/^ℹ (tests|pass|fail|skipped) \d+$/gm) || []).join(', ');
  writeFileSync(new URL(file, dir), `# ${title}\n# date: ${et()}\n# exit code: ${r.status}  (${summary})\n\n${clean(r.stdout)}\n${clean(r.stderr)}`);
  console.log(`${file}: exit ${r.status} ${summary}`);
}
process.exit(codes[0] === 0 && codes.slice(1).every(c => c !== 0) ? 0 : 1);
