/**
 * 🎬 Input Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 *
 * @description Form input component with validation states
 * @author Cinema Online Team
 * @version 2.0.0
 *
 * Implements Requirements:
 * - 5.1: Base styles (rounded-xl, surface background, cream text, muted border)
 * - 5.2: Focus state (gold border, gold ring shadow)
 * - 5.3: Error state (red-400 border, red-400/10 background, error message)
 * - 5.4: Valid state (emerald-500 border, checkmark icon)
 * - 5.5: Disabled state (50% opacity, cursor-not-allowed)
 * - 5.6: Sizes (sm, md, lg)
 * - 5.7: Label with proper htmlFor association
 * - 20.4: Proper label association for accessibility
 */

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';

export type InputSize = 'sm' | 'md' | 'lg';
export type IconPosition = 'left' | 'right';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Icon element to display */
  icon?: ReactNode;
  /** Position of icon relative to input */
  iconPosition?: IconPosition;
  /** Valid state - shows checkmark */
  valid?: boolean;
  /** Input size */
  size?: InputSize;
}

/**
 * Size styles with proper heights
 * - sm: px-3 py-2, text-sm, h-10 (40px)
 * - md: px-4 py-2.5, text-sm, h-11 (44px)
 * - lg: px-5 py-3, text-base, h-12 (48px)
 */
const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm h-10',
  md: 'px-4 py-2.5 text-sm h-11',
  lg: 'px-5 py-3 text-base h-12',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      iconPosition = 'left',
      valid = false,
      size = 'md',
      disabled = false,
      className = '',
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = providedId || generatedId;
    const hasError = !!error;

    return (
      <div className='w-full'>
        {/* Label */}
        {label && (
          <label htmlFor={inputId} className='block text-sm font-medium text-lumen-cream mb-2'>
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className='relative'>
          {/* Left Icon */}
          {icon && iconPosition === 'left' && (
            <div className='absolute left-3 top-1/2 -translate-y-1/2 text-lumen-silver'>{icon}</div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`
              w-full rounded-xl
              bg-lumen-surface text-lumen-cream
              border
              placeholder:text-lumen-silver/50
              transition-all duration-normal ease-lumen
              focus:outline-none focus:ring-2 focus:ring-lumen-gold focus:ring-offset-2 focus:ring-offset-lumen-void
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon && iconPosition === 'left' ? 'pl-10' : ''}
              ${(icon && iconPosition === 'right') || valid ? 'pr-10' : ''}
              ${
                hasError
                  ? 'border-red-400 bg-red-400/10 focus:border-red-400'
                  : valid
                    ? 'border-emerald-500 focus:border-emerald-500'
                    : 'border-white/15 focus:border-lumen-gold'
              }
              ${sizeStyles[size]}
              ${className}
            `
              .trim()
              .replace(/\s+/g, ' ')}
            {...props}
          />

          {/* Right Icon or Valid Checkmark */}
          {valid && !hasError && (
            <div className='absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500'>
              <Check className='w-5 h-5' aria-hidden='true' />
            </div>
          )}
          {icon && iconPosition === 'right' && !valid && (
            <div className='absolute right-3 top-1/2 -translate-y-1/2 text-lumen-silver'>
              {icon}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className='mt-1.5 text-sm text-red-400' role='alert'>
            {error}
          </p>
        )}

        {/* Helper Text */}
        {!error && helperText && <p className='mt-1.5 text-sm text-lumen-silver'>{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
