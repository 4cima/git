// Seed sample data for testing
import { createClient } from '@libsql/client/web'

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://cinma-db-iaaelsadek.aws-eu-west-1.turso.io'
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY5MjI0NTIsImlkIjoiMDE5ZGE5N2YtY2QwMS03OTcwLTljYWItZDc2MDZmMzU3NGI1IiwicmlkIjoiYWE2ZjIzZWUtNDUwOS00ZjEyLWI3YzEtZWU4YjFmYTYyZmExIn0.-Ma3bNkYebX8vxLSYY-oVAU4K9KZAFj6DT7Pho_B1X_nVyC-RxfiJ-cGUeTp5S7mZF2OfqC1hcCrX_fnf3J-Dw'

async function seedData() {
  console.log('🔄 Connecting to Turso database...')
  
  const db = createClient({
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  })
  
  try {
    console.log('📝 Seeding sample data...')
    
    // Sample Movies
    const movies = [
      {
        title: 'The Shawshank Redemption',
        title_ar: 'الخلاص من شاوشانك',
        slug: 'the-shawshank-redemption-278',
        overview: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
        overview_ar: 'رجلان مسجونان يرتبطان على مدى سنوات، ويجدان العزاء والخلاص في النهاية من خلال أعمال اللياقة المشتركة.',
        poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        backdrop_path: '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
        release_date: '1994-09-23',
        runtime: 142,
        vote_average: 8.7,
        vote_count: 24000,
        popularity: 95.5,
        primary_genre: 'Drama',
        original_language: 'en'
      },
      {
        title: 'The Godfather',
        title_ar: 'العراب',
        slug: 'the-godfather-238',
        overview: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
        overview_ar: 'البطريرك المسن لسلالة الجريمة المنظمة ينقل السيطرة على إمبراطوريته السرية إلى ابنه المتردد.',
        poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        backdrop_path: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
        release_date: '1972-03-14',
        runtime: 175,
        vote_average: 8.7,
        vote_count: 18000,
        popularity: 88.3,
        primary_genre: 'Crime',
        original_language: 'en'
      },
      {
        title: 'Inception',
        title_ar: 'البداية',
        slug: 'inception-27205',
        overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.',
        overview_ar: 'لص يسرق أسرار الشركات من خلال استخدام تقنية مشاركة الأحلام يُعطى المهمة العكسية لزرع فكرة.',
        poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        backdrop_path: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
        release_date: '2010-07-16',
        runtime: 148,
        vote_average: 8.4,
        vote_count: 32000,
        popularity: 102.7,
        primary_genre: 'Action',
        original_language: 'en'
      }
    ]
    
    for (const movie of movies) {
      await db.execute({
        sql: `INSERT INTO movies (title, title_ar, slug, overview, overview_ar, poster_path, backdrop_path, release_date, runtime, vote_average, vote_count, popularity, primary_genre, original_language)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          movie.title, movie.title_ar, movie.slug, movie.overview, movie.overview_ar,
          movie.poster_path, movie.backdrop_path, movie.release_date, movie.runtime,
          movie.vote_average, movie.vote_count, movie.popularity, movie.primary_genre, movie.original_language
        ]
      })
      console.log('✅ Added movie:', movie.title)
    }
    
    // Sample TV Series
    const series = [
      {
        name: 'Breaking Bad',
        name_ar: 'بريكنج باد',
        slug: 'breaking-bad-1396',
        overview: 'A high school chemistry teacher turned methamphetamine producer partners with a former student.',
        overview_ar: 'مدرس كيمياء في المدرسة الثانوية يتحول إلى منتج ميثامفيتامين ويشارك مع طالب سابق.',
        poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
        first_air_date: '2008-01-20',
        number_of_seasons: 5,
        number_of_episodes: 62,
        vote_average: 8.9,
        popularity: 145.2,
        primary_genre: 'Drama',
        original_language: 'en'
      },
      {
        name: 'Game of Thrones',
        name_ar: 'صراع العروش',
        slug: 'game-of-thrones-1399',
        overview: 'Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns.',
        overview_ar: 'تسع عائلات نبيلة تقاتل من أجل السيطرة على أراضي ويستروس، بينما يعود عدو قديم.',
        poster_path: '/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
        backdrop_path: '/suopoADq0k8YZr4dQXcU6pToj6s.jpg',
        first_air_date: '2011-04-17',
        number_of_seasons: 8,
        number_of_episodes: 73,
        vote_average: 8.4,
        popularity: 178.5,
        primary_genre: 'Drama',
        original_language: 'en'
      }
    ]
    
    for (const show of series) {
      await db.execute({
        sql: `INSERT INTO tv_series (name, name_ar, slug, overview, overview_ar, poster_path, backdrop_path, first_air_date, number_of_seasons, number_of_episodes, vote_average, popularity, primary_genre, original_language)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          show.name, show.name_ar, show.slug, show.overview, show.overview_ar,
          show.poster_path, show.backdrop_path, show.first_air_date, show.number_of_seasons,
          show.number_of_episodes, show.vote_average, show.popularity, show.primary_genre, show.original_language
        ]
      })
      console.log('✅ Added TV series:', show.name)
    }
    
    // Verify
    const movieCount = await db.execute('SELECT COUNT(*) as count FROM movies')
    const seriesCount = await db.execute('SELECT COUNT(*) as count FROM tv_series')
    
    console.log('\n📊 Database Summary:')
    console.log('  - Movies:', (movieCount.rows[0] as any).count)
    console.log('  - TV Series:', (seriesCount.rows[0] as any).count)
    console.log('\n✅ Sample data seeded successfully!')
    
  } catch (error) {
    console.error('❌ Failed to seed data:', error)
    process.exit(1)
  }
}

seedData()
