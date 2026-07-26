'use client'

import { MovieCard } from './MovieCard'
import { MovieCardGrid } from './MovieCardGrid'

// مثال للبيانات
const sampleMovies = [
  {
    id: 1,
    slug: 'the-shawshank-redemption',
    title_ar: 'الخلاص من شاوشانك',
    title_en: 'The Shawshank Redemption',
    poster_path: '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
    vote_average: 9.3,
    year: 1994,
    primary_genre: 'دراما',
    overview_ar: 'في عام 1947، يُدان المصرفي آندي دوفرين بقتل زوجته وعشيقها ويُحكم عليه بالسجن مدى الحياة في سجن شاوشانك. هناك يصادق إليس ريد بويد، وهو سجين محبط فقد الأمل في الحرية.',
    media_type: 'movie' as const
  },
  {
    id: 2,
    slug: 'the-godfather',
    title_ar: 'العراب',
    title_en: 'The Godfather',
    poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    vote_average: 9.2,
    year: 1972,
    primary_genre: 'جريمة',
    overview_ar: 'ملحمة جريمة أمريكية تمتد من عام 1945 إلى 1955، قصة عائلة كورليوني الخيالية. عندما يتقاعد العراب فيتو كورليوني من عرشه لتسليمه إلى ابنه مايكل الذي لم يكن راغبًا في البداية.',
    media_type: 'movie' as const
  },
  {
    id: 3,
    slug: 'the-dark-knight',
    title_ar: 'فارس الظلام',
    title_en: 'The Dark Knight',
    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    vote_average: 9.0,
    year: 2008,
    primary_genre: 'أكشن',
    overview_ar: 'باتمان يرفع المخاطر في حربه ضد الجريمة. بمساعدة الملازم جيم جوردون والمدعي العام هارفي دنت، يقوم باتمان بالقضاء على منظمات الجريمة التي تطارد شوارع المدينة.',
    media_type: 'movie' as const
  },
  {
    id: 4,
    slug: 'breaking-bad',
    title_ar: 'بريكنج باد',
    title_en: 'Breaking Bad',
    poster_path: '/3xnWaLQjelJDDF7LT1WBo6f4BRe.jpg',
    vote_average: 9.5,
    year: 2008,
    primary_genre: 'دراما',
    overview_ar: 'والتر وايت، أستاذ كيمياء في المدرسة الثانوية، يكتشف أنه مصاب بسرطان الرئة. يقرر دخول عالم تصنيع وبيع المخدرات لتأمين مستقبل عائلته المالي قبل وفاته.',
    media_type: 'tv' as const
  },
  {
    id: 5,
    slug: 'inception',
    title_ar: 'البداية',
    title_en: 'Inception',
    poster_path: '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    vote_average: 8.8,
    year: 2010,
    primary_genre: 'خيال علمي',
    overview_ar: 'دوم كوب لص ماهر في فن الاستخراج، سرقة الأسرار القيمة من أعماق العقل الباطن أثناء الأحلام، عندما يكون العقل في أضعف حالاته.',
    media_type: 'movie' as const
  },
  {
    id: 6,
    slug: 'pulp-fiction',
    title_ar: 'الخيال اللبّي',
    title_en: 'Pulp Fiction',
    poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    vote_average: 8.9,
    year: 1994,
    primary_genre: 'جريمة',
    overview_ar: 'قصص متشابكة من العالم السفلي في لوس أنجلوس. قاتل محترف يرافق زوجة رئيسه، ملاكم يرفض خسارة قتال، وزوجان من اللصوص.',
    media_type: 'movie' as const
  }
]

// مثال استخدام كارت واحد
export function SingleCardExample() {
  return (
    <div className="p-8 bg-gray-950 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-8">كارت واحد</h1>
      <MovieCard {...sampleMovies[0]} />
    </div>
  )
}

// مثال استخدام Grid
export function GridExample() {
  return (
    <div className="p-8 bg-gray-950 min-h-screen">
      <MovieCardGrid 
        items={sampleMovies}
        title="الأفلام المميزة"
        columns={6}
      />
    </div>
  )
}

// مثال استخدام بدون hover effect (للموبايل)
export function MobileExample() {
  return (
    <div className="p-4 bg-gray-950 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-6">عرض الموبايل</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {sampleMovies.slice(0, 4).map((movie) => (
          <MovieCard key={movie.id} {...movie} />
        ))}
      </div>
    </div>
  )
}

// مثال بدون بعض البيانات
export function MinimalDataExample() {
  const minimalMovie = {
    id: 999,
    slug: 'unknown-movie',
    title_ar: 'فيلم بدون تفاصيل',
    poster_path: '/placeholder.jpg',
    vote_average: 0,
    media_type: 'movie' as const
  }

  return (
    <div className="p-8 bg-gray-950 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-8">كارت بدون تفاصيل</h1>
      <MovieCard {...minimalMovie} />
    </div>
  )
}
