// GEO_IMPL=wrong swaps in the deliberately wrong geo helpers (SPEC §22.8). Default: the real ones.
import * as real from '../shared/geo.js';
import * as wrong from '../shared/geo-wrong.js';
export const GEO_IMPLEMENTATION = process.env.GEO_IMPL === 'wrong' ? 'wrong' : 'correct';
export const geo = GEO_IMPLEMENTATION === 'wrong' ? wrong : real;
