/* ============================================================
   بيانات إعلانات 4cima.stream — المصدر الوحيد للحقيقة
   ------------------------------------------------------------
   طريقة الاستخدام: كل إعلان له «رقم» ثابت (num).
   مثال: «حط الإعلان رقم 4 تحت مشغّل الفيديو»
   → يعني: العنصر اللي num: 4 في الملف ده (468x60).

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
  domain: '4cima.stream'
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
}

export const ADS_4CIMA_STREAM: AdRecord[] = [
  {
    num: 1,
    id: 'player-728x90',
    domain: '4cima.stream',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31024511',
    key: 'bdb4e0892a506c5b4ffd50fb24dd1806',
    invokeJs: 'https://professionalsusceptible.com/bdb4e0892a506c5b4ffd50fb24dd1806/invoke.js',
    width: 728,
    height: 90,
    size: '728x90',
    placementHint: 'بنر أفقي كبير — أعلى صفحة المشاهدة فوق المشغّل أو تحت الهيدر',
    notes: 'أفضل بنر للديسكتوب أعلى صفحة المشاهدة',
  },
  {
    num: 2,
    id: 'player-300x250',
    domain: '4cima.stream',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31024507',
    key: '9762bec6c202e2299933d090ef970907',
    invokeJs: 'https://professionalsusceptible.com/9762bec6c202e2299933d090ef970907/invoke.js',
    width: 300,
    height: 250,
    size: '300x250',
    placementHint: 'مستطيل متوسط — بجانب المشغّل أو فوق قائمة الحلقات/الأفلام المشابهة',
    notes: 'الأعلى أداءً عادةً',
  },
  {
    num: 3,
    id: 'player-160x600',
    domain: '4cima.stream',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31024509',
    key: '08167b6512c4b7d71219cb965142440d',
    invokeJs: 'https://professionalsusceptible.com/08167b6512c4b7d71219cb965142440d/invoke.js',
    width: 160,
    height: 600,
    size: '160x600',
    placementHint: 'بنر طولي — سايدبار يمين أو شمال صفحة المشاهدة',
    notes: 'يثبت على جانب الشاشة في الديسكتوب',
  },
  {
    num: 4,
    id: 'player-468x60',
    domain: '4cima.stream',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31024506',
    key: 'a473e3ba3aedd3ec83b608c4fa915f7d',
    invokeJs: 'https://professionalsusceptible.com/a473e3ba3aedd3ec83b608c4fa915f7d/invoke.js',
    width: 468,
    height: 60,
    size: '468x60',
    placementHint: 'بنر أفقي صغير — **تحت مشغّل الفيديو مباشرة** أو بين المشغّل والمعلومات',
    notes: 'المكان المفضل ليه: شريط رفيع تحت المشغّل',
  },
  {
    num: 5,
    id: 'player-160x300',
    domain: '4cima.stream',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31024508',
    key: '89807f9f535c61e6f9af60f26437b842',
    invokeJs: 'https://professionalsusceptible.com/89807f9f535c61e6f9af60f26437b842/invoke.js',
    width: 160,
    height: 300,
    size: '160x300',
    placementHint: 'بنر طولي نص — تحت بنر السايدبار الطولي (رقم 3) في نفس العمود',
    notes: 'مكمّل للعمود الجانبي مع 160x600',
  },
  {
    num: 6,
    id: 'player-320x50',
    domain: '4cima.stream',
    network: 'Adsterra',
    format: 'banner',
    delivery: 'iframe',
    zoneId: '31024510',
    key: '57877d62319a7f78e0d12672140d9af3',
    invokeJs: 'https://professionalsusceptible.com/57877d62319a7f78e0d12672140d9af3/invoke.js',
    width: 320,
    height: 50,
    size: '320x50',
    placementHint: 'بنر الموبايل — أسفل الشاشة ثابت (Sticky Footer) أو تحت المشغّل',
    notes: 'مخصص للشاشات الصغيرة',
  },
]

/** جلب إعلان برقمه المرجعي */
export const getAdByNum = (num: number): AdRecord | undefined =>
  ADS_4CIMA_STREAM.find((a) => a.num === num)

/** جلب إعلان بمعرّفه الداخلي */
export const getAdById = (id: string): AdRecord | undefined =>
  ADS_4CIMA_STREAM.find((a) => a.id === id)
