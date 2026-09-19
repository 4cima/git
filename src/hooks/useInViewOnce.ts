'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * بديل خفيف جدًا لـ whileInView({ once: true }) من framer-motion في الكروت.
 * مراقب واحد لكل عنصر يُفصل بمجرد أول ظهور — بلا أي مكتبة خارجية.
 * rootMargin '-40px' = نفس viewport margin '-40px' (يُقلّص حدود الشاشة 40px).
 */
export function useInViewOnce<T extends HTMLElement>(enabled = true, rootMargin = '-40px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!enabled || inView) return
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [enabled, inView, rootMargin])

  return { ref, inView }
}
