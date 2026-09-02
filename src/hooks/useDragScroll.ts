'use client'

import { useEffect, useRef, useState } from 'react'

// هوك مشترك للسحب بالماوس + قفل اتجاه للمس.
// الماوس: سحب أفقي للصف مع منع فتح العمل بعد السحب (consumIfDragged) — زي ما هو.
// التاتش: يتميّز الاتجاه بعد عتبة 8px:
//   - أفقي (|dx| > |dy|) ← نحرّك الصف scrollLeft بأنفسنا ونمنع الافتراضي.
//   - رأسي (|dy| > |dx|) ← لا نمنع أي حاجة، فالصفحة تسكرول طبيعي حتى لو اليد على الكارت.
//   - الاتجاه يتقفل بعد أول قرار ولا ينقلب في نفس الإيماءة.
const TOUCH_AXIS_THRESHOLD = 8

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const dragState = useRef({ startX: 0, scrollLeft: 0, moved: false })
  const touchState = useRef<{ startX: number; startY: number; scrollLeft: number; axis: 'x' | 'y' | null } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    dragState.current = { startX: e.pageX, scrollLeft: el.scrollLeft, moved: false }
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent) => {
      const el = ref.current
      if (!el) return
      const delta = e.pageX - dragState.current.startX
      if (Math.abs(delta) > 4) dragState.current.moved = true
      el.scrollLeft = dragState.current.scrollLeft - delta
    }

    const handleUp = () => setIsDragging(false)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging])

  // تاتش: قفل اتجاه — أفقي يشغّل سحب الصف، رأسي يعدّي للسكرول الطبيعي للصفحة
  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!isTouch) return

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      touchState.current = { startX: t.clientX, startY: t.clientY, scrollLeft: el.scrollLeft, axis: null }
    }

    const onTouchMove = (e: TouchEvent) => {
      const st = touchState.current
      if (!st || e.touches.length !== 1) return
      const t = e.touches[0]
      const dx = t.clientX - st.startX
      const dy = t.clientY - st.startY

      if (st.axis === null) {
        if (Math.abs(dx) < TOUCH_AXIS_THRESHOLD && Math.abs(dy) < TOUCH_AXIS_THRESHOLD) return
        st.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      }

      if (st.axis === 'y') return // رأسي → لا نمنع شيئًا، الصفحة تسكرول طبيعي (حتى على الكارت)

      // أفقي → نحرّك الصف يدويًا ونمنع سلوك المتصفح الافتراضي
      e.preventDefault()
      el.scrollLeft = st.scrollLeft - dx
    }

    const onTouchEnd = () => {
      touchState.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  // استخدمها جوه onClick: لو رجعت true معناها كان سحب فعلي، امنع الفعل الافتراضي
  const consumeIfDragged = () => {
    if (dragState.current.moved) {
      dragState.current.moved = false
      return true
    }
    return false
  }

  return { ref, isDragging, handleMouseDown, consumeIfDragged }
}
