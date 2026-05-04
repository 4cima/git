import { useEffect, useRef, useCallback } from 'react'
import { useQuranPlayerStore } from '../state/useQuranPlayerStore'
import { toast } from '../lib/toast-manager'
import { SURAHS } from '../data/quran'
import { logger } from '../lib/logger'

// Singleton Audio Instance
const audio = new Audio()
audio.preload = 'auto'

export const useAudioController = () => {
  const currentTrack = useQuranPlayerStore((s) => s.currentTrack)
  const isPlaying = useQuranPlayerStore((s) => s.isPlaying)
  const volume = useQuranPlayerStore((s) => s.volume)
  const playbackSpeed = useQuranPlayerStore((s) => s.playbackSpeed)
  const repeatMode = useQuranPlayerStore((s) => s.repeatMode)
  const setCurrentTime = useQuranPlayerStore((s) => s.setCurrentTime)
  const setDuration = useQuranPlayerStore((s) => s.setDuration)
  const setIsPlaying = useQuranPlayerStore((s) => s.setIsPlaying)
  const setIsLoading = useQuranPlayerStore((s) => s.setIsLoading)
  const setError = useQuranPlayerStore((s) => s.setError)
  const playTrack = useQuranPlayerStore((s) => s.playTrack)

  const isSeekingRef = useRef(false)
  const lastTrackIdRef = useRef<string | number | null>(null)
  const trackCompletedRef = useRef(false)
  const retryCountRef = useRef(0)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sleepTimerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fadeOutIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const originalVolumeRef = useRef<number>(0.8)
  const loadAbortControllerRef = useRef<AbortController | null>(null)

  // Expose lastTrackIdRef to window for store access
  useEffect(() => {
    (window as any).__audioController = { lastTrackIdRef }
    return () => {
      delete (window as any).__audioController
    }
  }, [])

  // Helper for Next/Prev Logic (Moved from Context)
  const handleNext = useCallback(() => {
    const state = useQuranPlayerStore.getState()
    if (!state.currentTrack) return

    try {
      // Handle repeat one mode
      if (state.repeatMode === 'REPEAT_ONE') {
        audio.currentTime = 0
        audio.play()
        return
      }

      // Check if there's a queue with items
      if (state.queue.length > 0) {
        // Find current track in queue
        const currentIndex = state.queue.findIndex(track => track.id === state.currentTrack?.id)

        if (currentIndex !== -1 && currentIndex < state.queue.length - 1) {
          // Play next track from queue
          const nextTrack = state.queue[currentIndex + 1]
          playTrack(nextTrack)
          return
        } else if (currentIndex === state.queue.length - 1) {
          // Last track in queue
          if (state.repeatMode === 'REPEAT_ALL') {
            // Loop back to first track in queue
            playTrack(state.queue[0])
            return
          } else {
            // Stop playback (queue finished)
            setIsPlaying(false)
            return
          }
        }
      }

      // If repeat mode is OFF and no queue, stop playback after current track
      if (state.repeatMode === 'OFF') {
        setIsPlaying(false)
        return
      }

      const parts = state.currentTrack.id.toString().split('-')

      if (parts.length === 2) {
        const reciterId = parts[0]
        const surahId = parseInt(parts[1])

        // REPEAT_ALL mode: continue to next track
        if (surahId < 114) {
          const nextSurahId = surahId + 1
          const paddedId = nextSurahId.toString().padStart(3, '0')
          const nextUrl = state.currentTrack.url.replace(/\/\d{3}\.mp3$/, `/${paddedId}.mp3`)

          const nextSurah = SURAHS.find(s => s.id === nextSurahId)
          const nextTitle = nextSurah?.name || `Surah ${nextSurahId}`

          playTrack({
            ...state.currentTrack,
            id: `${reciterId}-${nextSurahId}`,
            title: nextTitle,
            url: nextUrl
          })
        } else {
          // End of playlist - loop back to first surah
          const nextUrl = state.currentTrack.url.replace(/\/\d{3}\.mp3$/, '/001.mp3')
          const nextSurah = SURAHS.find(s => s.id === 1)
          const nextTitle = nextSurah?.name || 'Surah 1'

          playTrack({
            ...state.currentTrack,
            id: `${reciterId}-1`,
            title: nextTitle,
            url: nextUrl
          })
        }
      }
    } catch (e: any) {
      logger.error("Skip failed", e)
    }
  }, [playTrack, setIsPlaying])

  // 1. Handle Volume
  useEffect(() => {
    audio.volume = volume
  }, [volume])

  // 2. Handle Playback Speed
  useEffect(() => {
    audio.playbackRate = playbackSpeed
    audio.preservesPitch = true // Prevent chipmunk effect
  }, [playbackSpeed])

  // 3. Handle Sleep Timer
  useEffect(() => {
    const state = useQuranPlayerStore.getState()

    // Clear existing intervals
    if (sleepTimerIntervalRef.current) {
      clearInterval(sleepTimerIntervalRef.current)
      sleepTimerIntervalRef.current = null
    }
    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current)
      fadeOutIntervalRef.current = null
    }

    if (!state.sleepTimer) {
      // Restore original volume if timer was cancelled
      if (originalVolumeRef.current !== audio.volume) {
        audio.volume = originalVolumeRef.current
      }
      return
    }

    // Store original volume
    originalVolumeRef.current = audio.volume

    // Check timer every second
    sleepTimerIntervalRef.current = setInterval(() => {
      const currentState = useQuranPlayerStore.getState()
      if (!currentState.sleepTimer) return

      const now = Date.now()
      const remaining = currentState.sleepTimer.endTime - now

      // Show notification when 1 minute remains
      if (remaining <= 60000 && remaining > 59000) {
        toast.info('سيتوقف التشغيل بعد دقيقة واحدة')
      }

      // Start fade-out when 5 seconds remain
      if (remaining <= 5000 && remaining > 0) {
        if (!fadeOutIntervalRef.current) {
          const startVolume = audio.volume
          const fadeSteps = 50 // 50 steps over 5 seconds = 100ms per step
          let currentStep = 0

          fadeOutIntervalRef.current = setInterval(() => {
            currentStep++
            const newVolume = startVolume * (1 - currentStep / fadeSteps)
            audio.volume = Math.max(0, newVolume)

            if (currentStep >= fadeSteps) {
              if (fadeOutIntervalRef.current) {
                clearInterval(fadeOutIntervalRef.current)
                fadeOutIntervalRef.current = null
              }
            }
          }, 100)
        }
      }

      // Stop playback when timer expires
      if (remaining <= 0) {
        audio.pause()
        setIsPlaying(false)
        useQuranPlayerStore.getState().cancelSleepTimer()
        toast.success('توقف التشغيل - مؤقت النوم')

        // Restore original volume
        audio.volume = originalVolumeRef.current

        if (sleepTimerIntervalRef.current) {
          clearInterval(sleepTimerIntervalRef.current)
          sleepTimerIntervalRef.current = null
        }
      }
    }, 1000)

    return () => {
      if (sleepTimerIntervalRef.current) {
        clearInterval(sleepTimerIntervalRef.current)
        sleepTimerIntervalRef.current = null
      }
      if (fadeOutIntervalRef.current) {
        clearInterval(fadeOutIntervalRef.current)
        fadeOutIntervalRef.current = null
      }
    }
  }, [useQuranPlayerStore.getState().sleepTimer, setIsPlaying])

  // 4. Handle Track Changes AND Play/Pause (unified)
  useEffect(() => {
    if (!currentTrack) {
      // Cancel any ongoing load
      if (loadAbortControllerRef.current) {
        loadAbortControllerRef.current.abort()
        loadAbortControllerRef.current = null
      }

      audio.pause()
      audio.src = ''
      lastTrackIdRef.current = null
      retryCountRef.current = 0
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
        errorTimeoutRef.current = null
      }
      return
    }

    const trackId = currentTrack.id
    const trackUrl = currentTrack.url
    const trackTitle = currentTrack.title

    // NEW TRACK: Load and play
    if (lastTrackIdRef.current !== trackId) {
      // Cancel any previous load
      if (loadAbortControllerRef.current) {
        loadAbortControllerRef.current.abort()
      }

      const abortController = new AbortController()
      loadAbortControllerRef.current = abortController

      const loadAndPlay = async () => {
        try {
          if (abortController.signal.aborted) return

          audio.src = trackUrl
          trackCompletedRef.current = false
          retryCountRef.current = 0
          setIsLoading(true)
          setError(null)

          if (abortController.signal.aborted) return

          try {
            await audio.play()

            if (abortController.signal.aborted) {
              audio.pause()
              return
            }

            setIsPlaying(true)
          } catch (playErr: any) {
            if (abortController.signal.aborted) return

            if (playErr.name === 'NotAllowedError') {
              setIsPlaying(false)
            } else {
              throw playErr
            }
          }
        } catch (err: any) {
          if (abortController.signal.aborted) return

          // Suppress AbortError in console - it's expected in StrictMode
          if (err.name === 'AbortError') {
            return
          }

          console.error('❌ Play failed:', err)
          setIsPlaying(false)
          setIsLoading(false)

          if (err.name !== 'AbortError') {
            if (retryCountRef.current < 3) {
              retryCountRef.current++
              setError(`جاري إعادة المحاولة (${retryCountRef.current}/3)...`)

              errorTimeoutRef.current = setTimeout(() => {
                if (!abortController.signal.aborted) {
                  lastTrackIdRef.current = null
                  playTrack(currentTrack)
                }
              }, 1000)
            } else {
              setError('فشل تحميل الملف الصوتي. الانتقال للتالي...')
              toast.error('فشل تحميل الملف الصوتي')

              errorTimeoutRef.current = setTimeout(() => {
                if (!abortController.signal.aborted) {
                  handleNext()
                }
              }, 3000)
            }
          }
        }
      }

      loadAndPlay()

      return () => {
        abortController.abort()
      }
    }

    // SAME TRACK: Just toggle play/pause
    else {
      if (isPlaying) {
        audio.play().catch((err) => {
          if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
            console.error('Play error:', err)
          }
        })
      } else {
        audio.pause()
      }
    }

  }, [currentTrack, isPlaying, playTrack, handleNext, setIsPlaying])

  // 5. Bind Events (Run once)
  useEffect(() => {
    const handleTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(audio.currentTime)
      }

      // Track completion detection at 95%
      if (audio.duration > 0) {
        const progress = (audio.currentTime / audio.duration) * 100

        // Preload next track at 80%
        if (progress >= 80 && progress < 95) {
          const state = useQuranPlayerStore.getState()
          if (state.currentTrack) {
            const parts = state.currentTrack.id.toString().split('-')
            if (parts.length === 2) {
              const surahId = parseInt(parts[1])
              if (surahId < 114) {
                const nextSurahId = surahId + 1
                const paddedId = nextSurahId.toString().padStart(3, '0')
                const nextUrl = state.currentTrack.url.replace(/\/\d{3}\.mp3$/, `/${paddedId}.mp3`)

                // Preload next track
                const preloadAudio = new Audio()
                preloadAudio.preload = 'metadata'
                preloadAudio.src = nextUrl
              }
            }
          }
        }

        if (progress >= 95 && !trackCompletedRef.current) {
          trackCompletedRef.current = true

          const state = useQuranPlayerStore.getState()
          const track = state.currentTrack

          if (track && state.onTrackComplete) {
            const trackType = track.type || 'recitation'
            state.onTrackComplete(track.id, trackType)
          }
        }
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }

    const handleEnded = () => {
      // Prevent double-call using timestamp check
      const now = Date.now()
      const lastCallTime = (window as any).__lastHandleEndedTime || 0

      // If called within 500ms, it's a duplicate call from StrictMode
      if (now - lastCallTime < 500) {
        return
      }

      (window as any).__lastHandleEndedTime = now

      setIsPlaying(false)
      // Auto-next logic
      handleNext()
    }

    const handleError = (e: Event) => {
      // Suppress audio errors in console - they're handled gracefully
      setIsLoading(false)
      setIsPlaying(false)
      setError("Failed to load audio")
    }

    const handleWaiting = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [handleNext])

  // Expose seeking handler to update audio immediately
  // We subscribe to store changes for seek? No, usually UI calls seek action.
  // But store.seek just updates state. We need to sync audio.
  // Actually, better to have a dedicated effect for currentTime ONLY if it differs significantly?
  // Or better: UI calls `audio.currentTime = time` AND `setCurrentTime(time)`.
  // Let's make `seek` action in store trigger a side effect here?
  // Zustand subscribe is good for this.

  useEffect(() => {
    const unsub = useQuranPlayerStore.subscribe(
      (state, prevState) => {
        const currentTime = state.currentTime
        if (currentTime === prevState.currentTime) return
        if (Math.abs(currentTime - audio.currentTime) > 1.5) {
          audio.currentTime = currentTime
        }
      }
    )
    return unsub
  }, [])
}
