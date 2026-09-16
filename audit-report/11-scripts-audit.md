# 📁 تدقيق السكريبتات — محدّث بإعادة تدقيق 13/09/2026

> **إعادة تدقيق:** العدد الفعلي الحالي = **108 ملف** في `scripts/`، منها **9 ملفات `tmp-*.js`**. أُضيف ملف `scripts/visitor-content-sql.ts.bak` (نُقل من src كأرشيف — لا يشغَّل).
>
> **⚠️ تصحيح جوهري على القائمة أدناه:** ملفات `check-local-data.js` و `check-schema.js` و `check-tables.js` **مُسجّلة في `ALLOWED_COMMANDS` داخل `src/app/api/admin/operations/route.ts:13-16`** — حذفها سيكسر لوحة العمليات بالأدمن. كذلك `translate-missing-titles.js` و `translate-missing-overviews.js` (سطر 20-21) و `check-secrets.js` (predeploy hook في package.json) و `capture-build-sha.js` (prebuild hook). **لا تحذف أي ملف منها.**

## 11.1 — سكريبتات يجب حذفها (بعد استبعاد المستخدمة في الكود/الـ hooks)

| السكريبت | السبب | آمن للحذف؟ |
|---------|-------|-----------|
| `scripts/1-download-tmdb-ids.js` | ملف فارغ (0 بايت) | ✅ |
| `scripts/tmp-audit-orphans.js` | مؤقت | ✅ (مستخدم يدوياً حديثاً — تأكد انتهاء الغرض) |
| `scripts/tmp-backfill-keywords.js` | مؤقت | ✅ (نفس الملاحظة) |
| `scripts/tmp-candidates.js` | مؤقت | ✅ |
| `scripts/tmp-discover-probe.js` | مؤقت | ✅ |
| `scripts/tmp-discover-probe5.js` | مؤقت | ✅ |
| `scripts/tmp-discover-recent-movies.js` | مؤقت | ✅ |
| `scripts/tmp-discover-snapshot.js` | مؤقت | ✅ |
| `scripts/tmp-discover-verify.js` | مؤقت | ✅ |
| `scripts/tmp-verify-visitable.js` | مؤقت | ✅ |
| `scripts/check-all-static-data-in-db.js` | مكرر | ✅ (غير مُسجّل في operations) |
| `scripts/check-all-tmdb-data.js` | مكرر | ✅ |
| `scripts/check-all-translations.js` | مكرر | ✅ |
| `scripts/check-localdb-keywords-companies.js` | مكرر | ✅ |
| `scripts/check-optimization-results.js` | مكرر | ✅ |
| `scripts/check-production-companies.js` | مكرر | ✅ |
| `scripts/check-remaining-certs.js` | مكرر | ✅ |
| `scripts/check-tmdb-static-data.js` | مكرر | ✅ |
| `scripts/fetch-movie-ids.js` | مكرر من 0-download-ids.js | ✅ |
| `scripts/fetch-series-ids.js` | مكرر من 0-download-ids.js | ✅ |
| `scripts/import-tmdb-movies-ultra-fast.js` | مكرر | ⚠️ راجع الاستخدام اليدوي |
| `scripts/import-tmdb-series-ultra-fast.js` | مكرر | ⚠️ راجع الاستخدام اليدوي |
| ~~`scripts/check-local-data.js`~~ | ~~مكرر~~ | ❌ **لا تحذف** — مُسجّل في operations panel |
| ~~`scripts/check-schema.js`~~ | ~~مكرر~~ | ❌ **لا تحذف** — مُسجّل في operations panel |
| ~~`scripts/check-tables.js`~~ | ~~مكرر~~ | ❌ **لا تحذف** — مُسجّل في operations panel |
| ~~`scripts/translate-missing-titles.js`~~ | ~~مكرر~~ | ❌ **لا تحذف** — مُسجّل في operations panel |
| ~~`scripts/translate-missing-overviews.js`~~ | ~~مكرر~~ | ❌ **لا تحذف** — مُسجّل في operations panel |
| `scripts/FIX-ALL-ISSUES.js` | طوارئ قديم | ✅ |
| `scripts/TV-CAST-REPAIR.js` | مكرر من HYBRID | ✅ |
| `scripts/TV-FLAGS-REPAIR.js` | مكرر | ✅ |
| `scripts/UNFILTER-GOOD-CONTENT.js` | قديم | ✅ |
| `scripts/auto-unfilter-content.js` | مكرر من smart | ✅ |
| `scripts/reset-low-votes-filter.js` | قديم | ✅ |

