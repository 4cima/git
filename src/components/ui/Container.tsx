/**
 * 🎬 Container Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Responsive container with max-width constraints and padding
 * @author Cinema Online Team
 * @version 2.0.0
 * 
 * Implements Requirements:
 * - 10.1: Container padding (px-4 mobile, px-6 tablet, px-8 desktop)
 * - 10.5: Max-width constraints
 */

import type { ReactNode } from 'react'

export interface ContainerProps {
  /** Container content */
  children: ReactNode
  /** Max width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  /** Additional CSS classes */
  className?: string
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-[2400px]',
  full: 'max-w-full',
}

export const Container = ({
  children,
  maxWidth = '2xl',
  className = '',
}: ContainerProps) => {
  return (
    <div
      className={`
        mx-auto
        px-4 md:px-6 lg:px-8
        ${maxWidthClasses[maxWidth]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </div>
  )
}

export default Container
