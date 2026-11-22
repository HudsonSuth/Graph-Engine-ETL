---
title: Weekly pipeline sync
date: 2026-11-16
---
# Weekly pipeline sync

Attendees: Dana Ortiz, Sam Patel, Priya Nair

## Kafka mode
Sam reported that the Kafka connector now replays the DLQ correctly after a broker restart. Two consumer groups still
lag by about 40 seconds at peak. Dana asked whether the lag matters for the live map; Sam said it does not, because the
map polls every 2 seconds and only the last state is drawn.

Decision: keep the current partition count (6) until the load test on 2 December.

## Document import
Priya walked through the new PDF table detection. Invoices from the shipping partner come through cleanly, but scanned
delivery notes have no text layer, so nothing is read from them. The team agreed OCR is out of scope for this quarter.

Priya will write a short note for users that explains which PDFs can be read and how to tell.

## Access rules
Dana raised that analysts can still export Customer emails through the CSV download. The field is tagged high, so the
UI masks it, but the old export endpoint skipped the mask. Sam confirmed the fix is merged and will be in Friday's
build.

## Action items
- Sam Patel: run the Kafka load test with 6 partitions and share the lag chart, by 2 December.
- Priya Nair: write the "which PDFs can be read" help note, by 20 November.
- Dana Ortiz: re-check the analyst CSV export after Friday's build.
