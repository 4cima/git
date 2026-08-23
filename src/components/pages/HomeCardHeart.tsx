'use client'

import { Heart } from 'lucide-react'

type CardState = 'neutral' | 'favorite' | 'completed'

interface HomeCardHeartProps {
  state: CardState
  loading: boolean
  onClick: (e: React.MouseEvent) => void
  isLoggedIn?: boolean // Optional prop to control visibility
}

export function HomeCardHeart({ state, loading, onClick, isLoggedIn = true }: HomeCardHeartProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick(e)
  }
  
  // Don't render if user is not logged in
  if (!isLoggedIn) {
    return null
  }
  
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg border-2 ${
        state === 'favorite' 
          ? 'bg-red-500 border-red-400 hover:bg-red-600 shadow-red-500/50' 
          : state === 'completed'
          ? 'bg-green-500 border-green-400 hover:bg-green-600 shadow-green-500/50'
          : 'bg-black/80 border-white/40 hover:bg-black/90 hover:border-white/60'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={
        state === 'neutral' ? 'إضافة للمفضلة' :
        state === 'favorite' ? 'نقل لتمت المشاهدة' :
        'إزالة من تمت المشاهدة'
      }
    >
      <Heart 
        size={18} 
        className={`${
          state === 'favorite' ? 'fill-white text-white' :
          state === 'completed' ? 'fill-white text-white' :
          'text-white'
        }`}
      />
    </button>
  )
}
