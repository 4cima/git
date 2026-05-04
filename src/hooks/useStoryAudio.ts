import { useCallback, useEffect } from 'react'
import { useQuranPlayerStore } from '../state/useQuranPlayerStore'
import { wasRecentlyPlayed, recordPlayTracking } from '../lib/play-tracking'
import type { Story } from '../types/quran-stories'
import { logger } from '../lib/logger'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export const useStoryAudio = () => {
  const { playTrack, currentTrack, isPlaying, setOnTrackComplete } = useQuranPlayerStore()

  // Track play completion for analytics
  const trackPlayCompletion = useCallback(async (storyId: number) => {
    try {
      // Check if recently played to prevent duplicate increments
      const trackId = `story-${storyId}`
      if (wasRecentlyPlayed(trackId, 'story')) {
        logger.info('Story was recently played, skipping play count increment')
        return
      }

      // Increment play count in database
      const response = await fetch(`${API_BASE}/api/quran/stories/${storyId}/play`, {
        method: 'POST'
      })

      if (response.ok) {
        // Record in localStorage to prevent duplicates
        recordPlayTracking(trackId, 'story')
        logger.info('Story play count incremented successfully')
      }
    } catch (error: any) {
      logger.error('Failed to track story play completion:', error)
      // Don't throw - this is analytics, shouldn't break playback
    }
  }, [])

  // Set up track completion callback for stories
  useEffect(() => {
    const handleTrackComplete = (trackId: string | number, trackType: 'recitation' | 'sermon' | 'story') => {
      if (trackType === 'story' && typeof trackId === 'string' && trackId.startsWith('story-')) {
        const storyId = parseInt(trackId.replace('story-', ''))
        if (!isNaN(storyId)) {
          trackPlayCompletion(storyId)
        }
      }
    }

    setOnTrackComplete(handleTrackComplete)

    // Cleanup on unmount
    return () => {
      setOnTrackComplete(undefined)
    }
  }, [trackPlayCompletion, setOnTrackComplete])

  const playStory = useCallback((story: Story) => {
    // Ensure HTTPS URL
    let audioUrl = story.audio_url
    if (audioUrl.startsWith('http:')) {
      audioUrl = audioUrl.replace('http:', 'https:')
    }
    
    // Ensure narrator image is HTTPS
    let imageUrl = story.narrator_image
    if (imageUrl && imageUrl.startsWith('http:')) {
      imageUrl = imageUrl.replace('http:', 'https:')
    }

    playTrack({
      id: `story-${story.id}`,
      title: story.title_ar,
      reciter: story.narrator_name_ar, // Narrator name
      url: audioUrl,
      image: imageUrl,
      type: 'story',
      category: story.category,
      duration: story.duration_seconds,
      description: story.description_ar || undefined
    })
  }, [playTrack])

  const isCurrentStory = useCallback((storyId: number) => {
    if (!currentTrack) return false
    return currentTrack.id === `story-${storyId}`
  }, [currentTrack])

  return {
    playStory,
    isCurrentStory,
    trackPlayCompletion,
    isPlaying,
    currentTrack
  }
}
