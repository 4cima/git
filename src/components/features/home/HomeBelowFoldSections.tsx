import React, { Suspense, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tmdb } from '../../../lib/tmdb'
import { QuantumTrain } from '../../features/media/QuantumTrain'
import { useLang } from '../../../state/useLang'
import { Zap, Tv, Smile, Film, Drama, FileText, Play, BookOpen, Baby, Sparkles, Languages } from 'lucide-react'
import { SectionHeader } from '../../common/SectionHeader'
import { sanitizeMediaItems, type TmdbMedia } from '../../../lib/mediaUtils'
import { getTrendingDailyMotionDB } from '../../../lib/db'
import { useTranslatedContent } from '../../../hooks/useTranslatedContent'
import { SkeletonGrid } from '../../common/Skeletons'
import { MovieCard } from '../../features/media/MovieCard'
import { generateWatchUrl } from '../../../lib/utils'
import { CONFIG } from '../../../lib/constants'
import { useCategoryVideos } from '../../../hooks/useFetchContent'
import { HolographicCard } from '../../effects/HolographicCard'
import { PrefetchLink } from '../../common/PrefetchLink'
import { getRecommendations } from '../../../services/recommendations'
import { useAuth } from '../../../hooks/useAuth'

const mapResults = (data: any, type: 'movie' | 'tv'): TmdbMedia[] => {
  return (data?.results || []).map((item: any) => ({ ...item, media_type: type }))
}

type CriticalHomeData = {
  popularAr: TmdbMedia[]
  arabicSeries: TmdbMedia[]
  kids: TmdbMedia[]
  bollywood: TmdbMedia[]
}

type HomeBelowFoldSectionsProps = {
  criticalHomeData?: CriticalHomeData
  topRatedMovies?: TmdbMedia[]
}

const BentoBox = ({
  title,
  icon,
  items,
  color,
}: {
  title: string
  icon: React.ReactNode
  items: any[]
  color: 'cyan' | 'purple' | 'gold'
}) => {
  if (!items || items.length === 0) return null

  return (
    <div>
      <SectionHeader title={title} icon={icon} color={color} />
      <div className="grid grid-cols-2 gap-3">
        {items.slice(0, 4).map((item, i) => {
          const isTmdb = !!item.poster_path || !!item.backdrop_path
          const img =
            item.thumbnail ||
            (item.backdrop_path
              ? `https://image.tmdb.org/t/p/w300${item.backdrop_path}`
              : `https://image.tmdb.org/t/p/w300${item.poster_path}`)
          const link = isTmdb
            ? generateWatchUrl({ ...item, media_type: item.media_type === 'tv' ? 'tv' : 'movie' })
            : `/watch/yt/${item.id}`

          return (
            <HolographicCard
              key={item.id}
              className={`aspect-video ${i === 0 ? 'col-span-2 row-span-2 aspect-video' : ''}`}
            >
              <PrefetchLink href={link} className="block h-full relative group">
                <img
                  src={img}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  alt={item.title || item.name}
                  width={1280}
                  height={720}
                  style={{ aspectRatio: '16 / 9' }}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h4 className="font-bold text-white leading-tight line-clamp-2 text-sm md:text-lg">
                    {item.title || item.name}
                  </h4>
                </div>
              </PrefetchLink>
            </HolographicCard>
          )
        })}
      </div>
    </div>
  )
}

const AIRecommended = ({ userId }: { userId: string }) => {
  const q = useQuery<any[]>({
    queryKey: ['recs', userId],
    queryFn: () => getRecommendations(userId),
    staleTime: 1000 * 60 * 60,
  })

  if (!q.data?.length) {
    return <div className="text-zinc-500">Initializing Neural Net...</div>
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4 md:gap-6">
      {q.data.slice(0, 8).map((m: any) => (
        <HolographicCard key={m.id} className="aspect-[2/3]">
          <PrefetchLink href={generateWatchUrl({ ...m, media_type: 'movie' })}>
            <img
              src={`https://image.tmdb.org/t/p/w300${m.poster_path}`}
              className="w-full h-full object-cover"
              alt={m.title}
              width={300}
              height={450}
              style={{ aspectRatio: '2 / 3' }}
              loading="lazy"
            />
          </PrefetchLink>
        </HolographicCard>
      ))}
    </div>
  )
}

