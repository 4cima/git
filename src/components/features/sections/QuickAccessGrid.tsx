'use client'

import { motion } from 'framer-motion'
import { Film, Tv, TrendingUp, Star, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type QuickAccessItem = {
  title: string
  count: number
  icon: any
  color: 'cyan' | 'purple' | 'gold' | 'green'
}

const colorMap = {
  cyan: {
    bg: 'from-cyan-500/20 to-blue-500/20',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/20',
    hover: 'hover:border-cyan-500/60 hover:shadow-cyan-500/40'
  },
  purple: {
    bg: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/20',
    hover: 'hover:border-purple-500/60 hover:shadow-purple-500/40'
  },
  gold: {
    bg: 'from-yellow-500/20 to-orange-500/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    glow: 'shadow-yellow-500/20',
    hover: 'hover:border-yellow-500/60 hover:shadow-yellow-500/40'
  },
  green: {
    bg: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30',
    text: 'text-green-400',
    glow: 'shadow-green-500/20',
    hover: 'hover:border-green-500/60 hover:shadow-green-500/40'
  }
}

export const QuickAccessGrid = ({ items }: { items: QuickAccessItem[] }) => {
  if (!items || items.length === 0) return null

  return (
    <div className="container-padding">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl md:text-3xl font-black text-white mb-6">
          الوصول السريع
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item, index) => {
            const Icon = item.icon
            const colors = colorMap[item.color]

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link href="/movies">
                  <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group relative p-6 rounded-2xl bg-gradient-to-br ${colors.bg} backdrop-blur-sm border ${colors.border} ${colors.hover} transition-all duration-300 shadow-lg ${colors.glow} cursor-pointer overflow-hidden`}
                  >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }} />
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-xl bg-gray-900/40 backdrop-blur-sm flex items-center justify-center mb-4 ${colors.text} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={28} strokeWidth={2} />
                      </div>

                      {/* Title */}
                      <h3 className="text-white font-bold text-lg mb-1 group-hover:translate-x-1 transition-transform">
                        {item.title}
                      </h3>

                      {/* Count */}
                      <div className="flex items-center justify-between">
                        <p className={`${colors.text} font-bold text-2xl`}>
                          {item.count}+
                        </p>
                        <ArrowLeft className={`${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`} size={20} />
                      </div>
                    </div>

                    {/* Glow Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />
                  </motion.div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
