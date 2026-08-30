import { NextResponse } from 'next/server'
import { executeAll, executeFirst } from '@/lib/db'

export const dynamic = 'force-dynamic'

type AdRow = {
  id: number
  title: string
  type: 'popunder' | 'banner' | 'preroll' | 'midroll'
  content: string
  position?: string | null
  active?: number | null
  impressions?: number | null
  clicks?: number | null
  created_at?: string | null
}

// GET - Fetch ads with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const type = searchParams.get('type')
    const position = searchParams.get('position')

    let sql = 'SELECT * FROM ads WHERE 1=1'
    const params: any[] = []

    if (active === 'true') {
      sql += ' AND active = 1'
    } else if (active === 'false') {
      sql += ' AND active = 0'
    }

    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }

    if (position) {
      sql += ' AND position = ?'
      params.push(position)
    }

    sql += ' ORDER BY created_at DESC'

    const ads = await executeAll<AdRow>(sql, params)
    return NextResponse.json({ data: ads })
  } catch (error) {
    console.error('Error fetching ads:', error)
    return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 })
  }
}

// POST - Create new ad
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, type, content, position, active = 1 } = body

    if (!title || !type || !content) {
      return NextResponse.json({ error: 'Missing required fields: title, type, content' }, { status: 400 })
    }

    const validTypes = ['popunder', 'banner', 'preroll', 'midroll']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const sql = `
      INSERT INTO ads (title, type, content, position, active)
      VALUES (?, ?, ?, ?, ?)
    `
    
    await executeAll(sql, [title, type, content, position || null, active])
    
    return NextResponse.json({ success: true, message: 'Ad created successfully' }, { status: 201 })
  } catch (error) {
    console.error('Error creating ad:', error)
    return NextResponse.json({ error: 'Failed to create ad' }, { status: 500 })
  }
}
