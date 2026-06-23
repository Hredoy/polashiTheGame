// Signed session tokens. On first connect the server mints a token embedding the user id,
// signed with an HMAC secret. On reconnect the client presents the token; we verify the
// signature before trusting the id. A client can never claim another user's id without
// their token, which closes the handshake-impersonation hole.

import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me';
const DEFAULT_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 30 * 24 * 60 * 60 * 1000); // 30 days

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function sign(payloadB64: string): string {
  return createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
}

// Tokens embed an expiry. Re-issue on every connect (rotation) so an old leaked token's
// window stays bounded while the user keeps a stable id.
export function signToken(userId: string, ttlMs = DEFAULT_TTL_MS): string {
  const now = Date.now();
  const payload = b64url(JSON.stringify({ uid: userId, iat: now, exp: now + ttlMs }));
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  // Constant-time compare; lengths must match for timingSafeEqual.
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof parsed.uid !== 'string') return null;
    if (typeof parsed.exp === 'number' && Date.now() > parsed.exp) return null; // expired
    return parsed.uid;
  } catch {
    return null;
  }
}
