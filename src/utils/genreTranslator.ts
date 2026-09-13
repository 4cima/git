/**
 * @deprecated Use translateGenre from '@/lib/genre-translations' instead.
 * This file is kept for backward compatibility.
 */
import { translateGenre as _translateGenre } from '@/lib/genre-translations'

export const translateGenre = (genreEn: string): string => _translateGenre(genreEn, 'ar')
