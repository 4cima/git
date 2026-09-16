# 🟡 مشاكل التكوين — إعادة تدقيق `HEAD = 469c38d` (13 سبتمبر 2026، قراءة فقط)

> **تصحيح البند 9.2:** `eslint.config.mjs` الحالي **متساهل فعلاً** (`no-explicit-any: warn` + `no-unused-vars: warn`) — أُعيد بـ `git restore` بأمر صريح بعد أن كسر التشديد (`error` + 466 خطأ) الـ build. ادّعاء «تم الإصلاح/التشديد» غير صحيح حالياً. `tsc` نظيف (`EXIT=0`) وهو الحارس الفعلي، و`build:cloudflare` ناجح (`OpenNext build complete`).

## ✅ 9.1 — tsconfig.json: target ES2022 — **تم الإصلاح (مؤكد في `HEAD`)**
**الملف:** `tsconfig.json`

```json
// قبل: "target": "ES2017"
// بعد: "target": "ES2022"
```

---

## ❌ 9.2 — ESLint rules متساهلة — **غير مُصلح (مُسترجع عمداً — التشديد كسر الـ build)**
**الملف:** `eslint.config.mjs:19-26`

```javascript
// الحالة الفعلية: متساهل عمداً
"@typescript-eslint/no-explicit-any": "warn",
"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
// ... كل القواعد warn
```

**السبب:** التشديد إلى `error` أنتج 466 خطأً وكسر `next build` (ESLint blocker). أُعيد الملف الأصلي بأمر صريح. المسار الآمن: `warn` الآن + `tsc --noEmit` (نظيف) كحارس + إصلاح تدريجي ملف-ملف ثم التشديد.

---

## 9.3 — عدم وجود pre-commit hooks
- لا يوجد `.husky/` أو `lint-staged`
- لا يوجد `package.json` script لـ pre-commit

**الحل:**
```json
"husky": {
  "hooks": {
    "pre-commit": "lint-staged"
  }
}
```

---

## 9.4 — عدم وجود .env validation
- لا يوجد تحقق من وجود المتغيرات المطلوبة عند بدء التشغيل
- `assertEnv()` موجودة لكنها "Disabled to prevent crash"

---

## 9.5 — wrangler.jsonc: compatibility_date قديم
```json
"compatibility_date": "2026-08-20"
```

**الحل:** تحديثه بانتظام

---

## 9.6 — عدم وجود .gitignore لـ scripts/tmp
- الملفات المؤقتة (`tmp-*.js`) يجب أن تكون في `.gitignore`
