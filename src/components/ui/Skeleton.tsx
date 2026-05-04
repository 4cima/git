/**
 * 🎬 Skeleton Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Loading skeleton with pulse animation and variants
 * @author Cinema Online Team
 * @version 2.0.0
 * 
 * Implements Requirements:
 * - 8.1: Base styles (surface background, animated pulse)
 * - 8.2: Gradient animation from left to right
 * - 8.5: Variants (card, text, image, circle)
 */

import type { HTMLAttributes } from 'react'

export type SkeletonVariant = 'card' | 'text' | 'image' | 'circle' | 'custom'
export type AspectRatio = '2/3' | '16/9'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Skeleton variant */
  variant?: SkeletonVariant
  /** Aspect ratio for card/image variants */
  aspectRatio?: AspectRatio
  /** Width (for custom variant) */
  width?: string | number
  /** Height (for custom variant) */
  height?: string | number
  /** Border radius */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  /** Number of skeleton items to render */
  count?: number
  /** Custom className */
  className?: string
}

const roundedStyles = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
}

const aspectRatioStyles: Record<AspectRatio, string> = {
  '2/3': 'aspect-[2/3]',
  '16/9': 'aspect-video',
}

export const Skeleton = ({
  variant = 'custom',
  aspectRatio = '2/3',
  width,
  height,
  rounded = 'md',
  count = 1,
  className = '',
  style,
  ...props
}: SkeletonProps) => {
  // Variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return `
          ${aspectRatioStyles[aspectRatio]} w-full
          ${roundedStyles['2xl']}
          bg-lumen-surface
          relative overflow-hidden
        `
      case 'text':
        return `
          h-4 w-full
          ${roundedStyles.full}
          bg-lumen-surface
        `
      case 'image':
        return `
          aspect-video w-full
          ${roundedStyles.lg}
          bg-lumen-surface
        `
      case 'circle':
        return `
          ${roundedStyles.full}
          bg-lumen-surface
        `
      default:
        return `
          ${roundedStyles[rounded]}
          bg-lumen-surface
        `
    }
  }

  const skeletonElement = (
    <div
      className={`
        animate-pulse
        ${getVariantStyles()}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      style={{
        width: variant === 'custom' && width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: variant === 'custom' && height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        ...style,
      }}
      {...props}
    >
      {/* Card variant with title bars */}
      {variant === 'card' && (
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2 bg-lumen-surface">
          <div className="h-3 w-3/4 bg-lumen-muted rounded-full" />
          <div className="h-2 w-1/2 bg-lumen-muted rounded-full" />
        </div>
      )}
      
      {/* Gradient shimmer effect */}
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent"
        style={{
          animation: 'shimmer 1.5s infinite',
        }}
      />
    </div>
  )

  // Render multiple skeletons if count > 1
  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>{skeletonElement}</div>
        ))}
      </div>
    )
  }

  return skeletonElement
}

export default Skeleton
