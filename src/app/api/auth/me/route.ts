import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('❌ /api/auth/me error:', error);
    // Return null user instead of 500 to avoid breaking UI
    return NextResponse.json({ user: null });
  }
}
