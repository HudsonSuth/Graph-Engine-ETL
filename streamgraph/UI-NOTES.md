# UI notes: every button added by the integration

These are plain-language labels in the studio's own style: white cards, blue primary buttons, green for start and "yes", red for stop and remove. Hudson and I will keep refining the button names. To rename one, edit the label here and change it in the file shown.
Screenshots are in `screenshots/` (the file name is next to each area).

## Studio navigation (public/index.html, public/studio.js)
| Control | Where | What it does |
|---|---|---|
| **Explore** → tabs **Search and ask** / **Graph explorer** | top nav, then tabs under the title | Search and ask is the original guided question page (01). Graph explorer opens the interactive graph inside the studio (02). |
| **Open in its own window ↗** | Graph explorer intro line | Opens `/explore/studio` full screen. |
| **Use this viewer in another app, or from code** | fold-out under the intro | Snippets to copy for embedding (JS SDK) and for Python. |
| **Live processing** | top nav | Stream processing and entity matching page (10, 10b, 11). |
| **Access rules → Add a rule → edit** | Access rules page | The new `write` action ("edit"). The Test-as table gets an **edit** column (12). |

## Live processing page (screenshots 10, 10b, 11)
| Control | What it does |
|---|---|
| **Start stream processing** / **Stop stream processing** | Starts or stops a local Kafka broker and the Flink job (built from source). Admins only. The dot is green when running, amber while starting, red when stopped. |
| Readiness list (✓ / ✕ Java, Kafka broker, Flink and the StreamGraph job) | Shows what is installed. A ✕ line shows the one setup command to run. |
| **Alerts** table | Flink "sudden jump" alerts (links gained in one window), only for things you may see. |
| **Most connected right now** table | Flink's live per-thing metrics: links, changes, latest window, alert. |
| **Matching engine**: Duke / Splink | Engine choice. A choice is greyed out when that engine isn't installed. Duke is recommended on Windows. |
| **What to match** (one menu per type: Don't match / They are people / They are organizations) | Tells the engine which types to match and with which profile. |
| **Start matching** / **Save changes** / **Stop matching** | Starts, reconfigures or stops entity matching. Admins only. |
| **Possible matches to review**: **Same thing** / **Not the same** | Same thing combines the two records. Not the same keeps them apart and hides the suggestion. Each decision is saved as a SAME_AS / NOT_SAME_AS link (so it goes out through Send data out) and survives restarts. |
| **Your decisions** | The latest decisions, who made them, and when. |

## Graph explorer (explore/public/studio.html + explore/client/studio-extras.js)
### Top bar
| Control | What it does |
|---|---|
| Search box + **Search graph** | Enter finds things in the view. Shift+Enter or the button searches the whole graph and adds what it finds. |
| **Ask** | Shown when plain-English questions are on. Answers the question in the search box, shows the Cypher it ran, and selects the results (14). |
| **Graph / Map / Split** | Graph only, map only (things that have a location), or side by side with linked selection. |
| **3D** / **2D** | Optional 3D view (3d-force-graph). Press again to go back to 2D. Clicking a node in 3D selects it (19). |
| **Analyze ▾** (13) | **Measure** (degree, PageRank, betweenness, communities and more; run on the whole graph, current filter, what is shown, or the selection; show as **Size**, **Colour** or **Link width**; **Re-run when the view changes**; **Clear**). **Paths between two things** (max steps, all or shortest, **Find routes**, **Show only the routes**). **Questions**: **Query builder…**, **Caption this view**, and **Plain-English questions** Off / On (built-in rules, no internet; admins only). |
| **View ▾** (15) | **Look**: light/dark, **High contrast**, **Describe what's shown**. **Clusters**: group bubbles auto/on/off, group by, open at, links between groups, **Open all** / **Close all**, **Bundle links**. **Time** slider + **Live**. **Map** options. **Matched records** (Both / Records / Matched, Possible matches). **Live metrics (Flink)**: size by links, alert badges. **Saved views**: **Open**, **Save as…**, **Update**, **Rename**, **Delete**, **Copy link**, **Download**, **Upload…**, Save positions. **Edit style…** |
| **Export ▾** (16) | **Download SVG** / **Download PNG** (fixed layout, the same file every time for the same view). **Download Turtle** / **Download N-Triples** (RDF of everything you may see). **Import RDF file…** (admins). |
| **?** | Keyboard shortcuts, including the studio additions. |
| **Present** | Presenter mode (steps through saved views). |
| **Renderer** Auto / WebGPU / WebGL + readout (21, 22) | Picks what draws the graph. **Auto** uses WebGPU when the browser has `navigator.gpu` and hands out an adapter, else WebGL (sigma.js). The choice is remembered in this browser (`explore.renderer`); `?renderer=webgpu` / `webgl` overrides it for one page load. The readout next to it shows the active renderer, fps and frame time (hover for draw time and the GPU adapter). If WebGPU was chosen but can't start, or the GPU device is lost later, it switches to WebGL, keeps the camera, turns amber with "(fallback)" and says why. Also on `/explore`. |

### Left toolbar
| Section | Controls |
|---|---|
| Select | **Lasso**, **Box**, **Undo** |
| Expand | **Expand**, **Collapse**, **More…**, Most to add, **Pin**, **Unpin** |
| Path | **Shortest path**, follow arrows |
| Layout | Arrange as (force, ForceAtlas2, tree, radial, circular, timeline, communities…), **Re-arrange**, Layout options (keep in place, animate, pin when dragged, spacing, direction, **Use selection as the top**, seed, time field, group by) |
| Edit | **Add thing** (type, identifier, name, + field). **Connect** (two selected; kind of link; **Swap direction**). **Edit fields** (hidden fields aren't listed and can't be changed) (05). **Remove** (red; asks first). All four are greyed out when your rules don't allow editing (20). |
| Types | Click a type to hide or show it. |

### Right panel
| Control | What it does |
|---|---|
| Details | Fields of the selected thing (hidden ones show as `[hidden]`). |
| **Comments**: text box + **Post comment**, **remove** | Comments on the selected thing. Only the author or an admin can remove a comment (06). |

### Bottom panel (tabs; **T** opens and closes it; **▾** hides it)
| Tab | Controls |
|---|---|
| **Table** (03) | Type filter, rows for what is shown. Click a row to select it on the graph (Shift adds). Rows selected on the graph are highlighted. **Download CSV**, **Refresh**. |
| **Chart** (04) | **Count by** type or any field. Clicking a bar selects those things. Bars that hold selected things are dark. |
| **History** (07) | Changes-over-time strip, **From** / **To**, **Compare** (added / removed / changed with before → after per field), **Select on graph**. Click an item to jump to it. |
| **Query** (08) | **Find** [type] + **+ condition** (field, operator, value, ✕), **+ follow a link** (link type, direction, **Remove link step**), **connected to** [type] + conditions, Most results, **Run**, **Add results to graph**. The Cypher box shows the query; you can edit it, then **Run Cypher** or **Copy Cypher**. |
| **Case notebook** (09) | Case name + **New case**, list of cases. In a case: **Add note**, **Add selection** (attaches the selected things with a written summary), **Show N on graph**, **remove**, **Download as text**, **Delete case**, **← All cases**. |

### Accessibility
| Key / control | What it does |
|---|---|
| `[` / `]` | Previous / next thing (alphabetical), selected and announced to screen readers. |
| `\` | Step through the neighbours of the selected thing. |
| `D` or **Describe what's shown** | Text summary of the selection, or of everything shown (17). |
| `T` | Bottom panel. |
| **High contrast** | Black, white and yellow theme with thick focus outlines; it is remembered (18). |
| Live region | Every answer, summary and step is also read out (aria-live). |

## "Test as" previews
When an admin picks **Preview Explore as this user** on Access rules, the Graph explorer, its live updates, the bottom panel and the exports all show only what that user may see. The footer says "Previewing as …" (20).

## WebGPU renderer (optional) and the renderer benchmark
- **What it draws**: the same graph, positions, colours, sizes, shapes (circle, rounded square, diamond, triangle), 2 px rings, selection ring, dimming and dashed links as the WebGL view. Pan (drag), wheel zoom, double-click zoom, hover, click / Shift-click select, double-click expand, right-click menus (node, link, canvas) and node drag all work and feed the same side panel and selection.
- **Not drawn in WebGPU mode (yet)**: arrowheads, curved parallel links (drawn straight), symbol images (MIL-STD / icon sets show as their plain coloured shape) and the hover backdrop around the node (only behind the text). Switch to **WebGL** for those.
- **Labels**: the hovered node, selected and highlighted nodes (up to 300), "always" labels, then the most connected on-screen nodes whose disc is at least 6 px, one per grid cell, about 80 per frame.
- **Benchmark page**: `/explore/bench`. Tick the sizes (10k, 50k, 100k, 250k, 500k, 1M nodes; links ≈ 2 × nodes) and renderers, **Run benchmark**, then **Download JSON** or **Send to server** (writes `perf/webgpu-bench-<timestamp>.json`; admins only). Graphs are synthetic and made in the page, so no real data is involved. A renderer stops climbing sizes once it drops below 10 fps or errors (out of memory, device lost).
- Command line: `npm run bench:webgpu -- --url http://127.0.0.1:8091` (see INTEGRATION.md §WebGPU).

## Search (OpenSearch index or built-in), 15 Nov 2026
- **Studio header**: a search box sits right of the nav with a status dot: green = index healthy, amber = catching up, red = offline, grey = no index set up (built-in search). Type to search (250 ms debounce) or press Enter.
  - Results are grouped by type, with a 📍 when the thing has a location, its time, and up to two highlighted fragments (`field: …<mark>match</mark>…`).
  - The footer shows the count, "about N in the index" when results are capped, OpenSearch or built-in, "as <user>" during Test as, and the time taken.
  - **⚲** opens the filters: Type, From / To (local time, sent as UTC), and **Near map view**, which uses the map's bounds in the Graph explorer tab. It also shows index status, doc count and last sync.
  - **Clicking a result** opens Explore ▸ Graph explorer focused on that node: selected, camera centred, and the map opened in split view and centred when the node has coordinates. If the explorer is already open, the focus is sent to it without a reload.
  - Screenshots: `screenshots/search-studio-header.png`, `search-studio-focus-in-explorer.png`, `search-maritime-studio-anan-maersk.png`.
- **Explorer toolbar**: a **🔎** button with a status dot, placed right of Search graph. **Ctrl+K** also opens it.
  - It is a button, not a box, because the toolbar is already wider than a 1280 px screen, and a wider box pushed the Box tool off-screen (it broke the lasso/box UI test C5). The find-in-view box shrank from 203 to 160 px to make room.
  - The panel has the search input, **Filters** (Type, From, To, Near map view) and index status.
  - Results and clicks work as in the studio. A result not loaded in a focus-scope view is fetched first.
  - Screenshots: `search-explorer-results.png`, `search-explorer-focused-map.png`, `search-maritime-focus-anna-maersk-map.png`, `search-maritime-near-norfolk-map-view.png`.
- **Offline**: when OpenSearch can't be reached, a yellow "⚠ Search index offline: showing the built-in search (still filtered by your access rules)" bar sits above the results, and the dot turns red (`search-index-offline.png`).
- **Send data out**: a fifth tile, **🔎 OpenSearch**, with Address, User name (optional) and Index name prefix fields, plus a note that hidden fields are never indexed and every search is re-filtered for the searcher.
  - Test connection reports the cluster health and that a test write worked.
  - The outputs table shows "· Index healthy, N docs" for OpenSearch rows.
- **To iterate on together**:
  - The studio nav now wraps to two rows at 1440 px with the search box. Options: shorter nav labels, or move ⚙ Settings and Access rules into a menu.
  - In the explorer's studio skin, the date pickers use the dark input style and the status line is pale.
  - With no search text (filters only), results are listed in index order. Sorting by distance or time might read better.
  - The Filters panel in the studio opens under the results list.
