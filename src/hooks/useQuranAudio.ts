import { useCallback } from 'react'
import { useQuranPlayerStore } from '../state/useQuranPlayerStore'
import { RECITER_OVERRIDES } from '../data/quran'
import type { QuranReciter } from '../components/features/quran/ReciterList'
import { logger } from '../lib/logger'

export const useQuranAudio = () => {
  const { playTrack, currentTrack, isPlaying } = useQuranPlayerStore()

  const playSurah = useCallback((reciter: QuranReciter, surahId: number, surahName: string) => {
    if (!reciter) return

    // Get reliable server URL (use override if available)
    let serverUrl = RECITER_OVERRIDES[reciter.name] || reciter.server?.trim() || ''

    // Clean server URL (remove trailing slash if present) and ensure HTTPS
    if (serverUrl.endsWith('/')) {
      serverUrl = serverUrl.slice(0, -1)
    }
    if (serverUrl.startsWith('http:')) {
      serverUrl = serverUrl.replace('http:', 'https:')
    }
    
    if (!serverUrl) {
      logger.error("No server URL found for reciter:", reciter.name)
      return
    }

    // Pad ID with zeros (001, 002, ..., 114)
    const paddedId = surahId.toString().padStart(3, '0')
    const url = `${serverUrl}/${paddedId}.mp3`

    // Ensure image is HTTPS
    let imageUrl = reciter.image
    if (imageUrl && imageUrl.startsWith('http:')) {
      imageUrl = imageUrl.replace('http:', 'https:')
    }

    playTrack({
      id: `${reciter.id}-${surahId}`,
      title: surahName,
      reciter: reciter.name,
      url,
      image: imageUrl
    })
  }, [playTrack])

  const isCurrentTrack = useCallback((reciterId: number, surahId: number) => {
    if (!currentTrack) return false
    return currentTrack.id === `${reciterId}-${surahId}`
  }, [currentTrack])

  return {
    playSurah,
    isCurrentTrack,
    isPlaying,
    currentTrack
  }
}
