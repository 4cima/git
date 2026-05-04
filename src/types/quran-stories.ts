// Quran Stories Types and Interfaces

/**
 * Story category types
 */
export type StoryCategory = 
  | 'prophets'
  | 'companions'
  | 'quranic-stories'
  | 'historical-events'
  | 'moral-lessons'
  | 'miracles'
  | 'battles'
  | 'women-in-islam'

/**
 * Story data structure matching database schema
 */
export type Story = {
  id: number
  title_ar: string
  title_en: string
  narrator_name_ar: string
  narrator_name_en: string
  narrator_image: string | null
  audio_url: string
  duration_seconds: number
  description_ar: string | null
  description_en: string | null
  category: StoryCategory
  source_reference: string | null
  featured: boolean
  is_active: boolean
  play_count: number
  created_at: string
  updated_at: string
}

/**
 * Narrator profile with grouped stories
 */
export type Narrator = {
  name_ar: string
  name_en: string
  image: string | null
  story_count: number
  featured: boolean
  stories: Story[]
}
