# 4CIMA Design System
## Next.js + Tailwind + Framer Motion - RTL Arabic

---

## 1️⃣ COLOR PALETTE (HEX Values)

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| `primary-cyan` | `#06b6d4` | Primary brand color (buttons, links, highlights) |
| `primary-purple` | `#a855f7` | Secondary accent (badges, tags) |
| `primary-gold` | `#f59e0b` | Ratings, premium content |

### Background Levels (Dark Theme)
| Name | Hex | Usage |
|------|-----|-------|
| `bg-950` | `#020617` | Main background |
| `bg-900` | `#0f172a` | Secondary background (cards, modals) |
| `bg-800` | `#1e293b` | Tertiary (borders, overlays) |
| `bg-700` | `#334155` | Hover states |

### Text Levels
| Name | Hex | Usage |
|------|-----|-------|
| `text-white` | `#ffffff` | Primary text |
| `text-gray-300` | `#d1d5db` | Secondary text |
| `text-gray-400` | `#9ca3af` | Tertiary text |
| `text-gray-500` | `#6b7280` | Disabled state |

### Status Colors
| Name | Hex | Usage |
|------|-----|-------|
| `success-green` | `#10b981` | Success states |
| `warn-yellow` | `#f59e0b` | Warnings |
| `error-red` | `#ef4444` | Errors |
| `info-blue` | `#3b82f6` | Information |

### Accents (Per Section)
| Name | Hex | Usage |
|------|-----|-------|
| `accent-cyan` | `#06b6d4` | Trending section |
| `accent-green` | `#10b981` | Latest section |
| `accent-gold` | `#f59e0b` | Top Rated Movies |
| `accent-purple` | `#a855f7` | Top Rated Series |
| `accent-red` | `#ef4444` | Popular Movies |
| `accent-orange` | `#f97316` | Popular Series |

### Gradient Presets
```css
/* Cyan Glow */
from-cyan-500 via-blue-500/50 to-transparent

/* Purple Gradient */
from-purple-600/80 via-purple-500/60 to-transparent

/* Gold Gradient */
from-yellow-500/20 via-orange-500/10 to-transparent
```

---

## 2️⃣ TYPOGRAPHY

### Arabic Font (Primary)
- **Font Family**: `Cairo`
- **Weights**: 400, 500, 600, 700, 800
- **Fallback**: `tahoma, arial`

### English Font (Subtitles)
- **Font Family**: `Inter`
- **Weights**: 400, 500, 600, 700

### Typography Scale (px)

| Level | Font Size | Line Height | Font Weight | Usage |
|-------|-----------|-------------|-------------|-------|
| `h1` | `48px` | `56px` | `800` | Hero titles |
| `h2` | `36px` | `44px` | `700` | Section titles |
| `h3` | `24px` | `32px` | `600` | Card titles |
| `h4` | `18px` | `24px` | `600` | Subtitles |
| `body-lg` | `16px` | `24px` | `400` | Main content |
| `body` | `14px` | `20px` | `400` | Regular text |
| `caption` | `12px` | `16px` | `400` | Metadata |
| `caption-sm` | `10px` | `14px` | `400` | Small badges |

### RTL Typography Rules
- All Arabic text: `text-right`
- All English text (subtitles): `text-left`
- Icons: `ltr:rotate-180 rtl:rotate-0` (forLTR icons)

---

## 3️⃣ MOVIE CARD SPECIFICATIONS

### Unified Card (Section Cards)
```tsx
// Dimensions
width: 140px (desktop) / 100px (mobile)
aspect-ratio: 2/3
border-radius: 8px (rounded-lg)

// Hover
scale: 1.05 (x1.03 in train for smoothness)
transition: 300ms ease-out
opacity: 0.9 for siblings on hover

// Image
padding: 16px (top), 12px (bottom)
overlay: bg-gradient-to-t from-black via-black/80 to-transparent
z-index: 20

// Badge (Genre)
position: top-3 right-3 (RTL)
size: px-2 py-0.5
font-size: 10px
background: purple-600/80 backdrop-blur-sm
border: border-purple-500/50

// Metadata
rating: bottom-12 left-3
icon: Star (w-3 h-3 fill-current)
color: yellow-400

year: bottom-12 right-3
icon: Calendar (w-3 h-3)
color: cyan-300

// Title
position: bottom-2
font-size: 14px
font-weight: 700
color: text-white
lines: 2 max (line-clamp-2)
```

