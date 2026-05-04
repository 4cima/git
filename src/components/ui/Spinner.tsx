/**
 * 🎬 Spinner Component - اونلاين سينما
 * 
 * @description مكون Spinner للتحميل
 * @author Online Cinema Team
 * @version 1.0.0
 * 
 * Requirements: 8.3, 8.4
 */

import { Loader2 } from 'lucide-react'
import type { HTMLAttributes } from 'react'

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** Size: sm (16px), md (24px), lg (32px), xl (48px) */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Color (defaults to gold) */
  color?: string
  /** Additional CSS classes */
  className?: string
}

const sizeStyles = {
  sm: 'w-4 h-4',   // 16px
  md: 'w-6 h-6',   // 24px
  lg: 'w-8 h-8',   // 32px
  xl: 'w-12 h-12', // 48px
}

export const Spinner = ({
  size = 'md',
  color = 'text-lumen-gold',
  className = '',
  ...props
}: SpinnerProps) => {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <Loader2 
        className={`${sizeStyles[size]} ${color} animate-spin`}
        style={{ animationDuration: '1s', animationTimingFunction: 'linear' }}
      />
    </div>
  )
}

export default Spinner
