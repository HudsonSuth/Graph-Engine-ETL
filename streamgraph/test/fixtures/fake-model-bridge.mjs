// The Model Bridge with the deterministic fake provider registered, as a separate process (stdio or HTTP).
//   node test/fixtures/fake-model-bridge.mjs --data <dir> [--http <port> --token-env NAME]
import './fake-chat-model.js';
import { startModelBridge } from '../../explore/server/model-bridge.js';
startModelBridge(process.argv.slice(2)).catch(e => { process.stderr.write(`fake-model-bridge: ${e.message}\n`); process.exit(1); });
