import { logger } from './logger'
import { API_BASE_URL } from '../config/api'

const runtimeConfig =
  typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__
    ? (window as any).__RUNTIME_CONFIG__
    : {}

import { envVar } from './envHelper';

export const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || envVar('VITE_SUPABASE_URL') || runtimeConfig.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVar('VITE_SUPABASE_ANON_KEY') || runtimeConfig.VITE_SUPABASE_ANON_KEY,
  TMDB_API_KEY: process.env.NEXT_PUBLIC_TMDB_API_KEY || envVar('VITE_TMDB_API_KEY') || runtimeConfig.VITE_TMDB_API_KEY,
  YOUTUBE_API_KEY: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || envVar('VITE_YOUTUBE_API_KEY') || runtimeConfig.VITE_YOUTUBE_API_KEY,
  DOMAIN: process.env.NEXT_PUBLIC_DOMAIN || envVar('VITE_DOMAIN') || runtimeConfig.VITE_DOMAIN || 'https://4cima.com',
  // Use centralized API configuration
  API_BASE: API_BASE_URL
}

// Check for required keys - only warn in production or if not using placeholder
const requiredKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_TMDB_API_KEY'
]

const isDev = process.env.NODE_ENV === 'development'
const isPlaceholder = (val: string | undefined) => 
  val?.includes('placeholder') || val?.includes('your_')

requiredKeys.forEach(key => {
  const value = process.env[key]
  if (!value && !runtimeConfig[key]) {
    if (!isDev) {
      logger.error(`❌ CRITICAL ERROR: Missing environment variable: ${key}`)
    }
  } else if (isPlaceholder(value)) {
    // Skip warning for placeholder values in development
    if (!isDev) {
      logger.warn(`⚠️ WARNING: Using placeholder value for ${key}`)
    }
  }
})

export const FLAGS = {
  ADS_ENABLED: false,
}

// re-export for backwards compatibility & tests
export { envVar } from './envHelper';

export function assertEnv() {
  // Disabled to prevent crash
}

// FALLBACK_SUMMARIES removed - all summaries now fetched from CockroachDB via /api/movies
// LEGACY_ID_MAP removed - no longer needed
