// BYOM harness public surface (phase L1). See docs/llm-harness.md.
export { createHarness, BRIDGE_SCRIPT } from './harness.js';
export { createModelBridge } from './bridge.js';
export { McpChatModel, McpEmbeddings } from './mcp-chat-model.js';
export { McpSamplingChatModel } from './sampling-chat-model.js';
export { MeteredModel, MeteredEmbeddings, localityGate, actorFor } from './metered.js';
export { RunGuard, StopError } from './limits.js';
export { importCatalog, catalogItemToEntry } from './catalog.js';
export { registerProvider, PROVIDERS, OPENAI_COMPATIBLE_PRESETS, HOSTED_PRESETS, buildOptions, createProviderModel } from './registry.js';
export { defaultModels, validateModels, localityOf, resolveModelRef, effectiveLimits, DEFAULT_LIMITS, OLLAMA_URL } from './config.js';
export { probeModel, probeSampling } from './probe.js';
export { invokeWithTools, structuredSafe } from './fallbacks.js';
export { ModelError, classify } from './wire.js';
