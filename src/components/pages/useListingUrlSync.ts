'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { buildListingQueryString, isSameListingFilters, type ListingUrlFilterState } from './listingFilters'

/**
 * (E-12) مزامنة فلاتر صفحات القوائم مع الرابط — نفس السلوك للست صفحات.
 *
 * القواعد:
 * 1) أي تغيير فلتر (تصنيف/سنة/تقييم/دولة/لغة/ترتيب) ⇒ router.push
 *    ⇒ كل تغيير مُدخل تاريخ في المتصفح ⇒ زر «رجوع» يرجّع الفلتر السابق.
 * 2) تغيير نص البحث وحده ⇒ router.replace
 *    (النص يصل بعد debounce 400ms من الصفحة — replace يمنع إغراق تاريخ المتصفح بحرف لكل ضغطة).
 * 3) أول رندر لا يكتب شيئاً: الحالة الابتدائية مقروءة أصلاً من الرابط
 *    ⇒ لا مُدخل تاريخ زائف ولا دورة كتابة/قراءة عند فتح الصفحة.
 * 4) مقارنة دلالية (isSameListingFilters) قبل أي كتابة:
 *    - تطابق فعلي ⇒ لا كتابة (يمنع إعادة تطبيع ?genre=action إلى
 *      ?genre=action&sort=popularity&order=desc كمُدخل تاريخ جديد).
 *    - هذا ما يمنع الحلقة: بعد الكتابة يصبح الرابط مطابقاً للحالة فيتوقف الأثر.
 * 5) scroll:false — تحديث الفلاتر لا يقفز بالصفحة لأعلى (السكرول مسؤولية المستخدم).
 */
export function useListingUrlSync(state: ListingUrlFilterState) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const nextQuery    = buildListingQueryString(state)
  const currentQuery = searchParams.toString()

  const didMountRef  = useRef(false)
  /* آخر سلسلة استعلام «معتمدة» — نقطة المقارنة لتحديد push مقابل replace */
  const lastQueryRef = useRef(currentQuery)

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      lastQueryRef.current = currentQuery
      return
    }

    // الرابط مطابق للحالة فعلياً (تطبيع/رجوع من المتصفح) ⇒ لا كتابة
    if (isSameListingFilters(nextQuery, currentQuery)) {
      lastQueryRef.current = currentQuery
      return
    }

    const target = nextQuery ? `${pathname}?${nextQuery}` : pathname

    // تغيّر البحث وحده (تجاهل مفتاح search في المقارنة) ⇒ replace، غير ذلك push
    const onlySearchChanged = isSameListingFilters(lastQueryRef.current, nextQuery, { ignoreSearch: true })
    if (onlySearchChanged) router.replace(target, { scroll: false })
    else router.push(target, { scroll: false })

    lastQueryRef.current = nextQuery
  }, [nextQuery, currentQuery, pathname, router])
}