### Hero Card (Large)
```tsx
// Dimensions
height: 70vh (full hero container)
width: 342px (w342 TMDB size)
aspect-ratio: 16/9 (banner) or 2/3 (poster)

// Overlay
dark-overlay: bg-black/60
gradient: from-black via-black/50 to-transparent
z-index: 10

// Badge
position: top-3 right-3
same as section card

// Content
title: font-syne font-black text-2xl lg:text-3xl
lines: 2 max
shadow: drop-shadow-lg

rating/year: text-xs (14px)
layout: flex-wrap gap-2
styles: bg-cyan-950/60 backdrop-blur-sm px-1.5 py-0.5 rounded

description: opacity-0 → opacity-100 on hover
max-height: 0 → max-h-24 (transition)
font-size: 12px (text-[10px])
lines: 4 max
background: bg-black/60 backdrop-blur-sm rounded p-2
```

### Code Examples

#### Section Card (QuantumTrain)
```tsx
<motion.div
  whileHover={{ scale: 1.05 }}
  className="relative group/card w-36 md:w-40 aspect-[2/3] rounded-lg overflow-hidden"
>
  {/* Image */}
  <div className="absolute inset-0 z-0">
    <img 
      src={posterPath} 
      className="w-full h-full object-cover"
    />
    {/* Gradient */}
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
  </div>

  {/* Badge */}
  {primary_genre && (
    <div className="absolute top-3 right-3 z-20">
      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm bg-purple-600/80 border border-purple-500/50 text-white rounded">
        {primary_genre}
      </span>
    </div>
  )}

  {/* Rating */}
  <div className="absolute bottom-12 left-3 z-20 flex items-center gap-1 text-yellow-400">
    <Star className="w-3 h-3 fill-current" />
    <span className="text-xs font-bold">{vote_average.toFixed(1)}</span>
  </div>

  {/* Year */}
  <div className="absolute bottom-12 right-3 z-20 flex items-center gap-1 text-cyan-300">
    <Calendar className="w-3 h-3" />
    <span className="text-xs font-medium">{year}</span>
  </div>

  {/* Title */}
  <div className="absolute bottom-2 left-3 right-3 z-20">
    <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">
      {title_ar}
    </h3>
  </div>
</motion.div>
```

#### Hero Card (QuantumHero)
```tsx
<div className="relative h-full w-full group overflow-hidden">
  {/* Background */}
  <div className="absolute inset-0 z-0">
    <img src={posterPath} className="w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
  </div>

  {/* Badge */}
  {primary_genre && (
    <div className="absolute top-3 right-3 z-20">
      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm bg-purple-600/80 border border-purple-500/50 text-white rounded">
        {primary_genre}
      </span>
    </div>
  )}

  {/* Content */}
  <div className="absolute inset-0 z-20 flex flex-col justify-end p-4">
    <h2 className="font-syne font-black text-white text-base lg:text-lg line-clamp-2 drop-shadow-lg">
      {title_ar}
    </h2>

    {/* Rating + Year */}
    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300 font-medium mt-2">
      {year && (
        <div className="flex items-center gap-1 text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
          <Calendar size={12} />
          <span className="font-bold">{year}</span>
        </div>
      )}
      {vote_average > 0 && (
        <div className="flex items-center gap-1 text-yellow-400 bg-yellow-950/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
          <Star size={12} fill="currentColor" />
          <span className="font-bold">{vote_average.toFixed(1)}</span>
        </div>
      )}
    </div>

    {/* Description (Hover Only) */}
    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-h-0 group-hover:max-h-24 overflow-hidden">
      {overview_ar && (
        <p className="text-zinc-300 text-[10px] leading-relaxed line-clamp-4 pt-1 bg-black/60 backdrop-blur-sm rounded p-2">
          {overview_ar}
        </p>
      )}
    </div>
  </div>
</div>
```

