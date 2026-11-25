import test from 'node:test';
import assert from 'node:assert/strict';
import { MemorySaver } from '@langchain/langgraph';
import { compileAgentFlow, runAgentFlow, resumeAgentFlow } from '../src/agents/compiler.js';
import { RunGuard, StopError } from '../src/llm/limits.js';

const stub = (invoke) => ({ bindTools() { return this; }, invoke });

test('compiles and runs a minimal agent flow with a stub model', async () => {
  const fakeModel = stub(async () => ({ content: 'hello', tool_calls: [] }));
  const flow = { name: 't', retrieve: false, approve: false, sink: false, nodes: [{ id: 'model', type: 'model' }], edges: [] };
  const ctx = { model: fakeModel };
  const r = await runAgentFlow({ flow, ctx, input: 'hi', threadId: 't1' });
  assert.equal(r.status, 'completed');
  assert.ok(r.messages.length >= 1);
});

test('a node id other than model compiles and runs', async () => {
  const flow = { name: 't', nodes: [{ id: 'writer', type: 'model' }], edges: [] };
  const r = await runAgentFlow({ flow, ctx: { model: stub(async () => ({ content: 'ok', tool_calls: [] })) }, input: 'hi', threadId: 'id-1' });
  assert.equal(r.status, 'completed');
  assert.match(JSON.stringify(r.messages), /ok/);
});

test('retrieval reaches the model before it answers', async () => {
  const seen = [];
  const model = stub(async (msgs) => { seen.push(msgs.map(m => (typeof m.content === 'string' ? m.content : '')).join('\n')); return { content: 'answer', tool_calls: [] }; });
  const flow = { name: 't', retrieve: true, nodes: [{ id: 'model', type: 'model' }], edges: [] };
  const r = await runAgentFlow({ flow, ctx: { model, retrieve: async () => ['token-retrieved-7f3a'] }, input: 'alpha', threadId: 'rag-1' });
  assert.equal(r.status, 'completed');
  assert.match(seen[0], /token-retrieved-7f3a/);
  assert.equal(seen.length, 1);
});

test('edges decide which node runs: lookup feeds writer', async () => {
  const seen = [];
  const model = stub(async (msgs) => { seen.push(msgs.map(m => (typeof m.content === 'string' ? m.content : '')).join('\n')); return { content: 'answer', tool_calls: [] }; });
  const flow = {
    name: 't',
    nodes: [{ id: 'lookup', type: 'retrieve' }, { id: 'writer', type: 'model' }],
    edges: [{ from: 'lookup', to: 'writer' }],
  };
  const r = await runAgentFlow({ flow, ctx: { model, retrieve: async () => ['from-lookup'] }, input: 'q', threadId: 'edge-1' });
  assert.equal(r.status, 'completed');
  assert.match(seen[0], /from-lookup/);
});

test('branch without a retrieve node compiles and runs', async () => {
  const flow = { name: 't', branch: true, nodes: [{ id: 'model', type: 'model' }], edges: [] };
  const r = await runAgentFlow({ flow, ctx: { model: stub(async () => ({ content: 'branched', tool_calls: [] })) }, input: 'hi', threadId: 'br-1' });
  assert.equal(r.status, 'completed');
});

test('approval interrupts and resume continues on the shared checkpointer', async () => {
  const checkpointer = new MemorySaver();
  const model = stub(async () => ({ content: 'proposal', tool_calls: [] }));
  const flow = { name: 't', approve: true, nodes: [{ id: 'model', type: 'model' }], edges: [] };
  const ctx = { model, checkpointer };
  const paused = await runAgentFlow({ flow, ctx, input: 'hi', threadId: 'hitl-1' });
  assert.equal(paused.status, 'interrupted');
  assert.equal(paused.interrupts[0].question, 'Approve the proposed action?');
  const resumed = await resumeAgentFlow({ flow, ctx, threadId: 'hitl-1', decision: 'yes' });
  assert.equal(resumed.status, 'completed');
  assert.match(JSON.stringify(resumed.messages), /proposal/);
  const denied = await runAgentFlow({ flow, ctx, input: 'hi', threadId: 'hitl-2' });
  assert.equal(denied.status, 'interrupted');
  const no = await resumeAgentFlow({ flow, ctx, threadId: 'hitl-2', decision: 'no' });
  assert.equal(no.status, 'stopped:approval_denied');
});

test('stop errors are not retried', async () => {
  let calls = 0;
  const model = stub(async () => { calls++; throw new StopError('maxSteps'); });
  const flow = { name: 't', nodes: [{ id: 'model', type: 'model' }], edges: [] };
  const r = await runAgentFlow({ flow, ctx: { model }, input: 'hi', threadId: 'stop-1' });
  assert.equal(calls, 1);
  assert.equal(r.status, 'stopped:maxSteps');
});

test('RunGuard maxSteps stops the tool loop and keeps the checkpoint', async () => {
  const guard = new RunGuard({ maxSteps: 1, maxToolCalls: 5, maxWallSeconds: 30 });
  let calls = 0;
  const model = stub(async () => { calls++; return { content: '', tool_calls: [{ id: 'c1', name: 'echo', args: { text: 'hi' } }] }; });
  const tools = [{ name: 'echo', description: 'Echo', parameters: { type: 'object', properties: { text: { type: 'string' } } }, invoke: async () => 'ok' }];
  const flow = { name: 't', nodes: [{ id: 'model', type: 'model' }, { id: 'tools', type: 'tools' }], edges: [] };
  const r = await runAgentFlow({ flow, ctx: { model, tools, guard }, input: 'hi', threadId: 'guard-1' });
  assert.equal(r.status, 'stopped:maxSteps');
  assert.equal(calls, 1);
  assert.ok(r.checkpoint || r.messages.length >= 1);
});

test('compileAgentFlow accepts the minimal flow', async () => {
  const compiled = await compileAgentFlow({ name: 't', nodes: [{ id: 'model', type: 'model' }], edges: [] }, { model: stub(async () => ({ content: 'x', tool_calls: [] })) });
  assert.equal(typeof compiled.invoke, 'function');
});
