'use client'

import { ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import Link from 'next/link'

type SectionTheme = 'cyan' | 'purple' | 'red' | 'gold' | 'pink' | 'blue' | 'green' | 'indigo' | 'orange'

const THEMES: Record<SectionTheme, {
  iconBox: string
  iconGlow: string
  titleHover: string
  arteryPulse: string
  badgeDot: string
  badgeLine: string
  badgeBox: string
  badgeIconFill: string
  actionBtn: string
  actionText: string
  actionIconBg: string
  actionIcon: string
  circuitColor: string
}> = {
  cyan: {
    iconBox: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)] group-hover/header:shadow-[0_0_25px_rgba(6,182,212,0.25)]',
    iconGlow: 'bg-cyan-400/20',
    titleHover: 'group-hover/header:text-cyan-50',
    arteryPulse: 'via-cyan-500/50',
    badgeDot: 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]',
    badgeLine: 'from-cyan-500',
    badgeBox: 'border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
    badgeIconFill: 'fill-cyan-400',
    actionBtn: 'hover:border-cyan-500/50 hover:bg-cyan-950/20',
    actionText: 'group-hover/btn:text-cyan-400',
    actionIconBg: 'group-hover/btn:bg-cyan-500/20',
    actionIcon: 'group-hover/btn:text-cyan-400',
    circuitColor: 'rgba(6,182,212,0.1)'
  },
  blue: {
    iconBox: 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover/header:shadow-[0_0_25px_rgba(59,130,246,0.25)]',
    iconGlow: 'bg-blue-400/20',
    titleHover: 'group-hover/header:text-blue-50',
    arteryPulse: 'via-blue-500/50',
    badgeDot: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]',
    badgeLine: 'from-blue-500',
    badgeBox: 'border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    badgeIconFill: 'fill-blue-400',
    actionBtn: 'hover:border-blue-500/50 hover:bg-blue-950/20',
    actionText: 'group-hover/btn:text-blue-400',
    actionIconBg: 'group-hover/btn:bg-blue-500/20',
    actionIcon: 'group-hover/btn:text-blue-400',
    circuitColor: 'rgba(59,130,246,0.1)'
  },
  green: {
    iconBox: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover/header:shadow-[0_0_25px_rgba(16,185,129,0.25)]',
    iconGlow: 'bg-emerald-400/20',
    titleHover: 'group-hover/header:text-emerald-50',
    arteryPulse: 'via-emerald-500/50',
    badgeDot: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]',
    badgeLine: 'from-emerald-500',
    badgeBox: 'border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    badgeIconFill: 'fill-emerald-400',
    actionBtn: 'hover:border-emerald-500/50 hover:bg-emerald-950/20',
    actionText: 'group-hover/btn:text-emerald-400',
    actionIconBg: 'group-hover/btn:bg-emerald-500/20',
    actionIcon: 'group-hover/btn:text-emerald-400',
    circuitColor: 'rgba(16,185,129,0.1)'
  },
  indigo: {
    iconBox: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)] group-hover/header:shadow-[0_0_25px_rgba(99,102,241,0.25)]',
    iconGlow: 'bg-indigo-400/20',
    titleHover: 'group-hover/header:text-indigo-50',
    arteryPulse: 'via-indigo-500/50',
    badgeDot: 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]',
    badgeLine: 'from-indigo-500',
    badgeBox: 'border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]',
    badgeIconFill: 'fill-indigo-400',
    actionBtn: 'hover:border-indigo-500/50 hover:bg-indigo-950/20',
    actionText: 'group-hover/btn:text-indigo-400',
    actionIconBg: 'group-hover/btn:bg-indigo-500/20',
    actionIcon: 'group-hover/btn:text-indigo-400',
    circuitColor: 'rgba(99,102,241,0.1)'
  },
  orange: {
    iconBox: 'bg-orange-500/10 border-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)] group-hover/header:shadow-[0_0_25px_rgba(249,115,22,0.25)]',
    iconGlow: 'bg-orange-400/20',
    titleHover: 'group-hover/header:text-orange-50',
    arteryPulse: 'via-orange-500/50',
    badgeDot: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]',
    badgeLine: 'from-orange-500',
    badgeBox: 'border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    badgeIconFill: 'fill-orange-400',
    actionBtn: 'hover:border-orange-500/50 hover:bg-orange-950/20',
    actionText: 'group-hover/btn:text-orange-400',
    actionIconBg: 'group-hover/btn:bg-orange-500/20',
    actionIcon: 'group-hover/btn:text-orange-400',
    circuitColor: 'rgba(249,115,22,0.1)'
  },
  purple: {
    iconBox: 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)] group-hover/header:shadow-[0_0_25px_rgba(168,85,247,0.25)]',
    iconGlow: 'bg-purple-400/20',
    titleHover: 'group-hover/header:text-purple-50',
    arteryPulse: 'via-purple-500/50',
    badgeDot: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]',
    badgeLine: 'from-purple-500',
    badgeBox: 'border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    badgeIconFill: 'fill-purple-400',
    actionBtn: 'hover:border-purple-500/50 hover:bg-purple-950/20',
    actionText: 'group-hover/btn:text-purple-400',
    actionIconBg: 'group-hover/btn:bg-purple-500/20',
    actionIcon: 'group-hover/btn:text-purple-400',
    circuitColor: 'rgba(168,85,247,0.1)'
  },
  red: {
    iconBox: 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)] group-hover/header:shadow-[0_0_25px_rgba(239,68,68,0.25)]',
    iconGlow: 'bg-red-400/20',
    titleHover: 'group-hover/header:text-red-50',
    arteryPulse: 'via-red-500/50',
    badgeDot: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]',
    badgeLine: 'from-red-500',
    badgeBox: 'border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    badgeIconFill: 'fill-red-400',
    actionBtn: 'hover:border-red-500/50 hover:bg-red-950/20',
    actionText: 'group-hover/btn:text-red-400',
    actionIconBg: 'group-hover/btn:bg-red-500/20',
    actionIcon: 'group-hover/btn:text-red-400',
    circuitColor: 'rgba(239,68,68,0.1)'
  },
  gold: {
    iconBox: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)] group-hover/header:shadow-[0_0_25px_rgba(234,179,8,0.25)]',
    iconGlow: 'bg-yellow-400/20',
    titleHover: 'group-hover/header:text-yellow-50',
    arteryPulse: 'via-yellow-500/50',
    badgeDot: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]',
    badgeLine: 'from-yellow-500',
    badgeBox: 'border-yellow-500/30 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]',
    badgeIconFill: 'fill-yellow-400',
    actionBtn: 'hover:border-yellow-500/50 hover:bg-yellow-950/20',
    actionText: 'group-hover/btn:text-yellow-400',
    actionIconBg: 'group-hover/btn:bg-yellow-500/20',
    actionIcon: 'group-hover/btn:text-yellow-400',
    circuitColor: 'rgba(234,179,8,0.1)'
  },
  pink: {
    iconBox: 'bg-pink-500/10 border-pink-500/20 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.1)] group-hover/header:shadow-[0_0_25px_rgba(236,72,153,0.25)]',
    iconGlow: 'bg-pink-400/20',
    titleHover: 'group-hover/header:text-pink-50',
    arteryPulse: 'via-pink-500/50',
    badgeDot: 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]',
    badgeLine: 'from-pink-500',
    badgeBox: 'border-pink-500/30 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.3)]',
    badgeIconFill: 'fill-pink-400',
    actionBtn: 'hover:border-pink-500/50 hover:bg-pink-950/20',
    actionText: 'group-hover/btn:text-pink-400',
    actionIconBg: 'group-hover/btn:bg-pink-500/20',
    actionIcon: 'group-hover/btn:text-pink-400',
    circuitColor: 'rgba(236,72,153,0.1)'
  }
}

