import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // better-sqlite3 is a native addon — must not be bundled by webpack
  serverExternalPackages: ['better-sqlite3'],

  // Reduce dev mode noise
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Disable scroll restoration warning for sticky/fixed elements
  experimental: {
    scrollRestoration: true,
  },
  // Optimize compilation
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
    scrollRestoration: true,
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
