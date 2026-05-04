export interface ValidationOptions {
  expectedLanguage?: string
  subsectionName?: string
  requiredFields?: string[]
}

export interface ValidationResult {
  isValid: boolean
  errors: any[]
}

export const validateContent = (content: any, options?: ValidationOptions): ValidationResult => {
  const errors: any[] = []
  
  if (!content) {
    return { isValid: false, errors: ['Content is empty'] }
  }
  
  if (typeof content !== 'object') {
    return { isValid: false, errors: ['Content is not an object'] }
  }
  
  if (options?.requiredFields) {
    const isArray = Array.isArray(content)
    const items = isArray ? content : [content]
    items.forEach((item, idx) => {
      options.requiredFields!.forEach(field => {
        if (!(field in item)) {
          errors.push(`Item ${idx} missing required field: ${field}`)
        }
      })
    })
  }
  
  return { isValid: errors.length === 0, errors }
}

export const logDataIntegrityViolations = (violations: any[], context?: any): void => {
  if (violations.length > 0) {
    console.warn('Data integrity violations detected:', violations, context)
  }
}

export const filterInvalidContent = (items: any[], validationResult?: ValidationResult): any[] => {
  if (!validationResult) {
    return items.filter(item => {
      const result = validateContent(item)
      return result.isValid
    })
  }
  return items
}
