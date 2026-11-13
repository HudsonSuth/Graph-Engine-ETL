// Safety limits for reading untrusted documents. Every limit gives a plain-language error when hit.
export const DEFAULT_LIMITS = {
  maxFileBytes: 20e6,          // per file (same as the upload limit)
  maxFiles: 500,               // per folder scan
  maxPages: 300,               // per PDF
  maxSheets: 50,               // per workbook
  maxRowsPerTable: 10000,      // extra rows are left out, with a note
  maxTextChars: 2e6,           // text kept per document
  zipMaxEntries: 5000,         // parts inside a .docx/.xlsx
  zipMaxTotalBytes: 150e6,     // total unpacked size of a .docx/.xlsx
  zipMaxRatio: 200,            // unpacked/packed ratio allowed for any part over 1 MB
};
export const limitsFrom = cfg => ({ ...DEFAULT_LIMITS, ...Object.fromEntries(Object.entries(cfg || {}).filter(([k, v]) => k in DEFAULT_LIMITS && Number.isFinite(Number(v)) && Number(v) > 0).map(([k, v]) => [k, Number(v)])) });
// Errors the user should see as-is.
export const docError = msg => Object.assign(new Error(msg), { friendly: true });
export const mb = n => (n < 1e6 ? `${Math.max(1, Math.round(n / 1e3))} KB` : `${Math.round(n / 1e5) / 10} MB`);
