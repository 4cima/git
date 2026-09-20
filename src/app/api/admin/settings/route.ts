/**
 * /api/admin/settings — قراءة/كتابة إعدادات الموقع (جدول settings).
 * كل الـmethods خلف requireAdmin. بعد الكتابة: إبطال كاش الـisolate فورًا، وعند
 * تغيّر وضع الصيانة: مسح كاش الحافة (purge_everything) — لأن كاش الحافة (شهر)
 * بيخدم الصفحات المشهورة قبل ما الـmiddleware يتنفذ أصلًا، ومن غير المسح
 * تفعيل الصيانة مايوصلش للزوار على الصفحات المكتاشة.
 */
import { NextRequest, NextResponse } from 'next/server'
import { executeFirst, executeAll } from '@/lib/db'
import { requireAdmin } from '@/lib/requireAdmin'
import { invalidateSettingsCache, getMaintenanceUntil, setMaintenanceUntil } from '@/lib/settings'
import { purgeCloudflareCache } from '@/lib/cloudflare-cache'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const row = await executeFirst<Record<string, unknown>>('SELECT * FROM settings WHERE id = 1')
    const maintenanceUntil = await getMaintenanceUntil()
    return NextResponse.json(
      {
        ok: true,
        settings: row
          ? {
              site_name: String(row.site_name || '4CIMA'),
              site_description: String(row.site_description ?? ''),
              maintenance_mode: Boolean(row.maintenance_mode),
              registration_open: row.registration_open == null ? true : Boolean(row.registration_open),
            }
          : { site_name: '4CIMA', site_description: '', maintenance_mode: false, registration_open: true },
        maintenance_until: maintenanceUntil || null,
      },
      { headers: NO_STORE },
    )
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500, headers: NO_STORE })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { site_name, site_description, maintenance_mode, registration_open, maintenance_duration_minutes } =
      (await request.json()) as {
        site_name?: string
        site_description?: string
        maintenance_mode?: boolean
        registration_open?: boolean
        maintenance_duration_minutes?: number
      }
    const existing = await executeFirst<{ maintenance_mode: number | null }>(
      'SELECT maintenance_mode FROM settings WHERE id = 1',
    )
    const maintenanceChanged = Boolean(existing?.maintenance_mode) !== Boolean(maintenance_mode)

    if (existing) {
      await executeAll(
        `UPDATE settings SET site_name=?, site_description=?, maintenance_mode=?, registration_open=?, updated_at=CURRENT_TIMESTAMP WHERE id=1`,
        [site_name || '4CIMA', site_description || '', maintenance_mode ? 1 : 0, registration_open === false ? 0 : 1],
      )
    } else {
      await executeAll(
        `INSERT INTO settings (id, site_name, site_description, maintenance_mode, registration_open) VALUES (1, ?, ?, ?, ?)`,
        [site_name || '4CIMA', site_description || '', maintenance_mode ? 1 : 0, registration_open === false ? 0 : 1],
      )
    }
    invalidateSettingsCache()

    // عداد الصيانة: المدة بالدقايق. لو الطلب جاي بدون مدة (حفظ الهوية العادي) والوضع
    // ON — العداد الحالي مايلمسش. الوضع OFF يمسح العداد دايمًا.
    const minutes = Number(maintenance_duration_minutes) || 0
    if (maintenance_mode) {
      if (maintenance_duration_minutes !== undefined) {
        await setMaintenanceUntil(minutes > 0 ? Date.now() + minutes * 60_000 : 0)
      }
    } else {
      await setMaintenanceUntil(0)
    }

    // تغيّر الصيانة ⇒ مسح كاش الحافة: النسخ المخزنة (شهر) بتخدم قبل الـmiddleware
    // فبتتحاوز عليها الصيانة — المسح يجعل كل طلب MISS يمر على فحص الصيانة،
    // و503 نفسها مش بتتخزن (الكاش بيقبل 200/404 فقط).
    let purged = false
    if (maintenanceChanged) {
      const purge = await purgeCloudflareCache().catch(() => ({ ok: false }))
      purged = purge.ok
    }

    return NextResponse.json({
      ok: true,
      message: maintenanceChanged
        ? purged
          ? maintenance_mode
            ? 'تم الحفظ + مسح كاش الحافة — الصيانة سارية فورًا على كل الصفحات'
            : 'تم الحفظ + مسح كاش الحافة — الموقع مفتوح الآن لكل الزوار'
          : 'تم الحفظ، لكن مسح الكاش فشل — الصفحات المكتاشة هتفضل ظاهرة لحد المسح اليدوي'
        : 'تم الحفظ',
      cache_purged: purged,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500, headers: NO_STORE })
  }
}
