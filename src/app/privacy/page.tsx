'use client'

import Link from 'next/link'
import { Shield, Eye, Lock, Cookie, Database, ArrowRight } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              سياسة الخصوصية
            </h1>
            <p className="text-slate-400 text-lg">
              حماية بياناتك وخصوصيتك أولويتنا القصوى
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
                <Eye className="w-6 h-6 text-cyan-400" />
                نظرة عامة
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  في <strong className="text-amber-400">فور سيما (4cima)</strong>، نحن ملتزمون بحماية خصوصيتك وأمان معلوماتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية بياناتك عند استخدام موقعنا.
                </p>
                <p>
                  نحن نؤمن بالشفافية الكاملة ونمنحك السيطرة الكاملة على معلوماتك الشخصية.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-green-400" />
                المعلومات التي نجمعها
              </h2>
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p className="font-semibold text-white">1. معلومات التصفح التلقائية:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>عنوان IP الخاص بك</li>
                  <li>نوع المتصفح ونظام التشغيل</li>
                  <li>الصفحات التي تزورها ووقت الزيارة</li>
                  <li>مصدر الإحالة (الموقع الذي أتيت منه)</li>
                </ul>

                <p className="font-semibold text-white mt-4">2. معلومات اختيارية:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>البريد الإلكتروني (عند الاشتراك في النشرة الإخبارية)</li>
                  <li>تفضيلات المشاهدة والبحث</li>
                </ul>

                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-400">
                    <strong>ملاحظة:</strong> نحن لا نطلب أو نخزن معلومات حساسة مثل بيانات بطاقات الائتمان أو الهوية الشخصية.
                  </p>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6 text-yellow-400" />
                كيف نستخدم معلوماتك
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>نستخدم المعلومات المجمعة للأغراض التالية:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>تحسين تجربة المستخدم وتخصيص المحتوى</li>
                  <li>تحليل أنماط الاستخدام لتطوير الموقع</li>
                  <li>ضمان أمان الموقع ومنع الاحتيال</li>
                  <li>إرسال تحديثات (فقط إذا اشتركت)</li>
                  <li>الاستجابة لطلبات الدعم الفني</li>
                </ul>
                <p className="mt-4 text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  <strong>نحن لا نبيع أو نشارك معلوماتك الشخصية مع أطراف ثالثة لأغراض تجارية.</strong>
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Cookie className="w-6 h-6 text-orange-400" />
                ملفات تعريف الارتباط (Cookies)
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  نستخدم ملفات تعريف الارتباط لتحسين تجربتك على الموقع. الكوكيز هي ملفات نصية صغيرة تُخزن على جهازك.
                </p>
                <p className="font-semibold text-white">أنواع الكوكيز التي نستخدمها:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li><strong>كوكيز ضرورية:</strong> مطلوبة لتشغيل الموقع بشكل صحيح</li>
                  <li><strong>كوكيز التحليلات:</strong> لفهم كيفية استخدام الزوار للموقع</li>
                  <li><strong>كوكيز التفضيلات:</strong> لتذكر إعداداتك المفضلة</li>
                </ul>
                <p className="mt-4">
                  يمكنك تعطيل ملفات تعريف الارتباط من إعدادات متصفحك، لكن قد يؤثر ذلك على بعض وظائف الموقع.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                خدمات الطرف الثالث
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  قد يحتوي موقعنا على روابط لخدمات طرف ثالث (مثل خوادم الفيديو). هذه الخدمات لها سياسات خصوصية خاصة بها ونحن غير مسؤولين عن ممارساتهم.
                </p>
                <p className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                  <strong>تنبيه:</strong> ننصحك بمراجعة سياسات الخصوصية لأي خدمة تابعة لجهة خارجية قبل استخدامها.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                حقوقك
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>لديك الحق في:</p>
                <ul className="list-disc list-inside space-y-2 mr-6">
                  <li>الوصول إلى معلوماتك الشخصية</li>
                  <li>تصحيح أي معلومات غير دقيقة</li>
                  <li>طلب حذف بياناتك</li>
                  <li>الاعتراض على معالجة بياناتك</li>
                  <li>سحب موافقتك في أي وقت</li>
                </ul>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                أمان البيانات
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  نستخدم إجراءات أمان متقدمة لحماية معلوماتك من الوصول غير المصرح به أو الإفصاح أو التعديل. ومع ذلك، لا يمكن ضمان أمان الإنترنت بنسبة 100%.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                التغييرات على هذه السياسة
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ "آخر تحديث" في الأعلى.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-800" />

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                اتصل بنا
              </h2>
              <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>
                  إذا كانت لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى التواصل معنا:
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
