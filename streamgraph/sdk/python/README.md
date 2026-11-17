# streamgraph-client (Python)

Standard library only, MIT. `pip install ./sdk/python` (or just copy `streamgraph_client/`).

```python
from streamgraph_client import StreamGraph
sg = StreamGraph("http://127.0.0.1:8080")
print(sg.to_cypher({"a": {"type": "Customer"}}))
print(sg.query({"a": {"type": "Customer", "where": [{"field": "city", "op": "=", "value": "Austin"}]}})["count"])
```

Tests: `SG_BASE=http://127.0.0.1:8080 python -m unittest discover sdk/python/tests`. `npm run test:sdk` starts a server and runs them for you.
