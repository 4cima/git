import { NextResponse } from 'next/server'

// POST - DISABLED: no visitor writes to the database. Empty 200 for compatibility.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    {},
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
