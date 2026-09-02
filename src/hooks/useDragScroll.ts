'use client'

import { useEffect, useRef, useState } from 'react'

// هوك مشترك للسحب بالماوس + تتبع خفيف للمس.
// الماوس: سحب أفقي للصف (scrollLeft) مع منع فتح العمل بعد السحب (consumeIfDragged).
// التاتش: سيّب السحب أفقي native للمتصفح (touch-action: auto). إحنا بس نتتبّع المسافة
//         الأفقية عشان نمنع click لو كانت ضغطة سحب فعلية. ممنوع preventDefault ولا scrollLeft.
const TOUCH_CLICK_THRESHOLD = 5

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const dragState = useRef({ startX: 0, scrollLeft: 0, moved: false })
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const touchMovedHorizontally = useRef(false)
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

  // تاتش: native بالكامل — تتبع بس لمنع click بعد سحب أفقي
  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!isTouch) return

    const onTouchStartEvt = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      touchStart.current = { x: t.clientX, y: t.clientY }
      touchMovedHorizontally.current = false
    }

    const onTouchMoveEvt = (e: TouchEvent) => {
      const start = touchStart.current
      if (!start || e.touches.length !== 1) return
      const t = e.touches[0]
      const dx = Math.abs(t.clientX - start.x)
      const dy = Math.abs(t.clientY - start.y)
      // لو الحركة أفقية بزيادة — سجّل إنها سحب (بس منمنعش المتصفح ولا نلمس scrollLeft)
      if (dx > dy && dx > TOUCH_CLICK_THRESHOLD) {
        touchMovedHorizontally.current = true
      }
    }

    const onTouchEnd = () => {
      if (touchMovedHorizontally.current) {
        const preventClick = (ev: MouseEvent) => {
          ev.preventDefault()
          ev.stopPropagation()
          el.removeEventListener('click', preventClick, true)
        }
        el.addEventListener('click', preventClick, true)
      }
      touchStart.current = null
      touchMovedHorizontally.current = false
    }

    el.addEventListener('touchstart', onTouchStartEvt, { passive: true })
    el.addEventListener('touchmove', onTouchMoveEvt, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStartEvt)
      el.removeEventListener('touchmove', onTouchMoveEvt)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  // استخدمها جوه onClick: لو رجعت true معناها كان سحب فعلي (ماوس)، امنع الفعل الافتراضي
  const consumeIfDragged = () => {
    if (dragState.current.moved) {
      dragState.current.moved = false
      return true
    }
    return false
  }

  return { ref, isDragging, handleMouseDown, consumeIfDragged }
}
