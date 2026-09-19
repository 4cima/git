# 🆘 RESTORE.md — إجراء استرجاع قاعدة D1 من النسخ الاحتياطي

> **الهدف:** لو قاعدة D1 الإنتاجية (`4cima-db`) اتأثرت (حذف خاطئ، فساد بيانات، كارثة حساب)،
> الإجراء ده يرجّع أهم 4 جداول من آخر نسخة احتياطية شغالة.
> **المبدأ:** مافيش استرجاع يتنفذ من غير أمر صريح من إسلام — القرار إداري قبل ما يكون تقني.

---

## 1) ماذا يغطي الباكب (وماذا لا يغطي)

**يغطي** — 4 جداول (قلب الكتالوج):

| الجدول | المحتوى |
|---|---|
| `movies` | الأفلام كاملة (أعمدة التفاصيل + genres_json + cast…) |
| `tv_series` | المسلسلات كاملة (بما فيها episodes_json) |
| `list_movies_genre` | قوائم الأنواع للأفلام (ترقيم /page/N والـAPIs) |
| `list_series_genre` | قوائم الأنواع للمسلسلات |

**لا يغطي** (حدود معروفة — الباكب اليومي بيصدّر الجداول الأربعة دي فقط):
- `users` / `sessions` / `favorites` / `completed_watch` / `user_reviews` / `watch_history` — بيانات المستخدمين.
- جداول الفهرس المجمّعة (`*_by_genre`، `excluded_genre_*_ids`، `similar_cache`…) — **دي بتتعاد بناؤها من الصفر بعد الاسترجاع** (شوف خطوة 6).
- `sitemap_urls` — بتتعاد بـ`node scripts/build-sitemap-urls.js --remote --apply`.
- ⚠️ الـ49 جدول كامل في القاعدة، والباكب بغطي جزء منهم — لو محتاج توسعة التغطية: زوّد أسماء الجداول في `TABLES_CFG` داخل `scripts/backup-d1.js`.

---

## 2) مصادر النسخ (أيهم متاح؟)

| المصدر | مكانه | ملاحظات |
|---|---|---|
| **GitHub Artifacts** (المصدر الرئيسي) | Actions → «D1 Daily Backup» → آخر تشغيل ناجح → Artifacts → `d1-backup-<run_id>` | احتفاظ 30 يومًا |
| نسخة محلية | `data/backups/d1/YYYY-MM-DD/` على جهاز إسلام | آخر 7 مجلدات فقط |
| R2 | **غير مفعّل حاليًا** (`R2_BUCKET` مش مضبوط في سكرتات GitHub) | لو اتفعّل بيبقى أقوى مصدر |

### تنزيل آخر نسخة من GitHub Artifacts (بـgh CLI):

```bash
# شوف آخر تشغيل ناجح للباكب وخد رقم الـrun من العمود الأول
gh run list --workflow=backup-d1.yml --status=success --limit=3

# نزّل الأرتيفاكت في فولدر جديد
gh run download <RUN_ID> -n "d1-backup-<RUN_ID>" -D restore-work/
```

لو الـgh مش متاح: من المتصفح — github.com/4cima/git → Actions → D1 Daily Backup → آخر تشغيل → Artifacts → Download.

---

## 3) فك الضغط

كل جدول ملف مستقل: `<table>-YYYY-MM-DD.json.gz` + ملف `manifest.json` فيه عدد الصفوف المتوقع لكل جدول.

```bash
cd restore-work/
gzip -d *.gz        # النتيجة: movies-YYYY-MM-DD.json … إلخ + manifest.json
```

---

## 4) تحويل JSON → SQL (جاهز للنسخ)

ملف الباكب JSON سليم بداخله `"rows":[...]`. السنيبت ده بيحوّله لملف SQL ب INSERTs
على دفعات (100 صف). احفظه باسم `json2sql.js` جنب الملفات:

```js
'use strict';
// استخدام: node --max-old-space-size=4096 json2sql.js movies-YYYY-MM-DD.json > movies.sql
const fs = require('fs'), zlib = require('zlib');
const file = process.argv[2];
const raw = file.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(file)) : fs.readFileSync(file);
const doc = JSON.parse(raw);
if (!doc.rows || !doc.rows.length) { console.error('ملف فاضي'); process.exit(1); }

const esc = (v) => v === null || v === undefined ? 'NULL'
  : typeof v === 'number' ? String(v)
  : typeof v === 'boolean' ? (v ? '1' : '0')
  : "'" + String(v).replace(/'/g, "''") + "'";

const cols = Object.keys(doc.rows[0]);
const vals = (r) => '(' + cols.map(c => esc(r[c])).join(',') + ')';

process.stdout.write(`-- table=${doc.table} rows=${doc.rows.length}\n`);
for (let i = 0; i < doc.rows.length; i += 100) {
  process.stdout.write(
    `INSERT INTO ${doc.table} (${cols.join(',')}) VALUES\n` +
    doc.rows.slice(i, i + 100).map(vals).join(',\n') + ';\n'
  );
}
```

**ملاحظات مهمة:**
- `--max-old-space-size=4096` مطلوبة للجداول الكبيرة (tv_series خصوصًا — episodes_json تقيل).
- **الاسترجاع فوق قاعدة فيها بيانات؟** أضف سطر `DELETE FROM <table>;` في أول ملف الـSQL
  (أو `INSERT OR IGNORE`) حسب قرار الاسترجاع: تبييض وتحميل كامل، ولا دمج. **الافتراضي للتبييض الكامل
  هو الأخطر — يتأكد منه إسلام قبل التنفيذ.**
