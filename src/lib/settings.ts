/**
 * src/lib/settings.ts — قارئ إعدادات الموقع (جدول settings) بكاش قصير على مستوى الـisolate.
 * يستخدمه middleware (الصيانة) وauth-server (بوابة التسجيل) — فشل القراءة = قيم افتراضية مفتوحة
 * (لا يُقفل الموقع بسبب عطل قراءة إعدادات).
 */
import { executeFirst } from '@/lib/db'

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

let cache: { at: number; value: SiteSettings } | null = null
const TTL_MS = 60_000

export async function getSiteSettings(): Promise<SiteSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  try {
    const row = await executeFirst<Record<string, unknown>>('SELECT * FROM settings WHERE id = 1')
    const value: SiteSettings = row
      ? {
          site_name: String(row.site_name || DEFAULT_SETTINGS.site_name),
          site_description: String(row.site_description ?? ''),
          maintenance_mode: Boolean(row.maintenance_mode),
          // NULL أو غياب العمود = مفتوح (الافتراض الآمن للتسجيل)
          registration_open: row.registration_open == null ? true : Boolean(row.registration_open),
        }
      : DEFAULT_SETTINGS
    cache = { at: Date.now(), value }
    return value
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function invalidateSettingsCache() {
  cache = null
}
