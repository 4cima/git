import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/profile', '/login', '/register'],
    },
    sitemap: 'https://4cima.com/sitemap-index.xml',
  }
}