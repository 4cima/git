import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; season: string }>
}): Promise<Metadata> {
  const { slug, season } = await params
  try {
    const series = await api.getSeriesDetail(slug)
    
    return {
      title: `${series.name || series.title} - الموسم ${season} | 4CIMA`,
      description: series.overview || series.overview_ar,
    }
  } catch {
    return {
      title: 'مسلسل غير موجود | 4CIMA',
    }
  }
}

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ slug: string; season: string }>
}) {
  const { slug, season } = await params
  let series, episodesData
  
  try {
    series = await api.getSeriesDetail(slug)
    episodesData = await api.getEpisodes(slug, Number(season))
  } catch {
    notFound()
  }
  
  const { episodes } = episodesData
  
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
