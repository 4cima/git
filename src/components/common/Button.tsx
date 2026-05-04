import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'glass'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-neon-crimson hover:bg-primary/90',
  secondary: 'border border-white/15 bg-white/10 text-white hover:bg-white/20',
  glass: 'border border-white/10 bg-white/5 text-white backdrop-blur-xl hover:bg-white/10'
}
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs min-h-10',
  md: 'px-4 py-2 text-sm min-h-11',
  lg: 'px-5 py-2.5 text-base min-h-11'
}

export const buttonClassName = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) =>
  [baseClasses, variantClasses[variant], sizeClasses[size], className].filter(Boolean).join(' ')

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props },
  ref
) {
  return <button ref={ref} className={buttonClassName(variant, size, className)} {...props} />
})
