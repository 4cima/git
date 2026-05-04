import { Grid, List } from 'lucide-react'
import { GlassInput } from '../../common/GlassInput'
import { GlassButton } from '../../common/GlassButton'
import { useLang } from '../../../state/useLang'
import type { StoryCategory } from '../../../types/quran-stories'

interface StoryFiltersProps {
  searchQuery: string
  setSearchQuery: (value: string) => void
  selectedCategories: StoryCategory[]
  setSelectedCategories: (categories: StoryCategory[]) => void
  viewMode: 'grid' | 'list'
  setViewMode: (value: 'grid' | 'list') => void
  filteredCount: number
}

const STORY_CATEGORIES: { value: StoryCategory; label: { ar: string; en: string } }[] = [
  { value: 'prophets', label: { ar: 'الأنبياء', en: 'Prophets' } },
  { value: 'companions', label: { ar: 'الصحابة', en: 'Companions' } },
  { value: 'quranic-stories', label: { ar: 'قصص قرآنية', en: 'Quranic' } },
  { value: 'historical-events', label: { ar: 'أحداث تاريخية', en: 'Historical' } },
  { value: 'moral-lessons', label: { ar: 'دروس أخلاقية', en: 'Moral Lessons' } },
  { value: 'miracles', label: { ar: 'المعجزات', en: 'Miracles' } },
  { value: 'battles', label: { ar: 'الغزوات', en: 'Battles' } },
  { value: 'women-in-islam', label: { ar: 'نساء في الإسلام', en: 'Women' } }
]

export const StoryFilters = ({
  searchQuery,
  setSearchQuery,
  selectedCategories,
  setSelectedCategories,
  viewMode,
  setViewMode,
  filteredCount
}: StoryFiltersProps) => {
  const { lang } = useLang()

  const toggleCategory = (category: StoryCategory) => {
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
            placeholder={lang === 'ar' ? 'بحث عن قصة...' : 'Search story...'}
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
        
        {STORY_CATEGORIES.map(({ value, label }) => (
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
