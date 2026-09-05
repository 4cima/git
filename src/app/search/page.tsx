import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { MovieCard, type Movie } from '@/components/features/media/MovieCard'
import { searchContent, type SearchContentItem } from '@/lib/search-content'

export const dynamic = 'force-dynamic'

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[] }>
}

function readQuery(q?: string | string[]): string {
  const raw = Array.isArray(q) ? q[0] : q
  return (raw ?? '').trim().slice(0, 100)
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams
  const query = readQuery(q)
  return {
    // title مطلق لتجاوز قالب layout («%s | فور سيما | 4cima») ومطابقة الصيغة المطلوبة
    title: { absolute: query ? `بحث: ${query} | فور سيما` : 'بحث | فور سيما' },
    // لا فهرسة لصفحات الاستعلامات (منع تكاثر صفحات q في Google) — مع المتابعة في الروابط
    robots: { index: false, follow: true },
  }
}

// نفس قاعدة SearchBox (السطر 757): media_type 'tv' → /series، وإلا /movies
function toCardMovie(r: SearchContentItem): Movie {
  return {
    id: r.id,
    slug: r.slug,
    title_ar: r.title_ar ?? null,
    title_en: r.title_en ?? null,
    name_ar: r.name_ar ?? null,
    name_en: r.name_en ?? null,
    poster_path: r.poster_path ?? null,
    backdrop_path: r.backdrop_path ?? null,
    vote_average: r.vote_average,
    release_year: r.release_year,
    first_air_year: r.first_air_year,
    media_type: r.media_type === 'tv' ? 'tv' : 'movie',
    genres_json: r.genres_json,
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const query = readQuery(q)

  // نفس مصدر الهيدر: دالة البحث المشتركة التي تخدم /api/search
  let results: SearchContentItem[] = []
  let totalFound = 0
  if (query) {
    try {
      const res = await searchContent(query)
      results = res.results
      totalFound = res.totalFound
    } catch {
      // فشل البحث → حالة «لا نتائج» بدل كسر الصفحة
      results = []
      totalFound = 0
    }
  }

  // MovieCard يخفي العناصر بلا slug/ملصق/عنوان — نفلترها مسبقاً لتجنب خانات فارغة في الشبكة
  const cards = results
    .filter(r => r.slug && r.slug.trim() !== '' && r.poster_path && (r.title_ar || r.title_en || r.name_ar || r.name_en))
    .map(toCardMovie)

  return (
    <div className="min-h-screen bg-black text-white" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* رأس الصفحة */}
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Search className="w-6 h-6 text-cyan-400" aria-hidden />
            {query ? (
              <span>
                نتائج البحث عن: <span className="text-cyan-400">{query}</span>
              </span>
            ) : (
              <span>البحث</span>
            )}
          </h1>
          {query && (
            <p className="text-slate-400 mt-2 text-sm">
              {totalFound > 0
                ? `تم العثور على ${totalFound} نتيجة`
                : 'لا توجد نتائج مطابقة'}
            </p>
          )}
        </header>

        {/* الحالات: فاضي / لا نتائج / نتائج */}
        {!query ? (
          <div className="py-16 text-center">
            <p className="text-slate-300 font-semibold mb-2">اكتب كلمة للبحث عن أفلام ومسلسلات</p>
            <p className="text-slate-500 text-sm">استخدم حقل البحث في الأعلى أو اضغط Ctrl + K</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-300 font-semibold mb-2">لا توجد نتائج</p>
            <p className="text-slate-500 text-sm mb-6">جرّب كلمات بحث مختلفة أو أقصر</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/movies" className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20 text-sm font-semibold transition-colors">
                تصفح الأفلام
              </Link>
              <Link href="/series" className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/40 text-blue-300 hover:bg-blue-500/20 text-sm font-semibold transition-colors">
                تصفح المسلسلات
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {cards.map((movie, index) => (
              <MovieCard key={`${movie.media_type}-${movie.id}`} movie={movie} index={index} initialCardState="neutral" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
