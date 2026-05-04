/**
 * 🎬 ErrorState Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Error state component with retry functionality
 * @author Cinema Online Team
 * @version 2.0.0
 * 
 * Implements Requirements:
 * - 9.1: Error state styles (red-400 text, red-400/10 background, red-400/20 border, alert icon 64px)
 * - 9.2: Error message text and optional retry button
 */

import { AlertCircle } from 'lucide-react'
import { Button } from './Button'
import type { ReactNode } from 'react'

export interface ErrorStateProps {
  /** Error title */
  title?: string
  /** Error message */
  message: string
  /** Retry callback function */
  onRetry?: () => void
  /** Retry button label */
  retryLabel?: string
  /** Custom icon (defaults to AlertCircle) */
  icon?: ReactNode
  /** Additional CSS classes */
  className?: string
}

export const ErrorState = ({
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  icon,
  className = '',
}: ErrorStateProps) => {
  return (
    <div 
      className={`
        flex flex-col items-center justify-center 
        py-12 px-6
        bg-red-400/10 
        border border-red-400/20 
        rounded-2xl
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="alert"
      aria-live="polite"
    >
      {/* Icon - 64px as per requirements */}
      <div className="mb-4 text-red-400">
        {icon || <AlertCircle className="w-16 h-16" aria-hidden="true" />}
      </div>

      {/* Title (optional) */}
      {title && (
        <h3 className="text-xl font-semibold text-red-400 mb-2 text-center">
          {title}
        </h3>
      )}

      {/* Message */}
      <p className="text-red-400 text-center mb-6 max-w-md">
        {message}
      </p>

      {/* Retry Button (optional) */}
      {onRetry && (
        <Button
          variant="danger"
          onClick={onRetry}
          aria-label={retryLabel}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

export default ErrorState
