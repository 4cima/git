import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api',
        '/profile',
        '/login',
        '/register',
        '/ads-lab',
        '/ads-test',
        '/forgot-password',
        '/search',
      ],
    },
    sitemap: 'https://4cima.com/sitemap-index.xml',
  }
}