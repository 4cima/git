/**
 * 🎬 Typography Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Typography hierarchy with heading and text components
 * @author Cinema Online Team
 * @version 2.0.0
 * 
 * Implements Requirements:
 * - 11.1: Heading styles (h1-h4 with responsive sizes)
 * - 11.2: Body text styles (large, normal, small)
 * - 11.3: Font families (Cairo for Arabic, DM Sans for English)
 * - 11.4: Line heights (tight, normal, relaxed)
 */

import type { ReactNode, ElementType } from 'react'

export interface HeadingProps {
  /** Heading level */
  level: 1 | 2 | 3 | 4
  /** Heading content */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
  /** HTML element to render as */
  as?: ElementType
}

export interface TextProps {
  /** Text size variant */
  size?: 'large' | 'normal' | 'small'
  /** Text color variant */
  color?: 'primary' | 'secondary' | 'tertiary'
  /** Line height */
  leading?: 'tight' | 'normal' | 'relaxed'
  /** Text content */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
  /** HTML element to render as */
  as?: ElementType
}

const headingStyles = {
  1: 'text-4xl md:text-5xl font-bold text-cream leading-tight',
  2: 'text-3xl md:text-4xl font-bold text-cream leading-tight',
  3: 'text-2xl md:text-3xl font-semibold text-cream leading-tight',
  4: 'text-xl md:text-2xl font-semibold text-cream leading-tight',
}

const textSizeStyles = {
  large: 'text-base',
  normal: 'text-sm',
  small: 'text-xs',
}

const textColorStyles = {
  primary: 'text-cream',
  secondary: 'text-silver',
  tertiary: 'text-silver/70',
}

const leadingStyles = {
  tight: 'leading-tight',
  normal: 'leading-normal',
  relaxed: 'leading-relaxed',
}

export const Heading = ({
  level,
  children,
  className = '',
  as,
}: HeadingProps) => {
  const Component = as || (`h${level}` as ElementType)
  
  return (
    <Component
      className={`
        ${headingStyles[level]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </Component>
  )
}

export const Text = ({
  size = 'normal',
  color = 'primary',
  leading = 'normal',
  children,
  className = '',
  as: Component = 'p',
}: TextProps) => {
  return (
    <Component
      className={`
        ${textSizeStyles[size]}
        ${textColorStyles[color]}
        ${leadingStyles[leading]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </Component>
  )
}

export default { Heading, Text }
