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
    // المرحلة 2 بند 4: لا يُعلن عن أي سايت ماب في robots.txt — الإشارة لموقع
    // الخريطة تكشف بنية الأرشيف لمصنّفات المحتوى (المسار يظل متاحًا للمحققين).
  }
}