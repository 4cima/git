/**
 * Login Page
 * Email/password login form
 */

'use client'

import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { InputField } from '@/components/auth/InputField'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { refreshProfile } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setError(null)
    
    // Validation
    if (!email || !password) {
      setError('يرجى ملء جميع الحقول')
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('يرجى إدخال بريد إلكتروني صحيح')
      return
    }

    // Password length validation
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) throw signInError

      if (data.user) {
        // Refresh profile to load user data
        await refreshProfile()
        
        // Redirect to home
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      console.error('Login error:', err)
      
      // User-friendly error messages in Arabic
      let message = 'حدث خطأ أثناء تسجيل الدخول'
      
      if (err.message?.includes('Invalid login credentials')) {
        message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      } else if (err.message?.includes('Email not confirmed')) {
        message = 'البريد الإلكتروني غير مفعل. يرجى التحقق من بريدك الوارد.'
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        message = 'خطأ في الاتصال بالشبكة. يرجى المحاولة مرة أخرى.'
      } else if (err.message) {
        message = err.message
      }
      
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="تسجيل الدخول"
      subtitle="Sign in to your account"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={async () => {
            try {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/api/auth/callback`,
                },
              })
              if (error) throw error
            } catch (err: any) {
              console.error('Google sign in error:', err)
              // Graceful degradation if Google OAuth not enabled
              setError('تسجيل الدخول بجوجل غير مفعل حالياً. يرجى استخدام البريد الإلكتروني.')
            }
          }}
          className="
            w-full h-12 rounded-xl font-semibold
            bg-white hover:bg-gray-50 text-gray-900
            border-2 border-zinc-700
            active:scale-[0.98]
            transition-all duration-200
            flex items-center justify-center gap-3
          "
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>تسجيل الدخول بجوجل</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-zinc-800"></div>
          <span className="text-sm text-zinc-500">أو</span>
          <div className="flex-1 h-px bg-zinc-800"></div>
        </div>

        {/* Email */}
        <InputField
          label="البريد الإلكتروني"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="name@example.com"
          icon={Mail}
          required
          autoComplete="email"
        />

        {/* Password */}
        <InputField
          label="كلمة المرور"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          icon={Lock}
          required
          autoComplete="current-password"
        />

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="
            w-full h-12 rounded-xl font-semibold text-white
            bg-gradient-to-r from-red-600 to-red-500
            hover:from-red-500 hover:to-red-400
            active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            shadow-lg shadow-red-600/20
            flex items-center justify-center gap-2
          "
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>جاري تسجيل الدخول...</span>
            </>
          ) : (
            'تسجيل الدخول'
          )}
        </button>

        {/* Register Link */}
        <div className="pt-4 text-center text-sm text-zinc-400">
          ليس لديك حساب؟{' '}
          <Link
            href="/register"
            className="text-cyan-400 font-semibold hover:text-cyan-300 hover:underline transition-colors"
          >
            سجل الآن
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
