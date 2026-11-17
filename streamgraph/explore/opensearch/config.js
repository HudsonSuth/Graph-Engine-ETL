// Local OpenSearch runtime settings (Apache-2.0 server; we only talk to it over its REST API with fetch).
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
export const OPENSEARCH_VERSION = process.env.STREAMGRAPH_OPENSEARCH_VERSION || '3.9.0';
export const RUNTIME = process.env.STREAMGRAPH_OPENSEARCH_RUNTIME || join(HERE, '.runtime');
export const HOME = join(RUNTIME, 'opensearch');
export const DATA = process.env.STREAMGRAPH_OPENSEARCH_DATA || join(RUNTIME, 'data');
export const PORT = Number(process.env.STREAMGRAPH_OPENSEARCH_PORT || 9200);
export const HEAP = process.env.STREAMGRAPH_OPENSEARCH_HEAP || '-Xms512m -Xmx1g';
// Linux/macOS: the "min" distribution (core only, bundled JDK, no security plugin, ~250 MB).
// Windows: no min zip is published, so we use the full bundle (~1 GB) and disable its security plugin.
export function artifact(platform = process.platform, arch = process.arch) {
  const a = { x64: 'x64', arm64: 'arm64' }[arch] || 'x64', v = OPENSEARCH_VERSION;
  if (platform === 'win32') return { url: `https://artifacts.opensearch.org/releases/bundle/opensearch/${v}/opensearch-${v}-windows-x64.zip`, kind: 'zip', bundle: true };
  const os = platform === 'darwin' ? 'darwin' : 'linux';
  return { url: `https://artifacts.opensearch.org/releases/core/opensearch/${v}/opensearch-min-${v}-${os}-${a}.tar.gz`, kind: 'tgz', bundle: false };
}
