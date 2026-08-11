/**
 * Register Page
 * User registration with username, email, password, and confirmation
 */

'use client'

import { useState } from 'react'
import { Mail, Lock, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { InputField } from '@/components/auth/InputField'
import { supabase, ensureProfile } from '@/lib/supabase'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!username || !email || !password || !confirmPassword) {
      setError('يرجى ملء جميع الحقول')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.trim(),
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Ensure profile is created with the username
        await ensureProfile(data.user.id, data.user.email)
        
        // Update username in profile
        await supabase
          .from('profiles')
          .update({ username: username.trim() })
          .eq('id', data.user.id)

        // Redirect to home
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      
      // User-friendly error messages in Arabic
      let message = 'حدث خطأ أثناء إنشاء الحساب'
      
      if (err.message?.includes('User already registered')) {
        message = 'البريد الإلكتروني مسجل بالفعل'
      } else if (err.message?.includes('Password should be at least 6 characters')) {
        message = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      } else if (err.message?.includes('Unable to validate email address')) {
        message = 'البريد الإلكتروني غير صحيح'
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
      title="انضم إلينا"
      subtitle="Join us"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <InputField
          label="اسم المستخدم"
          type="text"
          value={username}
          onChange={setUsername}
          placeholder="username"
          icon={User}
          required
          autoComplete="username"
        />

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
          autoComplete="new-password"
        />

        {/* Confirm Password */}
        <InputField
          label="تأكيد كلمة المرور"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="••••••••"
          icon={Lock}
          required
          autoComplete="new-password"
        />

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
              <span>جاري إنشاء الحساب...</span>
            </>
          ) : (
            'إنشاء حساب'
          )}
        </button>

        {/* Login Link */}
        <div className="pt-4 text-center text-sm text-zinc-400">
          لديك حساب بالفعل؟{' '}
          <Link
            href="/login"
            className="text-cyan-400 font-semibold hover:text-cyan-300 hover:underline transition-colors"
          >
            سجل دخول
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
