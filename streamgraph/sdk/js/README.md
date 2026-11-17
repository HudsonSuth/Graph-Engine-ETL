# StreamGraph JS SDK

One file, no dependencies, MIT. Works in the browser and in Node 18+.

```js
import { createClient, embedViewer } from './streamgraph.js';
const sg = createClient({ baseUrl: 'http://127.0.0.1:8080' });
const r = await sg.query({ a: { type: 'Customer', where: [{ field: 'city', op: '=', value: 'Austin' }] } });
console.log(r.cypher, r.count);
embedViewer(document.getElementById('graph'), { baseUrl: 'http://127.0.0.1:8080', search: 'Ada', drawer: 'table' });
```

Every call goes through StreamGraph's access rules. Hidden fields and denied types never come back. `as: 'analyst'` previews as another user, but only an admin can do that.
Embedding from another origin: the server sends no CORS headers, so serve your page from the same server, or put it behind your own reverse proxy.
