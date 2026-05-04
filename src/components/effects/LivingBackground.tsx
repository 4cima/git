import { useEffect } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export const LivingBackground = () => {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 30, stiffness: 200 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const targetX = clientX - window.innerWidth / 2
      const targetY = clientY - window.innerHeight / 2
      mouseX.set(targetX)
      mouseY.set(targetY)
    }

    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#030305] pointer-events-none">
      {/* 1. The Neural Grid */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 204, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 204, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)'
        }}
      />

      {/* 2. The Living Orbs */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2 bg-purple-600/30 rounded-full blur-[80px] mix-blend-screen will-change-transform"
        style={{ x, y }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 bg-cyan-500/20 rounded-full blur-[60px] mix-blend-screen will-change-transform"
        style={{ x: useSpring(mouseX, { damping: 50, stiffness: 100 }), y: useSpring(mouseY, { damping: 50, stiffness: 100 }) }}
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "mirror", delay: 1 }}
      />

      {/* 3. Scanline Overlay (Optimized Noise) */}
      <div 
        className="absolute inset-0 z-50 pointer-events-none opacity-[0.03]"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} 
      />
      
      {/* 4. Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#030305_90%)]" />
    </div>
  )
}
