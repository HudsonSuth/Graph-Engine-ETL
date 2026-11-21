// SG_LLM_IMPL=wrong switches on DELIBERATELY WRONG behaviour so wrong-llm.test.js can prove the LLM suite detects it:
//  - the Model Bridge echoes the API key in its error messages                         (A1.4, A1.6, C9)
//  - the capability probe is skipped and claims every feature                           (A1.3, C11)
//  - a fresh install also seeds a remote cloud model next to local Ollama              (A0.3, D2)
//  - an unreachable default model is not reported as "default model unreachable"       (A1.13, D2)
export const WRONG = () => process.env.SG_LLM_IMPL === 'wrong';
