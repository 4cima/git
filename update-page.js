'use client'

import { useState, useEffect } from 'react'
import { Tv, Film, TrendingUp, Star, Calendar } from 'lucide-react'
import { QuantumHero } from '@/components/features/hero/QuantumHero'
import { MarqueeBanner } from '@/components/features/hero/MarqueeBanner'
import { QuantumTrain } from '@/components/features/media/QuantumTrain'
import { Loading } from '@/components/common/Loading'

const SECTIONS = [
  { key: 'trendingNow', title: 'الرائج الآن', icon: TrendingUp, link: '/movies', color: 'cyan' },
  { key: 'latestContent', title: 'الأحدث', icon: Calendar, link: '/movies', color: 'green' },
  { key: 'topRatedMovies', title: 'الأعلى تقييماً - أفلام', icon: Star, link: '/movies', color: 'gold' },
  { key: 'topRatedSeries', title: 'الأعلى تقييماً - مسلسلات', icon: Star, link: '/series', color: 'purple' },
  { key: 'popularMovies', title: 'أفلام شائعة', icon: Film, link: '/movies', color: 'red' },
  { key: 'popularSeries', title: 'مسلسلات شائعة', icon: Tv, link: '/series', color: 'orange' },
]

export default function Home() {
  const [sections, setSections] = useState({})
  const [heroItems, setHeroItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/home')
      .then(r => r.json())
      .then(data => {
        const map = (items, type) => (items || []).map(i => ({
          id: i.id, slug: i.slug,
          title_ar: i.title_ar || i.name_ar || '',
          title_en: i.title_en || i.name_en || '',
          media_type: type,
          poster_path: i.poster_path || '',
          vote_average: Number(i.vote_average) || 0,
          overview_ar: i.overview_ar,
          year: i.year,
          primary_genre: (() => { try { return JSON.parse(i.genres_json || '[]')[0]?.name_ar || null } catch { return null } })()
        }))

        const tm = map(data.trendingMovies, 'movie')
        const ts = map(data.trendingSeries, 'tv')
        const latest = map(data.latest, 'movie')
        const topRated = map(data.topRated, 'movie')
        const series = map(data.series, 'tv')

        const hero = []
        for (let i = 0; i < 5; i++) {
          if (tm[i]) hero.push(tm[i])
          if (ts[i]) hero.push(ts[i])
        }

        setHeroItems(hero)
        setSections({
          trendingNow: [...tm.slice(0,20), ...ts.slice(0,20)],
          latestContent: latest.slice(0,20),
          topRatedMovies: topRated.slice(0,15),
          topRatedSeries: [...series].sort((a,b) => b.vote_average - a.vote_average).slice(0,15),
          popularMovies: tm.slice(5,25),
          popularSeries: ts.slice(5,25),
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading fullScreen text="جاري التحميل..." />

  return (
    <div className="min-h-screen text-white bg-gray-950">
      <div className="page-container">
        <MarqueeBanner />
        <QuantumHero items={heroItems} />
        <div className="space-y-12 pb-8 mt-16">
          {SECTIONS.map(({ key, title, icon: Icon, link, color }) => (
            <section key={key}>
              <QuantumTrain
                items={sections[key] || []}
                title={title}
                icon={<Icon />}
                link={link}
                color={color}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}