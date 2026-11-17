// WIKI_IMPL=broken switches on DELIBERATELY WRONG behaviour so the wrong-impl tests can prove the wiki suites detect it:
//  - identity minted from the folder path (moving a file changes its IRI)       (W1)
//  - re-import never deletes notes that disappeared from the folder             (W1)
//  - any `human:` actor, or any verified entry, counts as human-reviewed         (W1/W4 trust)
//  - RDF -> vault ingest drops the existing Markdown bodies                       (W2)
//  - frontmatter validation accepts everything                                    (W3)
//  - agent (MCP) writes may stamp `human:` actors and skip ABAC write checks    (W6)
export const broken = () => process.env.WIKI_IMPL === 'broken';
