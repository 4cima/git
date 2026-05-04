---
inclusion: auto
description: "مشكلة حرجة: allowFullScreen ضروري لتشغيل الفيديو"
---

# 🎬 iframe allowFullScreen - مشكلة حرجة

**Last Updated:** 2026-04-25  
**Priority:** CRITICAL - الفيديو لا يعمل بدونه

---

## 🚨 المشكلة

عند إزالة `allowFullScreen` من iframe والاعتماد فقط على `allow="fullscreen"`:

```tsx
// ❌ خطأ - الفيديو لا يعمل
<iframe
  src={embedUrl}
  className="w-full h-full"
  allow="autoplay; fullscreen; picture-in-picture"
/>
```

**النتيجة:** الفيديو لا يعمل على الإطلاق!

---

## ✅ الحل

يجب وجود **كلاً من** `allowFullScreen` و `allow`:

```tsx
// ✅ صحيح - الفيديو يعمل
<iframe
  src={embedUrl}
  className="w-full h-full"
  allowFullScreen
  allow="autoplay; fullscreen; picture-in-picture"
/>
```

---

## 📝 ملاحظات مهمة

1. **التحذير في الكونسول عادي:**
   ```
   Allow attribute will take precedence over 'allowfullscreen'
   ```
   هذا تحذير من React لكن **لا تحذف allowFullScreen**!

2. **السبب:**
   - `allowFullScreen` هو HTML attribute قديم لكن ضروري
   - `allow="fullscreen"` هو الطريقة الحديثة
   - السيرفرات الخارجية تحتاج الاتنين معاً

3. **المحظورات الثلاثة (لا تضيفهم أبداً):**
   - ❌ `sandbox`
   - ❌ `referrerPolicy`
   - ❌ CSP headers تمنع iframe

---

## 🎯 القاعدة النهائية

**iframe للفيديو يجب أن يحتوي على:**
```tsx
<iframe
  src={embedUrl}
  className="w-full h-full"
  allowFullScreen              // ✅ ضروري
  allow="autoplay; fullscreen; picture-in-picture"  // ✅ ضروري
/>
```

**لا تحذف allowFullScreen حتى لو ظهر تحذير في الكونسول!**

---

**هذا الإصلاح حرج - الفيديو لا يعمل بدونه**
