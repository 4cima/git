'use client'

import Link from 'next/link'
import { AlertTriangle, Mail, Shield, FileText, ArrowRight } from 'lucide-react'

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
              قانون الألفية للملكية الرقمية - حقوق النشر والطعون
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
            
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-cyan-400" />
                إخلاء المسؤولية
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  موقع <strong className="text-amber-400">فور سيما (4cima)</strong> لا يستضيف أي محتوى فيديو على خوادمه الخاصة. جميع مقاطع الفيديو المعروضة على الموقع يتم جلبها من مصادر خارجية وخدمات استضافة تابعة لأطراف ثالثة.
                </p>
                <p>
                  نحن نعمل كمحرك بحث ودليل للمحتوى المتاح بشكل عام على الإنترنت، ولا نملك أو نتحكم في المحتوى المعروض. جميع حقوق الملكية الفكرية تعود لأصحابها الشرعيين.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-purple-400" />
                احترام حقوق النشر
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  نحن نحترم حقوق الملكية الفكرية للآخرين ونتوقع من مستخدمينا أن يفعلوا الشيء نفسه. إذا كنت تعتقد أن محتوى ما ينتهك حقوق النشر الخاصة بك، يُرجى إبلاغنا فوراً.
                </p>
                <p>
                  وفقاً لقانون الألفية للملكية الرقمية (DMCA)، سنقوم بإزالة أي محتوى مخالف فور تلقي إشعار صحيح ومكتمل.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6 text-green-400" />
                تقديم شكوى DMCA
              </h2>
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>
                  لتقديم إشعار إزالة محتوى بموجب DMCA، يجب أن يتضمن طلبك المعلومات التالية:
                </p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>توقيع إلكتروني أو مادي لمالك حقوق النشر</li>
                  <li>وصف دقيق للعمل المحمي بحقوق النشر الذي تدعي انتهاكه</li>
                  <li>رابط URL المباشر للمحتوى المخالف على موقعنا</li>
                  <li>معلومات الاتصال الخاصة بك (الاسم، العنوان، البريد الإلكتروني، رقم الهاتف)</li>
                  <li>بيان بحسن النية بأن الاستخدام غير مصرح به</li>
                  <li>بيان بأن المعلومات الواردة في الإشعار دقيقة</li>
                </ul>
                
                <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <p className="font-bold text-white mb-2">أرسل شكواك إلى:</p>
                  <a 
                    href="mailto:dmca@4cima.online" 
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <Mail className="w-4 h-4" />
                    dmca@4cima.online
                  </a>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                مدة المعالجة
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  نلتزم بمعالجة جميع الطلبات الصحيحة خلال <strong className="text-amber-400">24-48 ساعة</strong> من استلام الإشعار الكامل. سيتم إزالة المحتوى المخالف أو تعطيل الوصول إليه فوراً.
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
                  إذا كنت تعتقد أن المحتوى الخاص بك تمت إزالته بالخطأ أو عن طريق تحديد هوية خاطئ، يمكنك تقديم إشعار طعن مضاد إلى نفس عنوان البريد الإلكتروني المذكور أعلاه.
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
