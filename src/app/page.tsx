'use client'

import { useState, useEffect } from 'react'
import { Zap, Tv, Film, TrendingUp, Star, Calendar, Globe, Heart } from 'lucide-react'
import { QuantumHero } from '@/components/features/hero/QuantumHero'
import { QuantumTrain } from '@/components/features/media/QuantumTrain'
import { Loading } from '@/components/common/Loading'

export default function Home() {
  const [heroItems, setHeroItems] = useState<any[]>([])
  const [trendingItems, setTrendingItems] = useState<any[]>([])
  const [topRatedItems, setTopRatedItems] = useState<any[]>([])
  const [popularItems, setPopularItems] = useState<any[]>([])
  const [arabicSeries, setArabicSeries] = useState<any[]>([])
  const [newReleases, setNewReleases] = useState<any[]>([])
  const [actionMovies, setActionMovies] = useState<any[]>([])
  const [comedyMovies, setComedyMovies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        console.log('🔄 Fetching home data from /api/home...')
        const response = await fetch('/api/home')
        
        console.log('📡 Response status:', response.status)
        
        if (!response.ok) {
          console.error('❌ API response not OK:', response.status, response.statusText)
          setLoading(false)
          return
        }
        
        const data = await response.json()
        console.log('✅ Home data received:', data)
        
        const mapItems = (items: any[]) => {
            return (items || [])
              .map((item: any) => ({
                id: item.id,
                slug: item.slug,
                title: item.title || item.name,
                title_ar: item.title_ar || item.name_ar,
                title_en: item.title_en || item.name_en,
                name: item.name || item.title,
                media_type: item.content_type || item.media_type || 'movie',
                poster_path: item.poster_url || item.poster_path,
                backdrop_path: item.backdrop_url || item.backdrop_path,
                vote_average: Number(item.vote_average) || 0,
                overview: item.overview,
                overview_ar: item.overview_ar,
                release_date: item.release_date || item.first_air_date,
                first_air_date: item.first_air_date || item.release_date,
                primary_genre: item.primary_genre,
                original_language: item.original_language || 'en',
                production_countries: item.production_countries,
                videos: item.videos
              }))
          }

          // Mix movies and series for hero (alternating pattern)
          const allLatest = mapItems(data.latest || [])
          const allLatestSeries = mapItems(data.latestSeries || [])
          
          // Alternate: فيلم-مسلسل-فيلم-مسلسل (5 movies + 5 series = 10 total)
          const heroMix: any[] = []
          const movies = allLatest.slice(0, 5)
          const series = allLatestSeries.slice(0, 5)
          
          for (let i = 0; i < 5; i++) {
            if (movies[i]) heroMix.push(movies[i])
            if (series[i]) heroMix.push(series[i])
          }
          
          setHeroItems(heroMix.slice(0, 10))
          
          // Distribute items to avoid duplication
          const allLatestMapped = mapItems(data.latest || [])
          const allSeriesMapped = mapItems(data.latestSeries || [])
          const allTopRatedMapped = mapItems(data.topRated || [])
          const allPopularMapped = mapItems(data.popular || [])
          
          // Trending: Latest movies and series mixed
          setTrendingItems([...allLatestMapped, ...allSeriesMapped])
          
          // New Releases: Only latest movies
          setNewReleases(allLatestMapped.filter((item: any) => item.media_type === 'movie'))
          
          // Arabic Series: Only series
          setArabicSeries(allSeriesMapped)
          
          // Top Rated: High rated content
          setTopRatedItems(allTopRatedMapped)
          
          // Popular: Most popular content
          setPopularItems(allPopularMapped)
          
          // Action: From popular (different slice)
          setActionMovies(allPopularMapped.filter((item: any) => item.media_type === 'movie'))
          
          // Comedy: From top rated (different slice)
          setComedyMovies(allTopRatedMapped.filter((item: any) => item.media_type === 'movie'))
        
        console.log('✅ All data set successfully')
      } catch (error) {
        console.error('❌ Error fetching home data:', error)
        if (error instanceof Error) {
          console.error('Error message:', error.message)
          console.error('Error stack:', error.stack)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [])

  if (loading) {
    return <Loading fullScreen text="جاري التحميل..." />
  }

  return (
    <div className="min-h-screen text-white overflow-x-hidden selection:bg-cyan-500 selection:text-black relative">
      {/* Animated Electric Background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent animate-pulse"></div>
          <div className="absolute top-0 left-2/4 w-px h-full bg-gradient-to-b from-transparent via-blue-500/50 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>
      </div>
      <div className="page-container">
        
        {/* Hero Section */}
        <section className="relative z-10 w-full">
          <QuantumHero items={heroItems} />
        </section>

        {/* Content Sections */}
        <div className="relative z-20 space-y-2 pb-4 mt-16">
          
          {/* Trending - Mix of everything */}
          <section>
            <QuantumTrain
              items={trendingItems}
              title="الأعلى مشاهدة"
              icon={<Zap />}
              link="/movies"
              color="cyan"
            />
          </section>

          {/* Arabic Series */}
          <section>
            <QuantumTrain
              items={arabicSeries}
              title="مسلسلات عربية ورمضانية"
              icon={<Tv />}
              link="/series"
              color="orange"
            />
          </section>

          {/* Top Rated */}
          <section>
            <QuantumTrain
              items={topRatedItems}
              title="الأعلى تقييماً"
              icon={<Star />}
              link="/movies/top_rated"
              color="gold"
            />
          </section>

          {/* New Releases */}
          <section>
            <QuantumTrain
              items={newReleases}
              title="أحدث الأفلام"
              icon={<Calendar />}
              link="/movies"
              color="green"
            />
          </section>

          {/* Popular */}
          <section>
            <QuantumTrain
              items={popularItems}
              title="الأكثر شهرة"
              icon={<TrendingUp />}
              link="/movies/popular"
              color="purple"
            />
          </section>

          {/* Action Movies */}
          <section>
            <QuantumTrain
              items={actionMovies}
              title="أفلام الأكشن والإثارة"
              icon={<Zap />}
              link="/movies"
              color="red"
            />
          </section>

          {/* Comedy Movies */}
          <section>
            <QuantumTrain
              items={comedyMovies}
              title="أفلام درامية ومميزة"
              icon={<Heart />}
              link="/movies"
              color="pink"
            />
          </section>

        </div>
      </div>
    </div>
  )
}
