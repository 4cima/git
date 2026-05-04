import { useState, useEffect } from 'react'
import { fetchSubtitles, SubtitleTrack } from '../../../lib/subtitles'
import { Search, Download, Check, Loader2, FileText, Globe } from 'lucide-react'
import { errorLogger } from '../../../services/errorLogging'

type Props = {
  tmdbId: number | string
  imdbId?: string
  title?: string
  onSelect?: (track: SubtitleTrack) => void
  currentLanguage?: string
}

export const SubtitleManager = ({ tmdbId, imdbId, title, onSelect, currentLanguage = 'ar' }: Props) => {
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let mounted = true
    const init = async () => {
      if (!imdbId && !tmdbId) return
      setLoading(true)
      try {
        const subs = await fetchSubtitles(tmdbId, imdbId, currentLanguage)
        if (mounted) {
          setSubtitles(subs)
          if (subs.length > 0 && onSelect) {
            // Auto-select the best one if requested
            onSelect(subs[0])
          }
        }
      } catch (err: any) {
        errorLogger.logError({
          message: 'Error fetching subtitles',
          severity: 'medium',
          category: 'network',
          context: { error: err, tmdbId, imdbId }
        })
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [tmdbId, imdbId, currentLanguage])

  const handleManualSearch = async () => {
    // Implement manual search logic if needed, or redirect to OpenSubtitles
    window.open(`https://www.opensubtitles.org/en/search/sublanguageid-${currentLanguage}/moviename-${title || query || imdbId}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 mt-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-primary font-bold">
          <Globe size={18} />
          <h3>Subtitle Engine</h3>
        </div>
        <div className="text-xs text-zinc-500">
          {loading ? 'Searching...' : `${subtitles.length} subtitles found`}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : subtitles.length > 0 ? (
        <div className="space-y-2 max-h-60 pr-2">
          {subtitles.map((sub, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-zinc-400 group-hover:text-primary" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-200">{sub.label}</span>
                  <span className="text-[10px] text-zinc-500 uppercase">{sub.srcLang}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onSelect && (
                  <button
                    onClick={() => onSelect(sub)}
                    className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all"
                    title="Apply to Player"
                  >
                    <Check size={14} />
                  </button>
                )}
                <a
                  href={sub.src}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:bg-white hover:text-black transition-all"
                  title="Download SRT"
                >
                  <Download size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 space-y-3">
          <p className="text-sm">No automatic subtitles found for this content.</p>
          <button
            onClick={handleManualSearch}
            className="text-xs bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary hover:text-black transition-all"
          >
            Search Manually on OpenSubtitles
          </button>
        </div>
      )}
    </div>
  )
}
