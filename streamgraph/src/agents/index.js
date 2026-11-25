// Agent flows (kind: "agent") — skeleton for phase L0/L1. The compiler to a LangGraph StateGraph (L3) builds on this.
// `agents.enabled` lives in data/models.json and is false on a fresh install.
export { runToolAgent } from './tool-agent.js';
export { compileAgentFlow, runAgentFlow, resumeAgentFlow } from './compiler.js';
export { validateAgentFlow } from './validate.js';
export { makeGraphRetrieve } from './rag.js';
export { AGENT_ACTIONS } from '../abac/engine.js';
export const agentsEnabled = modelsCfg => modelsCfg?.agents?.enabled === true;
