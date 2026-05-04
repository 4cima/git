import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, Home } from 'lucide-react'

const pathMap: Record<string, string> = {
  movies: 'أفلام',
  series: 'مسلسلات',
  anime: 'أنمي',
  foreign: 'أجنبي',
  arabic: 'عربي',
  asian: 'آسيوي',
  turkish: 'تركي',
  indian: 'هندي',
  animation: 'انيميشن',
  action: 'أكشن',
  romance: 'رومانسي',
  comedy: 'كوميدي',
  drama: 'دراما',
  horror: 'رعب',
  scifi: 'خيال علمي',
  documentary: 'وثائقي',
  watch: 'مشاهدة',
  search: 'بحث',
  category: 'تصنيف',
  'tv': 'مسلسلات',
  'movie': 'أفلام'
}

export const Breadcrumbs = () => {
  const pathname = usePathname()
  const pathnames = pathname.split('/').filter((x) => x)

  if (pathname === '/' || pathnames.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="w-full mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-zinc-400 font-cairo">
        <li>
          <Link 
            href="/" 
            className="flex items-center hover:text-primary transition-colors"
          >
            <Home size={14} className="ml-1" />
            <span>الرئيسية</span>
          </Link>
        </li>
        
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`
          const isLast = index === pathnames.length - 1
          
          // Try to decode URI component for Arabic text in URL, or use map, or fallback to value
          let label = decodeURIComponent(value)
          if (pathMap[label.toLowerCase()]) {
            label = pathMap[label.toLowerCase()]
          }

          // If it's a year, keep it as is
          if (/^\d{4}$/.test(label)) {
            // label is already the year
          }

          return (
            <li key={to} className="flex items-center">
              <ChevronLeft size={14} className="mx-1 text-zinc-600 rtl:rotate-180" />
              {isLast ? (
                <span className="text-zinc-100 font-bold" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link href={to} className="hover:text-primary transition-colors">
                  {label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
