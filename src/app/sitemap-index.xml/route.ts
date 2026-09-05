import { NextResponse } from 'next/server'
import { executeFirst } from '@/lib/db'

export const revalidate = 86400

const CHUNK_SIZE = 15000
const BASE_URL = 'https://4cima.com'
const SERIES_ID_OFFSET = 1000
const FALLBACK_MOVIE_PARTS = 25
const FALLBACK_SERIES_PARTS = 8

async function countMovies(): Promise<number> {
  // NOTE: no swallow-catch here — if D1 is unreachable the outer catch falls back
  // to the full safe slice list (FALLBACK_*_PARTS) instead of a broken 1-loc index.
  const result = await executeFirst<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM movies 
     WHERE filter_status = 'clean' AND slug IS NOT NULL AND tmdb_id IS NOT NULL`,
    []
  )
  return result?.cnt ?? 0
}

async function countSeries(): Promise<number> {
  const result = await executeFirst<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM tv_series 
     WHERE filter_status = 'clean' AND slug IS NOT NULL AND tmdb_id IS NOT NULL`,
    []
  )
  return result?.cnt ?? 0
}

export async function GET() {
  try {
    const movieCount = await countMovies()
    const seriesCount = await countSeries()
    let movieParts = Math.ceil(movieCount / CHUNK_SIZE)
    const seriesParts = Math.ceil(seriesCount / CHUNK_SIZE)

    // If both zero, ensure at least one movie part pointing to empty sitemap
    if (movieParts === 0 && seriesParts === 0) {
      movieParts = 1
    }

    const locs: string[] = []

    // Movie parts: 0..movieParts-1
    for (let i = 0; i < movieParts; i++) {
      locs.push(`${BASE_URL}/sitemap/${i}.xml`)
    }

    // Series parts: 1000..1000+seriesParts-1
    for (let i = 0; i < seriesParts; i++) {
      locs.push(`${BASE_URL}/sitemap/${SERIES_ID_OFFSET + i}.xml`)
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.map(loc => `  <sitemap><loc>${loc}</loc></sitemap>`).join('\n')}
</sitemapindex>`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Sitemap index error:', error)
    // Fallback: return safe upper bound of parts
    const locs: string[] = []
    for (let i = 0; i < FALLBACK_MOVIE_PARTS; i++) {
      locs.push(`${BASE_URL}/sitemap/${i}.xml`)
    }
    for (let i = 0; i < FALLBACK_SERIES_PARTS; i++) {
      locs.push(`${BASE_URL}/sitemap/${SERIES_ID_OFFSET + i}.xml`)
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.map(loc => `  <sitemap><loc>${loc}</loc></sitemap>`).join('\n')}
</sitemapindex>`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
      },
    })
  }
}