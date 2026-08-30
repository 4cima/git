/**
 * /api/admin/ads/zones — Admin CRUD for ad zones.
 * zone types: popunder|banner|native|push|preroll_vast|midroll_vast|interstitial
 * integration: script|html|click_url|vast_url
 * Security: script_url/click_url/vast_url must be http/https (DB CHECK + here).
 * active defaults to 0 — a zone is served ONLY after admin activates it.
 */
import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'
import { isSafeAdUrl } from '@/lib/adsAllowlist'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

const TYPES = ['popunder', 'banner', 'native', 'push', 'preroll_vast', 'midroll_vast', 'interstitial']
const INTEGRATIONS = ['script', 'html', 'click_url', 'vast_url']

// GET — list zones with provider slug/name
export async function GET() {
  try {
    const zones = await executeAll<any>(
      `SELECT z.*, p.name AS provider_name, p.slug AS provider_slug
       FROM ad_zones z
       JOIN ad_providers p ON p.id = z.provider_id
       ORDER BY z.id DESC`,
    )
    return NextResponse.json({ data: zones, migrated: true }, { headers: NO_STORE })
  } catch (error) {
    console.warn('zones GET (may be pre-migration):', (error as Error).message)
    return NextResponse.json({ data: [], migrated: false }, { headers: NO_STORE })
  }
}

// POST — create zone
export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json() as Record<string, unknown>
    const providerId = Number(body.provider_id)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const type = typeof body.type === 'string' ? body.type : ''
    const integration = typeof body.integration === 'string' ? body.integration : ''
    const active = body.active ? 1 : 0
    const zoneKey = typeof body.zone_key === 'string' && body.zone_key.trim() ? body.zone_key.trim() : null

    const scriptUrl = typeof body.script_url === 'string' && body.script_url.trim() ? body.script_url.trim() : null
    const htmlSnippet = typeof body.html_snippet === 'string' && body.html_snippet.trim() ? body.html_snippet : null
    const clickUrl = typeof body.click_url === 'string' && body.click_url.trim() ? body.click_url.trim() : null
    const vastUrl = typeof body.vast_url === 'string' && body.vast_url.trim() ? body.vast_url.trim() : null
    const width = body.width ? Number(body.width) : null
    const height = body.height ? Number(body.height) : null

    if (!Number.isInteger(providerId) || providerId <= 0) {
      return NextResponse.json({ error: 'Valid provider_id required' }, { status: 400, headers: NO_STORE })
    }
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400, headers: NO_STORE })
    if (!TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${TYPES.join(', ')}` }, { status: 400, headers: NO_STORE })
    }
    if (!INTEGRATIONS.includes(integration)) {
      return NextResponse.json({ error: `integration must be one of: ${INTEGRATIONS.join(', ')}` }, { status: 400, headers: NO_STORE })
    }

    // per-integration safety
    if (integration === 'script') {
      if (!scriptUrl || !isSafeAdUrl(scriptUrl)) {
        return NextResponse.json({ error: 'script_url must be a valid https/http URL' }, { status: 400, headers: NO_STORE })
      }
    } else if (integration === 'html') {
      if (!htmlSnippet) return NextResponse.json({ error: 'html_snippet is required for html integration' }, { status: 400, headers: NO_STORE })
    } else if (integration === 'click_url') {
      if (!clickUrl || !isSafeAdUrl(clickUrl)) {
        return NextResponse.json({ error: 'click_url must be a valid https/http URL' }, { status: 400, headers: NO_STORE })
      }
    } else if (integration === 'vast_url') {
      if (!vastUrl || !isSafeAdUrl(vastUrl)) {
        return NextResponse.json({ error: 'vast_url must be a valid https/http URL' }, { status: 400, headers: NO_STORE })
      }
    }

    if (scriptUrl && !isSafeAdUrl(scriptUrl)) {
      return NextResponse.json({ error: 'script_url must be http/https' }, { status: 400, headers: NO_STORE })
    }
    if (clickUrl && !isSafeAdUrl(clickUrl)) {
      return NextResponse.json({ error: 'click_url must be http/https' }, { status: 400, headers: NO_STORE })
    }
    if (vastUrl && !isSafeAdUrl(vastUrl)) {
      return NextResponse.json({ error: 'vast_url must be http/https' }, { status: 400, headers: NO_STORE })
    }

    // never allow example.com anywhere
    const blob = `${scriptUrl || ''} ${htmlSnippet || ''} ${clickUrl || ''} ${vastUrl || ''} ${name || ''}`
    if (blob.includes('example.com')) {
      return NextResponse.json({ error: 'example.com is forbidden — paste a real zone/script' }, { status: 400, headers: NO_STORE })
    }

    try {
      await executeAll(
        `INSERT INTO ad_zones
           (provider_id, name, type, integration, script_url, html_snippet, click_url, vast_url, zone_key, width, height, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [providerId, name, type, integration, scriptUrl, htmlSnippet, clickUrl, vastUrl, zoneKey, width, height, active],
      )
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('no such table')) {
        return NextResponse.json({ error: 'mediation tables not migrated yet' }, { status: 409, headers: NO_STORE })
      }
      throw err
    }

    return NextResponse.json(
      { success: true, message: active === 1 ? 'Zone created and ACTIVE' : 'Zone created (inactive — review before enabling)' },
      { status: 201, headers: NO_STORE },
    )
  } catch (error) {
    console.error('zones POST error:', error)
    return NextResponse.json({ error: 'Failed to create zone' }, { status: 500, headers: NO_STORE })
  }
}