const HomeBelowFoldSectionsInner = ({ criticalHomeData, topRatedMovies }: HomeBelowFoldSectionsProps) => {
  const { user } = useAuth()
  const { lang } = useLang()

  const koreanSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'k-drama'],
    queryFn: async () => {
      // Use existing /api/tv endpoint with language filter
      try {
        const response = await fetch('/api/tv?language=ko&limit=20')
        if (response.ok) {
          const data = await response.json()
          // Filter items with valid slugs
          const filtered = (data.data || []).filter((item: TmdbMedia) =>
            item.slug && item.slug.trim() !== '' && item.slug !== 'content'
          )
          return { results: filtered }
        }
      } catch (e: any) {
        // Silently fail
      }
      return { results: [] }
    },
    staleTime: 300000,
  })

  const chineseSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'chinese-series'],
    queryFn: async () => {
      // Use existing /api/tv endpoint with language filter
      try {
        const response = await fetch('/api/tv?language=zh&limit=20')
        if (response.ok) {
          const data = await response.json()
          // Filter items with valid slugs
          const filtered = (data.data || []).filter((item: TmdbMedia) =>
            item.slug && item.slug.trim() !== '' && item.slug !== 'content'
          )
          return { results: filtered }
        }
      } catch (e: any) {
        // Silently fail
      }
      return { results: [] }
    },
    staleTime: 300000,
  })

  const turkishSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'turkish-series'],
    queryFn: async () => {
      // Use existing /api/tv endpoint with language filter
      try {
        const response = await fetch('/api/tv?language=tr&limit=20')
        if (response.ok) {
          const data = await response.json()
          // Filter items with valid slugs
          const filtered = (data.data || []).filter((item: TmdbMedia) =>
            item.slug && item.slug.trim() !== '' && item.slug !== 'content'
          )
          return { results: filtered }
        }
      } catch (e: any) {
        // Silently fail
      }
      return { results: [] }
    },
    staleTime: 300000,
  })

  const bollywoodMovies = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'bollywood'],
    queryFn: async () => {
      // Use existing /api/movies endpoint with language filter
      try {
        const response = await fetch('/api/movies?language=hi&limit=20')
        if (response.ok) {
          const data = await response.json()
          // Filter items with valid slugs
          const filtered = (data.data || []).filter((item: TmdbMedia) =>
            item.slug && item.slug.trim() !== '' && item.slug !== 'content'
          )
          return { results: filtered }
        }
      } catch (e: any) {
        // Silently fail
      }
      return { results: [] }
    },
    enabled: !criticalHomeData?.bollywood || criticalHomeData.bollywood.length === 0,
    staleTime: 300000,
  })

  // determine whether we still need to fetch top rated movies ourselves.
  // if the prop is missing or is an empty array, we consider it incomplete.
  const needsFallback = !topRatedMovies || topRatedMovies.length === 0
  const topRatedQuery = useQuery<TmdbMedia[] | undefined>(
    {
      queryKey: ['home', 'client-top-rated', lang],
      queryFn: async () => {
        // Use existing /api/movies endpoint with sortBy
        try {
          const response = await fetch('/api/movies?sortBy=vote_average&limit=20')
          if (response.ok) {
            const data = await response.json()
            // Filter items with valid slugs
            return (data.data || []).filter((item: TmdbMedia) =>
              item.slug && item.slug.trim() !== '' && item.slug !== 'content'
            )
          }
        } catch (e: any) {
          // Silently fail
        }
        return []
      },
      enabled: needsFallback,
      staleTime: 300000,
    }
  )

  const moviesToRender =
    topRatedMovies && topRatedMovies.length > 0
      ? topRatedMovies
      : topRatedQuery.data || []

  const documentaries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'docs'],
    queryFn: async () => {
      // Use existing /api/movies endpoint - return empty for now since we don't have genre filtering
      return { results: [] }
    },
    staleTime: 300000,
  })

  const tmdbAnime = useQuery<TmdbMedia[]>({
    queryKey: ['home-anime-fallback'],
    queryFn: async () => {
      // Use existing /api/tv endpoint with language filter for Japanese content
      try {
        const response = await fetch('/api/tv?language=ja&limit=20')
        if (response.ok) {
          const data = await response.json()
          // Filter items with valid slugs
          return (data.data || []).filter((item: TmdbMedia) =>
            item.slug && item.slug.trim() !== '' && item.slug !== 'content'
          )
        }
      } catch (e: any) {
        // Silently fail
      }
      return []
    },
    staleTime: 300000,
  })

  const tmdbClassics = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'classics'],
    queryFn: async () => {
      // Use existing /api/movies endpoint - return empty for now since we don't have year filtering
      return { results: [] }
    },
    staleTime: 300000,
  })

  const goldenEra = useCategoryVideos('golden-era', { limit: 10, enabled: true })
  const recaps = useCategoryVideos('recaps', { limit: 10, enabled: true })
  const animeHub = useCategoryVideos('anime', { limit: 20, enabled: true })
  const plays = useCategoryVideos('plays', { limit: 20, enabled: true })

  const translatedKorean = useTranslatedContent(koreanSeries.data?.results)
  const translatedTurkish = useTranslatedContent(turkishSeries.data?.results)
  const translatedChinese = useTranslatedContent(chineseSeries.data?.results)

  return (
    <>
      <section>
        {koreanSeries.isLoading ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'الدراما الكورية' : 'K-Drama'}
              icon={<Film />}
              link="/series?language=ko"
            />
            <SkeletonGrid count={6} variant="poster" />
          </>
        ) : (
          <QuantumTrain
            items={sanitizeMediaItems(translatedKorean.data)}
            title={lang === 'ar' ? 'الدراما الكورية' : 'K-Drama'}
            icon={<Film />}
            link="/series?language=ko"
            color="pink"
          />
        )}
      </section>

      <section>
        {chineseSeries.isLoading ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'مسلسلات صينية قصيرة' : 'Chinese Short Series'}
              icon={<Tv />}
              link="/series?language=zh"
            />
            <SkeletonGrid count={6} variant="poster" />
          </>
        ) : (
          <QuantumTrain
            items={sanitizeMediaItems(translatedChinese.data)}
            title={lang === 'ar' ? 'مسلسلات صينية قصيرة' : 'Chinese Short Series'}
            icon={<Tv />}
            link="/series?language=zh"
            color="cyan"
          />
        )}
      </section>

      <section>
        {turkishSeries.isLoading ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'الدراما التركية' : 'Turkish Drama'}
              icon={<Film />}
              link="/series?language=tr"
            />
            <SkeletonGrid count={6} variant="poster" />
          </>
        ) : (
          <QuantumTrain
            items={sanitizeMediaItems(translatedTurkish.data)}
            title={lang === 'ar' ? 'الدراما التركية' : 'Turkish Drama'}
            icon={<Film />}
            link="/series?language=tr"
          />
        )}
      </section>

      <section>
        {bollywoodMovies.isLoading ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'أفلام بوليوود' : 'Bollywood Movies'}
              icon={<Film />}
              link="/movies?language=hi"
            />
            <SkeletonGrid count={6} variant="poster" />
          </>
        ) : (
          <QuantumTrain
            items={sanitizeMediaItems((criticalHomeData?.bollywood && criticalHomeData.bollywood.length > 0) ? criticalHomeData.bollywood : bollywoodMovies.data?.results)}
            title={lang === 'ar' ? 'أفلام بوليوود' : 'Bollywood Movies'}
            icon={<Film />}
            link="/movies?language=hi"
            color="gold"
          />
        )}
      </section>

      <section>
        {plays.isLoading ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'مسرحيات وكلاسيكيات' : 'Plays & Classics'}
              icon={<Drama />}
              link="/plays"
            />
            <SkeletonGrid count={6} variant="poster" />
          </>
        ) : (
          <QuantumTrain
            items={plays.data || []}
            title={lang === 'ar' ? 'مسرحيات وكلاسيكيات' : 'Plays & Classics'}
            icon={<Drama />}
            link="/plays"
          />
        )}
      </section>

      <section>
        <SectionHeader
          title={lang === 'ar' ? 'الرائج عالمياً' : 'Global Trending'}
          icon={<Zap />}
          link="/top-watched"
        />
        {!criticalHomeData ? (
          <SkeletonGrid count={10} variant="poster" />
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4 md:gap-6 perspective-1000">
            {sanitizeMediaItems(criticalHomeData.popularAr)
              .slice(0, 16)
              .map((movie, idx) => (
                <MovieCard key={movie.id} movie={movie} index={idx} />
              ))}
          </div>
        )}
      </section>

      <section>
        {documentaries.isLoading ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'وثائقيات وواقع' : 'Documentaries'}
              icon={<FileText />}
              link="/docs"
            />
            <SkeletonGrid count={6} variant="poster" />
          </>
        ) : (
          <QuantumTrain
            items={sanitizeMediaItems(documentaries.data?.results)}
            title={lang === 'ar' ? 'وثائقيات وواقع' : 'Documentaries'}
            icon={<FileText />}
            link="/docs"
          />
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BentoBox
          title={lang === 'ar' ? 'العصر الذهبي' : 'Golden Era'}
          icon={<Film />}
          items={goldenEra.data && goldenEra.data.length > 0 ? goldenEra.data : tmdbClassics.data?.results || []}
          color="gold"
        />
        <BentoBox
          title={lang === 'ar' ? 'ملخصات الأفلام' : 'Movie Recaps'}
          icon={<Zap />}
          items={recaps.data || []}
          color="cyan"
        />
      </section>

      <section>
        {(animeHub.isLoading && tmdbAnime.isLoading) ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'أنمي مترجم' : 'Anime'}
              icon={<Tv />}
              link="/anime"
            />
            <SkeletonGrid count={6} variant="poster" />
          </>
        ) : (
          <QuantumTrain
            items={sanitizeMediaItems(
              animeHub.data && animeHub.data.length > 0
                ? (animeHub.data as unknown as TmdbMedia[])
                : tmdbAnime.data || [],
            )}
            title={lang === 'ar' ? 'أنمي مترجم' : 'Anime'}
            icon={<Tv />}
            link="/anime"
          />
        )}
      </section>

      <section>
        <SectionHeader
          title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'}
          icon={<Film />}
          link="/movies"
          badge="⭐ 9.0+"
        />
        {!moviesToRender || moviesToRender.length === 0 ? (
          <SkeletonGrid count={10} variant="poster" />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-none">
            {sanitizeMediaItems(moviesToRender)
              .slice(0, 10)
              .map((movie, idx) => (
                <div key={movie.id} className="snap-center shrink-0 w-[120px] md:w-[140px]">
                  <MovieCard movie={movie} index={idx} />
                </div>
              ))}
          </div>
        )}
      </section>

      {user && (
        <section className="relative p-6 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10" />
          <div className="relative z-10">
            <SectionHeader
              title={lang === 'ar' ? 'اكتشافات الذكاء الاصطناعي' : 'AI Discovery Protocol'}
              icon={<Smile />}
              color="cyan"
            />
            <AIRecommended userId={user.id} />
          </div>
        </section>
      )}
    </>
  )
}

export const HomeBelowFoldSections = memo(({ criticalHomeData, topRatedMovies }: HomeBelowFoldSectionsProps) => {
  return (
    <Suspense
      fallback={
        <section>
          <SkeletonGrid count={6} variant="poster" />
        </section>
      }
    >
      <HomeBelowFoldSectionsInner criticalHomeData={criticalHomeData} topRatedMovies={topRatedMovies} />
    </Suspense>
  )
})


