'use client'

export const HolographicCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`relative group ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-overlay z-50" />
      
      {/* Holographic Sheen */}
      <div 
        className="absolute inset-0 z-40 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-300 bg-white/10"
        style={{ mixBlendMode: 'color-dodge' }}
      />

      <div className="relative h-full w-full bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden shadow-lg transition-all duration-300 group-hover:border-cyan-500/30 group-hover:shadow-cyan-500/20 group-hover:-translate-y-1">
        {children}
      </div>
    </div>
  )
}
