import { Metadata } from 'next'

export const runtime = 'edge'

export const metadata: Metadata = {
  title: 'القرآن الكريم | فور سيما',
  description: 'استمع إلى القرآن الكريم بأصوات نخبة من القراء',
}

export const dynamic = 'force-dynamic'

export default async function QuranPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 to-black text-white">
      <div className="page-container py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-amber-300 mb-4">
            القرآن الكريم
          </h1>
          <p className="text-lg text-white/80 italic">
            «الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ»
          </p>
        </div>
        
        <div className="text-center text-white/60">
          <p>قريباً إن شاء الله</p>
        </div>
      </div>
    </div>
  )
}