// PUT — update zone (body.id + any assignable field)
export async function PUT(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json() as Record<string, unknown>
    const id = Number(body.id)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Valid id required' }, { status: 400, headers: NO_STORE })
    }

    const updates: string[] = []
    const values: (string | number | null)[] = []

    const pickString = (v: unknown): string | null | undefined =>
      v === undefined ? undefined : (typeof v === 'string' && v.trim() ? v.trim() : (v === null ? null : undefined))

    const name = pickString(body.name); if (name !== undefined) { updates.push('name = ?'); values.push(name) }

    const type = pickString(body.type)
    if (type !== undefined) {
      if (!type || !TYPES.includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400, headers: NO_STORE })
      updates.push('type = ?'); values.push(type)
    }

    const integration = pickString(body.integration)
    if (integration !== undefined) {
      if (!integration || !INTEGRATIONS.includes(integration)) return NextResponse.json({ error: 'Invalid integration' }, { status: 400, headers: NO_STORE })
      updates.push('integration = ?'); values.push(integration)
    }

    const scriptUrl = pickString(body.script_url)
    if (scriptUrl !== undefined) {
      if (scriptUrl && !isSafeAdUrl(scriptUrl)) return NextResponse.json({ error: 'script_url must be http/https' }, { status: 400, headers: NO_STORE })
      updates.push('script_url = ?'); values.push(scriptUrl)
    }

    const htmlSnippet = pickString(body.html_snippet)
    if (htmlSnippet !== undefined) { updates.push('html_snippet = ?'); values.push(htmlSnippet) }

    const clickUrl = pickString(body.click_url)
    if (clickUrl !== undefined) {
      if (clickUrl && !isSafeAdUrl(clickUrl)) return NextResponse.json({ error: 'click_url must be http/https' }, { status: 400, headers: NO_STORE })
      updates.push('click_url = ?'); values.push(clickUrl)
    }

    const vastUrl = pickString(body.vast_url)
    if (vastUrl !== undefined) {
      if (vastUrl && !isSafeAdUrl(vastUrl)) return NextResponse.json({ error: 'vast_url must be http/https' }, { status: 400, headers: NO_STORE })
      updates.push('vast_url = ?'); values.push(vastUrl)
    }

    const zoneKey = pickString(body.zone_key)
    if (zoneKey !== undefined) { updates.push('zone_key = ?'); values.push(zoneKey) }

    if (body.width !== undefined) { updates.push('width = ?'); values.push(body.width ? Number(body.width) : null) }
    if (body.height !== undefined) { updates.push('height = ?'); values.push(body.height ? Number(body.height) : null) }
    if (body.active !== undefined) { updates.push('active = ?'); values.push(body.active ? 1 : 0) }
    if (body.provider_id !== undefined) {
      const pid = Number(body.provider_id)
      if (!Number.isInteger(pid) || pid <= 0) return NextResponse.json({ error: 'Invalid provider_id' }, { status: 400, headers: NO_STORE })
      updates.push('provider_id = ?'); values.push(pid)
    }

    if (JSON.stringify(body).includes('example.com')) {
      return NextResponse.json({ error: 'example.com is forbidden' }, { status: 400, headers: NO_STORE })
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: NO_STORE })
    }

    try {
      updates.push("updated_at = datetime('now')")
      await executeAll(`UPDATE ad_zones SET ${updates.join(', ')} WHERE id = ?`, [...values, id])
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('no such table')) {
        return NextResponse.json({ error: 'mediation tables not migrated yet' }, { status: 409, headers: NO_STORE })
      }
      throw err
    }

    return NextResponse.json({ success: true, message: 'Zone updated' }, { headers: NO_STORE })
  } catch (error) {
    console.error('zones PUT error:', error)
    return NextResponse.json({ error: 'Failed to update zone' }, { status: 500, headers: NO_STORE })
  }
}

// DELETE — remove zone by id (?id=N)
export async function DELETE(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '')
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Valid id required (?id=N)' }, { status: 400, headers: NO_STORE })
    }
    try {
      await executeAll('DELETE FROM ad_zones WHERE id = ?', [id])
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes('no such table')) {
        return NextResponse.json({ error: 'mediation tables not migrated yet' }, { status: 409, headers: NO_STORE })
      }
      throw err
    }
    return NextResponse.json({ success: true, message: 'Zone deleted' }, { headers: NO_STORE })
  } catch (error) {
    console.error('zones DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete zone' }, { status: 500, headers: NO_STORE })
  }
}