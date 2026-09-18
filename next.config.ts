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
      // Permanent redirects for orphan season/episode URLs (viewing happens on
      // the series detail page → 4cima.stream). Config redirects are evaluated
      // BEFORE filesystem routes, so the orphan page.tsx files never render.
      {
        source: '/series/:slug/season/:season',
        destination: '/series/:slug',
        permanent: true,
      },
      {
        source: '/series/:slug/season/:season/episode/:ep',
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
      // Slug fixes 2026-09-18: 1 movie + 44 CJK series carried a generation
      // timestamp in the slug (or had no Latin chars at all → "-<timestamp>").
      // New slugs: clean title (king-kong) / tmdb_id (CJK rule, same as the
      // slug generator). Old slugs below 301 to the new ones — D1 rows were
      // updated in the same change (backup: slug_fix_backup_20260918).
      {
        source: '/movies/king-kong-1784684809695',
        destination: '/movies/king-kong',
        permanent: true,
      },
      {
        source: '/series/-1785312269355',
        destination: '/series/298527',
        permanent: true,
      },
      {
        source: '/series/-1785312324996',
        destination: '/series/299059',
        permanent: true,
      },
      {
        source: '/series/-1785312389472',
        destination: '/series/299838',
        permanent: true,
      },
      {
        source: '/series/-1785312409209',
        destination: '/series/300102',
        permanent: true,
      },
      {
        source: '/series/-1785312481487',
        destination: '/series/300438',
        permanent: true,
      },
      {
        source: '/series/-1785312554880',
        destination: '/series/300610',
        permanent: true,
      },
      {
        source: '/series/-1785312553594',
        destination: '/series/300669',
        permanent: true,
      },
      {
        source: '/series/-1785312555684',
        destination: '/series/300674',
        permanent: true,
      },
      {
        source: '/series/-1785312616376',
        destination: '/series/300721',
        permanent: true,
      },
      {
        source: '/series/-1785312615734',
        destination: '/series/300771',
        permanent: true,
      },
      {
        source: '/series/-1785312687481',
        destination: '/series/300989',
        permanent: true,
      },
      {
        source: '/series/-1785312756403',
        destination: '/series/301255',
        permanent: true,
      },
      {
        source: '/series/-1785312755977',
        destination: '/series/301257',
        permanent: true,
      },
      {
        source: '/series/-1785312794872',
        destination: '/series/301662',
        permanent: true,
      },
      {
        source: '/series/-1785312810097',
        destination: '/series/301731',
        permanent: true,
      },
      {
        source: '/series/-1785312813115',
        destination: '/series/301842',
        permanent: true,
      },
      {
        source: '/series/-1785312826149',
        destination: '/series/301892',
        permanent: true,
      },
      {
        source: '/series/-1785312828368',
        destination: '/series/301973',
        permanent: true,
      },
      {
        source: '/series/-1785312828127',
        destination: '/series/302038',
        permanent: true,
      },
      {
        source: '/series/-1785312844863',
        destination: '/series/302201',
        permanent: true,
      },
      {
        source: '/series/-1785312844798',
        destination: '/series/302205',
        permanent: true,
      },
      {
        source: '/series/-1785312864501',
        destination: '/series/302219',
        permanent: true,
      },
      {
        source: '/series/-1785312864730',
        destination: '/series/302267',
        permanent: true,
      },
      {
        source: '/series/-1785312867199',
        destination: '/series/302289',
        permanent: true,
      },
      {
        source: '/series/-1785312865347',
        destination: '/series/302293',
        permanent: true,
      },
      {
        source: '/series/-1785312882843',
        destination: '/series/302451',
        permanent: true,
      },
      {
        source: '/series/-1785312957742',
        destination: '/series/302714',
        permanent: true,
      },
      {
        source: '/series/-1785312986409',
        destination: '/series/302744',
        permanent: true,
      },
      {
        source: '/series/-1785312988333',
        destination: '/series/302799',
        permanent: true,
      },
      {
        source: '/series/-1785313016683',
        destination: '/series/303225',
        permanent: true,
      },
      {
        source: '/series/-1785313030849',
        destination: '/series/303239',
        permanent: true,
      },
      {
        source: '/series/-1785313034773',
        destination: '/series/303355',
        permanent: true,
      },
      {
        source: '/series/-1785313049556',
        destination: '/series/303451',
        permanent: true,
      },
      {
        source: '/series/-1785313158413',
        destination: '/series/303954',
        permanent: true,
      },
      {
        source: '/series/-1785313216530',
        destination: '/series/304088',
        permanent: true,
      },
      {
        source: '/series/-1785313472383',
        destination: '/series/305336',
        permanent: true,
      },
      {
        source: '/series/-1785313472264',
        destination: '/series/305348',
        permanent: true,
      },
      {
        source: '/series/-1785313551471',
        destination: '/series/305554',
        permanent: true,
      },
      {
        source: '/series/-1785313552008',
        destination: '/series/305556',
        permanent: true,
      },
      {
        source: '/series/-1785313578013',
        destination: '/series/305685',
        permanent: true,
      },
      {
        source: '/series/-1785313860447',
        destination: '/series/306857',
        permanent: true,
      },
      {
        source: '/series/-1785313916108',
        destination: '/series/307660',
        permanent: true,
      },
      {
        source: '/series/-1785313933536',
        destination: '/series/307809',
        permanent: true,
      },
      {
        source: '/series/-1785313960722',
        destination: '/series/308186',
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
      // Security headers on every HTML/response path. '/:path*' also covers
      // '/' and is safe for _next static assets and API routes with these
      // particular headers.
      // CSP status: a full Content-Security-Policy-Report-Only (monitoring
      // only — nothing is blocked while violations are observed in the
      // console) + the limited enforcing CSP subset below, kept as-is
      // (a broader enforcing CSP would break ad networks).
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=()',
          },
          // Safe subset of CSP that ad networks don't break:
          // - base-uri 'self' — blocks <base> tag injection / URL rewriting
          // - frame-ancestors 'self' — clickjacking defense (XFO still set)
          // - form-action 'self' — no cross-origin form submission
          // Deliberately does NOT restrict script-src/style-src (would break ads).
          {
            key: 'Content-Security-Policy',
            value: "base-uri 'self'; frame-ancestors 'self'; form-action 'self'",
          },
          // Report-only CSP (monitoring only — nothing blocked): full policy
          // including ad script/frame hosts; no report-uri by design.
          {
            key: 'Content-Security-Policy-Report-Only',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://professionalsusceptible.com https://al5sm.com https://www.highrevenueformat.com https://highrevenueformat.com; script-src-elem 'self' 'unsafe-inline' https://professionalsusceptible.com https://al5sm.com https://www.highrevenueformat.com https://highrevenueformat.com; img-src 'self' data: blob: https://image.tmdb.org https://play-lh.googleusercontent.com https://upload.wikimedia.org https://assets-global.website-files.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-src 'self' https://professionalsusceptible.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
          },
        ],
      },
      // Homepage: public catalog HTML (no per-user SSR content) — force-dynamic
      // stays for D1-at-runtime, but the CDN may cache it briefly.
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=600',
          },
        ],
      },
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
