// DELIBERATELY WRONG saved-view store (SPEC §19.6). Selected only with VIEWS_IMPL=wrong; the real view tests must fail on it.
//   VW1 save keeps only the layout (filters, camera, selection, style, time are lost)
//   VW2 rename creates a second view instead of renaming
//   VW3 access leak: references to nodes the caller may not see are returned unfiltered
import { SavedViewStore } from './views.js';
export class WrongSavedViewStore extends SavedViewStore {
  create(o = {}) { return super.create({ ...o, state: { layout: o.state?.layout } }); }
  update(id, o = {}) { const v = this.get(id); if (v && o.name !== undefined) return super.create({ name: o.name, description: v.description, state: v.state }); return super.update(id, o); }
  restrict(view) { return view; }
}
