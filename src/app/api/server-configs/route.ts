import { NextResponse } from 'next/server'
import { getOrderedServers } from '@/lib/serverOrder'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ordered = await getOrderedServers()
  return NextResponse.json(
    {
      servers: ordered.map(server => ({
        id: server.id,
        name: server.name,
        url: server.base
      })),
      lastUpdated: new Date().toISOString()
    },
    {
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  )
}
