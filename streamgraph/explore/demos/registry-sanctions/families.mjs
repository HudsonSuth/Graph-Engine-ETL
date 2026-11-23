// Name gates for the fixture. Broad on purpose: resolution, not this filter, decides same_as.
// A token such as "dahua" inside an address still qualifies a row for the sample.

// "zte" is a prefix so ZTEK and ZTEST stay in the sample as near-misses. The leading boundary
// still rejects "aztech" and "gaztelekom".
const TOKEN = /(?<![a-z0-9])(huawei|hikvision|dahua|hytera|kaspersky|zte)|china mobile|china telecom|china unicom|海康威视|华为技术|华为投资控股|中兴通讯|中国移动|中国电信|中国联合网络通信|中国联通/i;

const GLEIF_DROP = /瓷业|医药|贷款|华融|新华为|华善|football|hawthorn|disney|discovery|scott,? inc/i;

/** True when text mentions one of the covered-list families or their Chinese legal names. */
export function mentionsFamily(text) {
  return TOKEN.test(String(text || '').toLowerCase());
}

/** GLEIF keep-rule: family mention, minus lookalike companies the legal-name search also returns. */
export function keepGleifName(text) {
  const s = String(text || '');
  if (!mentionsFamily(s)) return false;
  if (GLEIF_DROP.test(s)) return false;
  return true;
}
