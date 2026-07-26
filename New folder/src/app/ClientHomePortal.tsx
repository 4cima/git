"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Film, 
  Tv, 
  Search, 
  Sparkles, 
  Star, 
  Play, 
  Database, 
  ExternalLink, 
  Bookmark, 
  Heart,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Info
} from "lucide-react";

interface ContentItem {
  id: number;
  slug: string;
  titleEn: string;
  titleAr: string;
  overviewEn: string;
  overviewAr: string;
  posterPath: string;
  backdropPath: string;
  releaseYear: number | null;
  voteAverage: number;
  popularity: number;
  type: "movie" | "tv";
  primaryGenre: string | null;
  ageRating: string;
}

interface Genre {
  tmdbId: number;
  nameEn: string;
  nameAr: string | null;
  slug: string;
}

interface GenreLink {
  contentTmdbId: number;
  contentType: string;
  genreTmdbId: number;
}

interface ClientHomePortalProps {
  initialContent: ContentItem[];
  genres: Genre[];
  genreLinks: GenreLink[];
  error?: string;
}

export default function ClientHomePortal({ initialContent, genres, genreLinks, error }: ClientHomePortalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveType] = useState<"all" | "movie" | "tv">("all");
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [watchlist, setWatchlist] = useState<number[]>([]);
  
  // Load watchlist from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("watchlist");
        if (saved) {
          setWatchlist(JSON.parse(saved));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Filter content based on search query, active tab (movie/tv), and selected genre
  const filteredContent = initialContent.filter((item) => {
    // 1. Filter by media type (movie/tv)
    if (activeTab !== "all" && item.type !== activeTab) {
      return false;
    }

    // 2. Filter by search query (Arabic or English title)
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.titleAr.toLowerCase().includes(q) || 
                         item.titleEn.toLowerCase().includes(q);
      const matchOverview = item.overviewAr.toLowerCase().includes(q) || 
                           item.overviewEn.toLowerCase().includes(q);
      if (!matchTitle && !matchOverview) {
        return false;
      }
    }

    // 3. Filter by genre
    if (selectedGenreId !== null) {
      const isLinked = genreLinks.some(
        (link) => 
          link.contentTmdbId === item.id && 
          link.contentType === item.type && 
          link.genreTmdbId === selectedGenreId
      );
      if (!isLinked) {
        return false;
      }
    }

    return true;
  });

  // Pick the top popular item for the Hero Banner
  const heroItem = initialContent.length > 0 ? initialContent[0] : null;

  const handleToggleWatchlist = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    let updated;
    if (watchlist.includes(id)) {
      updated = watchlist.filter(item => item !== id);
    } else {
      updated = [...watchlist, id];
    }
    setWatchlist(updated);
    localStorage.setItem("watchlist", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
      {/* 1. Header Navigation */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8 space-x-reverse">
            <Link href="/" className="flex items-center space-x-2 space-x-reverse bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
              <span className="text-2xl font-black tracking-wider">فور سيما</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-sans">v2.0</span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-6 space-x-reverse text-sm font-semibold text-slate-400">
              <button 
                onClick={() => { setActiveType("all"); setSelectedGenreId(null); }}
                className={`hover:text-slate-100 transition ${activeTab === "all" && selectedGenreId === null ? "text-amber-400" : ""}`}
              >
                الرئيسية
              </button>
              <button 
                onClick={() => { setActiveType("movie"); setSelectedGenreId(null); }}
                className={`hover:text-slate-100 transition ${activeTab === "movie" ? "text-amber-400" : ""}`}
              >
                أفلام
              </button>
              <button 
                onClick={() => { setActiveType("tv"); setSelectedGenreId(null); }}
                className={`hover:text-slate-100 transition ${activeTab === "tv" ? "text-amber-400" : ""}`}
              >
                مسلسلات
              </button>
              <div className="flex items-center text-emerald-400 text-xs px-2.5 py-1 rounded-full bg-emerald-950/20 border border-emerald-900/30">
                <ShieldCheck className="w-3.5 h-3.5 ml-1" /> حماية عائلية مفعّلة
              </div>
            </nav>
          </div>

          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Watchlist Counter */}
            <div className="flex items-center text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <Bookmark className="w-3.5 h-3.5 ml-1 text-amber-500" />
              <span>المفضلة ({watchlist.length})</span>
            </div>

            {/* Admin Ingestion Panel Trigger */}
            <Link 
              href="/admin" 
              className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 space-x-reverse"
            >
              <Database className="w-3.5 h-3.5 text-red-500" />
              <span>لوحة الإدارة</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Cinematic Hero Banner */}
      {heroItem && searchQuery === "" && selectedGenreId === null && (
        <section className="relative w-full h-[70vh] md:h-[80vh] flex items-end overflow-hidden border-b border-slate-900 bg-slate-950">
          {/* Blurred overlay backdrop */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105"
            style={{ 
              backgroundImage: `url(${heroItem.backdropPath || heroItem.posterPath})`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-l from-slate-950/80 via-transparent to-transparent" />

          {/* Hero Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-12 md:pb-20 z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8 space-y-4 text-right">
              {/* Badge row */}
              <div className="flex flex-wrap gap-2 items-center text-xs">
                <span className="bg-red-600 text-white font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  {heroItem.type === "movie" ? "فيلم مميز" : "مسلسل رائج"}
                </span>
                <span className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                  {heroItem.releaseYear}
                </span>
                <span className="bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                  {heroItem.ageRating}
                </span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold flex items-center">
                  <Star className="w-3 h-3 ml-1 fill-amber-400" /> {heroItem.voteAverage.toFixed(1)}
                </span>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <h1 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tight leading-none">
                  {heroItem.titleAr}
                </h1>
                <p className="text-sm text-slate-400 italic">
                  {heroItem.titleEn}
                </p>
              </div>

              {/* Description */}
              <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl line-clamp-3">
                {heroItem.overviewAr || heroItem.overviewEn}
              </p>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap gap-3">
                <Link
                  href={`/watch/${heroItem.type}/${heroItem.slug}`}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-slate-950 font-black rounded-xl transition shadow-lg shadow-red-950/30 flex items-center"
                >
                  <Play className="w-5 h-5 ml-2 fill-slate-950" /> شاهد العمل الآن
                </Link>
                <button
                  onClick={(e) => handleToggleWatchlist(e, heroItem.id)}
                  className={`px-5 py-3 rounded-xl font-bold text-sm border transition flex items-center ${
                    watchlist.includes(heroItem.id)
                      ? "bg-amber-500/10 border-amber-500 text-amber-400"
                      : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <Bookmark className="w-4 h-4 ml-1.5" /> 
                  {watchlist.includes(heroItem.id) ? "في المفضلة" : "أضف للمفضلة"}
                </button>
              </div>
            </div>

            {/* Poster Thumbnail for hero on desktop */}
            <div className="hidden lg:block lg:col-span-4 pl-8">
              <div className="aspect-[2/3] w-64 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl scale-105 transform hover:rotate-2 transition duration-500">
                <img 
                  src={heroItem.posterPath} 
                  alt={heroItem.titleAr} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Main Catalog Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Search and Filters Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
          {/* Sub Navigation tabs */}
          <div className="flex space-x-2 space-x-reverse bg-slate-900/60 border border-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => { setActiveType("all"); setSelectedGenreId(null); }}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition ${
                activeTab === "all" ? "bg-red-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              الكل ({initialContent.length})
            </button>
            <button
              onClick={() => { setActiveType("movie"); setSelectedGenreId(null); }}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition flex items-center ${
                activeTab === "movie" ? "bg-red-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Film className="w-3.5 h-3.5 ml-1.5" /> الأفلام
            </button>
            <button
              onClick={() => { setActiveType("tv"); setSelectedGenreId(null); }}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition flex items-center ${
                activeTab === "tv" ? "bg-red-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Tv className="w-3.5 h-3.5 ml-1.5" /> المسلسلات
            </button>
          </div>

          {/* Search Box */}
          <div className="relative max-w-md w-full">
            <input
              type="text"
              placeholder="ابحث عن الأفلام أو المسلسلات بالاسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 text-xs"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          </div>
        </div>

        {/* Dynamic Genres Filter Bar */}
        {genres.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500">تصفية حسب التصنيف السينمائي:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedGenreId(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                  selectedGenreId === null
                    ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                الجميع
              </button>
              {genres.map((g) => {
                const isSelected = selectedGenreId === g.tmdbId;
                return (
                  <button
                    key={g.tmdbId}
                    onClick={() => setSelectedGenreId(g.tmdbId)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                        : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {g.nameAr || g.nameEn}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Display Error Message if Database or other issue is present */}
        {error && (
          <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs flex items-center">
            <AlertTriangle className="w-5 h-5 ml-2 text-red-500" />
            <span>حدث خطأ في جلب البيانات: {error}. يرجى التحقق من اتصال قاعدة البيانات.</span>
          </div>
        )}

        {/* 4. Grid of Content Cards */}
        {filteredContent.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredContent.map((item) => {
              const isFav = watchlist.includes(item.id);
              return (
                <Link
                  href={`/watch/${item.type}/${item.slug}`}
                  key={`${item.type}-${item.id}`}
                  className="group bg-slate-900/20 border border-slate-800/60 hover:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-950/50 relative"
                >
                  {/* Poster Aspect Ratio Container */}
                  <div className="aspect-[2/3] w-full relative overflow-hidden bg-slate-950">
                    {item.posterPath ? (
                      <img
                        src={item.posterPath}
                        alt={item.titleAr}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
                        <Film className="w-8 h-8 text-slate-700 mb-2" />
                        <span className="text-[10px] text-slate-500">{item.titleAr}</span>
                      </div>
                    )}
                    
                    {/* Dark gradient shadow inside card */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Bookmark overlay button */}
                    <button
                      onClick={(e) => handleToggleWatchlist(e, item.id)}
                      className="absolute top-2.5 left-2.5 bg-slate-950/80 hover:bg-slate-950 text-slate-100 p-2 rounded-lg border border-slate-800/80 backdrop-blur-sm transition"
                      title={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isFav ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
                    </button>

                    {/* Age Rating Badge */}
                    <div className="absolute top-2.5 right-2.5 bg-red-600/90 text-white font-bold text-[9px] px-2 py-0.5 rounded">
                      {item.ageRating}
                    </div>

                    {/* Play Hover Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-5 h-5 text-white fill-white mr-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Metadata and Title info */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span className="text-slate-400">{item.releaseYear}</span>
                        <span className="flex items-center text-amber-400">
                          <Star className="w-3 h-3 ml-0.5 fill-amber-400" /> {item.voteAverage.toFixed(1)}
                        </span>
                      </div>

                      <h3 className="text-xs font-black text-slate-200 line-clamp-1 group-hover:text-amber-400 transition">
                        {item.titleAr}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between mt-2 border-t border-slate-900/60 pt-2">
                      <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded">
                        {item.type === "movie" ? "فيلم" : "مسلسل"}
                      </span>
                      <span className="text-[10px] text-slate-500 capitalize truncate pl-2 max-w-[80px]">
                        {item.primaryGenre || "دراما"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Empty Database State */
          <div className="text-center py-20 bg-slate-900/20 border border-slate-900 rounded-3xl p-8 max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto border border-amber-500/20">
              <Database className="w-8 h-8 text-amber-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-200">قاعدة البيانات المحلية فارغة حالياً 🍿</h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
                أهلاً بك في موقع <strong className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">فور سيما</strong> لمشاهدة الأفلام والمسلسلات. يرجى تهيئة وتعبئة قاعدة البيانات بالبيانات التجريبية فائقة الدقة أو سحب عمل من TMDB للبدء الفوري!
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/admin"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black rounded-xl transition text-xs shadow-lg shadow-amber-950/20"
              >
                <Sparkles className="w-4 h-4 ml-2" /> اذهب لتعبئة قاعدة البيانات فورياً
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 5. Safe Content Promise Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-3 text-right">
            <div className="text-xl font-black bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">فور سيما</div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              أكبر شبكة للمشاهدة العائلية والسينمائية النظيفة. تكنولوجيا الفلترة والتصفية v2.0 توفر بيئة مشاهدة آمنة تماماً وخالية بنسبة 100% من أي لقطات أو تلميحات خارجة.
            </p>
          </div>
          <div className="text-slate-500 text-xs md:text-left space-y-2">
            <div>© ٢٠٢٦ فور سيما - جميع الحقوق محفوظة لشبكة المشاهدة الآمنة.</div>
            <div className="flex items-center md:justify-end text-[10px] text-slate-600 space-x-3 space-x-reverse">
              <span className="flex items-center"><ShieldCheck className="w-3.5 h-3.5 ml-1 text-emerald-600" /> فلترة آلية</span>
              <span>•</span>
              <span className="flex items-center"><Heart className="w-3.5 h-3.5 ml-1 text-red-900" /> صُنع بحب وعناية</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
