import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://127.0.0.1:8787'
    const { slug } = await params
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit') || '8'
    const response = await fetch(`${WORKER_URL}/api/tv/${slug}/cast?limit=${limit}`)
    if (!response.ok) return NextResponse.json({ data: [] }, { status: 200 })
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ data: [] }, { status: 200 })
  }
}
