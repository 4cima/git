'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, X, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterSection {
  id: string
  title: string
  icon: React.ReactNode
  options: FilterOption[]
  multiple?: boolean
}

interface FilterSidebarProps {
  sections: FilterSection[]
  activeFilters: Record<string, string | string[]>
  onFilterChange: (filterId: string, value: string | string[]) => void
  onClearAll: () => void
  className?: string
}

export function FilterSidebar({
  sections,
  activeFilters,
  onFilterChange,
  onClearAll,
  className = ''
}: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(s => s.id))
  )

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleCheckboxChange = (sectionId: string, value: string, multiple: boolean) => {
    if (multiple) {
      const current = (activeFilters[sectionId] as string[]) || []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      onFilterChange(sectionId, next)
    } else {
      onFilterChange(sectionId, value === activeFilters[sectionId] ? '' : value)
    }
  }

  const hasActiveFilters = Object.values(activeFilters).some(v => 
    Array.isArray(v) ? v.length > 0 : v !== ''
  )

  const getActiveCount = () => {
    return Object.values(activeFilters).reduce((count, v) => {
      if (Array.isArray(v)) return count + v.length
      if (v) return count + 1
      return count
    }, 0)
  }

  return (
    <div className={`bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">الفلاتر</h3>
          {getActiveCount() > 0 && (
            <span className="bg-cyan-500/20 text-cyan-400 text-xs font-bold px-2 py-1 rounded-full">
              {getActiveCount()}
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
            مسح الكل
          </button>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id)
          const sectionActive = activeFilters[section.id]
          const activeCount = Array.isArray(sectionActive) 
            ? sectionActive.length 
            : sectionActive ? 1 : 0

          return (
            <div key={section.id} className="border border-zinc-800 rounded-lg overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-2 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">{section.icon}</span>
                  <span className="font-semibold text-white">{section.title}</span>
                  {activeCount > 0 && (
                    <span className="bg-cyan-500/20 text-cyan-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      {activeCount}
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {/* Section Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 pt-0 space-y-1.5 max-h-64 overflow-y-auto">
                      {section.options.map((option) => {
                        const isActive = section.multiple
                          ? (activeFilters[section.id] as string[] || []).includes(option.value)
                          : activeFilters[section.id] === option.value

                        return (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 cursor-pointer group"
                          >
                            <input
                              type={section.multiple ? 'checkbox' : 'radio'}
                              checked={isActive}
                              onChange={() => handleCheckboxChange(section.id, option.value, section.multiple || false)}
                              className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0"
                            />
                            <span className={`text-sm flex-1 transition-colors ${
                              isActive ? 'text-white font-medium' : 'text-zinc-400 group-hover:text-white'
                            }`}>
                              {option.label}
                            </span>
                            {option.count !== undefined && (
                              <span className="text-xs text-zinc-500">
                                ({option.count.toLocaleString('ar-EG')})
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
