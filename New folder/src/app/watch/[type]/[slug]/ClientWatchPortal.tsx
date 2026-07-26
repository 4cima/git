"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Star, 
  Clock, 
  Calendar, 
  Play, 
  Film, 
  Tv, 
  Bookmark, 
  Share2, 
  User, 
  Send, 
  MessageSquare, 
  ChevronRight, 
  Lightbulb, 
  ShieldCheck,
  Globe,
  Plus
} from "lucide-react";

interface Content {
  id: number;
  slug: string;
  titleEn: string;
  titleAr: string;
  titleOriginal: string;
  overviewEn: string;
  overviewAr: string;
  posterPath: string;
  backdropPath: string;
  releaseDate: string | null;
  releaseYear: number | null;
  runtime: number;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  trailerKey: string | null;
  imdbId: string | null;
  countryOfOrigin: string;
  ageRating: string;
  type: "movie" | "tv";
}

interface Genre {
  tmdbId: number;
  nameEn: string;
  nameAr: string | null;
  slug: string;
}

interface CastMember {
  tmdbId: number;
  nameEn: string;
  nameAr: string | null;
  profilePath: string | null;
  characterName: string | null;
  job: string | null;
  roleType: string;
}

interface Season {
  seriesTmdbId: number;
  seasonNumber: number;
  nameEn: string | null;
  nameAr: string | null;
  overviewEn: string | null;
  overviewAr: string | null;
  posterPath: string | null;
  airDate: string | null;
  airYear: number | null;
  episodeCount: number;
}

interface Episode {
  seriesTmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  nameEn: string | null;
  nameAr: string | null;
  overviewEn: string | null;
  overviewAr: string | null;
  stillPath: string | null;
  airDate: string | null;
  runtime: number | null;
  voteAverage: number;
}

interface ClientWatchPortalProps {
  content: Content;
  genres: Genre[];
  cast: CastMember[];
  seasons: Season[];
  episodes: Episode[];
}

