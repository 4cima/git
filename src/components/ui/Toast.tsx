/**
 * 🎬 Toast Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Toast notification component with animations
 * @author Cinema Online Team
 * @version 2.0.0
 * 
 * Implements Requirements:
 * - 9.5: Toast styles (surface background, rounded-xl, shadow-lg, semantic color accent)
 * - 9.6: Appear/disappear animations (slide + fade)
 * - 9.7: Auto-dismiss after duration
 */

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  /** Toast type (determines color and icon) */
  type: ToastType
  /** Toast message */
  message: string
  /** Auto-dismiss duration in ms (default: 5000) */
  duration?: number
  /** Close callback */
  onClose: () => void
  /** Additional CSS classes */
  className?: string
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
}

export const Toast = ({
  type,
  message,
  duration = 5000,
  onClose,
  className = '',
}: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const config = toastConfig[type]
  const Icon = config.icon

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 200) // Match exit animation duration
  }

  useEffect(() => {
    // Trigger appear animation
    requestAnimationFrame(() => {
      setIsVisible(true)
    })

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  return (
    <div
      className={`
        flex items-start gap-3
        px-4 py-3
        bg-surface
        ${config.bg}
        border ${config.border}
        rounded-xl
        shadow-lg
        min-w-[320px] max-w-md
        transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} aria-hidden="true" />

      {/* Message */}
      <p className="text-sm text-cream flex-1">
        {message}
      </p>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="text-silver hover:text-cream transition-colors flex-shrink-0"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default Toast
