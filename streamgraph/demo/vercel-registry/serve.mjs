// Local static server for the built demo. Does not apply the Vercel password gate.
// Usage: npm run demo:registry:serve
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain',
};
const port = Number(process.argv.find((a, i, arr) => arr[i - 1] === '--port') || 8096);

if (!existsSync(join(PUBLIC, 'index.html'))) {
  console.error('Build the demo first: npm run demo:registry');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = normalize(join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC) || !existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'content-type': MIME[extname(file)] || 'application/octet-stream',
      'x-robots-tag': 'noindex, nofollow',
      'referrer-policy': 'no-referrer',
    });
    res.end(await readFile(file));
  } catch (e) {
    res.writeHead(500);
    res.end(e.message);
  }
});
server.listen(port, '127.0.0.1', () => console.log(`registry demo at http://127.0.0.1:${port}/`));
