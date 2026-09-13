'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type LogoState = 'drop' | 'idle' | 'tucked'

const INTRO_MS = 3700

export function SiteLogo() {
  const [state, setState] = useState<LogoState>('drop')
  const stateRef = useRef<LogoState>('drop')
  const introTimer = useRef<number | null>(null)
  const didIntro = useRef(false)

  useEffect(() => {
    const updateState = (next: LogoState) => {
      stateRef.current = next
      setState(next)
    }

    // تشغيل سقوط اللوجو ثم التحول للتأرجح بعد انتهاء مدة السقوط
    const playDrop = () => {
      updateState('drop')
      if (introTimer.current !== null) {
        window.clearTimeout(introTimer.current)
      }
      introTimer.current = window.setTimeout(() => {
        if (stateRef.current === 'drop') {
          updateState('idle')
        }
      }, INTRO_MS)
    }

    const apply = () => {
      if (window.scrollY > 100) {
        // نزلنا تحت — نُخفي اللوجو
        updateState('tucked')
        return
      }
      if (!didIntro.current) {
        // بداية التحميل — سقوط أول مرة
        didIntro.current = true
        playDrop()
        return
      }
      // رجعنا لفوق بعد ما كنا مخفيين تحت — يُعاد تشغيل السقوط
      if (stateRef.current === 'tucked') {
        playDrop()
      }
    }

    apply()
    window.addEventListener('scroll', apply, { passive: true })

    return () => {
      window.removeEventListener('scroll', apply)
      if (introTimer.current !== null) {
        window.clearTimeout(introTimer.current)
      }
    }
  }, [])

  return (
    <Link
      href="/"
      className="site-logo-link group"
      aria-label="4cima — الرئيسية"
    >
      <div className="site-logo" data-state={state}>
        <span className="site-logo-mark" dir="ltr">
          <span className="site-logo-4">4</span>
          <span className="site-logo-cima">
            <span className="site-logo-c">
              c
            </span>
            <span className="site-logo-hang">
              <span className="site-logo-tittle" aria-hidden="true">
                <span className="site-logo-rope" aria-hidden="true" />
                <span className="site-logo-tittle-face">
                  <svg viewBox="0 0 64 64" className="site-logo-favicon" aria-hidden="true">
                    <circle cx="32" cy="32" r="29.5" fill="#E8A317" />
                    <g stroke="#000000" strokeWidth="5.5" fill="none">
                      <line x1="35.2" y1="12.8" x2="19.2" y2="38.4" />
                      <line x1="16.6" y1="38.4" x2="47.4" y2="38.4" />
                      <line x1="39.7" y1="11.5" x2="39.7" y2="53.8" />
                    </g>
                  </svg>
                </span>
              </span>
              {/* كاميرا مصغّرة 3D تدور حول النقطة وتسلّط شعاعاً مخروطياً صغيراً عليها */}
              <span className="site-logo-camrig" aria-hidden="true">
                <span className="site-logo-cam-camera">
                  <span className="site-logo-cam-body">
                    <span className="site-logo-cam-lens" aria-hidden="true" />
                    <span className="site-logo-cam-top" aria-hidden="true" />
                    <span className="site-logo-cam-handle" aria-hidden="true" />
                    <span className="site-logo-cam-rec" aria-hidden="true" />
                  </span>
                </span>
                <span className="site-logo-cam-beam" aria-hidden="true" />
              </span>
              <span className="site-logo-i" aria-hidden="true" />
            </span>
            <span className="site-logo-m">m</span>
            <span className="site-logo-a">a</span>
          </span>
        </span>
      </div>
    </Link>
  )
}
