/**
 * /api/admin/ads/zones — CRUD مناطق الإعلانات.
 * أنواع: popunder|banner|native|push|preroll_vast|midroll_vast|interstitial
 * تكاملات: script|html|click_url|vast_url — روابط script/click/vast يجب أن تكون http/https
 * (فحص محلي + CHECK في القاعدة). المنطقة الجديدة inactive افتراضيًا — تُخدم فقط بعد التفعيل.
 */
import { NextResponse } from 'next/server'
import { executeAll } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'
import { isSafeAdUrl } from '@/lib/adsAllowlist'
import { AD_TYPES, AD_INTEGRATIONS } from '@/lib/adSlots'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  try {
    const zones = await executeAll<Record<string, unknown>>(
      `SELECT z.*, p.name AS provider_name, p.slug AS provider_slug, p.status AS provider_status
       FROM ad_zones z
       JOIN ad_providers p ON p.id = z.provider_id
       ORDER BY z.id DESC`,
    )
    return NextResponse.json({ ok: true, data: zones }, { headers: NO_STORE })
  } catch (error) {
    if ((error as Error).message.includes('no such table')) {
      return NextResponse.json({ ok: true, data: [], migrated: false }, { headers: NO_STORE })
    }
    return NextResponse.json({ ok: false, error: 'فشل جلب المناطق' }, { status: 500, headers: NO_STORE })
  }
}

function extract(body: Record<string, unknown>) {
  return {
    providerId: Number(body.provider_id),
    name: typeof body.name === 'string' ? body.name.trim() : '',
    type: typeof body.type === 'string' ? body.type : '',
    integration: typeof body.integration === 'string' ? body.integration : '',
    active: body.active ? 1 : 0,
    zoneKey: typeof body.zone_key === 'string' && body.zone_key.trim() ? body.zone_key.trim() : null,
    scriptUrl: typeof body.script_url === 'string' && body.script_url.trim() ? body.script_url.trim() : null,
    htmlSnippet: typeof body.html_snippet === 'string' && body.html_snippet.trim() ? body.html_snippet.trim() : null,
    clickUrl: typeof body.click_url === 'string' && body.click_url.trim() ? body.click_url.trim() : null,
    vastUrl: typeof body.vast_url === 'string' && body.vast_url.trim() ? body.vast_url.trim() : null,
    width: body.width ? Number(body.width) : null,
    height: body.height ? Number(body.height) : null,
  }
}

