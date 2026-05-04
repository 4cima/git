import React, { useEffect, useRef } from 'react'

interface NeonConnectorGridProps {
  hasActiveFilters: boolean
  activeTabIndex: number
}

/**
 * شبكة خطوط نيون تربط بين الأقسام والفلاتر
 * Neon grid connecting tabs and filters
 */
export const NeonConnectorGrid: React.FC<NeonConnectorGridProps> = ({ 
  hasActiveFilters, 
  activeTabIndex 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const draw = () => {
      // Get filter tabs and advanced filters elements
      const filterTabs = document.querySelector('[data-filter-tabs]')
      const advancedFilters = document.querySelector('[data-advanced-filters]')
      
      if (!filterTabs || !advancedFilters) {
        return
      }

      const tabsRect = filterTabs.getBoundingClientRect()
      const filtersRect = advancedFilters.getBoundingClientRect()

      // Calculate height between tabs and filters
      const height = filtersRect.top - tabsRect.bottom
      
      if (height <= 0) {
        return
      }

      // Set canvas to full width and calculated height
      canvas.width = window.innerWidth
      canvas.height = height
      container.style.height = `${height}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const color = '#f5c518'
      const inactiveColor = 'rgba(245, 197, 24, 0.15)'

      // Get active tab position
      const activeTab = filterTabs.querySelector('[aria-current="page"]')
      if (!activeTab) return

      const activeTabRect = activeTab.getBoundingClientRect()
      const tabCenterX = activeTabRect.left + activeTabRect.width / 2

      // Get filter select positions
      const selects = advancedFilters.querySelectorAll('select')
      
      selects.forEach((select, index) => {
        const selectRect = select.getBoundingClientRect()
        const filterCenterX = selectRect.left + selectRect.width / 2

        // Determine if this filter is active
        const isFilterActive = select.value !== ''
        const lineColor = isFilterActive ? color : inactiveColor
        const lineWidth = isFilterActive ? 2 : 1
        const glowIntensity = isFilterActive ? 12 : 5

        // Draw line from active tab to this filter
        ctx.strokeStyle = lineColor
        ctx.lineWidth = lineWidth
        ctx.shadowBlur = glowIntensity
        ctx.shadowColor = lineColor

        // Draw curved line
        ctx.beginPath()
        ctx.moveTo(tabCenterX, 0)
        
        // Control points for smooth curve
        const controlY = height * 0.5
        ctx.bezierCurveTo(
          tabCenterX, controlY,
          filterCenterX, controlY,
          filterCenterX, height
        )
        
        ctx.stroke()

        // Draw dots
        ctx.fillStyle = lineColor
        ctx.shadowBlur = glowIntensity * 1.5
        
        // Top dot (at tab)
        ctx.beginPath()
        ctx.arc(tabCenterX, 0, isFilterActive ? 4 : 2, 0, Math.PI * 2)
        ctx.fill()

        // Bottom dot (at filter)
        ctx.beginPath()
        ctx.arc(filterCenterX, height, isFilterActive ? 4 : 2, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // Initial draw with delay to ensure DOM is ready
    const timer = setTimeout(draw, 150)

    // Redraw on window resize
    const handleResize = () => {
      draw()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [hasActiveFilters, activeTabIndex])

  return (
    <div ref={containerRef} className="relative w-full pointer-events-none -mx-4 md:-mx-12">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0"
      />
    </div>
  )
}
