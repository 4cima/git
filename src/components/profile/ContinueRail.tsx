'use client'

/**
 * src/components/profile/ContinueRail.tsx
 * صف أفقي قابل للسحب — نفس سلوك أقسام الصفحة الرئيسية بالحرف:
 * - نفس الـutility class `.horizontal-scroll` من globals.css
 *   (overflow-x:auto + overflow-y:hidden + scroll-snap-type:x mandatory
 *    + scroll-snap-align:start لكل كارت + scroll-smooth + إخفاء سحب الصور/الروابط)
 * - نفس الهوك useDragScroll المستخدَم في HomeTrendingSections.tsx و HomeExtraSections.tsx
 *   (سحب بالماوس على الديسكتوب، واللمس native بالكامل على الموبايل)
 * - الكروت هي الأبناء المباشرون للحاوية ⇒ scroll-snap-align يعمل على كل كارت
 *   (الرئيسية تلفّ الكروت في div واحد، فالقاعدة `.horizontal-scroll > *` تصبح بلا أثر فعلي)
 * الحاوية فقط — شكل الكروت نفسه يأتي من الأبناء كما هو، ولا أزرار تنقّل (نفس أسلوب القسم في الرئيسية).
 */
import { useDragScroll } from '@/hooks/useDragScroll'

interface ContinueRailProps {
  children: React.ReactNode
  /** وصف الصف لقارئ الشاشة (aria-label) */
  label?: string
  /** كلاسات إضافية على الحاوية (اختياري — لا تلغي السلوك الافتراضي) */
  className?: string
}

export function ContinueRail({ children, label, className }: ContinueRailProps) {
  const drag = useDragScroll<HTMLDivElement>()

  return (
    <div
      ref={drag.ref}
      onMouseDown={drag.handleMouseDown}
      /* نفس منطق الرئيسية: لو كانت الضغطة سحباً فعلياً بالماوس لا يُفتح العمل.
         (مسار اللمس مُغطّى داخل useDragScroll نفسه) */
      onClickCapture={(e) => {
        if (drag.consumeIfDragged()) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
      className={[
        'horizontal-scroll cursor-grab active:cursor-grabbing pb-4',
        /* نزيف أفقي على الموبايل بقدر padding الحاوية بالظبط (px-2 ثم sm:px-4)
           ⇒ أول/آخر كارت يلمسان حافة الشاشة بلا overflow خارج الصفحة */
        '-mx-2 px-2 sm:-mx-4 sm:px-4',
        'flex flex-nowrap gap-4',
        className ?? '',
      ].join(' ')}
      style={{ userSelect: 'none' }}
      tabIndex={0}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  )
}