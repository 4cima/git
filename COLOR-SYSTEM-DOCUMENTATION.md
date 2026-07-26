# 🎨 نظام الألوان الموحّد - توثيق شامل

## 📋 المحتويات
1. [نظرة عامة](#نظرة-عامة)
2. [ألوان التصنيفات](#ألوان-التصنيفات)
3. [ألوان نوع المحتوى](#ألوان-نوع-المحتوى)
4. [كيفية الاستخدام](#كيفية-الاستخدام)
5. [الأماكن المُطبّقة](#الأماكن-المُطبّقة)
6. [أمثلة عملية](#أمثلة-عملية)

---

## نظرة عامة

تم إنشاء نظام ألوان موحّد لجميع التصنيفات وأنواع المحتوى في الموقع للحفاظ على **الاتساق البصري** عبر جميع الصفحات.

### الملف الرئيسي
📂 `src/utils/genreColors.ts`

### المميزات
- ✅ **17+ تصنيف** بألوان فريدة
- ✅ **7 أنواع محتوى** (فيلم، مسلسل، أنمي، لعبة، برنامج، قرآن)
- ✅ دعم **العربية والإنجليزية**
- ✅ تأثيرات **توهج وظلال**
- ✅ **سهولة الاستخدام** - دالة واحدة فقط

---

## ألوان التصنيفات

### جدول الألوان الكامل

| التصنيف (عربي) | التصنيف (إنجليزي) | اللون الأساسي | الاستخدام |
|----------------|-------------------|---------------|-----------|
| أكشن | Action | 🔴 أحمر | أفلام الحركة والإثارة |
| دراما | Drama | 🟣 بنفسجي | الدراما والعاطفة |
| كوميديا | Comedy | 🟡 أصفر | الكوميديا والفكاهة |
| رعب | Horror | ⚫ رمادي داكن | الرعب والإثارة المخيفة |
| رومانسي | Romance | 🩷 وردي | الرومانسية والحب |
| خيال علمي | Science Fiction | 🔵 سماوي | الخيال العلمي |
| مغامرة | Adventure | 🟢 أخضر زمردي | المغامرة والاستكشاف |
| إثارة | Thriller | 🟠 برتقالي | الإثارة والتشويق |
| جريمة | Crime | 🔴 أحمر داكن | الجريمة والغموض |
| خيال | Fantasy | 🟣 نيلي | الفانتازيا والسحر |
| رسوم متحركة | Animation | 🔵 أزرق | الأنيميشن |
| عائلي | Family | 🟢 أخضر | المحتوى العائلي |
| حرب | War | ⚪ رمادي مزرق | أفلام الحرب |
| تاريخي | History | 🟤 كهرماني | التاريخ والحضارة |
| غموض | Mystery | 🟣 بنفسجي داكن | الغموض والتحقيق |
| وثائقي | Documentary | 🔵 أزرق مخضر | الأفلام الوثائقية |
| غربي | Western | 🟤 بني | أفلام الغرب الأمريكي |
| موسيقي | Music | 🩷 وردي فاتح | الموسيقى والفن |

### بنية اللون

كل تصنيف يحتوي على 4 خصائص:

```typescript
{
  bg: string      // لون الخلفية (مثل: bg-red-500/20)
  text: string    // لون النص (مثل: text-red-400)
  border: string  // لون الحدود (مثل: border-red-500/30)
  glow: string    // تأثير التوهج (مثل: shadow-red-500/20)
}
```

---

## ألوان نوع المحتوى

### جدول أنواع المحتوى

| النوع | الأيقونة | اللون | التسمية العربية |
|-------|----------|-------|-----------------|
| movie | 🎬 | 🔴 أحمر → 🟠 كهرماني | فيلم |
| series / tv | 📺 | 🔵 أزرق → 🔵 سماوي | مسلسل |
| anime | 🎌 | 🩷 وردي → 🟣 بنفسجي | أنمي |
| game | 🎮 | 🟢 أخضر → 🟢 زمردي | لعبة |
| software | 💾 | 🟣 نيلي → 🟣 بنفسجي | برنامج |
| quran | 📖 | 🔵 أزرق مخضر → 🔵 سماوي | قرآن |

### بنية لون نوع المحتوى

```typescript
{
  bg: string      // خلفية متدرجة
  text: string    // لون النص
  border: string  // لون الحدود
  icon: string    // أيقونة emoji
  label: string   // التسمية العربية
}
```

---

## كيفية الاستخدام

### 1. استيراد الدوال

```typescript
import { getGenreColor, getMediaTypeColor } from '@/utils/genreColors'
```

### 2. استخدام ألوان التصنيف

```typescript
// الحصول على مخطط الألوان
const genreColorScheme = getGenreColor('أكشن')

// استخدام في JSX
<span className={`${genreColorScheme.bg} ${genreColorScheme.text} ${genreColorScheme.border}`}>
  أكشن
</span>
```

### 3. استخدام ألوان نوع المحتوى

```typescript
// الحصول على مخطط الألوان
const mediaColorScheme = getMediaTypeColor('movie')

// استخدام في JSX
<span className={`${mediaColorScheme.bg} ${mediaColorScheme.text}`}>
  <span>{mediaColorScheme.icon}</span>
  <span>{mediaColorScheme.label}</span>
</span>
```

---

## الأماكن المُطبّقة

### ✅ تم التطبيق في:

#### 1. الصفحة الرئيسية (`src/app/page.tsx`)
- ✅ Hero Banner - badge نوع المحتوى
- ✅ Hero Banner - badge التصنيف
- ✅ بطاقات المحتوى - نوع المحتوى والتصنيف

#### 2. بطاقة المحتوى (`src/components/features/media/MovieCard.tsx`)
- ✅ badge التصنيف بلون مميز
- ✅ badge نوع المحتوى مع أيقونة

#### 3. صفحة التصنيفات (`src/app/genres/page.tsx`)
- ✅ بطاقات التصنيفات بألوان فريدة
- ✅ نقطة ملونة بجانب اسم التصنيف
- ✅ تأثير hover بلون التصنيف

#### 4. صفحة التصنيف الواحد (`src/components/pages/GenrePageClient.tsx`)
- ✅ عنوان الصفحة بلون التصنيف
- ✅ نقطة ملونة في العنوان
- ✅ أزرار الفلاتر بلون التصنيف

#### 5. صفحة تفاصيل الفيلم (`src/components/pages/MovieDetailsClient.tsx`)
- ✅ badges التصنيفات بألوان مميزة
- ✅ تأثيرات hover وتوهج

#### 6. صفحة تفاصيل المسلسل (`src/components/pages/SeriesDetailsClient.tsx`)
- ✅ badges التصنيفات بألوان مميزة
- ✅ تأثيرات hover وتوهج

#### 7. صفحات الأفلام والمسلسلات
- ✅ `src/components/pages/MoviesPageClient.tsx`
- ✅ `src/components/pages/SeriesPageClient.tsx`
- (تستخدم MovieCard الذي تم تحديثه)

---

## أمثلة عملية

### مثال 1: إضافة لون تصنيف في مكون جديد

```typescript
import { getGenreColor } from '@/utils/genreColors'

function MyComponent({ genre }) {
  const colors = getGenreColor(genre)
  
  return (
    <div className={`${colors.bg} ${colors.text} ${colors.border} border px-4 py-2 rounded-lg`}>
      {genre}
    </div>
  )
}
```

### مثال 2: عرض نوع المحتوى مع أيقونة

```typescript
import { getMediaTypeColor } from '@/utils/genreColors'

function MediaTypeBadge({ mediaType }) {
  const colors = getMediaTypeColor(mediaType)
  
  return (
    <span className={`${colors.bg} ${colors.text} ${colors.border} border px-3 py-1 rounded-full flex items-center gap-2`}>
      <span>{colors.icon}</span>
      <span>{colors.label}</span>
    </span>
  )
}
```

### مثال 3: قائمة تصنيفات ملونة

```typescript
import { getGenreColor } from '@/utils/genreColors'

function GenreList({ genres }) {
  return (
    <div className="flex flex-wrap gap-2">
      {genres.map(genre => {
        const colors = getGenreColor(genre.name_ar)
        return (
          <span 
            key={genre.id}
            className={`${colors.bg} ${colors.text} ${colors.border} border px-3 py-1.5 rounded-lg ${colors.glow} shadow-lg hover:scale-105 transition-transform`}
          >
            {genre.name_ar}
          </span>
        )
      })}
    </div>
  )
}
```

---

## إضافة تصنيف جديد

لإضافة تصنيف جديد، عدّل ملف `src/utils/genreColors.ts`:

```typescript
export const genreColors: Record<string, GenreColorScheme> = {
  // ... التصنيفات الموجودة
  
  // تصنيف جديد
  'تصنيف_جديد': {
    bg: 'bg-color-500/20',
    text: 'text-color-400',
    border: 'border-color-500/30',
    glow: 'shadow-color-500/20'
  },
  'New Genre': {
    bg: 'bg-color-500/20',
    text: 'text-color-400',
    border: 'border-color-500/30',
    glow: 'shadow-color-500/20'
  }
}
```

---

## الفوائد

### 1. الاتساق البصري ✨
- نفس الألوان في جميع أنحاء الموقع
- تجربة مستخدم موحدة

### 2. سهولة الصيانة 🛠️
- ملف واحد مركزي للألوان
- تحديث سهل وسريع

### 3. الأداء ⚡
- لا حسابات معقدة
- Tailwind classes ثابتة

### 4. التوسع المستقبلي 🚀
- إضافة تصنيفات جديدة بسهولة
- إضافة أنواع محتوى جديدة

---

## الملخص

✅ **17+ تصنيف** بألوان فريدة  
✅ **7 أنواع محتوى** مع أيقونات  
✅ **9 ملفات** تم تحديثها  
✅ **نظام موحد** في جميع الصفحات  
✅ **دعم كامل** للعربية والإنجليزية  

🎨 **النتيجة**: موقع متناسق وجذاب بصرياً مع هوية بصرية واضحة لكل تصنيف!
