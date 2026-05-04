// Quran Audio Player Types and Enums

/**
 * Player display modes
 */
export enum PlayerMode {
  MINI = 'MINI',   // Single player mode with all controls
  HIDDEN = 'HIDDEN' // Player completely hidden
}

/**
 * Repeat playback modes
 */
export enum RepeatMode {
  OFF = 'OFF',               // No repeat
  REPEAT_ONE = 'REPEAT_ONE', // Repeat current track
  REPEAT_ALL = 'REPEAT_ALL'  // Repeat entire queue
}

/**
 * Track type identifier
 */
export type TrackType = 'recitation' | 'sermon' | 'story'

/**
 * Enhanced Quran track with metadata
 */
export type QuranTrack = {
  id: number | string // Format: "{reciterId}-{surahId}" or "sermon-{id}" or "story-{id}"
  title: string // Surah name (Arabic or English based on lang)
  reciter: string // Reciter name (or scholar/narrator name for sermons/stories)
  url: string // Audio file URL
  image?: string | null // Reciter image or fallback
  type?: TrackType // Track type identifier (default: 'recitation')
  
  // Enhanced metadata
  surahNumber?: number // 1-114
  surahType?: 'Meccan' | 'Medinan'
  ayahCount?: number // Number of verses
  arabicName?: string // Arabic name
  englishName?: string // English name
  
  // Sermon/Story metadata
  category?: string // Category for sermons/stories
  duration?: number // Duration in seconds
  description?: string // Description for sermons/stories
}

/**
 * Sleep timer state
 */
export type SleepTimerState = {
  duration: number // Total duration in minutes
  endTime: number // Timestamp when timer expires
  startTime: number // Timestamp when timer started
}

/**
 * Player configuration for persistence
 */
export type PlayerConfig = {
  volume: number // 0-1
  playbackSpeed: number // 0.5-2.0
  repeatMode: RepeatMode
  shuffleMode: boolean
  playerMode: PlayerMode
}

/**
 * Queue state structure
 */
export type QueueState = {
  tracks: QuranTrack[]
  currentIndex: number
  shuffleHistory: string[] // Track IDs already played in shuffle mode
}
