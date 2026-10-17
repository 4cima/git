'use client'

/**
 * StealthText — عرض نص حسّاس للزائر البشري دون طباعته كنص صريح في الـSSR HTML.
 *
 * آلية العمل (حماية من بوتات الفحص الآلي DMCA Scrapers + تحسين الفهرسة):
 *  - يصل النص للمكون مشفّرًا Base64 (encodedText) فلا يظهر أي نص صريح في الكود.
 *  - فك التشفير يجري في useEffect (بعد الـhydration على الكلاينت فقط) ويُكتب في
 *    خاصية data-text — العنصر نفسه يبقى بلا أي child نصي في الـDOM.
 *  - الرسم يتم عبر CSS: .stealth-text::after { content: attr(data-text); }
 *    (معرّفة في globals.css) — محتوى ::after يلتف تلقائيًا ويرث الخط/الحجم/اللون
 *    من العنصر نفسه فيطابق تصميم Tailwind 100%، ولا يقرؤه بوتات السكرابينج
 *    ولا يدخل فهرس النصوص للفهرسة.
 */

import { useEffect, useState } from 'react'

/** فك تشفير Base64 → نص UTF-8 (يدعم العربية) — يعمل على الكلاينت فقط */
export function decodeStealthText(encoded: string): string {
  if (!encoded) return ''
  try {
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return ''
  }
}

/** تشفير نص UTF-8 (يدعم العربية) → Base64 — يُستخدم عند تمرير النص للمكون */
export function encodeStealthText(text: string): string {
  if (!text) return ''
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

type StealthTag =
  | 'span'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'p'
  | 'div'
  | 'strong'
  | 'em'
  | 'b'
  | 'i'

interface StealthTextProps {
  /** النص مشفرًا بصيغة Base64 (UTF-8) — مرِّر ناتج encodeStealthText(النص) */
  encodedText: string
  /** كلاسات Tailwind — تُطبَّق على العنصر نفسه فيرثها الـ::after تلقائيًا */
  className?: string
  /** وسم HTML الناتج (افتراضي: span) */
  as?: StealthTag
}

export const StealthText = ({ encodedText, className = '', as = 'span' }: StealthTextProps) => {
  const [decoded, setDecoded] = useState('')

  useEffect(() => {
    setDecoded(decodeStealthText(encodedText))
  }, [encodedText])

  const Tag = as as any
  return <Tag className={`stealth-text ${className}`.trim()} data-text={decoded} />
}