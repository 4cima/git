/**
 * Avatar utilities for default profile images
 */

// List of default avatar filenames (cinema-themed)
const DEFAULT_AVATARS = [
  'avatar-1.svg', // Film reel
  'avatar-2.svg', // Clapperboard
  'avatar-3.svg', // Popcorn
  'avatar-4.svg', // Camera
  'avatar-5.svg', // Star
] as const

/**
 * Get a consistent default avatar for a user based on their ID or email
 * This ensures the same user always gets the same default avatar
 */
export function getDefaultAvatar(userId?: string, email?: string): string {
  const seed = userId || email || 'default'
  
  // Simple hash function to get consistent index
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % DEFAULT_AVATARS.length
  return `/avatars/${DEFAULT_AVATARS[index]}`
}

/**
 * Get all available default avatars for user selection
 */
export function getAllDefaultAvatars(): string[] {
  return DEFAULT_AVATARS.map(avatar => `/avatars/${avatar}`)
}

/**
 * Get avatar URL with fallback to default
 */
export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  userId?: string,
  email?: string
): string {
  if (avatarUrl && avatarUrl.trim()) {
    return avatarUrl
  }
  return getDefaultAvatar(userId, email)
}
