import { readFile } from 'node:fs/promises';

export function opt(name, fallback = undefined) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

export async function getText(url, { headers = {}, file = '' } = {}) {
  if (file) return readFile(file, 'utf8');
  const res = await fetch(url, { headers, redirect: 'follow' });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} from ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

let nextAt = 0;
/** SEC asks for at most 10 requests a second. Stay under that. */
export async function secGet(url, accept) {
  const ua = process.env.SEC_USER_AGENT;
  if (typeof ua !== 'string' || ua.trim() === '') {
    const err = new Error('SEC_USER_AGENT is not set');
    err.code = 'NO_SEC_UA';
    throw err;
  }
  const wait = Math.max(0, nextAt - Date.now());
  nextAt = Date.now() + wait + 150;
  if (wait) await new Promise(r => setTimeout(r, wait));
  const res = await fetch(url, {
    headers: { 'user-agent': ua.trim(), accept: accept || 'application/json' },
    redirect: 'follow',
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} from ${url}`);
    err.status = res.status;
    throw err;
  }
  return res;
}
