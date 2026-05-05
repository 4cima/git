'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useAnimationFrame } from 'framer-motion'

export const MarqueeBanner = () => {
  const [lensPosition, setLensPosition] = useState({ x: 50, y: 50 })
  const [scrollX, setScrollX] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

  // Lens movement - smooth and moderate speed
  useEffect(() => {
    let direction = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 }
    let position = { x: 50, y: 50 }
    let speed = 0.15

    const animate = () => {
      position.x += direction.x * speed
      position.y += direction.y * speed

      // Bounce off edges
      if (position.x <= 15 || position.x >= 85) {
        direction.x *= -1
        position.x = Math.max(15, Math.min(85, position.x))
      }
      if (position.y <= 25 || position.y >= 75) {
        direction.y *= -1
        position.y = Math.max(25, Math.min(75, position.y))
      }

      setLensPosition({ x: position.x, y: position.y })
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Continuous scroll for banner - seamless infinite loop
  useAnimationFrame((t) => {
    // Scroll continuously without jumping back
    setScrollX((t / 30))
  })

  // Calculate lens position in pixels relative to container
  const getLensPositionPx = () => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const containerWidth = containerRef.current.offsetWidth
    const containerHeight = containerRef.current.offsetHeight
    return {
      x: (lensPosition.x / 100) * containerWidth,
      y: (lensPosition.y / 100) * containerHeight
    }
  }

  return (
    <div ref={containerRef} className="relative w-full h-20 overflow-hidden bg-black/30">
      {/* Seamless Scrolling Banner */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/banner.png)',
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: `${-scrollX}px center`,
        }}
      />

      {/* Magnifying Lens Effect - Above everything */}
      <motion.div
        className="absolute pointer-events-none z-50"
        style={{
          left: `${lensPosition.x}%`,
          top: `${lensPosition.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Outer Glow */}
        <div className="absolute inset-0 w-18 h-18 rounded-full bg-gradient-radial from-cyan-400/20 via-blue-500/10 to-transparent blur-xl animate-pulse" />
        
        {/* Lens Container */}
        <div className="relative w-15 h-15 rounded-full border-[3px] border-white/70 shadow-[0_0_20px_rgba(255,255,255,0.3)] overflow-hidden bg-black/20 backdrop-blur-[2px]">
          {/* Banner Content - perfectly synced */}
          <div
            className="absolute scale-[1.3]"
            style={{
              backgroundImage: 'url(/banner.png)',
              backgroundSize: 'auto 100%',
              backgroundRepeat: 'repeat-x',
              // Calculate exact position: current scroll + lens X position
              backgroundPosition: `${-scrollX - getLensPositionPx().x}px center`,
              transformOrigin: 'center center',
              width: '100%',
              height: '100%',
              left: 0,
              top: 0,
            }}
          />

          {/* Glass Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-60" />
          
          {/* Lens Highlight */}
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white/60 blur-[4px]" />
        </div>

        {/* Lens Ring Glow */}
        <div className="absolute inset-0 w-15 h-15 rounded-full border border-cyan-400/40 animate-pulse" style={{ animationDuration: '2s' }} />
      </motion.div>

      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />
      
      {/* Hide top and bottom edges */}
      <div className="absolute top-0 left-0 right-0 h-[5px] bg-black pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-black pointer-events-none" />
    </div>
  )
}
