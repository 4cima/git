/**
 * 🎬 Button Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 *
 * @description Base button component with all variants and states
 * @author Cinema Online Team
 * @version 2.0.0
 *
 * Implements Requirements:
 * - 3.1: Button variants (primary, secondary, ghost, danger)
 * - 3.2: Hover states (110% brightness for filled, 10% bg opacity for outlined)
 * - 3.3: Focus states (gold outline 3px, 2px offset)
 * - 3.4: Active states (scale 0.95)
 * - 3.5: Button sizes (sm, md, lg)
 * - 3.6: Icon support with gap-2 spacing
 * - 3.7: Loading state with spinner
 * - 16.1: Minimum 44x44px touch targets
 * - 16.2: Adequate padding for mobile
 */

import { forwardRef, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type IconPosition = 'left' | 'right';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant - primary (gold), secondary (outlined), ghost (transparent), danger (red) */
  variant?: ButtonVariant;
  /** Button size - sm, md, lg */
  size?: ButtonSize;
  /** Loading state - shows spinner and disables interaction */
  loading?: boolean;
  /** Icon element to display */
  icon?: ReactNode;
  /** Position of icon relative to text */
  iconPosition?: IconPosition;
  /** Full width button */
  fullWidth?: boolean;
  /** Children content */
  children: ReactNode;
}

/**
 * Variant styles following LUMEN design system
 * - primary: Gold background (#C9A962), void text (#08080C)
 * - secondary: Transparent background, cream text, muted border
 * - ghost: Transparent background, cream text, no border
 * - danger: Red background (#EF4444), white text
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-lumen-gold text-lumen-void
    border border-lumen-gold
    hover:brightness-110
    shadow-sm
  `,
  secondary: `
    bg-transparent text-lumen-cream
    border border-white/15
    hover:bg-white/10
  `,
  ghost: `
    bg-transparent text-lumen-cream
    border border-transparent
    hover:bg-white/10
  `,
  danger: `
    bg-semantic-error text-white
    border border-semantic-error
    hover:brightness-110
    shadow-sm
  `,
};

/**
 * Size styles with minimum touch targets
 * - sm: px-3 py-1.5, text-xs, min-h-10 (40px)
 * - md: px-4 py-2, text-sm, min-h-11 (44px)
 * - lg: px-6 py-3, text-base, min-h-12 (48px)
 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs min-h-[2.5rem]',
  md: 'px-4 py-2 text-sm min-h-[2.75rem]',
  lg: 'px-6 py-3 text-base min-h-[3rem]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          font-medium rounded-xl
          transition-all duration-normal ease-lumen
          focus:outline-none focus:ring-[3px] focus:ring-lumen-gold focus:ring-offset-2 focus:ring-offset-lumen-void
          active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${loading ? 'pointer-events-none' : ''}
          ${className}
        `
          .trim()
          .replace(/\s+/g, ' ')}
        {...props}
      >
        {loading && <Loader2 className='w-4 h-4 animate-spin' aria-hidden='true' />}
        {!loading && icon && iconPosition === 'left' && (
          <span className='inline-flex' aria-hidden='true'>
            {icon}
          </span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span className='inline-flex' aria-hidden='true'>
            {icon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
