'use client'

import { motion } from 'framer-motion'
import { Star, Calendar } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

interface MovieCardProps {
  id: number
  slug: string
  title_ar: string
  title_en?: string
  poster_path: string
  vote_average: number
  year?: number
  primary_genre?: string
  overview_ar?: string
  media_type: 'movie' | 'tv'
}

export function MovieCard({
  id,
  slug,
  title_ar,
  title_en,
  poster_path,
  vote_average,
  year,
  primary_genre,
  overview_ar,
  media_type
}: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const imageUrl = poster_path?.startsWith('http')
    ? poster_path
    : `https://image.tmdb.org/t/p/w342${poster_path}`

  const fallbackImage = '/placeholder-poster.jpg'
  const linkUrl = media_type === 'movie' ? `/movies/${slug}` : `/series/${slug}`

  return (
    <motion.div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Link href={linkUrl}>
        <div className="relative w-40 aspect-[2/3] rounded-lg overflow-hidden shadow-lg shadow-black/50 bg-zinc-900">
          {/* الصورة الرئيسية */}
          <Image
            src={imageError ? fallbackImage : imageUrl}
            alt={title_ar || title_en || 'Movie Poster'}
            fill
            sizes="160px"
            className="object-cover"
            onError={() => setImageError(true)}
            priority={false}
          />

          {/* Badge التصنيف في أعلى اليمين */}
          {primary_genre && (
            <div className="absolute top-2 right-2 z-10">
              <span className="inline-block px-2 py-0.5 text-[10px] font-semibold text-white bg-purple-600/80 backdrop-blur-sm rounded-full">
                {primary_genre}
              </span>
            </div>
          )}

          {/* Gradient في الأسفل */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent z-[1]" />

          {/* المعلومات الأساسية */}
          <div className="absolute inset-x-0 bottom-0 p-3 z-[2]">
            {/* السنة + التقييم */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              {year && (
                <div className="flex items-center gap-1 text-gray-300">
                  <Calendar className="w-3 h-3" />
                  <span className="text-[10px] font-medium">{year}</span>
                </div>
              )}
              {vote_average > 0 && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-[10px] font-bold">{vote_average.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* العنوان */}
            <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">
              {title_ar || title_en || 'بدون عنوان'}
            </h3>
          </div>

          {/* الوصف عند الـ Hover */}
          {overview_ar && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: isHovered ? 1 : 0,
                y: isHovered ? 0 : 10
              }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-sm z-[3] p-3 flex flex-col justify-center pointer-events-none"
            >
              <h4 className="text-white font-bold text-sm mb-2 line-clamp-2">
                {title_ar || title_en}
              </h4>
              <p className="text-gray-300 text-[11px] leading-relaxed line-clamp-6">
                {overview_ar}
              </p>
              <div className="mt-auto pt-3 flex items-center justify-between">
                {year && (
                  <div className="flex items-center gap-1 text-cyan-400">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-medium">{year}</span>
                  </div>
                )}
                {vote_average > 0 && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs font-bold">{vote_average.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Overlay للتفاعل */}
          <div className="absolute inset-0 ring-2 ring-transparent group-hover:ring-cyan-400/50 transition-all duration-300 rounded-lg pointer-events-none z-[4]" />
        </div>
      </Link>
    </motion.div>
  )
}
