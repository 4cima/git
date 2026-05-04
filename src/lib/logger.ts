/**
 * نظام Logging موحد للتطبيق
 * Unified logging system for the application
 * 
 * يعمل فقط في development mode
 * Only works in development mode
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isTest = process.env.NODE_ENV === 'test'

  private shouldLog(): boolean {
    return this.isDevelopment && !this.isTest
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }[level]

    let formatted = `${emoji} [${timestamp}] ${message}`
    
    if (context && Object.keys(context).length > 0) {
      formatted += '\n' + JSON.stringify(context, null, 2)
    }

    return formatted
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog()) return
    console.debug(this.formatMessage('debug', message, context))
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog()) return
    console.info(this.formatMessage('info', message, context))
  }

  warn(message: string, context?: LogContext | unknown): void {
    if (!this.shouldLog()) return
    
    // Handle case where context might be Error or other type
    let finalContext: LogContext | undefined
    if (context && typeof context === 'object' && !(context instanceof Error)) {
      finalContext = context as LogContext
    } else if (context) {
      finalContext = { value: context }
    }
    
    console.warn(this.formatMessage('warn', message, finalContext))
  }

  error(message: string | Error | unknown, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog()) return
    
    // If first param is Error, extract message
    let errorMessage: string
    let errorObj: Error | unknown
    
    if (message instanceof Error) {
      errorMessage = message.message
      errorObj = message
    } else if (typeof message === 'string') {
      errorMessage = message
      errorObj = error
    } else {
      errorMessage = 'Unknown error'
      errorObj = message
    }
    
    const errorContext = {
      ...context,
      error: errorObj instanceof Error ? {
        message: errorObj.message,
        stack: errorObj.stack,
        name: errorObj.name
      } : errorObj
    }
    
    console.error(this.formatMessage('error', errorMessage, errorContext))
  }

  // Helper methods for common scenarios
  apiRequest(method: string, url: string, params?: any): void {
    this.debug(`API Request: ${method} ${url}`, { params })
  }

  apiResponse(url: string, status: number, data?: any): void {
    this.debug(`API Response: ${url}`, { status, data })
  }

  apiError(url: string, error: Error | unknown): void {
    this.error(`API Error: ${url}`, error)
  }

  filterChange(contentType: string, key: string, value: any): void {
    this.debug(`Filter Changed: ${contentType}`, { key, value })
  }

  cacheHit(key: string): void {
    this.debug(`Cache Hit: ${key}`)
  }

  cacheMiss(key: string): void {
    this.debug(`Cache Miss: ${key}`)
  }

  performance(label: string, duration: number): void {
    this.info(`Performance: ${label}`, { duration: `${duration}ms` })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for testing
export { Logger }
