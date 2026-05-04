/**
 * RatingInput Component
 * 
 * Interactive 10-point rating input displayed as 5 stars (each star = 2 points).
 * Supports hover preview, keyboard navigation, and RTL layout.
 * 
 * Task 11.1: Create RatingInput component
 * Requirements: 1.1, 19.1, 19.3, 19.4
 */

import { useState } from 'react'
import { Star } from 'lucide-react'

interface RatingInputProps {
  value: number | null // 1-10 or null
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
}

export const RatingInput = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showValue = false,
  className = ''
}: RatingInputProps) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const displayValue = hoverValue ?? value ?? 0
  const filledStars = Math.floor(displayValue / 2)
  const hasHalfStar = displayValue % 2 === 1

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const handleStarClick = (starIndex: number, isHalf: boolean) => {
    if (readonly || !onChange) return
    const newValue = starIndex * 2 + (isHalf ? 1 : 2)
    onChange(newValue)
  }

  const handleStarHover = (starIndex: number, isHalf: boolean) => {
    if (readonly) return
    const newValue = starIndex * 2 + (isHalf ? 1 : 2)
    setHoverValue(newValue)
  }

  const handleMouseLeave = () => {
    setHoverValue(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readonly || !onChange) return
    
    const currentValue = value ?? 0
    
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      const newValue = Math.min(currentValue + 1, 10)
      onChange(newValue)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      const newValue = Math.max(currentValue - 1, 1)
      onChange(newValue)
    } else if (e.key === 'Home') {
      e.preventDefault()
      onChange(1)
    } else if (e.key === 'End') {
      e.preventDefault()
      onChange(10)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center gap-0.5 ${!readonly ? 'cursor-pointer' : ''}`}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        tabIndex={readonly ? -1 : 0}
        role="slider"
        aria-label="Rating"
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value ?? undefined}
        aria-readonly={readonly}
      >
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const isFilled = starIndex < filledStars
          const isHalf = starIndex === filledStars && hasHalfStar

          return (
            <div
              key={starIndex}
              className="relative"
              onMouseMove={(e) => {
                if (readonly) return
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                const isLeftHalf = x < rect.width / 2
                handleStarHover(starIndex, isLeftHalf)
              }}
              onClick={(e) => {
                if (readonly) return
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                const isLeftHalf = x < rect.width / 2
                handleStarClick(starIndex, isLeftHalf)
              }}
            >
              {/* Background star (empty) */}
              <Star
                className={`${sizeClasses[size]} text-zinc-600 transition-colors`}
                fill="none"
                strokeWidth={2}
              />
              
              {/* Filled star overlay */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  width: isFilled ? '100%' : isHalf ? '50%' : '0%'
                }}
              >
                <Star
                  className={`${sizeClasses[size]} text-lumen-gold transition-all`}
                  fill="currentColor"
                  strokeWidth={2}
                />
              </div>
            </div>
          )
        })}
      </div>

      {showValue && value !== null && (
        <span className="text-sm font-bold text-white">
          {value}/10
        </span>
      )}
    </div>
  )
}
