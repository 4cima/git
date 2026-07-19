'use client'

import { ArrowUpDown, Grid3x3, List } from 'lucide-react'

interface SortOption {
  value: string
  label: string
}

interface SortBarProps {
  totalResults: number
  sortOptions: SortOption[]
  currentSort: string
  currentOrder: 'asc' | 'desc'
  onSortChange: (sort: string, order: 'asc' | 'desc') => void
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void
  className?: string
}

export function SortBar({
  totalResults,
  sortOptions,
  currentSort,
  currentOrder,
  onSortChange,
  viewMode,
  onViewModeChange,
  className = ''
}: SortBarProps) {
  const toggleOrder = () => {
    onSortChange(currentSort, currentOrder === 'desc' ? 'asc' : 'desc')
  }

  return (
    <div className={`flex items-center justify-between gap-4 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-4 ${className}`}>
      {/* Results Count */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">
          وجدنا
        </span>
        <span className="text-lg font-bold text-cyan-400">
          {totalResults.toLocaleString('ar-EG')}
        </span>
        <span className="text-sm text-zinc-400">
          نتيجة
        </span>
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400 hidden sm:block">
          ترتيب حسب:
        </span>
        
        {/* Sort Dropdown */}
        <select
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value, currentOrder)}
          className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none cursor-pointer"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Order Toggle */}
        <button
          onClick={toggleOrder}
          className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:border-cyan-500 transition-all group"
          title={currentOrder === 'desc' ? 'تنازلي' : 'تصاعدي'}
        >
          <ArrowUpDown 
            className={`w-5 h-5 transition-all ${
              currentOrder === 'desc' 
                ? 'text-cyan-400 rotate-0' 
                : 'text-zinc-400 rotate-180 group-hover:text-cyan-400'
            }`} 
          />
        </button>

        {/* View Mode Toggle (Optional) */}
        {viewMode && onViewModeChange && (
          <div className="hidden md:flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded transition-all ${
                viewMode === 'grid'
                  ? 'bg-cyan-500 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="شبكة"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded transition-all ${
                viewMode === 'list'
                  ? 'bg-cyan-500 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="قائمة"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
