import { useState, useEffect } from 'react'

/**
 * Custom hook for responsive grid column calculation
 * 
 * Calculates the number of items to display per page based on screen width
 * and a fixed number of rows. Ensures consistent grid layout across all pages.
 * 
 * @param rowsPerPage - Number of rows to display per page (default: 12)
 * @returns itemsPerPage - Total items to display (columns × rows)
 * 
 * Breakpoints:
 * - Mobile (<480px): 2 columns
 * - XS (≥480px): 3 columns
 * - SM (≥640px): 4 columns
 * - MD (≥768px): 5 columns
 * - LG (≥1024px): 6 columns
 * - XL (≥1280px): 7 columns
 * - 2XL (≥1536px): 8 columns
 */
export function useResponsiveGrid(rowsPerPage: number = 12): number {
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    // SSR-safe initial calculation
    if (typeof window === 'undefined') return 2 * rowsPerPage
    
    const width = window.innerWidth
    let columns = 2
    
    if (width >= 1536) columns = 8      // 2xl
    else if (width >= 1280) columns = 7 // xl
    else if (width >= 1024) columns = 6 // lg
    else if (width >= 768) columns = 5  // md
    else if (width >= 640) columns = 4  // sm
    else if (width >= 480) columns = 3  // xs
    
    return columns * rowsPerPage
  })

  useEffect(() => {
    const calculateItemsPerPage = () => {
      const width = window.innerWidth
      let columns = 2 // default mobile
      
      if (width >= 1536) columns = 8      // 2xl: 8 columns
      else if (width >= 1280) columns = 7 // xl: 7 columns  
      else if (width >= 1024) columns = 6 // lg: 6 columns
      else if (width >= 768) columns = 5  // md: 5 columns
      else if (width >= 640) columns = 4  // sm: 4 columns
      else if (width >= 480) columns = 3  // xs: 3 columns
      else columns = 2                    // mobile: 2 columns
      
      setItemsPerPage(columns * rowsPerPage)
    }

    // Debounce resize to prevent excessive calculations
    let resizeTimeout: NodeJS.Timeout
    const debouncedCalculate = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(calculateItemsPerPage, 150)
    }

    calculateItemsPerPage()
    window.addEventListener('resize', debouncedCalculate)
    
    return () => {
      clearTimeout(resizeTimeout)
      window.removeEventListener('resize', debouncedCalculate)
    }
  }, [rowsPerPage])

  return itemsPerPage
}
