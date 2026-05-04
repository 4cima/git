import { useCallback, useEffect } from 'react'
import { useQuranPlayerStore } from '../state/useQuranPlayerStore'
import { wasRecentlyPlayed, recordPlayTracking } from '../lib/play-tracking'
import type { Sermon } from '../types/quran-sermons'
import { logger } from '../lib/logger'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export const useSermonAudio = () => {
  const { playTrack, currentTrack, isPlaying, setOnTrackComplete } = useQuranPlayerStore()

  // Track play completion for analytics
  const trackPlayCompletion = useCallback(async (sermonId: number) => {
    try {
      // Check if recently played to prevent duplicate increments
      const trackId = `sermon-${sermonId}`
      if (wasRecentlyPlayed(trackId, 'sermon')) {
        logger.info('Sermon was recently played, skipping play count increment')
        return
      }

      // Increment play count in database
      const response = await fetch(`${API_BASE}/api/quran/sermons/${sermonId}/play`, {
        method: 'POST'
      })

      if (response.ok) {
        // Record in localStorage to prevent duplicates
        recordPlayTracking(trackId, 'sermon')
        logger.info('Sermon play count incremented successfully')
      }
    } catch (error: any) {
      logger.error('Failed to track sermon play completion:', error)
      // Don't throw - this is analytics, shouldn't break playback
    }
  }, [])

  // Set up track completion callback for sermons
  useEffect(() => {
    const handleTrackComplete = (trackId: string | number, trackType: 'recitation' | 'sermon' | 'story') => {
      if (trackType === 'sermon' && typeof trackId === 'string' && trackId.startsWith('sermon-')) {
        const sermonId = parseInt(trackId.replace('sermon-', ''))
        if (!isNaN(sermonId)) {
          trackPlayCompletion(sermonId)
        }
      }
    }

    setOnTrackComplete(handleTrackComplete)

    // Cleanup on unmount
    return () => {
      setOnTrackComplete(undefined)
    }
  }, [trackPlayCompletion, setOnTrackComplete])

  const playSermon = useCallback((sermon: Sermon) => {
    // Ensure HTTPS URL
    let audioUrl = sermon.audio_url
    if (audioUrl.startsWith('http:')) {
      audioUrl = audioUrl.replace('http:', 'https:')
    }
    
    // Ensure scholar image is HTTPS
    let imageUrl = sermon.scholar_image
    if (imageUrl && imageUrl.startsWith('http:')) {
      imageUrl = imageUrl.replace('http:', 'https:')
    }

    playTrack({
      id: `sermon-${sermon.id}`,
      title: sermon.title_ar, // Will be switched based on lang in player
      reciter: sermon.scholar_name_ar, // Scholar name
      url: audioUrl,
      image: imageUrl,
      type: 'sermon',
      category: sermon.category,
      duration: sermon.duration_seconds,
      description: sermon.description_ar || undefined
    })
  }, [playTrack])

  const isCurrentSermon = useCallback((sermonId: number) => {
    if (!currentTrack) return false
    return currentTrack.id === `sermon-${sermonId}`
  }, [currentTrack])

  return {
    playSermon,
    isCurrentSermon,
    trackPlayCompletion,
    isPlaying,
    currentTrack
  }
}
