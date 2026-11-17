# Plain-English question providers

Off by default. The studio setting (Graph explorer > Analyze > Plain-English questions) chooses one of:

| id | What it is | Network | Cost |
|---|---|---|---|
| `off` | Questions and captions disabled (default) | none | none |
| `rules` | `rules.js`: sentence patterns mapped onto the query builder, paths and degree | none | none |

## Plugging in a real model

A provider is an object `{ id, name, interpret(question, { types, fields }), caption(items) }` registered in
`PROVIDERS` in `explore/server/studio-routes.js`. `interpret` must return the same plan shapes `rules.js` returns
(`count`, `query`, `path`, `neighbours`, `top`); the server then runs the plan itself, so access rules still apply and
the model never sees data the user can't. A local model server (for example one listening on 127.0.0.1) would be called
from inside `interpret`. Only the question text and the type/field names the user may see should be sent. Nothing in
this repository calls a paid API.
