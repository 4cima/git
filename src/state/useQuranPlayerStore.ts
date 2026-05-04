import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { PlayerMode, RepeatMode, QuranTrack, SleepTimerState } from '../types/quran-player'
import { loadConfigFromStorage, saveConfigToStorage, PlayerConfig } from '../lib/quran-player-config'

interface QuranPlayerState {
  // Existing state
  currentTrack: QuranTrack | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  isLoading: boolean
  error: string | null

  // New state for 3-state system
  playerMode: PlayerMode

  // New state for advanced features
  playbackSpeed: number
  repeatMode: RepeatMode
  queue: QuranTrack[]
  currentQueueIndex: number

  // Sleep timer
  sleepTimer: SleepTimerState | null

  // UI state
  showQueue: boolean
  showKeyboardHelp: boolean
  opacity: number

  // Track completion callback for analytics
  onTrackComplete?: (trackId: string | number, trackType: 'recitation' | 'sermon' | 'story') => void

  // Existing actions
  playTrack: (track: QuranTrack) => void
  toggle: () => void
  stop: () => void
  setVolume: (value: number) => void
  seek: (time: number) => void
  skipNext: () => void
  skipPrev: () => void

  // Track completion callback setter
  setOnTrackComplete: (callback: ((trackId: string | number, trackType: 'recitation' | 'sermon' | 'story') => void) | undefined) => void

  // New actions
  setPlayerMode: (mode: PlayerMode) => void
  setPlaybackSpeed: (speed: number) => void
  setRepeatMode: (mode: RepeatMode) => void
  addToQueue: (track: QuranTrack) => void
  removeFromQueue: (index: number) => void
  reorderQueue: (fromIndex: number, toIndex: number) => void
  clearQueue: () => void
  setSleepTimer: (minutes: number | null) => void
  extendSleepTimer: (minutes: number) => void
  cancelSleepTimer: () => void
  toggleQueue: () => void
  toggleKeyboardHelp: () => void
  setOpacity: (opacity: number) => void

  // Configuration persistence
  loadConfig: () => void
  saveConfig: () => void

  // Internal updates (called by Audio Controller)
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}

export const useQuranPlayerStore = create<QuranPlayerState>()(
  devtools(
    (set, get) => ({
      // Existing state
      currentTrack: null,
      isPlaying: false,
      volume: 0.8,
      currentTime: 0,
      duration: 0,
      isLoading: false,
      error: null,

      // New state
      playerMode: PlayerMode.HIDDEN,
      playbackSpeed: 1.0,
      repeatMode: RepeatMode.OFF,
      queue: [],
      currentQueueIndex: 0,
      sleepTimer: null,
      showQueue: false,
      showKeyboardHelp: false,
      opacity: 1.0,

      // Existing actions
      playTrack: (track) => {
        const { playerMode } = get()

        // CRITICAL: Update lastTrackIdRef in the store action BEFORE state update
        // This prevents double loading in React StrictMode
        const audioController = (window as any).__audioController
        if (audioController && audioController.lastTrackIdRef) {
          audioController.lastTrackIdRef.current = track.id
        }

        // Always start playing when playTrack is called
        set({
          currentTrack: track,
          isPlaying: true,
          error: null,
          isLoading: true,
          playerMode: playerMode === PlayerMode.HIDDEN ? PlayerMode.MINI : playerMode
        })
      },

      toggle: () => {
        const { isPlaying, currentTrack } = get()
        if (!currentTrack) return
        set({ isPlaying: !isPlaying })
      },

      stop: () => {
        set({
          isPlaying: false,
          currentTrack: null,
          currentTime: 0,
          duration: 0,
          playerMode: PlayerMode.HIDDEN
        })
      },

      setVolume: (volume) => {
        const clampedVolume = Math.max(0, Math.min(1, volume))
        set({ volume: clampedVolume })
        get().saveConfig()
      },

      seek: (time) => {
        set({ currentTime: time })
      },

      skipNext: () => {
        // Will be implemented with repeat/shuffle logic
      },

      skipPrev: () => {
        // Will be implemented with history tracking
      },

      // Track completion callback setter
      setOnTrackComplete: (callback) => {
        set({ onTrackComplete: callback })
      },

      // New actions - Player mode
      setPlayerMode: (mode) => {
        // Stop playback when transitioning to HIDDEN
        if (mode === PlayerMode.HIDDEN) {
          set({
            playerMode: mode,
            isPlaying: false,
            currentTrack: null,
            currentTime: 0,
            duration: 0
          })
        } else {
          set({ playerMode: mode })
        }

        get().saveConfig()
      },

      // New actions - Playback control
      setPlaybackSpeed: (speed) => {
        const clampedSpeed = Math.max(0.5, Math.min(2.0, speed))
        set({ playbackSpeed: clampedSpeed })
        get().saveConfig()
      },

      setRepeatMode: (mode) => {
        set({ repeatMode: mode })
        get().saveConfig()
      },

      // New actions - Queue management
      addToQueue: (track) => {
        const { queue } = get()
        // Add unique queue key to prevent duplicate key warnings
        const queueTrack = { ...track, id: `${track.id}-q${Date.now()}` }
        set({ queue: [...queue, queueTrack] })
      },

      removeFromQueue: (index) => {
        const { queue } = get()
        set({ queue: queue.filter((_, i) => i !== index) })
      },

      reorderQueue: (fromIndex, toIndex) => {
        const { queue } = get()
        const newQueue = [...queue]
        const [removed] = newQueue.splice(fromIndex, 1)
        newQueue.splice(toIndex, 0, removed)
        set({ queue: newQueue })
      },

      clearQueue: () => {
        set({ queue: [], currentQueueIndex: 0 })
      },

      // New actions - Sleep timer
      setSleepTimer: (minutes) => {
        if (minutes === null) {
          set({ sleepTimer: null })
          return
        }

        const now = Date.now()
        set({
          sleepTimer: {
            duration: minutes,
            startTime: now,
            endTime: now + minutes * 60 * 1000
          }
        })
      },

      extendSleepTimer: (minutes) => {
        const { sleepTimer } = get()
        if (!sleepTimer) return

        set({
          sleepTimer: {
            ...sleepTimer,
            duration: sleepTimer.duration + minutes,
            endTime: sleepTimer.endTime + minutes * 60 * 1000
          }
        })
      },

      cancelSleepTimer: () => {
        set({ sleepTimer: null })
      },

      // New actions - UI state
      toggleQueue: () => {
        const { showQueue } = get()
        set({ showQueue: !showQueue })
      },

      toggleKeyboardHelp: () => {
        const { showKeyboardHelp } = get()
        set({ showKeyboardHelp: !showKeyboardHelp })
      },

      setOpacity: (opacity) => {
        const clampedOpacity = Math.max(0, Math.min(1, opacity))
        set({ opacity: clampedOpacity })
      },

      // Configuration persistence
      loadConfig: () => {
        const config = loadConfigFromStorage()
        set({
          volume: config.volume,
          playbackSpeed: config.playbackSpeed,
          repeatMode: config.repeatMode,
          playerMode: config.playerMode
        })
      },

      saveConfig: () => {
        const { volume, playbackSpeed, repeatMode, playerMode } = get()
        const config: PlayerConfig = {
          volume,
          playbackSpeed,
          playbackRate: playbackSpeed, // Use playbackSpeed as playbackRate
          autoPlay: false,
          repeatMode,
          playerMode
        }
        saveConfigToStorage(config)
      },

      // Internal updates
      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error })
    }),
    { name: 'QuranPlayerStore' }
  )
)
