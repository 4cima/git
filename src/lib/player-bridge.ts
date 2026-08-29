import { getCloudflareContext } from '@opennextjs/cloudflare';

// Short-lived signed player-token (bridge) — HMAC-SHA256 over a compact
// payload. Issued on 4cima.com, carried to 4cima.stream as ?pt=… and
// verified by /api/player/* endpoints. Never contains session secrets.
export const PLAYER_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type PlayerTokenPayload = {
  uid: string;
  name: string;
  avatar: string;
  role: string;
  exp: number;
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlJson(obj: unknown): string {
  return b64url(JSON.stringify(obj));
}

async function getSecret(): Promise<string> {
  let secret = '';
  try {
    const ctx = getCloudflareContext();
    secret = ((ctx.env as any) || {}).PLAYER_BRIDGE_SECRET || '';
  } catch {}
  return secret || process.env.PLAYER_BRIDGE_SECRET || '';
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Buffer.from(sig).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signPlayerToken(user: {
  id: string; name: string; avatar_url: string; role: string;
}): Promise<string> {
  const secret = await getSecret();
  if (!secret) throw new Error('PLAYER_BRIDGE_SECRET_NOT_CONFIGURED');
  const payload: PlayerTokenPayload = {
    uid: user.id,
    name: user.name || '',
    avatar: user.avatar_url || '',
    role: user.role || 'user',
    exp: Math.floor(Date.now() / 1000) + PLAYER_TTL_SECONDS,
  };
  const body = b64urlJson(payload);
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

export async function verifyPlayerToken(token: string): Promise<PlayerTokenPayload | null> {
  const secret = await getSecret();
  if (!secret || !token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = await hmac(secret, body);
  if (expected.length !== sig.length || expected !== sig) return null;
  try {
    const json = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'));
    if (!json?.uid || typeof json.exp !== 'number') return null;
    if (json.exp * 1000 < Date.now()) return null;
    return json;
  } catch {
    return null;
  }
}

export function bearerFrom(req: Request): string {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

// Strict CORS: the player origin only (never '*').
export function playerCors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin === 'https://4cima.stream' || origin === 'https://www.4cima.stream') {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}
