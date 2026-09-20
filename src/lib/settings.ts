/**
 * src/lib/settings.ts — قراءة إعدادات الموقع (جدول settings).
 * نسختان:
 *  - getSiteSettings(): كاش 60 ثانية على مستوى الـisolate — للمستهلكين المتسامحين
 *    مع التقادم (بوابة التسجيل في auth-server).
 *  - getSiteSettingsFresh(): قراءة مباشرة من D1 بلا كاش — للـmiddleware (وضع الصيانة):
 *    بعد purge الكاش، isolate عليه قيمة قديمة (مطفية) ممكن يرجّع 200 ويُخزَّن شهر كامل
 *    — القراءة الحية تقفل الثغرة دي (استعلام صف واحد بمفتاح PK، تكلفته تافهة).
 * فشل القراءة = قيم افتراضية مفتوحة (لا يُقفل الموقع بسبب عطل قراءة إعدادات).
 */
import { executeFirst, executeAll } from '@/lib/db'

export type SiteSettings = {
  site_name: string
  site_description: string
  maintenance_mode: boolean
  registration_open: boolean
}

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: '4CIMA',
  site_description: 'موقع 4CIMA لمشاهدة أحدث الأفلام والمسلسلات المترجمة والمدبلجة بجودة عالية.',
  maintenance_mode: false,
  registration_open: true,
}

function parseSettingsRow(row: Record<string, unknown> | null): SiteSettings {
  if (!row) return DEFAULT_SETTINGS
  return {
    site_name: String(row.site_name || DEFAULT_SETTINGS.site_name),
    site_description: String(row.site_description ?? ''),
    maintenance_mode: Boolean(row.maintenance_mode),
    // NULL أو غياب العمود = مفتوح (الافتراض الآمن للتسجيل)
    registration_open: row.registration_open == null ? true : Boolean(row.registration_open),
  }
}

let cache: { at: number; value: SiteSettings } | null = null
const TTL_MS = 60_000

export async function getSiteSettings(): Promise<SiteSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  try {
    const row = await executeFirst<Record<string, unknown>>('SELECT * FROM settings WHERE id = 1')
    const value = parseSettingsRow(row)
    cache = { at: Date.now(), value }
    return value
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function getSiteSettingsFresh(): Promise<SiteSettings> {
  try {
    const row = await executeFirst<Record<string, unknown>>('SELECT * FROM settings WHERE id = 1')
    return parseSettingsRow(row)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function invalidateSettingsCache() {
  cache = null
}

/**
 * موعد نهاية الصيانة (epoch ms) — مخزن في site_config (نفس نمط ترتيب السيرفرات).
 * 0 = مفيش عداد (صيانة بلا مدة محددة).
 */
export const MAINTENANCE_UNTIL_KEY = 'maintenance_until'

export async function getMaintenanceUntil(): Promise<number> {
  try {
    const row = await executeFirst<{ value: string }>(
      'SELECT value FROM site_config WHERE key = ?',
      [MAINTENANCE_UNTIL_KEY],
    )
    const v = Number(row?.value)
    return Number.isFinite(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

export async function setMaintenanceUntil(untilMs: number): Promise<void> {
  if (untilMs > 0) {
    await executeAll(
      `INSERT OR REPLACE INTO site_config (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
      [MAINTENANCE_UNTIL_KEY, String(Math.floor(untilMs))],
    )
  } else {
    await executeAll('DELETE FROM site_config WHERE key = ?', [MAINTENANCE_UNTIL_KEY])
  }
}
