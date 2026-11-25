// STREAMGRAPH_L45=broken is the deliberately wrong L4/L5 build used by test/wrong-l45.test.js.
// It skips the k-NN write, the export check on retrieved types, the agent half of validateFlow,
// the human check on trust promotion, and checkpoint persistence. Do not use it for a real run.
export const brokenL45 = () => process.env.STREAMGRAPH_L45 === 'broken';
