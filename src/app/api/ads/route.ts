import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Stub endpoint - returns empty ads array
  // Real ad content would be managed separately
  return NextResponse.json(
    { data: [] },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60',
      }
    }
  )
}
