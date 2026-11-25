import test from 'node:test';
import assert from 'node:assert/strict';
import { compileAgentFlow, runAgentFlow } from '../src/agents/compiler.js';

test('compiles and runs a minimal agent flow with a stub model', async () => {
  const fakeModel = {
    bindTools: () => fakeModel,
    invoke: async (msgs) => ({ content: 'hello', tool_calls: [] }),
  };
  const flow = { name: 't', retrieve: false, approve: false, sink: false, nodes: [{ id: 'model', type: 'model' }], edges: [] };
  const ctx = { model: fakeModel };
  const r = await runAgentFlow({ flow, ctx, input: 'hi', threadId: 't1' });
  assert.equal(r.status, 'completed');
  assert.ok(r.messages.length >= 1);
});
