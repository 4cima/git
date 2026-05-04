export const wasRecentlyPlayed = (id: string, thresholdOrType?: number | string): boolean => {
  try {
    const lastPlayed = localStorage.getItem(`play_${id}`)
    if (!lastPlayed) return false
    const timestamp = parseInt(lastPlayed, 10)
    
    // Default threshold is 1 hour (3600000ms)
    let threshold = 3600000
    
    // If a string type is passed, use predefined thresholds
    if (typeof thresholdOrType === 'string') {
      const thresholds: Record<string, number> = {
        'sermon': 3600000,
        'quran': 1800000,
        'story': 900000,
      }
      threshold = thresholds[thresholdOrType] || 3600000
    } else if (typeof thresholdOrType === 'number') {
      threshold = thresholdOrType
    }
    
    return Date.now() - timestamp < threshold
  } catch {
    return false
  }
}

export const recordPlayTracking = (id: string, type?: string): void => {
  try {
    localStorage.setItem(`play_${id}`, Date.now().toString())
  } catch {
    // Silently fail if localStorage is not available
  }
}
