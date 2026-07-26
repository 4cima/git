'use client'

import Link from 'next/link'
import { Copyright, Scale, FileText, Shield, AlertOctagon, Mail, ArrowRight } from 'lucide-react'

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
                <Scale className="w-6 h-6 text-cyan-400" />
                التزامنا بحقوق الملكية الفكرية
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  في <strong className="text-amber-400">فور سيما (4cima)</strong>، نحترم بشدة حقوق الملكية الفكرية والنشر الخاصة بالمبدعين وأصحاب المحتوى. نحن ملتزمون بحماية هذه الحقوق والامتثال لجميع القوانين المحلية والدولية المتعلقة بحقوق النشر.
                </p>
                <p>
                  نعمل بشكل فعّال على إزالة أي محتوى ينتهك حقوق النشر فور إبلاغنا به بالطريقة الصحيحة.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-400" />
                طبيعة خدمتنا
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  <strong className="text-amber-400">فور سيما (4cima)</strong> هو محرك بحث ودليل إرشادي للمحتوى المرئي المتاح على الإنترنت. نحن <strong className="text-white">لا نستضيف</strong> أي ملفات فيديو أو محتوى مرئي على خوادمنا الخاصة.
                </p>
                <p className="font-semibold text-white">ما نقوم به:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>توفير روابط لمصادر استضافة خارجية (أطراف ثالثة)</li>
                  <li>عرض معلومات عن الأفلام والمسلسلات (عناوين، ملصقات، أوصاف)</li>
                  <li>تسهيل البحث والاكتشاف للمحتوى المتاح علناً</li>
                </ul>
                <p className="font-semibold text-white mt-4">ما لا نقوم به:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>استضافة أو تحميل أي ملفات فيديو على خوادمنا</li>
                  <li>تشفير أو تعديل المحتوى الأصلي</li>
                  <li>بيع أو تحقيق أرباح مباشرة من المحتوى المحمي</li>
                </ul>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-green-400" />
                حقوق المحتوى المعروض
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  جميع الأفلام والمسلسلات والمحتوى المرئي المعروض على موقعنا هو ملكية فكرية لأصحابها الشرعيين، بما في ذلك:
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
                    <strong>إقرار:</strong> نحن لا ندعي ملكية أي محتوى معروض. جميع الحقوق محفوظة لأصحابها الأصليين.
                  </p>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertOctagon className="w-6 h-6 text-red-400" />
                إبلاغ عن انتهاك حقوق النشر
              </h2>
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>
                  إذا كنت مالك حقوق نشر وتعتقد أن محتوى ما على موقعنا ينتهك حقوقك، نحن نأخذ هذا الأمر بجدية تامة ونلتزم بالتعامل معه بسرعة.
                </p>
                <p className="font-semibold text-white">لتقديم شكوى انتهاك حقوق النشر، يُرجى:</p>
                <ol className="list-decimal list-inside space-y-2 mr-6">
                  <li>زيارة <Link href="/dmca" className="text-cyan-400 hover:text-cyan-300 underline">صفحة DMCA</Link> الخاصة بنا</li>
                  <li>اتباع التعليمات الموجودة لتقديم إشعار قانوني</li>
                  <li>تقديم جميع المعلومات المطلوبة (إثبات الملكية، رابط المحتوى، إلخ)</li>
                </ol>
                
                <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <p className="font-bold text-white mb-2">مدة المعالجة:</p>
                  <p className="text-sm">
                    نلتزم بمراجعة جميع الشكاوى الصحيحة والرد عليها خلال <strong className="text-amber-400">24-48 ساعة</strong> من استلامها. سيتم إزالة المحتوى المخالف أو تعطيل الوصول إليه فوراً بعد التحقق.
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

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                الاستخدام العادل (Fair Use)
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  نحن نؤمن بمبدأ الاستخدام العادل للمحتوى المحمي بحقوق النشر في سياقات محددة، مثل:
                </p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>النقد والتعليق والمراجعة</li>
                  <li>الأغراض التعليمية والبحثية</li>
                  <li>المحتوى الإخباري والإعلامي</li>
                  <li>الاستخدام التحويلي غير التجاري</li>
                </ul>
                <p className="mt-4 text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  ومع ذلك، نحترم قرارات مالكي الحقوق إذا اعترضوا على أي استخدام، حتى لو كان يندرج تحت الاستخدام العادل.
                </p>
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
                  نحتفظ بالحق في إنهاء حسابات المستخدمين أو حظرهم إذا ثبت تورطهم المتكرر في انتهاك حقوق النشر، سواء بالتحميل أو المشاركة أو الترويج للمحتوى المخالف.
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
                      href="mailto:dmca@4cima.online" 
                      className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition"
                    >
                      <Mail className="w-4 h-4" />
                      dmca@4cima.online
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
                  <li>احترام جميع حقوق الملكية الفكرية</li>
                  <li>عدم استخدام الموقع لانتهاك حقوق النشر</li>
                  <li>فهم أن المحتوى مستضاف خارجياً ولسنا مسؤولين عنه</li>
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