export default function ClientWatchPortal({ content, genres, cast, seasons, episodes }: ClientWatchPortalProps) {
  const [activeServer, setActiveServer] = useState<"server1" | "server2" | "trailer">("server1");
  const [theaterMode, setTheaterMode] = useState(false);
  const [watchlist, setWatchlist] = useState<number[]>([]);
  
  // TV Series specific state
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  
  // Reviews state
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Set default active server depending on trailer availability
  useEffect(() => {
    if (!content.trailerKey && activeServer === "trailer") {
      setActiveServer("server1");
    }
  }, [content.trailerKey]);

  // Load watchlist and fetch reviews on mount
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
    fetchReviews();
  }, [content.id]);

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const res = await fetch(`/api/reviews?contentTmdbId=${content.id}&contentType=${content.type}`);
      const data = await res.json();
      if (data.success) {
        setReviewsList(data.reviews || []);
      }
    } catch (e) {
      console.error("Failed fetching reviews:", e);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewContent.trim()) {
      return alert("يرجى كتابة اسمك والتعليق أولاً");
    }
    setSubmittingReview(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentTmdbId: content.id,
          contentType: content.type,
          authorName: reviewName,
          rating: reviewRating,
          content: reviewContent
        })
      });

      const data = await res.json();
      if (data.success) {
        // Prepend review to local list instantly
        setReviewsList(prev => [
          {
            id: Date.now(),
            authorName: reviewName,
            rating: reviewRating,
            content: reviewContent,
            createdAt: new Date().toISOString()
          },
          ...prev
        ]);
        // Reset form
        setReviewContent("");
        setReviewName("");
        setReviewRating(5);
      } else {
        alert(data.error || "فشل إضافة التعليق");
      }
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleToggleWatchlist = () => {
    let updated;
    if (watchlist.includes(content.id)) {
      updated = watchlist.filter(item => item !== content.id);
    } else {
      updated = [...watchlist, content.id];
    }
    setWatchlist(updated);
    localStorage.setItem("watchlist", JSON.stringify(updated));
  };

  // Get current playing episode detail
  const currentEpisodeDetails = content.type === "tv" 
    ? episodes.find(e => e.seasonNumber === selectedSeason && e.episodeNumber === selectedEpisode)
    : null;

  // Filter episodes belonging to the selected season
  const filteredEpisodesList = content.type === "tv"
    ? episodes.filter(e => e.seasonNumber === selectedSeason)
    : [];

  // Generate Embed Video Player URLs
  let embedUrl = "";
  if (activeServer === "trailer" && content.trailerKey) {
    embedUrl = `https://www.youtube.com/embed/${content.trailerKey}?autoplay=1&modestbranding=1`;
  } else if (content.type === "movie") {
    if (activeServer === "server1") {
      // Legal free embed proxy 1
      embedUrl = `https://vidsrc.to/embed/movie/${content.imdbId || content.id}`;
    } else {
      // Legal free embed proxy 2 (alternative)
      embedUrl = `https://vidsrc.xyz/embed/movie/${content.id}`;
    }
  } else {
    // TV show
    if (activeServer === "server1") {
      embedUrl = `https://vidsrc.to/embed/tv/${content.imdbId || content.id}/${selectedSeason}/${selectedEpisode}`;
    } else {
      embedUrl = `https://vidsrc.xyz/embed/tv/${content.id}/${selectedSeason}/${selectedEpisode}`;
    }
  }

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 relative ${theaterMode ? "overflow-x-hidden" : ""}`} dir="rtl">
      
      {/* Dimmer overlay for theater mode */}
      {theaterMode && (
        <div 
          className="fixed inset-0 bg-black/95 z-40 transition-all duration-500 cursor-pointer"
          onClick={() => setTheaterMode(false)}
          title="انقر لتشغيل أضواء الموقع"
        />
      )}

      {/* 1. Blurred Cinematic Header Background */}
      <div className="absolute top-0 right-0 left-0 h-[450px] overflow-hidden pointer-events-none z-0">
        <div 
          className="w-full h-full bg-cover bg-center opacity-15 blur-2xl scale-105"
          style={{ backgroundImage: `url(${content.backdropPath || content.posterPath})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      {/* 2. Top Header Navigation */}
      <header className="border-b border-slate-900/60 bg-slate-950/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6 space-x-reverse">
            <Link href="/" className="flex items-center space-x-2 space-x-reverse bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent">
              <span className="text-2xl font-black tracking-wider">فور سيما</span>
            </Link>
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center">
              <ChevronRight className="w-3.5 h-3.5 ml-1" /> العودة للرئيسية
            </Link>
          </div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="hidden sm:flex items-center text-emerald-400 text-[10px] px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-900/30 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 ml-1" /> فحص السلامة الآلي v2.0
            </div>
            <Link href="/admin" className="text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              لوحة التحكم
            </Link>
          </div>
        </div>
      </header>

      {/* 3. Main Cinema Layout Grid */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Watch Player Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Video Player Box */}
          <div className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-900 ${theaterMode ? "z-50 ring-4 ring-amber-500/10" : ""}`}>
            
            {/* Player aspect wrapper */}
            <div className="aspect-video w-full bg-slate-950 relative">
              <iframe
                src={embedUrl}
                className="w-full h-full absolute inset-0 border-0"
                allowFullScreen
                scrolling="no"
                allow="autoplay; encrypted-media"
              />
            </div>

            {/* Servers and Dimmer bar */}
            <div className="bg-slate-950 p-4 border-t border-slate-900 flex flex-wrap items-center justify-between gap-4">
              
              {/* Server Selectors */}
              <div className="flex space-x-2 space-x-reverse text-xs">
                <button
                  onClick={() => setActiveServer("server1")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center ${
                    activeServer === "server1"
                      ? "bg-red-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 ml-1.5 fill-current" /> السيرفر الرئيسي 1
                </button>
                <button
                  onClick={() => setActiveServer("server2")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center ${
                    activeServer === "server2"
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 ml-1.5 fill-current" /> سيرفر بديل 2
                </button>
                {content.trailerKey && (
                  <button
                    onClick={() => setActiveServer("trailer")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center ${
                      activeServer === "trailer"
                        ? "bg-slate-100 text-slate-950"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Film className="w-3.5 h-3.5 ml-1.5" /> الإعلان الرسمي
                  </button>
                )}
              </div>

              {/* Theater Dimmer Button */}
              <button
                onClick={() => setTheaterMode(!theaterMode)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center ${
                  theaterMode 
                    ? "bg-amber-500 text-slate-950" 
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title="إطفاء الأنوار لتجربة مشاهدة مريحة"
              >
                <Lightbulb className={`w-3.5 h-3.5 ml-1.5 ${theaterMode ? "fill-current" : ""}`} />
                <span>{theaterMode ? "أشعل الأضواء" : "أطفئ الأضواء"}</span>
              </button>
            </div>
          </div>

          {/* Episode metadata info block (Only visible for TV Series when play episode is loaded) */}
          {content.type === "tv" && currentEpisodeDetails && (
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-2">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center">
                <span>أنت تشاهد حالياً:</span>
                <span className="mx-1.5">•</span>
                <span>الموسم {selectedSeason}</span>
                <span className="mx-1.5">•</span>
                <span>الحلقة {selectedEpisode}</span>
              </div>
              <h2 className="text-lg font-black text-slate-100">{currentEpisodeDetails.nameAr || currentEpisodeDetails.nameEn}</h2>
              {currentEpisodeDetails.nameAr && currentEpisodeDetails.nameAr !== currentEpisodeDetails.nameEn && (
                <p className="text-xs text-slate-500 italic mt-0.5">{currentEpisodeDetails.nameEn}</p>
              )}
              {currentEpisodeDetails.overviewEn && (
                <p className="text-xs text-slate-400 leading-relaxed pt-1">
                  {currentEpisodeDetails.overviewAr || currentEpisodeDetails.overviewEn}
                </p>
              )}
              <div className="flex items-center text-[10px] text-slate-500 space-x-4 space-x-reverse pt-2">
                <span className="flex items-center"><Clock className="w-3 h-3 ml-1" /> {currentEpisodeDetails.runtime || 45} دقيقة</span>
                {currentEpisodeDetails.airDate && <span className="flex items-center"><Calendar className="w-3 h-3 ml-1" /> {currentEpisodeDetails.airDate}</span>}
              </div>
            </div>
          )}

          {/* 4. Episode Navigation / Seasons selector (Only visible for TV) */}
          {content.type === "tv" && seasons.length > 0 && (
            <div className="bg-slate-900/20 border border-slate-900 p-6 rounded-2xl space-y-6">
              
              {/* Seasons Selector row */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block">اختر الموسم:</label>
                <div className="flex flex-wrap gap-2">
                  {seasons.map((s) => {
                    const isSelected = selectedSeason === s.seasonNumber;
                    return (
                      <button
                        key={s.seasonNumber}
                        onClick={() => {
                          setSelectedSeason(s.seasonNumber);
                          setSelectedEpisode(1); // reset to episode 1 of new season
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition border ${
                          isSelected
                            ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-950/20"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {s.nameAr || `الموسم ${s.seasonNumber}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Episodes Grid list */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 block">حلقات الموسم {selectedSeason}:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {filteredEpisodesList.map((ep) => {
                    const isPlaying = selectedEpisode === ep.episodeNumber;
                    return (
                      <button
                        key={ep.episodeNumber}
                        onClick={() => {
                          setSelectedEpisode(ep.episodeNumber);
                        }}
                        className={`p-3 rounded-xl border text-right transition flex items-center space-x-3 space-x-reverse ${
                          isPlaying
                            ? "bg-amber-500/10 border-amber-500 text-amber-400"
                            : "bg-slate-950/40 border-slate-900 text-slate-300 hover:border-slate-800"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-xs font-black shrink-0 border border-slate-800">
                          {ep.episodeNumber}
                        </div>
                        <div className="flex-1 truncate">
                          <div className="text-xs font-bold truncate">{ep.nameAr || `الحلقة ${ep.episodeNumber}`}</div>
                          <div className="text-[10px] text-slate-500 flex items-center space-x-2 space-x-reverse mt-0.5">
                            <span>{ep.runtime || 45} دقيقة</span>
                            {ep.voteAverage > 0 && (
                              <span className="flex items-center text-amber-500/80">
                                <Star className="w-2.5 h-2.5 ml-0.5 fill-amber-500" />
                                {ep.voteAverage.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* 5. Casting Slider */}
          {cast.length > 0 && (
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">نجوم وصنّاع العمل</h3>
              <div className="flex space-x-4 space-x-reverse overflow-x-auto pb-4 pr-1">
                {cast.map((c) => (
                  <div 
                    key={c.tmdbId} 
                    className="flex flex-col items-center text-center space-y-1.5 shrink-0 group w-20"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-800/80 bg-slate-900 relative shadow transition group-hover:scale-105 group-hover:border-amber-500">
                      {c.profilePath ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w185${c.profilePath}`} 
                          alt={c.nameEn}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // If profile not found, fall back to standard UI
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-950">
                          <User className="w-6 h-6 text-slate-700" />
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-200 truncate w-full group-hover:text-amber-400 transition">
                      {c.nameAr || c.nameEn}
                    </div>
                    <div className="text-[8px] text-slate-500 truncate w-full">
                      {c.roleType === "cast" ? c.characterName : "مخرج"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Review System */}
          <div className="bg-slate-900/20 border border-slate-900 p-6 rounded-2xl space-y-6">
            <h3 className="text-base font-black text-slate-200 flex items-center">
              <MessageSquare className="w-5 h-5 ml-2 text-red-500" />
              أراء وتعليقات المشاهدين ({reviewsList.length})
            </h3>

            {/* Add Review Form */}
            <form onSubmit={handleAddReview} className="space-y-4 bg-slate-950/30 p-4 rounded-xl border border-slate-900">
              <div className="text-xs font-bold text-slate-400">اترك تعليقك وتقييمك للعمل:</div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">اسمك المستعار</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: محمد أحمد"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">تقييمك بالنجوم ({reviewRating} / 5)</label>
                  <div className="flex space-x-1 space-x-reverse h-9 items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="p-1 text-slate-600 hover:scale-110 transition"
                      >
                        <Star className={`w-5 h-5 ${star <= reviewRating ? "fill-amber-500 text-amber-500" : "text-slate-700"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">التعليق والمراجعة</label>
                <textarea
                  rows={3}
                  required
                  placeholder="ما رأيك في قصة العمل، الإخراج، والتمثيل؟ يرجى الحفاظ على الكتابة اللائقة..."
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-slate-950 font-black rounded-lg text-xs transition flex items-center justify-center disabled:opacity-50"
              >
                {submittingReview ? "جاري الإرسال..." : "إرسال التعليق الحي"} <Send className="w-3.5 h-3.5 mr-1.5" />
              </button>
            </form>

            {/* List Reviews */}
            <div className="space-y-4 pt-2">
              {loadingReviews ? (
                <div className="text-center text-xs text-slate-600 py-6">جاري جلب التعليقات من قاعدة البيانات...</div>
              ) : reviewsList.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {reviewsList.map((rev) => (
                    <div key={rev.id} className="bg-slate-950/45 p-4 rounded-xl border border-slate-900/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 border border-slate-800">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-slate-200">{rev.authorName}</span>
                        </div>
                        <div className="flex items-center text-amber-400 space-x-1.5 space-x-reverse">
                          <span className="flex space-x-0.5 space-x-reverse">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-current text-amber-500" />
                            ))}
                          </span>
                          <span className="text-[10px] text-slate-500">({rev.rating}/5)</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pr-8">{rev.content}</p>
                      <div className="text-[8px] text-slate-600 text-left pr-8">
                        {new Date(rev.createdAt).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-600 border border-dashed border-slate-900 rounded-xl">
                  لا توجد مراجعات للعمل بعد. كن أول من يكتب تعليقاً على هذا العمل! ✍️
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Details Information Sidebar Column */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Main Poster Info Card */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-5">
            <div className="aspect-[2/3] rounded-xl overflow-hidden border border-slate-800 shadow-lg relative bg-slate-950">
              <img 
                src={content.posterPath} 
                alt={content.titleAr} 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 bg-red-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded shadow">
                {content.ageRating}
              </div>
            </div>

            <div className="space-y-2 text-right">
              <h1 className="text-2xl font-black text-slate-100 leading-tight">{content.titleAr}</h1>
              <p className="text-xs text-slate-400 italic">{content.titleEn}</p>
              {content.titleOriginal && content.titleOriginal !== content.titleEn && (
                <p className="text-[10px] text-slate-500">الاسم الأصلي: {content.titleOriginal}</p>
              )}
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-3 text-xs border-y border-slate-900 py-3.5">
              <div className="space-y-1">
                <span className="text-slate-500 block">سنة الإصدار</span>
                <span className="font-bold text-slate-300">{content.releaseYear || "غير معروف"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">مدة العمل</span>
                <span className="font-bold text-slate-300">{content.runtime} دقيقة</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">دولة الإنتاج</span>
                <span className="font-bold text-slate-300 flex items-center">
                  <Globe className="w-3.5 h-3.5 ml-1 text-slate-500" /> {content.countryOfOrigin}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">التقييم العام</span>
                <span className="font-bold text-amber-400 flex items-center">
                  <Star className="w-3.5 h-3.5 ml-1 fill-amber-400" /> {content.voteAverage.toFixed(1)} <span className="text-[10px] text-slate-600 mr-1">({content.voteCount})</span>
                </span>
              </div>
            </div>

            {/* Genres linked badges */}
            {genres.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs text-slate-500 block">التصنيف السينمائي:</span>
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <span 
                      key={g.tmdbId} 
                      className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2.5 py-1 rounded-md font-bold"
                    >
                      {g.nameAr || g.nameEn}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bookmarking and Share actions */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={handleToggleWatchlist}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition border flex items-center justify-center space-x-1.5 space-x-reverse ${
                  watchlist.includes(content.id)
                    ? "bg-amber-500/10 border-amber-500 text-amber-400"
                    : "bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200"
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${watchlist.includes(content.id) ? "fill-amber-500" : ""}`} />
                <span>{watchlist.includes(content.id) ? "محفوظ في المفضلة" : "حفظ للمفضلة"}</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("تم نسخ رابط المشاهدة بنجاح لمشاركته مع أصدقائك! 🔗");
                }}
                className="px-3 py-2.5 bg-slate-950 border border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200 rounded-xl transition flex items-center justify-center"
                title="مشاركة رابط العرض"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* Overview / Story details box */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">قصة العرض الكاملة</h3>
            <p className="text-xs text-slate-300 leading-relaxed text-right">
              {content.overviewAr || content.overviewEn}
            </p>
            {content.overviewAr && content.overviewAr !== content.overviewEn && (
              <div className="border-t border-slate-900/60 my-2 pt-2">
                <span className="text-[10px] text-slate-500 block mb-1">القصة بالإنجليزية (English Plot):</span>
                <p className="text-[11px] text-slate-400 leading-relaxed italic">{content.overviewEn}</p>
              </div>
            )}
          </div>

        </div>

      </main>

    </div>
  );
}
