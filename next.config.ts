import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
  },
  // Reduce dev mode noise
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Optimize compilation
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
  },
}

export default nextConfig
