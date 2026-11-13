# UI-SPEC: StreamGraph guided view

For people who are not technical. The guided view sits on top of the same engine as the advanced flow editor. Every choice compiles on the server into the existing flow, the schema-driven mapping and pattern queries. The user never sees expressions, mapping files or query syntax.

## Screens
| Screen | Route | Purpose |
|---|---|---|
| Home | `#home` | First-run checklist and "Try the demo data". Tiles: connected sources, records flowing per minute, last update, graph size. Source list with green/amber/red health, records and last update. Recent changes in plain sentences |
| Add a data source | `#add` | Five-step wizard: pick a type, connect, preview, what is this data about, name and save |
| Connect your sources | `#link` | Match suggestions across sources, matching rule, relationships, preview of linked records, confirm |
| Clean up | `#clean` | Per-source presets with a live before and after view |
| Explore | `#explore` | Search box, suggested questions, a dropdown question builder, results as a table and a graph, CSV download |
| Send data out | `#syncout` | Output cards (Neo4j, Memgraph, PostgreSQL, Kafka / Confluent), connection form with "Test connection", "Send as" user, list of outputs with green/amber/red status, changes waiting, sent so far, last error, Pause, Remove and "Send now". Screenshot: `screenshots/ui-sync-out.png` |
| Access rules | `#access` | Honest note that there is no real login yet. "Test as…" table of ✓/✕ per data type and action with the reason for each, the fields that user will see, and "Preview Explore as this user" (yellow banner with "Stop preview"). Rules in plain sentences and a sentence-style rule builder ("Allow / Don't allow … people with the … role … with clearance … to view, ask questions, export, send out … all data / Customers … tagged …"). "What's in your data" schema viewer to set each type's level and tags and each field's sensitivity. People list (name, role, clearance). Advanced OPA switch. Recent decisions. Screenshots: `ui-access-rules.png`, `ui-test-as.png` |
| Settings | `#settings` | Download a backup; Start a new project (reset) |
| Advanced | `/advanced` | The original flow editor. Edits made there are replaced the next time the guided view saves |

## User flows
1. **First run.** Home shows the checklist (add a source, add a second source, connect your sources, tidy up a field, ask your first question) and "Try the demo data", which loads five sample sources and starts syncing.
2. **Add a source.**
   1. Pick a card: Spreadsheet (CSV), JSON file, Web API, Database (PostgreSQL or SQLite file), Live feed (Kafka or Confluent), Documents (PDF, Word and Excel files in a folder).
   2. Connect with a friendly form. Files upload to the server. Passwords and access keys go in password fields, are sent to the server once and are stored in `data/secrets.json` (mode 600). The browser never gets them back; the workspace shows `••••••••`. "Test connection" returns a plain sentence ("Nothing answered at localhost. Check the address and that the service is running."). For databases, a table list appears after the first test. For live feeds, the user pastes an example message to preview fields.
   3. Preview the first rows.
   4. What is this data about: pick an existing type (which combines with other sources) or "Something else…". The identifying field and the field names are suggested; the user can untick or rename fields.
   5. Name and save, with "Keep in sync" and how often to check.
   **Documents** (screenshots `ui-documents.png` and `ui-documents-mapping.png`):
   1. Connect: "Upload documents" (several files at once) or "Use a folder on this computer" with "Scan folder". The result reads "We read 5 of 5 files (1 Excel, 1 PDF, 1 CSV, 1 Excel 97-2003, 1 Word) and found 6 tables." A note says files are only read, macros never run, links never opened, and scanned PDFs need OCR, which is not included.
   2. Preview, "Here is what we found": a list of files with ✅/⛔, type, size, pages or sheets, tables found, and notes or problems in plain words ("This file unpacks to far more data than its size suggests (a "zip bomb"), so it was not opened."). Then each detected table, with a suggestion such as "The table in sheet Customers of customers.xlsx looks like a list of Customers, each identified by customer_id. Each row can become a Customer in your graph and will remember its file, sheet and row." The first rows show with a "Found in" column ("customers.xlsx · sheet Customers · row 2").
   3. "What is in these tables?": for each table (tables with the same columns share one choice), "Turn each row into a… [type] identified by [column]", or untick to keep plain table rows. Every file is always saved as a Document with its details and text.
   4. Name and save: keep in sync (default every 30 seconds). Changed files are re-read and removed files are taken out of the graph.
