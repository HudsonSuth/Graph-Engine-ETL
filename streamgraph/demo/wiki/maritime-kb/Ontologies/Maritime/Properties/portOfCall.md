---
type: owl:ObjectProperty
label: port of call
comment: A port the vessel was seen near in the AIS slice.
domain: "[[Vessel]]"
range: "[[Port]]"
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
sources:
  - resource: demo/maritime/README.md
---
# portOfCall
Derived from `positions.csv` rows whose `port_id` is set.
