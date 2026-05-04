import { useEffect } from 'react'
import { useQuranPlayerStore } from '../state/useQuranPlayerStore'
import { NATURE_IMAGES } from '../data/quran'

/**
 * Custom hook for Media Session API integration
 * Enables system-level media controls (lock screen, notification center, etc.)
 */
export const useMediaSession = () => {
  const { 
    currentTrack, 
    isPlaying, 
    toggle,
    skipNext,
    skipPrev,
    currentTime,
    duration,
    playbackSpeed
  } = useQuranPlayerStore()

  // Check for Media Session API support
  const isSupported = 'mediaSession' in navigator

  useEffect(() => {
    if (!isSupported || !currentTrack) return

    // Update metadata
    const getFallbackImage = () => {
      if (!currentTrack) return NATURE_IMAGES[0]
      const idNum = typeof currentTrack.id === 'string' 
        ? parseInt(currentTrack.id.split('-')[0]) || 0 
        : 0
      return NATURE_IMAGES[idNum % NATURE_IMAGES.length]
    }

    const artwork = currentTrack.image || getFallbackImage()

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.reciter,
      album: currentTrack.type === 'sermon' 
        ? 'Islamic Sermons' 
        : currentTrack.type === 'story'
        ? 'Islamic Stories'
        : 'Quran Recitations',
      artwork: [
        { src: artwork, sizes: '96x96', type: 'image/jpeg' },
        { src: artwork, sizes: '128x128', type: 'image/jpeg' },
        { src: artwork, sizes: '192x192', type: 'image/jpeg' },
        { src: artwork, sizes: '256x256', type: 'image/jpeg' },
        { src: artwork, sizes: '384x384', type: 'image/jpeg' },
        { src: artwork, sizes: '512x512', type: 'image/jpeg' }
      ]
    })

    // Register action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      if (!isPlaying) {
        toggle()
      }
    })

    navigator.mediaSession.setActionHandler('pause', () => {
      if (isPlaying) {
        toggle()
      }
    })

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      skipPrev()
    })

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      skipNext()
    })

    // Seek handlers (optional, not all browsers support)
    try {
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10
        const newTime = Math.max(0, currentTime - skipTime)
        useQuranPlayerStore.getState().seek(newTime)
      })

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10
        const newTime = Math.min(duration, currentTime + skipTime)
        useQuranPlayerStore.getState().seek(newTime)
      })

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          useQuranPlayerStore.getState().seek(details.seekTime)
        }
      })
    } catch (error: any) {
      // Seek actions not supported in this browser
      console.debug('Media Session seek actions not supported:', error)
    }

    // Cleanup on unmount
    return () => {
      if (isSupported) {
        navigator.mediaSession.metadata = null
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
        
        try {
          navigator.mediaSession.setActionHandler('seekbackward', null)
          navigator.mediaSession.setActionHandler('seekforward', null)
          navigator.mediaSession.setActionHandler('seekto', null)
        } catch {
          // Ignore if not supported
        }
      }
    }
  }, [currentTrack?.id, isSupported])

  // Update position state in real-time
  useEffect(() => {
    if (!isSupported || !currentTrack) return

    try {
      navigator.mediaSession.setPositionState({
        duration: duration || 0,
        playbackRate: playbackSpeed,
        position: currentTime || 0
      })
    } catch (error: any) {
      // Position state not supported or invalid values
      console.debug('Media Session position state error:', error)
    }
  }, [currentTime, duration, playbackSpeed, isSupported, currentTrack])

  // Update playback state
  useEffect(() => {
    if (!isSupported) return

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying, isSupported])

  return { isSupported }
}
