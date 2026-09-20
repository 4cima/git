import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { executeAll } from '@/lib/db'
import { filterExcludedGenres } from '@/utils/excludedGenres'
import { LISTING_PAGE_SIZE } from '@/lib/listing-config'
import { SeriesPageClient } from '@/components/pages/SeriesPageClient'
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

  const title = `مسلسلات ${lang.label}`
  const url = `https://4cima.com/series/lang/${code}`
  return {
    title,
    description: `شاهد أفضل المسلسلات ${lang.label} بجودة عالية ومترجمة`,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'ar_EG',
      url,
      siteName: '4cima',
      title: `${title} | فور سيما`,
      description: `شاهد أفضل المسلسلات ${lang.label} بجودة عالية ومترجمة`,
      images: [{ url: 'https://4cima.com/og-image.png', width: 1200, height: 630, alt: title }],
    },
  }
}

/**
 * صفحة قسم لغة: /series/lang/[code] — كل اللغات بما فيها /series/lang/ar للعربي.
 * allowlist = لغات الـ Navbar المشتركة (مع findNavLanguage — يوافق بـ filter ثم code).
 * أي كود غير مسموح → 404. لا generateStaticParams ولا revalidate — القائمة ديناميكية من D1.
 *
 * أول صفحة SSR بنفس استعلام /api/series?language=<filter>&sort=popularity&order=desc&page=1
 * حتى يكون تحميل المزيد (نفس الـ API مع اللغة نفسها) متسقة بلا تكرار/قفز.
 */
export default async function SeriesLangPage({ params }: PageProps) {
  const { code } = await params
  const lang = findNavLanguage(code)
  if (!lang) notFound()

  try {
    // نفس بناء شرط اللغة في /api/series: filter قد يكون متعددًا ('zh,cn')
    const languages = lang.filter.split(',').map(l => l.trim()).filter(l => l)

    /* anti-join على جدول الممنوعات المُجمّع (excluded_genre_series_ids — يبنيه
       build-genre-index.js في سلسلة المزامنة بنفس البوابات) بدل json_each:
       مع الفهرس المركّب الجزئي idx_tv_lang_listing (original_language,
       popularity DESC, id DESC) يتوقف البحث عند LIMIT (~50 صفًا/نداء) بدل
       مسح كل صفوف اللغة + فرز مؤقت (كان 43 ألف صف مقروء للإنجليزية).
       ORDER BY popularity DESC, id DESC = نفس ترتيب الـAPI (tiebreak حتمي)
       فيظل تحميل المزيد متسقًا مع أول صفحة.
       withSortCols يضمّن عمودَي الترتيب في الإخراج لفرع الـUNION فقط (الغلاف
       الخارجي يرتب عليهما) — الحالة المفردة تحافظ على أعمدة الإخراج القديمة. */
    const branch = (withSortCols: boolean) => `SELECT tv_series.id, tv_series.tmdb_id, tv_series.slug,
              tv_series.name_ar AS title_ar, tv_series.name_en AS title_en,
              tv_series.poster_path, tv_series.backdrop_path, tv_series.vote_average, tv_series.first_air_year,
              tv_series.genres_json, tv_series.overview_ar${withSortCols ? ', tv_series.popularity, tv_series.id AS sort_id' : ''}
       FROM tv_series
       LEFT JOIN excluded_genre_series_ids eg ON eg.tmdb_id = tv_series.tmdb_id
       WHERE tv_series.original_language = ?
         AND (tv_series.genres_json IS NULL OR eg.tmdb_id IS NULL)
         AND (IFNULL(tv_series.filter_status, 'clean') IN ('clean', 'reviewed_approved'))
         AND (tv_series.first_air_year IS NOT NULL AND tv_series.first_air_year >= 2000)
       ORDER BY tv_series.popularity DESC, tv_series.id DESC
       LIMIT ${LISTING_PAGE_SIZE + 1}`

    /* لغة متعددة ('zh,cn'): UNION ALL لكل لغة كي يبقى كل فرع على الفهرس —
       IN (…) يُسقط الترتيب من الفهرس ويعيد مسح صفوف اللغتين + فرزها (13.4 ألف صف) */
    const rows = await executeAll(
      languages.length > 1
        ? `SELECT * FROM (
             ${languages.map(() => `SELECT * FROM (${branch(true)})`).join('\n             UNION ALL\n')}
           ) ORDER BY popularity DESC, sort_id DESC
           LIMIT ${LISTING_PAGE_SIZE + 1}`
        : branch(false),
      languages
    )

    // نفس الفلتر اللاحق الذي يطبّقه /api/series على كل دفعة — يحافظ على تطابق الصف الأول
    const filteredSeries = filterExcludedGenres(rows)

    const hasMore = filteredSeries.length > LISTING_PAGE_SIZE
    if (hasMore) filteredSeries.pop()

    const pageTitle = `مسلسلات ${lang.label}`
    const pageUrl = `https://4cima.com/series/lang/${code}`

    /* JSON-LD — Breadcrumb + CollectionPage بأول الأعمال الظاهرة (مطابق لنموذج genres/[slug]) */
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://4cima.com/' },
            { '@type': 'ListItem', position: 2, name: 'المسلسلات', item: 'https://4cima.com/series' },
            { '@type': 'ListItem', position: 3, name: pageTitle, item: pageUrl },
          ],
        },
        {
          '@type': 'CollectionPage',
          name: pageTitle,
          url: pageUrl,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: filteredSeries.slice(0, 20).length,
            itemListElement: filteredSeries.slice(0, 20).map((s: any, i: number) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `https://4cima.com/series/${s.slug}`,
              name: s.title_ar || s.title_en,
            })),
          },
        },
      ],
    }

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <SeriesPageClient
        initialSeries={filteredSeries}
        initialHasMore={hasMore}
        forcedLanguage={lang.filter}
        title={`مسلسلات ${lang.label}`}
        langCode={code}
        langLabel={lang.label}
      />
      </>
    )
  } catch (error) {
    console.error(`Error fetching series/lang/${code} page data:`, error)
    // لا نعيد قائمة فاضية على استثناء D1/SSR كي لا تُخبز الصفحة فارغة وقت البناء —
    // الإعادة (throw) تجعل Next يسقط التخزين المسبق ويُصدِّر الصفحة عند الطلب (D1 متاح وقت التشغيل).
    throw error
  }
}