---

## 11.2 — سكريبتات يجب أرشفتها

انقل الملفات التالية إلى `scripts/archive/`:

```
scripts/add-missing-static-data.js
scripts/add-seo-columns.js
scripts/add-test-ads.js
scripts/analyze-sample-100.js
scripts/AUDIT-EXISTING-CONTENT-SAFETY.js
scripts/auto-unfilter-smart.js
scripts/complete-translations.js
scripts/create-ads-table.js
scripts/create-genre-tables.js
scripts/dump-schema.js
scripts/fetch-incremental-movies.js
scripts/fetch-incremental-series.js
scripts/fetch-missing-posters.js
scripts/fetch-new-movies-by-id.js
scripts/fetch-new-series-by-id.js
scripts/fetch-popular-movies-direct.js
scripts/gen-icons.js
scripts/import-missing-tmdb-movies.js
scripts/import-missing-tmdb-series.js
scripts/import-tvmaze-series-ultra-fast.js
scripts/migrate-ads-mediation.js
scripts/MIGRATE-OLD-SEASONS.js
scripts/rescue-filtered-content.js
scripts/review-ai-results.js
scripts/review-content.js
scripts/schedule-reevaluation.js
scripts/setup-ai-analysis-tables.js
scripts/setup-supabase-storage.js
scripts/test-avatar-upload.js
scripts/test-seo-generator.js
scripts/test-should-reject.js
scripts/translate-all-static-data.js
scripts/translate-short-certifications.js
scripts/translate-static-data.js
scripts/update-existing-seo.js
scripts/upgrade-progress-table.js
```

---

## 11.3 — سكريبتات يجب الاحتفاظ بها

| السكريبت | الوظيفة |
|---------|---------|
| `scripts/0-download-ids.js` | تحميل TMDB IDs |
| `scripts/1-fetch-and-enrich.js` | جلب وإثراء البيانات |
| `scripts/2-enrich-incomplete.js` | إثراء البيانات الناقصة |
| `scripts/3-sync-to-d1.js` | مزامنة مع D1 |
| `scripts/4-precompute-similar.js` | حساب المتشابهات مسبقاً |
| `scripts/5-precompute-lists.js` | حساب القوائم مسبقاً |
| `scripts/6-precompute-genre-lists.js` | قوائم التصنيفات |
| `scripts/7-index-tmdb.js` | فهرسة TMDB |
| `scripts/INGEST-MOVIES-LOGIC.js` | منطق إدخال الأفلام |
| `scripts/INGEST-SERIES-LOGIC.js` | منطق إدخال المسلسلات |
| `scripts/backup-d1.js` | نسخ احتياطي D1 |
| `scripts/backup-d1-to-r2.js` | نسخ إلى R2 |
| `scripts/capture-build-sha.js` | التقاط build SHA |
| `scripts/check-secrets.js` | فحص Secrets |
| `scripts/download-tmdb-exports.js` | تحميل تصديرات TMDB |
| `scripts/download-tmdb-static-data.js` | بيانات TMDB الثابتة |
| `scripts/download-tvmaze-ids.js` | تحميل TVMaze IDs |
| `scripts/health-check.js` | فحص الصحة |
| `scripts/monitoring-dashboard.js` | لوحة المراقبة |
| `scripts/run-ingestion.js` | تشغيل خط الإدخال |
| `scripts/setup-secrets.js` | إعداد Secrets |
| `scripts/tmdb-config.json` | إعدادات TMDB |
| `scripts/tmdb-countries.json` | بيانات الدول |
| `scripts/tmdb-jobs.json` | بيانات الوظائف |
| `scripts/tmdb-languages.json` | بيانات اللغات |
| `scripts/tmdb-movie-certifications.json` | شهادات الأفلام |
| `scripts/tmdb-movie-genres.json` | تصنيفات الأفلام |
| `scripts/tmdb-primary-translations.json` | الترجمات الأساسية |
| `scripts/tmdb-timezones.json` | المناطق الزمنية |
| `scripts/tmdb-tv-certifications.json` | شهادات المسلسلات |
| `scripts/tmdb-tv-genres.json` | تصنيفات المسلسلات |

---

## 11.4 — توصيات

1. **نقل السكريبتات المؤقتة إلى `scripts/archive/`**
2. **حذف الملفات الفارغة والمكررة**
3. **إنشاء `scripts/README.md` يوثق كل سكريبت**
4. **إضافة `scripts/package.json` للسكريبتات المستقلة**
5. **استخدام `tsx` لتشغيل TypeScript مباشرة**
