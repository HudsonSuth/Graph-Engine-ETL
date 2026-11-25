// STREAMGRAPH_L69=broken turns tracing and the eval scorer into the wrong behaviour on purpose,
// so test/wrong-l69.test.js can prove a bad build fails: hosted traces go out with the prompt
// even when LangSmith is off or export is denied, and a missed eval expectation still counts as a pass.
export const brokenL69 = () => process.env.STREAMGRAPH_L69 === 'broken';
