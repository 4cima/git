import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const revalidate = 86400

export async function GET(request: NextRequest) {
  try {
    // Return static genres list (TMDB standard genres)
    const genres = [
      { id: 28, name: 'Action', name_ar: 'أكشن', name_en: 'Action' },
      { id: 12, name: 'Adventure', name_ar: 'مغامرة', name_en: 'Adventure' },
      { id: 16, name: 'Animation', name_ar: 'رسوم متحركة', name_en: 'Animation' },
      { id: 35, name: 'Comedy', name_ar: 'كوميديا', name_en: 'Comedy' },
      { id: 80, name: 'Crime', name_ar: 'جريمة', name_en: 'Crime' },
      { id: 99, name: 'Documentary', name_ar: 'وثائقي', name_en: 'Documentary' },
      { id: 18, name: 'Drama', name_ar: 'دراما', name_en: 'Drama' },
      { id: 10751, name: 'Family', name_ar: 'عائلي', name_en: 'Family' },
      { id: 14, name: 'Fantasy', name_ar: 'فانتازيا', name_en: 'Fantasy' },
      { id: 36, name: 'History', name_ar: 'تاريخي', name_en: 'History' },
      { id: 27, name: 'Horror', name_ar: 'رعب', name_en: 'Horror' },
      { id: 10402, name: 'Music', name_ar: 'موسيقى', name_en: 'Music' },
      { id: 9648, name: 'Mystery', name_ar: 'غموض', name_en: 'Mystery' },
      { id: 10749, name: 'Romance', name_ar: 'رومانسي', name_en: 'Romance' },
      { id: 878, name: 'Science Fiction', name_ar: 'خيال علمي', name_en: 'Science Fiction' },
      { id: 10770, name: 'TV Movie', name_ar: 'فيلم تلفزيوني', name_en: 'TV Movie' },
      { id: 53, name: 'Thriller', name_ar: 'إثارة', name_en: 'Thriller' },
      { id: 10752, name: 'War', name_ar: 'حرب', name_en: 'War' },
      { id: 37, name: 'Western', name_ar: 'غربي', name_en: 'Western' }
    ]
    
    return NextResponse.json({ genres })
  } catch (error) {
    console.error('Error fetching genres:', error)
    return NextResponse.json({ genres: [] })
  }
}
