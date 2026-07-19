'use client'

import { useState, useEffect } from 'react'
import { MegaHero } from '@/components/features/hero/MegaHero'
import { FeaturedSpotlight } from '@/components/features/sections/FeaturedSpotlight'
import { DynamicSection } from '@/components/features/sections/DynamicSection'
import { Loading } from '@/components/common/Loading'

interface RawItem {
  id: number
  slug: string
  title_ar: string
  title_en: string
  poster_path: string
  backdrop_path: string
  vote_average: number | string
  overview_ar: string
  year: number
  media_type?: 'movie' | 'tv'
  genres_json?: string
}

interface MediaItem {
  id: number
  slug: string
  title: string
  title_ar: string
  title_en: string
  poster_path: string
  backdrop_path: string
  vote_average: number
  overview_ar: string
  year: number
  media_type: 'movie' | 'tv'
  primary_genre: string | null
}

interface HomeData {
  heroItems: MediaItem[]
  spotlightItems: MediaItem[]
  trendingMovies: MediaItem[]
  latest: MediaItem[]
  topRated: MediaItem[]
  series: MediaItem[]
}

function mapItems(items: RawItem[] | undefined, type: 'movie' | 'tv'): MediaItem[] {
  return (items || []).map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title_ar || item.title_en,
    title_ar: item.title_ar,
    title_en: item.title_en,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    vote_average: Number(item.vote_average) || 0,
    overview_ar: item.overview_ar,
    year: item.year,
    media_type: item.media_type || type,
    primary_genre: (() => {
      try {
        const genres = JSON.parse(item.genres_json || '[]')
        return genres?.[0]?.name_ar || null
      } catch {
        return null
      }
    })(),
  }))
}

function SectionDivider() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
    </div>
  )
}

export default function Home() {
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/home')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()

        const trendingMovies = mapItems(json.trendingMovies, 'movie')
        const trendingSeries = mapItems(json.trendingSeries, 'tv')
        const latest = mapItems(json.latest, 'movie')
        const topRated = mapItems(json.topRated, 'movie')
        const series = mapItems(json.series, 'tv')

        // 10 عناصر في الهيرو: 5 أفلام + 5 مسلسلات بالتناوب
        const heroItems: MediaItem[] = []
        for (let i = 0; i < 5; i++) {
          if (trendingMovies[i]) heroItems.push(trendingMovies[i])
          if (trendingSeries[i]) heroItems.push(trendingSeries[i])
        }

        // محتوى مميز: عناصر بعد نطاق الهيرو عشان مفيش تكرار
        const spotlightItems = [
          trendingMovies[25],
          trendingMovies[26],
          trendingSeries[25],
          trendingMovies[27],
          trendingSeries[26],
        ].filter(Boolean)

        setData({
          heroItems: heroItems.slice(0, 10),
          spotlightItems,
          trendingMovies,
          latest,
          topRated,
          series,
        })
      } catch (error) {
        console.error('Error fetching home data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <Loading fullScreen text="جاري التحميل..." />
  if (!data)
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        حدث خطأ في تحميل البيانات
      </div>
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-950">
      <MegaHero items={data.heroItems} />

      <SectionDivider />

      <div className="space-y-0">
        <section className="py-12 border-t border-white/5">
          <FeaturedSpotlight items={data.spotlightItems} />
        </section>

        <section className="py-12 border-t border-white/5 bg-black/20">
          <DynamicSection
            items={data.trendingMovies}
            title="🔥 أفلام رائجة"
            subtitle="الأكثر شعبية هذا الأسبوع"
            color="cyan"
            link="/movies"
          />
        </section>

        <section className="py-12 border-t border-white/5">
          <DynamicSection
            items={data.latest}
            title="🎬 أحدث الإضافات"
            subtitle="آخر ما تم إضافته"
            color="green"
            link="/movies"
          />
        </section>

        <section className="py-12 border-t border-white/5 bg-black/20">
          <DynamicSection
            items={data.topRated}
            title="⭐ الأعلى تقييماً"
            subtitle="أفضل الأفلام على الإطلاق"
            color="gold"
            link="/movies"
          />
        </section>

        <section className="py-12 border-t border-white/5 pb-16">
          <DynamicSection
            items={data.series}
            title="📺 مسلسلات مميزة"
            subtitle="أفضل المسلسلات"
            color="purple"
            link="/series"
          />
        </section>
      </div>
    </div>
  )
}

