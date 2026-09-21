import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { MoviesPageClient } from '@/components/pages/MoviesPageClient'
import { findNavLanguage } from '@/lib/language-nav'
import { safeJsonLd } from '@/lib/jsonld';

interface PageProps {
  params: Promise<{ code: string }>
}

export const dynamic = 'force-dynamic' // D1 not available at build time on CI

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params
  const lang = findNavLanguage(code)
  if (!lang) return { title: 'قسم غير موجود' }

  /* المرحلة 1.2 من خطة استعادة الفهرسة: العربية فقط مفهرسة (في static.xml) —
     باقي اللغات صفحات قوائم متداخلة مع /movies ⇒ noindex,follow
     (تحقق URL Inspection 21/9: غير معروفة لجوجل إطلاقًا). */
  const indexable = code.toLowerCase() === 'ar'

  const title = `أفلام ${lang.label}`
  const url = `https://4cima.com/movies/lang/${code}`
  return {
    title,
    description: `شاهد أفضل الأفلام ${lang.label} بجودة عالية ومترجمة`,
    robots: indexable ? undefined : { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'ar_EG',
      url,
      siteName: '4cima',
      title: `${title} | فور سيما`,
      description: `شاهد أفضل الأفلام ${lang.label} بجودة عالية ومترجمة`,
      images: [{ url: 'https://4cima.com/og-image.png', width: 1200, height: 630, alt: title }],
    },
  }
}

/**
 * صفحة قسم لغة: /movies/lang/[code] — كل اللغات بما فيها /movies/lang/ar للعربي.
 * allowlist = لغات الـ Navbar المشتركة (مع findNavLanguage — يوافق بـ filter ثم code).
 * أي كود غير مسموح → 404. لا generateStaticParams ولا revalidate — القائمة ديناميكية من D1.
 *
 * أول صفحة SSR بنفس استعلام /api/movies?language=<filter>&sort=popularity&order=desc&page=1
 * حتى يكون تحميل المزيد (نفس الـ API مع اللغة نفسها) متسقة بلا تكرار/قفز.
 */
export default async function MovieLangPage({ params }: PageProps) {
  const { code } = await params
  const lang = findNavLanguage(code)
  if (!lang) notFound()

  try {
    // نفس بناء شرط اللغة في /api/movies: filter قد يكون متعددًا ('zh,cn')
    const languages = lang.filter.split(',').map(l => l.trim()).filter(l => l)

    /* anti-join على جدول الممنوعات المُجمّع (excluded_genre_movie_ids — يبنيه
       build-genre-index.js في سلسلة المزامنة بنفس البوابات) بدل json_each:
       مع الفهرس المركّب الجزئي idx_movies_lang_listing (original_language,
       popularity DESC, id DESC) يتوقف البحث عند LIMIT (~50 صفًا/نداء) بدل
       مسح كل صفوف اللغة + فرز مؤقت (كان 217 ألف صف مقروء للإنجليزية).
       ORDER BY popularity DESC, id DESC = نفس ترتيب الـAPI (tiebreak حتمي)
       فيظل تحميل المزيد متسقًا مع أول صفحة.
       withSortCols يضمّن عمودَي الترتيب في الإخراج لفرع الـUNION فقط (الغلاف
       الخارجي يرتب عليهما) — الحالة المفردة تحافظ على أعمدة الإخراج القديمة. */
    const branch = (withSortCols: boolean) => `SELECT movies.id, movies.tmdb_id, movies.slug, movies.title_ar, movies.title_en,
              movies.poster_path, movies.backdrop_path, movies.vote_average, movies.release_year,
              movies.genres_json, movies.overview_ar, movies.original_language${withSortCols ? ', movies.popularity, movies.id AS sort_id' : ''}
       FROM movies
       LEFT JOIN excluded_genre_movie_ids eg ON eg.tmdb_id = movies.tmdb_id
       WHERE movies.original_language = ?
         AND (movies.genres_json IS NULL OR eg.tmdb_id IS NULL)
         AND (IFNULL(movies.filter_status, 'clean') IN ('clean', 'reviewed_approved'))
         AND (movies.release_year IS NOT NULL AND movies.release_year >= 2000)
       ORDER BY movies.popularity DESC, movies.id DESC
       LIMIT ${LISTING_PAGE_SIZE + 1}`

    /* لغة متعددة ('zh,cn'): UNION ALL لكل لغة كي يبقى كل فرع على الفهرس —
       IN (…) يُسقط الترتيب من الفهرس ويعيد مسح صفوف اللغتين + فرزها (16.7 ألف صف) */
    const rows = await executeAll(
      languages.length > 1
        ? `SELECT * FROM (
             ${languages.map(() => `SELECT * FROM (${branch(true)})`).join('\n             UNION ALL\n')}
           ) ORDER BY popularity DESC, sort_id DESC
           LIMIT ${LISTING_PAGE_SIZE + 1}`
        : branch(false),
      languages
    )

    // نفس الفلتر اللاحق الذي يطبّقه /api/movies على كل دفعة — يحافظ على تطابق الصف الأول
    const filteredMovies = filterExcludedGenres(rows)

    const hasMore = filteredMovies.length > LISTING_PAGE_SIZE
    if (hasMore) filteredMovies.pop()

    const pageTitle = `أفلام ${lang.label}`
    const pageUrl = `https://4cima.com/movies/lang/${code}`

    /* JSON-LD — Breadcrumb + CollectionPage بأول الأعمال الظاهرة (مطابق لنموذج genres/[slug]) */
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://4cima.com/' },
            { '@type': 'ListItem', position: 2, name: 'الأفلام', item: 'https://4cima.com/movies' },
            { '@type': 'ListItem', position: 3, name: pageTitle, item: pageUrl },
          ],
        },
        {
          '@type': 'CollectionPage',
          name: pageTitle,
          url: pageUrl,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: filteredMovies.slice(0, 20).length,
            itemListElement: filteredMovies.slice(0, 20).map((m: any, i: number) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `https://4cima.com/movies/${m.slug}`,
              name: m.title_ar || m.title_en,
            })),
          },
        },
      ],
    }

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <MoviesPageClient
        initialMovies={filteredMovies}
        initialHasMore={hasMore}
        forcedLanguage={lang.filter}
        title={`أفلام ${lang.label}`}
        langCode={code}
        langLabel={lang.label}
      />
      </>
    )
  } catch (error) {
    console.error(`Error fetching movies/lang/${code} page data:`, error)
    // لا نعيد قائمة فاضية على استثناء D1/SSR كي لا تُخبز الصفحة فارغة وقت البناء —
    // الإعادة (throw) تجعل Next يسقط التخزين المسبق ويُصدِّر الصفحة عند الطلب (D1 متاح وقت التشغيل).
    throw error
  }
}