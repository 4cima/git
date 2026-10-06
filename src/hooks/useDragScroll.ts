'use client'

import { useEffect, useRef, useState } from 'react'

// هوك مشترك للسحب بالماوس + تتبع خفيف للمس.
// الماوس: سحب أفقي للصف (scrollLeft) مع منع فتح العمل بعد السحب (consumeIfDragged).
// التاتش: سيّب السحب أفقي native للمتصفح. الحكم هنا كمان بالسكرول الفعلي مش انحراف
//         الصباع — حاجز الكليك يتسلح فقط لو الصف اتحرك فعلًا (وإلا نقرة بمالة إيد
//         5-10px كانت بتسلّح حاجز ياكل فتح الكارت)، وبينسلخ ذاتيًا بعد 400ms
//         عشان الحاجب القديم مياكلش نقرة نظيفة جاية.

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

    const handleUp = () => {
      setIsDragging(false)
      // قاتل الكليك بعد سحب ماوس حقيقي — نفس حاجز التاتش: الإفلات بعد سحب
      // كان بيسيب الكليك يعدّي على كارت ويفتح العمل
      if (dragState.current.moved && ref.current) {
        const el = ref.current
        const preventClick = (ev: MouseEvent) => {
          ev.preventDefault()
          ev.stopPropagation()
          el.removeEventListener('click', preventClick, true)
        }
        el.addEventListener('click', preventClick, true)
        window.setTimeout(() => el.removeEventListener('click', preventClick, true), 400)
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging])

  // تاتش: الحكم بالسكرول الفعلي للصف (scrollLeft) — مش انحراف الصباع
  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (!isTouch) return

    let startScrollLeft = 0

    let startTouchX = 0

    const onTouchStartEvt = (e: TouchEvent) => {
      startScrollLeft = el.scrollLeft
      startTouchX = e.touches[0]?.clientX ?? 0
    }

    const onTouchEnd = (e: TouchEvent) => {
      // حاجز الكليك يتسلح لو الصف اتحرك فعلًا (سكرول >8px) **أو** الإصبع اتحرك
      // >12px — التاني مطلوب عشان حدود الصف: عند البداية/النهاية الصف مابيتحركش
      // (سكرول صفر) بس السحب حقيقي، والإفلات كان بيسيب الكليك يفتح العمل
      const fingerDelta = Math.abs((e.changedTouches?.[0]?.clientX ?? startTouchX) - startTouchX)
      if (Math.abs(el.scrollLeft - startScrollLeft) > 8 || fingerDelta > 12) {
        const preventClick = (ev: MouseEvent) => {
          ev.preventDefault()
          ev.stopPropagation()
          el.removeEventListener('click', preventClick, true)
        }
        el.addEventListener('click', preventClick, true)
        // وسلاح ذاتي — الحاجب القديم مياكلش نقرة نظيفة جاية
        window.setTimeout(() => el.removeEventListener('click', preventClick, true), 400)
      }
    }

    el.addEventListener('touchstart', onTouchStartEvt, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStartEvt)
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
