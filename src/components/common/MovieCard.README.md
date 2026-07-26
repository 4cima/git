# MovieCard Component - 4cima

بطاقة عرض الأفلام والمسلسلات مع تصميم احترافي وتأثيرات تفاعلية.

## 📦 المواصفات

- **الحجم**: 160px عرض × نسبة 2:3
- **الصورة**: تملأ الكارت بالكامل
- **Badge**: التصنيف في أعلى اليمين بخلفية بنفسجية شفافة
- **Gradient**: من أسفل الكارت للمعلومات
- **Hover Effect**: تكبير 1.05 + إظهار الوصف
- **التقنيات**: React, TypeScript, TailwindCSS, Framer Motion

## 🎨 المكونات

### MovieCard
```tsx
interface MovieCardProps {
  id: number
  slug: string
  title_ar: string
  title_en?: string
  poster_path: string
  vote_average: number
  year?: number
  primary_genre?: string
  overview_ar?: string
  media_type: 'movie' | 'tv'
}
```

## 🚀 الاستخدام

### مثال بسيط
```tsx
import { MovieCard } from '@/components/common/MovieCard'

<MovieCard
  id={123}
  slug="the-shawshank-redemption"
  title_ar="الخلاص من شاوشانك"
  title_en="The Shawshank Redemption"
  poster_path="/path/to/poster.jpg"
  vote_average={9.3}
  year={1994}
  primary_genre="دراما"
  overview_ar="قصة رجل بريء يقضي حياته في السجن..."
  media_type="movie"
/>
```

### استخدام مع Grid
```tsx
import { MovieCardGrid } from '@/components/common/MovieCardGrid'

const movies = [
  { id: 1, slug: 'movie-1', title_ar: 'فيلم 1', ... },
  { id: 2, slug: 'movie-2', title_ar: 'فيلم 2', ... },
]

<MovieCardGrid 
  items={movies} 
  title="الأفلام المميزة"
  columns={6}
/>
```

## 🎭 المميزات

### 1. Badge التصنيف
- يظهر في أعلى اليمين
- خلفية بنفسجية شفافة (purple-600/80)
- حجم خط 10px
- مخفي إذا لم يكن هناك تصنيف

### 2. المعلومات الأساسية
- **السنة**: أيقونة Calendar + السنة
- **التقييم**: أيقونة Star مملوءة + الرقم (رقم عشري واحد)
- **العنوان**: Bold أبيض، سطرين كحد أقصى

### 3. Hover Effect
- تكبير الكارت بنسبة 5% (scale 1.05)
- إظهار الوصف الكامل بخلفية سوداء شفافة
- Transition ناعمة (300ms)
- إطار cyan عند التمرير

### 4. الوصف عند Hover
- خلفية سوداء شبه شفافة (black/95)
- العنوان + الوصف
- أيقونات السنة والتقييم في الأسفل
- Animation fade in/out

## 🎨 الألوان المستخدمة

- **Primary**: cyan-400
- **Background**: zinc-900, gray-950, black
- **Badge**: purple-600/80
- **Text**: white, gray-300
- **Rating**: yellow-400
- **Hover Ring**: cyan-400/50

## 📱 Responsive

الكارت بحجم ثابت (160px) لكن يمكن استخدام Grid للتحكم بالعدد:
- Mobile: 2-3 كروت في الصف
- Tablet: 4-5 كروت في الصف
- Desktop: 6-7 كروت في الصف

## 🔧 Customization

### تعديل الحجم
```tsx
// في الـ className
<div className="w-40 aspect-[2/3]"> // الحالي
<div className="w-48 aspect-[2/3]"> // أكبر
<div className="w-32 aspect-[2/3]"> // أصغر
```

### تعديل Hover Scale
```tsx
whileHover={{ scale: 1.05 }} // الحالي
whileHover={{ scale: 1.08 }} // أكبر
whileHover={{ scale: 1.03 }} // أصغر
```

### تعديل ألوان Badge
```tsx
bg-purple-600/80  // الحالي
bg-blue-600/80    // أزرق
bg-red-600/80     // أحمر
bg-green-600/80   // أخضر
```

## 🐛 Error Handling

- معالجة أخطاء تحميل الصور (fallback)
- التحقق من وجود البيانات قبل العرض
- قيم افتراضية للحقول الاختيارية

## 📦 Dependencies

```json
{
  "framer-motion": "^11.x",
  "lucide-react": "^0.x",
  "next": "^16.x"
}
```

## 🎯 Performance

- استخدام Next.js Image للتحسين التلقائي
- Lazy loading للصور
- Animation محسّنة مع GPU acceleration
- No layout shift

## 📄 License

Part of 4cima project
