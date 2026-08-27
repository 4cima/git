'use client'

import { useMemo, useState, useEffect } from 'react'
import { STREAM_SERVERS, buildServerUrl } from '@/services/streamService'

// ── Types ─────────────────────────────────────────────────────────────────────

type MediaType = 'movie' | 'tv'

type Work = {
  tmdbId: number
  titleAr: string
  titleEn: string
  type: MediaType
}

type RatingValue = 'works' | 'white_screen' | 'not_found' | 'annoying_ads'

type Ratings = Record<string, RatingValue>

// ── Data ──────────────────────────────────────────────────────────────────────

const MOVIES: Work[] = [
  { tmdbId: 155, titleAr: 'الفارس الظلام', titleEn: 'The Dark Knight', type: 'movie' },
  { tmdbId: 27205, titleAr: 'إنسبشن', titleEn: 'Inception', type: 'movie' },
  { tmdbId: 157336, titleAr: 'إنترستيلر', titleEn: 'Interstellar', type: 'movie' },
  { tmdbId: 238, titleAr: 'العراب', titleEn: 'The Godfather', type: 'movie' },
  { tmdbId: 19995, titleAr: 'أفاتار', titleEn: 'Avatar', type: 'movie' },
]

const SERIES: Work[] = [
  { tmdbId: 1399, titleAr: 'صراع العروش', titleEn: 'Game of Thrones', type: 'tv' },
  { tmdbId: 1396, titleAr: 'بريكنج باد', titleEn: 'Breaking Bad', type: 'tv' },
  { tmdbId: 79744, titleAr: 'الروكي', titleEn: 'The Rookie', type: 'tv' },
  { tmdbId: 66732, titleAr: 'سترينجر ثينجز', titleEn: 'Stranger Things', type: 'tv' },
  { tmdbId: 93405, titleAr: 'لعبة الحبار', titleEn: 'Squid Game', type: 'tv' },
]

const RATINGS_STORAGE_KEY = 'player-test-ratings'

const RATING_LABELS: Record<RatingValue, string> = {
  works: 'يشتغل',
  white_screen: 'شاشة بيضاء',
  not_found: 'مش موجود',
  annoying_ads: 'إعلان مزعج',
}

const RATING_BADGE_STYLES: Record<RatingValue, string> = {
  works: 'bg-emerald-600/80 text-white',
  white_screen: 'bg-zinc-500/80 text-white',
  not_found: 'bg-red-600/80 text-white',
  annoying_ads: 'bg-amber-600/80 text-white',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadRatings(): Ratings {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(RATINGS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Ratings) : {}
  } catch {
    return {}
  }
}

