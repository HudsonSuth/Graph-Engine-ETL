# Mid-Atlantic AIS demo pack for StreamGraph Integrated

A small, ready-to-upload example for the studio at http://127.0.0.1:8090. It is a slice of public AIS traffic around Chesapeake Bay, Hampton Roads, and Delaware Bay on 1 January 2018, plus nearby ports and a demo vessel watchlist for entity matching.

Copy the five CSV files onto the PC that is running the app, then follow the import steps below. Do not use **Add a data source → Documents** for this pack: the Documents path does not create links between types. Use **Spreadsheet (CSV)** for each file.

## Files

| File | Rows | Each row is a… | Identify by | Why it is here |
| --- | ---: | --- | --- | --- |
| `vessels.csv` | 531 | Vessel | `mmsi` | Named ships in the slice, with `lat`/`lon` of their last ping (map), IMO, call sign, and type |
| `positions.csv` | 4,000 | Position | `ping_id` | Timestamped pings (`ts`, `lat`, `lon`) for the map, time slider, and Flink activity |
| `ports.csv` | 16 | Port | `port_id` | Mid-Atlantic ports with `lat`/`lon` (Norfolk, Newport News, Baltimore, Philadelphia, and others) |
| `vessel_types.csv` | 18 | VesselType | `vessel_type` | AIS ship-type codes (Cargo, Tanker, Tug, Military, …) |
| `vessel_watchlist.csv` | 250 | Vessel | `watchlist_id` | Demo watchlist of the same ships under a different id, with slightly altered names for Duke |

All five files are well under the studio’s 20 MB upload limit (the largest is `positions.csv` at 332 KB).

Column names already match what the app expects: `lat`/`lon` for the map (also `latitude`/`longitude` would work), `name` for Duke, and `ts` (ISO-8601) for the explorer time slider (`time` holds the same value for reference).

About 2,165 of the 4,000 pings have a `port_id` because they fell within 12 km of a port. The rest are underway and are left unlinked on purpose.

## Sources and licenses

- **NOAA / BOEM MarineCadastre AIS broadcast points**, 1 January 2018. Downloaded from https://coast.noaa.gov/htdata/CMSP/AISDataHandler/2018/AIS_2018_01_01.zip (verified HTTP 200, 85.0 MB zip; 7,241,776 rows). Official index: https://coast.noaa.gov/htdata/CMSP/AISDataHandler/2018/index.html. Product page: https://hub.marinecadastre.gov/pages/vesseltraffic. License: **CC0 1.0 public domain** (see https://github.com/ocm-marinecadastre/ais-vessel-traffic). Derived from the U.S. Coast Guard Nationwide AIS.
- **Natural Earth 10m ports**. Downloaded from https://naciscdn.org/naturalearth/10m/cultural/ne_10m_ports.zip (verified HTTP 200, 51,824 bytes). License: **public domain** (https://www.naturalearthdata.com/about/terms-of-use/).
- **`vessel_watchlist.csv` is a derived demo file**, not an official watchlist. It takes 250 ships from this AIS slice, gives them a new `watchlist_id`, and changes the broadcast name the way registries often do (prefixes such as `M/V`, suffixes such as `LLC` / `I`, or a swapped pair of letters). Shared identifiers (MMSI, IMO, call sign) are left off so **Connect your sources** will not merge the two Vessel lists on an exact key. That leaves the near-duplicates for Duke.

The bounding box for AIS points is latitude 36.70–39.80, longitude −77.50 to −74.50. Positions are downsampled to at most one ping per ship per 15 minutes, then capped at eight pings per ship and 4,000 pings overall. New Year’s Day traffic is heavier on pleasure craft and towing, but the slice still includes cargo, tanker, passenger, and military ships (for example MERCURIUS, ANNA MAERSK, MSC LORETTA, GRANDEUR OF THE SEAS, USNS GORDON).

`build_maritime_demo.py` in this folder rebuilds the CSVs from the downloaded originals.

## Import steps (studio UI only)

