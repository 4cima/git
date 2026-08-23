/**
 * UserMenu - Header dropdown for authenticated users
 * Shows avatar, username, profile link, and logout button
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getAvatarUrl } from '@/utils/avatarUtils'

export function UserMenu() {
  const { user, profile, signOut, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Show nothing while loading
  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
    )
  }

  // Show nothing if not authenticated (login link is in sidebar menu)
  if (!user) {
    return null
  }

  // Show user menu if authenticated
  const username = profile?.username || user.email?.split('@')[0] || 'User'
  const firstName = username.split(' ')[0] // Get first name only
  const avatarUrl = getAvatarUrl(profile?.avatar_url, user.id, user.email)
  const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor'

  return (
    <div className="relative" ref={menuRef}>
      {/* Compact Avatar Button with First Name and Arrow */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
      >
        <img
          src={avatarUrl}
          alt={firstName}
          className="w-8 h-8 rounded-full object-cover border-2 border-zinc-700"
        />
        <span className="text-sm font-semibold text-white hidden sm:block">
          {firstName}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-zinc-400 transition-transform hidden sm:block ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1rem)] rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden z-[1300] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-semibold text-zinc-100 truncate">{username}</p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            {isAdmin && (
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-cyan-400/10 text-cyan-400 rounded">
                مشرف
              </span>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              <User size={16} />
              <span>الملف الشخصي</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-cyan-400 hover:bg-cyan-400/10 transition-colors"
              >
                <Settings size={16} />
                <span>لوحة التحكم</span>
              </Link>
            )}

            <button
              onClick={() => {
                setIsOpen(false)
                handleSignOut()
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <LogOut size={16} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
