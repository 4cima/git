'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type LogoState = 'drop' | 'idle' | 'tucked'

export function SiteLogo() {
  const [state, setState] = useState<LogoState>('drop')
  const logoRef = useRef<HTMLDivElement>(null)
  const hangRef = useRef<HTMLSpanElement>(null)
  const pivotRef = useRef<HTMLSpanElement>(null)
  const ropeRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const logo = logoRef.current
    const hang = hangRef.current
    const pivot = pivotRef.current
    const rope = ropeRef.current
    if (!logo || !hang || !pivot || !rope) return

    const sync = () => {
      logo.style.animation = 'none'
      logo.style.transform = 'none'

      const logoBox = logo.getBoundingClientRect()
      const hangBox = hang.getBoundingClientRect()
      const tittleBox = pivot.getBoundingClientRect()
      if (!logoBox.width || !tittleBox.width || !hangBox.height) {
        logo.style.animation = ''
        logo.style.transform = ''
        return
      }

      const tittleCx = tittleBox.left + tittleBox.width / 2
      const tittleCy = tittleBox.top + tittleBox.height / 2
      const ropeH = rope.offsetHeight

      rope.style.left = `${tittleCx - hangBox.left}px`
      rope.style.marginLeft = `${-rope.offsetWidth / 2}px`
      rope.style.top = `${tittleCy - hangBox.top - ropeH + tittleBox.height * 0.28}px`

      logo.style.transformOrigin = `${tittleCx - logoBox.left}px ${tittleCy - logoBox.top}px`
      logo.style.animation = ''
      logo.style.transform = ''
    }

    sync()
    void document.fonts?.ready.then(sync)
    const ro = new ResizeObserver(sync)
    ro.observe(logo)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [state])

  useEffect(() => {
    let introDone = false
    const introMs = 1300

    const apply = () => {
      if (window.scrollY > 100) {
        setState('tucked')
        return
      }
      setState(introDone ? 'idle' : 'drop')
    }

    apply()
    window.addEventListener('scroll', apply, { passive: true })
    const timer = window.setTimeout(() => {
      introDone = true
      apply()
    }, introMs)

    return () => {
      window.removeEventListener('scroll', apply)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <Link
      href="/"
      className="site-logo-link group"
      aria-label="4cima — الرئيسية"
    >
      <div ref={logoRef} className="site-logo" data-state={state}>
        <span className="site-logo-mark" dir="ltr">
          <span className="site-logo-4">4</span>
          <span className="site-logo-cima">
            <span className="site-logo-c">
              <span className="site-logo-cam-slot" aria-hidden="true">
                <span className="site-logo-cam">🎥</span>
              </span>
              c
            </span>
            <span ref={hangRef} className="site-logo-hang">
              <span ref={ropeRef} className="site-logo-rope" aria-hidden="true" />
              <span ref={pivotRef} className="site-logo-tittle" aria-hidden="true">
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