- الشروط الأساسية (`slug`/`tmdb_id`) جاية بنفس قيم النسخة — مفيش تحويل بيانات بيحصل.

---

## 5) التحميل في D1

### الطريقة الأولى — wrangler (المفضلة):

```bash
# تجربة على قاعدة محلية أولاً (اختياري لكنه مُستحسن):
npx wrangler d1 execute 4cima-db --local --file=movies.sql

# التنفيذ على الإنتاج:
CLOUDFLARE_API_TOKEN=<توكن بصلاحية D1:Edit> npx wrangler d1 execute 4cima-db --remote --file=movies.sql
```

الجداول بالترتيب: `movies` → `tv_series` → `list_movies_genre` → `list_series_genre`.

### الطريقة البديلة — D1 REST API (لو wrangler مش متاح):

نفس نقطة النهاية اللي السكربتات بتستخدمها:
`POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DATABASE_ID}/query`
بإرسال الـSQL (على دفعات)، أو نقطة `/import` للملفات الكبيرة — التوكن: `CLOUDFLARE_D1_TOKEN`
من `.env.local` (القيم في الملف المحلي المحمي — لا تُكتب في أي مكان).

---

## 6) بعد التحميل — خطوات إعادة البناء (إلزامية)

الجداول المجمّعة والخريطة **بتتولد من الكتالوج** — بعد استرجاع `movies`/`tv_series` لازم:

```bash
node scripts/build-genre-index.js            # جداول الفهرس (*_by_genre + excluded_*_ids)
node scripts/4-precompute-similar.js         # similar-cache
node scripts/5-precompute-lists.js           # قوائم البحث القصيرة
node scripts/6-precompute-genre-lists.js     # list_*_genre (لو اتعملها wipe في الاسترجاع مش لازم تكتمل تاني — قارن العدادات بالـmanifest الأول)
node scripts/build-sitemap-urls.js --remote --apply   # sitemap_urls
```

ثم **مسح كاش الحافة** (زر المسح في لوحة الأدمن، أو purge_everything بنفس توكن
`CF_CACHE_PURGE_TOKEN` من `.env.local`) — المحتوى اتبدل فالكاش القديم لازم يمسح.

---

## 7) التحقق بعد الاسترجاع

1. **مطابقة العدادات:** قارن `COUNT(*)` لكل جدول مع أرقام `manifest.json`:

```bash
node scripts/check-d1.js    # فحص عام للقاعدة
```

```sql
SELECT COUNT(*) FROM movies;            -- يقارن مع manifest.tables[movies].count
SELECT COUNT(*) FROM tv_series;         -- ومثلها لباقي الجداول
SELECT slug, title_ar FROM movies WHERE tmdb_id = <id معروف>;  -- عينة محتوى
```

2. **فحص الموقع:** صفحة تفاصيل فيلم/مسلسل معروف تفتح 200، وصفحة نوع أولى تفتح،
   والـAPI `/api/movies` يرجّع JSON سليم.
3. **فحص الكاش:** `curl -s -D - -o /dev/null "https://4cima.com/" | grep -i x-edge-cache`
   — أول طلب MISS بعدين HIT (طبيعي بعد المسح).
4. **GitHub Actions:** آخر تشغيل للنشر أخضر (النسخة المبنية شغالة فوق البيانات المسترجعة).

---

## 8) القرارات المطلوبة من إسلام قبل أي استرجاع

- [ ] موافقة صريحة على **تبييض الجداول** (`DELETE` قبل التحميل) أم **دمج**؟
- [ ] اختيار النسخة: آخر نسخة ناجحة، أم نسخة أقدم سليمة (لو الفساد حصل بالنسخة الأخيرة)؟
- [ ] تفعيل R2 كنسخة ثانية خارج GitHub؟ (`R2_BUCKET` سكرت + bucket جديد)

## 9) جهات الاتصال والوصول

| الجهة | الدور |
|---|---|
| **إسلام** (مالك المشروع) | القرار والتنفيذ — حساب Cloudflare + GitHub (`github.com/4cima`) |
| دعم Cloudflare | لو المشكلة في الحساب/القاعدة نفسها (مش في بياناتنا) |
| جلسات ZCode/DeepSeek | المساعدة التقنية بالتنفيذ — ارفق لهم هذا الملف + HANDOFF |

**التوكنات المطلوبة للإجراء:** `CLOUDFLARE_D1_TOKEN` (في `.env.local` محليًا /
`CLOUDFLARE_API_TOKEN` سكرت في GitHub) — القيم لا تُشارك ولا تُكتب في أي ملف.

---

## 10) التوصيات لرفع جاهزية الاسترجاع (خارج الإجراء الحالي)

1. توسعة `TABLES_CFG` في `backup-d1.js` لتشمل جداول المستخدمين (users/favorites/…) —
   قرار يتطلب موازنة حجم النسخة اليومية.
2. تفعيل R2 (بند 8-3) — مصدر تاني خارج GitHub.
3. تدريب وهمي: استرجاع نسخة على قاعدة تجريبية قبل الحاجة الحقيقية.
