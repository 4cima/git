// Environment variable helper for Next.js
export function envVar(key: string): string | undefined {
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ prefix
    return process.env[`NEXT_PUBLIC_${key.replace('VITE_', '')}`]
  }
  // Server-side: use direct env vars
  return process.env[key.replace('VITE_', '')]
}
