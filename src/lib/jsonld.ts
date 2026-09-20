// JSON-LD جوه <script type="application/ld+json">: JSON.stringify لوحده بيسمح
// بعنوان فيوه "</script>" يقفل الوسم ويحقن كود في الصفحة. تهريب كل "<" لـ
// "\u003c" يمنع كسر الوسم، ومفسّرات JSON بتفكّ التهريب تلقائيًا — مافيش أي
// تغيير في البيانات نفسها.
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}
