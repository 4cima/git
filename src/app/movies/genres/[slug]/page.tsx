import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { turso } from '@/lib/turso'
import { MovieGenrePageClient } from '@/components/pages/MovieGenrePageClient'

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
      title: `أفلام ${genreName}`,
      description: `استكشف أفضل أفلام ${genreName} - جودة عالية ومترجم`
    }
  } catch (error) {
    return {
      title: 'تصنيف'
    }
  }
}

export const revalidate = 3600

export default async function MovieGenrePage({ params }: PageProps) {
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
    
    // Serialize to plain object for Client Component
    const plainGenre = {
      id: genre.id,
      tmdb_id: genre.tmdb_id,
      name_en: genre.name_en,
      name_ar: genre.name_ar,
      slug: genre.slug
    }
    
    // Server-render initial batch of movies (first 20 by popularity)
    const initialMoviesResult = await turso.execute({
      sql: `
        SELECT id, slug, title_ar, title_en, poster_path, backdrop_path, vote_average, release_year, overview_ar, genres_json
        FROM movies
        WHERE genres_json LIKE ?
        ORDER BY popularity DESC
        LIMIT 21
      `,
      args: [`%"name_ar":"${genre.name_ar}"%`]
    })
    
    const initialMovies = (initialMoviesResult.rows || []).map(row => ({
      id: row.id,
      slug: row.slug,
      title_ar: row.title_ar,
      title_en: row.title_en,
      poster_path: row.poster_path,
      backdrop_path: row.backdrop_path,
      vote_average: row.vote_average,
      release_year: row.release_year,
      overview_ar: row.overview_ar,
      genres_json: row.genres_json
    }))
    
    const hasMore = initialMovies.length > 20
    if (hasMore) initialMovies.pop() // Remove the 21st item
    
    return (
      <>
        {/* Hidden data for crawlers - actual HTML content */}
        <div className="hidden" aria-hidden="true" data-ssr-content="movies">
          {initialMovies.map((movie: any) => (
            <div key={movie.id} data-movie-title={movie.title_ar || movie.title_en} />
          ))}
        </div>
        
        <MovieGenrePageClient genre={plainGenre} slug={slug} initialMovies={initialMovies} initialHasMore={hasMore} />
      </>
    )
  } catch (error) {
    notFound()
  }
}

// Server-rendered initial content for SEO (visible in HTML before JS loads)
function ServerRenderedMovies({ movies }: { movies: any[] }) {
  return (
    <noscript>
      <div className="grid-responsive gap-4">
        {movies.slice(0, 20).map((movie: any) => (
          <a
            key={movie.id}
            href={`/movies/${movie.slug}`}
            className="block rounded-2xl overflow-hidden bg-zinc-900/20 border border-zinc-800/60 hover:border-zinc-700"
          >
            <div className="aspect-[2/3] w-full bg-zinc-800 relative">
              {movie.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title_ar || movie.title_en || ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div className="p-2.5">
              <h3 className="text-sm font-bold text-white truncate">
                {movie.title_ar || movie.title_en}
              </h3>
              {movie.vote_average > 0 && (
                <p className="text-xs text-zinc-400 mt-1">
                  ⭐ {movie.vote_average.toFixed(1)}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
    </noscript>
  )
}
