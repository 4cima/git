import { useQuery } from '@tanstack/react-query'
import { PrefetchLink } from '../../common/PrefetchLink'
import { Clock } from 'lucide-react'
import { SectionHeader } from '../../common/SectionHeader'
import { useLang } from '../../../state/useLang'
import { generateWatchUrl } from '../../../lib/utils'

type ApiCwItem = {
  content_id: number
  content_type: 'movie' | 'tv'
  season: number | null
  episode: number | null
  progress: number | null
  duration: number | null
  updated_at: string
  meta?: {
    id: number
    slug?: string | null
    poster_path?: string | null
    title?: string | null
    name?: string | null
    vote_average?: number | null
  } | null
}

export const ContinueWatchingRow = ({ userId }: { userId: string }) => {
  const { lang } = useLang()
  const { data, isPending } = useQuery<ApiCwItem[]>({
    queryKey: ['continue-watching', userId],
    queryFn: async () => {
      const res = await fetch('/api/continue-watching', {
        headers: { 'Accept': 'application/json' }
      })
      if (!res.ok) throw new Error('failed_continue_watching')
      const json = await res.json()
      return (json.items || []) as ApiCwItem[]
    },
    staleTime: 60 * 1000,
  })

  if (!data?.length) return null
  if (isPending) {
    return (
      <section>
        <SectionHeader title={lang === 'ar' ? 'تابع المشاهدة' : 'Continue Watching'} icon={<Clock />} />
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[160px] aspect-[2/3] animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      <SectionHeader title={lang === 'ar' ? 'تابع المشاهدة' : 'Continue Watching'} icon={<Clock />} />
      <div className="flex gap-4 overflow-x-auto pb-6 snap-x scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        {data.map((r, i) => {
          const href = generateWatchUrl(
            { id: r.content_id, slug: r.meta?.slug, media_type: r.content_type },
            r.season || 1,
            r.episode || 1
          )
          const progress = r.duration && r.duration > 0
            ? Math.min(99, Math.round(((r.progress || 0) / r.duration) * 100))
            : 0
          const movie = r.meta || {
            id: r.content_id,
            title: undefined,
            name: undefined,
            poster_path: undefined,
            vote_average: undefined,
            media_type: r.content_type
          }

          return (
            <PrefetchLink
              key={`${r.content_type}-${r.content_id}`}
              href={href}
              className="snap-center shrink-0 w-[120px] md:w-[140px] group"
            >
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md transition-transform duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,255,204,0.3)]">
                <div className="aspect-[2/3] bg-zinc-900">
                  {(movie.poster_path || r.meta?.poster_path) ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w342${movie.poster_path || r.meta?.poster_path}`}
                      alt={movie.title || movie.name || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">?</div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                  <div
                    className="h-full bg-cyan-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-cyan-400">
                  {progress}%
                </div>
              </div>
              <h3 className="mt-2 text-sm font-bold text-zinc-200 truncate group-hover:text-cyan-400 transition-colors">
                {movie.title || movie.name || `#${r.content_id}`}
              </h3>
              {r.content_type === 'tv' && (r.season || r.episode) && (
                <p className="text-[10px] text-zinc-500">
                  S{r.season || 1} E{r.episode || 1}
                </p>
              )}
            </PrefetchLink>
          )
        })}
      </div>
    </section>
  )
}

