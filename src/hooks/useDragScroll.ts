'use client'

import { useEffect, useRef, useState } from 'react'

// هوك مشترك للسحب بالماوس - بيستخدم window listeners بدل pointer capture
// عشان مايبوظش الكليك على العناصر جوه الصف (زرار، لينك، الخ)
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const dragState = useRef({ startX: 0, scrollLeft: 0, moved: false })
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
