'use client'

import Link from 'next/link'
import { Mail, MessageSquare, Send, Clock, MapPin, Phone, Facebook, ArrowRight } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
              <MessageSquare className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              اتصل بنا
            </h1>
            <p className="text-slate-400 text-lg">
              نحن هنا للإجابة على استفساراتك ومساعدتك
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8">
            
            {/* Quick Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Email Support */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <Mail className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">البريد الإلكتروني</h3>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  للاستفسارات العامة والدعم الفني
                </p>
                <a 
                  href="mailto:support@4cima.online" 
                  className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition font-bold"
                >
                  <Send className="w-4 h-4" />
                  support@4cima.online
                </a>
              </div>

              {/* DMCA */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-red-500/30 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <Mail className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">شكاوى DMCA</h3>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  لمسائل حقوق النشر والملكية الفكرية
                </p>
                <a 
                  href="mailto:dmca@4cima.online" 
                  className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 transition font-bold"
                >
                  <Send className="w-4 h-4" />
                  dmca@4cima.online
                </a>
              </div>

            </div>

            {/* Main Content Box */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-8">
              
              {/* Section 1 */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-purple-400" />
                  كيف يمكننا مساعدتك؟
                </h2>
                <div className="space-y-3 text-slate-300 leading-relaxed">
                  <p>
                    فريق <strong className="text-amber-400">فور سيما (4cima)</strong> مستعد دائماً للإجابة على استفساراتك وحل أي مشكلات قد تواجهها أثناء استخدام موقعنا.
                  </p>
                  <p>
                    سواء كنت بحاجة إلى مساعدة تقنية، أو لديك اقتراح لتحسين الموقع، أو ترغب في الإبلاغ عن محتوى مخالف، نحن هنا من أجلك.
                  </p>
                </div>
              </section>

              <div className="border-t border-slate-800" />

              {/* Section 2 */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">
                  أسباب التواصل معنا
                </h2>
                <div className="space-y-3 text-slate-300 leading-relaxed">
                  <p className="font-semibold text-white">يمكنك التواصل معنا في الحالات التالية:</p>
                  <ul className="list-disc list-inside space-y-2 mr-6">
                    <li>الدعم الفني ومشاكل تشغيل الموقع</li>
                    <li>الإبلاغ عن محتوى مخالف أو روابط معطلة</li>
                    <li>شكاوى حقوق النشر (DMCA)</li>
                    <li>اقتراحات لتحسين الموقع أو إضافة ميزات جديدة</li>
                    <li>استفسارات حول سياسة الخصوصية والشروط والأحكام</li>
                    <li>فرص الشراكة والتعاون</li>
                    <li>الإعلانات والتسويق</li>
                  </ul>
                </div>
              </section>

              <div className="border-t border-slate-800" />

              {/* Section 3 - Response Time */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-green-400" />
                  مدة الاستجابة
                </h2>
                <div className="space-y-3 text-slate-300 leading-relaxed">
                  <p>
                    نحن نسعى جاهدين للرد على جميع الرسائل في أسرع وقت ممكن:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <p className="font-bold text-white mb-1">الاستفسارات العامة</p>
                      <p className="text-sm text-slate-400">الرد خلال 24-48 ساعة</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <p className="font-bold text-white mb-1">شكاوى DMCA</p>
                      <p className="text-sm text-slate-400">معالجة فورية خلال 24 ساعة</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <p className="font-bold text-white mb-1">المشاكل التقنية</p>
                      <p className="text-sm text-slate-400">أولوية قصوى - رد سريع</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <p className="font-bold text-white mb-1">الشراكات</p>
                      <p className="text-sm text-slate-400">الرد خلال 2-3 أيام عمل</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="border-t border-slate-800" />

              {/* Section 4 - Contact Methods */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">
                  طرق التواصل
                </h2>
                <div className="space-y-4">
                  
                  {/* Email */}
                  <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-cyan-500/30 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <Mail className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white mb-2">البريد الإلكتروني (مفضل)</h3>
                        <p className="text-sm text-slate-400 mb-3">
                          أفضل طريقة للحصول على رد مفصل وموثق
                        </p>
                        <div className="space-y-2">
                          <a 
                            href="mailto:support@4cima.online" 
                            className="block text-cyan-400 hover:text-cyan-300 transition text-sm"
                          >
                            📧 support@4cima.online <span className="text-slate-500">(عام)</span>
                          </a>
                          <a 
                            href="mailto:dmca@4cima.online" 
                            className="block text-red-400 hover:text-red-300 transition text-sm"
                          >
                            📧 dmca@4cima.online <span className="text-slate-500">(حقوق نشر)</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Media */}
                  <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-blue-500/30 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <Facebook className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white mb-2">وسائل التواصل الاجتماعي</h3>
                        <p className="text-sm text-slate-400 mb-3">
                          تابعنا للحصول على آخر التحديثات والأخبار
                        </p>
                        <a 
                          href="https://www.facebook.com/4cima2" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition text-sm"
                        >
                          <Facebook className="w-4 h-4" />
                          تابعنا على فيسبوك
                        </a>
                      </div>
                    </div>
                  </div>

                </div>
              </section>

              <div className="border-t border-slate-800" />

              {/* Section 5 - Before Contacting */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">
                  قبل التواصل معنا
                </h2>
                <div className="space-y-3 text-slate-300 leading-relaxed">
                  <p>
                    للحصول على رد أسرع، يُرجى التحقق من الصفحات التالية أولاً:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <Link 
                      href="/dmca"
                      className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-red-500/30 transition-all group"
                    >
                      <p className="font-bold text-white group-hover:text-red-400 transition mb-1">سياسة DMCA</p>
                      <p className="text-xs text-slate-400">لشكاوى حقوق النشر</p>
                    </Link>
                    
                    <Link 
                      href="/privacy"
                      className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-purple-500/30 transition-all group"
                    >
                      <p className="font-bold text-white group-hover:text-purple-400 transition mb-1">سياسة الخصوصية</p>
                      <p className="text-xs text-slate-400">حماية بياناتك</p>
                    </Link>
                    
                    <Link 
                      href="/terms"
                      className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-cyan-500/30 transition-all group"
                    >
                      <p className="font-bold text-white group-hover:text-cyan-400 transition mb-1">الشروط والأحكام</p>
                      <p className="text-xs text-slate-400">قواعد الاستخدام</p>
                    </Link>
                    
                    <Link 
                      href="/copyright"
                      className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-emerald-500/30 transition-all group"
                    >
                      <p className="font-bold text-white group-hover:text-emerald-400 transition mb-1">حقوق النشر</p>
                      <p className="text-xs text-slate-400">الملكية الفكرية</p>
                    </Link>
                  </div>
                </div>
              </section>

              <div className="border-t border-slate-800" />

              {/* Section 6 - Tips */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">
                  نصائح لرسالة فعالة
                </h2>
                <div className="space-y-3 text-slate-300 leading-relaxed">
                  <p>لضمان معالجة استفسارك بكفاءة، يُرجى:</p>
                  <ul className="list-disc list-inside space-y-2 mr-6">
                    <li>كتابة عنوان واضح ومحدد للرسالة</li>
                    <li>شرح المشكلة أو الاستفسار بالتفصيل</li>
                    <li>إرفاق لقطات شاشة إن أمكن (للمشاكل التقنية)</li>
                    <li>ذكر نوع الجهاز والمتصفح المستخدم</li>
                    <li>تقديم رابط URL مباشر للصفحة أو المحتوى المعني</li>
                    <li>كتابة معلومات الاتصال الصحيحة للرد عليك</li>
                  </ul>
                </div>
              </section>

              <div className="border-t border-slate-800" />

              {/* Section 7 - Working Hours */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-amber-400" />
                  ساعات العمل
                </h2>
                <div className="space-y-3 text-slate-300 leading-relaxed">
                  <p>
                    يعمل فريق الدعم لدينا على مدار الساعة لضمان استمرارية الخدمة، لكن أوقات الرد على الرسائل تكون أسرع خلال:
                  </p>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg mt-4">
                    <p className="font-bold text-white mb-2">⏰ الأوقات المثالية للتواصل:</p>
                    <p className="text-sm text-slate-400">من السبت إلى الخميس - 9:00 صباحاً حتى 6:00 مساءً (توقيت القاهرة)</p>
                    <p className="text-xs text-slate-500 mt-2">* نستقبل الرسائل على مدار الساعة، لكن الرد قد يتأخر خارج أوقات العمل</p>
                  </div>
                </div>
              </section>

            </div>

            {/* Call to Action */}
            <div className="bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-800/30 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-black text-white mb-3">
                هل أنت مستعد للتواصل؟
              </h3>
              <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
                نحن متحمسون لسماع آرائك واقتراحاتك. لا تتردد في مراسلتنا في أي وقت!
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a 
                  href="mailto:support@4cima.online"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition font-bold"
                >
                  <Mail className="w-5 h-5" />
                  أرسل رسالة الآن
                </a>
                <a 
                  href="https://www.facebook.com/4cima2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-bold"
                >
                  <Facebook className="w-5 h-5" />
                  تابعنا على فيسبوك
                </a>
              </div>
            </div>

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
