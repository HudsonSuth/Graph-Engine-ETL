// Deliberately wrong implementations: the integration suite must FAIL against each of them. Runs are saved to test/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../..', import.meta.url));
for (const [env, file, what] of [['EXPLORE_ABAC', 'broken-explore-abac-run.txt', 'explore ABAC boundary passes everything through'],
  ['HISTORY_IMPL', 'broken-history-run.txt', 'history compare ignores property changes and deletions'],
  ['QUERY_IMPL', 'broken-query-run.txt', 'query builder ignores WHERE and direction']]) {
  test(`integration suite fails against the broken ${what} (${env}=broken)`, () => {
    const r = spawnSync(process.execPath, ['--test', '--test-force-exit', 'test/integration/explore-abac.test.js'], { cwd: root, env: (({ NODE_TEST_CONTEXT, ...e }) => ({ ...e, [env]: 'broken' }))(process.env), encoding: 'utf8', timeout: 240000 });
    writeFileSync(new URL(`../${file}`, import.meta.url), `${env}=broken node --test test/integration/explore-abac.test.js\nexit code ${r.status}\n\n${r.stdout}\n${r.stderr}`);
    assert.notEqual(r.status, 0, 'the suite must fail against the wrong implementation');
    assert.match(r.stdout, /ℹ fail [1-9]/);
  });
}
