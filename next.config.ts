import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
  // Redirects from old watch URLs to new detail pages
  async redirects() {
    return [
      {
        source: '/watch/movie/:slug',
        destination: '/movies/:slug',
        permanent: true,
      },
      {
        source: '/watch/series/:slug',
        destination: '/series/:slug',
        permanent: true,
      },
      {
        source: '/watch/series/:slug/season/:season/episode/:ep',
        destination: '/series/:slug',
        permanent: true,
      },
    ]
  },
  // Proxy TMDB images to bypass ISP blocks and AdBlockers
  async rewrites() {
    return [
      {
        source: '/tmdb/:path*',
        destination: 'https://image.tmdb.org/t/p/:path*',
      },
    ]
  },
}

export default nextConfig
