import { MetadataRoute } from 'next'

// دالة جلب جميع الأفلام (يجب تعديلها حسب قاعدة البيانات)
async function getAllMovies() {
  // TODO: استبدل هذا بـ query من قاعدة البيانات
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/movies?limit=10000`, {
      next: { revalidate: 86400 } // Cache لمدة يوم
    })
    
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Error fetching movies for sitemap:', error)
    return []
  }
}

// دالة جلب جميع المسلسلات (يجب تعديلها حسب قاعدة البيانات)
async function getAllSeries() {
  // TODO: استبدل هذا بـ query من قاعدة البيانات
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tv?limit=10000`, {
      next: { revalidate: 86400 } // Cache لمدة يوم
    })
    
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Error fetching series for sitemap:', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://4cima.online'
  
  // الصفحات الثابتة
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/movies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/series`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // جلب الأفلام والمسلسلات
  const [movies, series] = await Promise.all([
    getAllMovies(),
    getAllSeries(),
  ])

  // صفحات الأفلام
  const moviePages: MetadataRoute.Sitemap = movies.map((movie: any) => ({
    url: movie.canonical_url || `${baseUrl}/movies/${movie.slug}`,
    lastModified: movie.updated_at ? new Date(movie.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: movie.vote_average >= 7 ? 0.9 : 0.7,
  }))

  // صفحات المسلسلات
  const seriesPages: MetadataRoute.Sitemap = series.map((s: any) => ({
    url: s.canonical_url || `${baseUrl}/series/${s.slug}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: s.vote_average >= 7 ? 0.9 : 0.7,
  }))

  return [...staticPages, ...moviePages, ...seriesPages]
}
