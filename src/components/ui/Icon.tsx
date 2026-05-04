/**
 * 🎬 Icon Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Icon wrapper component with size and color variants
 * @author Cinema Online Team
 * @version 2.0.0
 * 
 * Implements Requirements:
 * - 12.1: Consistent icon sizes (sm: 16px, md: 20px, lg: 24px, xl: 32px)
 * - 12.2: Consistent 2px stroke width
 * - 12.3: Semantic color variants
 * - 12.4: Hover state with 110% brightness
 * - 12.5: Accessibility (aria-label or aria-hidden)
 */

import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

export interface IconProps extends Omit<ComponentProps<'svg'>, 'size'> {
  /** Lucide icon component */
  icon: LucideIcon
  /** Icon size */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Color variant */
  color?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold' | 'cream' | 'silver'
  /** Interactive state (adds hover effect) */
  interactive?: boolean
  /** Accessibility label */
  label?: string
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

const colorMap = {
  default: 'text-current',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error: 'text-red-400',
  info: 'text-blue-400',
  gold: 'text-gold',
  cream: 'text-cream',
  silver: 'text-silver',
}

export const Icon = ({
  icon: IconComponent,
  size = 'md',
  color = 'default',
  interactive = false,
  label,
  className = '',
  ...props
}: IconProps) => {
  return (
    <IconComponent
      size={sizeMap[size]}
      strokeWidth={2}
      className={`
        ${colorMap[color]}
        ${interactive ? 'hover:brightness-110 transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      aria-label={label}
      aria-hidden={!label}
      {...props}
    />
  )
}

export default Icon
