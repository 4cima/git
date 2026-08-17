import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { turso } from '@/lib/turso'
import { SeriesGenrePageClient } from '@/components/pages/SeriesGenrePageClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  
  try {
    const response = await turso.execute({
      sql: 'SELECT * FROM genres WHERE slug = ? LIMIT 1',
      args: [slug]
    })
    
    if (!response.rows || response.rows.length === 0) {
      return {
        title: 'تصنيف غير موجود'
      }
    }
    
    const genre = response.rows[0]
    const genreName = genre.name_ar || genre.name_en || 'تصنيف'
    
    return {
      title: `مسلسلات ${genreName}`,
      description: `استكشف أفضل مسلسلات ${genreName} - جودة عالية ومترجم`
    }
  } catch (error) {
    return {
      title: 'تصنيف'
    }
  }
}

export const revalidate = 3600

export default async function SeriesGenrePage({ params }: PageProps) {
  const { slug } = await params
  
  try {
    // Fetch genre info
    const genreResult = await turso.execute({
      sql: 'SELECT * FROM genres WHERE slug = ? LIMIT 1',
      args: [slug]
    })
    
    if (!genreResult.rows || genreResult.rows.length === 0) {
      notFound()
    }
    
    const genre = genreResult.rows[0]
    
    // Server-render initial batch of series (first 20 by popularity)
    const initialSeriesResult = await turso.execute({
      sql: `
        SELECT id, slug, name_ar, name_en, poster_path, backdrop_path, vote_average, first_air_year, overview_ar, genres_json
        FROM tv_series
        WHERE genres_json LIKE ?
        ORDER BY popularity DESC
        LIMIT 21
      `,
      args: [`%"name_ar":"${genre.name_ar}"%`]
    })
    
    const initialSeries = initialSeriesResult.rows || []
    const hasMore = initialSeries.length > 20
    if (hasMore) initialSeries.pop() // Remove the 21st item
    
    return (
      <>
        {/* Hidden data for crawlers - actual HTML content */}
        <div className="hidden" aria-hidden="true" data-ssr-content="series">
          {initialSeries.map((show: any) => (
            <div key={show.id} data-series-title={show.name_ar || show.name_en} />
          ))}
        </div>
        
        <SeriesGenrePageClient genre={genre} slug={slug} initialSeries={initialSeries} initialHasMore={hasMore} />
      </>
    )
  } catch (error) {
    notFound()
  }
}

// Server-rendered initial content for SEO (visible in HTML before JS loads)
function ServerRenderedSeries({ series }: { series: any[] }) {
  return (
    <noscript>
      <div className="grid-responsive gap-4">
        {series.slice(0, 20).map((show: any) => (
          <a
            key={show.id}
            href={`/series/${show.slug}`}
            className="block rounded-2xl overflow-hidden bg-zinc-900/20 border border-zinc-800/60 hover:border-zinc-700"
          >
            <div className="aspect-[2/3] w-full bg-zinc-800 relative">
              {show.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                  alt={show.name_ar || show.name_en || ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div className="p-2.5">
              <h3 className="text-sm font-bold text-white truncate">
                {show.name_ar || show.name_en}
              </h3>
              {show.vote_average > 0 && (
                <p className="text-xs text-zinc-400 mt-1">
                  ⭐ {show.vote_average.toFixed(1)}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
    </noscript>
  )
}
