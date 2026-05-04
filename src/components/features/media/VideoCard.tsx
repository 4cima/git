// @ts-nocheck
'use client'

import { useEffect, useState, memo, lazy, Suspense, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Plus, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

const LazyReactPlayer = lazy(() => import('react-player'))

export type VideoItem = {
  id: string | number
  title: string
  slug?: string | null
  thumbnail?: string | null
  url?: string
  views?: number | null
  duration?: number | null
  category?: string | null
  quality?: string | null
  year?: number | null
  aggregate_rating?: number | null
  rating_count?: number
  review_count?: number
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
  return views.toString()
}

export const VideoCard = memo(
  ({ video, index = 0 }: { video: VideoItem; index?: number }) => {
    const [isHovered, setIsHovered] = useState(false)
    const [trailerKey, setTrailerKey] = useState<string | null>(null)
    const router = useRouter()
    
    const [imageSrc, setImageSrc] = useState(() => {
      const raw = video.thumbnail || ''
      if (raw.includes('maxresdefault')) {
        return raw
          .replace('maxresdefault', 'hqdefault')
          .replace('vi_webp', 'vi')
          .replace('.webp', '.jpg')
      }
      return raw
    })

    useEffect(() => {
      const raw = video.thumbnail || ''
      if (raw.includes('maxresdefault')) {
        setImageSrc(
          raw
            .replace('maxresdefault', 'hqdefault')
            .replace('vi_webp', 'vi')
            .replace('.webp', '.jpg')
        )
      } else {
        setImageSrc(raw)
      }
    }, [video.thumbnail])

    const handleImageError = () => {
      setImageSrc('')
    }

    const duration = video.duration ? formatDuration(video.duration) : ''
    const hasVisual = Boolean(imageSrc)
    const displayTitle = video.title || 'Untitled'
    const hasValidTitle = Boolean(displayTitle && displayTitle !== 'Untitled' && displayTitle !== 'بدون عنوان')

    const isSpecialCategory = 
      video.category === 'summary' ||
      video.category === 'video' ||
      video.category === 'plays'

    if (!isSpecialCategory && (!video.slug || video.slug.trim() === '' || video.slug === 'content')) {
      return null
    }

    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
      let mounted = true

      if (isHovered && !trailerKey) {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = setTimeout(async () => {
          try {
            // For videos, we might not have trailers, skip for now
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
    }, [isHovered, trailerKey, video.category, video.id])

    if (!hasVisual || !hasValidTitle) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className='relative group cursor-pointer'
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (
            video.category === 'summary' ||
            video.category === 'video' ||
            video.category === 'plays'
          ) {
            router.push(`/watch/video/${video.id}`)
            return
          }
          const type = video.category === 'series' || video.category === 'tv' ? 'series' : 'movies'
          router.push(`/${type}/${video.slug}`)
        }}
      >
        <div className='aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/5 relative'>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={displayTitle}
              className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 select-none'
              onError={handleImageError}
              loading='lazy'
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          ) : (
            <div className='w-full h-full flex flex-col items-center justify-center bg-zinc-800 p-4 text-center'>
              <Play className='text-zinc-600 mb-2 opacity-50' size={32} />
              <span className='text-[10px] font-medium text-zinc-500 line-clamp-2'>
                {displayTitle}
              </span>
            </div>
          )}

          {/* Lazy Video Player */}
          <AnimatePresence>
            {isHovered && trailerKey && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='absolute inset-0 z-10 bg-black'
              >
                <Suspense fallback={null}>
                  <LazyReactPlayer
                    url={`https://www.youtube.com/watch?v=${trailerKey}`}
                    width='100%'
                    height='100%'
                    playing
                    muted
                    loop
                    config={
                      {
                        youtube: {
                          playerVars: {
                            autoplay: 1,
                            controls: 0,
                            showinfo: 0,
                            modestbranding: 1,
                            rel: 0,
                            iv_load_policy: 3,
                          },
                        },
                      } as any
                    }
                    className='pointer-events-none scale-150'
                  />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay */}
          <div className='absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors' />

          {/* Play Button */}
          <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
            <div className='w-12 h-12 rounded-full bg-cyan-500/90 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-cyan-500/20 transform scale-50 group-hover:scale-100 transition-transform'>
              <Play fill='white' className='text-white ml-1' size={20} />
            </div>
          </div>

          {/* Duration Badge */}
          {duration && (
            <div className='absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-medium text-white backdrop-blur-sm'>
              {duration}
            </div>
          )}

          {/* Quality Badge */}
          {video.quality && (
            <div className='absolute top-2 left-2 px-1.5 py-0.5 rounded bg-cyan-500/80 text-[10px] font-bold text-white backdrop-blur-sm'>
              {video.quality}
            </div>
          )}
        </div>

        <div className='mt-3 h-[72px] flex flex-col justify-between space-y-1'>
          <h3 className='font-bold text-sm text-zinc-100 line-clamp-2 min-h-[40px] group-hover:text-cyan-400 transition-colors leading-snug'>
            {displayTitle}
          </h3>

          <div className='flex items-center justify-between text-xs text-zinc-500'>
            <div className='flex items-center gap-2'>
              {video.year && <span>{video.year}</span>}
              {video.views && (
                <>
                  <span className='w-1 h-1 rounded-full bg-zinc-700' />
                  <span>{formatViews(video.views)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  },
  (prev, next) => {
    return prev.video.id === next.video.id && prev.index === next.index
  }
)

VideoCard.displayName = 'VideoCard'
