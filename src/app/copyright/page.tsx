'use client'

import Link from 'next/link'
import { Copyright, Scale, FileText, Shield, Database, Youtube, Mail, ArrowRight } from 'lucide-react'

export default function CopyrightPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <Copyright className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              حقوق النشر
            </h1>
            <p className="text-slate-400 text-lg">
              سياسة حماية حقوق الملكية الفكرية والنشر
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-8">

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-cyan-400" />
                طبيعة خدمتنا: موسوعة سينمائية معلوماتية
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  <strong className="text-amber-400">فور سيما (4cima.com)</strong> هي <strong className="text-white">قاعدة بيانات وموسوعة سينمائية معلوماتية (Informational Movie &amp; TV Database)</strong> تعرض فقط البيانات الوصفية للأعمال السينمائية والتلفزيونية: القصة، طاقم العمل، التصنيفات، التقييمات، والملصقات الرسمية.
                </p>
                <p>
                  الموقع <strong className="text-white">لا يستضيف ولا يبث ولا يخزن أي ملفات فيديو كاملة على خوادمه</strong>، ولا يوفر أو يشير إلى أي روابط لمصادر استضافة خارجية. جميع ما نعرضه هو معلومات موسوعية عامة وقوائم استعراضية لصالح البحث والمعرفة.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Youtube className="w-6 h-6 text-purple-400" />
                ما نعرضه وما لا نعرضه
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p className="font-semibold text-white">ما نعرضه:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>بيانات وصفية للأعمال (عناوين، قصص، طاقم عمل، تقييمات، تصنيفات)</li>
                  <li>ملصقات رسمية وصور ترويجية للاستخدام الإعلامي والإخباري</li>
                  <li>مقاطع ترويجية رسمية (إعلانات/Trailers) مضمنة عبر مشغل YouTube الرسمي بموجب مبدأ الاستخدام العادل (Fair Use)</li>
                  <li>قوائم استعراضية وقوائم رائج لأغراض الموسوعة والاكتشاف</li>
                </ul>
                <p className="font-semibold text-white mt-4">ما لا نقوم به:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>استضافة أو بث أو تخزين أي ملفات فيديو كاملة على خوادمنا</li>
                  <li>توفير أو الإشارة إلى روابط لمصادر استضافة خارجية</li>
                  <li>تشفير أو تعديل أي محتوى أصلي</li>
                  <li>بيع أو تحقيق أرباح مباشرة من المحتوى المحمي</li>
                </ul>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Scale className="w-6 h-6 text-green-400" />
                حقوق المحتوى المعروض
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  جميع الأعمال السينمائية والتلفزيونية موضوع البيانات الوصفية على موقعنا هي ملكية فكرية لأصحابها الشرعيين، بما في ذلك:
                </p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>شركات الإنتاج والاستوديوهات السينمائية</li>
                  <li>الموزعين المرخصين</li>
                  <li>المنصات الرسمية (Netflix، Disney+، HBO، إلخ)</li>
                  <li>القنوات التلفزيونية وشبكات البث</li>
                  <li>المخرجين والمنتجين والفنانين</li>
                </ul>
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-emerald-400">
                    <strong>إقرار:</strong> نحن لا ندعي ملكية أي عمل أو مقطع ترويجي تُعرض بياناته أو تُضمَّن إعلاناته الرسمية. جميع الحقوق محفوظة لأصحابها الأصليين.
                  </p>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-red-400" />
                الاستخدام العادل (Fair Use)
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  الموقع يعمل في إطار مبدأ الاستخدام العادل للمحتوى المحمي في سياقات إعلامية موسوعية محددة، مثل:
                </p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>النقد والتعليق والمراجعة</li>
                  <li>الأغراض التعليمية والبحثية والتوثيقية</li>
                  <li>المحتوى الإخباري والإعلامي (الملصقات والبيانات الوصفية)</li>
                  <li>الاستخدام التحويلي غير التجاري (فهارس معلومات وقوائم استعراض)</li>
                </ul>
                <p className="mt-4 text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  ومع ذلك، نحترم قرارات مالكي الحقوق إذا اعترضوا على أي استخدام، حتى لو كان يندرج تحت الاستخدام العادل — وستُعالج اعتراضاتهم فورًا وفق سياسة DMCA لدينا.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                إبلاغ عن انتهاك حقوق النشر
              </h2>
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>
                  إذا كنت مالك حقوق نشر وتعتقد أن إحدى صفحات المعلومات على موقعنا (بيانات وصفية، ملصق، أو مقطع ترويجي مضمن) تستخدم محتواك بشكل غير مصرح به، نأخذ هذا الأمر بجدية تامة.
                </p>
                <p className="font-semibold text-white">لتقديم شكوى، يُرجى:</p>
                <ol className="list-decimal list-inside space-y-2 mr-6">
                  <li>زيارة <Link href="/dmca" className="text-cyan-400 hover:text-cyan-300 underline">صفحة DMCA</Link> الخاصة بنا</li>
                  <li>اتباع التعليمات الموجودة لتقديم إشعار قانوني مكتمل</li>
                  <li>تقديم جميع المعلومات المطلوبة (إثبات الملكية، رابط الصفحة المعنية على موقعنا، بيانات الاتصال، إلخ)</li>
                </ol>

                <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <p className="font-bold text-white mb-2">مدة المعالجة:</p>
                  <p className="text-sm">
                    نلتزم بمراجعة جميع الشكاوى الصحيحة والرد عليها خلال <strong className="text-amber-400">24-48 ساعة</strong> من استلامها. سيتم إزالة صفحة المعلومات المعنية أو تعديلها فورًا بعد التحقق.
                  </p>
                </div>

                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">
                    <strong>تحذير:</strong> تقديم شكاوى كاذبة أو غير دقيقة قد يعرضك للمساءلة القانونية بموجب قانون DMCA.
                  </p>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                سياسة تكرار الانتهاكات
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  نحتفظ بالحق في إنهاء حسابات المستخدمين أو حظرهم إذا ثبت تورطهم المتكرر في انتهاك حقوق النشر أو في إساءة استخدام المنصة.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                حقوق النشر الخاصة بالموقع
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  جميع العناصر الأصلية لموقع <strong className="text-amber-400">فور سيما (4cima)</strong> محمية بحقوق النشر، بما في ذلك:
                </p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>التصميم والواجهة والرسومات</li>
                  <li>الشعار والعلامة التجارية</li>
                  <li>الأكواد البرمجية والخوارزميات</li>
                  <li>النصوص الأصلية والمحتوى المكتوب</li>
                  <li>التنسيق والهيكلة العامة</li>
                </ul>
                <p className="mt-4">
                  © {new Date().getFullYear()} <strong className="text-amber-400">فور سيما (4cima)</strong> - جميع الحقوق محفوظة.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6 text-blue-400" />
                الاتصال بنا
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  للاستفسارات المتعلقة بحقوق النشر أو لتقديم شكوى:
                </p>
                <div className="space-y-3">
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="font-bold text-white mb-2">شكاوى DMCA:</p>
                    <a
                      href="mailto:dmca@4cima.com"
                      className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition"
                    >
                      <Mail className="w-4 h-4" />
                      dmca@4cima.com
                    </a>
                  </div>

                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <p className="font-bold text-white mb-2">استفسارات عامة:</p>
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition"
                    >
                      <ArrowRight className="w-4 h-4" />
                      صفحة اتصل بنا
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                إقرار نهائي
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  باستخدامك لموقع <strong className="text-amber-400">فور سيما (4cima)</strong>، فإنك تقر وتوافق على:
                </p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>طبيعة الموقع كقاعدة بيانات وموسوعة سينمائية معلوماتية</li>
                  <li>احترام جميع حقوق الملكية الفكرية</li>
                  <li>عدم استخدام الموقع لأي غرض يخالف حقوق النشر</li>
                  <li>الإبلاغ عن أي محتوى مخالف تصادفه</li>
                </ul>
              </div>
            </section>

          </div>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition font-bold"
            >
              <ArrowRight className="w-4 h-4" />
              العودة للصفحة الرئيسية
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}