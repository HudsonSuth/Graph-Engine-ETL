import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from streamgraph_client import StreamGraph, StreamGraphError
BASE = os.environ.get("SG_BASE")

@unittest.skipUnless(BASE, "set SG_BASE to a running StreamGraph (npm run test:sdk does this)")
class ClientTest(unittest.TestCase):
    def test_query_and_cypher(self):
        sg = StreamGraph(BASE)
        r = sg.query({"a": {"type": "Customer", "where": [{"field": "city", "op": "=", "value": "Austin"}]}})
        self.assertEqual(r["count"], 1)
        self.assertIn("MATCH (a:Customer) WHERE a.city = 'Austin'", r["cypher"])
        self.assertEqual(sg.cypher(r["cypher"])["count"], 1)

    def test_analyst_cannot_see_hidden_field_or_edit(self):
        sg = StreamGraph(BASE, as_user="analyst")
        rows = sg.query({"a": {"type": "Customer"}})["rows"]
        self.assertTrue(rows and all("@" not in str(row["a"]["properties"].get("email", "")) for row in rows))
        with self.assertRaises(StreamGraphError) as e:
            sg.edit([{"op": "addNode", "type": "Customer", "key": "py1", "props": {"name": "Py"}}])
        self.assertEqual(e.exception.status, 403)

    def test_comments_svg_rdf(self):
        sg = StreamGraph(BASE)
        c = sg.add_comment("sg:node:Customer:c1", "from python")
        self.assertEqual(c["text"], "from python")
        self.assertTrue(sg.export_svg(["sg:node:Customer:c1"]).startswith("<svg"))
        self.assertIn("urn:streamgraph:", sg.rdf("ntriples"))

if __name__ == "__main__":
    unittest.main()
