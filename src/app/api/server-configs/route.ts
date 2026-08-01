import { NextResponse } from 'next/server'
import { STREAM_SERVERS } from '@/services/streamService'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    servers: STREAM_SERVERS.map(server => ({
      id: server.id,
      name: server.name,
      url: server.base
    })),
    lastUpdated: new Date().toISOString()
  })
}
