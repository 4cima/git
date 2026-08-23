# Default Avatar Images

هذا المجلد يحتوي على صور البروفايل الافتراضية بطابع سينمائي.

## الصور المتاحة

1. **avatar-1.svg** - Film Reel (بكرة فيلم) - أحمر
2. **avatar-2.svg** - Clapperboard (كلاكيت) - أزرق سماوي
3. **avatar-3.svg** - Popcorn (فشار) - ذهبي
4. **avatar-4.svg** - Camera (كاميرا) - بنفسجي
5. **avatar-5.svg** - Star (نجمة) - وردي

## الاستخدام

يتم اختيار صورة افتراضية تلقائياً لكل مستخدم بناءً على ID أو email الخاص به، مما يضمن أن نفس المستخدم يحصل دائماً على نفس الصورة الافتراضية.

استخدم `getAvatarUrl()` من `@/utils/avatarUtils`:

```typescript
import { getAvatarUrl } from '@/utils/avatarUtils'

const avatarUrl = getAvatarUrl(profile?.avatar_url, user.id, user.email)
```

## المستقبل

يمكن للمستخدمين في المستقبل:
- اختيار صورة افتراضية من القائمة
- رفع صورة شخصية خاصة بهم
