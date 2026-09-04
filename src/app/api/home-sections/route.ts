import { NextResponse } from 'next/server'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { fetchHomeSections } from '@/lib/home-sections-query'

export const dynamic = 'force-dynamic'

/**
 * GET /api/home-sections — بيانات الأقسام الإضافية للصفحة الرئيسية
 * (الخيال العلمي + الأنمي + الجريمة + العربي) في استجابة واحدة.
 *
 * الاستعلامات نفسها تُستخدم في SSR للصفحة الرئيسية (src/app/page.tsx) عبر
 * src/lib/home-sections-query — هذا الراوت للتحيين كلاينت-سايد فقط.
 *
 * كاش مزدوج: كاش الذاكرة 30 دقيقة (الجداول تتغير مرة يومياً) + s-maxage للـCDN.
 */

const HOME_SECTIONS_TTL_MS = 30 * 60 * 1000

interface HomeSectionsData {
  sciFi: unknown[]
  anime: unknown[]
  crime: unknown[]
  arabicMovies: unknown[]
  arabicSeries: unknown[]
}

let sectionsCache: { at: number; data: HomeSectionsData } | null = null

/* eslint-disable @typescript-eslint/no-explicit-any */
const sanitize = (rows: any[]) => rows.map((r) => JSON.parse(JSON.stringify(r)))

async function getHomeSections(): Promise<HomeSectionsData> {
  if (sectionsCache && Date.now() - sectionsCache.at < HOME_SECTIONS_TTL_MS) {
    return sectionsCache.data
  }
  try {
    const result = await fetchHomeSections()

    // فلتر مركزي: يستبعد Talk Show + War & Politics + Documentary + History
    const data: HomeSectionsData = {
      sciFi: filterExcludedGenres(sanitize(result.sciFi)),
      anime: filterExcludedGenres(sanitize(result.anime)),
      crime: filterExcludedGenres(sanitize(result.crime)),
      arabicMovies: filterExcludedGenres(sanitize(result.arabicMovies)),
      arabicSeries: filterExcludedGenres(sanitize(result.arabicSeries)),
    }
    sectionsCache = { at: Date.now(), data }
    return data
  } catch (error) {
    console.error('Error fetching home sections:', error)
    return { sciFi: [], anime: [], crime: [], arabicMovies: [], arabicSeries: [] }
  }
}

export async function GET() {
  const data = await getHomeSections()
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  })
}
