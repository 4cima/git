import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
    title: string
    value: number | string
    icon: LucideIcon
    trend?: number
    color?: 'blue' | 'purple' | 'green' | 'red' | 'yellow' | 'pink' | 'cyan'
    subtitle?: string
}

const colorClasses = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    red: 'from-red-500/20 to-rose-500/20 border-red-500/30',
    yellow: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
    pink: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
    cyan: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30'
}

export const StatsCard = ({
    title,
    value,
    icon: Icon,
    trend,
    color = 'blue',
    subtitle
}: StatsCardProps) => (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm border rounded-xl p-4 hover:scale-105 transition-transform`}>
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</span>
            <div className="p-2 rounded-lg bg-white/5">
                <Icon className="w-4 h-4 text-zinc-300" />
            </div>
        </div>
        <div className="flex items-end justify-between">
            <div>
                <div className="text-2xl font-bold text-white">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                {subtitle && (
                    <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
                )}
            </div>
            {typeof trend === 'number' && (
                <div className={`flex items-center gap-1 text-sm font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                    {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
            )}
        </div>
    </div>
)
