// Official free sources for the registry / sanctions demo. No contact emails live here.
// Retrieval dates are stamped by the fetch scripts into fixtures/manifest.json.

export const SOURCES = {
  fcc: {
    id: 'fcc',
    title: 'FCC Covered List',
    url: 'https://www.fcc.gov/supplychain/coveredlist',
    license: 'US government work, public domain (17 USC 105)',
    notes: 'The Covered List table of equipment and services. Conditional-approval tables are not listings.',
  },
  bis: {
    id: 'bis',
    title: 'BIS Entity List (ITA Consolidated Screening List)',
    url: 'https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.csv',
    license: 'US government work, public domain (17 USC 105)',
    notes: 'Entity List rows only (source contains "Entity List"). The trade.gov search API needs a key; the CSV does not.',
  },
  ofac: {
    id: 'ofac',
    title: 'OFAC Specially Designated Nationals (SDN) List',
    url: 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML',
    license: 'US government work, public domain (17 USC 105)',
    notes: 'SDN advanced XML from the Treasury sanctions list service. Not the Non-SDN CMIC list.',
  },
  gleif: {
    id: 'gleif',
    title: 'GLEIF LEI records and Level 2 relationships',
    url: 'https://api.gleif.org/api/v1/lei-records',
    license: 'CC0 1.0',
    notes: 'Public API, no key. Legal-name search plus direct-parent, ultimate-parent, and direct-children.',
  },
  edgar: {
    id: 'edgar',
    title: 'SEC EDGAR',
    url: 'https://www.sec.gov/files/company_tickers.json',
    submissionsUrl: 'https://data.sec.gov/submissions/',
    browseUrl: 'https://www.sec.gov/cgi-bin/browse-edgar',
    license: 'US government work, public domain (17 USC 105)',
    notes: 'company_tickers.json is the current ticker file. Delisted registrants are found with the EDGAR company browse, then loaded from data.sec.gov submissions JSON. Live fetches require SEC_USER_AGENT.',
  },
};

export const RETRIEVED_FALLBACK = '2026-11-23';
