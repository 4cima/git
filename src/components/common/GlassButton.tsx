import { ButtonHTMLAttributes, memo } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  variant?: 'default' | 'accent' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const GlassButton = memo(({ 
  className, 
  active, 
  variant = 'default', 
  size = 'md',
  children, 
  ...props 
}: GlassButtonProps) => {
  const baseStyles = "relative overflow-hidden transition-all duration-300 backdrop-blur-md border"
  
  const variants = {
    default: active 
      ? "bg-gray-400 text-black shadow-lg shadow-gray-400/20 border-gray-400" 
      : "bg-amber-950/60 text-amber-400/70 border-amber-500/20 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/40",
    accent: active
      ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 border-cyan-500"
      : "bg-cyan-950/60 text-cyan-400/70 border-cyan-500/20 hover:text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/40",
    danger: active
      ? "bg-red-500 text-white shadow-lg shadow-red-500/20 border-red-500"
      : "bg-red-950/60 text-red-400/70 border-red-500/20 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/40"
  }

  const sizes = {
    sm: "px-3 py-1.5 text-[10px] rounded-lg font-bold",
    md: "px-4 py-2 text-xs rounded-xl font-bold",
    lg: "px-6 py-3 text-sm rounded-2xl font-bold",
    icon: "p-2 rounded-lg"
  }

  return (
    <button 
      className={twMerge(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
})

GlassButton.displayName = 'GlassButton'
