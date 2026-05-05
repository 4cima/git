'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

export const MarqueeBanner = () => {
  const [lensPosition, setLensPosition] = useState({ x: 50, y: 50 })
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    let direction = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 }
    let position = { x: 50, y: 50 }
    let speed = 0.3

    const animate = () => {
      // Update position
      position.x += direction.x * speed
      position.y += direction.y * speed

      // Bounce off edges
      if (position.x <= 10 || position.x >= 90) {
        direction.x *= -1
        position.x = Math.max(10, Math.min(90, position.x))
      }
      if (position.y <= 20 || position.y >= 80) {
        direction.y *= -1
        position.y = Math.max(20, Math.min(80, position.y))
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

  return (
    <div className="relative w-full h-32 overflow-hidden bg-gradient-to-b from-black/50 to-transparent">
      {/* Marquee Container */}
      <div 
        ref={containerRef}
        className="relative w-full h-full"
      >
        {/* Scrolling Banner - 3 copies for seamless loop */}
        <motion.div
          className="absolute inset-0 flex"
          animate={{
            x: [0, -1920, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative flex-shrink-0 w-[1920px] h-full">
              <Image
                src="/banner.png"
                alt="Banner"
                fill
                className="object-cover"
                priority={i === 1}
                quality={90}
              />
            </div>
          ))}
        </motion.div>

        {/* Magnifying Lens Effect */}
        <motion.div
          className="absolute pointer-events-none z-10"
          style={{
            left: `${lensPosition.x}%`,
            top: `${lensPosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Lens Glow */}
          <div className="absolute inset-0 w-40 h-40 rounded-full bg-gradient-radial from-white/30 via-white/10 to-transparent blur-xl" />
          
          {/* Lens Border */}
          <div className="relative w-32 h-32 rounded-full border-4 border-white/40 shadow-2xl overflow-hidden backdrop-blur-sm">
            {/* Magnified Content */}
            <motion.div
              className="absolute inset-0 flex"
              animate={{
                x: [0, -1920, 0],
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                scale: 2,
                transformOrigin: 'center',
              }}
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="relative flex-shrink-0 w-[1920px] h-full">
                  <Image
                    src="/banner.png"
                    alt="Magnified"
                    fill
                    className="object-cover"
                    quality={100}
                  />
                </div>
              ))}
            </motion.div>

            {/* Lens Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
          </div>

          {/* Lens Reflection */}
          <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/30 blur-md" />
        </motion.div>

        {/* Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
      </div>
    </div>
  )
}