3. **Connect your sources.** The server scores every pair of sources about the same type. For each column pair whose values are mostly unique, it tries each rule and reports the best overlap: "Customers in Customers spreadsheet and Loyalty program API look like the same customers, matched on id / cust_id, 100% overlap." The user can change the fields or the rule (exactly the same / ignore upper/lower case and spaces / same ID once punctuation is removed). Relationship suggestions come from columns whose values point at another type's identifiers: "Each Order belongs to a Customer via customer_id". The user can add a link to a new type (for example Category from a product's category column). "Preview linked records" builds the graph in a scratch store and shows combined records and link counts. "Confirm and link" saves and restarts syncing.
4. **Clean up.** Presets: remove extra spaces, make lowercase or UPPERCASE, treat as a number, read as a date (figure it out, MM/DD/YYYY or DD/MM/YYYY), combine fields into one, and keep only rows where a field is, is not, contains, is more than, is less than or is not empty. The before and after view highlights changed cells and strikes through dropped rows.
5. **Explore.** Search matches any value. Suggested questions come from the graph ("Show gold customers and their orders"). The builder reads "Show [type] where [field] [condition] [value] and their [related type] where …". Values come from dropdowns of real values. Results show as a table and a graph, with Download CSV.

6. **Start a new project.** From Home ("Start a new project…" under the sources list) or Settings. A dialog says in plain words what will be deleted: the named sources, the number of things and connections, saved passwords and keys, uploaded files, matching rules, links and clean-up steps. It says original files and databases are not touched and offers "Download a backup first". The red "Delete everything and start over" button only works after typing RESET. Escape or Cancel closes it. Afterwards the app shows the empty first-run Home without a restart.

## Compilation
| Guided choice | Compiles to |
|---|---|
| Source (file, API, database, live feed, documents) | `file`, `http`, `sql`/`cdc` (with the "last changed" column if found, otherwise a full re-read), `kafka`, `documents` steps. Secrets appear as `{{secret:id}}` placeholders and are filled in only inside the server process |
| What is this data about | mapping `nodes: [{label, key, props}]` plus a hidden `_src_<id>` marker for provenance |
| Matching rule | the node `key` expression: exact `$string(f)`, ignore case `$lowercase($replace($string(f), /\s+/, ""))`, same ID `$lowercase($replace($string(f), /[^A-Za-z0-9]/, ""))` |
| Relationship | mapping `edges` from the parent type's key (same rule) to this source's key |
| Clean up preset | `map` or `filter` steps with JSONata, scoped to that source |
| Question | pattern `(a:Customer {tier:"gold"})-[:HAS_ORDER]->(b:Order)` plus post-filters for other conditions |

## Health
- Green: syncing and the latest check worked.
- Amber: paused, or connected but no records yet.
- Red: the latest check failed. The note gives the plain-language reason.

## Access words
| Engine | Screen |
|---|---|
| principal, subject | person, user |
| clearance 0-3 | clearance |
| classification 0-3 | level (Public, Internal, Confidential, Restricted) |
| sensitivity low / medium / high / unclassified | Anyone can see / Clearance 2 or more / Clearance 3 only / Not reviewed yet |
| read, query, export, sync-out, admin | view, ask questions, export, send out, manage |
| deny-overrides, default deny | "Nobody can do anything unless a rule allows it. A don't-allow rule always wins." |
| sink | output |

## Jargon map (main UI uses the right-hand word)
| Engine term | Guided view says |
|---|---|
| CDC, polling, continuous mode | keep in sync |
| sink, persist, upsert | saved to graph |
| topic, Kafka stream | live feed |
| broker | live feed server address |
| node, vertex | thing (or the type name, such as Customer) |
| edge, relationship type | connection, link, "belongs to" |
| label, entity type | what this data is about, type |
| primary key, key | the field that identifies each record |
| entity resolution, federation | connect your sources, combine |
| normalize | ignore upper/lower case and spaces, same ID |
| schema | fields |
| JSONata / SpEL expression | clean-up step |
| pattern query, Cypher | ask a question |
| transform, filter step | clean up, keep only rows where… |
| flow editor | Advanced |
