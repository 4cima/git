import {Zap, ShieldCheck, Globe, Wifi, Activity, X} from 'lucide-react'
import { Server } from '../../../hooks/useServers'
import {motion} from 'framer-motion'
import clsx from 'clsx'

type Props = {
  servers: Server[]
  active: number
  onSelect: (index: number) => void
  lang?: 'ar' | 'en'
}

export const ServerSelector = ({ servers, active, onSelect, lang = 'ar' }: Props) => {
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  const handleSelect = (idx: number) => {
    if (idx === active) return
    window.setTimeout(() => onSelect(idx), 0)
  }

  const getShortName = (_name: string, idx: number) => {
    return `V${idx + 1}`
  }

  const getIcon = (name: string, idx: number, status?: Server['status']) => {
    if (status === 'offline') return <X size={10} className="text-rose-500" />
    if (status === 'unknown') return <div className="w-1 h-1 rounded-full bg-zinc-600 animate-pulse" />
    const n = name.toLowerCase()
    if (n.includes('vidsrc')) return <Zap size={10} />
    if (n.includes('embed')) return <ShieldCheck size={10} />
    if (n.includes('link')) return <Globe size={10} />
    return <Wifi size={10} />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-lumen-gold/10 text-lumen-gold">
            <Activity size={14} />
          </div>
          <h3 className="text-[11px] font-black text-white uppercase tracking-tight">
            {t('اختر السيرفر', 'Select Server')}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">
            {servers.filter(s => s.status !== 'offline').length} {t('سيرفرات', 'Servers')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1">
        {servers.map((s, idx) => {
            const isActive = idx === active
            const isOffline = s.status === 'offline'
            const isUnknown = s.status === 'unknown'
            
            return (
              <motion.button
                key={`${s.name}-${idx}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelect(idx)}
                onPointerDown={(e) => e.preventDefault()}
                className={clsx(
                  "group relative flex items-center justify-center rounded-lg border transition-all duration-300 h-11 w-full overflow-hidden",
                  isActive
                    ? "bg-emerald-500 border-transparent text-white shadow-lg shadow-emerald-500/20"
                    : isOffline 
                      ? "bg-rose-500/5 border-rose-500/20 text-zinc-600 cursor-not-allowed opacity-50"
                      : "bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.05] hover:border-white/20 hover:text-white"
                )}
                disabled={isOffline && !isActive}
              >
                {/* Inner Content Container */}
                <div className={clsx(
                  "relative z-10 flex items-center justify-center gap-1.5 w-[calc(100%-4px)] h-[calc(100%-4px)] rounded-[6px] px-1",
                  isActive ? "bg-emerald-500" : isOffline ? "bg-black/40" : ""
                )}>
                  <div className={clsx(
                    "shrink-0",
                    isActive ? "text-white" : isOffline ? "text-rose-500/50" : "text-zinc-500 group-hover:text-white transition-colors"
                  )}>
                    {getIcon(s.name, idx, s.status)}
                  </div>

                  <span className={clsx(
                    "font-black uppercase tracking-tighter text-xs md:text-sm whitespace-nowrap",
                    isOffline && "line-through opacity-50"
                  )}>
                    {getShortName(s.name, idx)}
                  </span>
                  
                  {isOffline && (
                    <div className="absolute top-1 right-1">
                      <X size={8} className="text-rose-500" />
                    </div>
                  )}
                </div>
                
                {/* Active Indicator Border Shadow */}
                {isActive && (
                  <motion.div
                    layoutId="active-server"
                    className="absolute -inset-0.5 rounded-lg border border-emerald-500/50 pointer-events-none"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}

                {/* Checking Pulse */}
                {isUnknown && (
                  <motion.div 
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 bg-white/5 z-0"
                  />
                )}
              </motion.button>
            )
          })}
      </div>
    </div>
  )
}
