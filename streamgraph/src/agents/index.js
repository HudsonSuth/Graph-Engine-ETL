// Agent flows (L3). `agents.enabled` lives in data/models.json and is false on a fresh install.
// L4–L9 are not started.
export { runToolAgent } from './tool-agent.js';
export { compileAgentFlow, runAgentFlow, resumeAgentFlow } from './compiler.js';
export { validateAgentFlow } from './validate.js';
export { makeGraphRetrieve, makeOpenSearchRetrieve, combineRetrieve } from './rag.js';
export { AGENT_ACTIONS } from '../abac/engine.js';
export const agentsEnabled = modelsCfg => modelsCfg?.agents?.enabled === true;
