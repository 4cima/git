import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787'

    // Fetch data from Cloudflare Worker
    const response = await fetch(`${WORKER_URL}/api/home`)

    if (!response.ok) {
      return NextResponse.json({
        latest: [],
        latestSeries: [],
        topRated: [],
        popular: []
      })
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching home data:', error)
    return NextResponse.json({
      latest: [],
      latestSeries: [],
      topRated: [],
      popular: []
    })
  }
}
