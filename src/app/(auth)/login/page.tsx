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
      title="مرحباً بعودتك"
      subtitle="Welcome back"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
