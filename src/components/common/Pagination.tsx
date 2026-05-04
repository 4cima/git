interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  lang?: 'ar' | 'en'
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  lang = 'ar'
}) => {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7
    
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    
    // Always show first page
    pages.push(1)
    
    if (currentPage > 3) {
      pages.push('...')
    }
    
    // Show pages around current
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('...')
    }
    
    // Always show last page
    pages.push(totalPages)
    
    return pages
  }
  
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-lg bg-lumen-surface text-lumen-cream disabled:opacity-50 disabled:cursor-not-allowed hover:bg-lumen-muted transition-colors"
      >
        {lang === 'ar' ? 'السابق' : 'Previous'}
      </button>
      
      {/* Page Numbers */}
      {getPageNumbers().map((page, index) => (
        typeof page === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={`
              px-4 py-2 rounded-lg transition-colors
              ${currentPage === page
                ? 'bg-lumen-gold text-lumen-void font-bold'
                : 'bg-lumen-surface text-lumen-cream hover:bg-lumen-muted'
              }
            `}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="px-2 text-lumen-silver">
            {page}
          </span>
        )
      ))}
      
      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 rounded-lg bg-lumen-surface text-lumen-cream disabled:opacity-50 disabled:cursor-not-allowed hover:bg-lumen-muted transition-colors"
      >
        {lang === 'ar' ? 'التالي' : 'Next'}
      </button>
    </div>
  )
}
