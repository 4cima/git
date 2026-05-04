export class ErrorHandler {
  static handle(error: any, context?: string): void {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error)
  }

  static async handleAsync(error: any, context?: string): Promise<void> {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error)
  }

  static handleAPIError(error: any): Error {
    console.error('API Error:', error)
    return new Error(error?.message || 'API request failed')
  }

  static isNetworkError(error: any): boolean {
    return error?.message?.includes('network') || error?.message?.includes('fetch')
  }

  static isValidationError(error: any): boolean {
    return error?.message?.includes('validation') || error?.status === 400
  }

  static isNotFoundError(error: any): boolean {
    return error?.status === 404
  }

  static isServerError(error: any): boolean {
    return error?.status >= 500
  }
}
