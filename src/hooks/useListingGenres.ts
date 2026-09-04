'use client'

import { useEffect, useState } from 'react'

export interface ListingGenre {
  name: string
  slug: string
  emoji: string
}

/* رموز التصنيفات المعروفة — للتصنيفات الأخرى يُستخدم رمز افتراضي */
const GENRE_EMOJI: Record<string, string> = {
  drama: '🎭', comedy: '😂', action: '🔥', 'action-adventure': '💥',
  thriller: '⚡', romance: '💕', 'science-fiction': '🚀', 'sci-fi-fantasy': '🚀',
  horror: '👻', crime: '🕵️', adventure: '🗡️', animation: '🎨',
  family: '🎪', fantasy: '🧙', war: '⚔️', mystery: '🔍',
  reality: '📹', kids: '👶', soap: '🎭', western: '🤠',
  history: '🏛️', music: '🎵', 'tv-movie': '📺', news: '📰', documentary: '🎥',
}

/**
 * قائمة تصنيفات ديناميكية من قاعدة البيانات (مرتبة بالأكثر محتوى) —
 * تضمن أن كل تصنيف في القائمة له أعمال فعلية، مع قائمة احتياطية ثابتة
 * لضمان عمل القائمة فورًا قبل وصول الاستجابة.
 *
 * تعيد نفس مرجع الـfallback حتى يتم التحميل — يمكن للمنادي مقارنة
 * المرجعين ليعرف هل وصلت القائمة الديناميكية بعد.
 */
export function useListingGenres<T extends readonly ListingGenre[]>(
  type: 'movie' | 'tv',
  fallback: T
): T | ListingGenre[] {
  const [genres, setGenres] = useState<ListingGenre[]>(fallback as unknown as ListingGenre[])

  useEffect(() => {
    let cancelled = false

    fetch(`/api/genres?type=${type}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data?.genres?.length) return
        const list: ListingGenre[] = data.genres.map((g: any) => ({
          name: String(g.name_ar || g.name_en || g.slug),
          slug: String(g.slug),
          emoji: GENRE_EMOJI[String(g.slug)] || '🎬',
        }))
        setGenres(list)
      })
      .catch(() => {
        /* فشل صامت — نبقي القائمة الاحتياطية */
      })

    return () => { cancelled = true }
  }, [type])

  return genres as T | ListingGenre[]
}

/**
 * هل القائمة الحالية ما زالت الاحتياطية؟ مقارنة بالمحتوى (slugs) لا بالمرجع —
 * أضمن من مقارنة المراجع لأن React قد يعيد إنشاء المصفوفة أو يصل القائمة
 * الديناميكية بمحتوى مطابق للاحتياطية.
 */
export function isFallbackGenreList(
  list: readonly ListingGenre[],
  fallback: readonly ListingGenre[]
): boolean {
  if (list.length !== fallback.length) return false
  return list.every((g, i) => g.slug === fallback[i]?.slug)
}
