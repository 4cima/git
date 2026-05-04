// @ts-nocheck
'use client'

import { memo, useState, useEffect, useRef, lazy, Suspense } from 'react'
import type { DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Star } from 'lucide-react'
import Link from 'next/link'
import { TmdbImage } from '../../common/TmdbImage'
import { translateGenre } from '../../../utils/genreTranslator'

const LazyReactPlayer = lazy(() => import('react-player'))

export type Movie = {
  id: number
  slug?: string | null
  title?: string | null
  title_ar?: string | null
  title_en?: string | null
  name?: string | null
  name_ar?: string | null
  name_en?: string | null
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  overview?: string
  overview_ar?: string
  overview_en?: string
  media_type?: 'movie' | 'tv' | 'game' | 'software' | 'anime' | 'quran' | string
  genre_ids?: number[]
  original_language?: string
  category?: string
  primary_genre?: string
  thumbnail?: string
  videos?: any[]
  aggregate_rating?: number | null
  rating_count?: number
  review_count?: number
}

export const MovieCard = memo(({ movie, index = 0, isVisible }: { movie: Movie; index?: number; isVisible?: boolean }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [trailerKey, setTrailerKey] = useState<string | null>(null)
  const [thumbSrc, setThumbSrc] = useState<string>(((movie as any).thumbnail || '').trim())

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Determine titles
  const titleAr = movie.title_ar || movie.name_ar
  const titleEn = movie.title_en || movie.title || movie.name
  const mainTitle = titleAr || titleEn || 'Untitled'
  const subTitle = titleAr && titleEn && titleAr !== titleEn ? titleEn : null

  const date = movie.release_date || movie.first_air_date || ''
  const year = date ? new Date(date).getFullYear() : ''

  const isTv = movie.media_type === 'tv' || (!!movie.name && !movie.title)
  const isGame = movie.media_type === 'game'
  const isSoftware = movie.media_type === 'software'
  const isAnime = movie.media_type === 'anime'
  const isQuran = movie.media_type === 'quran'

  const getMediaType = () => {
    if (isGame) return 'game'
    if (isSoftware) return 'software'
    if (isAnime) return 'anime'
    if (isQuran) return 'quran'
    if (isTv) return 'series'
    return 'movies'
  }

  const mediaType = getMediaType()

  // Skip items without slug
  if (!movie.slug || movie.slug.trim() === '' || movie.slug === 'content') {
    return null
  }

  const watchUrl = `/${mediaType}/${movie.slug}`
  const voteAvg = typeof movie.vote_average === 'number' ? movie.vote_average : parseFloat(String(movie.vote_average || 0))
  const rating = voteAvg > 0 ? Math.round(voteAvg * 10) / 10 : null

  // Translate genre to Arabic
  const genreRaw = movie.primary_genre || (movie as any).category
  const genre = genreRaw ? translateGenre(genreRaw) : null
  const currentYear = new Date().getFullYear()
  const isCurrentYear = year === currentYear

  const hasPosterPath = Boolean(movie.poster_path && movie.poster_path.trim())
  const hasValidTitle = Boolean(mainTitle && mainTitle !== 'Untitled')

  useEffect(() => {
    let mounted = true

    if (isHovered && !trailerKey) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = setTimeout(async () => {
        try {
          // Check if videos are already in the movie object
          if (movie.videos && Array.isArray(movie.videos) && movie.videos.length > 0) {
            const trailer = movie.videos.find(
              (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
            )
            if (mounted && trailer?.key) {
              setTrailerKey(trailer.key)
            }
          } else {
            // Fetch from API if not available
            const apiType = mediaType === 'tv' ? 'tv' : mediaType; const endpoint = `/api/${apiType}/${movie.slug}`
            const response = await fetch(endpoint)
            const data = await response.json()

            const videos = data.videos ? (typeof data.videos === 'string' ? JSON.parse(data.videos) : data.videos) : []
            const trailer = videos.find(
              (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
            )
            if (mounted && trailer?.key) {
              setTrailerKey(trailer.key)
            }
          }
        } catch {
          // Silent fail
        }
      }, 500)
    } else if (!isHovered && hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    return () => {
      mounted = false
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
    }
  }, [isHovered, trailerKey, mediaType, movie.slug, movie.videos])

  useEffect(() => {
    setThumbSrc(((movie as any).thumbnail || '').trim())
  }, [(movie as any).thumbnail])

  if (!hasPosterPath || !hasValidTitle) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-0 group/card"
    >
      <Link
        href={watchUrl}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable={false}
        onDragStart={(e: DragEvent<HTMLAnchorElement>) => e.preventDefault()}
        className="block relative h-full w-full lumen-focus-ring rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumen-gold focus-visible:outline-offset-2 touch-pan-y"
      >
        <div className="lumen-card h-full flex flex-col transition-transform duration-300 ease-lumen hover:scale-[1.03] focus-within:scale-[1.02]">
          {/* Poster */}
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-lumen-muted">
            {thumbSrc ? (
              <img
                src={thumbSrc}
                alt={mainTitle}
                loading="lazy"
                decoding="async"
                className={`h-full w-full object-cover transition-all duration-500 ease-lumen ${isHovered ? 'scale-105 brightness-75' : 'scale-100'}`}
                onError={() => setThumbSrc('')}
              />
            ) : (
              <TmdbImage
                path={movie.poster_path || movie.backdrop_path}
                alt={mainTitle}
                size="w342"
                className="h-full w-full"
                imgClassName={`transition-all duration-500 ease-lumen ${isHovered ? 'scale-105 brightness-75' : 'scale-100'}`}
                fallback={
                  <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-600 p-4 text-center">
                    <Play size={32} strokeWidth={1.5} className="mb-2 opacity-50" />
                    <span className="text-[10px] font-medium opacity-50 line-clamp-2">{mainTitle}</span>
                  </div>
                }
              />
            )}

            {/* Lazy Video Layer */}
            <AnimatePresence>
              {isHovered && trailerKey && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-black"
                >
                  <Suspense fallback={null}>
                    <LazyReactPlayer
                      url={`https://www.youtube.com/watch?v=${trailerKey}`}
                      width="100%"
                      height="100%"
                      playing
                      muted
                      loop
                      config={{
                        youtube: {
                          playerVars: {
                            autoplay: 1,
                            controls: 0,
                            showinfo: 0,
                            modestbranding: 1,
                            rel: 0,
                            iv_load_policy: 3
                          }
                        }
                      } as any}
                      className="pointer-events-none scale-150"
                    />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LUMEN grain overlay */}
            <div className="lumen-grain rounded-2xl" aria-hidden />
          </div>

          {/* Title & meta */}
          <div className="p-3 h-[104px] grid grid-rows-[18px_16px_1fr] bg-gradient-to-b from-transparent to-lumen-void/60">
            <h3 className="line-clamp-1 text-sm font-semibold leading-[18px] text-lumen-cream group-hover/card:text-lumen-gold transition-colors duration-200">
              {mainTitle}
            </h3>
            <p className={`line-clamp-1 text-xs leading-4 text-lumen-gold/80 font-arabic ${subTitle ? '' : 'invisible'}`}>
              {subTitle || '—'}
            </p>
            <div className="self-end mt-1 flex flex-wrap items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-lumen-silver">
              {rating != null && (
                <span className="flex items-center gap-0.5 text-lumen-gold">
                  <Star size={10} fill="currentColor" />
                  {rating}
                </span>
              )}

              {genre && (
                <>
                  {rating != null && <span className="w-0.5 h-0.5 rounded-full bg-lumen-silver/50" />}
                  <span className="truncate max-w-[80px]">{genre}</span>
                </>
              )}

              {year && (
                <>
                  <span className="w-0.5 h-0.5 rounded-full bg-lumen-silver/50" />
                  <span className={isCurrentYear ? 'text-cyan-400 animate-neon-flash font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : ''}>
                    {year}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}, (prev, next) => {
  return prev.movie.id === next.movie.id && prev.index === next.index
})

MovieCard.displayName = 'MovieCard'