---

## 4️⃣ SECTIONS SPECIFICATIONS

### Section Structure
```tsx
<div className="relative py-3 w-full">
  {/* Header */}
  <div className="container-padding">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl font-bold text-white">
        <Icon className="inline-block mr-2" />
        {title}
      </h2>
      
      {/* RTL: "عرض الكل" on the LEFT */}
      <Link href={link} className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 ltr:order-1 rtl:order-2">
        عرض الكل
        <ChevronLeft className="rtl:rotate-180" />
      </Link>
    </div>
  </div>

  {/* Content */}
  <div className="container-padding">
    <Swiper>...</Swiper>
  </div>
</div>
```

### Spacing
- **Section padding**: `py-3` (48px vertical)
- **Between sections**: `space-y-4` (64px)
- **Header padding**: `mb-4` (16px)

### Section Order (Priority)
1. **الرائج الآن** - Cyan accent
2. **الأحدث** - Green accent
3. **الأعلى تقييماً - أفلام** - Gold accent
4. **الأعلى تقييماً - مسلسلات** - Purple accent
5. **أفلام شائعة** - Red accent
6. **مسلسلات شائعة** - Orange accent

---

## 5️⃣ ANIMATIONS (Framer Motion)

### Section Entrance
```tsx
<motion.section
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-100px' }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
  className="mb-16"
>
  {SECTIONS.map((section, index) => (
    <motion.div
      key={section.key}
      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <QuantumTrain {...section} />
    </motion.div>
  ))}
</motion.section>
```

### Card Hover Effects
```tsx
<motion.div
  whileHover={{ 
    scale: 1.05,
    zIndex: 10
  }}
  whileTap={{ scale: 0.95 }}
  className="group/card relative"
>
  {/* Card content */}
  
  {/* Sibling dimming (handled by CSS opacity on hover) */}
  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
</motion.div>
```

### Hero Carousel
```tsx
<Swiper
  autoplay={{
    delay: 5000,
    disableOnInteraction: false,
    pauseOnMouseEnter: true
  }}
  loop={true}
  speed={800}
  // Auto-pause on hover via CSS
  className="[&_.swiper-slide]:group-[&:hover]:paused"
>
  {/* Slides */}
</Swiper>

/* CSS for auto-pause */
.swiper-paused {
  animation-play-state: paused;
}
```

### Loading Skeleton
```tsx
<motion.div
  animate={{ opacity: [0.3, 0.7, 0.3] }}
  transition={{ duration: 1.5, repeat: Infinity }}
  className="w-36 h-52 bg-gray-800 rounded-lg"
>
  <div className="w-full h-full bg-gray-700 animate-pulse rounded-lg" />
</motion.div>
```

---

## 6️⃣ EMPTY/LOADING/ERROR STATES

### Loading Skeleton (Section)
```tsx
const SkeletonCard = () => (
  <div className="w-36 md:w-40 aspect-[2/3] rounded-lg bg-gray-800 animate-pulse">
    <div className="w-full h-full bg-gray-700 rounded-lg" />
    {/* Badge placeholder */}
    <div className="absolute top-3 right-3 w-12 h-5 bg-gray-600 rounded-full opacity-50" />
    {/* Rating placeholder */}
    <div className="absolute bottom-12 left-3 w-16 h-4 bg-gray-600 rounded opacity-50" />
    {/* Title placeholder */}
    <div className="absolute bottom-2 w-24 h-4 bg-gray-600 rounded opacity-50" />
  </div>
)

// Usage
{loading && (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)}
```

