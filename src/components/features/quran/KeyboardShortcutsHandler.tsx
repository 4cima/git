import { useEffect } from 'react'
import { useQuranPlayerStore } from '../../../state/useQuranPlayerStore'
import { PlayerMode, RepeatMode } from '../../../types/quran-player'

/**
 * KeyboardShortcutsHandler Component
 * 
 * Handles global keyboard shortcuts for the Quran audio player.
 * Shortcuts are ignored when user is typing in input fields.
 * 
 * Keyboard Shortcuts:
 * - Space: Toggle play/pause
 * - Right Arrow: Skip to next track
 * - Left Arrow: Skip to previous track
 * - Up Arrow: Increase volume by 10%
 * - Down Arrow: Decrease volume by 10%
 * - M: Toggle mute
 * - F: Toggle between FULL and MINI modes
 * - Escape: Minimize to MINI mode (from FULL)
 * - ?: Show keyboard shortcuts help overlay
 */
export const KeyboardShortcutsHandler = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when user is typing in input fields
      const target = e.target as HTMLElement
      const isTyping = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if (isTyping) return

      const state = useQuranPlayerStore.getState()
      
      switch (e.key.toLowerCase()) {
        case ' ': // Space - Toggle play/pause
          e.preventDefault()
          if (state.currentTrack) {
            state.toggle()
          }
          break

        case 'arrowright': // Right Arrow - Next track
          e.preventDefault()
          if (state.currentTrack) {
            // Use the skipNext logic from useAudioController
            const parts = state.currentTrack.id.toString().split('-')
            if (parts.length === 2) {
              const reciterId = parts[0]
              const surahId = parseInt(parts[1])
              if (surahId < 114) {
                const nextSurahId = surahId + 1
                const paddedId = nextSurahId.toString().padStart(3, '0')
                const nextUrl = state.currentTrack.url.replace(/\/\d{3}\.mp3$/, `/${paddedId}.mp3`)
                
                state.playTrack({
                  ...state.currentTrack,
                  id: `${reciterId}-${nextSurahId}`,
                  title: `Surah ${nextSurahId}`,
                  url: nextUrl
                })
              }
            }
          }
          break

        case 'arrowleft': // Left Arrow - Previous track
          e.preventDefault()
          if (state.currentTrack) {
            const parts = state.currentTrack.id.toString().split('-')
            if (parts.length === 2) {
              const reciterId = parts[0]
              const surahId = parseInt(parts[1])
              if (surahId > 1) {
                const prevSurahId = surahId - 1
                const paddedId = prevSurahId.toString().padStart(3, '0')
                const prevUrl = state.currentTrack.url.replace(/\/\d{3}\.mp3$/, `/${paddedId}.mp3`)
                
                state.playTrack({
                  ...state.currentTrack,
                  id: `${reciterId}-${prevSurahId}`,
                  title: `Surah ${prevSurahId}`,
                  url: prevUrl
                })
              }
            }
          }
          break

        case 'arrowup': // Up Arrow - Increase volume
          e.preventDefault()
          state.setVolume(Math.min(1, state.volume + 0.1))
          break

        case 'arrowdown': // Down Arrow - Decrease volume
          e.preventDefault()
          state.setVolume(Math.max(0, state.volume - 0.1))
          break

        case 'm': // M - Toggle mute
          e.preventDefault()
          state.setVolume(state.volume === 0 ? 0.8 : 0)
          break

        case 'f': // F - Toggle between MINI and HIDDEN modes
          e.preventDefault()
          if (state.playerMode === PlayerMode.MINI) {
            state.setPlayerMode(PlayerMode.HIDDEN)
          } else if (state.playerMode === PlayerMode.HIDDEN) {
            state.setPlayerMode(PlayerMode.MINI)
          }
          break

        case 'escape': // Escape - Hide player
          e.preventDefault()
          if (state.playerMode === PlayerMode.MINI) {
            state.setPlayerMode(PlayerMode.HIDDEN)
          }
          break

        case '?': // ? - Show keyboard shortcuts help
          e.preventDefault()
          state.toggleKeyboardHelp()
          break

        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return null // This component doesn't render anything
}
