import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787'
    
    console.log('🔄 [API /home] Fetching from Worker:', WORKER_URL)

    // Fetch data from Cloudflare Worker
    const response = await fetch(`${WORKER_URL}/api/home`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    console.log('📡 [API /home] Worker response status:', response.status)

    if (!response.ok) {
      console.error('❌ [API /home] Worker response not OK:', response.status, response.statusText)
      return NextResponse.json({
        latest: [],
        latestSeries: [],
        topRated: [],
        popular: []
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }

    const data = await response.json()
    console.log('✅ [API /home] Data received successfully')

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  } catch (error) {
    console.error('❌ [API /home] Error fetching home data:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
    return NextResponse.json({
      latest: [],
      latestSeries: [],
      topRated: [],
      popular: []
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  }
}
