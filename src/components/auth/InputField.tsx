/**
 * InputField - Styled input with floating label, icon, and validation
 * Features: focus glow, show/hide toggle for password, inline errors
 */

'use client'

import { useState, forwardRef } from 'react'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'

interface InputFieldProps {
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  icon?: LucideIcon
  required?: boolean
  disabled?: boolean
  autoComplete?: string
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      type = 'text',
      value,
      onChange,
      error,
      placeholder,
      icon: Icon,
      required = false,
      disabled = false,
      autoComplete,
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const inputType = type === 'password' && showPassword ? 'text' : type
    const hasValue = value.length > 0
    const showFloatingLabel = isFocused || hasValue

    return (
      <div className="space-y-1.5">
        <div className="relative">
          {/* Floating Label */}
          <label
            className={`
              absolute right-3 pointer-events-none transition-all duration-200
              ${showFloatingLabel ? 'top-2 text-[9px] text-cyan-400 font-bold uppercase tracking-widest' : 'top-1/2 -translate-y-1/2 text-sm text-zinc-500'}
              ${Icon && !showFloatingLabel ? 'right-10' : ''}
            `}
          >
            {label}
            {required && <span className="text-red-500 mr-1">*</span>}
          </label>

          {/* Icon */}
          {Icon && (
            <div className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isFocused ? 'text-cyan-400' : 'text-zinc-500'}`}>
              <Icon size={18} />
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isFocused ? placeholder : ''}
            disabled={disabled}
            autoComplete={autoComplete}
            className={`
              w-full h-12 rounded-xl border bg-zinc-950/50 text-sm text-zinc-100
              transition-all duration-200 outline-none
              ${Icon ? 'pr-10' : 'pr-4'}
              ${type === 'password' ? 'pl-10' : 'pl-4'}
              ${showFloatingLabel ? 'pt-5 pb-1' : 'py-3'}
              ${error ? 'border-red-500/50 focus:border-red-500' : isFocused ? 'border-cyan-400/50 shadow-[0_0_0_3px_rgba(34,211,238,0.1)]' : 'border-zinc-800 hover:border-zinc-700'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              placeholder:text-zinc-600
            `}
          />

          {/* Password Toggle */}
          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-xs text-red-400 pr-1 animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}
      </div>
    )
  }
)

InputField.displayName = 'InputField'
