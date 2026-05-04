import { forwardRef } from 'react'

export type InputSize = 'sm' | 'md' | 'lg'

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: InputSize
}

const baseClasses = 'w-full rounded-xl border border-white/10 bg-black/40 text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30'
const sizeClasses: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base'
}

export const inputClassName = (size: InputSize = 'md', className?: string) =>
  [baseClasses, sizeClasses[size], className].filter(Boolean).join(' ')

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size = 'md', ...props },
  ref
) {
  return <input ref={ref} className={inputClassName(size, className)} {...props} />
})
