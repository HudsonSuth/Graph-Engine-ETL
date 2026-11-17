// VIEWS_IMPL=wrong swaps in the deliberately wrong saved-view store (SPEC §19.6). Default: the real one.
import { SavedViewStore as Real } from './views.js';
import { WrongSavedViewStore } from './views-wrong.js';
export const VIEWS_IMPLEMENTATION = process.env.VIEWS_IMPL === 'wrong' ? 'wrong' : 'correct';
export const SavedViewStore = VIEWS_IMPLEMENTATION === 'wrong' ? WrongSavedViewStore : Real;
