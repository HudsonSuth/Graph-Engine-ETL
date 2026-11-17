// Writes proof that the suite catches the deliberately wrong implementation and the wrong MCP mapping:
//   proof/explore-wrong-impl-run.txt   (IMPLEMENTATION=wrong, SPEC tests 7, 13, 15, 28)
//   proof/mcp-wrong-mapping-run.txt    (MCP_MAPPING=wrong, tests M8, M9, M10)
//   proof/views-wrong-impl-run.txt     (VIEWS_IMPL=wrong, saved-view tests V1-V7)
//   proof/icons-wrong-impl-run.txt     (SYMBOLS_IMPL=wrong, symbol tests S1-S7)
import { writeFileSync, mkdirSync } from 'node:fs';
import { runWrong, runWrongMapping, runWrongViews, runWrongSymbols } from '../test/wrong-harness.js';
const dir = new URL('../../proof/', import.meta.url); mkdirSync(dir, { recursive: true });
for (const [file, title, run] of [['explore-wrong-impl-run.txt', 'IMPLEMENTATION=wrong run of SPEC tests 7, 13, 15, 28 (must FAIL)', runWrong], ['mcp-wrong-mapping-run.txt', 'MCP_MAPPING=wrong run of MCP mapping tests M8, M9, M10 (must FAIL)', runWrongMapping], ['views-wrong-impl-run.txt', 'VIEWS_IMPL=wrong run of the saved-view tests (V1, V2, V3, V6, V7 must FAIL)', runWrongViews], ['icons-wrong-impl-run.txt', 'SYMBOLS_IMPL=wrong run of the symbol tests (S1, S2, S5 must FAIL)', runWrongSymbols]]) {
  const r = run();
  writeFileSync(new URL(file, dir), `# ${title}\n# date: ${new Date().toString()}\n# exit code: ${r.status}\n\n${r.stdout}\n${r.stderr}`);
  console.log(`${file}: exit ${r.status}`);
}
