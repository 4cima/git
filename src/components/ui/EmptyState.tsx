/**
 * 🎬 EmptyState Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Empty state component with optional action button
 * @author Cinema Online Team
 * @version 2.0.0
 * 
 * Implements Requirements:
 * - 9.3: Empty state styles (centered layout, silver text, illustrative icon 64px)
 * - 9.4: Optional action button
 */

import { Inbox } from 'lucide-react'
import { Button } from './Button'
import type { ReactNode } from 'react'

export interface EmptyStateProps {
  /** Empty state title */
  title: string
  /** Empty state message */
  message?: string
  /** Custom icon (defaults to Inbox) */
  icon?: ReactNode
  /** Action button configuration */
  action?: {
    label: string
    onClick: () => void
  }
  /** Additional CSS classes */
  className?: string
}

export const EmptyState = ({
  title,
  message,
  icon,
  action,
  className = '',
}: EmptyStateProps) => {
  return (
    <div 
      className={`
        flex flex-col items-center justify-center 
        py-12 px-6
        text-center
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="status"
      aria-live="polite"
    >
      {/* Icon - 64px as per requirements */}
      <div className="mb-4 text-silver">
        {icon || <Inbox className="w-16 h-16" aria-hidden="true" />}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-silver mb-2">
        {title}
      </h3>

      {/* Message (optional) */}
      {message && (
        <p className="text-silver/70 mb-6 max-w-md">
          {message}
        </p>
      )}

      {/* Action Button (optional) */}
      {action && (
        <Button
          variant="primary"
          onClick={action.onClick}
          aria-label={action.label}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
