// Offline agent evals (L9). Deterministic fake model, committed fixtures, no network.
// Exit 1 when any case fails.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FakeChatModel, GOOD_KEY } from '../test/fixtures/fake-chat-model.js';
import { runEvalSuite } from '../src/agents/eval.js';

const root = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || join(root, '../test/fixtures/agent-eval/cases.json');
const cases = JSON.parse(readFileSync(file, 'utf8')).cases;
const model = new FakeChatModel({ toolCalling: true, apiKey: GOOD_KEY });
const summary = await runEvalSuite(cases, { model });
for (const r of summary.results) {
  const mark = r.pass ? 'pass' : 'FAIL';
  const why = r.checks.filter(c => !c.ok).map(c => `${c.name} want ${JSON.stringify(c.want)} got ${JSON.stringify(c.got ?? null)}`).join('; ');
  console.log(`${mark} ${r.id} (${r.status})${why ? ' — ' + why : ''}`);
}
console.log(`eval: ${summary.pass} passed, ${summary.fail} failed`);
if (summary.fail) process.exit(1);
