import { Grid, List } from 'lucide-react'
import { GlassInput } from '../../common/GlassInput'
import { GlassButton } from '../../common/GlassButton'
import { useLang } from '../../../state/useLang'

interface FilterBarProps {
  surahSearch: string
  setSurahSearch: (value: string) => void
  filterType: 'all' | 'meccan' | 'medinan'
  setFilterType: (value: 'all' | 'meccan' | 'medinan') => void
  viewMode: 'grid' | 'list'
  setViewMode: (value: 'grid' | 'list') => void
  filteredCount: number
}

export const FilterBar = ({
  surahSearch,
  setSurahSearch,
  filterType,
  setFilterType,
  viewMode,
  setViewMode,
  filteredCount
}: FilterBarProps) => {
  const { lang } = useLang()

  return (
    <div className="shrink-0 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <GlassInput
            placeholder={lang === 'ar' ? 'بحث عن سورة (اسم، رقم، إنجليزية)...' : 'Search Surah (Name, Number, English)...'}
            value={surahSearch}
            onChange={(e) => setSurahSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-500/20 rounded-xl p-1.5 backdrop-blur-md">
          <GlassButton
            size="sm"
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
            className="rounded-lg"
          >
            {lang === 'ar' ? 'الكل' : 'All'}
          </GlassButton>
          <GlassButton
            size="sm"
            active={filterType === 'meccan'}
            onClick={() => setFilterType('meccan')}
            className="rounded-lg"
          >
            {lang === 'ar' ? 'مكية' : 'Meccan'}
          </GlassButton>
          <GlassButton
            size="sm"
            active={filterType === 'medinan'}
            onClick={() => setFilterType('medinan')}
            className="rounded-lg"
          >
            {lang === 'ar' ? 'مدنية' : 'Medinan'}
          </GlassButton>
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
    </div>
  )
}
