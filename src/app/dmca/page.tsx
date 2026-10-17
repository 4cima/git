'use client'

import Link from 'next/link'
import { AlertTriangle, Mail, Shield, FileText, Database, ArrowRight, Youtube } from 'lucide-react'

export default function DMCAPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              سياسة DMCA
            </h1>
            <p className="text-slate-400 text-lg">
              قانون الألفية للملكية الرقمية — الإشعارات والطعون
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-8">

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-cyan-400" />
                طبيعة الموقع: قاعدة بيانات معلوماتية
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  موقع <strong className="text-amber-400">فور سيما (4cima.com)</strong> هو <strong className="text-white">قاعدة بيانات وموسوعة سينمائية معلوماتية (Informational Movie &amp; TV Database)</strong> تتيح للزوار استعراض البيانات الوصفية للأعمال السينمائية والتلفزيونية، مثل: القصة، طاقم العمل، التصنيفات، التقييمات، الملصقات الرسمية، وسنوات الإنتاج.
                </p>
                <p>
                  الموقع <strong className="text-white">لا يستضيف ولا يبث ولا يخزن أي ملفات فيديو كاملة على خوادمه</strong>، ولا يوفر أو يشير إلى أي روابط لمصادر استضافة خارجية. وظيفته حصرًا عرض المعلومات الموسوعية العامة المتاحة علنًا.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Youtube className="w-6 h-6 text-purple-400" />
                العروض الترويجية الرسمية والاستخدام العادل
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  بعض الصفحات تتضمن المقاطع الترويجية الرسمية (الإعلانات الرسمية/Trailers) التي يتم تضمينها مباشرة عبر مشغل <strong className="text-white">YouTube الرسمي</strong> باستخدام أداة التضمين المقدمة من المنصة نفسها، ويظل المحتوى مستضافًا على خوادم YouTube وليس على خوادمنا.
                </p>
                <p>
                  يندرج تضمين هذه المقاطع الترويجية والإشارة إليها في سياق إعلامي موسوعي (نقد، توثيق، خبر، تعليم) تحت مبدأ <strong className="text-white">الاستخدام العادل (Fair Use)</strong>، مع الإقرار الكامل بأن جميع حقوق الأعمال الأصلية تعود لأصحابها الشرعيين.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-green-400" />
                الاحترام الفوري لإشعارات الإزالة
              </h2>
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>
                  رغم أن الموقع لا يستضيف أو يبث أي محتوى فيديو، فإننا نحترم بشدة حقوق الملكية الفكرية ونلتزم بمعالجة أي إشعار إزالة صحيح ومكتمل بموجب قانون الألفية للملكية الرقمية (DMCA)، وذلك بإزالة أو تعديل <strong className="text-white">صفحة المعلومات المعنية</strong> (البيانات الوصفية، الملصقات، أو المقطع الترويجي المضمن) دون تأخير.
                </p>
                <p className="font-semibold text-white">يجب أن يتضمن إشعار الإزالة المعلومات التالية:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>توقيع إلكتروني أو مادي لمالك حقوق النشر أو وكيله المصرح له</li>
                  <li>وصف دقيق للعمل المحمي بحقوق النشر الذي تدّعي انتهاكه</li>
                  <li>رابط URL لصفحة المعلومات على موقعنا التي يخصها الإشعار</li>
                  <li>معلومات الاتصال الخاصة بك (الاسم، العنوان، البريد الإلكتروني، رقم الهاتف)</li>
                  <li>بيان بحسن النية بأن الاستخدام الموصوف غير مصرح به من مالك الحقوق</li>
                  <li>بيان بأن المعلومات الواردة في الإشعار دقيقة، وتحمل المسؤولية بوجودها تحت جزاء الحلف</li>
                </ul>

                <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <p className="font-bold text-white mb-2">أرسل إشعارك إلى:</p>
                  <a
                    href="mailto:dmca@4cima.com"
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <Mail className="w-4 h-4" />
                    dmca@4cima.com
                  </a>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-400" />
                مدة المعالجة
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  نلتزم بمراجعة ومعالجة جميع الإشعارات الصحيحة والمكتملة خلال <strong className="text-amber-400">24-48 ساعة</strong> من استلامها. سيتم إزالة صفحة المعلومات المخالفة أو تعديل محتواها فورًا بعد التحقق.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                الطعن المضاد
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  إذا كانت إحدى صفحات المعلومات قد أُزيلت بالخطأ أو نتيجة تحديد هوية خاطئ، فيحق لمقدم المحتوى تقديم إشعار طعن مضاد إلى نفس عنوان البريد الإلكتروني المذكور أعلاه، متضمنًا إثبات الهوية والموافقة على الولاية القضائية المناسبة.
                </p>
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