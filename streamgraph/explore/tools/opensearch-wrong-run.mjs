// npm run proof:opensearch-wrong - runs test/opensearch.test.js against the DELIBERATELY WRONG search
// (STREAMGRAPH_SEARCH=broken: no access filter in the OpenSearch query and no re-check of hits) and saves the run to
// test/broken-opensearch-acl-run.txt. The suite must fail; this script exits 1 if it does not.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const r = spawnSync(process.execPath, ['--test', '--test-force-exit', '--test-reporter=spec', 'test/opensearch.test.js'], { env: { ...process.env, STREAMGRAPH_SEARCH: 'broken' }, encoding: 'utf8', timeout: 180000 });
const out = (r.stdout + r.stderr).split('\n').filter(l => !/^\s+at /.test(l)).join('\n');
writeFileSync('test/broken-opensearch-acl-run.txt', `# Deliberately wrong search (STREAMGRAPH_SEARCH=broken: no access filter in the OpenSearch query, no re-check of hits).\n# Command: STREAMGRAPH_SEARCH=broken node --test test/opensearch.test.js   (${new Date().toISOString()})\n# exit code ${r.status}. The suite must FAIL.\n\n${out}`);
console.log(r.status === 0 ? 'WRONG: the suite passed against the broken search' : `ok: the suite failed against the broken search (exit ${r.status}); saved test/broken-opensearch-acl-run.txt`);
process.exit(r.status === 0 ? 1 : 0);