Open http://127.0.0.1:8090 on the PC running the app.

1. If the demo shop or any earlier sources are loaded, start clean. On **Home**, click **Start a new project…** (or open **⚙ Settings** and **Start a new project…**). Type `RESET` and confirm. This deletes the current project’s sources and graph, not your original files.

2. Add each CSV as its own source. Repeat this five times, once per file, in this order: `vessels.csv`, `positions.csv`, `ports.csv`, `vessel_types.csv`, `vessel_watchlist.csv`.
   - Click **Add a data source**.
   - Choose **Spreadsheet (CSV)**.
   - Under **Choose a file**, pick the CSV. The studio uploads it (limit 20 MB) and runs **Test connection** for you. Click **Next**.
   - On **Here are the first records we found**, click **Looks right**.
   - On **What is this data about?**:
     - **vessels.csv:** Each row is a… **Something else…** → `Vessel`. Identify each vessel by **`mmsi`**. Leave every field checked, including `name`, `lat`, and `lon`.
     - **positions.csv:** Something else… → `Position`. Identify by **`ping_id`**. Keep `mmsi`, `lat`, `lon`, `ts`, and `port_id`.
     - **ports.csv:** Something else… → `Port`. Identify by **`port_id`**. Keep `name`, `lat`, and `lon`.
     - **vessel_types.csv:** Something else… → `VesselType`. Identify by **`vessel_type`**. Keep `name`.
     - **vessel_watchlist.csv:** Each row is a… **Vessel** (already in your graph). Identify by **`watchlist_id`**. Keep `name`.
   - On **Name and save**, keep the suggested name, leave **Keep in sync** as you like, and click **Save and start syncing**.

   After the second source, the app jumps to **Connect your sources**. Do not confirm yet. Click **Add a data source** in the top nav and continue until all five files are saved.

3. Open **Connect your sources**. Accept the suggested links that look like:
   - Each Position belongs to a Vessel via `mmsi`
   - Each Vessel belongs to a VesselType via `vessel_type`
   - You can ignore a “same Vessel in two sources” suggestion if one appears. The watchlist was built so exact / ignore-case name matches should not fire; if something still appears, uncheck it so Duke can do the fuzzy work.
   - The Position → Port link may **not** appear automatically (only about half the pings are near a port, which is below the suggester’s 60% threshold). Add it yourself: **Add a link:** Each **Position (positions)** belongs to a(n) `Port` via **`port_id`**, then **Add**.
   - Click **Preview linked records** if you want a check, then **Confirm and link**.

4. Open **Explore → Graph explorer** (or http://127.0.0.1:8090/explore). Under **View**, turn on the **Map** and, if you want, H3 or MGRS grids. Vessel, Position, and Port nodes already carry `lat`/`lon`. The **Time** slider should pick up Position.`ts` (ISO-8601). You can also **Search and ask**, for example “Show Vessels and their Positions”.

5. Open **Live processing**.
   - **Entity matching:** leave **Duke** selected, set **Vessels** to **They are organizations** (Duke’s organization profile compares the `name` field), and click **Start matching**. Sure matches are combined; unsure pairs show up under **Possible matches to review** as **Same thing** / **Not the same**.
   - **Stream processing (Apache Flink):** click **Start stream processing** if you want live link-counts and alerts. This pack is a one-shot file load, so Flink will see a burst of graph changes rather than a live radio feed. High-degree vessels (many pings) will show under **Most connected right now**.

Optional: **Clean up** can treat `sog` as a number, but it is not required. **Send data out** can sync the graph to Neo4j once that service is running.

## What this pack does not do

- It is not a live AIS feed. The studio’s **Live feed** source type is Kafka. Flink here measures changes already in the graph after you start stream processing.
- 2018-01-01 U.S. AIS does not include operator or destination, so there is no company node from the original file. The watchlist stands in for a second vessel registry.
- Natural Earth 10m only has major ports, so smaller harbors are missing.
- Do not treat `vessel_watchlist.csv` as a real sanctions or screening list.
