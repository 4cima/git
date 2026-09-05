import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeFirst, executeAll } from '@/lib/db'
import { GenreOverviewPageClient } from '@/components/pages/GenreOverviewPageClient'
import { getGenreWithSiblings, buildGenreWhereClause, buildGenreParams } from '@/lib/genre-siblings'
import { filterExcludedGenres } from '@/utils/excludedGenres'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const genre = await executeFirst('SELECT name_ar, name_en FROM genres WHERE slug = ? LIMIT 1', [slug])
    if (!genre) return { title: 'تصنيف غير موجود' }
    const genreName = String(genre.name_ar || genre.name_en || 'تصنيف')
    // بدون «| فور سيما» — template في layout يضيفها تلقائياً
    const title = `أفلام ومسلسلات ${genreName} — تصفح كامل التصنيف`
    const description = `استكشف أفضل أفلام ومسلسلات ${genreName} المترجمة بجودة عالية — مقسّمة لقسمين: أفلام ${genreName} ومسلسلات ${genreName} مع ترتيب حسب الشهرة والتقييم والحدث.`
    const url = `https://4cima.com/genres/${slug}`
    return {
      title,
      description,
      keywords: [
        `أفلام ${genreName}`, `مسلسلات ${genreName}`, `أفلام ${genreName} مترجمة`,
        `مسلسلات ${genreName} مترجمة`, `تصنيف ${genreName}`, 'أفلام ومسلسلات', '4cima',
      ],
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: '4cima',
        type: 'website',
        locale: 'ar_EG',
        images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
      },
    }
  } catch { return { title: 'تصنيف' } }
}

export const revalidate = 3600

export default async function GenreOverviewPage({ params }: PageProps) {
  const { slug } = await params
  try {
    const genre = await executeFirst('SELECT * FROM genres WHERE slug = ? LIMIT 1', [slug])
    if (!genre) notFound()

    const genreIds = getGenreWithSiblings(Number(genre.tmdb_id))
    const whereClause = buildGenreWhereClause(genreIds)
    const genreParams = buildGenreParams(genreIds)

    const [topMovies, topSeries] = await Promise.all([
      executeAll(
        `SELECT id, tmdb_id, slug, title_ar, title_en, poster_path, vote_average, release_year, overview_ar, genres_json
         FROM movies
         WHERE ${whereClause}
           AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
           AND poster_path IS NOT NULL
         ORDER BY popularity DESC LIMIT 12`,
        genreParams
      ),
      executeAll(
        `SELECT id, tmdb_id, slug, name_ar as title_ar, name_en as title_en, poster_path, vote_average, first_air_year as release_year, overview_ar, genres_json
         FROM tv_series
         WHERE ${whereClause}
           AND (filter_status IN ('clean', 'reviewed_approved') OR filter_status IS NULL)
           AND poster_path IS NOT NULL
         ORDER BY popularity DESC LIMIT 12`,
        genreParams
      )
    ])

    // فلتر: Talk Show + War & Politics + Documentary + History
    const filteredMovies = filterExcludedGenres(topMovies)
    const filteredSeries = filterExcludedGenres(topSeries)

    const genreName = String(genre.name_ar || genre.name_en || 'تصنيف')

    /* JSON-LD — Breadcrumb + CollectionPage بكل الأعمال الظاهرة (SEO) */
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://4cima.com/' },
            { '@type': 'ListItem', position: 2, name: 'التصنيفات', item: 'https://4cima.com/genres' },
            { '@type': 'ListItem', position: 3, name: genreName, item: `https://4cima.com/genres/${slug}` },
          ],
        },
        {
          '@type': 'CollectionPage',
          name: `أفلام ومسلسلات ${genreName}`,
          url: `https://4cima.com/genres/${slug}`,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: filteredMovies.length + filteredSeries.length,
            itemListElement: [
              ...filteredMovies.slice(0, 10).map((m: any, i: number) => ({
                '@type': 'ListItem', position: i + 1,
                url: `https://4cima.com/movies/${m.slug}`,
                name: m.title_ar || m.title_en,
              })),
              ...filteredSeries.slice(0, 10).map((s: any, i: number) => ({
                '@type': 'ListItem', position: filteredMovies.slice(0, 10).length + i + 1,
                url: `https://4cima.com/series/${s.slug}`,
                name: s.title_ar || s.title_en,
              })),
            ],
          },
        },
      ],
    }

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <GenreOverviewPageClient genre={genre} slug={slug} topMovies={filteredMovies} topSeries={filteredSeries} />
      </>
    )
  } catch { notFound() }
}
