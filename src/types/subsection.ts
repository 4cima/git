/**
 * Subsection Type Definitions
 * 
 * Defines types for subsection configurations used across all content sections
 * (movies, series, gaming, software)
 */

import { ReactNode } from 'react'

/**
 * Subsection Definition
 * Represents a single subsection with its metadata and filters
 */
export interface SubsectionDefinition {
  /** Unique identifier for the subsection */
  id: string
  
  /** Arabic label for the subsection */
  labelAr: string
  
  /** English label for the subsection */
  labelEn: string
  
  /** URL path for the subsection */
  path: string
  
  /** Filters to apply when fetching content for this subsection */
  filters: Record<string, any>
  
  /** Optional sort order for content */
  sortBy?: string
  
  /** Optional icon component */
  icon?: ReactNode
}

/**
 * Subsection Configuration
 * Maps content types to their subsection definitions
 */
export interface SubsectionConfig {
  movies: SubsectionDefinition[]
  series: SubsectionDefinition[]
  gaming: SubsectionDefinition[]
  software: SubsectionDefinition[]
  anime: SubsectionDefinition[]
}

/**
 * Content Type
 * Valid content types for subsections
 */
export type ContentType = 'movies' | 'series' | 'gaming' | 'software' | 'anime'
