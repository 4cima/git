import { useState, useEffect, useRef } from 'react'
import { getProgress, upsertProgress, addHistory } from '../lib/supabase'
import { errorLogger } from '../services/errorLogging'

interface UseWatchProgressProps {
  user: any
  id: string | null
  type: string
  season: number | undefined
  episode: number | undefined
}

export const useWatchProgress = ({ user, id, type, season, episode }: UseWatchProgressProps) => {
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef(0)

  useEffect(() => {
    elapsedRef.current = elapsed
  }, [elapsed])

  useEffect(() => {
    let mounted = true

      // Initial fetch
      ; (async () => {
        if (!id) return

        if (user) {
          const p = await getProgress(user.id, id, (type === 'movie' ? 'movie' : 'tv'))
          if (!mounted) return
          if (p?.progress_seconds) setElapsed(p.progress_seconds)
        } else {
          // Guest: Read from local storage
          try {
            const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}')
            const key = `${type}_${id}${type === 'tv' ? `_${season}_${episode}` : ''}`
            if (guestProgress[key]) {
              setElapsed(guestProgress[key].progress)
            }
          } catch { }
        }
      })()

    // Interval save
    const timer = setInterval(() => {
      if (!id) return
      setElapsed((e) => {
        const next = e + 10

        if (user) {
          upsertProgress({
            userId: user.id,
            externalId: id,
            contentType: type === 'movie' ? 'movie' : 'tv',
            season: type === 'tv' ? season : null,
            episode: type === 'tv' ? episode : null,
            progressSeconds: next
          }).catch(() => { })
        } else {
          // Guest: Save to local storage
          try {
            const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}')
            const key = `${type}_${id}${type === 'tv' ? `_${season}_${episode}` : ''}`
            guestProgress[key] = {
              externalId: id,
              contentType: type,
              season: type === 'tv' ? season : null,
              episode: type === 'tv' ? episode : null,
              progress: next,
              updatedAt: Date.now()
            }
            localStorage.setItem('guest_progress', JSON.stringify(guestProgress))
          } catch { }
        }
        return next
      })
    }, 60000)

    const onVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && id) {
        if (user) {
          try {
            await upsertProgress({
              userId: user.id,
              externalId: id,
              contentType: type === 'movie' ? 'movie' : 'tv',
              season: type === 'tv' ? season : null,
              episode: type === 'tv' ? episode : null,
              progressSeconds: elapsedRef.current
            })
            await addHistory({
              userId: user.id,
              externalId: id,
              contentType: type === 'movie' ? 'movie' : 'tv',
              season: type === 'tv' ? season : null,
              episode: type === 'tv' ? episode : null
            })
          } catch (err: any) {
            errorLogger.logError({
              message: 'Failed to save history on visibility hidden',
              severity: 'low',
              category: 'user_action',
              context: { error: err, userId: user.id, externalId: id }
            })
          }
        }
      }
    }

    window.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('beforeunload', onVisibilityChange)

    return () => {
      mounted = false
      clearInterval(timer)
      window.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('beforeunload', onVisibilityChange)
    }
  }, [user, id, type, season, episode])

  return { elapsed, setElapsed }
}