function saveRatings(ratings: Ratings) {
  try {
    window.localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(ratings))
  } catch {
    // ignore storage errors
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlayerTestClient() {
  const [work, setWork] = useState<Work | null>(null)
  const [season, setSeason] = useState(1)
  const [episode, setEpisode] = useState(1)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [iframeKey, setIframeKey] = useState(0)
  const [ratings, setRatings] = useState<Ratings>({})
  const [serverOrder, setServerOrder] = useState<{ id: string; name: string; url: string }[]>([])
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Load ratings from localStorage on mount
  useEffect(() => {
    setRatings(loadRatings())
  }, [])

  // Load the current runtime order (single source of truth from /api/server-configs)
  useEffect(() => {
    fetch('/api/server-configs')
      .then(res => res.json())
      .then(data => {
        const list = data?.servers || []
        if (Array.isArray(list) && list.length > 0) {
          setServerOrder(list.map((row: { id: string; name: string; url: string }) => ({
            id: row.id,
            name: row.name,
            url: row.url,
          })))
        }
      })
      .catch(() => { /* keep empty; user can still reorder below */ })
  }, [])

  const servers = useMemo(() => {
    if (!work) return []
    return STREAM_SERVERS.map((server) => ({
      id: server.id,
      name: server.name,
      url: buildServerUrl(server, work.type, work.tmdbId, season, episode),
    })).filter((s) => !!s.url)
  }, [work, season, episode])

  const selectServer = (name: string, url: string) => {
    setSelectedName(name)
    setSelectedUrl(url)
    setIframeKey((k) => k + 1)
  }

  const changeWork = (next: Work) => {
    setWork(next)
    if (next.type === 'movie') {
      setSeason(1)
      setEpisode(1)
    }
    // Rebuild URL for the same server name if one is selected
    if (selectedName) {
      const match = servers.find((s) => s.name === selectedName)
      if (match) {
        setSelectedUrl(match.url)
        setIframeKey((k) => k + 1)
        return
      }
    }
    setSelectedUrl(null)
    setSelectedName(null)
  }

  const setRating = (serverId: string, value: RatingValue) => {
    setRatings((prev) => {
      const next = { ...prev }
      if (next[serverId] === value) {
        delete next[serverId]
      } else {
        next[serverId] = value
      }
      saveRatings(next)
      return next
    })
  }

  const copyUrl = async () => {
    if (!selectedUrl) return
    try {
      await navigator.clipboard.writeText(selectedUrl)
    } catch {
      // clipboard may be unavailable
    }
  }

  const moveUp = (idx: number) => {
    if (idx <= 0) return
    setServerOrder(prev => {
      const next = [...prev]
      const tmp = next[idx - 1]
      next[idx - 1] = next[idx]
      next[idx] = tmp
      return next
    })
  }

  const moveDown = (idx: number) => {
    if (idx >= serverOrder.length - 1) return
    setServerOrder(prev => {
      const next = [...prev]
      const tmp = next[idx + 1]
      next[idx + 1] = next[idx]
      next[idx] = tmp
      return next
    })
  }

  const saveOrder = async () => {
    setSaveMsg(null)
    try {
      const res = await fetch('/api/admin/server-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: serverOrder.map(s => s.id) }),
      })
      const data = await res.json()
      if (res.ok) {
        setSaveMsg('تم حفظ الترتيب ✓')
      } else if (res.status === 401) {
        setSaveMsg('غير مصرّح — يجب تسجيل الدخول كمدير')
      } else {
        setSaveMsg(data?.error || 'فشل الحفظ')
      }
    } catch {
      setSaveMsg('خطأ في الاتصال')
    }
  }

  const ratingButtons = (serverId: string) => (
    <div className="mt-1 flex flex-wrap gap-1">
      {(Object.keys(RATING_LABELS) as RatingValue[]).map((value) => (
        <button
          key={value}
          onClick={() => setRating(serverId, value)}
          className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors ${
            ratings[serverId] === value
              ? RATING_BADGE_STYLES[value]
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          {RATING_LABELS[value]}
        </button>
      ))}
    </div>
  )

  return (
    <div dir="rtl" className="min-h-screen bg-zinc-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-2xl font-black">معمل السيرفرات</h1>
          <p className="text-sm text-zinc-400">
            صفحة إدارة. مشغّل مباشر من غير بروكسي. القائمة = السيرفرات الثمانية فقط.
          </p>
        </header>

        {/* Works selection */}
        <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-base font-black text-cyan-400">الأعمال</h2>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">أفلام</h3>
            <div className="flex flex-wrap gap-2">
              {MOVIES.map((m) => (
                <button
                  key={m.tmdbId}
                  onClick={() => changeWork(m)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
                    work?.tmdbId === m.tmdbId && work?.type === 'movie'
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  {m.titleAr} / {m.titleEn}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">مسلسلات</h3>
            <div className="flex flex-wrap gap-2">
              {SERIES.map((s) => (
                <button
                  key={s.tmdbId}
                  onClick={() => changeWork(s)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
                    work?.tmdbId === s.tmdbId && work?.type === 'tv'
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  {s.titleAr} / {s.titleEn}
                </button>
              ))}
            </div>
          </div>

          {work?.type === 'tv' && (
            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-1 text-xs font-bold text-zinc-400">
                موسم
                <input
                  type="number"
                  min={1}
                  value={season}
                  onChange={(e) => setSeason(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-center text-white"
                />
              </label>
              <label className="flex items-center gap-1 text-xs font-bold text-zinc-400">
                حلقة
                <input
                  type="number"
                  min={1}
                  value={episode}
                  onChange={(e) => setEpisode(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-center text-white"
                />
              </label>
            </div>
          )}

          {work && (
            <p className="pt-1 text-sm font-bold text-emerald-400">
              المختار: {work.titleAr} ({work.titleEn}) — TMDB #{work.tmdbId} —{' '}
              {work.type === 'movie' ? 'فيلم' : `مسلسل S${season}E${episode}`}
            </p>
          )}
        </section>

        {/* Servers */}
        <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-base font-black text-cyan-400">
            السيرفرات <span className="text-xs font-normal text-zinc-500">({servers.length} سيرفر)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {servers.map((s) => (
              <button
                key={s.id}
                onClick={() => selectServer(s.name, s.url)}
                className={`rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
                  selectedName === s.name
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          {work && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {servers.map((s) => (
                <div key={`rate-${s.id}`} className="rounded border border-zinc-800 p-1.5">
                  <span className="text-[10px] font-bold text-zinc-400">{s.name}</span>
                  {ratingButtons(s.id)}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Order (admin only) */}
        <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-base font-black text-cyan-400">ترتيب السيرفرات</h2>
          <p className="text-xs text-zinc-500">أزل/أضف بالأسهم ثم اضغط «حفظ الترتيب». الترتيب يُطبق فور الحفظ على كل صفحات الزوار.</p>
          {saveMsg && (
            <p className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-bold text-emerald-400">{saveMsg}</p>
          )}
          {serverOrder.length === 0 ? (
            <p className="text-sm text-zinc-500">جاري تحميل الترتيب الحالي...</p>
          ) : (
            <>
              <div className="space-y-2">
                {serverOrder.map((s, idx) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/70 px-3 py-2"
                  >
                    <span className="w-6 shrink-0 text-center text-sm font-black text-zinc-400">#{idx + 1}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        aria-label={`أعلى ${s.name}`}
                        className="rounded bg-zinc-700 px-2 py-1 text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-600"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === serverOrder.length - 1}
                        aria-label={`أسفل ${s.name}`}
                        className="rounded bg-zinc-700 px-2 py-1 text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-600"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{s.name}</div>
                      <div className="truncate text-[10px] text-zinc-500" dir="ltr">{s.url}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveOrder}
                  className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500"
                >
                  حفظ الترتيب
                </button>
              </div>
            </>
          )}
        </section>

        {/* Player */}
        <section className="space-y-3">
          {selectedUrl && work ? (
            <>
              <div className="w-full overflow-hidden rounded-lg bg-black" style={{ minHeight: 360 }}>
                <iframe
                  key={iframeKey}
                  src={selectedUrl}
                  className="h-full w-full"
                  style={{ height: '70vh', minHeight: 360 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  title="player-test-preview"
                />
              </div>

              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-sm font-bold">
                  السيرفر: <span className="text-emerald-400">{selectedName}</span> —{' '}
                  {work.type === 'movie' ? 'فيلم' : `مسلسل S${season} E${episode}`}
                </p>
                <input
                  readOnly
                  value={selectedUrl}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300"
                  dir="ltr"
                />
                <div className="flex flex-wrap gap-2">
                  <a
                    href={selectedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-bold hover:bg-cyan-500"
                  >
                    فتح خارجي
                  </a>
                  <button
                    onClick={copyUrl}
                    className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-bold hover:bg-zinc-600"
                  >
                    نسخ الرابط
                  </button>
                  <button
                    onClick={() => setIframeKey((k) => k + 1)}
                    className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-bold hover:bg-zinc-600"
                  >
                    إعادة تحميل المشغّل
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-[360px] w-full items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30">
              <p className="text-sm font-bold text-zinc-500">اضغط سيرفر</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}