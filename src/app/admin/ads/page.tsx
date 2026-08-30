'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

type Ad = {
  id: number
  title: string
  type: 'popunder' | 'banner' | 'preroll' | 'midroll'
  content: string
  position?: string | null
  active?: number | null
  impressions?: number | null
  clicks?: number | null
  created_at?: string | null
}

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    type: 'banner' as 'popunder' | 'banner' | 'preroll' | 'midroll',
    content: '',
    position: '',
    active: 1
  })

  useEffect(() => {
    fetchAds()
  }, [])

  const fetchAds = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/ads')
      const data = await res.json()
      setAds(data.data || [])
    } catch (error) {
      console.error('Error fetching ads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingAd ? `/api/ads/${editingAd.id}` : '/api/ads'
      const method = editingAd ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowForm(false)
        setEditingAd(null)
        setFormData({ title: '', type: 'banner', content: '', position: '', active: 1 })
        fetchAds()
      }
    } catch (error) {
      console.error('Error saving ad:', error)
    }
  }

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad)
    setFormData({
      title: ad.title,
      type: ad.type,
      content: ad.content,
      position: ad.position || '',
      active: ad.active || 1
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return
    
    try {
      const res = await fetch(`/api/ads/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchAds()
      }
    } catch (error) {
      console.error('Error deleting ad:', error)
    }
  }

  const handleToggleActive = async (ad: Ad) => {
    try {
      const res = await fetch(`/api/ads/${ad.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: ad.active ? 0 : 1 })
      })

      if (res.ok) {
        fetchAds()
      }
    } catch (error) {
      console.error('Error toggling ad:', error)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">إدارة الإعلانات</h1>
        <button
          onClick={() => {
            setEditingAd(null)
            setFormData({ title: '', type: 'banner', content: '', position: '', active: 1 })
            setShowForm(true)
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus size={20} />
          إضافة إعلان
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">
            {editingAd ? 'تعديل إعلان' : 'إضافة إعلان جديد'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">العنوان</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">النوع</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
              >
                <option value="banner">Banner</option>
                <option value="popunder">Popunder</option>
                <option value="preroll">Preroll</option>
                <option value="midroll">Midroll</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">المحتوى (HTML)</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white h-32"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">الموقع</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                placeholder="مثال: home-after-hero, global"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active === 1}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked ? 1 : 0 })}
                className="w-4 h-4"
              />
              <label htmlFor="active" className="text-sm">نشط</label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                {editingAd ? 'تحديث' : 'إضافة'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingAd(null)
                  setFormData({ title: '', type: 'banner', content: '', position: '', active: 1 })
                }}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-right">ID</th>
              <th className="px-4 py-3 text-right">العنوان</th>
              <th className="px-4 py-3 text-right">النوع</th>
              <th className="px-4 py-3 text-right">الموقع</th>
              <th className="px-4 py-3 text-right">المشاهدات</th>
              <th className="px-4 py-3 text-right">النقرات</th>
              <th className="px-4 py-3 text-right">الحالة</th>
              <th className="px-4 py-3 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <tr key={ad.id} className="border-t border-zinc-800">
                <td className="px-4 py-3">{ad.id}</td>
                <td className="px-4 py-3">{ad.title}</td>
                <td className="px-4 py-3">{ad.type}</td>
                <td className="px-4 py-3">{ad.position || '-'}</td>
                <td className="px-4 py-3">{ad.impressions || 0}</td>
                <td className="px-4 py-3">{ad.clicks || 0}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(ad)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {ad.active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleEdit(ad)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(ad.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ads.length === 0 && (
          <div className="p-8 text-center text-zinc-500">
            لا توجد إعلانات حتى الآن
          </div>
        )}
      </div>
    </div>
  )
}