function validateUrls(scriptUrl: string | null, clickUrl: string | null, vastUrl: string | null): string | null {
  if (scriptUrl && !isSafeAdUrl(scriptUrl)) return 'script_url يجب أن يكون رابط http/https'
  if (clickUrl && !isSafeAdUrl(clickUrl)) return 'click_url يجب أن يكون رابط http/https'
  if (vastUrl && !isSafeAdUrl(vastUrl)) return 'vast_url يجب أن يكون رابط http/https'
  return null
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = (await request.json()) as Record<string, unknown>
    const f = extract(body)

    if (!Number.isInteger(f.providerId) || f.providerId <= 0)
      return NextResponse.json({ ok: false, error: 'provider_id غير صالح' }, { status: 400, headers: NO_STORE })
    if (!f.name) return NextResponse.json({ ok: false, error: 'name مطلوب' }, { status: 400, headers: NO_STORE })
    if (!(AD_TYPES as readonly string[]).includes(f.type))
      return NextResponse.json({ ok: false, error: `type يجب أن يكون: ${AD_TYPES.join(', ')}` }, { status: 400, headers: NO_STORE })
    if (!(AD_INTEGRATIONS as readonly string[]).includes(f.integration))
      return NextResponse.json({ ok: false, error: `integration يجب أن يكون: ${AD_INTEGRATIONS.join(', ')}` }, { status: 400, headers: NO_STORE })
    if (f.integration === 'script' && !f.scriptUrl)
      return NextResponse.json({ ok: false, error: 'script_url مطلوب لتكامل script' }, { status: 400, headers: NO_STORE })
    if (f.integration === 'html' && !f.htmlSnippet)
      return NextResponse.json({ ok: false, error: 'html_snippet مطلوب لتكامل html' }, { status: 400, headers: NO_STORE })
    if (f.integration === 'click_url' && !f.clickUrl)
      return NextResponse.json({ ok: false, error: 'click_url مطلوب لتكامل click_url' }, { status: 400, headers: NO_STORE })
    if (f.integration === 'vast_url' && !f.vastUrl)
      return NextResponse.json({ ok: false, error: 'vast_url مطلوب لتكامل vast_url' }, { status: 400, headers: NO_STORE })

    const urlErr = validateUrls(f.scriptUrl, f.clickUrl, f.vastUrl)
    if (urlErr) return NextResponse.json({ ok: false, error: urlErr }, { status: 400, headers: NO_STORE })

    // example.com ممنوع في أي مكان — قاعدة demo ads
    const blob = `${f.scriptUrl || ''} ${f.htmlSnippet || ''} ${f.clickUrl || ''} ${f.vastUrl || ''} ${f.name}`
    if (blob.includes('example.com'))
      return NextResponse.json({ ok: false, error: 'example.com محظور — الصق zone/سكربت حقيقي' }, { status: 400, headers: NO_STORE })

    try {
      await executeAll(
        `INSERT INTO ad_zones
           (provider_id, name, type, integration, script_url, html_snippet, click_url, vast_url, zone_key, width, height, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.providerId, f.name, f.type, f.integration, f.scriptUrl, f.htmlSnippet, f.clickUrl, f.vastUrl, f.zoneKey, f.width, f.height, f.active],
      )
    } catch (err) {
      if ((err as Error).message.includes('no such table'))
        return NextResponse.json({ ok: false, error: 'جداول الوساطة غير منشأة بعد' }, { status: 409, headers: NO_STORE })
      throw err
    }
    return NextResponse.json(
      { ok: true, message: f.active ? 'أُنشئت المنطقة وتعمل الآن' : 'أُنشئت المنطقة (غير مفعلة — راجعها قبل التشغيل)' },
      { status: 201, headers: NO_STORE },
    )
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل إنشاء المنطقة' }, { status: 500, headers: NO_STORE })
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = (await request.json()) as Record<string, unknown>
    const id = Number(body.id)
    if (!Number.isInteger(id) || id <= 0)
      return NextResponse.json({ ok: false, error: 'id غير صالح' }, { status: 400, headers: NO_STORE })

    const updates: string[] = []
    const values: (string | number | null)[] = []

    const pickString = (v: unknown): string | null | undefined =>
      v === undefined ? undefined : (typeof v === 'string' && v.trim() ? v.trim() : (v === null ? null : undefined))

    const name = pickString(body.name)
    if (name !== undefined) { updates.push('name = ?'); values.push(name) }

    const type = pickString(body.type)
    if (type !== undefined) {
      if (!type || !(AD_TYPES as readonly string[]).includes(type)) return NextResponse.json({ ok: false, error: 'type غير صالح' }, { status: 400, headers: NO_STORE })
      updates.push('type = ?'); values.push(type)
    }
    const integration = pickString(body.integration)
    if (integration !== undefined) {
      if (!integration || !(AD_INTEGRATIONS as readonly string[]).includes(integration)) return NextResponse.json({ ok: false, error: 'integration غير صالح' }, { status: 400, headers: NO_STORE })
      updates.push('integration = ?'); values.push(integration)
    }

    const scriptUrl = pickString(body.script_url)
    if (scriptUrl !== undefined) { updates.push('script_url = ?'); values.push(scriptUrl) }
    const htmlSnippet = pickString(body.html_snippet)
    if (htmlSnippet !== undefined) { updates.push('html_snippet = ?'); values.push(htmlSnippet) }
    const clickUrl = pickString(body.click_url)
    if (clickUrl !== undefined) { updates.push('click_url = ?'); values.push(clickUrl) }
    const vastUrl = pickString(body.vast_url)
    if (vastUrl !== undefined) { updates.push('vast_url = ?'); values.push(vastUrl) }
    const zoneKey = pickString(body.zone_key)
    if (zoneKey !== undefined) { updates.push('zone_key = ?'); values.push(zoneKey) }

    const urlErr = validateUrls(
      scriptUrl === undefined ? null : (scriptUrl as string | null),
      clickUrl === undefined ? null : (clickUrl as string | null),
      vastUrl === undefined ? null : (vastUrl as string | null),
    )
    if (urlErr) return NextResponse.json({ ok: false, error: urlErr }, { status: 400, headers: NO_STORE })

    if (body.width !== undefined) { updates.push('width = ?'); values.push(body.width ? Number(body.width) : null) }
    if (body.height !== undefined) { updates.push('height = ?'); values.push(body.height ? Number(body.height) : null) }
    if (body.active !== undefined) { updates.push('active = ?'); values.push(body.active ? 1 : 0) }
    if (body.provider_id !== undefined) {
      const pid = Number(body.provider_id)
      if (!Number.isInteger(pid) || pid <= 0) return NextResponse.json({ ok: false, error: 'provider_id غير صالح' }, { status: 400, headers: NO_STORE })
      updates.push('provider_id = ?'); values.push(pid)
    }

    if (JSON.stringify(body).includes('example.com'))
      return NextResponse.json({ ok: false, error: 'example.com محظور' }, { status: 400, headers: NO_STORE })

    if (updates.length === 0)
      return NextResponse.json({ ok: false, error: 'لا حقول للتحديث' }, { status: 400, headers: NO_STORE })

    try {
      updates.push("updated_at = datetime('now')")
      await executeAll(`UPDATE ad_zones SET ${updates.join(', ')} WHERE id = ?`, [...values, id])
    } catch (err) {
      if ((err as Error).message.includes('no such table'))
        return NextResponse.json({ ok: false, error: 'جداول الوساطة غير منشأة بعد' }, { status: 409, headers: NO_STORE })
      throw err
    }
    return NextResponse.json({ ok: true, message: 'تم تحديث المنطقة' }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل تحديث المنطقة' }, { status: 500, headers: NO_STORE })
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '')
    if (!Number.isInteger(id) || id <= 0)
      return NextResponse.json({ ok: false, error: 'id غير صالح (?id=N)' }, { status: 400, headers: NO_STORE })
    try {
      await executeAll('DELETE FROM ad_zones WHERE id = ?', [id])
    } catch (err) {
      if ((err as Error).message.includes('no such table'))
        return NextResponse.json({ ok: false, error: 'جداول الوساطة غير منشأة بعد' }, { status: 409, headers: NO_STORE })
      throw err
    }
    return NextResponse.json({ ok: true, message: 'حُذفت المنطقة' }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: false, error: 'فشل حذف المنطقة' }, { status: 500, headers: NO_STORE })
  }
}
