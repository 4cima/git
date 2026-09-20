import type { Metadata } from 'next'
import ContentManager from '@/app/admin/_components/ContentManager'

export const metadata: Metadata = { title: 'إدارة الأفلام | 4CIMA' }

export default function AdminMoviesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-zinc-100">إدارة الأفلام</h2>
        <p className="text-xs text-zinc-500">تصفح وتعديل وحذف — الإضافة تتم عبر سكربتات المزامنة</p>
      </div>
      <ContentManager type="movie" />
    </div>
  )
}
