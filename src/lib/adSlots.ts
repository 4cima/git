/**
 * src/lib/adSlots.ts — المصدر الوحيد لمفاتيح مساحات الإعلانات.
 * نفس القائمة اللي بيخدم عليها /api/ads/serve — أي تعديل هنا لازم ينعكس هناك.
 */
export const AD_SLOTS: { key: string; name: string }[] = [
  { key: 'home-after-hero', name: 'الرئيسية — بعد الهيرو' },
  { key: 'home-in-feed', name: 'الرئيسية — داخل القائمة' },
  { key: 'home-footer', name: 'الرئيسية — التذييل' },
  { key: 'details-below-player', name: 'التفاصيل — تحت المشغل' },
  { key: 'details-sidebar', name: 'التفاصيل — العمود الجانبي' },
  { key: 'global-header', name: 'عام — أعلى الصفحة' },
  { key: 'watch-preroll', name: 'المشاهدة — قبل التشغيل' },
  { key: 'watch-midroll', name: 'المشاهدة — وسط التشغيل' },
  { key: 'global-popunder', name: 'عام — بوبندر' },
]

export const VALID_SLOTS = AD_SLOTS.map((s) => s.key)

export const AD_TYPES = ['popunder', 'banner', 'native', 'push', 'preroll_vast', 'midroll_vast', 'interstitial'] as const

export const AD_INTEGRATIONS = ['script', 'html', 'click_url', 'vast_url'] as const

export const AD_DEVICES = ['all', 'mobile', 'desktop'] as const

export const HOUSE_TYPES = ['popunder', 'banner', 'preroll', 'midroll'] as const

export function slotName(key: string): string {
  return AD_SLOTS.find((s) => s.key === key)?.name ?? key
}
