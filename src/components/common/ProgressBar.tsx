import { memo } from 'react'
import { cn } from '../../lib/utils'

interface ProgressBarProps {
  /** Progress value (0-100) */
  value?: number
  /** Indeterminate mode (no specific progress) */
  indeterminate?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'error'
  /** Show percentage label */
  showLabel?: boolean
  /** Custom className */
  className?: string
  /** Aria label for accessibility */
  'aria-label'?: string
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

const variantClasses = {
  primary: 'bg-semantic-primary',
  success: 'bg-semantic-success',
  warning: 'bg-semantic-warning',
  error: 'bg-semantic-error',
}

export const ProgressBar = memo<ProgressBarProps>(({
  value = 0,
  indeterminate = false,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  className,
  'aria-label': ariaLabel,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('w-full', className)}>
      {showLabel && !indeterminate && (
        <div className="mb-1 flex justify-between text-xs text-zinc-400">
          <span>{ariaLabel || 'Progress'}</span>
          <span>{clampedValue}%</span>
        </div>
      )}
      
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-zinc-800',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {indeterminate ? (
          <div
            className={cn(
              'absolute inset-y-0 w-1/3 animate-[shimmer_1.5s_infinite]',
              variantClasses[variant]
            )}
            style={{
              background: `linear-gradient(90deg, transparent, currentColor, transparent)`,
            }}
          />
        ) : (
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out',
              variantClasses[variant]
            )}
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
    </div>
  )
})

ProgressBar.displayName = 'ProgressBar'
