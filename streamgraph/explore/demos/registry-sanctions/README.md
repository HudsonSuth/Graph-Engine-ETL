# Registry and sanctions sample

A small offline excerpt for StreamGraph. It is built from five free public sources and is not a full dump. Refresh it with `npm run fixtures:registry` from `streamgraph/`. Live SEC fetches read `SEC_USER_AGENT` from the environment (a descriptive user agent that includes contact information). If that variable is unset, EDGAR fetches are skipped and the committed submissions stay as they are. The value is never written into this tree.

Retrieved **2026-11-23**.

| Source | Records in the fixture | URL | License |
| --- | ---: | --- | --- |
| FCC Covered List | 13 named producers from the Covered Equipment table | https://www.fcc.gov/supplychain/coveredlist | US government work, public domain |
| BIS Entity List | 143 rows from the ITA Consolidated Screening List, Entity List only | https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.csv | US government work, public domain |
| OFAC SDN | 2 SDN entries whose address text says “Dahua Hotel” | https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML | US government work, public domain |
| GLEIF | 40 LEI records, including Level 2 parent links | https://api.gleif.org/api/v1/lei-records | CC0 1.0 |
| SEC EDGAR tickers | 0 current tickers matched, out of 10,399 in `company_tickers.json` | https://www.sec.gov/files/company_tickers.json | US government work, public domain |
| SEC EDGAR submissions | 17 trimmed submissions for registrants the EDGAR company browse returned | https://data.sec.gov/submissions/CIK##########.json | US government work, public domain |

The named producers (Huawei, ZTE, Hikvision, Dahua, Hytera, China Mobile, China Telecom, and the others on the Covered List) are on the FCC list and, for several of them, the BIS Entity List. They are not on the OFAC SDN list in this retrieval. Two SDN entries mention “Dahua Hotel” in a Shanghai address. Those are kept so a matcher that treats a shared word as identity will fail. EDGAR submissions include ZTE CORP and also ZTEK CORP and ZTEST ELECTRONICS, which are not the same company. `company_tickers.json` only lists current tickers; the China Mobile, China Telecom, China Unicom, ZTE, and Huawei Tech Investment registrants in this sample are historical filers found through the EDGAR company browse, then read from `data.sec.gov`.

Submissions are trimmed to the company block plus four recent filings. GLEIF rows are the JSON:API records returned for these names, their direct parents, and their direct children.

Run the parsers and the resolution tests with `npm run test:registry`.
