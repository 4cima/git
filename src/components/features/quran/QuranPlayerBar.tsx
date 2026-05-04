import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useQuranPlayerStore } from '../../../state/useQuranPlayerStore'
import { PlayerMode } from '../../../types/quran-player'
import { MiniPlayer } from './MiniPlayer'
import { useAudioController } from '../../../hooks/useAudioController'
import { useScreenReaderAnnouncements } from '../../../hooks/useScreenReaderAnnouncements'
import { useMediaSession } from '../../../hooks/useMediaSession'
import { useAutoHide } from '../../../hooks/useAutoHide'

export const QuranPlayerBar = () => {
  const { 
    currentTrack, 
    playerMode,
    setPlayerMode
  } = useQuranPlayerStore()
  
  const [prevTrackId, setPrevTrackId] = useState<string | number | undefined>(currentTrack?.id)

  // Initialize audio controller (MUST be before any early returns)
  useAudioController()

  // Initialize screen reader announcements (MUST be before any early returns)
  useScreenReaderAnnouncements()

  // Initialize Media Session API (MUST be before any early returns)
  useMediaSession()

  // Initialize auto-hide functionality (MUST be before any early returns)
  useAutoHide()

  // Handler for closing player
  const handleClose = () => {
    setPlayerMode(PlayerMode.HIDDEN)
  }

  // Reset track-specific state when track changes
  useEffect(() => {
    if (currentTrack?.id !== prevTrackId) {
      setPrevTrackId(currentTrack?.id)
    }
  }, [currentTrack?.id, prevTrackId])

  // Load config on mount
  useEffect(() => {
    useQuranPlayerStore.getState().loadConfig()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Save config before unmount
      useQuranPlayerStore.getState().saveConfig()
    }
  }, [])

  // Don't render anything if no track or player is hidden (AFTER all hooks)
  if (!currentTrack || playerMode === PlayerMode.HIDDEN) {
    return null
  }

  return (
    <AnimatePresence mode="wait">
      {playerMode === PlayerMode.MINI && (
        <MiniPlayer 
          key="mini"
          onClose={handleClose}
        />
      )}
    </AnimatePresence>
  )
}
