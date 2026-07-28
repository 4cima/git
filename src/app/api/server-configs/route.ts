import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Return empty server configs for now
  return NextResponse.json({
    servers: [],
    lastUpdated: new Date().toISOString()
  })
}
