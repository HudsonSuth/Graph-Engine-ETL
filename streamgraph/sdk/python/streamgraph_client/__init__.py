"""StreamGraph Python client (MIT, standard library only).

    from streamgraph_client import StreamGraph
    sg = StreamGraph("http://127.0.0.1:8080")
    r = sg.query({"a": {"type": "Customer", "where": [{"field": "city", "op": "=", "value": "Austin"}]}})
    print(r["cypher"], r["count"])

Every call goes through StreamGraph's access rules; you only get back what the user may see.
"""
import json
import urllib.error
import urllib.parse
import urllib.request

__all__ = ["StreamGraph", "StreamGraphError"]
__version__ = "0.1.0"


class StreamGraphError(Exception):
    def __init__(self, message, status=None):
        super().__init__(message)
        self.status = status


class StreamGraph:
    def __init__(self, base_url="http://127.0.0.1:8080", as_user=None, timeout=30):
        self.base = base_url.rstrip("/")
        self.as_user = as_user
        self.timeout = timeout

    def request(self, method, path, body=None, raw=False):
        data = None if body is None else json.dumps(body).encode()
        headers = {"content-type": "application/json"} if body is not None else {}
        if self.as_user:
            headers["x-sg-as"] = self.as_user
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                text = r.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            msg = e.reason
            try:
                msg = json.loads(e.read().decode()).get("error", msg)
            except Exception:
                pass
            raise StreamGraphError(msg, e.code) from None
        return text if raw else json.loads(text)

    def _q(self, **kw):
        return urllib.parse.urlencode({k: v for k, v in kw.items() if v is not None})

    def me(self): return self.request("GET", "/api/explore/x/me")
    def meta(self): return self.request("GET", "/api/explore/x/meta")
    def query(self, query): return self.request("POST", "/api/explore/x/query", {"query": query})
    def cypher(self, cypher): return self.request("POST", "/api/explore/x/query", {"cypher": cypher})
    def to_cypher(self, query): return self.request("POST", "/api/explore/x/cypher", {"query": query})["cypher"]
    def ask(self, question): return self.request("POST", "/api/explore/x/nl/ask", {"question": question})
    def summary(self, ids): return self.request("POST", "/api/explore/x/summary", {"ids": list(ids)})["text"]
    def history_timeline(self): return self.request("GET", "/api/explore/x/history/timeline")
    def history_compare(self, from_ms, to_ms): return self.request("GET", "/api/explore/x/history/compare?" + self._q(**{"from": int(from_ms), "to": int(to_ms)}))
    def edit(self, ops): return self.request("POST", "/api/explore/x/edit", {"ops": ops})
    def comments(self, target=None): return self.request("GET", "/api/explore/x/comments?" + self._q(target=target))["comments"]
    def add_comment(self, target, text): return self.request("POST", "/api/explore/x/comments", {"target": target, "text": text})["comment"]
    def notebooks(self): return self.request("GET", "/api/explore/x/notebooks")["notebooks"]
    def create_notebook(self, title): return self.request("POST", "/api/explore/x/notebooks", {"title": title})["notebook"]
    def add_entry(self, nb, text="", ids=(), kind="note"): return self.request("POST", "/api/explore/x/notebook/entry", {"nb": nb, "kind": kind, "text": text, "ids": list(ids)})["entry"]
    def export_svg(self, ids, positions=None, theme="light", title=None): return self.request("POST", "/api/explore/x/export/svg", {"ids": list(ids), "positions": positions or {}, "theme": theme, "title": title}, raw=True)
    def rdf(self, fmt="turtle"): return self.request("GET", "/api/explore/x/rdf?" + self._q(format=fmt), raw=True)
    def processing_status(self): return self.request("GET", "/api/explore/x/processing")
    def match_review(self): return self.request("GET", "/api/explore/x/er/review")
