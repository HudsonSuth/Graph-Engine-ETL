// Proof the wiki suite catches a deliberately wrong implementation (WIKI_IMPL=broken, see src/wiki/broken.js):
// folder path in identity, no delete on re-import, any verifier = human, ingest drops bodies, validation accepts everything,
// agents may write human: actors. The broken run's output is kept in test-output/broken-wiki-run.txt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { testOutput } from './test-output.js';
test('wiki suite fails against the broken wiki implementation', () => {
  const file = fileURLToPath(new URL('./wiki.test.js', import.meta.url));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', file], { env: { ...env, WIKI_IMPL: 'broken' }, encoding: 'utf8' });
  writeFileSync(testOutput('broken-wiki-run.txt'), r.stdout);
  assert.notEqual(r.status, 0, 'suite must fail with the broken implementation');
  for (const name of ['W1 identity: moving a Vault-LD file keeps its IRI', 'W1 re-import applies only changes', 'W1 trust tiers: only human:whsutherland',
    'W2 Turtle -> existing vault -> Turtle is isomorphic and every body is unchanged', 'W3 schema problems carry the JSON pointer', 'writes: agents can never write human: actors'])
    assert.match(r.stdout, new RegExp('✖ ' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), name);
  const fails = Number(/ℹ fail (\d+)/.exec(r.stdout)?.[1] || 0);
  assert.ok(fails >= 8, `expected at least 8 failing tests, got ${fails}`);
});
