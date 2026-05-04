// Image cache utility for Next.js
const cache = new Map<string, boolean | string>()

export function getCacheStatus(src: string): boolean | string {
  return cache.get(src) || false
}

export function setCacheStatus(src: string, status: boolean | string): void {
  cache.set(src, status)
}

export function removeCacheEntry(src: string): void {
  cache.delete(src)
}
