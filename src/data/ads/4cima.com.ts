/* ============================================================
   بيانات إعلانات 4cima.com — المصدر الوحيد للحقيقة
   ------------------------------------------------------------
   طريقة الاستخدام: كل إعلان له «رقم» ثابت (num).
   مثال: «حط الإعلان رقم 3 في المكان الفلاني»
   → يعني: العنصر اللي num: 3 في الملف ده (160x600 - سايدبار).

   التشغيل: بنحط سكريبتين جوه الحاوية المستهدفة بالترتيب:
   1) <script>atOptions = { 'key': KEY, 'format': 'iframe', 'height': H, 'width': W, 'params': {} }</script>
   2) <script src="INVOKE_JS" async></script>
   ============================================================ */

export interface AdRecord {
  /** الرقم المرجعي الثابت (1-6) — بنستخدمه في الأوامر */
  num: 1 | 2 | 3 | 4 | 5 | 6
  /** معرّف داخلي فريد */
  id: string
  /** الدومين اللي الإعلان مخصص له */
  domain: '4cima.com'
  /** شبكة الإعلانات */
  network: 'Adsterra'
  /** نوع الوحدة */
  format: 'banner'
  /** طريقة التضمين */
  delivery: 'iframe'
  /** معرّف المنطقة في Adsterra (Zone ID) */
  zoneId: string
  /** مفتاح الوحدة من Adsterra */
  key: string
  /** رابط سكريبت التشغيل */
  invokeJs: string
  /** عرض البنر الأصلي (px) */
  width: number
  /** ارتفاع البنر الأصلي (px) */
  height: number
  /** المقاس بصيغة نصية */
  size: string
  /** مكان مقترح على الصفحة */
  placementHint: string
  /** ملاحظات */
  notes?: string
  /** تعطيل الزون مؤقتًا (مثال: دومين التوصيل بتاعها ميت في Adsterra) — لا يُحمَّل أي سكربت */
  enabled?: boolean
}

export const ADS_4CIMA_COM: AdRecord[] = [
  {
    num: 1,
    id: 'home-728x90',
    domain: '4cima.com',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31008094',
    key: '0532fea1f51bb90a981bb89fb414869d',
    invokeJs: 'https://professionalsusceptible.com/0532fea1f51bb90a981bb89fb414869d/invoke.js',
    width: 728,
    height: 90,
    size: '728x90',
    placementHint: 'بنر أفقي كبير — أعلى الصفحة تحت الهيدر أو فوق الهيرو',
    notes: 'أفضل بنر للديسكتوب في أعلى الصفحة',
  },
  {
    num: 2,
    id: 'home-300x250',
    domain: '4cima.com',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31008095',
    key: '9a07073ebf48b3d7d98cf315a469e7c2',
    invokeJs: 'https://professionalsusceptible.com/9a07073ebf48b3d7d98cf315a469e7c2/invoke.js',
    width: 300,
    height: 250,
    size: '300x250',
    placementHint: 'مستطيل متوسط — وسط المحتوى أو بجانبه (المستطيل الكلاسيكي)',
    notes: 'الأعلى أداءً عادةً — مناسب جوه/بعد قائمة الأفلام',
  },
  {
    num: 3,
    id: 'home-160x600',
    domain: '4cima.com',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31008096',
    key: '538636ef4b7a5d451e5c038b418c921e',
    invokeJs: 'https://professionalsusceptible.com/538636ef4b7a5d451e5c038b418c921e/invoke.js',
    width: 160,
    height: 600,
    size: '160x600',
    placementHint: 'بنر طولي — السايدبار يمين أو شمال الصفحة (Wide Skyscraper)',
    notes: 'طويل — يثبت على جانب الشاشة في الديسكتوب',
  },
  {
    num: 4,
    id: 'home-468x60',
    domain: '4cima.com',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31024533',
    key: '133edd7d82f4dab8a843a278994ce72d',
    invokeJs: 'https://professionalsusceptible.com/133edd7d82f4dab8a843a278994ce72d/invoke.js',
    width: 468,
    height: 60,
    size: '468x60',
    placementHint: 'بنر أفقي صغير — بين أقسام المحتوى أو تحت الهيرو',
    notes: 'خفيف — مناسب كسطر إعلاني بين الصفوف',
  },
  {
    num: 5,
    id: 'home-160x300',
    domain: '4cima.com',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31024534',
    key: 'f72de37eaefbe39bbc12fcb14c7b6e73',
    invokeJs: 'https://professionalsusceptible.com/f72de37eaefbe39bbc12fcb14c7b6e73/invoke.js',
    width: 160,
    height: 300,
    size: '160x300',
    placementHint: 'بنر طولي نص — تحت بنر السايدبار الطولي (رقم 3) في نفس العمود',
    notes: 'مكمّل للعمود الجانبي مع 160x600 — الدومين الميت (kettledroopingcontinuation.com) يُحيَّد تلقائيًا بواسطة deadDeliveryGuard.ts، والإعلان يشتغل بمجرد أن Adsterra يبدّل الدومين',
  },
  {
    num: 6,
    id: 'home-320x50',
    domain: '4cima.com',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31024535',
    key: '8096860698e0700c21bd43e4678196b0',
    invokeJs: 'https://professionalsusceptible.com/8096860698e0700c21bd43e4678196b0/invoke.js',
    width: 320,
    height: 50,
    size: '320x50',
    placementHint: 'بنر الموبايل — أسفل الشاشة ثابت (Sticky Footer) أو أعلى الصفحة',
    notes: 'مخصص للشاشات الصغيرة',
  },
]

/** جلب إعلان برقمه المرجعي */
export const getAdByNum = (num: number): AdRecord | undefined =>
  ADS_4CIMA_COM.find((a) => a.num === num)

/** جلب إعلان بمعرّفه الداخلي */
export const getAdById = (id: string): AdRecord | undefined =>
  ADS_4CIMA_COM.find((a) => a.id === id)
