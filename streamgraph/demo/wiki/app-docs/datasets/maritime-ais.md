---
type: Dataset
title: Maritime AIS demo pack
description: NOAA AIS 2018-01-01 slice around Chesapeake Bay, Hampton Roads and Delaware Bay, plus ports and a watchlist.
sources:
  - resource: demo/maritime/README.md
  - resource: demo/maritime/vessels.csv
  - resource: demo/maritime/positions.csv
stale_after: 2018-01-08T00:00:00Z
generated:
  by: grokbot/reverse-engineering-analyst
  at: 2026-11-16T17:00:00Z
verified:
  - by: process:repo-file-check
    at: 2026-11-16T17:00:00Z
    note: every cited source file exists in this build
---
# Maritime AIS demo pack
531 vessels, 4,000 positions, 16 ports, 18 vessel-type codes, 250 watchlist rows. Its Vault-LD knowledge base is the maritime-kb vault. The slice is from 2018, so anything "current" here is stale by design.
