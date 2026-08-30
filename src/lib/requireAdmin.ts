/**
 * src/lib/requireAdmin.ts
 * Same protection as src/middleware.ts for /api/admin:
 * Basic Auth (ADMIN_USERNAME/ADMIN_PASSWORD) OR admin/supervisor session.
 * Returns a 401 NextResponse when unauthorized, or null when allowed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';

export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const authHeader = request.headers.get('authorization');

  if (username && password && authHeader && authHeader.startsWith('Basic ')) {
    try {
      const decoded = atob(authHeader.slice('Basic '.length));
      const colonIndex = decoded.indexOf(':');
      if (
        colonIndex !== -1 &&
        decoded.slice(0, colonIndex) === username &&
        decoded.slice(colonIndex + 1) === password
      ) {
        return null;
      }
    } catch {
      // malformed basic auth → fall through to session check
    }
  }

  try {
    const user = await getCurrentUser(request as NextRequest);
    if (user && (user.role === 'admin' || user.role === 'supervisor')) {
      return null;
    }
  } catch (error) {
    console.error('requireAdmin: session check failed:', error);
  }

  return NextResponse.json(
    { error: 'Unauthorized — admin session required' },
    { status: 401 },
  );
}
