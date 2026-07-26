'use client'

import Link from 'next/link'
import { FileCheck, Info, AlertCircle, CheckCircle, XCircle, ArrowRight } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
              <FileCheck className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              الشروط والأحكام
            </h1>
            <p className="text-slate-400 text-lg">
              قواعد الاستخدام والشروط القانونية لموقع فور سيما
            </p>
            <p className="text-slate-500 text-sm mt-2">
              آخر تحديث: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
            
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-6 h-6 text-blue-400" />
                مقدمة وقبول الشروط
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  مرحباً بك في <strong className="text-amber-400">فور سيما (4cima)</strong>. باستخدامك لهذا الموقع، فإنك توافق على الالتزام بجميع الشروط والأحكام الموضحة أدناه.
                </p>
                <p>
                  إذا كنت لا توافق على أي من هذه الشروط، يُرجى عدم استخدام الموقع. نحتفظ بالحق في تعديل هذه الشروط في أي وقت دون إشعار مسبق.
                </p>
                <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-sm">
                  <p className="text-cyan-400">
                    <strong>تنبيه هام:</strong> استخدامك المستمر للموقع بعد أي تعديلات يعني موافقتك التلقائية على الشروط الجديدة.
                  </p>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                الاستخدام المسموح
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>يُسمح لك باستخدام الموقع للأغراض التالية:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>تصفح المحتوى المتاح مجاناً للاستخدام الشخصي غير التجاري</li>
                  <li>البحث عن الأفلام والمسلسلات والمحتوى الترفيهي</li>
                  <li>مشاهدة المحتوى المتاح من المصادر الخارجية المدرجة</li>
                  <li>إنشاء قوائم مفضلة شخصية (إن وُجدت الميزة)</li>
                  <li>مشاركة روابط المحتوى عبر وسائل التواصل الاجتماعي</li>
                </ul>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-400" />
                الاستخدام المحظور
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p className="font-semibold text-white">يُحظر عليك القيام بأي من الأفعال التالية:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>استخدام الموقع لأي غرض غير قانوني أو غير مصرح به</li>
                  <li>محاولة اختراق أو تعطيل أو إلحاق الضرر بالموقع أو خوادمه</li>
                  <li>استخدام برامج أو أدوات آلية (bots) للوصول للموقع أو جمع البيانات</li>
                  <li>إعادة بيع أو استغلال المحتوى تجارياً بأي شكل</li>
                  <li>تحميل أو نشر محتوى مخالف، مسيء، أو ينتهك حقوق الآخرين</li>
                  <li>انتحال شخصية أي فرد أو كيان أو التحريف على هويتك</li>
                  <li>إزالة أي حقوق نشر أو علامات تجارية أو إشعارات ملكية</li>
                </ul>
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">
                    <strong>تحذير:</strong> انتهاك هذه القواعد قد يؤدي إلى حظر دائم من الموقع واتخاذ إجراءات قانونية.
                  </p>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
                إخلاء المسؤولية عن المحتوى
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  <strong className="text-amber-400">فور سيما (4cima)</strong> يعمل كمحرك بحث ودليل للمحتوى المتاح على الإنترنت. نحن <strong className="text-white">لا نستضيف</strong> أي ملفات فيديو على خوادمنا الخاصة.
                </p>
                <p>
                  جميع مقاطع الفيديو والمحتوى المعروض يتم جلبه من مصادر خارجية وخوادم طرف ثالث. نحن لا نملك أو نتحكم في هذا المحتوى، ولا نضمن دقته أو جودته أو قانونيته.
                </p>
                <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <p className="text-sm">
                    <strong className="text-white">ملاحظة قانونية:</strong> جميع حقوق الملكية الفكرية للمحتوى المعروض تعود لأصحابها الأصليين. إذا كنت مالك حقوق وترغب في إزالة محتوى ما، يُرجى مراسلتنا عبر <Link href="/dmca" className="text-cyan-400 hover:text-cyan-300 underline">صفحة DMCA</Link>.
                  </p>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                إخلاء المسؤولية القانونية
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  يتم توفير الموقع والمحتوى <strong className="text-white">"كما هو"</strong> دون أي ضمانات من أي نوع، صريحة أو ضمنية.
                </p>
                <p>نحن لا نتحمل المسؤولية عن:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدامك للموقع</li>
                  <li>دقة أو اكتمال أو موثوقية المحتوى المعروض</li>
                  <li>أي فيروسات أو برامج ضارة قد تصيب جهازك عبر الروابط الخارجية</li>
                  <li>محتوى أو سياسات المواقع الخارجية المرتبطة بنا</li>
                  <li>أي خسارة بيانات أو خصوصية نتيجة استخدام الخدمات الخارجية</li>
                </ul>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                حقوق الملكية الفكرية
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  جميع حقوق الملكية الفكرية للموقع نفسه (التصميم، الشعار، الأكواد، النصوص الأصلية) محفوظة لـ <strong className="text-amber-400">فور سيما (4cima)</strong>.
                </p>
                <p>
                  لا يجوز لك نسخ أو تعديل أو توزيع أو إعادة إنتاج أي جزء من الموقع دون إذن كتابي صريح منا، باستثناء ما يسمح به القانون.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                الروابط الخارجية
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  قد يحتوي الموقع على روابط لمواقع ويب خارجية لا نديرها أو نتحكم بها. نحن لسنا مسؤولين عن محتوى أو سياسات الخصوصية أو ممارسات أي مواقع طرف ثالث.
                </p>
                <p className="text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                  <strong>تنبيه:</strong> ننصحك بقراءة شروط الاستخدام وسياسات الخصوصية لأي موقع خارجي تزوره.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                الإعلانات والمحتوى الترويجي
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  قد يعرض الموقع إعلانات من أطراف ثالثة. نحن لا نتحمل المسؤولية عن محتوى هذه الإعلانات أو المنتجات أو الخدمات المعلن عنها.
                </p>
                <p>
                  تفاعلك مع الإعلانات وأي معاملات تجارية ناتجة هي بينك وبين المعلن فقط.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                التعديلات على الخدمة
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  نحتفظ بالحق في تعديل أو إيقاف أو إنهاء الموقع (أو أي جزء منه) في أي وقت دون إشعار مسبق.
                </p>
                <p>
                  لن نكون مسؤولين تجاهك أو تجاه أي طرف ثالث عن أي تعديل أو تعليق أو إيقاف للخدمة.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                القانون الحاكم
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  تخضع هذه الشروط والأحكام وتُفسَّر وفقاً للقوانين المعمول بها في جمهورية مصر العربية، دون النظر إلى تضارب أحكام القانون.
                </p>
                <p>
                  أي نزاع ينشأ عن هذه الشروط سيكون خاضعاً للاختصاص القضائي الحصري للمحاكم المصرية.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                تواصل معنا
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  إذا كانت لديك أي أسئلة أو استفسارات حول هذه الشروط والأحكام، يُرجى التواصل معنا:
                </p>
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <Link 
                    href="/contact" 
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                    صفحة اتصل بنا
                  </Link>
                </div>
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
