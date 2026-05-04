import { Grid, List } from 'lucide-react'
import { GlassInput } from '../../common/GlassInput'
import { GlassButton } from '../../common/GlassButton'
import { useLang } from '../../../state/useLang'
import type { SermonCategory } from '../../../types/quran-sermons'

interface SermonFiltersProps {
  searchQuery: string
  setSearchQuery: (value: string) => void
  selectedCategories: SermonCategory[]
  setSelectedCategories: (categories: SermonCategory[]) => void
  viewMode: 'grid' | 'list'
  setViewMode: (value: 'grid' | 'list') => void
  filteredCount: number
}

const SERMON_CATEGORIES: { value: SermonCategory; label: { ar: string; en: string } }[] = [
  { value: 'friday-khutbah', label: { ar: 'خطبة الجمعة', en: 'Friday Khutbah' } },
  { value: 'ramadan', label: { ar: 'رمضان', en: 'Ramadan' } },
  { value: 'hajj', label: { ar: 'الحج', en: 'Hajj' } },
  { value: 'eid', label: { ar: 'العيد', en: 'Eid' } },
  { value: 'general-guidance', label: { ar: 'إرشاد عام', en: 'General' } },
  { value: 'youth', label: { ar: 'الشباب', en: 'Youth' } },
  { value: 'family', label: { ar: 'الأسرة', en: 'Family' } },
  { value: 'tafsir', label: { ar: 'تفسير', en: 'Tafsir' } }
]

export const SermonFilters = ({
  searchQuery,
  setSearchQuery,
  selectedCategories,
  setSelectedCategories,
  viewMode,
  setViewMode,
  filteredCount
}: SermonFiltersProps) => {
  const { lang } = useLang()

  const toggleCategory = (category: SermonCategory) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category))
    } else {
      setSelectedCategories([...selectedCategories, category])
    }
  }

  const clearCategories = () => {
    setSelectedCategories([])
  }

  return (
    <div className="shrink-0 mb-6 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <GlassInput
            placeholder={lang === 'ar' ? 'بحث عن خطبة...' : 'Search sermon...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-1 bg-amber-950/60 border border-amber-500/20 rounded-xl p-1.5 backdrop-blur-md">
          <GlassButton
            size="icon"
            active={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <Grid size={16} />
          </GlassButton>
          <GlassButton
            size="icon"
            active={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <List size={16} />
          </GlassButton>
        </div>
      </div>
      
      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <GlassButton
          size="sm"
          active={selectedCategories.length === 0}
          onClick={clearCategories}
          className="rounded-lg"
        >
          {lang === 'ar' ? 'الكل' : 'All'}
        </GlassButton>
        
        {SERMON_CATEGORIES.map(({ value, label }) => (
          <GlassButton
            key={value}
            size="sm"
            active={selectedCategories.includes(value)}
            onClick={() => toggleCategory(value)}
            className="rounded-lg"
          >
            {lang === 'ar' ? label.ar : label.en}
          </GlassButton>
        ))}
      </div>
    </div>
  )
}
