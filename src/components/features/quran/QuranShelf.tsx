import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useLang } from '../../../state/useLang'
import {BookOpen} from 'lucide-react'
import { SectionHeader } from '../../common/SectionHeader'
import { PrefetchLink } from '../../common/PrefetchLink'
import { SkeletonGrid } from '../../common/Skeletons'
import { ReciterImage } from './ReciterImage'
import { motion } from 'framer-motion'

export type QuranReciter = {
  id: number
  name: string
  image: string | null
  rewaya: string | null
  server: string | null
  featured?: boolean
}

export const QuranShelf = () => {
  const { lang } = useLang()
  
  const { data: reciters, isLoading } = useQuery<QuranReciter[]>({
    queryKey: ['quran-shelf-reciters'],
    queryFn: async () => {
      // Fetch featured reciters or top 10
      const { data, error } = await supabase
        .from('quran_reciters')
        .select('id, name, image, rewaya, server, featured')
        .limit(10)
        .order('featured', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    staleTime: 1000 * 60 * 60 // 1 hour
  })

  if (isLoading) {
    return (
      <section className="py-8 border-y border-amber-500/10 bg-amber-950/10">
        <div className="container mx-auto px-4">
          <SectionHeader title={lang === 'ar' ? 'القرآن الكريم' : 'Holy Quran'} icon={<BookOpen />} link="/quran" color="gold" />
          <SkeletonGrid count={6} variant="poster" />
        </div>
      </section>
    )
  }

  if (!reciters || reciters.length === 0) return null

  return (
    <section className="py-12 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[#050402] pointer-events-none">
         <div className="absolute inset-0 bg-gradient-to-r from-amber-900/10 via-transparent to-amber-900/10" />
      </div>

      <div className="relative z-10">
        <SectionHeader 
          title={lang === 'ar' ? 'تلاوات خاشعة' : 'Quran Recitations'} 
          icon={<BookOpen className="text-amber-400" />} 
          link="/quran" 
          color="gold"
          badge={lang === 'ar' ? 'استمع الآن' : 'Listen Now'}
        />
        
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x custom-scrollbar px-4">
          {reciters.map((reciter, idx) => (
            <motion.div 
              key={reciter.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="snap-start shrink-0 w-[140px] md:w-[160px] group"
            >
              <PrefetchLink href={`/quran/reciter/${reciter.id}`} className="block relative">
                <div className="relative aspect-square rounded-full overflow-hidden border-2 border-amber-500/20 group-hover:border-amber-400/60 transition-colors shadow-lg shadow-black/50 group-hover:shadow-amber-500/20">
                  <div className="absolute inset-0 bg-amber-900/20 group-hover:bg-transparent transition-colors z-10" />
                  <ReciterImage 
                    src={reciter.image} 
                    alt={reciter.name} 
                    id={reciter.id}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                
                <div className="text-center mt-3">
                  <h3 className="text-amber-100 font-bold font-amiri text-lg truncate group-hover:text-amber-400 transition-colors">
                    {reciter.name}
                  </h3>
                  {reciter.rewaya && (
                    <p className="text-amber-500/60 text-xs truncate mt-0.5 font-sans">
                      {reciter.rewaya}
                    </p>
                  )}
                </div>
              </PrefetchLink>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

