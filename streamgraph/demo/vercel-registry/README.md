# Registry demo (static Vercel project)

A self-contained snapshot of the registry / sanctions graph. Search is MiniSearch in the browser. The fixture is baked into `public/data/graph.json`. There is no API server.

## Build

From `streamgraph/`:

```bash
npm run demo:registry
```

Output directory: `streamgraph/demo/vercel-registry/`

- `middleware.js` — HTTP Basic auth, username `demo`, password from `DEMO_PASSWORD`. If the password is unset, every request is 401.
- `vercel.json` — rewrites `/` to `/public/index.html` and sets noindex headers.
- `public/` — the static site. Git ignores this directory; the build creates it.

Local preview, without the password gate:

```bash
npm run demo:registry:serve
```

Opens `http://127.0.0.1:8096/`.

## Vercel

Create a project whose root directory is `streamgraph/demo/vercel-registry`.

- Framework preset: Other
- Install command: `cd ../.. && npm ci`
- Build command: `cd ../.. && npm run demo:registry`
- Output: leave the default. `vercel.json` serves `public/`.
- Environment variable: `DEMO_PASSWORD` (required). Do not commit it. The username is `demo`.

The password is read only from the environment. This folder does not contain a `.env` file.
