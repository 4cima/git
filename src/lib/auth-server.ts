import { NextRequest } from 'next/server';
import { executeAll, executeFirst } from '@/lib/db';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const GOOGLE_AUTH  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_CERTS = 'https://www.googleapis.com/oauth2/v3/certs';

export const SESSION_COOKIE  = '4cima_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const ADMIN_EMAILS = ['cairo.tv@gmail.com'];

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: 'user' | 'admin' | 'supervisor';
};

async function getGoogleEnv() {
  let clientId = '';
  let clientSecret = '';
  try {
    const ctx = getCloudflareContext();
    const env = ctx.env as any;
    clientId = env.GOOGLE_CLIENT_ID;
    clientSecret = env.GOOGLE_CLIENT_SECRET;
  } catch {}
  clientId     = clientId     || process.env.GOOGLE_CLIENT_ID     || '';
  clientSecret = clientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED');
  return { clientId, clientSecret };
}

export async function beginGoogleAuth(origin: string) {
  const state = crypto.randomUUID();
  const { clientId } = await getGoogleEnv();
  const url = new URL(GOOGLE_AUTH);
  url.searchParams.set('client_id',     clientId);
  url.searchParams.set('redirect_uri',  `${origin}/api/auth/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope',         'openid email profile');
  url.searchParams.set('state',         state);
  url.searchParams.set('prompt',        'select_account');
  return { url: url.toString(), state };
}

export async function handleAuthCallback(req: NextRequest) {
  const requestUrl   = new URL(req.url);
  const code         = requestUrl.searchParams.get('code');
  const state        = requestUrl.searchParams.get('state');
  const expectedState = req.cookies.get('oauth_state')?.value;

  if (!code || !state || state !== expectedState) return null;

  const origin = requestUrl.origin;
  const { clientId, clientSecret } = await getGoogleEnv();

  let tokenResponse: Response;
  let tokenJson: any;
  try {
    tokenResponse = await fetch(GOOGLE_TOKEN, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  `${origin}/api/auth/callback`,
        grant_type:    'authorization_code',
      }),
    });
    tokenJson = await tokenResponse.json();
  } catch {
    return null;
  }

  if (!tokenResponse.ok || !tokenJson.id_token || !tokenJson.access_token) return null;

  let payload: any;
  try {
    const verified = await jwtVerify(
      tokenJson.id_token,
      createRemoteJWKSet(new URL(GOOGLE_CERTS)),
      {
        issuer:   ['https://accounts.google.com', 'accounts.google.com'],
        audience: clientId,
      },
    );
    payload = verified.payload;
  } catch {
    return null;
  }

  const googleSub = (payload.sub as string) || '';
  const email     = ((payload.email as string) || '').toLowerCase();
  if (!googleSub || !email) return null;

  const userId = `google:${googleSub}`;
  const name   = (payload.name    as string) || '';
  const avatar = (payload.picture as string) || '';
  const role   = ADMIN_EMAILS.includes(email) ? 'admin' : 'user';
  const now    = new Date().toISOString();

  await executeAll(
    `INSERT INTO users (id, email, name, avatar_url, role, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO NOTHING`,
    [userId, email, name, avatar, role, now, now],
  );

  await executeAll(
    `UPDATE users SET name = ?, avatar_url = ?, role = ?, last_login_at = ? WHERE id = ?`,
    [name, avatar, role, now, userId],
  );

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  await executeAll(
    `INSERT INTO sessions (id, user_id, expires_at, user_agent, ip) VALUES (?, ?, ?, ?, ?)`,
    [
      sessionId,
      userId,
      expiresAt,
      req.headers.get('user-agent')        || '',
      req.headers.get('cf-connecting-ip')  || req.headers.get('x-real-ip') || '',
    ],
  );

  return { sessionId, user: await getUserById(userId) };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const row = await executeFirst<any>(
    `SELECT id, email, name, avatar_url, role FROM users WHERE id = ?`,
    [id],
  );
  return row
    ? { id: row.id, email: row.email, name: row.name, avatar_url: row.avatar_url, role: row.role }
    : null;
}

export async function getCurrentUser(req: NextRequest): Promise<AuthUser | null> {
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const row = await executeFirst<any>(
    `SELECT s.expires_at, u.id, u.email, u.name, u.avatar_url, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    [sessionId],
  );
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  return {
    id:         row.id,
    email:      row.email,
    name:       row.name,
    avatar_url: row.avatar_url,
    role:       row.role,
  };
}

export async function killSession(req: NextRequest) {
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return;
  await executeAll(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
}
