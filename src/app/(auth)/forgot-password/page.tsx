/**
 * Forgot Password Page
 * Request password reset via email
 */

'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { InputField } from '@/components/auth/InputField'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous messages
    setError(null)
    setSuccess(false)
    
    // Validation
    if (!email) {
      setError('يرجى إدخال البريد الإلكتروني')
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('يرجى إدخال بريد إلكتروني صحيح')
      return
    }

    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (resetError) throw resetError

      // Show success message
      setSuccess(true)
    } catch (err: any) {
      console.error('Password reset error:', err)
      
      // User-friendly error messages in Arabic
      let message = 'حدث خطأ أثناء إرسال رابط إعادة التعيين'
      
      if (err.message?.includes('network') || err.message?.includes('fetch')) {
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
      title="نسيت كلمة المرور؟"
      subtitle="Reset your password"
    >
      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-zinc-400 mb-6">
            أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
          </p>

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
                <span>جاري الإرسال...</span>
              </>
            ) : (
              'إرسال رابط إعادة التعيين'
            )}
          </button>

          {/* Back to Login Link */}
          <div className="pt-4 text-center text-sm text-zinc-400">
            تذكرت كلمة المرور؟{' '}
            <Link
              href="/login"
              className="text-cyan-400 font-semibold hover:text-cyan-300 hover:underline transition-colors"
            >
              سجل دخول
            </Link>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Success Message */}
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="font-semibold text-green-400">تم إرسال الرابط</h3>
            </div>
            <p className="text-sm text-zinc-300">
              تحقق من بريدك الإلكتروني على <span className="font-semibold text-white">{email}</span>
            </p>
            <p className="text-sm text-zinc-400 mt-2">
              قد يستغرق وصول الرسالة بضع دقائق. تحقق من مجلد البريد المزعج إذا لم تجدها.
            </p>
          </div>

          {/* Back to Login Button */}
          <Link
            href="/login"
            className="
              w-full h-12 rounded-xl font-semibold text-white
              bg-zinc-800 hover:bg-zinc-700
              active:scale-[0.98]
              transition-all duration-200
              flex items-center justify-center
            "
          >
            العودة إلى تسجيل الدخول
          </Link>

          {/* Resend Link */}
          <button
            onClick={() => setSuccess(false)}
            className="w-full text-sm text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
          >
            لم تستلم الرسالة؟ أرسل مرة أخرى
          </button>
        </div>
      )}
    </AuthCard>
  )
}
