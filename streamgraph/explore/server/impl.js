// Implementation selector for tests and the server. IMPLEMENTATION=wrong swaps in the known-bad modules (§13.3).
import { GraphService as RealService } from './service.js';
import { StreamIngest as RealIngest } from './ingest.js';
import { computeLayout as realLayout } from '../shared/layouts.js';
import { WrongGraphService, WrongStreamIngest, wrongComputeLayout } from './wrong.js';
export const IMPLEMENTATION = process.env.IMPLEMENTATION === 'wrong' ? 'wrong' : 'correct';
const W = IMPLEMENTATION === 'wrong';
export const GraphService = W ? WrongGraphService : RealService;
export const StreamIngest = W ? WrongStreamIngest : RealIngest;
export const computeLayout = W ? wrongComputeLayout : realLayout;
