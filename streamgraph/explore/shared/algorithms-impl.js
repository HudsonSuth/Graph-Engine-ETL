// ALGO_IMPL=wrong swaps in the deliberately wrong algorithms (SPEC §23.9). Default: the real ones.
import * as real from './algorithms.js';
import * as wrong from './algorithms-wrong.js';
export const ALGO_IMPLEMENTATION = globalThis.process?.env?.ALGO_IMPL === 'wrong' ? 'wrong' : 'correct';
export const algorithms = ALGO_IMPLEMENTATION === 'wrong' ? wrong : real;
