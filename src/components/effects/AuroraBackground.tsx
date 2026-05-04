import { memo } from 'react'

/**
 * LUMEN ambient background — warm, subtle mesh (no images).
 * Pure CSS; sits behind content at z-index -1.
 */
export const AuroraBackground = memo(() => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 bg-lumen-void" />
      {/* Soft warm glow — gold/amber, very low opacity */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-[0.12] animate-lumen-breathe"
        style={{ background: 'radial-gradient(circle, rgba(201,169,98,0.25) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] opacity-[0.08] animate-lumen-breathe"
        style={{ background: 'radial-gradient(circle, rgba(201,169,98,0.2) 0%, transparent 70%)', animationDelay: '2s' }}
      />
    </div>
  )
})
