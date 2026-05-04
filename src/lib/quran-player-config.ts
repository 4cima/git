import { RepeatMode, PlayerMode } from '../types/quran-player'

export interface PlayerConfig {
  volume: number
  playbackRate: number
  playbackSpeed: number
  autoPlay: boolean
  repeatMode: RepeatMode
  playerMode: PlayerMode
}

export const defaultPlayerConfig: PlayerConfig = {
  volume: 1,
  playbackRate: 1,
  playbackSpeed: 1,
  autoPlay: false,
  repeatMode: RepeatMode.OFF,
  playerMode: PlayerMode.MINI,
}

export const loadConfigFromStorage = (): PlayerConfig => {
  try {
    const stored = localStorage.getItem('quran-player-config')
    if (stored) {
      return { ...defaultPlayerConfig, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore errors
  }
  return defaultPlayerConfig
}

export const saveConfigToStorage = (config: PlayerConfig): void => {
  try {
    localStorage.setItem('quran-player-config', JSON.stringify(config))
  } catch {
    // Ignore errors
  }
}
