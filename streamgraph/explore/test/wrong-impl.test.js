// SPEC §13.3 harness rule: run the real tests 7, 13, 15, 28 against IMPLEMENTATION=wrong; they MUST fail.
// If this child run passes, the suite itself is broken and this test goes red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runWrong, SUBSET } from './wrong-harness.js';
test('the real tests 7, 13, 15 and 28 fail against the deliberately wrong implementation (W1-W4)', () => {
  const r = runWrong();
  assert.notEqual(r.status, 0, 'suite must exit non-zero with IMPLEMENTATION=wrong');
  for (const [, id] of SUBSET) assert.match(r.stdout, new RegExp(`✖ ${id} `), `${id} must fail against the wrong implementation`);
});
import { runWrongMapping, MAPPING_SUBSET } from './wrong-harness.js';
test('the MCP mapping tests M8-M10 fail against the deliberately wrong mapping (MCP_MAPPING=wrong)', () => {
  const r = runWrongMapping();
  assert.notEqual(r.status, 0, 'suite must exit non-zero with MCP_MAPPING=wrong');
  for (const id of MAPPING_SUBSET) assert.match(r.stdout, new RegExp(`✖ ${id} `), `${id} must fail against the wrong mapping`);
});
import { runWrongViews, VIEWS_SUBSET, runWrongSymbols, SYMBOLS_SUBSET } from './wrong-harness.js';
test('the saved-view tests V1, V2, V3, V6, V7 fail against the deliberately wrong view store (VIEWS_IMPL=wrong)', () => {
  const r = runWrongViews();
  assert.notEqual(r.status, 0, 'suite must exit non-zero with VIEWS_IMPL=wrong');
  for (const id of VIEWS_SUBSET) assert.match(r.stdout, new RegExp(`✖ ${id} `), `${id} must fail against the wrong view store`);
});
test('the symbol tests S1, S2, S5 fail against the deliberately wrong symbol resolver (SYMBOLS_IMPL=wrong)', () => {
  const r = runWrongSymbols();
  assert.notEqual(r.status, 0, 'suite must exit non-zero with SYMBOLS_IMPL=wrong');
  for (const id of SYMBOLS_SUBSET) assert.match(r.stdout, new RegExp(`✖ ${id} `), `${id} must fail against the wrong resolver`);
});
