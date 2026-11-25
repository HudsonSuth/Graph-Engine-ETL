import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAgentFlow } from '../src/agents/validate.js';

test('rejects flow without model node', () => {
  const errs = validateAgentFlow({ name: 't', nodes: [{ id: 'x', type: 'tools' }] });
  assert.ok(errs.some(e => /model node/.test(e)));
});
test('accepts flow with model node', () => {
  const errs = validateAgentFlow({ name: 't', nodes: [{ id: 'm', type: 'model' }] });
  assert.equal(errs.length, 0);
});
test('accepts a model node whose id is not model', () => {
  assert.equal(validateAgentFlow({ name: 't', nodes: [{ id: 'writer', type: 'model' }] }).length, 0);
});
test('rejects an edge to a node that is not in the flow', () => {
  const errs = validateAgentFlow({ name: 't', nodes: [{ id: 'm', type: 'model' }], edges: [{ from: 'm', to: 'missing' }] });
  assert.ok(errs.some(e => /unknown node "missing"/.test(e)));
});
