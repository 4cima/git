'use client'

import { notFound, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useEffect, useState } from 'react'

export default function SeasonPage() {
  const params = useParams()
  const slug = params.slug as string
  const season = params.season as string
  
  const [series, setSeries] = useState<any>(null)
  const [episodes, setEpisodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    Promise.all([
      api.getSeriesDetail(slug),
      api.getEpisodes(slug, Number(season))
    ])
      .then(([seriesData, episodesData]) => {
        setSeries(seriesData)
        setEpisodes(episodesData.episodes)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [slug, season])
  
  if (loading) {
    return <div className="page-container py-8">جاري التحميل...</div>
  }
  
  if (!series) {
    notFound()
  }
  
  return (
    <div className="page-container py-8">
      <div className="mb-8">
        <a
          href={`/series/${slug}`}
          className="text-primary hover:underline mb-4 inline-block"
        >
          ← العودة للمسلسل
        </a>
        <h1 className="text-3xl font-bold">
          {series.name || series.title} - الموسم {season}
        </h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {episodes.map((episode: any) => (
          <a
            key={episode.id}
            href={`/series/${slug}/season/${season}/episode/${episode.episode_number}`}
            className="group bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:bg-white/10 transition"
          >
            <div className="aspect-video bg-black relative">
              {episode.still_url && (
                <img
                  src={episode.still_url}
                  alt={episode.name}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="text-sm text-primary mb-1">
                الحلقة {episode.episode_number}
              </div>
              <h3 className="font-bold mb-2">{episode.name}</h3>
              {episode.overview && (
                <p className="text-sm text-white/70 line-clamp-2">
                  {episode.overview}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