### Error State
```tsx
const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
      <AlertCircle className="w-8 h-8 text-red-500" />
    </div>
    <h3 className="text-xl font-bold text-white mb-2">عذراً، حدث خطأ</h3>
    <p className="text-gray-400 mb-6 max-w-md">{message}</p>
    <button
      onClick={onRetry}
      className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center gap-2"
    >
      <RefreshCw className="w-4 h-4" />
      إعادة المحاولة
    </button>
  </div>
)
```

### Empty State
```tsx
const EmptyState = ({ message }: { message: string }) => (
  <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
    <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mb-4">
      <Film className="w-8 h-8 text-gray-500" />
    </div>
    <p className="text-gray-400">{message}</p>
  </div>
)
```

---

## 7️⃣ GLOBAL CSS (tailwind.config.ts)

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        primary: {
          cyan: '#06b6d4',
          purple: '#a855f7',
          gold: '#f59e0b',
        },
        // Background
        background: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        // Text
        text: {
          white: '#ffffff',
          'gray-300': '#d1d5db',
          'gray-400': '#9ca3af',
          'gray-500': '#6b7280',
        },
        // Status
        success: '#10b981',
        warn: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        arabic: ['Cairo', 'tahoma', 'arial', 'sans-serif'],
        latin: ['Inter', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      fontSize: {
        h1: ['48px', { lineHeight: '56px', fontWeight: '800' }],
        h2: ['36px', { lineHeight: '44px', fontWeight: '700' }],
        h3: ['24px', { lineHeight: '32px', fontWeight: '600' }],
        h4: ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'caption-sm': ['10px', { lineHeight: '14px', fontWeight: '400' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

---

## 8️⃣ RTL LAYOUT RULES

### Spacing (LTR ↔ RTL)
| LTR | RTL |
|-----|-----|
| `ml-4` → `mr-4` | `mr-4` → `ml-4` |
| `pl-4` → `pr-4` | `pr-4` → `pl-4` |
| `rounded-l-lg` → `rounded-r-lg` | `rounded-r-lg` → `rounded-l-lg` |

### Icon Rotation
```tsx
// For arrows (ChevronLeft)
<ChevronLeft className={isRTL ? "rotate-180" : ""} />

// Better with Tailwind
<ChevronLeft className="rtl:rotate-180" />
```

### Text Alignment
```tsx
// Arabic: always right-aligned
<div className="text-right">نص عربي</div>

// English subtitles: left-aligned
<div className="text-left">English subtitle</div>
```

### Flex Direction
```tsx
// RTL: reverse flex direction
<div className="flex rtl:flex-row-reverse items-center">
  <Icon />
  <span>Label</span>
</div>
```

---

## 9️⃣ IMPLEMENTATION CHECKLIST

### Before Deploy
- [ ] All colors using hex values
- [ ] Typography scale applied
- [ ] Movie cards have badges (RTL position)
- [ ] Rating below year in section cards
- [ ] Hero cards have description on hover
- [ ] Sections ordered correctly
- [ ] Loading skeleton matches card style
- [ ] Error state shows retry button
- [ ] RTL text directions correct

### Performance
- [ ] Lazy load images (Next.js Image)
- [ ] Framer Motion animations < 500ms
- [ ] Stagger delays: 0.1s increment
- [ ] Hover effects: transform + opacity only (GPU)

---

## 🎨 DESIGN PATTERNS

### Card States
```tsx
// Normal
className="bg-gray-900 hover:scale-[1.05]"

// Active
className="ring-2 ring-cyan-400"

// Loading
className="animate-pulse bg-gray-800"

// Error
className="opacity-50 grayscale"
```

### Button States
```tsx
// Primary
bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg

// Secondary
bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg

// Outline
border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 px-6 py-2 rounded-lg
```

---

**Last Updated**: 2026-07-17  
**Version**: 1.0.0  
**Design System**: 4CIMA Arabic Film Platform
