/**
 * Search Utilities
 * Helpers for FTS5 full-text search with proper escaping
 */

/**
 * Sanitize search input for FTS5 MATCH queries
 * 
 * FTS5 treats certain characters as operators:
 * - Hyphen (-) = NOT operator
 * - Colon (:) = column specifier
 * - Quotes (") = exact phrase
 * - Asterisk (*) = prefix match
 * - Parentheses = grouping
 * - AND/OR/NOT = boolean operators
 * 
 * Strategy: Wrap the entire search term in double quotes to force literal matching
 * and escape any internal quotes.
 * 
 * This preserves FTS5 index usage while preventing operator parsing issues.
 * 
 * @param input - Raw user search input
 * @returns Sanitized string safe for FTS5 MATCH clause
 * 
 * @example
 * sanitizeSearchInput('Spider-Man') // => '"Spider-Man"'
 * sanitizeSearchInput("It's") // => '"It\'s"'  (escaped internal quote)
 * sanitizeSearchInput('Movie: Part 2') // => '"Movie: Part 2"'
 */
export function sanitizeSearchInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // Trim whitespace
  const trimmed = input.trim()
  
  if (trimmed.length === 0) {
    return ''
  }
  
  // Escape any internal double quotes by doubling them (SQLite FTS5 convention)
  const escaped = trimmed.replace(/"/g, '""')
  
  // Wrap entire term in double quotes to force literal phrase matching
  // This prevents FTS5 from interpreting special characters as operators
  return `"${escaped}"`
}

/**
 * Check if search term is too short for trigram tokenizer
 * Trigram tokenizer requires at least 3 characters to generate tokens
 * 
 * @param input - Search input (before sanitization)
 * @returns true if term is too short for effective trigram search
 */
export function isTooShortForTrigram(input: string): boolean {
  return input.trim().length < 3
}
