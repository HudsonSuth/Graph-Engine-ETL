// Vercel Edge middleware for the static StreamGraph demo.
// HTTP Basic auth: username "demo", password from DEMO_PASSWORD.
// Fail closed: if the password is unset, every request is 401.
// No extra npm dependency: continuing a request is the platform's x-middleware-next response.

export const config = { matcher: '/(.*)' };

const REALM = 'StreamGraph demo';

function bytes(s) {
  return new TextEncoder().encode(s);
}

/** Constant-time compare of two strings (length is part of the check). */
export function safeEqual(a, b) {
  const x = bytes(String(a)), y = bytes(String(b));
  const n = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < n; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

export function basicValue(user, password) {
  const raw = bytes(`${user}:${password}`);
  let bin = '';
  for (const b of raw) bin += String.fromCharCode(b);
  return `Basic ${btoa(bin)}`;
}

function deny(message) {
  return new Response(message, {
    status: 401,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'www-authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** @returns {Response | null} null means the request may continue */
export function authorize(request, env = globalThis.process?.env || {}) {
  const password = env.DEMO_PASSWORD;
  if (typeof password !== 'string' || password.length === 0) return deny('Demo password is not configured');
  const header = request.headers.get('authorization') || '';
  const expected = basicValue('demo', password);
  if (!safeEqual(header, expected)) return deny('Authentication required');
  return null;
}

function allow() {
  return new Response(null, {
    headers: {
      'x-middleware-next': '1',
      'x-robots-tag': 'noindex, nofollow',
      'referrer-policy': 'no-referrer',
    },
  });
}

export default function middleware(request) {
  const denied = authorize(request);
  if (denied) return denied;
  return allow();
}
