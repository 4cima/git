import { logger } from './logger'

/**
 * Track filter change events for analytics
 * @deprecated This module is kept for backward compatibility. Consider using logger directly.
 */
export function trackFilterChange(contentType: string, key: string, value: unknown): void {
  logger.debug(`Filter Changed: ${contentType}`, { key, value })
}
