'use client'

import { useEffect, useRef } from 'react'

/**
 * لافتة الشريط المتحرك + العدسة المكبّرة (هيرو الرئيسية).
 *
 * الأداء: النسخة القديمة كانت تشغّل حلقتَي requestAnimationFrame كل واحدة
 * تعمل setState كل إطار (~120 re-render/ثانية) وتقرأ offsetWidth/offsetHeight
 * داخل الرسم (forced reflow) ⇒ تجميد الخيط الرئيسي وINP سيء على الموبايل.
 * الآن: حلقة واحدة تكتب الأنماط مباشرة على الـDOM عبر refs — صفر re-renders —
 * ومقاس الحاوية يُقاس عند التغيير فقط (ResizeObserver) لا داخل حلقة الرسم.
 * الشكل والحركة مطابقان للنسخة السابقة حرفيًا.
 */
export const MarqueeBanner = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)
  const lensRef = useRef<HTMLDivElement>(null)
  const lensBannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const banner = bannerRef.current
    const lens = lensRef.current
    const lensBanner = lensBannerRef.current
    if (!container || !banner || !lens || !lensBanner) return

    /* مقاس الحاوية يُقاس عند التغيير فقط — لا قياس هندسي داخل حلقة الرسم */
    let boxW = container.offsetWidth
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            boxW = container.offsetWidth
          })
        : null
    ro?.observe(container)

    /* اتجاه عشوائي معتدل + ارتداد عند الحواف — نفس منطق النسخة القديمة */
    const direction = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 }
    const position = { x: 50, y: 50 }
    const speed = 0.15

    let raf = 0
    const start = performance.now()
    const frame = (now: number) => {
      const t = now - start

      /* تمرير اللافتة — مستمر بلا قفز (الزمن يزيد دائمًا) */
      const scrollX = t / 30
      banner.style.backgroundPosition = `${-scrollX}px center`

      /* حركة العدسة */
      position.x += direction.x * speed
      position.y += direction.y * speed
      if (position.x <= 15 || position.x >= 85) {
        direction.x *= -1
        position.x = Math.max(15, Math.min(85, position.x))
      }
      if (position.y <= 25 || position.y >= 75) {
        direction.y *= -1
        position.y = Math.max(25, Math.min(75, position.y))
      }
      lens.style.left = `${position.x}%`
      lens.style.top = `${position.y}%`

      /* مزامنة محتوى العدسة مع اللافتة (نفس إزاحة التمرير − موضع العدسة بالبكسل) */
      const lensPx = (position.x / 100) * boxW
      lensBanner.style.backgroundPosition = `${-scrollX - lensPx}px center`

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-20 overflow-hidden bg-black/30">
      {/* Seamless Scrolling Banner */}
      <div
        ref={bannerRef}
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/banner.png)',
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: '0px center',
        }}
      />

      {/* Magnifying Lens Effect - Above everything */}
      <div
        ref={lensRef}
        className="absolute pointer-events-none z-50"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Outer Glow */}
        <div className="absolute inset-0 w-18 h-18 rounded-full bg-gradient-radial from-cyan-400/20 via-blue-500/10 to-transparent blur-xl animate-pulse" />

        {/* Lens Container */}
        <div className="relative w-15 h-15 rounded-full border-[3px] border-white/70 shadow-[0_0_20px_rgba(255,255,255,0.3)] overflow-hidden bg-black/20 backdrop-blur-[2px]">
          {/* Banner Content - perfectly synced */}
          <div
            ref={lensBannerRef}
            className="absolute scale-[1.3]"
            style={{
              backgroundImage: 'url(/banner.png)',
              backgroundSize: 'auto 100%',
              backgroundRepeat: 'repeat-x',
              backgroundPosition: '0px center',
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
      </div>

      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />

      {/* Hide top and bottom edges */}
      <div className="absolute top-0 left-0 right-0 h-[5px] bg-black pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-black pointer-events-none" />
    </div>
  )
}
