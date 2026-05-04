/**
 * WatchlistCard Component
 * 
 * Displays a watchlist item with full content details or placeholder for unavailable content.
 * Handles null content gracefully (content missing from CockroachDB).
 * 
 * Task 13.2: Create WatchlistCard component
 * Requirements: 11.1, 11.4
 */

import Link from 'next/link'
import { Trash2, AlertCircle } from 'lucide-react'
import { ContentDetails } from '../../../services/contentAPI'

interface WatchlistCardProps {
  external_id: string
  content_type: 'movie' | 'tv'
  content: ContentDetails | null
  onRemove: () => void
  created_at?: string
}

export const WatchlistCard = ({ 
  external_id, 
  content_type, 
  content, 
  onRemove,
  created_at 
}: WatchlistCardProps) => {
  // Content not found in CockroachDB - show placeholder
  if (!content) {
    return (
      <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl border border-red-500/20 hover:bg-zinc-800/50 transition-all group">
        <div className="w-12 h-16 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <AlertCircle size={20} className="text-red-500/50" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-red-400">المحتوى غير متوفر</h4>
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
            Content Unavailable
          </p>
          <p className="text-[9px] text-zinc-600 mt-0.5">
            ID: {external_id} • Type: {content_type}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100"
          title="إزالة من قائمة المتابعة"
        >
          <Trash2 size={16} />
        </button>
      </div>
    )
  }

  // Content found - display full details
  const title = content.title || content.name || 'Untitled'
  const posterUrl = content.poster_url || '/default-poster.jpg'
  const slug = content.slug
  const year = content.release_date?.substring(0, 4) || content.first_air_date?.substring(0, 4) || ''
  const rating = content.vote_average ? content.vote_average.toFixed(1) : null

  return (
    <div className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-all group">
      <Link 
        href={`/${content_type}/${slug}`}
        className="flex-shrink-0"
      >
        <img 
          src={posterUrl} 
          alt={title} 
          className="w-12 h-16 object-cover rounded border border-white/5 group-hover:border-lumen-gold/30 transition-all"
          onError={(e) => e.currentTarget.src = '/default-poster.jpg'}
          loading="lazy"
          decoding="async"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link 
          href={`/${content_type}/${slug}`}
          className="block"
        >
          <h4 className="text-sm font-bold text-white truncate group-hover:text-lumen-gold transition-colors">
            {title}
          </h4>
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          {year && (
            <span className="text-[10px] text-zinc-500 font-medium">{year}</span>
          )}
          {rating && (
            <span className="text-[10px] text-lumen-gold font-bold">⭐ {rating}</span>
          )}
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider">
            {content_type === 'movie' ? 'فيلم' : 'مسلسل'}
          </span>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100"
        title="إزالة من قائمة المتابعة"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

