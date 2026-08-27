import { NextRequest, NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-server'
import { isValidOrder, STREAM_ORDER_KEY } from '@/lib/serverOrder'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const admin = await getCurrentUser(request)
  if (!admin || (admin.role !== 'admin' && admin.role !== 'supervisor')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { order?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const order = body.order
  if (!isValidOrder(order)) {
    return NextResponse.json(
      { error: 'Invalid order: must contain exactly the 8 known server ids, no duplicates' },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()
  try {
    await executeAll(
      'INSERT OR REPLACE INTO site_config (key, value, updated_at) VALUES (?, ?, ?)',
      [STREAM_ORDER_KEY, JSON.stringify(order), now],
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}