type Props = {
  title: string
  icon: React.ReactNode
  link?: string
  badge?: string
  actions?: React.ReactNode
  color?: SectionTheme
}

export const SectionHeader = ({ title, icon, link, badge, actions, color = 'cyan' }: Props) => {
  const lang = 'ar' // Default to Arabic
  const ArrowIcon = lang === 'ar' ? ChevronLeft : ChevronRight
  const isRtl = lang === 'ar'
  const theme = THEMES[color]

  return (
    <div className="relative flex flex-col md:flex-row md:items-center w-full mb-8 group/header gap-4 md:gap-0">
      {/* 1. Title Section */}
      <div className="flex items-center gap-3 shrink-0 z-10 md:pr-6 md:rtl:pl-6 md:rtl:pr-0 bg-[#08080c] w-full md:w-auto">
        <div className={`p-2.5 rounded-xl transition-all duration-500 group-hover/header:scale-110 relative overflow-hidden border ${theme.iconBox}`}>
          <div className={`absolute inset-0 blur-xl opacity-0 group-hover/header:opacity-100 transition-opacity duration-500 ${theme.iconGlow}`} />
          {icon}
        </div>
        <h2 className={`text-2xl md:text-3xl font-black text-white tracking-tight uppercase transition-colors duration-300 ${theme.titleHover}`}>
          {title}
        </h2>
      </div>

      {/* 2. The Artery (Circuit Line) */}
      <div className="hidden md:flex md:flex-1 relative h-[2px] bg-zinc-800/50 overflow-visible self-center items-center mx-[-10px] z-0">
        {/* Circuit Pattern Background */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `linear-gradient(90deg, transparent 50%, ${theme.circuitColor} 50%)`, backgroundSize: '20px 100%' }} />
        
        {/* Animated Pulse */}
        <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent w-full opacity-0 group-hover/header:opacity-100 transition-opacity duration-1000 animate-pulse ${theme.arteryPulse}`} />
        
        {/* The Branch Node (Only if badge exists) */}
        {badge && (
          <div className={`absolute ${isRtl ? 'left-[20%]' : 'right-[20%]'} top-1/2 -translate-y-1/2 w-2 h-2 rounded-full z-20 scale-0 group-hover/header:scale-100 transition-transform duration-500 delay-100 ${theme.badgeDot}`}>
            {/* Branch Line */}
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 w-[1px] h-6 bg-gradient-to-t to-transparent ${theme.badgeLine}`} />
            {/* Branch Label */}
            <div className={`absolute bottom-full mb-6 left-1/2 -translate-x-1/2 bg-black/90 px-3 py-1 rounded-md text-[10px] font-bold whitespace-nowrap backdrop-blur-md opacity-0 group-hover/header:opacity-100 transition-all duration-300 transform translate-y-2 group-hover/header:translate-y-0 border ${theme.badgeBox}`}>
              <div className="flex items-center gap-1">
                <Zap size={10} className={theme.badgeIconFill} />
                {badge}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Actions / View All Button */}
      <div className="shrink-0 z-10 md:pl-6 md:rtl:pr-6 md:rtl:pl-0 bg-[#08080c] flex items-center gap-4 w-full md:w-auto">
        {actions}

        {link && (
          <Link href={link}>
            <div className={`group/btn flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 transition-all duration-300 ${theme.actionBtn}`}>
              <span className={`text-xs font-bold text-zinc-400 transition-colors uppercase tracking-wider ${theme.actionText}`}>
                {lang === 'ar' ? 'عرض الكل' : 'View All'}
              </span>
              <div className={`w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center transition-colors ${theme.actionIconBg}`}>
                <ArrowIcon className={`w-3 h-3 text-zinc-400 transition-colors ${theme.actionIcon}`} />
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
