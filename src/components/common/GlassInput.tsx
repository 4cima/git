import { InputHTMLAttributes, memo, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { Search } from 'lucide-react'

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: boolean
}

export const GlassInput = memo(forwardRef<HTMLInputElement, GlassInputProps>(({ 
  className, 
  icon = true,
  ...props 
}, ref) => {
  return (
    <div className="relative group w-full">
      {icon && (
        <Search 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500/80 group-focus-within:text-amber-400 transition-colors pointer-events-none" 
          size={18} 
        />
      )}
      <input
        ref={ref}
        className={twMerge(
          "w-full bg-gray-800/80 border border-gray-600/30 rounded-xl py-3 text-sm text-white focus:outline-none focus:border-gray-500/50 focus:ring-1 focus:ring-gray-500/20 transition-all placeholder:text-gray-400/60 backdrop-blur-md",
          icon ? "pl-12 pr-4" : "px-4",
          className
        )}
        {...props}
      />
    </div>
  )
}))

GlassInput.displayName = 'GlassInput'
