import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Plus, Loader2, ListMusic, Trash2, Share2, Globe, Lock } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { generateAiPlaylist } from '../../../lib/groq'
import { createPlaylist, addPlaylistItem, getUserPlaylists, Playlist, PlaylistItem } from '../../../lib/supabase'
import { tmdb } from '../../../lib/tmdb'
import { toast } from '../../../lib/toast-manager'
import { clsx } from 'clsx'
import { logger } from '../../../lib/logger'

export const PlaylistManager = () => {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState<(Playlist & { items: PlaylistItem[] })[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [theme, setTheme] = useState('')

  const fetchPlaylists = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getUserPlaylists(user.id)
      setPlaylists(data)
    } catch (err: any) {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlaylists()
  }, [user])

  const handleGenerateAiPlaylist = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لإنشاء قائمة تشغيل', { id: 'auth-required' })
      return
    }

    if (generating) return
    setGenerating(true)
    try {
      const result = await generateAiPlaylist(theme ? [theme] : [], [])
      if (!result) throw new Error('Failed to generate')

      // Create playlist in DB
      const newPlaylist = await createPlaylist({
        userId: user.id,
        title: result.title,
        description: result.description,
        isAiGenerated: true,
        isPublic: true
      })

      // Search for content and add items
      const itemPromises = result.content.map(async (title: string) => {
        try {
          const res = await tmdb.get('/search/multi', { params: { query: title, include_adult: false } })
          const match = res.data.results?.[0]
          if (match && (match.media_type === 'movie' || match.media_type === 'tv')) {
            await addPlaylistItem(newPlaylist.id, match.id.toString(), match.media_type)
            return { id: match.id, content_id: match.id, content_type: match.media_type }
          }
          return null
        } catch { return null }
      })

      await Promise.all(itemPromises)
      toast.success(`تم إنشاء قائمة "${result.title}" بنجاح ✨`)
      fetchPlaylists()
      setTheme('')
    } catch (err: any) {
      toast.error('فشل إنشاء القائمة الذكية')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <ListMusic className="text-primary" />
            قوائم التشغيل الخاصة بك
          </h2>
          <p className="text-sm text-zinc-400">نظّم محتواك المفضل أو دع الذكاء الاصطناعي يقترح عليك</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="مثلاً: مغامرات الفضاء، أفلام غامضة..."
              className="w-full md:w-64 h-10 rounded-xl border border-white/10 bg-black/40 px-4 pr-10 text-xs text-white outline-none focus:border-primary transition-all"
            />
            <Sparkles size={14} className="absolute right-3 top-3 text-primary group-focus-within:animate-pulse" />
          </div>
          <button
            onClick={handleGenerateAiPlaylist}
            disabled={generating}
            className="h-10 px-4 rounded-xl bg-primary text-black font-bold text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            توليد ذكي
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : playlists.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4 md:gap-6">
          {playlists.map((playlist) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-primary/30 hover:bg-white/[0.07] transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {playlist.is_ai_generated ? (
                    <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                      <Sparkles size={14} />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-white/10 text-zinc-400">
                      <ListMusic size={14} />
                    </div>
                  )}
                  {playlist.is_public ? <Globe size={12} className="text-zinc-500" /> : <Lock size={12} className="text-zinc-500" />}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                    <Share2 size={14} />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-white mb-1 group-hover:text-primary transition-colors">{playlist.title}</h3>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                {playlist.description || 'لا يوجد وصف متاح.'}
              </p>

              <div className="flex items-center justify-between mt-auto">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  {playlist.items.length} عنصر
                </span>
                <button className="text-[10px] font-bold text-primary hover:underline">
                  عرض القائمة ←
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
          <ListMusic size={48} className="mx-auto text-zinc-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">لا توجد قوائم تشغيل بعد</h3>
          <p className="text-sm text-zinc-500">ابدأ بإنشاء أول قائمة تشغيل لك يدوياً أو باستخدام الذكاء الاصطناعي</p>
        </div>
      )}
    </div>
  )
}
