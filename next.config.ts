import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required by @opennextjs/cloudflare for standalone bundling
  output: 'standalone',

  // Disable X-Powered-By header
  poweredByHeader: false,

  // better-sqlite3 is a native addon — must not be bundled by webpack
  serverExternalPackages: ['better-sqlite3'],

  // Reduce dev mode noise
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Optimize compilation and features
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
    scrollRestoration: true,
  },
  // Redirects from old watch URLs to new detail pages
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.4cima.com' }],
        destination: 'https://4cima.com/:path*',
        permanent: true,
      },
      {
        source: '/sitemap.xml',
        destination: '/sitemap-index.xml',
        statusCode: 301,
      },
      // Junk referral path seen in Search Console (/http://4cima.com) → home
      {
        source: '/http\\://4cima.com',
        destination: 'https://4cima.com',
        statusCode: 301,
      },
      {
        source: '/http\\:/:path*',
        destination: 'https://4cima.com',
        statusCode: 301,
      },
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
      // Permanent redirects for renamed movie slugs (old → current)
      {
        source: '/movies/spider-man-brand-new-day',
        destination: '/movies/spider-man-brand-new-day-2026',
        permanent: true,
      },
      {
        source: '/movies/the-death-of-robin-hood',
        destination: '/movies/death-of-robin-hood',
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
  // Public CDN caching for movie/series detail pages (details only, not user APIs)
  async headers() {
    return [
      {
        source: '/movies/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/series/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      // Sitemaps are plain XML documents: drop Next's RSC negotiation Vary
      {
        source: '/sitemap-index.xml',
        headers: [
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
      {
        source: '/sitemap/:path*',
        headers: [
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
    ]
  },
}

export default nextConfig
