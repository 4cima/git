"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Database, 
  ShieldAlert, 
  Sparkles, 
  Download, 
  CheckCircle, 
  XCircle, 
  Search, 
  Tv, 
  Film, 
  Play, 
  Bug, 
  Heart, 
  ExternalLink,
  ChevronLeft
} from "lucide-react";

export default function AdminPage() {
  const [loadingMock, setLoadingMock] = useState(false);
  const [mockSuccess, setMockSuccess] = useState<string | null>(null);
  
  // Ingest state
  const [ingestId, setIngestId] = useState("");
  const [ingestType, setIngestType] = useState<"movie" | "tv">("movie");
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestResult, setIngestResult] = useState<any | null>(null);
  
  // Custom keys (optional)
  const [tmdbApiKey, setTmdbApiKey] = useState("");
  const [groqApiKey, setGroqApiKey] = useState("");

  // Safety filter test state
  const [testTitle, setTestTitle] = useState("Inception");
  const [testOverview, setTestOverview] = useState("Cobb steals secrets during the dream state.");
  const [testCertification, setTestCertification] = useState("PG-13");
  const [testAdult, setTestAdult] = useState(false);
  const [testKeywords, setTestKeywords] = useState("dreams, subconscious, mind heist");
  const [testRuntime, setTestRuntime] = useState("148");
  const [testCompanies, setTestProductionCompanies] = useState("Warner Bros, Legendary");
  const [testingFilter, setTestingFilter] = useState(false);
  const [filterTestResult, setFilterTestResult] = useState<any | null>(null);

  // Statistics
  const [stats, setStats] = useState<any>({
    moviesCount: 0,
    tvCount: 0,
    seasonsCount: 0,
    episodesCount: 0,
    filteredCount: 0
  });

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (data.success && data.database) {
        setStats({
          moviesCount: data.database.movies || 0,
          tvCount: data.database.tvSeries || 0,
          seasonsCount: data.database.seasons || 0,
          episodesCount: data.database.episodes || 0,
          filteredCount: data.database.filteredCount || 0
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleGenerateMock = async () => {
    setLoadingMock(true);
    setMockSuccess(null);
    try {
      const res = await fetch("/api/mock", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMockSuccess(data.message);
        fetchStats();
      } else {
        alert("فشل في توليد البيانات: " + (data.error || "خطأ غير معروف"));
      }
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setLoadingMock(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestId) return alert("يرجى إدخال TMDB ID");
    setIngestLoading(true);
    setIngestResult(null);
    
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: ingestId,
          type: ingestType,
          apiKey: tmdbApiKey || undefined,
          groqKey: groqApiKey || undefined
        })
      });
      const data = await res.json();
      setIngestResult(data);
      fetchStats();
    } catch (err: any) {
      setIngestResult({ success: false, error: err.message });
    } finally {
      setIngestLoading(false);
    }
  };

  const handleTestFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingFilter(true);
    setFilterTestResult(null);
    
    try {
      const res = await fetch("/api/filter-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: testTitle,
          overview: testOverview,
          certification: testCertification,
          adult: testAdult,
          keywords: testKeywords.split(",").map(s => s.trim()).filter(Boolean),
          runtime: parseInt(testRuntime, 10) || 120,
          productionCompanies: testCompanies.split(",").map(s => s.trim()).filter(Boolean)
        })
      });
      const data = await res.json();
      setFilterTestResult(data);
    } catch (err: any) {
      alert("خطأ أثناء الاختبار: " + err.message);
    } finally {
      setTestingFilter(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link href="/" className="flex items-center space-x-2 space-x-reverse bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
              <span className="text-2xl font-black tracking-wider">فور سيما</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">إدارة</span>
            </Link>
          </div>
          <Link href="/" className="flex items-center text-sm text-slate-400 hover:text-slate-200 transition">
            <ChevronLeft className="w-4 h-4 ml-1" /> العودة للموقع
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500">لوحة التحكم وإدارة البيانات</h1>
          <p className="text-slate-400 mt-1">تعبئة وتجربة البيانات الحية، واختبار فلتر الأمان v2.0 المتطور مع قاعدة بيانات PostgreSQL المحلية.</p>
        </div>

        {/* Live Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="text-slate-400 text-xs font-semibold">الأفلام الفعّالة</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{stats.moviesCount}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="text-slate-400 text-xs font-semibold">المسلسلات الفعّالة</div>
            <div className="text-2xl font-black text-red-400 mt-1">{stats.tvCount}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="text-slate-400 text-xs font-semibold">إجمالي المواسم</div>
            <div className="text-2xl font-black text-amber-500 mt-1">{stats.seasonsCount}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="text-slate-400 text-xs font-semibold">إجمالي الحلقات</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.episodesCount}</div>
          </div>
          <div className="bg-slate-900/50 border border-red-950/50 bg-red-950/5 p-4 rounded-xl col-span-2 lg:col-span-1">
            <div className="text-red-400 text-xs font-semibold flex items-center">
              <ShieldAlert className="w-3.5 h-3.5 ml-1 text-red-500" /> أعمال تم فلترتها
            </div>
            <div className="text-2xl font-black text-red-500 mt-1">{stats.filteredCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Right Column (Controls) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* 1. Fast Seed Mock Database */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-xl pointer-events-none" />
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-100 flex items-center">
                    <Sparkles className="w-5 h-5 ml-2 text-amber-400" />
                    التعبئة الفورية بقاعدة البيانات التجريبية المترجمة
                  </h2>
                  <p className="text-slate-400 text-sm pl-4">
                    بضغطة زر واحدة، سيقوم النظام بزرع 15+ من أروع الأفلام والمسلسلات العربية والعالمية (مترجمة، كاست، مواسم، وحلقات) لتستمتع بالموقع فوراً!
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center">
                <button
                  onClick={handleGenerateMock}
                  disabled={loadingMock}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-amber-950/20 flex items-center justify-center disabled:opacity-50"
                >
                  {loadingMock ? (
                    <>
                      <Database className="w-5 h-5 ml-2 animate-spin" /> جاري زرع قاعدة البيانات...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 ml-2" /> ابدأ التعبئة الذكية الفورية
                    </>
                  )}
                </button>
                <div className="text-xs text-slate-400 text-center sm:text-right">
                  * تستهدف قاعدة بيانات PostgreSQL المحلية.
                </div>
              </div>

              {mockSuccess && (
                <div className="mt-4 p-4 bg-emerald-950/30 border border-emerald-800/30 rounded-xl text-emerald-300 text-sm flex items-start">
                  <CheckCircle className="w-5 h-5 ml-2 text-emerald-400 shrink-0 mt-0.5" />
                  <div>{mockSuccess}</div>
                </div>
              )}
            </div>

            {/* 2. Interactive TMDB Ingestion */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div className="space-y-1 mb-6">
                <h2 className="text-xl font-bold text-slate-100 flex items-center">
                  <Download className="w-5 h-5 ml-2 text-red-500" />
                  سحب محتوى حي من TMDB (مع تصفية v2)
                </h2>
                <p className="text-slate-400 text-sm">
                  أدخل معرف العمل من TMDB وسيقوم المحرك بسحبه وترجمته وفحصه عبر فلتر الأمان v2.0 تلقائياً قبل حفظه.
                </p>
              </div>

              <form onSubmit={handleIngest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">النوع</label>
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        type="button"
                        onClick={() => setIngestType("movie")}
                        className={`flex-1 py-2.5 rounded-xl border font-bold text-sm transition flex items-center justify-center ${
                          ingestType === "movie"
                            ? "bg-slate-800 border-amber-500 text-amber-400"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <Film className="w-4 h-4 ml-1.5" /> فيلم (Movie)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIngestType("tv")}
                        className={`flex-1 py-2.5 rounded-xl border font-bold text-sm transition flex items-center justify-center ${
                          ingestType === "tv"
                            ? "bg-slate-800 border-red-500 text-red-400"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <Tv className="w-4 h-4 ml-1.5" /> مسلسل (TV Show)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">TMDB ID</label>
                    <input
                      type="number"
                      required
                      placeholder="مثال: 157336 (فيلم Interstellar)"
                      value={ingestId}
                      onChange={(e) => setIngestId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Collapsible Advanced Credentials */}
                <div className="border border-slate-800/60 rounded-xl p-4 bg-slate-950/20">
                  <div className="text-xs font-bold text-slate-400 mb-2 flex items-center">
                    <Bug className="w-3.5 h-3.5 ml-1.5 text-amber-500" /> إعدادات مفاتيح متقدمة (اختياري)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">TMDB API Key</label>
                      <input
                        type="password"
                        placeholder="سيستخدم الافتراضي إذا تُرك فارغاً"
                        value={tmdbApiKey}
                        onChange={(e) => setTmdbApiKey(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Groq Cloud Key (للترجمة بالذكاء الاصطناعي)</label>
                      <input
                        type="password"
                        placeholder="أدخل المفتاح للترجمة بـ Llama 3"
                        value={groqApiKey}
                        onChange={(e) => setGroqApiKey(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={ingestLoading}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-slate-100 font-bold rounded-xl transition flex items-center justify-center disabled:opacity-50"
                >
                  {ingestLoading ? (
                    <>
                      <Database className="w-5 h-5 ml-2 animate-spin" /> جاري الاتصال والسحب والفلترة...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 ml-2" /> ابدأ السحب الفوري الآن
                    </>
                  )}
                </button>
              </form>

              {/* Ingestion results */}
              {ingestResult && (
                <div className="mt-6 border border-slate-800 bg-slate-950 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">نتيجة السحب والفلترة:</h3>
                  {ingestResult.success ? (
                    <div className="space-y-3">
                      <div className="flex items-center text-emerald-400 font-bold text-sm">
                        <CheckCircle className="w-4 h-4 ml-1.5" /> تم الاتصال بـ TMDB بنجاح!
                      </div>
                      
                      {ingestResult.filtered ? (
                        <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/30 text-slate-300 text-xs space-y-1">
                          <div className="text-red-500 font-bold flex items-center">
                            <XCircle className="w-3.5 h-3.5 ml-1.5" /> تم الرفض وتصفية المحتوى عبر فلتر الأمان v2.0
                          </div>
                          <div><strong>السبب المكتشف:</strong> <code className="bg-slate-900 px-1 py-0.5 rounded text-red-400">{ingestResult.reason}</code></div>
                          <p className="text-slate-400 mt-1">توضيح: تم تخزين العمل في قاعدة البيانات كعلامة حمراء مفلترة لمنع استدعائه أو تكرار سحبه.</p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-emerald-950/10 border border-emerald-900/20 text-slate-300 text-xs space-y-2">
                          <div className="text-emerald-400 font-bold flex items-center">
                            <CheckCircle className="w-3.5 h-3.5 ml-1.5" /> العمل آمن وجودته عالية وتم قبوله وتخزينه!
                          </div>
                          <div><strong>العنوان:</strong> {ingestResult.title}</div>
                          <div><strong>معرف TMDB:</strong> {ingestResult.tmdbId}</div>
                          <div><strong>النوع:</strong> {ingestResult.type === "movie" ? "فيلم" : "مسلسل"}</div>
                          <div className="mt-1">
                            <Link 
                              href={`/`} 
                              className="text-amber-400 hover:underline flex items-center text-xs"
                            >
                              مشاهدة العمل على الموقع الرئيسي <ExternalLink className="w-3 h-3 mr-1" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-500 text-xs font-semibold flex items-center">
                      <XCircle className="w-4 h-4 ml-1.5" /> فشلت العملية: {ingestResult.error || "خطأ اتصال داخلي"}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Left Column (Safety Filter Tester) */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
              <div className="space-y-1 mb-6">
                <h2 className="text-xl font-bold text-slate-100 flex items-center">
                  <ShieldAlert className="w-5 h-5 ml-2 text-amber-500" />
                  مختبر فلتر الأمان v2.0 المرئي
                </h2>
                <p className="text-slate-400 text-sm">
                  اختبر كيف يفكر فلتر الأمان v2.0 بمجرد ملء الحقول لتتأكد من دقة وقوة الفحص التلقائي ضد العري أو رداءة البيانات.
                </p>
              </div>

              <form onSubmit={handleTestFilter} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">العنوان (العربي أو الإنجليزي)</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">قصة العمل أو الوصف (نص حر للتصفية)</label>
                  <textarea
                    rows={3}
                    value={testOverview}
                    onChange={(e) => setTestOverview(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs placeholder-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">التصنيف العمري (Certification)</label>
                    <select
                      value={testCertification}
                      onChange={(e) => setTestCertification(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-100"
                    >
                      <option value="G">G (للجميع)</option>
                      <option value="PG">PG</option>
                      <option value="PG-13">PG-13</option>
                      <option value="R">R</option>
                      <option value="NC-17">NC-17 (مرفوض)</option>
                      <option value="18">18+ (مرفوض)</option>
                      <option value="X">X (مرفوض)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">العلامة adult في TMDB</label>
                    <div className="flex space-x-2 space-x-reverse h-9 items-center">
                      <button
                        type="button"
                        onClick={() => setTestAdult(!testAdult)}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition border ${
                          testAdult 
                            ? "bg-red-950/20 border-red-500 text-red-500" 
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        {testAdult ? "مفعّل (adult: true)" : "غير مفعّل (false)"}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">الكلمات المفتاحية (TMDB Keywords) - مفصولة بفواصل</label>
                  <input
                    type="text"
                    value={testKeywords}
                    onChange={(e) => setTestKeywords(e.target.value)}
                    placeholder="مثال: sex scene, nudity, action, hero"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs placeholder-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">المدة (بالدقائق)</label>
                    <input
                      type="number"
                      value={testRuntime}
                      onChange={(e) => setTestRuntime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">شركات الإنتاج (Production Studio)</label>
                    <input
                      type="text"
                      value={testCompanies}
                      onChange={(e) => setTestProductionCompanies(e.target.value)}
                      placeholder="مثال: Brazzers, Warner Bros"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs placeholder-slate-700"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={testingFilter}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
                >
                  {testingFilter ? "جاري التحليل السريع..." : "فحص فوري في معايير الفلتر v2.0"}
                </button>
              </form>

              {/* Filter Test Result Output */}
              {filterTestResult && (
                <div className={`mt-6 border rounded-xl p-4 ${
                  filterTestResult.shouldFilter 
                    ? "bg-red-950/20 border-red-900/40 text-red-200" 
                    : "bg-emerald-950/20 border-emerald-900/40 text-emerald-200"
                }`}>
                  <div className="flex items-center space-x-2 space-x-reverse font-bold text-sm mb-3">
                    {filterTestResult.shouldFilter ? (
                      <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span>النتيجة: تم الرفض والفلترة 🚫</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span>النتيجة: آمن ومقبول بنجاح ✅</span>
                      </>
                    )}
                  </div>

                  <div className="text-xs space-y-2 text-slate-300">
                    <div>
                      <strong>السبب التقني المسجل:</strong>{" "}
                      <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-400 text-xs font-mono font-bold">
                        {filterTestResult.reason}
                      </code>
                    </div>

                    <div className="border-t border-slate-800/80 my-2 pt-2 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">تفاصيل التقييم:</div>
                      <div>
                        • فحص المحتوى الصريح (Explicit):{" "}
                        <span className={filterTestResult.explicit.blocked ? "text-red-400 font-bold" : "text-emerald-400"}>
                          {filterTestResult.explicit.blocked ? `مرفوض (${filterTestResult.explicit.reason})` : "سليم وآمن"}
                        </span>
                      </div>
                      <div>
                        • فحص رداءة الجودة (Quality Check):{" "}
                        <span className={filterTestResult.quality.blocked ? "text-red-400 font-bold" : "text-emerald-400"}>
                          {filterTestResult.quality.blocked ? `مستبعد (${filterTestResult.quality.reason})` : "مقبول تقنياً"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
