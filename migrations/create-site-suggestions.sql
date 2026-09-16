-- ---------------------------------------------------------------------------
-- site_suggestions — اقتراحات وشكاوى الزوار (فورم /contact)
--
-- سبب الوجود (E-15): src/app/contact/page.tsx كان يرسل POST إلى /api/suggestions
-- وهو مسار غير موجود في المشروع ⇒ 404 دائم ⇒ الفورم لا يعمل إطلاقاً.
-- المسار الجديد src/app/api/suggestions/route.ts ينفّذ CREATE TABLE IF NOT EXISTS
-- بنفس هذا التعريف عند أول طلب، فهذا الملف توثيق للـschema وليس شرطاً للتشغيل.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_suggestions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT (datetime('now')),
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  user_agent TEXT,
  status     TEXT DEFAULT 'new'
);

CREATE INDEX IF NOT EXISTS idx_site_suggestions_created_at ON site_suggestions(created_at DESC);