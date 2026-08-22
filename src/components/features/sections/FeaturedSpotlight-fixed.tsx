import Link from 'next/link'

interface MediaItem {
  id: number
  slug: string
  title: string
  title_en: string
  poster_path: string
  backdrop_path: string
  vote_average: number
  overview_ar: string
  year: number
  media_type: 'movie' | 'tv'
  primary_genre: string | null
}

interface FeaturedSpotlightProps {
  items: MediaItem[]
}

const BACKDROP_300 = 'https://image.tmdb.org/t/p/w300'

function getBackdropUrl(item: MediaItem): string {
  return item.backdrop_path
    ? `${BACKDROP_300}${item.backdrop_path}`
    : `${BACKDROP_300}${item.poster_path}`
}

function href(item: MediaItem): string {
  return item.media_type === 'tv' ? `/series/${item.slug}` : `/movies/${item.slug}`
}

function mediaTypeLabel(item: MediaItem): string {
  return item.media_type === 'tv' ? 'مسلسل' : 'فيلم'
}

export function FeaturedSpotlight({ items }: FeaturedSpotlightProps) {
  const list = items?.slice(0, 8) ?? []
  if (list.length === 0) return null

  const [primary, ...rest] = list
  const secondary = rest.slice(0, 4)

  return (
    <div dir="rtl" className="mx-auto max-w-[2400px] container-padding">
      <div className="mb-8 flex items-center gap-4">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold text-white sm:text-3xl">
          <span>✨</span> محتوى مميز
        </h2>
        <div className="h-1 flex-1 max-w-[120px] rounded-full bg-gradient-to-l from-yellow-400 to-transparent" />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-4 sm:auto-rows-[170px]">
        <Link
          href={href(primary)}
          className="group relative col-span-1 row-span-2 overflow-hidden rounded-xl border border-white/10 sm:col-span-2"
        >
          <img
            src={getBackdropUrl(primary)}
            alt={primary.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />

          {/* justify-start = يمين في RTL */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-start gap-2 p-3">
            <span className={`rounded-md px-2 py-1 text-xs font-bold ring-1 ${
              primary.media_type === 'tv'
                ? 'bg-purple-500/20 text-purple-300 ring-purple-400/30'
                : 'bg-cyan-500/20 text-cyan-300 ring-cyan-400/30'
            }`}>
              {mediaTypeLabel(primary)}
            </span>
            {primary.primary_genre && (
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${
                primary.media_type === 'tv'
                  ? 'bg-purple-500/20 text-purple-300 ring-purple-400/30'
                  : 'bg-cyan-500/20 text-cyan-300 ring-cyan-400/30'
              }`}>
                {primary.primary_genre}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-bold text-yellow-400 backdrop-blur-sm">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
              </svg>
              {primary.vote_average.toFixed(1)}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 text-right">
            <span className="mb-1 inline-block rounded bg-black/60 px-1.5 py-0.5 text-xs text-gray-300 backdrop-blur-sm">
              {primary.year}
            </span>
            <h3 className="text-xl font-bold text-white sm:text-2xl">{primary.title}</h3>
            <p className="text-sm text-gray-400">{primary.title_en}</p>
            {primary.overview_ar && (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-300 opacity-0 transition group-hover:opacity-100">
                {primary.overview_ar}
              </p>
            )}
          </div>
        </Link>

        {secondary.map((item) => (
          <Link
            key={item.id}
            href={href(item)}
            className="group relative col-span-1 row-span-1 overflow-hidden rounded-xl border border-white/10"
          >
            <img
              src={getBackdropUrl(item)}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/95 via-gray-950/20 to-transparent" />

            {/* justify-start = يمين في RTL */}
            <div className="absolute inset-x-1.5 top-1.5 flex items-center justify-start gap-1">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm ${
                item.media_type === 'tv'
                  ? 'bg-purple-500/30 text-purple-200'
                  : 'bg-cyan-500/30 text-cyan-200'
              }`}>
                {item.media_type === 'tv' ? 'مسلسل' : 'فيلم'}
              </span>
              {item.primary_genre && (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${
                  item.media_type === 'tv'
                    ? 'bg-purple-500/20 text-purple-200'
                    : 'bg-cyan-500/20 text-cyan-200'
                }`}>
                  {item.primary_genre}
                </span>
              )}
              <span className="flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400 backdrop-blur-sm">
                <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
                </svg>
                {item.vote_average.toFixed(1)}
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-3 text-right">
              <p className="truncate text-sm font-bold text-white">{item.title}</p>
              <div className="mt-0.5 flex items-center justify-start gap-2 text-xs text-gray-400">
                <span className="truncate">{item.title_en}</span>
                <span className="shrink-0">{item.year}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}