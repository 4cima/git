import { ChevronDown, ListVideo, Layers } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

type Props = {
  season: number | undefined
  episode: number | undefined
  setSeason: (s: number) => void
  setEpisode: (e: number) => void
  seasonsCount?: number
  episodesCount?: number
  lang?: 'ar' | 'en'
  availableEpisodes?: Record<string, boolean>
}

export const EpisodeSelector = ({
  season,
  episode,
  setSeason,
  setEpisode,
  seasonsCount = 1,
  episodesCount = 1,
  lang = 'ar',
  availableEpisodes = {}
}: Props) => {
  const [seasonOpen, setSeasonOpen] = useState(false)
  const [visibleEpisodes, setVisibleEpisodes] = useState(48)
  const [lastSeason, setLastSeason] = useState(season)

  // Guard: If season or episode is undefined, don't render
  if (season === undefined || episode === undefined) {
    return null
  }

  if (season !== lastSeason) {
    setVisibleEpisodes(48)
    setLastSeason(season)
  }

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const filteredEpisodes = Array.from({ length: episodesCount })
    .map((_, i) => i + 1)
    .filter(epNum => {
      const key = `${season}-${epNum}`
      if (availableEpisodes[key] === false) {
        const otherAvailable = Array.from({ length: episodesCount }).some((_, idx) => {
          const otherEp = idx + 1
          return otherEp !== epNum && availableEpisodes[`${season}-${otherEp}`] !== false
        })
        if (!otherAvailable) return true
        return false
      }
      return true
    })
  const renderedEpisodes = filteredEpisodes.slice(0, visibleEpisodes)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <ListVideo size={18} />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-tight">
            {t('قائمة الحلقات', 'Episode List')}
          </h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
            {episodesCount} {t('حلقة متاحة', 'Episodes Available')}
          </span>
        </div>
      </div>

      {/* Season Selector - Hidden since we moved it to Watch.tsx */}
      {false && seasonsCount > 1 && (
        <div className="relative z-20">
          <button
            onClick={() => setSeasonOpen(!seasonOpen)}
            className={clsx(
              "w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-black transition-all duration-300",
              seasonOpen
                ? "bg-primary border-primary text-black shadow-lg shadow-primary/20"
                : "bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.05] hover:border-white/20 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <Layers size={16} />
              <span>{t('الموسم', 'Season')} {season}</span>
            </div>
            <ChevronDown size={16} className={clsx("transition-transform duration-300", seasonOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {seasonOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-50 scrollbar-none"
              >
                <div className="p-2 grid grid-cols-1 gap-1">
                  {Array.from({ length: seasonsCount }).map((_, i) => {
                    const sNum = i + 1
                    const isSelected = season === sNum
                    return (
                      <button
                        key={sNum}
                        onClick={() => {
                          setSeason(sNum)
                          setEpisode(1)
                          setSeasonOpen(false)
                        }}
                        className={clsx(
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all",
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <span>{t('الموسم', 'Season')} {sNum}</span>
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,255,204,0.6)]" />}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Episodes Grid - Modern Mini Style */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 pr-1">
        {renderedEpisodes.map((epNum) => {
          const isActive = epNum === episode

          return (
            <motion.button
              key={epNum}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEpisode(epNum)}
              className={clsx(
                "group relative flex items-center justify-center rounded-lg border transition-all duration-300 h-9 w-full",
                isActive
                  ? "bg-primary border-primary text-black z-10"
                  : "bg-white/[0.02] border-white/[0.03] text-zinc-500 hover:bg-white/[0.08] hover:border-white/10 hover:text-white"
              )}
              animate={isActive ? {
                boxShadow: [
                  "0 0 0px rgba(0, 255, 204, 0)",
                  "0 0 20px rgba(0, 255, 204, 0.6)",
                  "0 0 0px rgba(0, 255, 204, 0)"
                ]
              } : {}}
              transition={isActive ? {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
            >
              {/* Inner Content Container */}
              <div className="relative z-10 flex items-center justify-center gap-1">
                <span className="text-[10px] font-bold opacity-70 uppercase tracking-tighter">EP</span>
                <span className="text-sm md:text-base font-black tracking-tight">{epNum}</span>
              </div>

              {isActive && (
                <motion.div
                  layoutId="active-episode"
                  className="absolute -inset-0.5 rounded-md border-2 border-primary pointer-events-none"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>
      {filteredEpisodes.length > renderedEpisodes.length && (
        <button
          onClick={() => setVisibleEpisodes((prev) => prev + 48)}
          className="w-full h-10 rounded-xl border border-white/10 bg-white/5 text-[11px] font-black text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          {t('عرض المزيد من الحلقات', 'Show More Episodes')}
        </button>
      )}
    </div>
  )
}
