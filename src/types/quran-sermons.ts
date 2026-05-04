// Quran Sermons Types and Interfaces

/**
 * Sermon category types
 */
export type SermonCategory = 
  | 'friday-khutbah'
  | 'ramadan'
  | 'hajj'
  | 'eid'
  | 'general-guidance'
  | 'youth'
  | 'family'
  | 'tafsir'

/**
 * Sermon data structure matching database schema
 */
export type Sermon = {
  id: number
  title_ar: string
  title_en: string
  scholar_name_ar: string
  scholar_name_en: string
  scholar_image: string | null
  audio_url: string
  duration_seconds: number
  description_ar: string | null
  description_en: string | null
  category: SermonCategory
  featured: boolean
  is_active: boolean
  play_count: number
  created_at: string
  updated_at: string
}

/**
 * Scholar profile with grouped sermons
 */
export type Scholar = {
  name_ar: string
  name_en: string
  image: string | null
  sermon_count: number
  featured: boolean
  sermons: Sermon[]
}
