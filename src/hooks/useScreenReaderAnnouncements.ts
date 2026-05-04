import { useEffect, useRef } from 'react'
import { useQuranPlayerStore } from '../state/useQuranPlayerStore'
import { useLang } from '../state/useLang'
import { PlayerMode, RepeatMode } from '../types/quran-player'

/**
 * Custom hook for screen reader announcements
 * Announces important state changes to assistive technologies
 */
export const useScreenReaderAnnouncements = () => {
  const { lang } = useLang()
  const announcerRef = useRef<HTMLDivElement | null>(null)
  
  const { 
    isPlaying, 
    currentTrack, 
    volume, 
    playerMode,
    repeatMode,
    playbackSpeed
  } = useQuranPlayerStore()

  // Create announcer element on mount
  useEffect(() => {
    const announcer = document.createElement('div')
    announcer.setAttribute('role', 'status')
    announcer.setAttribute('aria-live', 'polite')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.style.position = 'absolute'
    announcer.style.left = '-10000px'
    announcer.style.width = '1px'
    announcer.style.height = '1px'
    announcer.style.overflow = 'hidden'
    
    document.body.appendChild(announcer)
    announcerRef.current = announcer

    return () => {
      if (announcerRef.current) {
        document.body.removeChild(announcerRef.current)
      }
    }
  }, [])

  // Announce play/pause state changes
  useEffect(() => {
    if (!announcerRef.current || !currentTrack) return
    
    const message = isPlaying
      ? lang === 'ar' 
        ? `تشغيل ${currentTrack.title}`
        : `Playing ${currentTrack.title}`
      : lang === 'ar'
        ? `إيقاف مؤقت ${currentTrack.title}`
        : `Paused ${currentTrack.title}`
    
    announcerRef.current.textContent = message
  }, [isPlaying, currentTrack?.id, lang])

  // Announce track changes
  useEffect(() => {
    if (!announcerRef.current || !currentTrack) return
    
    const message = lang === 'ar'
      ? `الآن: ${currentTrack.title} - ${currentTrack.reciter}`
      : `Now playing: ${currentTrack.title} by ${currentTrack.reciter}`
    
    announcerRef.current.textContent = message
  }, [currentTrack?.id, lang])

  // Announce volume changes
  const prevVolumeRef = useRef(volume)
  useEffect(() => {
    if (!announcerRef.current) return
    
    // Only announce if volume actually changed
    if (Math.abs(volume - prevVolumeRef.current) > 0.05) {
      const volumePercent = Math.round(volume * 100)
      const message = lang === 'ar'
        ? `مستوى الصوت ${volumePercent}%`
        : `Volume ${volumePercent}%`
      
      announcerRef.current.textContent = message
      prevVolumeRef.current = volume
    }
  }, [volume, lang])

  // Announce mode transitions
  const prevModeRef = useRef(playerMode)
  useEffect(() => {
    if (!announcerRef.current) return
    
    if (playerMode !== prevModeRef.current) {
      let message = ''
      
      if (playerMode === PlayerMode.MINI) {
        message = lang === 'ar' ? 'المشغل مصغر' : 'Player minimized'
      } else if (playerMode === PlayerMode.HIDDEN) {
        message = lang === 'ar' ? 'المشغل مخفي' : 'Player hidden'
      }
      
      announcerRef.current.textContent = message
      prevModeRef.current = playerMode
    }
  }, [playerMode, lang])

  // Announce repeat mode changes
  const prevRepeatRef = useRef(repeatMode)
  useEffect(() => {
    if (!announcerRef.current) return
    
    if (repeatMode !== prevRepeatRef.current) {
      let message = ''
      
      if (repeatMode === RepeatMode.OFF) {
        message = lang === 'ar' ? 'التكرار متوقف' : 'Repeat off'
      } else if (repeatMode === RepeatMode.REPEAT_ONE) {
        message = lang === 'ar' ? 'تكرار السورة الحالية' : 'Repeat current surah'
      } else if (repeatMode === RepeatMode.REPEAT_ALL) {
        message = lang === 'ar' ? 'تكرار جميع السور' : 'Repeat all surahs'
      }
      
      announcerRef.current.textContent = message
      prevRepeatRef.current = repeatMode
    }
  }, [repeatMode, lang])

  // Announce playback speed changes
  const prevSpeedRef = useRef(playbackSpeed)
  useEffect(() => {
    if (!announcerRef.current) return
    
    if (Math.abs(playbackSpeed - prevSpeedRef.current) > 0.01) {
      const message = lang === 'ar'
        ? `سرعة التشغيل ${playbackSpeed}x`
        : `Playback speed ${playbackSpeed}x`
      
      announcerRef.current.textContent = message
      prevSpeedRef.current = playbackSpeed
    }
  }, [playbackSpeed, lang])
}
