import { Metadata } from 'next'
import { Activity, Film, Tv, Users, Database, AlertTriangle } from 'lucide-react'
import { turso } from '@/lib/turso'

export const metadata: Metadata = {
  title: 'Dashboard | 4CIMA Admin',
}

export const revalidate = 0 // Always fetch fresh data for admin

export default async function DashboardPage() {
  // Fetch basic stats
  const [moviesCount, seriesCount, seasonsCount] = await Promise.all([
    turso.execute('SELECT COUNT(*) as count FROM movies'),
    turso.execute('SELECT COUNT(*) as count FROM tv_series'),
    turso.execute('SELECT COUNT(*) as count FROM tv_seasons'),
  ])

  const stats = [
    { 
      name: 'Total Movies', 
      value: moviesCount.rows[0].count, 
      icon: Film, 
      color: 'text-blue-400',
      bg: 'bg-blue-400/10'
    },
    { 
      name: 'Total Series', 
      value: seriesCount.rows[0].count, 
      icon: Tv, 
      color: 'text-purple-400',
      bg: 'bg-purple-400/10'
    },
    { 
      name: 'Total Seasons', 
      value: seasonsCount.rows[0].count, 
      icon: Activity, 
      color: 'text-green-400',
      bg: 'bg-green-400/10'
    },
    { 
      name: 'Registered Users', 
      value: '---', 
      icon: Users, 
      color: 'text-orange-400',
      bg: 'bg-orange-400/10'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center gap-4">
            <div className={`p-4 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-zinc-400 font-medium">{stat.name}</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 transition-colors text-left group">
              <Film className="w-5 h-5 text-zinc-400 group-hover:text-cyan-400 mb-2" />
              <span className="block text-sm font-medium text-zinc-200">Add New Movie</span>
            </button>
            <button className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 transition-colors text-left group">
              <Tv className="w-5 h-5 text-zinc-400 group-hover:text-purple-400 mb-2" />
              <span className="block text-sm font-medium text-zinc-200">Add New Series</span>
            </button>
            <button className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 transition-colors text-left group">
              <Database className="w-5 h-5 text-zinc-400 group-hover:text-green-400 mb-2" />
              <span className="block text-sm font-medium text-zinc-200">Sync TMDB Data</span>
            </button>
            <button className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 transition-colors text-left group">
              <AlertTriangle className="w-5 h-5 text-zinc-400 group-hover:text-orange-400 mb-2" />
              <span className="block text-sm font-medium text-zinc-200">Check Broken Links</span>
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            System Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-zinc-300">Turso Database</span>
              </div>
              <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-zinc-300">TMDB API</span>
              </div>
              <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded">Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-zinc-300">Next.js Cache</span>
              </div>
              <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded">Healthy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Need to import Zap for the Quick Actions icon
import { Zap } from 'lucide-react'