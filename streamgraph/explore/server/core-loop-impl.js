// CORE_IMPL=wrong swaps in the deliberately wrong core-loop module (SPEC §23.9). Default: the real one.
import * as real from './core-loop.js';
import * as wrong from './core-loop-wrong.js';
export const CORE_IMPLEMENTATION = process.env.CORE_IMPL === 'wrong' ? 'wrong' : 'correct';
export const core = CORE_IMPLEMENTATION === 'wrong' ? wrong : { ...real, growWrong: false };
